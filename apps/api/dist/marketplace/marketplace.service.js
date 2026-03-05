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
var MarketplaceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bot_entity_1 = require("./entities/bot.entity");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
let MarketplaceService = MarketplaceService_1 = class MarketplaceService {
    constructor(botRepo, redis, dataSource) {
        this.botRepo = botRepo;
        this.redis = redis;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(MarketplaceService_1.name);
        this.LISTING_CACHE_TTL = 60;
    }
    async createBot(userId, dto) {
        const sellerProfile = await this.dataSource.query(`SELECT id FROM seller_profiles WHERE user_id = $1 LIMIT 1`, [userId]);
        if (!sellerProfile.length) {
            throw new common_1.ForbiddenException('You must have a seller profile to create bots');
        }
        const sellerId = sellerProfile[0].id;
        const slug = this.generateSlug(dto.name);
        const bot = this.botRepo.create({ ...dto, sellerId, slug, status: 'draft' });
        return this.botRepo.save(bot);
    }
    async listPublicBots(query) {
        const cacheKey = `marketplace:list:${JSON.stringify(query)}`;
        const cached = await this.redis.get(cacheKey);
        if (cached)
            return JSON.parse(cached);
        const conditions = ['1=1'];
        const params = [];
        let paramIndex = 1;
        if (query.search) {
            conditions.push(`(bot_name ILIKE $${paramIndex} OR similarity(bot_name, $${paramIndex + 1}) > 0.2)`);
            params.push(`%${query.search}%`, query.search);
            paramIndex += 2;
        }
        if (query.mtPlatform) {
            conditions.push(`mt_platform IN ($${paramIndex}, 'BOTH')`);
            params.push(query.mtPlatform);
            paramIndex++;
        }
        if (query.categoryId) {
            conditions.push(`category_id = $${paramIndex}`);
            params.push(query.categoryId);
            paramIndex++;
        }
        const whereClause = conditions.join(' AND ');
        const sortMap = {
            rating: 'avg_rating DESC NULLS LAST',
            subscribers: 'total_subscribers DESC',
            price_asc: 'price_cents ASC',
            price_desc: 'price_cents DESC',
            newest: 'published_at DESC',
        };
        const orderBy = sortMap[query.sortBy || 'rating'] ?? sortMap['rating'];
        const page = Math.max(1, query.page || 1);
        const limit = Math.min(100, Math.max(1, query.limit || 20));
        const offset = (page - 1) * limit;
        const resultParams = [...params, limit, offset];
        const [results, countResult] = await Promise.all([
            this.dataSource.query(`SELECT * FROM v_active_bot_listings WHERE ${whereClause} ORDER BY ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, resultParams),
            this.dataSource.query(`SELECT COUNT(*) FROM v_active_bot_listings WHERE ${whereClause}`, params),
        ]);
        const response = {
            data: results,
            total: parseInt(countResult[0].count, 10),
            page,
            limit,
        };
        await this.redis.setex(cacheKey, this.LISTING_CACHE_TTL, JSON.stringify(response));
        return response;
    }
    async getBotDetails(slug) {
        const cacheKey = `marketplace:bot:${slug}`;
        const cached = await this.redis.get(cacheKey);
        if (cached)
            return JSON.parse(cached);
        const [bot] = await this.dataSource.query(`SELECT
         b.*,
         sp.display_name   AS seller_name,
         sp.is_verified_seller,
         sp.avg_rating      AS seller_rating,
         ps.sharpe_ratio,
         ps.win_rate,
         ps.max_drawdown_pct,
         ps.profit_factor,
         ps.total_trades,
         ps.expectancy_usd,
         ps.calmar_ratio,
         ps.sortino_ratio,
         COALESCE(
           json_agg(DISTINCT jsonb_build_object(
             'type',         bl.listing_type,
             'price_cents',  bl.price_cents,
             'listing_id',   bl.id,
             'trial_days',   bl.trial_days
           )) FILTER (WHERE bl.id IS NOT NULL),
           '[]'
         ) AS listings,
         COALESCE(
           json_agg(DISTINCT jsonb_build_object(
             'type',        af.anomaly_type,
             'severity',    af.severity,
             'description', af.description
           )) FILTER (WHERE af.id IS NOT NULL AND af.is_resolved = FALSE),
           '[]'
         ) AS anomalies
       FROM bots b
       JOIN seller_profiles sp ON sp.id = b.seller_id
       LEFT JOIN performance_snapshots ps
           ON ps.bot_id = b.id
           AND ps.period_type = 'all_time'
           AND ps.snapshot_date = (
             SELECT MAX(snapshot_date)
             FROM performance_snapshots
             WHERE bot_id = b.id AND period_type = 'all_time'
           )
       LEFT JOIN bot_listings bl
           ON bl.bot_id = b.id AND bl.status = 'published' AND bl.deleted_at IS NULL
       LEFT JOIN anomaly_flags af ON af.bot_id = b.id
       WHERE b.slug = $1 AND b.status = 'active' AND b.deleted_at IS NULL
       GROUP BY b.id, sp.display_name, sp.is_verified_seller, sp.avg_rating,
                ps.sharpe_ratio, ps.win_rate, ps.max_drawdown_pct, ps.profit_factor,
                ps.total_trades, ps.expectancy_usd, ps.calmar_ratio, ps.sortino_ratio`, [slug]);
        if (!bot)
            throw new common_1.NotFoundException('Bot not found');
        await this.redis.setex(cacheKey, 300, JSON.stringify(bot));
        return bot;
    }
    generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
            .slice(0, 80);
    }
};
exports.MarketplaceService = MarketplaceService;
exports.MarketplaceService = MarketplaceService = MarketplaceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(bot_entity_1.Bot)),
    __param(1, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        ioredis_2.default,
        typeorm_2.DataSource])
], MarketplaceService);
//# sourceMappingURL=marketplace.service.js.map