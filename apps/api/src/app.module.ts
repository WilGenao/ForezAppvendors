import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { KycModule } from './kyc/kyc.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { PaymentsModule } from './payments/payments.module';
import { LicensingModule } from './licensing/licensing.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL', 'postgresql://localhost:5432/forexbot'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        ssl: false,
        logging: false,
        synchronize: false,
      }),
    }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    UsersModule,
    KycModule,
    MarketplaceModule,
    PaymentsModule,
    LicensingModule,
    ReviewsModule,
  ],
})
export class AppModule {}
