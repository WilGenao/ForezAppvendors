import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundError, ValidationError } from '../../common/errors/app.errors';
import * as crypto from 'crypto';

// Cache TTL constants
const LICENSE_CACHE_TTL = 300;  // 5 min — valid licenses cached to avoid DB hits on every tick
const RATE_LIMIT_WINDOW = 3600; // 1 hour window for rate limiting
const MAX_VALIDATIONS_PER_HOUR = 120; // 2/min max — bots should validate max every 30s

@Injectable()
export class LicensingService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  // DECISIÓN: El endpoint de validación de licencias es el más crítico de toda la plataforma.
  // MT4/5 puede llamarlo en cada tick (~1000ms). Sin protección, esto derribaría la DB.
  // Protecciones implementadas:
  // 1. Rate limiting por license_key (Redis) — max 2 validaciones/min
  // 2. Cache de resultado en Redis — licencia válida cacheada 5 min
  // 3. Respuesta rápida para licencias inválidas (no cache, fail fast)
  // 4. Ningún JOIN innecesario en el hot path
  async validateLicense(licenseKey: string, accountId: string, brokerName: string, mtVersion: string, ipAddress: string) {
    // 1. Rate limit check
    const rateLimitKey = `rate:license:${licenseKey}`;
    const currentCount = await this.cache.get<number>(rateLimitKey) ?? 0;
    if (currentCount >= MAX_VALIDATIONS_PER_HOUR) {
      await this.logValidation(licenseKey, accountId, brokerName, mtVersion, ipAddress, 'rate_limited');
      return { valid: false, reason: 'RATE_LIMITED', message: 'Too many validation requests. Please reduce validation frequency.' };
    }
    await this.cache.set(rateLimitKey, currentCount + 1, RATE_LIMIT_WINDOW * 1000);

    // 2. Check cache first (hot path — most validations hit this)
    const cacheKey = `license:valid:${licenseKey}:${accountId}`;
    const cached = await this.cache.get<{ valid: boolean; botId: string }>(cacheKey);
    if (cached !== null && cached !== undefined) {
      if (cached.valid) {
        await this.logValidation(licenseKey, accountId, brokerName, mtVersion, ipAddress, 'valid');
      }
      return cached.valid
        ? { valid: true, botId: cached.botId, message: 'License active' }
        : { valid: false, reason: 'CACHED_INVALID', message: 'License not valid' };
    }

    // 3. DB lookup — only for cache miss
    const license = await this.prisma.license.findFirst({
      where: { licenseKey, status: 'active' },
      select: { id: true, botId: true, expiresAt: true, allowedAccountIds: true, maxActivations: true, activationsUsed: true },
    });

    if (!license) {
      await this.logValidation(licenseKey, accountId, brokerName, mtVersion, ipAddress, 'invalid');
      return { valid: false, reason: 'NOT_FOUND', message: 'License not found or inactive' };
    }

    // 4. Expiry check
    if (license.expiresAt && license.expiresAt < new Date()) {
      await this.prisma.license.update({ where: { id: license.id }, data: { status: 'expired' } });
      await this.logValidation(licenseKey, accountId, brokerName, mtVersion, ipAddress, 'expired');
      return { valid: false, reason: 'EXPIRED', message: 'License has expired' };
    }

    // 5. Account ID check (if restrictions set)
    if (license.allowedAccountIds.length > 0 && !license.allowedAccountIds.includes(accountId)) {
      // Auto-register if activations available
      if (license.activationsUsed < license.maxActivations) {
        await this.prisma.license.update({
          where: { id: license.id },
          data: {
            allowedAccountIds: [...license.allowedAccountIds, accountId],
            activationsUsed: { increment: 1 },
            lastValidatedAt: new Date(),
          },
        });
      } else {
        await this.logValidation(licenseKey, accountId, brokerName, mtVersion, ipAddress, 'invalid');
        return { valid: false, reason: 'ACCOUNT_NOT_ALLOWED', message: `Account ${accountId} not authorized` };
      }
    } else if (license.allowedAccountIds.length === 0) {
      // First use — register account
      await this.prisma.license.update({
        where: { id: license.id },
        data: { allowedAccountIds: [accountId], activationsUsed: 1, lastValidatedAt: new Date() },
      });
    } else {
      await this.prisma.license.update({ where: { id: license.id }, data: { lastValidatedAt: new Date() } });
    }

    // 6. Cache valid result
    await this.cache.set(cacheKey, { valid: true, botId: license.botId }, LICENSE_CACHE_TTL * 1000);
    await this.logValidation(licenseKey, accountId, brokerName, mtVersion, ipAddress, 'valid');

    return { valid: true, botId: license.botId, message: 'License active' };
  }

  private async logValidation(licenseKey: string, accountId: string, brokerName: string, mtVersion: string, ipAddress: string, result: string) {
    const license = await this.prisma.license.findFirst({ where: { licenseKey }, select: { id: true } });
    if (!license) return;
    // Fire-and-forget — don't await to keep hot path fast
    this.prisma.auditLog.create({
      data: {
        entityType: 'license_validation',
        entityId: license.id,
        action: `validate:${result}`,
        newValues: { accountId, brokerName, mtVersion, result },
        ipAddress,
      },
    }).catch(() => {}); // Swallow errors — logging must not break validation
  }

  async createApiKey(userId: string, name: string, scopes: string[], expiresAt?: Date) {
    // API key format: fbk_{prefix}_{secret}
    // Only prefix + hash stored in DB — full key shown once to user
    const rawKey = `fbk_${crypto.randomBytes(4).toString('hex')}_${crypto.randomBytes(24).toString('hex')}`;
    const prefix = rawKey.split('_').slice(0, 2).join('_');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.create({
      data: { userId, name, keyPrefix: prefix, keyHash, scopes, expiresAt },
    });

    return { id: apiKey.id, key: rawKey, prefix, scopes, expiresAt }; // rawKey shown ONCE
  }

  async validateApiKey(rawKey: string): Promise<{ userId: string; scopes: string[] } | null> {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    // Cache API key validation too
    const cacheKey = `apikey:${keyHash}`;
    const cached = await this.cache.get<{ userId: string; scopes: string[] }>(cacheKey);
    if (cached) return cached;

    const apiKey = await this.prisma.apiKey.findFirst({
      where: { keyHash, revokedAt: null },
      select: { id: true, userId: true, scopes: true, expiresAt: true },
    });

    if (!apiKey) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    const result = { userId: apiKey.userId, scopes: apiKey.scopes };
    await this.cache.set(cacheKey, result, 60 * 1000); // 1 min cache
    await this.prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

    return result;
  }

  async getUserLicenses(userId: string) {
    return this.prisma.license.findMany({
      where: { buyerId: userId, status: 'active' },
      include: {
        bot: { select: { id: true, name: true, slug: true, coverImageUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
