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
exports.Bot = void 0;
const typeorm_1 = require("typeorm");
let Bot = class Bot {
};
exports.Bot = Bot;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Bot.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seller_id' }),
    __metadata("design:type", String)
], Bot.prototype, "sellerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], Bot.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200, unique: true }),
    __metadata("design:type", String)
], Bot.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'short_description', length: 500, nullable: true }),
    __metadata("design:type", String)
], Bot.prototype, "shortDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, type: 'text' }),
    __metadata("design:type", String)
], Bot.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'draft' }),
    __metadata("design:type", String)
], Bot.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mt_platform' }),
    __metadata("design:type", String)
], Bot.prototype, "mtPlatform", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'currency_pairs', type: 'text', array: true, default: [] }),
    __metadata("design:type", Array)
], Bot.prototype, "currencyPairs", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', array: true, default: [] }),
    __metadata("design:type", Array)
], Bot.prototype, "timeframes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'risk_level', nullable: true, type: 'smallint' }),
    __metadata("design:type", Number)
], Bot.prototype, "riskLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_verified', default: false }),
    __metadata("design:type", Boolean)
], Bot.prototype, "isVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'verified_at', nullable: true }),
    __metadata("design:type", Date)
], Bot.prototype, "verifiedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_subscribers', default: 0 }),
    __metadata("design:type", Number)
], Bot.prototype, "totalSubscribers", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'avg_rating', type: 'decimal', precision: 3, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Bot.prototype, "avgRating", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Bot.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Bot.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at' }),
    __metadata("design:type", Date)
], Bot.prototype, "deletedAt", void 0);
exports.Bot = Bot = __decorate([
    (0, typeorm_1.Entity)('bots')
], Bot);
//# sourceMappingURL=bot.entity.js.map