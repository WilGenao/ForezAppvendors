// apps/api/src/licensing/licensing.service.ts
// EXTENDED — adds getMyLicenses, revoke, expiration check
// Original validate() and createLicenseForSubscription() preserved.

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { License } from './entities/license.entity';
import { ValidateLicenseDto } from './dto/validate-license.dto';
import { createHash, randomBytes } from 'crypto';

// Validation response codes
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
    @InjectRepository(License)
    private readonly licenseRepo: Repository<License>,
    @InjectRedis()
    private readonly redis: Redis,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Called by PaymentsService inside a transaction ─────────────────────────

  async createLicenseForSubscription(
    manager: EntityManager,
    subscriptionId: string,
    userId: string,
    botId: string,
  ): Promise<string> {
    const [botVersion] = await manager.query(
      `SELECT id FROM bot_versions WHERE bot_id = $1 AND is_current = true ORDER BY created_at DESC LIMIT 1`,
      [botId],
    );

    const botVersionId = botVersion?.id ?? null;
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

  // ─── GET /licenses/my ────────────────────────────────────────────────────────

  /**
   * Returns all licenses for the authenticated user.
   * Includes bot name, platform, and subscription status.
   */
  async getMyLicenses(userId: string): Promise<unknown[]> {
    const licenses = await this.dataSource.query(
      `SELECT
         l.id,
         l.license_key,
         l.status,
         l.max_activations,
         l.current_activations,
         l.expires_at,
         l.last_validated_at,
         l.created_at,
         b.id   AS bot_id,
         b.name AS bot_name,
         b.slug AS bot_slug,
         b.mt_platform,
         s.status AS subscription_status,
         s.current_period_end,
         bv.version AS bot_version
       FROM licenses l
       JOIN bots b ON b.id = l.bot_id
       LEFT JOIN subscriptions s ON s.id = l.subscription_id
       LEFT JOIN bot_versions bv ON bv.id = l.bot_version_id
       WHERE l.user_id = $1
       ORDER BY
         CASE l.status WHEN 'active' THEN 0 WHEN 'expired' THEN 1 ELSE 2 END,
         l.created_at DESC`,
      [userId],
    );

    return licenses.map((l) => ({
      ...l,
      isExpired: l.expires_at ? new Date(l.expires_at) < new Date() : false,
      isActive: l.status === 'active' && (!l.expires_at || new Date(l.expires_at) > new Date()),
    }));
  }

  // ─── POST /licenses/revoke/:id ───────────────────────────────────────────────

  /**
   * Allows a user to revoke their own license (e.g. to reset device binding).
   * Admins can revoke any license.
   */
  async revoke(
    licenseId: string,
    requestingUserId: string,
    roles: string[],
    reason?: string,
  ): Promise<{ success: boolean; message: string }> {
    const license = await this.licenseRepo.findOne({ where: { id: licenseId } });

    if (!license) throw new NotFoundException('License not found');

    // Non-admin can only revoke their own licenses
    const isAdmin = roles.includes('admin');
    if (!isAdmin && license.userId !== requestingUserId) {
      throw new ForbiddenException('You can only revoke your own licenses');
    }

    if (license.status === 'revoked') {
      throw new ConflictException('License is already revoked');
    }

    await this.licenseRepo.update(licenseId, { status: 'revoked' });

    // Invalidate Redis cache immediately so MT4/5 gets the revoked status
    await this.redis.del(`license:${license.licenseKey}`);

    // Log revocation reason
    await this.dataSource.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'license_revoke', 'license', $2, $3)
       ON CONFLICT DO NOTHING`,
      [
        requestingUserId,
        licenseId,
        JSON.stringify({ reason: reason ?? 'User requested', revokedBy: requestingUserId }),
      ],
    ).catch(() => {
      // audit_log might not exist in all environments — non-fatal
    });

    this.logger.log({ msg: 'License revoked', licenseId, revokedBy: requestingUserId });
    return { success: true, message: 'License revoked successfully' };
  }

  // ─── Validate (called from MT4/MT5) ─────────────────────────────────────────

  async validate(dto: ValidateLicenseDto, ip: string): Promise<ValidationResult> {
    // Rate limit per license key
    const rateLimitKey = `license_rl:${dto.licenseKey}`;
    const calls = await this.redis.incr(rateLimitKey);
    if (calls === 1) await this.redis.expire(rateLimitKey, this.RATE_LIMIT_WINDOW_SECONDS);
    if (calls > this.MAX_VALIDATIONS_PER_MINUTE) {
      return {
        isValid: false,
        code: LicenseValidationCode.INVALID_KEY,
        message: 'Rate limit exceeded. Please wait before retrying.',
      };
    }

    // Check Redis cache
    const cacheKey = `license:${dto.licenseKey}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const result = JSON.parse(cached) as ValidationResult;
      this.logValidationAsync(dto.licenseKey, result, ip);
      return result;
    }

    // DB lookup
    const license = await this.licenseRepo.findOne({
      where: { licenseKey: dto.licenseKey },
    });

    let result: ValidationResult;

    if (!license) {
      result = {
        isValid: false,
        code: LicenseValidationCode.INVALID_KEY,
        message: 'License key not found',
      };
    } else if (license.status === 'revoked') {
      result = {
        isValid: false,
        code: LicenseValidationCode.REVOKED,
        message: 'License has been revoked',
      };
    } else if (license.status === 'expired' || (license.expiresAt && new Date() > license.expiresAt)) {
      result = {
        isValid: false,
        code: LicenseValidationCode.EXPIRED,
        message: 'License has expired',
        expiresAt: license.expiresAt,
      };
      // Keep status in sync
      if (license.status !== 'expired') {
        await this.licenseRepo.update(license.id, { status: 'expired' });
      }
    } else if (dto.hwidHash && license.hwidHash?.length && !license.hwidHash.includes(dto.hwidHash)) {
      if ((license.currentActivations ?? 0) >= license.maxActivations) {
        result = {
          isValid: false,
          code: LicenseValidationCode.MAX_ACTIVATIONS,
          message: `Maximum device activations (${license.maxActivations}) reached`,
        };
      } else {
        // Register new HWID
        const updatedHwids = [...(license.hwidHash ?? []), dto.hwidHash];
        await this.licenseRepo.update(license.id, {
          hwidHash: updatedHwids,
          currentActivations: (license.currentActivations ?? 0) + 1,
          lastValidatedAt: new Date(),
        });
        result = {
          isValid: true,
          code: LicenseValidationCode.VALID,
          message: 'License valid — new device registered',
          expiresAt: license.expiresAt,
          botId: license.botId,
          botVersionId: license.botVersionId,
        };
      }
    } else {
      // Valid
      await this.licenseRepo.update(license.id, { lastValidatedAt: new Date() });
      result = {
        isValid: true,
        code: LicenseValidationCode.VALID,
        message: 'License is valid',
        expiresAt: license.expiresAt,
        botId: license.botId,
        botVersionId: license.botVersionId,
      };
    }

    // Cache the result (shorter TTL for invalid/revoked)
    const ttl = result.isValid ? this.CACHE_TTL_SECONDS : 60;
    await this.redis.setex(cacheKey, ttl, JSON.stringify(result));

    this.logValidationAsync(dto.licenseKey, result, ip);
    return result;
  }

  // ─── Expiration check (run via cron or scheduled task) ───────────────────────

  /**
   * Mark licenses as expired when expiresAt has passed.
   * Call this from a scheduled job (e.g. every hour).
   */
  async expireOverdueLicenses(): Promise<{ expired: number }> {
    const result = await this.dataSource.query(
      `UPDATE licenses SET status = 'expired'
       WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < NOW()
       RETURNING id`,
    );
    const count = result[1] ?? result.length ?? 0;
    if (count > 0) {
      this.logger.log({ msg: 'Licenses expired by scheduler', count });
    }
    return { expired: count };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private logValidationAsync(licenseKey: string, result: ValidationResult, ip: string): void {
    // Fire and forget — don't block the response
    this.dataSource.query(
      `INSERT INTO license_validations (license_key, ip_address, is_valid, validation_code, validated_at)
       VALUES ($1, $2::inet, $3, $4, NOW())`,
      [licenseKey.slice(0, 8) + '...', ip, result.isValid, result.code],
    ).catch((err) => this.logger.warn({ msg: 'Failed to log validation', err: err.message }));
  }
}
