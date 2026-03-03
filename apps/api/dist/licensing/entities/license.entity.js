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
exports.License = void 0;
const typeorm_1 = require("typeorm");
let License = class License {
};
exports.License = License;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], License.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'subscription_id' }),
    __metadata("design:type", String)
], License.prototype, "subscriptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id' }),
    __metadata("design:type", String)
], License.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bot_id' }),
    __metadata("design:type", String)
], License.prototype, "botId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bot_version_id' }),
    __metadata("design:type", String)
], License.prototype, "botVersionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'license_key', unique: true }),
    __metadata("design:type", String)
], License.prototype, "licenseKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'active' }),
    __metadata("design:type", String)
], License.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_activations', default: 1 }),
    __metadata("design:type", Number)
], License.prototype, "maxActivations", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'current_activations', default: 0 }),
    __metadata("design:type", Number)
], License.prototype, "currentActivations", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hwid_hash', type: 'text', array: true, nullable: true }),
    __metadata("design:type", Array)
], License.prototype, "hwidHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', nullable: true }),
    __metadata("design:type", Date)
], License.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_validated_at', nullable: true }),
    __metadata("design:type", Date)
], License.prototype, "lastValidatedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], License.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], License.prototype, "updatedAt", void 0);
exports.License = License = __decorate([
    (0, typeorm_1.Entity)('licenses')
], License);
//# sourceMappingURL=license.entity.js.map