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
        if (!sellerProfile.length)
            throw new common_1.ForbiddenException('You must have a seller profile to create bots');
        const sellerId = sellerProfile[0].id;
        const slug = this.generateSlug(dto.name);
        const bot = this.botRepo.create({
            ...dto,
            sellerId,
            slug,
            status: 'draft',
        });
        return this.botRepo.save(bot);
    }
    async listPublicBots(query) {
        const cacheKey = `marketplace:list:${JSON.stringify(query)}`;
        const cached = await this.redis.get(cacheKey);
        if (cached)
            return JSON.parse(cached);
        let whereClause = '1=1';
        const params = [];
        let paramIndex = 1;
        if (query.search) {
            whereClause += ` AND (bot_name ILIKE $${paramIndex} OR similarity(bot_name, $${paramIndex}) > 0.2)`;
            params.push(`%${query.search}%`);
            paramIndex++;
        }
        if (query.mtPlatform) {
            whereClause += ` AND mt_platform IN ($${paramIndex}, 'BOTH')`;
            params.push(query.mtPlatform);
            paramIndex++;
        }
        if (query.categoryId) {
            whereClause += ` AND category_id = $${paramIndex}`;
            params.push(query.categoryId);
            paramIndex++;
        }
        const sortMap = {
            rating: 'avg_rating DESC NULLS LAST',
            subscribers: 'total_subscribers DESC',
            price_asc: 'price_cents ASC',
            price_desc: 'price_cents DESC',
            newest: 'published_at DESC',
        };
        const sortBy = sortMap[query.sortBy || 'rating'];
        const offset = ((query.page || 1) - 1) * (query.limit || 20);
        const sql = `
      SELECT *
      FROM v_active_bot_listings
      WHERE ${whereClause}
      ORDER BY ${sortBy}
      LIMIT $${paramIndex}
      OFFSET $${paramIndex + 1}
    `;
        const finalParams = [...params, query.limit || 20, offset];
        const countSql = `
      SELECT COUNT(*) 
      FROM v_active_bot_listings
      WHERE ${whereClause}
    `;
        const [results, countResult] = await Promise.all([
            this.dataSource.query(sql, finalParams),
            this.dataSource.query(countSql, params),
        ]);
        const total = parseInt(countResult[0].count, 10);
        const response = {
            data: results,
            total,
            page: query.page || 1,
            limit: query.limit || 20,
            totalPages: Math.ceil(total / (query.limit || 20)),
        };
        await this.redis.setex(cacheKey, this.LISTING_CACHE_TTL, JSON.stringify(response));
        return response;
    }
    async getBotDetails(slug) {
        const cacheKey = `marketplace:bot:${slug}`;
        const cached = await this.redis.get(cacheKey);
        if (cached)
            return JSON.parse(cached);
        const [bot] = await this.dataSource.query(`SELECT * FROM bots WHERE slug = $1 AND status = 'active' AND deleted_at IS NULL`, [slug]);
        if (!bot)
            throw new common_1.NotFoundException('Bot not found');
        await this.redis.setex(cacheKey, this.LISTING_CACHE_TTL, JSON.stringify(bot));
        return bot;
    }
    generateSlug(name) {
        return (name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') +
            '-' +
            Date.now().toString(36));
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