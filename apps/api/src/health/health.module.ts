// apps/api/src/health/health.module.ts
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}

// ─────────────────────────────────────────────────────────────────────────────
// apps/api/src/health/health.controller.ts
// ─────────────────────────────────────────────────────────────────────────────
// NOTE: Create this as a separate file: apps/api/src/health/health.controller.ts
//
// import { Controller, Get } from '@nestjs/common';
// import { InjectRedis } from '@nestjs-modules/ioredis';
// import { InjectDataSource } from '@nestjs/typeorm';
// import Redis from 'ioredis';
// import { DataSource } from 'typeorm';
//
// @Controller('health')
// export class HealthController {
//   constructor(
//     @InjectRedis() private readonly redis: Redis,
//     @InjectDataSource() private readonly dataSource: DataSource,
//   ) {}
//
//   @Get()
//   async health() {
//     const [dbOk, redisOk] = await Promise.all([
//       this.dataSource.query('SELECT 1').then(() => true).catch(() => false),
//       this.redis.ping().then(r => r === 'PONG').catch(() => false),
//     ]);
//     const status = dbOk && redisOk ? 'ok' : 'degraded';
//     const httpStatus = status === 'ok' ? 200 : 503;
//     return { status, db: dbOk, redis: redisOk, uptime: process.uptime() };
//   }
// }
