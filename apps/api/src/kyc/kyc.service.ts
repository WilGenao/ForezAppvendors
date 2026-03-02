import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SubmitKycDto } from './dto/submit-kyc.dto';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(private readonly dataSource: DataSource) {}

  async submit(userId: string, dto: SubmitKycDto) {
    const existing = await this.dataSource.query(
      `SELECT id, status FROM kyc_verifications WHERE user_id = $1 AND status IN ('pending','under_review','approved') ORDER BY submitted_at DESC LIMIT 1`,
      [userId],
    );
    if (existing.length) {
      const { status } = existing[0];
      if (status === 'approved') throw new BadRequestException('KYC already approved');
      if (status === 'pending' || status === 'under_review') throw new BadRequestException(`KYC already ${status}`);
    }

    const [kyc] = await this.dataSource.query(
      `INSERT INTO kyc_verifications (user_id, status, document_type, document_front_url, document_back_url, selfie_url)
       VALUES ($1, 'pending', $2, $3, $4, $5) RETURNING id`,
      [userId, dto.documentType, dto.documentFrontUrl, dto.documentBackUrl, dto.selfieUrl],
    );
    this.logger.log({ msg: 'KYC submitted', userId, kycId: kyc.id });
    return { id: kyc.id, status: 'pending', message: 'KYC submitted for review' };
  }

  async getStatus(userId: string) {
    const [kyc] = await this.dataSource.query(
      `SELECT id, status, rejection_reason, submitted_at, reviewed_at FROM kyc_verifications WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1`,
      [userId],
    );
    return kyc || { status: 'not_started' };
  }
}
