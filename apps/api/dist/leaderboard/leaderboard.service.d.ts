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
export declare class LeaderboardService {
    private readonly redis;
    private readonly dataSource;
    private readonly config;
    private readonly logger;
    private readonly analyticsUrl;
    private readonly internalToken;
    constructor(redis: Redis, dataSource: DataSource, config: ConfigService);
    getLeaderboard(sortBy?: 'profit' | 'winrate' | 'sharpe' | 'trending' | 'subscribers', limit?: number): Promise<{
        bots: LeaderboardEntry[];
        sortBy: string;
        source: 'analytics' | 'db';
    }>;
    getTrending(limit?: number): Promise<{
        bots: LeaderboardEntry[];
    }>;
    private fetchFromAnalytics;
    private fetchFromDb;
    private getDbOrderClause;
    private mapRow;
}
