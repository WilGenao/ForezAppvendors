// apps/api/src/leaderboard/leaderboard.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { LeaderboardService } from './leaderboard.service';

class LeaderboardQueryDto {
  @IsOptional()
  @IsIn(['profit', 'winrate', 'sharpe', 'trending', 'subscribers'])
  sortBy?: 'profit' | 'winrate' | 'sharpe' | 'trending' | 'subscribers' = 'sharpe';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(100)
  limit?: number = 20;
}

@ApiTags('leaderboard')
@Controller({ path: 'bots', version: '1' })
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * GET /bots/leaderboard
   * Top bots ranked by performance metric.
   * Served from analytics microservice with Redis cache + DB fallback.
   */
  @Get('leaderboard')
  @ApiOperation({
    summary: 'Bot leaderboard ranked by performance metrics',
    description:
      'Returns top bots sorted by sharpe, winrate, profit, subscribers, or trending. ' +
      'Data comes from the analytics microservice (falls back to DB snapshots if unavailable). ' +
      'Results are cached for 2 minutes.',
  })
  @ApiQuery({ name: 'sortBy', enum: ['profit', 'winrate', 'sharpe', 'trending', 'subscribers'], required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  getLeaderboard(@Query() query: LeaderboardQueryDto) {
    return this.leaderboardService.getLeaderboard(query.sortBy, query.limit);
  }

  /**
   * GET /bots/leaderboard/trending
   * Bots with the highest new subscriber growth in last 7 days.
   */
  @Get('leaderboard/trending')
  @ApiOperation({ summary: 'Trending bots (most new subscribers in last 7 days)' })
  getTrending(@Query('limit') limit = 10) {
    return this.leaderboardService.getTrending(Number(limit));
  }
}
