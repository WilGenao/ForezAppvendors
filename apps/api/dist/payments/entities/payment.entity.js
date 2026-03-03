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
exports.Payment = void 0;
const typeorm_1 = require("typeorm");
let Payment = class Payment {
};
exports.Payment = Payment;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Payment.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'subscription_id', nullable: true }),
    __metadata("design:type", String)
], Payment.prototype, "subscriptionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id' }),
    __metadata("design:type", String)
], Payment.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'pending' }),
    __metadata("design:type", String)
], Payment.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'amount_cents' }),
    __metadata("design:type", Number)
], Payment.prototype, "amountCents", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3, default: 'USD' }),
    __metadata("design:type", String)
], Payment.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'platform_fee_cents', default: 0 }),
    __metadata("design:type", Number)
], Payment.prototype, "platformFeeCents", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seller_payout_cents', default: 0 }),
    __metadata("design:type", Number)
], Payment.prototype, "sellerPayoutCents", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'stripe_payment_intent_id', unique: true, nullable: true }),
    __metadata("design:type", String)
], Payment.prototype, "stripePaymentIntentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], Payment.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Payment.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Payment.prototype, "updatedAt", void 0);
exports.Payment = Payment = __decorate([
    (0, typeorm_1.Entity)('payments')
], Payment);
//# sourceMappingURL=payment.entity.js.map