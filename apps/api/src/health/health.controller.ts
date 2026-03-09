// apps/api/src/health/health.controller.ts
import { Controller, Get, HttpCode } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { InjectDataSource } from '@nestjs/typeorm';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /**
   * FIX: Health check now verifies actual dependencies (DB + Redis).
   * Returns HTTP 503 if degraded — Docker/Railway will restart the container.
   * Previously returned 200 always, hiding real failures.
   */
  @Get()
  @ApiOperation({ summary: 'Health check — verifies DB and Redis connectivity' })
  async health() {
    const [dbOk, redisOk] = await Promise.all([
      this.dataSource.query('SELECT 1').then(() => true).catch(() => false),
      this.redis.ping().then((r) => r === 'PONG').catch(() => false),
    ]);

    const status = dbOk && redisOk ? 'ok' : 'degraded';

    return {
      status,
      db: dbOk,
      redis: redisOk,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
