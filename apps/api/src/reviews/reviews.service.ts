import { Injectable, ForbiddenException, ConflictException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly dataSource: DataSource) {}

  async create(userId: string, dto: CreateReviewDto) {
    // Only verified buyers (active or cancelled subscription) can leave reviews
    const [purchase] = await this.dataSource.query(
      `SELECT s.id FROM subscriptions s
       JOIN bot_listings bl ON bl.id = s.bot_listing_id
       WHERE s.user_id = $1 AND bl.bot_id = $2 AND s.status IN ('active','canceled')
       LIMIT 1`,
      [userId, dto.botId],
    );
    if (!purchase) {
      throw new ForbiddenException('You must have purchased this bot to leave a review');
    }

    const existing = await this.dataSource.query(
      `SELECT id FROM reviews WHERE user_id = $1 AND bot_id = $2 AND deleted_at IS NULL`,
      [userId, dto.botId],
    );
    if (existing.length) throw new ConflictException('You already reviewed this bot');

    const [review] = await this.dataSource.query(
      `INSERT INTO reviews (bot_id, user_id, subscription_id, rating, title, body, is_verified_purchase)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id`,
      [dto.botId, userId, purchase.id, dto.rating, dto.title, dto.body],
    );

    // Update bot avg_rating and total_reviews
    await this.dataSource.query(
      `UPDATE bots
       SET avg_rating    = (SELECT AVG(rating)  FROM reviews WHERE bot_id = $1 AND deleted_at IS NULL),
           total_reviews = (SELECT COUNT(*)      FROM reviews WHERE bot_id = $1 AND deleted_at IS NULL)
       WHERE id = $1`,
      [dto.botId],
    );

    this.logger.log({ msg: 'Review submitted', userId, botId: dto.botId, reviewId: review.id });
    return { id: review.id, message: 'Review submitted successfully' };
  }

  async listForBot(botId: string, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const reviews = await this.dataSource.query(
      // FIX: Replaced reviewer_email (privacy leak) with buyer_profiles.display_name.
      // Falls back to 'Verified Buyer' if no display name is set.
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
    );
    return reviews;
  }
}
