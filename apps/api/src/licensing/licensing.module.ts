import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';
import { LicensingController } from './licensing.controller';
import { LicensingService } from './licensing.service';
import { License } from './entities/license.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([License]),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),
  ],
  controllers: [LicensingController],
  providers: [LicensingService],
  exports: [LicensingService],
})
export class LicensingModule {}
