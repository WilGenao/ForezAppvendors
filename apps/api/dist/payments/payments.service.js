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
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const stripe_1 = require("stripe");
const payment_entity_1 = require("./entities/payment.entity");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(paymentRepo, config) {
        this.paymentRepo = paymentRepo;
        this.config = config;
        this.logger = new common_1.Logger(PaymentsService_1.name);
        this.stripe = new stripe_1.default(config.get('STRIPE_SECRET_KEY', 'sk_test_placeholder'), { apiVersion: '2024-04-10' });
    }
    async createCheckoutSession(userId, botListingId, listingType) {
        return { message: 'Checkout session creation - configure Stripe keys to enable', userId, botListingId, listingType };
    }
    async handleWebhook(rawBody, signature) {
        if (!rawBody || !signature)
            throw new common_1.BadRequestException('Invalid webhook');
        this.logger.log({ msg: 'Webhook received' });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map