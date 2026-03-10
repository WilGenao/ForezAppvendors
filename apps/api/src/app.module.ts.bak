// apps/api/src/app.module.ts
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
import { AdminModule } from './admin/admin.module';
import { SellerModule } from './seller/seller.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('NODE_ENV') === 'production';
        return {
          type: 'postgres',
          url: config.getOrThrow<string>('DATABASE_URL'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          // FIX: In production, enable SSL with proper certificate verification.
          // rejectUnauthorized: false was a security risk (MITM vulnerability).
          // Set DB_SSL=true in your production environment.
          ssl: isProduction && config.get('DB_SSL') === 'true'
            ? { rejectUnauthorized: true }
            : false,
          logging: !isProduction,
          synchronize: false,
        };
      },
    }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: config.getOrThrow<string>('REDIS_URL'),
      }),
    }),
    // FIX: Per-endpoint throttle overrides in controllers take precedence.
    // This global limit (100/min) is the fallback for endpoints without specific limits.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    UsersModule,
    KycModule,
    MarketplaceModule,
    PaymentsModule,
    LicensingModule,
    ReviewsModule,
    AdminModule,
    SellerModule,
    SubscriptionsModule,
    NotificationsModule,
    HealthModule, // NEW: Proper health check module
  ],
  providers: [],
})
export class AppModule {}
