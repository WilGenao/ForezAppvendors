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
let KycService = KycService_1 = class KycService {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(KycService_1.name);
    }
    async submit(userId, dto) {
        const existing = await this.dataSource.query(`SELECT id, status FROM kyc_verifications WHERE user_id = $1 AND status IN ('pending','under_review','approved') ORDER BY submitted_at DESC LIMIT 1`, [userId]);
        if (existing.length) {
            const { status } = existing[0];
            if (status === 'approved')
                throw new common_1.BadRequestException('KYC already approved');
            if (status === 'pending' || status === 'under_review')
                throw new common_1.BadRequestException(`KYC already ${status}`);
        }
        const [kyc] = await this.dataSource.query(`INSERT INTO kyc_verifications (user_id, status, document_type, document_front_url, document_back_url, selfie_url)
       VALUES ($1, 'pending', $2, $3, $4, $5) RETURNING id`, [userId, dto.documentType, dto.documentFrontUrl, dto.documentBackUrl, dto.selfieUrl]);
        this.logger.log({ msg: 'KYC submitted', userId, kycId: kyc.id });
        return { id: kyc.id, status: 'pending', message: 'KYC submitted for review' };
    }
    async getStatus(userId) {
        const [kyc] = await this.dataSource.query(`SELECT id, status, rejection_reason, submitted_at, reviewed_at FROM kyc_verifications WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1`, [userId]);
        return kyc || { status: 'not_started' };
    }
};
exports.KycService = KycService;
exports.KycService = KycService = KycService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], KycService);
//# sourceMappingURL=kyc.service.js.map