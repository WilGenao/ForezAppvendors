import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';

// Import your existing modules here
// import { AuthModule } from './auth/auth.module';
// import { UsersModule } from './users/users.module';
// import { MarketplaceModule } from './marketplace/marketplace.module';
// import { PaymentsModule } from './payments/payments.module';
// import { LicensingModule } from './licensing/licensing.module';
// import { ReviewsModule } from './reviews/reviews.module';
// import { KycModule } from './kyc/kyc.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Rate Limiting - tiered by route type
    // Usage in controllers:
    //   @Throttle({ public: { limit: 100, ttl: 60000 } })
    //   @Throttle({ auth: { limit: 10, ttl: 60000 } })
    //   @Throttle({ authenticated: { limit: 1000, ttl: 60000 } })
    //   @SkipThrottle() for webhooks
    ThrottlerModule.forRoot([
      { name: 'public',        ttl: 60000, limit: 100  },
      { name: 'auth',          ttl: 60000, limit: 10   },
      { name: 'authenticated', ttl: 60000, limit: 1000 },
      { name: 'licensing',     ttl: 60000, limit: 10   },
    ]),

    // Add your existing modules:
    // AuthModule,
    // UsersModule,
    // MarketplaceModule,
    // PaymentsModule,
    // LicensingModule,
    // ReviewsModule,
    // KycModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
