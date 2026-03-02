import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ConflictError, ForbiddenError, ValidationError } from '../../common/errors/app.errors';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(reviewerId: string, botId: string, rating: number, title: string, body: string) {
    if (rating < 1 || rating > 5) throw new ValidationError('Rating must be 1-5');

    // Verify purchase
    const license = await this.prisma.license.findFirst({ where: { buyerId: reviewerId, botId, status: 'active' } });
    const isVerifiedPurchase = !!license;

    const existing = await this.prisma.review.findFirst({ where: { botId, reviewerId, deletedAt: null } });
    if (existing) throw new ConflictError('Already reviewed this bot');

    const review = await this.prisma.review.create({
      data: { botId, reviewerId, rating, title, body, isVerifiedPurchase, isModerated: false },
    });

    // Update seller reputation asynchronously
    this.updateSellerReputation(botId).catch(() => {});

    return review;
  }

  async moderateReview(reviewId: string, moderatorId: string, approve: boolean, note?: string) {
    return this.prisma.review.update({
      where: { id: reviewId },
      data: { isModerated: approve, moderatedBy: moderatorId, moderatedAt: new Date(), moderationNote: note },
    });
  }

  private async updateSellerReputation(botId: string) {
    const bot = await this.prisma.bot.findUnique({ where: { id: botId }, select: { sellerId: true } });
    if (!bot) return;

    const agg = await this.prisma.review.aggregate({
      where: { bot: { sellerId: bot.sellerId }, deletedAt: null, isModerated: true },
      _avg: { rating: true },
      _count: { id: true },
    });

    await this.prisma.reputationScore.upsert({
      where: { sellerId: bot.sellerId },
      create: {
        sellerId: bot.sellerId,
        avgRating: agg._avg.rating ?? 0,
        totalReviews: agg._count.id,
        overallScore: agg._avg.rating ?? 0,
      },
      update: {
        avgRating: agg._avg.rating ?? 0,
        totalReviews: agg._count.id,
        overallScore: agg._avg.rating ?? 0,
        lastCalculated: new Date(),
      },
    });

    await this.prisma.sellerProfile.update({
      where: { id: bot.sellerId },
      data: { avgRating: agg._avg.rating },
    });
  }
}
