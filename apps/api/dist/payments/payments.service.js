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
        this.stripe = new stripe_1.default(this.config.getOrThrow('STRIPE_SECRET_KEY'), { apiVersion: '2024-04-10' });
    }
    async createCheckoutSession(userId, botListingId, listingType) {
        let amount;
        switch (listingType) {
            case 'subscription_monthly':
                amount = 2900;
                break;
            case 'subscription_yearly':
                amount = 29000;
                break;
            case 'one_time':
                amount = 9900;
                break;
            default:
                throw new common_1.BadRequestException('Invalid listing type');
        }
        const frontendUrl = this.config.getOrThrow('FRONTEND_URL');
        const mode = listingType === 'one_time' ? 'payment' : 'subscription';
        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Bot Listing ${botListingId}`,
                        },
                        unit_amount: amount,
                        recurring: listingType === 'one_time'
                            ? undefined
                            : {
                                interval: listingType === 'subscription_monthly'
                                    ? 'month'
                                    : 'year',
                            },
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                userId,
                botListingId,
                listingType,
            },
            success_url: `${frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${frontendUrl}/payment-cancel`,
        });
        await this.paymentRepo.save({
            userId,
            botListingId,
            listingType,
            stripeSessionId: session.id,
            status: 'pending',
            amount,
        });
        return { url: session.url };
    }
    async handleWebhook(rawBody, signature) {
        const webhookSecret = this.config.getOrThrow('STRIPE_WEBHOOK_SECRET');
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        }
        catch (err) {
            this.logger.error('Stripe webhook signature verification failed');
            throw new common_1.BadRequestException('Invalid webhook signature');
        }
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const payment = await this.paymentRepo.findOne({
                where: { stripeSessionId: session.id },
            });
            if (!payment) {
                this.logger.warn(`Payment not found for session ${session.id}`);
                return;
            }
            payment.status = 'completed';
            await this.paymentRepo.save(payment);
            this.logger.log(`Payment completed for user ${payment.userId}`);
        }
        if (event.type === 'checkout.session.expired') {
            const session = event.data.object;
            await this.paymentRepo.update({ stripeSessionId: session.id }, { status: 'expired' });
        }
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