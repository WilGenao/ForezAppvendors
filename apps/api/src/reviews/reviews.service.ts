// apps/api/src/reviews/reviews.service.ts
import {
  Injectable,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

const RATING_CACHE_TTL = 300; // 5 minutes

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRedis()
    private readonly redis: Redis,
    private readonly dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Create a review.
   * Rules:
   * - User must have an active or cancelled subscription for this bot
   * - One review per user per bot (enforced by DB unique index + application check)
   */
  async create(userId: string, dto: CreateReviewDto): Promise<{ id: string; message: string }> {
    // Only verified buyers can review
    const [purchase] = await this.dataSource.query(
      `SELECT s.id FROM subscriptions s
       JOIN bot_listings bl ON bl.id = s.bot_listing_id
       WHERE s.user_id = $1 AND bl.bot_id = $2 AND s.status IN ('active','canceled','trialing')
       LIMIT 1`,
      [userId, dto.botId],
    );
    if (!purchase) {
      throw new ForbiddenException('You must have purchased this bot to leave a review');
    }

    // Check for existing review
    const existing = await this.reviewRepo.findOne({
      where: { userId, botId: dto.botId },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this bot');
    }

    // Verify bot exists
    const [bot] = await this.dataSource.query(
      `SELECT id, seller_id FROM bots WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [dto.botId],
    );
    if (!bot) throw new NotFoundException('Bot not found');

    // Insert review
    const review = this.reviewRepo.create({
      botId: dto.botId,
      userId,
      subscriptionId: purchase.id,
      rating: dto.rating,
      title: dto.title,
      body: dto.body,
      isVerifiedPurchase: true,
      // Auto-approve if no moderation needed — adjust for manual moderation
      isModerated: true,
    });

    const saved = await this.reviewRepo.save(review);

    // Update bot aggregate stats
    await this.updateBotRatingAggregate(dto.botId);

    // Invalidate rating cache
    await this.redis.del(`rating:${dto.botId}`);

    // Notify seller about new review
    try {
      const [sellerUser] = await this.dataSource.query(
        `SELECT sp.user_id FROM seller_profiles sp
         JOIN bots b ON b.seller_id = sp.id
         WHERE b.id = $1 LIMIT 1`,
        [dto.botId],
      );
      if (sellerUser) {
        await this.notificationsService.create({
          userId: sellerUser.user_id,
          type: NotificationType.NEW_REVIEW,
          message: `Your bot received a new ${dto.rating}-star review.`,
          metadata: { botId: dto.botId, reviewId: saved.id, rating: dto.rating },
        });
      }
    } catch (err) {
      // Non-critical — don't fail the review creation
      this.logger.warn({ msg: 'Failed to send NEW_REVIEW notification', err });
    }

    this.logger.log({ msg: 'Review created', userId, botId: dto.botId, reviewId: saved.id });
    return { id: saved.id, message: 'Review submitted successfully' };
  }

  /**
   * List reviews for a bot, paginated.
   * Returns only moderated reviews, sorted by helpfulness then recency.
   */
  async listForBot(
    botId: string,
    page = 1,
    limit = 10,
  ): Promise<{ reviews: Review[]; total: number; page: number; pages: number }> {
    const offset = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.dataSource.query(
        `SELECT
           r.id,
           r.rating,
           r.title,
           r.body,
           r.is_verified_purchase,
           r.helpful_count,
           r.created_at,
           COALESCE(bp.display_name, 'Verified Buyer') AS reviewer_name
         FROM reviews r
         JOIN users u ON u.id = r.user_id
         LEFT JOIN buyer_profiles bp ON bp.user_id = u.id
         WHERE r.bot_id = $1
           AND r.deleted_at IS NULL
           AND r.is_moderated = TRUE
         ORDER BY r.helpful_count DESC, r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [botId, limit, offset],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) AS count FROM reviews WHERE bot_id = $1 AND deleted_at IS NULL AND is_moderated = TRUE`,
        [botId],
      ),
    ]);

    const totalCount = parseInt(total[0]?.count ?? '0', 10);

    return {
      reviews,
      total: totalCount,
      page,
      pages: Math.ceil(totalCount / limit),
    };
  }

  /**
   * Get aggregated rating for a bot.
   * Cached in Redis for 5 minutes to avoid repeated DB hits.
   */
  async getRating(botId: string): Promise<{
    botId: string;
    avgRating: number;
    totalReviews: number;
    distribution: Record<string, number>;
  }> {
    const cacheKey = `rating:${botId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [stats] = await this.dataSource.query(
      `SELECT
         COALESCE(AVG(rating)::numeric(3,2), 0)   AS avg_rating,
         COUNT(*)                                   AS total_reviews,
         COUNT(*) FILTER (WHERE rating = 5)         AS five_star,
         COUNT(*) FILTER (WHERE rating = 4)         AS four_star,
         COUNT(*) FILTER (WHERE rating = 3)         AS three_star,
         COUNT(*) FILTER (WHERE rating = 2)         AS two_star,
         COUNT(*) FILTER (WHERE rating = 1)         AS one_star
       FROM reviews
       WHERE bot_id = $1 AND deleted_at IS NULL AND is_moderated = TRUE`,
      [botId],
    );

    const result = {
      botId,
      avgRating: parseFloat(stats.avg_rating),
      totalReviews: parseInt(stats.total_reviews, 10),
      distribution: {
        '5': parseInt(stats.five_star, 10),
        '4': parseInt(stats.four_star, 10),
        '3': parseInt(stats.three_star, 10),
        '2': parseInt(stats.two_star, 10),
        '1': parseInt(stats.one_star, 10),
      },
    };

    await this.redis.setex(cacheKey, RATING_CACHE_TTL, JSON.stringify(result));
    return result;
  }

  /**
   * Mark a review as helpful (increment counter).
   */
  async markHelpful(reviewId: string, userId: string): Promise<{ helpful_count: number }> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    // Prevent self-voting
    if (review.userId === userId) {
      throw new ForbiddenException('Cannot mark your own review as helpful');
    }

    // Idempotent via Redis SET NX
    const voteKey = `review_vote:${reviewId}:${userId}`;
    const set = await this.redis.setnx(voteKey, '1');
    if (!set) {
      throw new ConflictException('You have already marked this review as helpful');
    }
    await this.redis.expire(voteKey, 60 * 60 * 24 * 90); // 90 days

    await this.reviewRepo.increment({ id: reviewId }, 'helpfulCount', 1);
    const updated = await this.reviewRepo.findOne({ where: { id: reviewId } });
    return { helpful_count: updated?.helpfulCount ?? 0 };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async updateBotRatingAggregate(botId: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE bots
       SET avg_rating    = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE bot_id = $1 AND deleted_at IS NULL AND is_moderated = TRUE),
           total_reviews = (SELECT COUNT(*) FROM reviews WHERE bot_id = $1 AND deleted_at IS NULL AND is_moderated = TRUE)
       WHERE id = $1`,
      [botId],
    );
  }
}
