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
var ReviewsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
const review_entity_1 = require("./entities/review.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const notification_entity_1 = require("../notifications/entities/notification.entity");
const RATING_CACHE_TTL = 300;
let ReviewsService = ReviewsService_1 = class ReviewsService {
    constructor(reviewRepo, redis, dataSource, notificationsService) {
        this.reviewRepo = reviewRepo;
        this.redis = redis;
        this.dataSource = dataSource;
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(ReviewsService_1.name);
    }
    async create(userId, dto) {
        const [purchase] = await this.dataSource.query(`SELECT s.id FROM subscriptions s
       JOIN bot_listings bl ON bl.id = s.bot_listing_id
       WHERE s.user_id = $1 AND bl.bot_id = $2 AND s.status IN ('active','canceled','trialing')
       LIMIT 1`, [userId, dto.botId]);
        if (!purchase) {
            throw new common_1.ForbiddenException('You must have purchased this bot to leave a review');
        }
        const existing = await this.reviewRepo.findOne({
            where: { userId, botId: dto.botId },
        });
        if (existing) {
            throw new common_1.ConflictException('You have already reviewed this bot');
        }
        const [bot] = await this.dataSource.query(`SELECT id, seller_id FROM bots WHERE id = $1 AND deleted_at IS NULL LIMIT 1`, [dto.botId]);
        if (!bot)
            throw new common_1.NotFoundException('Bot not found');
        const review = this.reviewRepo.create({
            botId: dto.botId,
            userId,
            subscriptionId: purchase.id,
            rating: dto.rating,
            title: dto.title,
            body: dto.body,
            isVerifiedPurchase: true,
            isModerated: true,
        });
        const saved = await this.reviewRepo.save(review);
        await this.updateBotRatingAggregate(dto.botId);
        await this.redis.del(`rating:${dto.botId}`);
        try {
            const [sellerUser] = await this.dataSource.query(`SELECT sp.user_id FROM seller_profiles sp
         JOIN bots b ON b.seller_id = sp.id
         WHERE b.id = $1 LIMIT 1`, [dto.botId]);
            if (sellerUser) {
                await this.notificationsService.create({
                    userId: sellerUser.user_id,
                    type: notification_entity_1.NotificationType.NEW_REVIEW,
                    message: `Your bot received a new ${dto.rating}-star review.`,
                    metadata: { botId: dto.botId, reviewId: saved.id, rating: dto.rating },
                });
            }
        }
        catch (err) {
            this.logger.warn({ msg: 'Failed to send NEW_REVIEW notification', err });
        }
        this.logger.log({ msg: 'Review created', userId, botId: dto.botId, reviewId: saved.id });
        return { id: saved.id, message: 'Review submitted successfully' };
    }
    async listForBot(botId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const [reviews, total] = await Promise.all([
            this.dataSource.query(`SELECT
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
         LIMIT $2 OFFSET $3`, [botId, limit, offset]),
            this.dataSource.query(`SELECT COUNT(*) AS count FROM reviews WHERE bot_id = $1 AND deleted_at IS NULL AND is_moderated = TRUE`, [botId]),
        ]);
        const totalCount = parseInt(total[0]?.count ?? '0', 10);
        return {
            reviews,
            total: totalCount,
            page,
            pages: Math.ceil(totalCount / limit),
        };
    }
    async getRating(botId) {
        const cacheKey = `rating:${botId}`;
        const cached = await this.redis.get(cacheKey);
        if (cached)
            return JSON.parse(cached);
        const [stats] = await this.dataSource.query(`SELECT
         COALESCE(AVG(rating)::numeric(3,2), 0)   AS avg_rating,
         COUNT(*)                                   AS total_reviews,
         COUNT(*) FILTER (WHERE rating = 5)         AS five_star,
         COUNT(*) FILTER (WHERE rating = 4)         AS four_star,
         COUNT(*) FILTER (WHERE rating = 3)         AS three_star,
         COUNT(*) FILTER (WHERE rating = 2)         AS two_star,
         COUNT(*) FILTER (WHERE rating = 1)         AS one_star
       FROM reviews
       WHERE bot_id = $1 AND deleted_at IS NULL AND is_moderated = TRUE`, [botId]);
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
    async markHelpful(reviewId, userId) {
        const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
        if (!review)
            throw new common_1.NotFoundException('Review not found');
        if (review.userId === userId) {
            throw new common_1.ForbiddenException('Cannot mark your own review as helpful');
        }
        const voteKey = `review_vote:${reviewId}:${userId}`;
        const set = await this.redis.setnx(voteKey, '1');
        if (!set) {
            throw new common_1.ConflictException('You have already marked this review as helpful');
        }
        await this.redis.expire(voteKey, 60 * 60 * 24 * 90);
        await this.reviewRepo.increment({ id: reviewId }, 'helpfulCount', 1);
        const updated = await this.reviewRepo.findOne({ where: { id: reviewId } });
        return { helpful_count: updated?.helpfulCount ?? 0 };
    }
    async updateBotRatingAggregate(botId) {
        await this.dataSource.query(`UPDATE bots
       SET avg_rating    = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE bot_id = $1 AND deleted_at IS NULL AND is_moderated = TRUE),
           total_reviews = (SELECT COUNT(*) FROM reviews WHERE bot_id = $1 AND deleted_at IS NULL AND is_moderated = TRUE)
       WHERE id = $1`, [botId]);
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = ReviewsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(review_entity_1.Review)),
    __param(1, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        ioredis_2.default,
        typeorm_2.DataSource,
        notifications_service_1.NotificationsService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map