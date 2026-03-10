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
var LeaderboardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderboardService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("@nestjs-modules/ioredis");
const ioredis_2 = require("ioredis");
const typeorm_1 = require("typeorm");
const config_1 = require("@nestjs/config");
const LEADERBOARD_CACHE_TTL = 120;
let LeaderboardService = LeaderboardService_1 = class LeaderboardService {
    constructor(redis, dataSource, config) {
        this.redis = redis;
        this.dataSource = dataSource;
        this.config = config;
        this.logger = new common_1.Logger(LeaderboardService_1.name);
        this.analyticsUrl = config.get('ANALYTICS_URL', 'http://analytics:8000');
        this.internalToken = config.get('INTERNAL_SERVICE_TOKEN', '');
    }
    async getLeaderboard(sortBy = 'sharpe', limit = 20) {
        const cacheKey = `leaderboard:${sortBy}:${limit}`;
        const cached = await this.redis.get(cacheKey);
        if (cached) {
            return { ...JSON.parse(cached), source: 'cache' };
        }
        let bots = null;
        try {
            bots = await this.fetchFromAnalytics(sortBy, limit);
        }
        catch (err) {
            this.logger.warn({
                msg: 'Analytics microservice unavailable — falling back to DB',
                err: err.message,
            });
        }
        const source = bots ? 'analytics' : 'db';
        if (!bots) {
            bots = await this.fetchFromDb(sortBy, limit);
        }
        const result = { bots, sortBy, source: source };
        await this.redis.setex(cacheKey, LEADERBOARD_CACHE_TTL, JSON.stringify(result));
        return result;
    }
    async getTrending(limit = 10) {
        const cacheKey = `leaderboard:trending:${limit}`;
        const cached = await this.redis.get(cacheKey);
        if (cached)
            return JSON.parse(cached);
        const rows = await this.dataSource.query(`SELECT
         b.id           AS "botId",
         b.name         AS "botName",
         b.slug         AS "botSlug",
         b.seller_id    AS "sellerId",
         b.mt_platform  AS "mtPlatform",
         b.avg_rating   AS "avgRating",
         b.total_subscribers AS "totalSubscribers",
         b.is_verified  AS "isVerified",
         sp.display_name AS "sellerName",
         ps.win_rate    AS "winRate",
         ps.sharpe_ratio AS "sharpeRatio",
         ps.max_drawdown_pct AS "maxDrawdownPct",
         ps.profit_factor AS "profitFactor",
         MIN(bl.price_cents) AS "priceCents",
         COUNT(s.id) FILTER (WHERE s.created_at > NOW() - INTERVAL '7 days') AS new_subs_7d
       FROM bots b
       JOIN seller_profiles sp ON sp.id = b.seller_id
       LEFT JOIN bot_listings bl ON bl.bot_id = b.id AND bl.status = 'published'
       LEFT JOIN subscriptions s ON s.bot_listing_id = bl.id
       LEFT JOIN performance_snapshots ps ON ps.bot_id = b.id
         AND ps.period_type = 'all_time'
         AND ps.snapshot_date = (
           SELECT MAX(snapshot_date) FROM performance_snapshots
           WHERE bot_id = b.id AND period_type = 'all_time'
         )
       WHERE b.status = 'active' AND b.deleted_at IS NULL
       GROUP BY b.id, sp.display_name, ps.win_rate, ps.sharpe_ratio, ps.max_drawdown_pct, ps.profit_factor
       ORDER BY new_subs_7d DESC, b.total_subscribers DESC
       LIMIT $1`, [limit]);
        const bots = rows.map((r, i) => ({
            rank: i + 1,
            ...this.mapRow(r),
            trendingScore: parseInt(r.new_subs_7d, 10),
        }));
        const result = { bots };
        await this.redis.setex(cacheKey, LEADERBOARD_CACHE_TTL, JSON.stringify(result));
        return result;
    }
    async fetchFromAnalytics(sortBy, limit) {
        const url = `${this.analyticsUrl}/leaderboard?sort_by=${sortBy}&limit=${limit}`;
        const response = await fetch(url, {
            headers: {
                'X-Internal-Token': this.internalToken,
                'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(3000),
        });
        if (!response.ok)
            throw new Error(`Analytics returned ${response.status}`);
        const data = await response.json();
        return data.bots ?? [];
    }
    async fetchFromDb(sortBy, limit) {
        const orderClause = this.getDbOrderClause(sortBy);
        const rows = await this.dataSource.query(`SELECT
         b.id           AS "botId",
         b.name         AS "botName",
         b.slug         AS "botSlug",
         b.seller_id    AS "sellerId",
         b.mt_platform  AS "mtPlatform",
         b.avg_rating   AS "avgRating",
         b.total_subscribers AS "totalSubscribers",
         b.is_verified  AS "isVerified",
         sp.display_name AS "sellerName",
         ps.win_rate    AS "winRate",
         ps.sharpe_ratio AS "sharpeRatio",
         ps.max_drawdown_pct AS "maxDrawdownPct",
         ps.profit_factor AS "profitFactor",
         MIN(bl.price_cents) AS "priceCents"
       FROM bots b
       JOIN seller_profiles sp ON sp.id = b.seller_id
       LEFT JOIN bot_listings bl ON bl.bot_id = b.id AND bl.status = 'published'
       LEFT JOIN performance_snapshots ps ON ps.bot_id = b.id
         AND ps.period_type = 'all_time'
         AND ps.snapshot_date = (
           SELECT MAX(snapshot_date) FROM performance_snapshots
           WHERE bot_id = b.id AND period_type = 'all_time'
         )
       WHERE b.status = 'active' AND b.deleted_at IS NULL
       GROUP BY b.id, sp.display_name, ps.win_rate, ps.sharpe_ratio, ps.max_drawdown_pct, ps.profit_factor
       ORDER BY ${orderClause}
       LIMIT $1`, [limit]);
        return rows.map((r, i) => ({ rank: i + 1, ...this.mapRow(r) }));
    }
    getDbOrderClause(sortBy) {
        const map = {
            winrate: 'ps.win_rate DESC NULLS LAST',
            sharpe: 'ps.sharpe_ratio DESC NULLS LAST',
            profit: 'ps.profit_factor DESC NULLS LAST',
            subscribers: 'b.total_subscribers DESC',
            trending: 'b.total_subscribers DESC',
        };
        return map[sortBy] ?? 'b.total_subscribers DESC';
    }
    mapRow(r) {
        return {
            botId: r['botId'],
            botName: r['botName'],
            botSlug: r['botSlug'],
            sellerId: r['sellerId'],
            sellerName: r['sellerName'] ?? 'Unknown',
            mtPlatform: r['mtPlatform'],
            avgRating: parseFloat(r['avgRating'] ?? '0'),
            totalSubscribers: parseInt(r['totalSubscribers'] ?? '0', 10),
            winRate: r['winRate'] != null ? parseFloat(r['winRate']) : null,
            sharpeRatio: r['sharpeRatio'] != null ? parseFloat(r['sharpeRatio']) : null,
            maxDrawdownPct: r['maxDrawdownPct'] != null ? parseFloat(r['maxDrawdownPct']) : null,
            profitFactor: r['profitFactor'] != null ? parseFloat(r['profitFactor']) : null,
            priceCents: r['priceCents'] != null ? parseInt(r['priceCents'], 10) : null,
            isVerified: Boolean(r['isVerified']),
        };
    }
};
exports.LeaderboardService = LeaderboardService;
exports.LeaderboardService = LeaderboardService = LeaderboardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [ioredis_2.default,
        typeorm_1.DataSource,
        config_1.ConfigService])
], LeaderboardService);
//# sourceMappingURL=leaderboard.service.js.map