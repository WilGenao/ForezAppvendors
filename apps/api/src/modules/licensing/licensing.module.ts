import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { LicensingController } from './licensing.controller';
import { LicensingService } from './licensing.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: 'ioredis',
        host: config.get('redis.host'),
        port: config.get('redis.port'),
        password: config.get('redis.password'),
        db: config.get('redis.db'),
      }),
    }),
  ],
  controllers: [LicensingController],
  providers: [LicensingService],
  exports: [LicensingService],
})
export class LicensingModule {}
