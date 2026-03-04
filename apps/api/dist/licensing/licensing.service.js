"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LicensingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicensingService = exports.LicenseValidationCode = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
const license_entity_1 = require("./entities/license.entity");
const crypto_1 = require("crypto");
var LicenseValidationCode;
(function (LicenseValidationCode) {
    LicenseValidationCode["VALID"] = "VALID";
    LicenseValidationCode["INVALID_KEY"] = "INVALID_KEY";
    LicenseValidationCode["EXPIRED"] = "EXPIRED";
    LicenseValidationCode["REVOKED"] = "REVOKED";
    LicenseValidationCode["HWID_MISMATCH"] = "HWID_MISMATCH";
    LicenseValidationCode["MAX_ACTIVATIONS"] = "MAX_ACTIVATIONS";
})(LicenseValidationCode || (exports.LicenseValidationCode = LicenseValidationCode = {}));
let LicensingService = LicensingService_1 = class LicensingService {
    constructor(licenseRepo, redis, dataSource) {
        this.licenseRepo = licenseRepo;
        this.redis = redis;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(LicensingService_1.name);
        this.CACHE_TTL_SECONDS = 300;
        this.RATE_LIMIT_WINDOW_SECONDS = 60;
        this.MAX_VALIDATIONS_PER_MINUTE = 10;
    }
    async validate(dto, ip) {
        const startMs = Date.now();
        const rateLimitKey = `rl:license:${dto.licenseKey}`;
        const currentCount = await this.redis.incr(rateLimitKey);
        if (currentCount === 1) {
            await this.redis.expire(rateLimitKey, this.RATE_LIMIT_WINDOW_SECONDS);
        }
        if (currentCount > this.MAX_VALIDATIONS_PER_MINUTE) {
            this.logger.warn({ msg: 'License rate limit exceeded', licenseKey: dto.licenseKey, count: currentCount });
            const cached = await this.getCachedValidation(dto.licenseKey);
            if (cached)
                return cached;
        }
        const cached = await this.getCachedValidation(dto.licenseKey);
        if (cached) {
            this.logValidationAsync(dto, ip, cached, Date.now() - startMs);
            return cached;
        }
        const license = await this.licenseRepo.findOne({ where: { licenseKey: dto.licenseKey } });
        const result = this.evaluateLicense(license, dto);
        await this.cacheValidation(dto.licenseKey, result);
        this.logValidationAsync(dto, ip, result, Date.now() - startMs);
        if (result.isValid && dto.hwidHash && license) {
            this.registerHwidAsync(license, dto.hwidHash);
        }
        return result;
    }
    evaluateLicense(license, dto) {
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
            const normalizedNewHash = (0, crypto_1.createHash)('sha256').update(dto.hwidHash).digest('hex');
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
    async getCachedValidation(licenseKey) {
        const cacheKey = `license:validation:${licenseKey}`;
        const cached = await this.redis.get(cacheKey);
        return cached ? JSON.parse(cached) : null;
    }
    async cacheValidation(licenseKey, result) {
        const cacheKey = `license:validation:${licenseKey}`;
        const ttl = result.isValid ? this.CACHE_TTL_SECONDS : 10;
        await this.redis.setex(cacheKey, ttl, JSON.stringify(result));
    }
    logValidationAsync(dto, ip, result, responseMs) {
        setImmediate(async () => {
            try {
                const license = await this.licenseRepo.findOne({ where: { licenseKey: dto.licenseKey } });
                if (!license)
                    return;
                await this.dataSource.query(`INSERT INTO license_validations 
           (license_id, is_valid, hwid_hash, ip_address, mt_account_id, mt_platform, response_code, response_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [license.id, result.isValid, dto.hwidHash, ip, dto.mtAccountId, dto.mtPlatform, result.code, responseMs]);
                await this.licenseRepo.update(license.id, { lastValidatedAt: new Date() });
            }
            catch (err) {
                this.logger.error({ msg: 'Failed to log license validation', err });
            }
        });
    }
    registerHwidAsync(license, newHwid) {
        setImmediate(async () => {
            try {
                const normalizedHash = (0, crypto_1.createHash)('sha256').update(newHwid).digest('hex');
                const existing = license.hwidHash || [];
                if (!existing.includes(normalizedHash)) {
                    const updated = [...existing, normalizedHash];
                    await this.licenseRepo.update(license.id, {
                        hwidHash: updated,
                        currentActivations: updated.length,
                    });
                    await this.redis.del(`license:validation:${license.licenseKey}`);
                }
            }
            catch (err) {
                this.logger.error({ msg: 'Failed to register HWID', licenseId: license.id, err });
            }
        });
    }
    async generateLicenseKey(subscriptionId, userId, botId, botVersionId) {
        const licenseKey = `LK-${(0, crypto_1.randomBytes)(16).toString('hex').toUpperCase()}`;
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
    async revokeLicense(licenseId, reason) {
        await this.licenseRepo.update(licenseId, { status: 'revoked' });
        const license = await this.licenseRepo.findOne({ where: { id: licenseId } });
        if (license)
            await this.redis.del(`license:validation:${license.licenseKey}`);
    }
    async createLicenseForSubscription(manager, subscriptionId, userId, botId) {
        const [botVersion] = await manager.query(`SELECT id 
       FROM bot_versions 
       WHERE bot_id = $1 
         AND is_active = true 
       ORDER BY created_at DESC 
       LIMIT 1`, [botId]);
        const botVersionId = botVersion?.id ?? null;
        const licenseKey = `LK-${(0, crypto_1.randomBytes)(16)
            .toString('hex')
            .toUpperCase()}`;
        await manager.query(`INSERT INTO licenses
        (subscription_id, user_id, bot_id, bot_version_id, license_key, status, max_activations, current_activations)
       VALUES ($1, $2, $3, $4, $5, 'active', 1, 0)`, [
            subscriptionId,
            userId,
            botId,
            botVersionId,
            licenseKey,
        ]);
        this.logger.log({
            msg: 'License created from subscription',
            userId,
            botId,
        });
        return licenseKey;
    }
};
exports.LicensingService = LicensingService;
exports.LicensingService = LicensingService = LicensingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(license_entity_1.License)),
    __param(1, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        ioredis_2.default,
        typeorm_2.DataSource])
], LicensingService);
//# sourceMappingURL=licensing.service.js.map