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
var ReviewsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let ReviewsService = ReviewsService_1 = class ReviewsService {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(ReviewsService_1.name);
    }
    async create(userId, dto) {
        const [purchase] = await this.dataSource.query(`SELECT s.id FROM subscriptions s
       JOIN bot_listings bl ON bl.id = s.bot_listing_id
       WHERE s.user_id = $1 AND bl.bot_id = $2 AND s.status IN ('active','canceled')
       LIMIT 1`, [userId, dto.botId]);
        if (!purchase) {
            throw new common_1.ForbiddenException('You must have purchased this bot to leave a review');
        }
        const existing = await this.dataSource.query(`SELECT id FROM reviews WHERE user_id = $1 AND bot_id = $2 AND deleted_at IS NULL`, [userId, dto.botId]);
        if (existing.length)
            throw new common_1.ConflictException('You already reviewed this bot');
        const [review] = await this.dataSource.query(`INSERT INTO reviews (bot_id, user_id, subscription_id, rating, title, body, is_verified_purchase)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id`, [dto.botId, userId, purchase.id, dto.rating, dto.title, dto.body]);
        await this.dataSource.query(`UPDATE bots
       SET avg_rating    = (SELECT AVG(rating)  FROM reviews WHERE bot_id = $1 AND deleted_at IS NULL),
           total_reviews = (SELECT COUNT(*)      FROM reviews WHERE bot_id = $1 AND deleted_at IS NULL)
       WHERE id = $1`, [dto.botId]);
        this.logger.log({ msg: 'Review submitted', userId, botId: dto.botId, reviewId: review.id });
        return { id: review.id, message: 'Review submitted successfully' };
    }
    async listForBot(botId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const reviews = await this.dataSource.query(`SELECT
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
       LIMIT $2 OFFSET $3`, [botId, limit, offset]);
        return reviews;
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = ReviewsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map