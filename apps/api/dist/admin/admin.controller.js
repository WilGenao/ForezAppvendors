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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const admin_service_1 = require("./admin.service");
const kyc_service_1 = require("../kyc/kyc.service");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const review_kyc_dto_1 = require("./dto/review-kyc.dto");
const moderate_bot_dto_1 = require("./dto/moderate-bot.dto");
let AdminController = class AdminController {
    constructor(adminService, kycService) {
        this.adminService = adminService;
        this.kycService = kycService;
    }
    getStats() {
        return this.adminService.getPlatformStats();
    }
    listKyc(page = 1, limit = 20) {
        return this.kycService.listPending(+page, +limit);
    }
    approveKyc(id, admin) {
        return this.kycService.approve(id, admin.sub);
    }
    rejectKyc(id, admin, dto) {
        return this.kycService.reject(id, admin.sub, dto.reason);
    }
    listBots(status, page = 1, limit = 20) {
        return this.adminService.listBotsForReview(status, +page, +limit);
    }
    approveBot(id, admin) {
        return this.adminService.updateBotStatus(id, 'active', admin.sub);
    }
    suspendBot(id, admin, dto) {
        return this.adminService.updateBotStatus(id, 'suspended', admin.sub, dto.reason);
    }
    rejectBot(id, admin, dto) {
        return this.adminService.updateBotStatus(id, 'draft', admin.sub, dto.reason);
    }
    listUsers(search, page = 1, limit = 20) {
        return this.adminService.listUsers(search, +page, +limit);
    }
    suspendUser(id, admin) {
        return this.adminService.setUserStatus(id, 'suspended', admin.sub);
    }
    activateUser(id, admin) {
        return this.adminService.setUserStatus(id, 'active', admin.sub);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Platform overview stats' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('kyc'),
    (0, swagger_1.ApiOperation)({ summary: 'List pending KYC submissions' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listKyc", null);
__decorate([
    (0, common_1.Post)('kyc/:id/approve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Approve a KYC submission and grant seller role' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "approveKyc", null);
__decorate([
    (0, common_1.Post)('kyc/:id/reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reject a KYC submission with a reason' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, review_kyc_dto_1.ReviewKycDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "rejectKyc", null);
__decorate([
    (0, common_1.Get)('bots'),
    (0, swagger_1.ApiOperation)({ summary: 'List bots pending review or with anomalies' }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listBots", null);
__decorate([
    (0, common_1.Patch)('bots/:id/approve'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve a bot (pending_review → active)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "approveBot", null);
__decorate([
    (0, common_1.Patch)('bots/:id/suspend'),
    (0, swagger_1.ApiOperation)({ summary: 'Suspend an active bot' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, moderate_bot_dto_1.ModerateBotsDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "suspendBot", null);
__decorate([
    (0, common_1.Patch)('bots/:id/reject'),
    (0, swagger_1.ApiOperation)({ summary: 'Reject a bot back to draft' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, moderate_bot_dto_1.ModerateBotsDto]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "rejectBot", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'List all users with roles and KYC status' }),
    __param(0, (0, common_1.Query)('search')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Patch)('users/:id/suspend'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Suspend a user account' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "suspendUser", null);
__decorate([
    (0, common_1.Patch)('users/:id/activate'),
    (0, roles_decorator_1.Roles)('admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Reactivate a suspended user' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "activateUser", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin', 'moderator'),
    (0, common_1.Controller)({ path: 'admin', version: '1' }),
    __metadata("design:paramtypes", [admin_service_1.AdminService,
        kyc_service_1.KycService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map