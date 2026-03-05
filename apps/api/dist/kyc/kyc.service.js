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
var KycService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KycService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const users_service_1 = require("../users/users.service");
let KycService = KycService_1 = class KycService {
    constructor(dataSource, usersService) {
        this.dataSource = dataSource;
        this.usersService = usersService;
        this.logger = new common_1.Logger(KycService_1.name);
    }
    async submit(userId, dto) {
        const existing = await this.dataSource.query(`SELECT id, status FROM kyc_verifications
       WHERE user_id = $1 AND status IN ('pending','under_review','approved')
       ORDER BY submitted_at DESC LIMIT 1`, [userId]);
        if (existing.length) {
            const { status } = existing[0];
            if (status === 'approved')
                throw new common_1.BadRequestException('KYC already approved');
            if (['pending', 'under_review'].includes(status))
                throw new common_1.BadRequestException(`KYC already ${status}`);
        }
        const [kyc] = await this.dataSource.query(`INSERT INTO kyc_verifications
         (user_id, status, document_type, document_front_url, document_back_url, selfie_url)
       VALUES ($1, 'pending', $2, $3, $4, $5) RETURNING id`, [userId, dto.documentType, dto.documentFrontUrl, dto.documentBackUrl, dto.selfieUrl]);
        this.logger.log({ msg: 'KYC submitted', userId, kycId: kyc.id });
        return { id: kyc.id, status: 'pending', message: 'KYC submitted for review' };
    }
    async getStatus(userId) {
        const [kyc] = await this.dataSource.query(`SELECT id, status, rejection_reason, submitted_at, reviewed_at
       FROM kyc_verifications WHERE user_id = $1
       ORDER BY submitted_at DESC LIMIT 1`, [userId]);
        return kyc ?? { status: 'not_started' };
    }
    async listPending(page = 1, limit = 20) {
        const offset = (page - 1) * limit;
        const [rows, countResult] = await Promise.all([
            this.dataSource.query(`SELECT
           k.id, k.status, k.document_type, k.submitted_at,
           k.document_front_url, k.document_back_url, k.selfie_url,
           u.id AS user_id, u.email,
           bp.display_name
         FROM kyc_verifications k
         JOIN users u ON u.id = k.user_id
         LEFT JOIN buyer_profiles bp ON bp.user_id = u.id
         WHERE k.status IN ('pending', 'under_review')
         ORDER BY k.submitted_at ASC
         LIMIT $1 OFFSET $2`, [limit, offset]),
            this.dataSource.query(`SELECT COUNT(*) FROM kyc_verifications WHERE status IN ('pending','under_review')`),
        ]);
        return { data: rows, total: parseInt(countResult[0].count, 10), page, limit };
    }
    async approve(kycId, adminId) {
        const [kyc] = await this.dataSource.query(`SELECT id, user_id, status FROM kyc_verifications WHERE id = $1`, [kycId]);
        if (!kyc)
            throw new common_1.NotFoundException('KYC record not found');
        if (kyc.status === 'approved')
            throw new common_1.BadRequestException('Already approved');
        await this.dataSource.transaction(async (manager) => {
            await manager.query(`UPDATE kyc_verifications
         SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1
         WHERE id = $2`, [adminId, kycId]);
            await manager.query(`INSERT INTO seller_profiles (user_id, display_name, is_verified_seller)
         SELECT u.id, COALESCE(bp.display_name, split_part(u.email, '@', 1)), false
         FROM users u
         LEFT JOIN buyer_profiles bp ON bp.user_id = u.id
         WHERE u.id = $1
         ON CONFLICT (user_id) DO NOTHING`, [kyc.user_id]);
        });
        await this.usersService.assignRole(kyc.user_id, 'seller', adminId);
        this.logger.log({ msg: 'KYC approved', kycId, userId: kyc.user_id, adminId });
        return { message: 'KYC approved. Seller role granted.' };
    }
    async reject(kycId, adminId, reason) {
        const [kyc] = await this.dataSource.query(`SELECT id, user_id, status FROM kyc_verifications WHERE id = $1`, [kycId]);
        if (!kyc)
            throw new common_1.NotFoundException('KYC record not found');
        if (kyc.status === 'approved')
            throw new common_1.BadRequestException('Cannot reject an approved KYC');
        await this.dataSource.query(`UPDATE kyc_verifications
       SET status = 'rejected', rejection_reason = $1, reviewed_at = NOW(), reviewed_by = $2
       WHERE id = $3`, [reason, adminId, kycId]);
        this.logger.log({ msg: 'KYC rejected', kycId, userId: kyc.user_id, adminId, reason });
        return { message: 'KYC rejected.' };
    }
};
exports.KycService = KycService;
exports.KycService = KycService = KycService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        users_service_1.UsersService])
], KycService);
//# sourceMappingURL=kyc.service.js.map