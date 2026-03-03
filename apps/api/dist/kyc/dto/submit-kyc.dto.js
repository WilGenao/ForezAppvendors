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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmitKycDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class SubmitKycDto {
}
exports.SubmitKycDto = SubmitKycDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ['passport', 'national_id', 'drivers_license'] }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsIn)(['passport', 'national_id', 'drivers_license']),
    __metadata("design:type", String)
], SubmitKycDto.prototype, "documentType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Azure Blob URL of front document' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitKycDto.prototype, "documentFrontUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Azure Blob URL of back document (if applicable)' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitKycDto.prototype, "documentBackUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Azure Blob URL of selfie' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SubmitKycDto.prototype, "selfieUrl", void 0);
//# sourceMappingURL=submit-kyc.dto.js.map