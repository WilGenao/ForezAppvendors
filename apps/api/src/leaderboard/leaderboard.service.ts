// apps/api/src/leaderboard/leaderboard.service.ts
// Fetches leaderboard from analytics microservice + DB fallback
import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export interface LeaderboardEntry {
  rank: number;
  botId: string;
  botName: string;
  botSlug: string;
  sellerId: string;
  sellerName: string;
  mtPlatform: string;
  avgRating: number;
  totalSubscribers: number;
  winRate: number | null;
  sharpeRatio: number | null;
  maxDrawdownPct: number | null;
  profitFactor: number | null;
  priceCents: number | null;
  isVerified: boolean;
  trendingScore?: number;
}

const LEADERBOARD_CACHE_TTL = 120; // 2 minutes

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);
  private readonly analyticsUrl: string;
  private readonly internalToken: string;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    this.analyticsUrl = config.get<string>('ANALYTICS_URL', 'http://analytics:8000');
    this.internalToken = config.get<string>('INTERNAL_SERVICE_TOKEN', '');
  }

  /**
   * GET /bots/leaderboard
   * Returns top bots ranked by the requested metric.
   * Tries analytics microservice first; falls back to DB if unavailable.
   */
  async getLeaderboard(
    sortBy: 'profit' | 'winrate' | 'sharpe' | 'trending' | 'subscribers' = 'sharpe',
    limit = 20,
  ): Promise<{ bots: LeaderboardEntry[]; sortBy: string; source: 'analytics' | 'db' }> {
    const cacheKey = `leaderboard:${sortBy}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { ...JSON.parse(cached), source: 'cache' as never };
    }

    // Try analytics microservice
    let bots: LeaderboardEntry[] | null = null;
    try {
      bots = await this.fetchFromAnalytics(sortBy, limit);
    } catch (err) {
      this.logger.warn({
        msg: 'Analytics microservice unavailable — falling back to DB',
        err: (err as Error).message,
      });
    }

    const source = bots ? 'analytics' : 'db';

    if (!bots) {
      bots = await this.fetchFromDb(sortBy, limit);
    }

    const result = { bots, sortBy, source: source as 'analytics' | 'db' };
    await this.redis.setex(cacheKey, LEADERBOARD_CACHE_TTL, JSON.stringify(result));

    return result;
  }

  /**
   * GET /bots/leaderboard/trending
   * Bots with highest new subscriber growth in the last 7 days.
   */
  async getTrending(limit = 10): Promise<{ bots: LeaderboardEntry[] }> {
    const cacheKey = `leaderboard:trending:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const rows = await this.dataSource.query(
      `SELECT
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
       LIMIT $1`,
      [limit],
    );

    const bots = rows.map((r, i) => ({
      rank: i + 1,
      ...this.mapRow(r),
      trendingScore: parseInt(r.new_subs_7d, 10),
    }));

    const result = { bots };
    await this.redis.setex(cacheKey, LEADERBOARD_CACHE_TTL, JSON.stringify(result));
    return result;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private async fetchFromAnalytics(
    sortBy: string,
    limit: number,
  ): Promise<LeaderboardEntry[]> {
    const url = `${this.analyticsUrl}/leaderboard?sort_by=${sortBy}&limit=${limit}`;
    const response = await fetch(url, {
      headers: {
        'X-Internal-Token': this.internalToken,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(3000), // 3s timeout
    });

    if (!response.ok) throw new Error(`Analytics returned ${response.status}`);
    const data = await response.json() as { bots: LeaderboardEntry[] };
    return data.bots ?? [];
  }

  private async fetchFromDb(sortBy: string, limit: number): Promise<LeaderboardEntry[]> {
    const orderClause = this.getDbOrderClause(sortBy);

    const rows = await this.dataSource.query(
      `SELECT
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
       LIMIT $1`,
      [limit],
    );

    return rows.map((r, i) => ({ rank: i + 1, ...this.mapRow(r) }));
  }

  private getDbOrderClause(sortBy: string): string {
    const map: Record<string, string> = {
      winrate: 'ps.win_rate DESC NULLS LAST',
      sharpe: 'ps.sharpe_ratio DESC NULLS LAST',
      profit: 'ps.profit_factor DESC NULLS LAST',
      subscribers: 'b.total_subscribers DESC',
      trending: 'b.total_subscribers DESC',
    };
    return map[sortBy] ?? 'b.total_subscribers DESC';
  }

  private mapRow(r: Record<string, unknown>): Omit<LeaderboardEntry, 'rank'> {
    return {
      botId: r['botId'] as string,
      botName: r['botName'] as string,
      botSlug: r['botSlug'] as string,
      sellerId: r['sellerId'] as string,
      sellerName: (r['sellerName'] as string) ?? 'Unknown',
      mtPlatform: r['mtPlatform'] as string,
      avgRating: parseFloat(r['avgRating'] as string ?? '0'),
      totalSubscribers: parseInt(r['totalSubscribers'] as string ?? '0', 10),
      winRate: r['winRate'] != null ? parseFloat(r['winRate'] as string) : null,
      sharpeRatio: r['sharpeRatio'] != null ? parseFloat(r['sharpeRatio'] as string) : null,
      maxDrawdownPct: r['maxDrawdownPct'] != null ? parseFloat(r['maxDrawdownPct'] as string) : null,
      profitFactor: r['profitFactor'] != null ? parseFloat(r['profitFactor'] as string) : null,
      priceCents: r['priceCents'] != null ? parseInt(r['priceCents'] as string, 10) : null,
      isVerified: Boolean(r['isVerified']),
    };
  }
}
