"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const throttler_1 = require("@nestjs/throttler");
const ioredis_1 = require("@nestjs-modules/ioredis");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const kyc_module_1 = require("./kyc/kyc.module");
const marketplace_module_1 = require("./marketplace/marketplace.module");
const payments_module_1 = require("./payments/payments.module");
const licensing_module_1 = require("./licensing/licensing.module");
const reviews_module_1 = require("./reviews/reviews.module");
const admin_module_1 = require("./admin/admin.module");
const seller_module_1 = require("./seller/seller.module");
const subscriptions_module_1 = require("./subscriptions/subscriptions.module");
const notifications_module_1 = require("./notifications/notifications.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    url: config.getOrThrow('DATABASE_URL'),
                    entities: [__dirname + '/**/*.entity{.ts,.js}'],
                    ssl: config.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
                    logging: config.get('NODE_ENV') === 'development',
                    synchronize: false,
                }),
            }),
            ioredis_1.RedisModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'single',
                    url: config.getOrThrow('REDIS_URL'),
                }),
            }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            kyc_module_1.KycModule,
            marketplace_module_1.MarketplaceModule,
            payments_module_1.PaymentsModule,
            licensing_module_1.LicensingModule,
            reviews_module_1.ReviewsModule,
            admin_module_1.AdminModule,
            seller_module_1.SellerModule,
            subscriptions_module_1.SubscriptionsModule,
            notifications_module_1.NotificationsModule,
        ],
        providers: [],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map