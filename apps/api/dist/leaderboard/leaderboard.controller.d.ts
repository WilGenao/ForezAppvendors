import { LeaderboardService } from './leaderboard.service';
declare class LeaderboardQueryDto {
    sortBy?: 'profit' | 'winrate' | 'sharpe' | 'trending' | 'subscribers';
    limit?: number;
}
export declare class LeaderboardController {
    private readonly leaderboardService;
    constructor(leaderboardService: LeaderboardService);
    getLeaderboard(query: LeaderboardQueryDto): Promise<{
        bots: import("./leaderboard.service").LeaderboardEntry[];
        sortBy: string;
        source: "analytics" | "db";
    }>;
    getTrending(limit?: number): Promise<{
        bots: import("./leaderboard.service").LeaderboardEntry[];
    }>;
}
export {};
