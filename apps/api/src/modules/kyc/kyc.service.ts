import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundError, ValidationError } from '../../common/errors/app.errors';

@Injectable()
export class KycService {
  constructor(private prisma: PrismaService) {}

  async submitKyc(userId: string, documentType: string, documentBlobUrl: string, selfieBlobUrl: string) {
    const existing = await this.prisma.kycVerification.findFirst({
      where: { userId, status: { in: ['pending', 'under_review', 'approved'] } },
    });
    if (existing?.status === 'approved') throw new ValidationError('KYC already approved');
    if (existing?.status === 'pending' || existing?.status === 'under_review') {
      throw new ValidationError('KYC already under review');
    }

    return this.prisma.kycVerification.create({
      data: { userId, documentType, documentBlobUrl, selfieBlobUrl, status: 'pending', submittedAt: new Date() },
    });
  }

  async getKycStatus(userId: string) {
    return this.prisma.kycVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }) ?? { status: 'not_started' };
  }

  async reviewKyc(kycId: string, reviewerId: string, approved: boolean, rejectionReason?: string) {
    const kyc = await this.prisma.kycVerification.findUnique({ where: { id: kycId } });
    if (!kyc) throw new NotFoundError('KycVerification', kycId);
    if (kyc.status !== 'pending' && kyc.status !== 'under_review') throw new ValidationError('KYC not in reviewable state');

    const updated = await this.prisma.kycVerification.update({
      where: { id: kycId },
      data: {
        status: approved ? 'approved' : 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        approvedAt: approved ? new Date() : undefined,
        rejectionReason: approved ? undefined : rejectionReason,
      },
    });

    if (approved) {
      await this.prisma.sellerProfile.updateMany({
        where: { userId: kyc.userId },
        data: { isVerifiedSeller: true },
      });
    }

    return updated;
  }
}
