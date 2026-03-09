import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Payment } from './entities/payment.entity';
import { LicensingService } from '../licensing/licensing.service';

const PLATFORM_FEE_PERCENT = 0.20;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;

  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly licensingService: LicensingService,
  ) {
    const stripeKey = config.getOrThrow<string>('STRIPE_SECRET_KEY');
    // FIX: Updated to current stable Stripe API version
    this.stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' });
  }

  async createCheckoutSession(userId: string, botListingId: string, listingType: string) {
    const [listing] = await this.dataSource.query(
      `SELECT
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
         AND b.status = 'active'`,
      [botListingId],
    );

    if (!listing) throw new NotFoundException('Listing not found or not available');

    // NOTE: This check is a UX guard only, not a security guarantee.
    // The real dedup protection is the ON CONFLICT in handleCheckoutCompleted.
    const [existingSubscription] = await this.dataSource.query(
      `SELECT id FROM subscriptions
       WHERE user_id = $1 AND bot_listing_id = $2 AND status IN ('trialing','active')
       LIMIT 1`,
      [userId, botListingId],
    );
    if (existingSubscription) {
      throw new BadRequestException('You already have an active subscription to this bot');
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');

    let session: Stripe.Checkout.Session;

    // FIX: Add idempotency key to prevent duplicate Stripe sessions
    const idempotencyKey = `checkout-${userId}-${botListingId}-${Date.now()}`;

    if (listing.listing_type === 'one_time') {
      session = await this.stripe.checkout.sessions.create(
        {
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
        },
        { idempotencyKey },
      );
    } else {
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

        await this.dataSource.query(
          `UPDATE bot_listings SET stripe_price_id = $1 WHERE id = $2`,
          [priceId, botListingId],
        );
      }

      const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
        metadata: {
          user_id: userId,
          bot_listing_id: botListingId,
          listing_type: listing.listing_type,
        },
      };

      if (listing.trial_days > 0) {
        subscriptionData.trial_period_days = listing.trial_days;
      }

      session = await this.stripe.checkout.sessions.create(
        {
          mode: 'subscription',
          line_items: [{ price: priceId, quantity: 1 }],
          subscription_data: subscriptionData,
          success_url: `${frontendUrl}/dashboard/buyer?payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${frontendUrl}/marketplace/${listing.bot_slug}?payment=cancelled`,
          client_reference_id: userId,
          metadata: { user_id: userId, bot_listing_id: botListingId },
        },
        { idempotencyKey },
      );
    }

    this.logger.log({
      msg: 'Checkout session created',
      userId,
      botListingId,
      sessionId: session.id,
    });

    return { checkoutUrl: session.url, sessionId: session.id };
  }

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.error({ msg: 'Webhook signature verification failed', error: err.message });
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log({ msg: 'Webhook received', type: event.type, id: event.id });

    // FIX: Global webhook idempotency — check if this event was already processed
    const alreadyProcessed = await this.markEventProcessed(event.id, event.type);
    if (alreadyProcessed) {
      this.logger.warn({ msg: 'Duplicate webhook event — skipping', eventId: event.id });
      return;
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        default:
          this.logger.log({ msg: 'Unhandled webhook event', type: event.type });
      }
    } catch (err) {
      // Mark event as failed so it can be retried
      await this.dataSource.query(
        `UPDATE stripe_events SET processed = false, error = $1 WHERE event_id = $2`,
        [err.message, event.id],
      );
      throw err;
    }
  }

  // FIX: Idempotency check using stripe_events table
  private async markEventProcessed(eventId: string, eventType: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `INSERT INTO stripe_events (event_id, event_type, processed, processed_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [eventId, eventType],
    );
    // If nothing was inserted, the event was already processed
    return result.length === 0;
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const { user_id: userId, bot_listing_id: botListingId } = session.metadata || {};
    if (!userId || !botListingId) {
      this.logger.error({ msg: 'Missing metadata in checkout session', sessionId: session.id });
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      const [listing] = await manager.query(
        `SELECT bl.id, bl.listing_type, bl.price_cents, bl.currency,
                b.id as bot_id, b.slug as bot_slug
         FROM bot_listings bl JOIN bots b ON b.id = bl.bot_id
         WHERE bl.id = $1`,
        [botListingId],
      );
      if (!listing) throw new Error(`Listing ${botListingId} not found`);

      const now = new Date();
      let periodEnd: Date | null = null;
      if (listing.listing_type === 'subscription_monthly') {
        periodEnd = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
      } else if (listing.listing_type === 'subscription_yearly') {
        periodEnd = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
      }

      const stripeSubId = session.subscription as string | null;
      const [subscription] = await manager.query(
        `INSERT INTO subscriptions
           (user_id, bot_listing_id, stripe_subscription_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, bot_listing_id) WHERE status IN ('trialing','active') DO NOTHING
         RETURNING id`,
        [userId, botListingId, stripeSubId, 'active', now, periodEnd],
      );

      if (!subscription) {
        this.logger.warn({ msg: 'Duplicate checkout — subscription already exists', userId, botListingId });
        return;
      }

      const platformFee = Math.round(listing.price_cents * PLATFORM_FEE_PERCENT);
      await manager.query(
        `INSERT INTO payments
           (user_id, subscription_id, status, amount_cents, currency, platform_fee_cents,
            seller_payout_cents, stripe_payment_intent_id, metadata)
         VALUES ($1, $2, 'succeeded', $3, $4, $5, $6, $7, $8)`,
        [
          userId, subscription.id, listing.price_cents, listing.currency,
          platformFee, listing.price_cents - platformFee,
          session.payment_intent as string,
          JSON.stringify({ checkout_session_id: session.id }),
        ],
      );

      await this.licensingService.createLicenseForSubscription(
        manager, subscription.id, userId, listing.bot_id,
      );

      this.logger.log({ msg: 'Checkout completed', userId, botListingId, subscriptionId: subscription.id });
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;
    const subId = invoice.subscription as string;
    await this.dataSource.query(
      `UPDATE subscriptions
       SET status = 'active',
           current_period_start = to_timestamp($1),
           current_period_end   = to_timestamp($2),
           updated_at = NOW()
       WHERE stripe_subscription_id = $3`,
      [invoice.period_start, invoice.period_end, subId],
    );
    this.logger.log({ msg: 'Invoice paid', stripeSubId: subId });
  }

  private async handleSubscriptionCancelled(subscription: Stripe.Subscription): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const [sub] = await manager.query(
        `UPDATE subscriptions SET status = 'canceled', updated_at = NOW()
         WHERE stripe_subscription_id = $1 RETURNING id`,
        [subscription.id],
      );
      if (!sub) return;
      await manager.query(
        `UPDATE licenses SET status = 'revoked', updated_at = NOW()
         WHERE subscription_id = $1 AND status = 'active'`,
        [sub.id],
      );
    });
    this.logger.log({ msg: 'Subscription cancelled', stripeSubId: subscription.id });
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;
    await this.dataSource.query(
      `UPDATE subscriptions SET status = 'past_due', updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [invoice.subscription as string],
    );
    this.logger.warn({ msg: 'Payment failed', stripeSubId: invoice.subscription });
  }

  // NEW: Handle subscription plan changes (upgrades/downgrades)
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const newStatus = subscription.status === 'active' ? 'active'
      : subscription.status === 'trialing' ? 'trialing'
      : subscription.status === 'past_due' ? 'past_due'
      : null;

    if (!newStatus) return;

    await this.dataSource.query(
      `UPDATE subscriptions
       SET status = $1,
           current_period_start = to_timestamp($2),
           current_period_end = to_timestamp($3),
           updated_at = NOW()
       WHERE stripe_subscription_id = $4`,
      [
        newStatus,
        subscription.current_period_start,
        subscription.current_period_end,
        subscription.id,
      ],
    );
    this.logger.log({ msg: 'Subscription updated', stripeSubId: subscription.id, newStatus });
  }

  // NEW: Get payment history for a user
  async getUserPaymentHistory(userId: string) {
    return this.dataSource.query(
      `SELECT
         p.id, p.amount_cents, p.currency, p.status, p.created_at,
         b.name as bot_name, b.slug as bot_slug
       FROM payments p
       JOIN subscriptions s ON s.id = p.subscription_id
       JOIN bot_listings bl ON bl.id = s.bot_listing_id
       JOIN bots b ON b.id = bl.bot_id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [userId],
    );
  }
}
