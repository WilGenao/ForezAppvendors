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
const marketplace_controller_1 = require("./marketplace.controller");
const marketplace_service_1 = require("./marketplace.service");
const moderation_controller_1 = require("./moderation.controller");
const moderation_service_1 = require("./moderation.service");
const bot_entity_1 = require("./entities/bot.entity");
const notifications_module_1 = require("../notifications/notifications.module");
let MarketplaceModule = class MarketplaceModule {
};
exports.MarketplaceModule = MarketplaceModule;
exports.MarketplaceModule = MarketplaceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([bot_entity_1.Bot]),
            notifications_module_1.NotificationsModule,
        ],
        controllers: [
            marketplace_controller_1.MarketplaceController,
            moderation_controller_1.ModerationController,
            moderation_controller_1.AdminModerationController,
        ],
        providers: [marketplace_service_1.MarketplaceService, moderation_service_1.ModerationService],
        exports: [marketplace_service_1.MarketplaceService, moderation_service_1.ModerationService],
    })
], MarketplaceModule);
//# sourceMappingURL=marketplace.module.js.map