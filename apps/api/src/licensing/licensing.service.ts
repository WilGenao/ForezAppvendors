import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
  // Cache TTL: 5 minutes. Licencias revocadas se invalidan en el próximo ciclo.
  // Trade-off: un bot revocado puede seguir operando 5 min. Aceptable para pre-seed.
  private readonly CACHE_TTL_SECONDS = 300;
  private readonly RATE_LIMIT_WINDOW_SECONDS = 60;
  // Max validaciones por licencia por minuto — evita que MT4 llame en cada tick
  private readonly MAX_VALIDATIONS_PER_MINUTE = 10;

  constructor(
    @InjectRepository(License) private readonly licenseRepo: Repository<License>,
    @InjectRedis() private readonly redis: Redis,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * validate es el endpoint más crítico del sistema.
   * Es llamado desde MT4/5 periódicamente. Puede ser abusado.
   *
   * Estrategia de protección:
   * 1. Rate limit por license_key en Redis (no IP — las IPs de brokers varían)
   * 2. Cache del resultado en Redis por 5 min para evitar hits a PostgreSQL
   * 3. Log async en license_validations (no bloquea la respuesta)
   * 4. Respuesta siempre en <50ms (SLA interno)
   */
  async validate(dto: ValidateLicenseDto, ip: string): Promise<ValidationResult> {
    const startMs = Date.now();

    // 1. Rate limiting por license key
    const rateLimitKey = `rl:license:${dto.licenseKey}`;
    const currentCount = await this.redis.incr(rateLimitKey);
    if (currentCount === 1) {
      await this.redis.expire(rateLimitKey, this.RATE_LIMIT_WINDOW_SECONDS);
    }
    if (currentCount > this.MAX_VALIDATIONS_PER_MINUTE) {
      this.logger.warn({ msg: 'License rate limit exceeded', licenseKey: dto.licenseKey, count: currentCount });
      // Retornamos VALID si teníamos cache positivo previo — no penalizamos al bot
      const cached = await this.getCachedValidation(dto.licenseKey);
      if (cached) return cached;
    }

    // 2. Check cache
    const cached = await this.getCachedValidation(dto.licenseKey);
    if (cached) {
      this.logValidationAsync(dto, ip, cached, Date.now() - startMs);
      return cached;
    }

    // 3. Query a PostgreSQL
    const license = await this.licenseRepo.findOne({ where: { licenseKey: dto.licenseKey } });

    const result = this.evaluateLicense(license, dto);

    // 4. Cachear resultado
    await this.cacheValidation(dto.licenseKey, result);

    // 5. Log async — no esperamos
    this.logValidationAsync(dto, ip, result, Date.now() - startMs);

    // 6. Si es válido y hay nuevo HWID, registrar
    if (result.isValid && dto.hwidHash && license) {
      this.registerHwidAsync(license, dto.hwidHash);
    }

    return result;
  }

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
    // HWID check: si ya tiene HWIDs registrados, el nuevo debe estar en la lista
    if (dto.hwidHash && license.hwidHash?.length) {
      const normalizedNewHash = createHash('sha256').update(dto.hwidHash).digest('hex');
      const known = license.hwidHash.includes(normalizedNewHash);
      const hasSlot = license.currentActivations < license.maxActivations;
      if (!known && !hasSlot) {
        return { isValid: false, code: LicenseValidationCode.MAX_ACTIVATIONS, message: `Max activations (${license.maxActivations}) reached` };
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
    // TTL más corto para licencias inválidas (10s) — permite corrección rápida
    const ttl = result.isValid ? this.CACHE_TTL_SECONDS : 10;
    await this.redis.setex(cacheKey, ttl, JSON.stringify(result));
  }

  private logValidationAsync(dto: ValidateLicenseDto, ip: string, result: ValidationResult, responseMs: number): void {
    // Fire-and-forget con manejo de error silencioso — no debe impactar la respuesta
    setImmediate(async () => {
      try {
        const cached = await this.getCachedValidation(dto.licenseKey);
        if (!cached) return;
        const license = await this.licenseRepo.findOne({ where: { licenseKey: dto.licenseKey } });
        if (!license) return;
        await this.dataSource.query(
          `INSERT INTO license_validations (license_id, is_valid, hwid_hash, ip_address, mt_account_id, mt_platform, response_code, response_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [license.id, result.isValid, dto.hwidHash, ip, dto.mtAccountId, dto.mtPlatform, result.code, responseMs],
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
          // Invalidar cache para forzar re-validación con nuevo HWID
          await this.redis.del(`license:validation:${license.licenseKey}`);
        }
      } catch (err) {
        this.logger.error({ msg: 'Failed to register HWID', licenseId: license.id, err });
      }
    });
  }

  async generateLicenseKey(subscriptionId: string, userId: string, botId: string, botVersionId: string): Promise<License> {
    const licenseKey = `LK-${randomBytes(16).toString('hex').toUpperCase()}`;
    const license = this.licenseRepo.create({ subscriptionId, userId, botId, botVersionId, licenseKey, status: 'active' });
    return this.licenseRepo.save(license);
  }

  async revokeLicense(licenseId: string, reason: string): Promise<void> {
    await this.licenseRepo.update(licenseId, { status: 'revoked' });
    const license = await this.licenseRepo.findOne({ where: { id: licenseId } });
    if (license) await this.redis.del(`license:validation:${license.licenseKey}`);
  }
}
