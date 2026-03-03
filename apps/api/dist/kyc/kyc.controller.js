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
exports.KycController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
const kyc_service_1 = require("./kyc.service");
const submit_kyc_dto_1 = require("./dto/submit-kyc.dto");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let KycController = class KycController {
    constructor(kycService) {
        this.kycService = kycService;
    }
    submit(user, dto) { return this.kycService.submit(user.sub, dto); }
    getStatus(user) { return this.kycService.getStatus(user.sub); }
};
exports.KycController = KycController;
__decorate([
    (0, common_1.Post)('submit'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, submit_kyc_dto_1.SubmitKycDto]),
    __metadata("design:returntype", void 0)
], KycController.prototype, "submit", null);
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], KycController.prototype, "getStatus", null);
exports.KycController = KycController = __decorate([
    (0, swagger_1.ApiTags)('kyc'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Controller)({ path: 'kyc', version: '1' }),
    __metadata("design:paramtypes", [kyc_service_1.KycService])
], KycController);
//# sourceMappingURL=kyc.controller.js.map