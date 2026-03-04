// apps/api/src/kyc/kyc.service.ts
import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly usersService: UsersService,
  ) {}

  async submit(userId: string, dto: SubmitKycDto) {
    const existing = await this.dataSource.query(
      `SELECT id, status FROM kyc_verifications
       WHERE user_id = $1 AND status IN ('pending','under_review','approved')
       ORDER BY submitted_at DESC LIMIT 1`,
      [userId],
    );
    if (existing.length) {
      const { status } = existing[0];
      if (status === 'approved') throw new BadRequestException('KYC already approved');
      if (['pending', 'under_review'].includes(status))
        throw new BadRequestException(`KYC already ${status}`);
    }

    const [kyc] = await this.dataSource.query(
      `INSERT INTO kyc_verifications
         (user_id, status, document_type, document_front_url, document_back_url, selfie_url)
       VALUES ($1, 'pending', $2, $3, $4, $5) RETURNING id`,
      [userId, dto.documentType, dto.documentFrontUrl, dto.documentBackUrl, dto.selfieUrl],
    );

    this.logger.log({ msg: 'KYC submitted', userId, kycId: kyc.id });
    return { id: kyc.id, status: 'pending', message: 'KYC submitted for review' };
  }

  async getStatus(userId: string) {
    const [kyc] = await this.dataSource.query(
      `SELECT id, status, rejection_reason, submitted_at, reviewed_at
       FROM kyc_verifications WHERE user_id = $1
       ORDER BY submitted_at DESC LIMIT 1`,
      [userId],
    );
    return kyc ?? { status: 'not_started' };
  }

  // ─── Admin actions ──────────────────────────────────────────────────────────

  /** Returns all pending KYC submissions for the admin panel. */
  async listPending(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows, countResult] = await Promise.all([
      this.dataSource.query(
        `SELECT
           k.id, k.status, k.document_type, k.submitted_at,
           k.document_front_url, k.document_back_url, k.selfie_url,
           u.id AS user_id, u.email,
           bp.display_name
         FROM kyc_verifications k
         JOIN users u ON u.id = k.user_id
         LEFT JOIN buyer_profiles bp ON bp.user_id = u.id
         WHERE k.status IN ('pending', 'under_review')
         ORDER BY k.submitted_at ASC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) FROM kyc_verifications WHERE status IN ('pending','under_review')`,
      ),
    ]);
    return { data: rows, total: parseInt(countResult[0].count, 10), page, limit };
  }

  /** Approve a KYC submission. Grants the 'seller' role and creates a seller profile. */
  async approve(kycId: string, adminId: string) {
    const [kyc] = await this.dataSource.query(
      `SELECT id, user_id, status FROM kyc_verifications WHERE id = $1`,
      [kycId],
    );
    if (!kyc) throw new NotFoundException('KYC record not found');
    if (kyc.status === 'approved') throw new BadRequestException('Already approved');

    await this.dataSource.transaction(async (manager) => {
      // 1. Update KYC record
      await manager.query(
        `UPDATE kyc_verifications
         SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1
         WHERE id = $2`,
        [adminId, kycId],
      );

      // 2. Create seller profile if it doesn't exist
      await manager.query(
        `INSERT INTO seller_profiles (user_id, display_name, is_verified_seller)
         SELECT u.id, COALESCE(bp.display_name, split_part(u.email, '@', 1)), false
         FROM users u
         LEFT JOIN buyer_profiles bp ON bp.user_id = u.id
         WHERE u.id = $1
         ON CONFLICT (user_id) DO NOTHING`,
        [kyc.user_id],
      );
    });

    // 3. Grant seller role (outside transaction — idempotent)
    await this.usersService.assignRole(kyc.user_id, 'seller', adminId);

    this.logger.log({ msg: 'KYC approved', kycId, userId: kyc.user_id, adminId });
    return { message: 'KYC approved. Seller role granted.' };
  }

  /** Reject a KYC submission with a reason. */
  async reject(kycId: string, adminId: string, reason: string) {
    const [kyc] = await this.dataSource.query(
      `SELECT id, user_id, status FROM kyc_verifications WHERE id = $1`,
      [kycId],
    );
    if (!kyc) throw new NotFoundException('KYC record not found');
    if (kyc.status === 'approved') throw new BadRequestException('Cannot reject an approved KYC');

    await this.dataSource.query(
      `UPDATE kyc_verifications
       SET status = 'rejected', rejection_reason = $1, reviewed_at = NOW(), reviewed_by = $2
       WHERE id = $3`,
      [reason, adminId, kycId],
    );

    this.logger.log({ msg: 'KYC rejected', kycId, userId: kyc.user_id, adminId, reason });
    return { message: 'KYC rejected.' };
  }
}
