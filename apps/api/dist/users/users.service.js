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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const typeorm_3 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
let UsersService = class UsersService {
    constructor(userRepo, dataSource) {
        this.userRepo = userRepo;
        this.dataSource = dataSource;
    }
    async create(input) {
        const user = await this.userRepo.save(this.userRepo.create({
            email: input.email,
            passwordHash: input.passwordHash,
            status: 'pending_verification',
        }));
        await this.assignRole(user.id, 'buyer');
        return user;
    }
    async findById(id) {
        return this.userRepo.findOne({ where: { id } });
    }
    async findByEmail(email) {
        return this.userRepo
            .createQueryBuilder('u')
            .addSelect('u.totpSecret')
            .where('u.email = :email', { email })
            .getOne();
    }
    async updateLastLogin(id, ip) {
        await this.userRepo.update(id, { lastLoginAt: new Date(), lastLoginIp: ip });
    }
    async storeTotpSecret(id, secret) {
        await this.userRepo.update(id, { totpSecret: secret });
    }
    async enableTotp(id) {
        await this.userRepo.update(id, { totpEnabled: true });
    }
    async markEmailVerified(id) {
        await this.userRepo.update(id, { emailVerifiedAt: new Date(), status: 'active' });
    }
    async updatePassword(id, passwordHash) {
        await this.userRepo.update(id, { passwordHash });
    }
    async getRolesForUser(userId) {
        const rows = await this.dataSource.query('SELECT role FROM user_roles WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
        return rows.map((r) => r.role);
    }
    async getUserRoles(userId) {
        const rows = await this.dataSource.query('SELECT role FROM user_roles WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
        return rows.map((r) => r.role);
    }
    async assignRole(userId, role, grantedBy, expiresAt) {
        await this.dataSource.query(`INSERT INTO user_roles (user_id, role, granted_by, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, role) DO UPDATE
         SET revoked_at = NULL,
             granted_by = EXCLUDED.granted_by,
             expires_at = EXCLUDED.expires_at`, [userId, role, grantedBy ?? null, expiresAt ?? null]);
    }
    async revokeRole(userId, role) {
        await this.dataSource.query('UPDATE user_roles SET revoked_at = NOW() WHERE user_id = $1 AND role = $2', [userId, role]);
    }
    async findActiveApiKey(keyHash) {
        const result = await this.dataSource.query(`SELECT ak.id as "keyId", ak.user_id as "userId", ak.scopes
       FROM api_keys ak
       WHERE ak.key_hash = $1
         AND ak.revoked_at IS NULL
         AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`, [keyHash]);
        if (!result.length)
            return null;
        return { userId: result[0].userId, keyId: result[0].keyId, scopes: result[0].scopes || [] };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_3.DataSource])
], UsersService);
//# sourceMappingURL=users.service.js.map