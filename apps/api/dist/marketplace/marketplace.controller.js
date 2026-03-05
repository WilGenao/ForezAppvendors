"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketplaceController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const marketplace_service_1 = require("./marketplace.service");
const create_bot_dto_1 = require("./dto/create-bot.dto");
const list_bots_query_dto_1 = require("./dto/list-bots-query.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let MarketplaceController = class MarketplaceController {
    constructor(marketplaceService) {
        this.marketplaceService = marketplaceService;
    }
    listBots(query) {
        return this.marketplaceService.listPublicBots(query);
    }
    getBotDetails(slug) {
        return this.marketplaceService.getBotDetails(slug);
    }
    createBot(user, dto) {
        return this.marketplaceService.createBot(user.sub, dto);
    }
    createListing(user, botId, dto) {
        return this.marketplaceService.createListing(user.sub, botId, dto);
    }
};
exports.MarketplaceController = MarketplaceController;
__decorate([
    (0, common_1.Get)('bots'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_bots_query_dto_1.ListBotsQueryDto]),
    __metadata("design:returntype", void 0)
], MarketplaceController.prototype, "listBots", null);
__decorate([
    (0, common_1.Get)('bots/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MarketplaceController.prototype, "getBotDetails", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('bots'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_bot_dto_1.CreateBotDto]),
    __metadata("design:returntype", void 0)
], MarketplaceController.prototype, "createBot", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)('bots/:id/listings'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], MarketplaceController.prototype, "createListing", null);
exports.MarketplaceController = MarketplaceController = __decorate([
    (0, swagger_1.ApiTags)('marketplace'),
    (0, common_1.Controller)({ path: 'marketplace', version: '1' }),
    __metadata("design:paramtypes", [marketplace_service_1.MarketplaceService])
], MarketplaceController);
//# sourceMappingURL=marketplace.controller.js.map