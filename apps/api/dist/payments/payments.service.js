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
const licensing_service_1 = require("../licensing/licensing.service");
const PLATFORM_FEE_PERCENT = 0.20;
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(paymentRepo, config, dataSource, licensingService) {
        this.paymentRepo = paymentRepo;
        this.config = config;
        this.dataSource = dataSource;
        this.licensingService = licensingService;
        this.logger = new common_1.Logger(PaymentsService_1.name);
        const stripeKey = config.getOrThrow('STRIPE_SECRET_KEY');
        this.stripe = new stripe_1.default(stripeKey, { apiVersion: '2024-04-10' });
    }
    async createCheckoutSession(userId, botListingId, listingType) {
        const [listing] = await this.dataSource.query(`SELECT
         bl.id, bl.price_cents, bl.currency, bl.listing_type, bl.trial_days,
         bl.stripe_price_id,
         b.id as bot_id, b.name as bot_name, b.slug as bot_slug,
         sp.stripe_account_id, sp.stripe_onboarding_done, sp.user_id as seller_user_id
       FROM bot_listings bl
       JOIN bots b ON b.id = bl.bot_id AND b.deleted_at IS NULL
       JOIN seller_profiles sp ON sp.id = b.seller_id
       WHERE bl.id = $1
         AND bl.status = 'published'
         AND bl.deleted_at IS NULL
         AND b.status = 'active'`, [botListingId]);
        if (!listing)
            throw new common_1.NotFoundException('Listing not found or not available');
        const [existingSubscription] = await this.dataSource.query(`SELECT id FROM subscriptions
       WHERE user_id = $1 AND bot_listing_id = $2 AND status IN ('trialing','active')
       LIMIT 1`, [userId, botListingId]);
        if (existingSubscription) {
            throw new common_1.BadRequestException('You already have an active subscription to this bot');
        }
        const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
        let session;
        const idempotencyKey = `checkout-${userId}-${botListingId}-${Date.now()}`;
        if (listing.listing_type === 'one_time') {
            session = await this.stripe.checkout.sessions.create({
                mode: 'payment',
                line_items: [
                    {
                        price_data: {
                            currency: listing.currency.toLowerCase().trim(),
                            product_data: { name: listing.bot_name },
                            unit_amount: listing.price_cents,
                        },
                        quantity: 1,
                    },
                ],
                success_url: `${frontendUrl}/dashboard/buyer?payment=success&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${frontendUrl}/marketplace/${listing.bot_slug}?payment=cancelled`,
                client_reference_id: userId,
                metadata: { user_id: userId, bot_listing_id: botListingId },
            }, { idempotencyKey });
        }
        else {
            let priceId = listing.stripe_price_id;
            if (!priceId) {
                const price = await this.stripe.prices.create({
                    currency: listing.currency.toLowerCase().trim(),
                    unit_amount: listing.price_cents,
                    recurring: {
                        interval: listing.listing_type === 'subscription_yearly' ? 'year' : 'month',
                    },
                    product_data: { name: listing.bot_name },
                });
                priceId = price.id;
                await this.dataSource.query(`UPDATE bot_listings SET stripe_price_id = $1 WHERE id = $2`, [priceId, botListingId]);
            }
            const subscriptionData = {
                metadata: {
                    user_id: userId,
                    bot_listing_id: botListingId,
                    listing_type: listing.listing_type,
                },
            };
            if (listing.trial_days > 0) {
                subscriptionData.trial_period_days = listing.trial_days;
            }
            session = await this.stripe.checkout.sessions.create({
                mode: 'subscription',
                line_items: [{ price: priceId, quantity: 1 }],
                subscription_data: subscriptionData,
                success_url: `${frontendUrl}/dashboard/buyer?payment=success&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${frontendUrl}/marketplace/${listing.bot_slug}?payment=cancelled`,
                client_reference_id: userId,
                metadata: { user_id: userId, bot_listing_id: botListingId },
            }, { idempotencyKey });
        }
        this.logger.log({
            msg: 'Checkout session created',
            userId,
            botListingId,
            sessionId: session.id,
        });
        return { checkoutUrl: session.url, sessionId: session.id };
    }
    async handleWebhook(rawBody, signature) {
        const webhookSecret = this.config.getOrThrow('STRIPE_WEBHOOK_SECRET');
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        }
        catch (err) {
            this.logger.error({ msg: 'Webhook signature verification failed', error: err.message });
            throw new common_1.BadRequestException('Invalid webhook signature');
        }
        this.logger.log({ msg: 'Webhook received', type: event.type, id: event.id });
        const alreadyProcessed = await this.markEventProcessed(event.id, event.type);
        if (alreadyProcessed) {
            this.logger.warn({ msg: 'Duplicate webhook event — skipping', eventId: event.id });
            return;
        }
        try {
            switch (event.type) {
                case 'checkout.session.completed':
                    await this.handleCheckoutCompleted(event.data.object);
                    break;
                case 'invoice.paid':
                    await this.handleInvoicePaid(event.data.object);
                    break;
                case 'customer.subscription.deleted':
                    await this.handleSubscriptionCancelled(event.data.object);
                    break;
                case 'invoice.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;
                case 'customer.subscription.updated':
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;
                default:
                    this.logger.log({ msg: 'Unhandled webhook event', type: event.type });
            }
        }
        catch (err) {
            await this.dataSource.query(`UPDATE stripe_events SET processed = false, error = $1 WHERE event_id = $2`, [err.message, event.id]);
            throw err;
        }
    }
    async markEventProcessed(eventId, eventType) {
        const result = await this.dataSource.query(`INSERT INTO stripe_events (event_id, event_type, processed, processed_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`, [eventId, eventType]);
        return result.length === 0;
    }
    async handleCheckoutCompleted(session) {
        const { user_id: userId, bot_listing_id: botListingId } = session.metadata || {};
        if (!userId || !botListingId) {
            this.logger.error({ msg: 'Missing metadata in checkout session', sessionId: session.id });
            return;
        }
        await this.dataSource.transaction(async (manager) => {
            const [listing] = await manager.query(`SELECT bl.id, bl.listing_type, bl.price_cents, bl.currency,
                b.id as bot_id, b.slug as bot_slug
         FROM bot_listings bl JOIN bots b ON b.id = bl.bot_id
         WHERE bl.id = $1`, [botListingId]);
            if (!listing)
                throw new Error(`Listing ${botListingId} not found`);
            const now = new Date();
            let periodEnd = null;
            if (listing.listing_type === 'subscription_monthly') {
                periodEnd = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
            }
            else if (listing.listing_type === 'subscription_yearly') {
                periodEnd = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
            }
            const stripeSubId = session.subscription;
            const [subscription] = await manager.query(`INSERT INTO subscriptions
           (user_id, bot_listing_id, stripe_subscription_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, bot_listing_id) WHERE status IN ('trialing','active') DO NOTHING
         RETURNING id`, [userId, botListingId, stripeSubId, 'active', now, periodEnd]);
            if (!subscription) {
                this.logger.warn({ msg: 'Duplicate checkout — subscription already exists', userId, botListingId });
                return;
            }
            const platformFee = Math.round(listing.price_cents * PLATFORM_FEE_PERCENT);
            await manager.query(`INSERT INTO payments
           (user_id, subscription_id, status, amount_cents, currency, platform_fee_cents,
            seller_payout_cents, stripe_payment_intent_id, metadata)
         VALUES ($1, $2, 'succeeded', $3, $4, $5, $6, $7, $8)`, [
                userId, subscription.id, listing.price_cents, listing.currency,
                platformFee, listing.price_cents - platformFee,
                session.payment_intent,
                JSON.stringify({ checkout_session_id: session.id }),
            ]);
            await this.licensingService.createLicenseForSubscription(manager, subscription.id, userId, listing.bot_id);
            this.logger.log({ msg: 'Checkout completed', userId, botListingId, subscriptionId: subscription.id });
        });
    }
    async handleInvoicePaid(invoice) {
        if (!invoice.subscription)
            return;
        const subId = invoice.subscription;
        await this.dataSource.query(`UPDATE subscriptions
       SET status = 'active',
           current_period_start = to_timestamp($1),
           current_period_end   = to_timestamp($2),
           updated_at = NOW()
       WHERE stripe_subscription_id = $3`, [invoice.period_start, invoice.period_end, subId]);
        this.logger.log({ msg: 'Invoice paid', stripeSubId: subId });
    }
    async handleSubscriptionCancelled(subscription) {
        await this.dataSource.transaction(async (manager) => {
            const [sub] = await manager.query(`UPDATE subscriptions SET status = 'canceled', updated_at = NOW()
         WHERE stripe_subscription_id = $1 RETURNING id`, [subscription.id]);
            if (!sub)
                return;
            await manager.query(`UPDATE licenses SET status = 'revoked', updated_at = NOW()
         WHERE subscription_id = $1 AND status = 'active'`, [sub.id]);
        });
        this.logger.log({ msg: 'Subscription cancelled', stripeSubId: subscription.id });
    }
    async handlePaymentFailed(invoice) {
        if (!invoice.subscription)
            return;
        await this.dataSource.query(`UPDATE subscriptions SET status = 'past_due', updated_at = NOW()
       WHERE stripe_subscription_id = $1`, [invoice.subscription]);
        this.logger.warn({ msg: 'Payment failed', stripeSubId: invoice.subscription });
    }
    async handleSubscriptionUpdated(subscription) {
        const newStatus = subscription.status === 'active' ? 'active'
            : subscription.status === 'trialing' ? 'trialing'
                : subscription.status === 'past_due' ? 'past_due'
                    : null;
        if (!newStatus)
            return;
        await this.dataSource.query(`UPDATE subscriptions
       SET status = $1,
           current_period_start = to_timestamp($2),
           current_period_end = to_timestamp($3),
           updated_at = NOW()
       WHERE stripe_subscription_id = $4`, [
            newStatus,
            subscription.current_period_start,
            subscription.current_period_end,
            subscription.id,
        ]);
        this.logger.log({ msg: 'Subscription updated', stripeSubId: subscription.id, newStatus });
    }
    async getUserPaymentHistory(userId) {
        return this.dataSource.query(`SELECT
         p.id, p.amount_cents, p.currency, p.status, p.created_at,
         b.name as bot_name, b.slug as bot_slug
       FROM payments p
       JOIN subscriptions s ON s.id = p.subscription_id
       JOIN bot_listings bl ON bl.id = s.bot_listing_id
       JOIN bots b ON b.id = bl.bot_id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT 50`, [userId]);
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService,
        typeorm_2.DataSource,
        licensing_service_1.LicensingService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map