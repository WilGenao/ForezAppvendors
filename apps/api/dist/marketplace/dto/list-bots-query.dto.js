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
exports.ListBotsQueryDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class ListBotsQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 20;
    }
}
exports.ListBotsQueryDto = ListBotsQueryDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListBotsQueryDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ListBotsQueryDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['MT4', 'MT5', 'BOTH'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['MT4', 'MT5', 'BOTH']),
    __metadata("design:type", String)
], ListBotsQueryDto.prototype, "mtPlatform", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['subscription_monthly', 'subscription_yearly', 'one_time'] }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ListBotsQueryDto.prototype, "listingType", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['rating', 'subscribers', 'price_asc', 'price_desc', 'newest'] }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ListBotsQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 1 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], ListBotsQueryDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ minimum: 1, maximum: 50 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(50),
    __metadata("design:type", Number)
], ListBotsQueryDto.prototype, "limit", void 0);
//# sourceMappingURL=list-bots-query.dto.js.map