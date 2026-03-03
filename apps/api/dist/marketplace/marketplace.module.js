"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ioredis_1 = require("@nestjs-modules/ioredis");
const config_1 = require("@nestjs/config");
const marketplace_controller_1 = require("./marketplace.controller");
const marketplace_service_1 = require("./marketplace.service");
const bot_entity_1 = require("./entities/bot.entity");
let MarketplaceModule = class MarketplaceModule {
};
exports.MarketplaceModule = MarketplaceModule;
exports.MarketplaceModule = MarketplaceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([bot_entity_1.Bot]),
            ioredis_1.RedisModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'single',
                    url: config.get('REDIS_URL', 'redis://localhost:6379'),
                }),
            }),
        ],
        controllers: [marketplace_controller_1.MarketplaceController],
        providers: [marketplace_service_1.MarketplaceService],
        exports: [marketplace_service_1.MarketplaceService],
    })
], MarketplaceModule);
//# sourceMappingURL=marketplace.module.js.map