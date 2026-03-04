import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { License } from './entities/license.entity';
import { ValidateLicenseDto } from './dto/validate-license.dto';
import { createHash, randomBytes } from 'crypto';

// Validation response codes — typed, not strings
export enum LicenseValidationCode {
  VALID = 'VALID',
  INVALID_KEY = 'INVALID_KEY',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  HWID_MISMATCH = 'HWID_MISMATCH',
  MAX_ACTIVATIONS = 'MAX_ACTIVATIONS',
}

export interface ValidationResult {
  isValid: boolean;
  code: LicenseValidationCode;
  message: string;
  expiresAt?: Date;
  botId?: string;
  botVersionId?: string;
}

@Injectable()
export class LicensingService {
  private readonly logger = new Logger(LicensingService.name);
  private readonly CACHE_TTL_SECONDS = 300;
  private readonly RATE_LIMIT_WINDOW_SECONDS = 60;
  private readonly MAX_VALIDATIONS_PER_MINUTE = 10;

  constructor(
    @InjectRepository(License) private readonly licenseRepo: Repository<License>,
    @InjectRedis() private readonly redis: Redis,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Called from PaymentsService.handleCheckoutCompleted() inside a transaction.
   * Creates a license record tied to the subscription.
   * Uses the provided EntityManager so the insert is part of the outer transaction.
   */
  async createLicenseForSubscription(
    manager: EntityManager,
    subscriptionId: string,
    userId: string,
    botId: string,
  ): Promise<string> {
    // Get the latest active bot version for this bot
    const [botVersion] = await manager.query(
      `SELECT id FROM bot_versions WHERE bot_id = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1`,
      [botId],
    );

    const botVersionId = botVersion?.id ?? null;

    // Generate a cryptographically random license key
    const licenseKey = `LK-${randomBytes(16).toString('hex').toUpperCase()}`;

    await manager.query(
      `INSERT INTO licenses
         (subscription_id, user_id, bot_id, bot_version_id, license_key, status, max_activations, current_activations)
       VALUES ($1, $2, $3, $4, $5, 'active', 1, 0)`,
      [subscriptionId, userId, botId, botVersionId, licenseKey],
    );

    this.logger.log({ msg: 'License created', userId, botId, licenseKey: `${licenseKey.slice(0, 8)}...` });
    return licenseKey;
  }

  /**
   * validate — the most critical endpoint in the system.
   * Called from MT4/MT5 periodically. Designed for high frequency.
   *
   * Protection strategy:
   * 1. Rate limit by license_key in Redis (not IP — broker IPs vary)
   * 2. Cache result in Redis for 5 min to avoid PostgreSQL hits
   * 3. Async logging in license_validations (does not block response)
   * 4. Always responds in <50ms (internal SLA)
   */
  async validate(dto: ValidateLicenseDto, ip: string): Promise<ValidationResult> {
    const startMs = Date.now();

    // 1. Rate limiting per license key
    const rateLimitKey = `rl:license:${dto.licenseKey}`;
    const currentCount = await this.redis.incr(rateLimitKey);
    if (currentCount === 1) {
      await this.redis.expire(rateLimitKey, this.RATE_LIMIT_WINDOW_SECONDS);
    }
    if (currentCount > this.MAX_VALIDATIONS_PER_MINUTE) {
      this.logger.warn({ msg: 'License rate limit exceeded', licenseKey: dto.licenseKey, count: currentCount });
      // Return cached result if available — don't penalize legitimate bots
      const cached = await this.getCachedValidation(dto.licenseKey);
      if (cached) return cached;
    }

    // 2. Check cache
    const cached = await this.getCachedValidation(dto.licenseKey);
    if (cached) {
      this.logValidationAsync(dto, ip, cached, Date.now() - startMs);
      return cached;
    }

    // 3. Query PostgreSQL
    const license = await this.licenseRepo.findOne({ where: { licenseKey: dto.licenseKey } });

    const result = this.evaluateLicense(license, dto);

    // 4. Cache result
    await this.cacheValidation(dto.licenseKey, result);

    // 5. Log async — don't await
    this.logValidationAsync(dto, ip, result, Date.now() - startMs);

    // 6. Register new HWID if valid
    if (result.isValid && dto.hwidHash && license) {
      this.registerHwidAsync(license, dto.hwidHash);
    }

    return result;
  }

  async generateLicenseKey(
    subscriptionId: string,
    userId: string,
    botId: string,
    botVersionId: string,
  ): Promise<License> {
    const licenseKey = `LK-${randomBytes(16).toString('hex').toUpperCase()}`;
    const license = this.licenseRepo.create({
      subscriptionId,
      userId,
      botId,
      botVersionId,
      licenseKey,
      status: 'active',
    });
    return this.licenseRepo.save(license);
  }

  async revokeLicense(licenseId: string): Promise<void> {
    await this.licenseRepo.update(licenseId, { status: 'revoked' });
    const license = await this.licenseRepo.findOne({ where: { id: licenseId } });
    if (license) {
      await this.redis.del(`license:validation:${license.licenseKey}`);
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private evaluateLicense(license: License | null, dto: ValidateLicenseDto): ValidationResult {
    if (!license) {
      return { isValid: false, code: LicenseValidationCode.INVALID_KEY, message: 'License key not found' };
    }
    if (license.status === 'revoked') {
      return { isValid: false, code: LicenseValidationCode.REVOKED, message: 'License has been revoked' };
    }
    if (license.status === 'expired' || (license.expiresAt && license.expiresAt < new Date())) {
      return { isValid: false, code: LicenseValidationCode.EXPIRED, message: 'License has expired' };
    }
    if (dto.hwidHash && license.hwidHash?.length) {
      const normalizedNewHash = createHash('sha256').update(dto.hwidHash).digest('hex');
      const known = license.hwidHash.includes(normalizedNewHash);
      const hasSlot = license.currentActivations < license.maxActivations;
      if (!known && !hasSlot) {
        return {
          isValid: false,
          code: LicenseValidationCode.MAX_ACTIVATIONS,
          message: `Max activations (${license.maxActivations}) reached`,
        };
      }
    }
    return {
      isValid: true,
      code: LicenseValidationCode.VALID,
      message: 'License valid',
      expiresAt: license.expiresAt,
      botId: license.botId,
      botVersionId: license.botVersionId,
    };
  }

  private async getCachedValidation(licenseKey: string): Promise<ValidationResult | null> {
    const cacheKey = `license:validation:${licenseKey}`;
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  private async cacheValidation(licenseKey: string, result: ValidationResult): Promise<void> {
    const cacheKey = `license:validation:${licenseKey}`;
    // Shorter TTL for invalid licenses (10s) — allows quick correction
    const ttl = result.isValid ? this.CACHE_TTL_SECONDS : 10;
    await this.redis.setex(cacheKey, ttl, JSON.stringify(result));
  }

  private logValidationAsync(
    dto: ValidateLicenseDto,
    ip: string,
    result: ValidationResult,
    responseMs: number,
  ): void {
    setImmediate(async () => {
      try {
        const license = await this.licenseRepo.findOne({ where: { licenseKey: dto.licenseKey } });
        if (!license) return;
        await this.dataSource.query(
          `INSERT INTO license_validations
             (license_id, is_valid, hwid_hash, ip_address, mt_account_id, mt_platform, response_code, response_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            license.id,
            result.isValid,
            dto.hwidHash,
            ip,
            dto.mtAccountId,
            dto.mtPlatform,
            result.code,
            responseMs,
          ],
        );
        await this.licenseRepo.update(license.id, { lastValidatedAt: new Date() });
      } catch (err) {
        this.logger.error({ msg: 'Failed to log license validation', err });
      }
    });
  }

  private registerHwidAsync(license: License, newHwid: string): void {
    setImmediate(async () => {
      try {
        const normalizedHash = createHash('sha256').update(newHwid).digest('hex');
        const existing = license.hwidHash || [];
        if (!existing.includes(normalizedHash)) {
          const updated = [...existing, normalizedHash];
          await this.licenseRepo.update(license.id, {
            hwidHash: updated,
            currentActivations: updated.length,
          });
          // Invalidate cache so next validation fetches fresh data with new HWID
          await this.redis.del(`license:validation:${license.licenseKey}`);
        }
      } catch (err) {
        this.logger.error({ msg: 'Failed to register HWID', licenseId: license.id, err });
      }
    });
  }
}
