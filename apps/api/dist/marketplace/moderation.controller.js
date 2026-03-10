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
exports.AdminModerationController = exports.ModerationController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const moderation_service_1 = require("./moderation.service");
const submit_review_dto_1 = require("./dto/submit-review.dto");
const moderate_bot_dto_1 = require("../admin/dto/moderate-bot.dto");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let ModerationController = class ModerationController {
    constructor(moderationService) {
        this.moderationService = moderationService;
    }
    submitForReview(user, botId, dto) {
        return this.moderationService.submitForReview(botId, user.sub, dto.notes);
    }
};
exports.ModerationController = ModerationController;
__decorate([
    (0, common_1.Post)(':id/submit-review'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a bot for moderation review (seller only)' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Bot UUID' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, submit_review_dto_1.SubmitForReviewDto]),
    __metadata("design:returntype", void 0)
], ModerationController.prototype, "submitForReview", null);
exports.ModerationController = ModerationController = __decorate([
    (0, swagger_1.ApiTags)('bots / moderation'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)({ path: 'bots', version: '1' }),
    __metadata("design:paramtypes", [moderation_service_1.ModerationService])
], ModerationController);
let AdminModerationController = class AdminModerationController {
    constructor(moderationService) {
        this.moderationService = moderationService;
    }
    approve(admin, botId, dto) {
        return this.moderationService.approveBat(botId, admin.sub, dto.reason);
    }
    reject(admin, botId, dto) {
        return this.moderationService.rejectBot(botId, admin.sub, dto.reason ?? 'No reason provided');
    }
    suspend(admin, botId, dto) {
        return this.moderationService.suspendBot(botId, admin.sub, dto.reason ?? 'Policy violation');
    }
};
exports.AdminModerationController = AdminModerationController;
__decorate([
    (0, common_1.Post)(':id/approve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Approve a bot listing (admin only)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, moderate_bot_dto_1.ModerateBotsDto]),
    __metadata("design:returntype", void 0)
], AdminModerationController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)(':id/reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reject a bot listing (admin only)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, moderate_bot_dto_1.ModerateBotsDto]),
    __metadata("design:returntype", void 0)
], AdminModerationController.prototype, "reject", null);
__decorate([
    (0, common_1.Post)(':id/suspend'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Suspend an active bot (admin only)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, moderate_bot_dto_1.ModerateBotsDto]),
    __metadata("design:returntype", void 0)
], AdminModerationController.prototype, "suspend", null);
exports.AdminModerationController = AdminModerationController = __decorate([
    (0, swagger_1.ApiTags)('admin / bots'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'moderator'),
    (0, common_1.Controller)({ path: 'admin/bots', version: '1' }),
    __metadata("design:paramtypes", [moderation_service_1.ModerationService])
], AdminModerationController);
//# sourceMappingURL=moderation.controller.js.map