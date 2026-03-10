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
exports.LeaderboardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const leaderboard_service_1 = require("./leaderboard.service");
class LeaderboardQueryDto {
    constructor() {
        this.sortBy = 'sharpe';
        this.limit = 20;
    }
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['profit', 'winrate', 'sharpe', 'trending', 'subscribers']),
    __metadata("design:type", String)
], LeaderboardQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(5),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], LeaderboardQueryDto.prototype, "limit", void 0);
let LeaderboardController = class LeaderboardController {
    constructor(leaderboardService) {
        this.leaderboardService = leaderboardService;
    }
    getLeaderboard(query) {
        return this.leaderboardService.getLeaderboard(query.sortBy, query.limit);
    }
    getTrending(limit = 10) {
        return this.leaderboardService.getTrending(Number(limit));
    }
};
exports.LeaderboardController = LeaderboardController;
__decorate([
    (0, common_1.Get)('leaderboard'),
    (0, swagger_1.ApiOperation)({
        summary: 'Bot leaderboard ranked by performance metrics',
        description: 'Returns top bots sorted by sharpe, winrate, profit, subscribers, or trending. ' +
            'Data comes from the analytics microservice (falls back to DB snapshots if unavailable). ' +
            'Results are cached for 2 minutes.',
    }),
    (0, swagger_1.ApiQuery)({ name: 'sortBy', enum: ['profit', 'winrate', 'sharpe', 'trending', 'subscribers'], required: false }),
    (0, swagger_1.ApiQuery)({ name: 'limit', type: Number, required: false }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LeaderboardQueryDto]),
    __metadata("design:returntype", void 0)
], LeaderboardController.prototype, "getLeaderboard", null);
__decorate([
    (0, common_1.Get)('leaderboard/trending'),
    (0, swagger_1.ApiOperation)({ summary: 'Trending bots (most new subscribers in last 7 days)' }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LeaderboardController.prototype, "getTrending", null);
exports.LeaderboardController = LeaderboardController = __decorate([
    (0, swagger_1.ApiTags)('leaderboard'),
    (0, common_1.Controller)({ path: 'bots', version: '1' }),
    __metadata("design:paramtypes", [leaderboard_service_1.LeaderboardService])
], LeaderboardController);
//# sourceMappingURL=leaderboard.controller.js.map