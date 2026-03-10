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
    async createLicenseForSubscription(manager, subscriptionId, userId, botId) {
        const [botVersion] = await manager.query(`SELECT id FROM bot_versions WHERE bot_id = $1 AND is_current = true ORDER BY created_at DESC LIMIT 1`, [botId]);
        const botVersionId = botVersion?.id ?? null;
        const licenseKey = `LK-${(0, crypto_1.randomBytes)(16).toString('hex').toUpperCase()}`;
        await manager.query(`INSERT INTO licenses
         (subscription_id, user_id, bot_id, bot_version_id, license_key, status, max_activations, current_activations)
       VALUES ($1, $2, $3, $4, $5, 'active', 1, 0)`, [subscriptionId, userId, botId, botVersionId, licenseKey]);
        this.logger.log({ msg: 'License created', userId, botId, licenseKey: `${licenseKey.slice(0, 8)}...` });
        return licenseKey;
    }
    async getMyLicenses(userId) {
        const licenses = await this.dataSource.query(`SELECT
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
         l.created_at DESC`, [userId]);
        return licenses.map((l) => ({
            ...l,
            isExpired: l.expires_at ? new Date(l.expires_at) < new Date() : false,
            isActive: l.status === 'active' && (!l.expires_at || new Date(l.expires_at) > new Date()),
        }));
    }
    async revoke(licenseId, requestingUserId, roles, reason) {
        const license = await this.licenseRepo.findOne({ where: { id: licenseId } });
        if (!license)
            throw new common_1.NotFoundException('License not found');
        const isAdmin = roles.includes('admin');
        if (!isAdmin && license.userId !== requestingUserId) {
            throw new common_1.ForbiddenException('You can only revoke your own licenses');
        }
        if (license.status === 'revoked') {
            throw new common_1.ConflictException('License is already revoked');
        }
        await this.licenseRepo.update(licenseId, { status: 'revoked' });
        await this.redis.del(`license:${license.licenseKey}`);
        await this.dataSource.query(`INSERT INTO audit_log (user_id, action, entity_type, entity_id, metadata)
       VALUES ($1, 'license_revoke', 'license', $2, $3)
       ON CONFLICT DO NOTHING`, [
            requestingUserId,
            licenseId,
            JSON.stringify({ reason: reason ?? 'User requested', revokedBy: requestingUserId }),
        ]).catch(() => {
        });
        this.logger.log({ msg: 'License revoked', licenseId, revokedBy: requestingUserId });
        return { success: true, message: 'License revoked successfully' };
    }
    async validate(dto, ip) {
        const rateLimitKey = `license_rl:${dto.licenseKey}`;
        const calls = await this.redis.incr(rateLimitKey);
        if (calls === 1)
            await this.redis.expire(rateLimitKey, this.RATE_LIMIT_WINDOW_SECONDS);
        if (calls > this.MAX_VALIDATIONS_PER_MINUTE) {
            return {
                isValid: false,
                code: LicenseValidationCode.INVALID_KEY,
                message: 'Rate limit exceeded. Please wait before retrying.',
            };
        }
        const cacheKey = `license:${dto.licenseKey}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            const result = JSON.parse(cached);
            this.logValidationAsync(dto.licenseKey, result, ip);
            return result;
        }
        const license = await this.licenseRepo.findOne({
            where: { licenseKey: dto.licenseKey },
        });
        let result;
        if (!license) {
            result = {
                isValid: false,
                code: LicenseValidationCode.INVALID_KEY,
                message: 'License key not found',
            };
        }
        else if (license.status === 'revoked') {
            result = {
                isValid: false,
                code: LicenseValidationCode.REVOKED,
                message: 'License has been revoked',
            };
        }
        else if (license.status === 'expired' || (license.expiresAt && new Date() > license.expiresAt)) {
            result = {
                isValid: false,
                code: LicenseValidationCode.EXPIRED,
                message: 'License has expired',
                expiresAt: license.expiresAt,
            };
            if (license.status !== 'expired') {
                await this.licenseRepo.update(license.id, { status: 'expired' });
            }
        }
        else if (dto.hwidHash && license.hwidHash?.length && !license.hwidHash.includes(dto.hwidHash)) {
            if ((license.currentActivations ?? 0) >= license.maxActivations) {
                result = {
                    isValid: false,
                    code: LicenseValidationCode.MAX_ACTIVATIONS,
                    message: `Maximum device activations (${license.maxActivations}) reached`,
                };
            }
            else {
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
        }
        else {
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
        const ttl = result.isValid ? this.CACHE_TTL_SECONDS : 60;
        await this.redis.setex(cacheKey, ttl, JSON.stringify(result));
        this.logValidationAsync(dto.licenseKey, result, ip);
        return result;
    }
    async expireOverdueLicenses() {
        const result = await this.dataSource.query(`UPDATE licenses SET status = 'expired'
       WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < NOW()
       RETURNING id`);
        const count = result[1] ?? result.length ?? 0;
        if (count > 0) {
            this.logger.log({ msg: 'Licenses expired by scheduler', count });
        }
        return { expired: count };
    }
    logValidationAsync(licenseKey, result, ip) {
        this.dataSource.query(`INSERT INTO license_validations (license_key, ip_address, is_valid, validation_code, validated_at)
       VALUES ($1, $2::inet, $3, $4, NOW())`, [licenseKey.slice(0, 8) + '...', ip, result.isValid, result.code]).catch((err) => this.logger.warn({ msg: 'Failed to log validation', err: err.message }));
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