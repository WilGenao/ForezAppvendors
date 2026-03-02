import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Bot } from './entities/bot.entity';
import { CreateBotDto } from './dto/create-bot.dto';
import { ListBotsQueryDto } from './dto/list-bots-query.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);
  private readonly LISTING_CACHE_TTL = 60; // 1 minuto para listings públicos

  constructor(
    @InjectRepository(Bot) private readonly botRepo: Repository<Bot>,
    @InjectRedis() private readonly redis: Redis,
    private readonly dataSource: DataSource,
  ) {}

  async createBot(sellerId: string, dto: CreateBotDto): Promise<Bot> {
    const slug = this.generateSlug(dto.name);
    const bot = this.botRepo.create({ ...dto, sellerId, slug, status: 'draft' });
    return this.botRepo.save(bot);
  }

  async listPublicBots(query: ListBotsQueryDto) {
    const cacheKey = `marketplace:list:${JSON.stringify(query)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Usar view v_active_bot_listings para listings públicos
    let sql = `
      SELECT * FROM v_active_bot_listings
      WHERE 1=1
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.search) {
      sql += ` AND (bot_name ILIKE $${paramIndex} OR similarity(bot_name, $${paramIndex}) > 0.2)`;
      params.push(`%${query.search}%`);
      paramIndex++;
    }
    if (query.mtPlatform) {
      sql += ` AND mt_platform IN ($${paramIndex}, 'BOTH')`;
      params.push(query.mtPlatform);
      paramIndex++;
    }
    if (query.categoryId) {
      sql += ` AND category_id = $${paramIndex}`;
      params.push(query.categoryId);
      paramIndex++;
    }

    const sortMap: Record<string, string> = {
      rating: 'overall_score DESC NULLS LAST',
      subscribers: 'total_subscribers DESC',
      price_asc: 'price_cents ASC',
      price_desc: 'price_cents DESC',
      newest: 'published_at DESC',
    };
    sql += ` ORDER BY ${sortMap[query.sortBy || 'rating']}`;

    const offset = ((query.page || 1) - 1) * (query.limit || 20);
    sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(query.limit || 20, offset);

    const [results, countResult] = await Promise.all([
      this.dataSource.query(sql, params),
      this.dataSource.query(`SELECT COUNT(*) FROM v_active_bot_listings WHERE 1=1`, []),
    ]);

    const response = { data: results, total: parseInt(countResult[0].count, 10), page: query.page || 1, limit: query.limit || 20 };
    await this.redis.setex(cacheKey, this.LISTING_CACHE_TTL, JSON.stringify(response));
    return response;
  }

  async getBotDetails(slug: string) {
    const cacheKey = `marketplace:bot:${slug}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const [bot] = await this.dataSource.query(
      `SELECT b.*, sp.display_name as seller_name, sp.is_verified_seller, sp.avg_rating as seller_rating,
              ps.sharpe_ratio, ps.win_rate, ps.max_drawdown_pct, ps.profit_factor,
              ps.total_trades, ps.expectancy_usd, ps.calmar_ratio, ps.sortino_ratio,
              COALESCE(json_agg(DISTINCT jsonb_build_object('type', bl.listing_type, 'price_cents', bl.price_cents, 'listing_id', bl.id, 'trial_days', bl.trial_days)) FILTER (WHERE bl.id IS NOT NULL), '[]') as listings,
              COALESCE(json_agg(DISTINCT jsonb_build_object('type', af.anomaly_type, 'severity', af.severity, 'description', af.description)) FILTER (WHERE af.id IS NOT NULL AND af.is_active = true), '[]') as anomalies
       FROM bots b
       JOIN seller_profiles sp ON sp.id = b.seller_id
       LEFT JOIN performance_snapshots ps ON ps.bot_id = b.id AND ps.period_type = 'all_time' AND ps.snapshot_date = (SELECT MAX(snapshot_date) FROM performance_snapshots WHERE bot_id = b.id AND period_type = 'all_time')
       LEFT JOIN bot_listings bl ON bl.bot_id = b.id AND bl.status = 'published' AND bl.deleted_at IS NULL
       LEFT JOIN anomaly_flags af ON af.bot_id = b.id AND af.is_active = true
       WHERE b.slug = $1 AND b.status = 'active' AND b.deleted_at IS NULL
       GROUP BY b.id, sp.display_name, sp.is_verified_seller, sp.avg_rating, ps.sharpe_ratio, ps.win_rate, ps.max_drawdown_pct, ps.profit_factor, ps.total_trades, ps.expectancy_usd, ps.calmar_ratio, ps.sortino_ratio`,
      [slug],
    );
    if (!bot) throw new NotFoundException('Bot not found');
    await this.redis.setex(cacheKey, this.LISTING_CACHE_TTL, JSON.stringify(bot));
    return bot;
  }

  private generateSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  }
}
