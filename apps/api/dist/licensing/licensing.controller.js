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
exports.LicensingController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const swagger_1 = require("@nestjs/swagger");
const licensing_service_1 = require("./licensing.service");
const validate_license_dto_1 = require("./dto/validate-license.dto");
let LicensingController = class LicensingController {
    constructor(licensingService) {
        this.licensingService = licensingService;
    }
    validate(dto, ip) {
        return this.licensingService.validate(dto, ip);
    }
};
exports.LicensingController = LicensingController;
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 60, ttl: 60000 } }),
    (0, common_1.Post)('validate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [validate_license_dto_1.ValidateLicenseDto, String]),
    __metadata("design:returntype", void 0)
], LicensingController.prototype, "validate", null);
exports.LicensingController = LicensingController = __decorate([
    (0, swagger_1.ApiTags)('licensing'),
    (0, common_1.Controller)({ path: 'licensing', version: '1' }),
    __metadata("design:paramtypes", [licensing_service_1.LicensingService])
], LicensingController);
//# sourceMappingURL=licensing.controller.js.map