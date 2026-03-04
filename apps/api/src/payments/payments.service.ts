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

// Platform fee: 20% — seller gets 80%
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
    this.stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' });
  }

  /**
   * Creates a Stripe Checkout Session for a bot listing.
   * Supports subscription_monthly, subscription_yearly, and one_time listings.
   *
   * Flow:
   * 1. Validate listing exists and is published
   * 2. Verify seller has completed Stripe Connect onboarding
   * 3. Create Stripe Checkout Session with application_fee
   * 4. Return the session URL for frontend redirect
   */
  async createCheckoutSession(userId: string, botListingId: string, listingType: string) {
    // 1. Fetch listing details
    const [listing] = await this.dataSource.query(
      `SELECT
         bl.id, bl.price_cents, bl.currency, bl.listing_type, bl.trial_days,
         bl.stripe_price_id,
         b.id as bot_id, b.name as bot_name,
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
    if (!listing.stripe_onboarding_done || !listing.stripe_account_id) {
      throw new BadRequestException('Seller has not completed payment setup');
    }

    // 2. Check if user already has an active subscription to this bot
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
    const platformFee = Math.round(listing.price_cents * PLATFORM_FEE_PERCENT);

    let session: Stripe.Checkout.Session;

    if (listing.listing_type === 'one_time') {
      // One-time purchase
      session = await this.stripe.checkout.sessions.create(
        {
          mode: 'payment',
          line_items: [
            {
              price_data: {
                currency: listing.currency.toLowerCase(),
                product_data: { name: listing.bot_name, metadata: { bot_id: listing.bot_id } },
                unit_amount: listing.price_cents,
              },
              quantity: 1,
            },
          ],
          payment_intent_data: {
            application_fee_amount: platformFee,
            metadata: {
              user_id: userId,
              bot_listing_id: botListingId,
              listing_type: 'one_time',
            },
          },
          success_url: `${frontendUrl}/dashboard/buyer?payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${frontendUrl}/marketplace/${listing.bot_id}?payment=cancelled`,
          client_reference_id: userId,
          metadata: { user_id: userId, bot_listing_id: botListingId },
        },
        { stripeAccount: listing.stripe_account_id },
      );
    } else {
      // Subscription (monthly or yearly)
      if (!listing.stripe_price_id) {
        throw new InternalServerErrorException(
          'Stripe price not configured for this listing. Contact support.',
        );
      }

      const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
        application_fee_percent: PLATFORM_FEE_PERCENT * 100,
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
          line_items: [{ price: listing.stripe_price_id, quantity: 1 }],
          subscription_data: subscriptionData,
          success_url: `${frontendUrl}/dashboard/buyer?payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${frontendUrl}/marketplace/${listing.bot_id}?payment=cancelled`,
          client_reference_id: userId,
          metadata: { user_id: userId, bot_listing_id: botListingId },
        },
        { stripeAccount: listing.stripe_account_id },
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

  /**
   * Handles Stripe webhook events.
   * IMPORTANT: Must be called with the raw request body (Buffer) for signature verification.
   *
   * Handled events:
   * - checkout.session.completed → create subscription + generate license key
   * - invoice.paid               → renew subscription period
   * - customer.subscription.deleted → cancel subscription + revoke license
   * - invoice.payment_failed     → mark subscription as past_due
   */
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
      default:
        this.logger.log({ msg: 'Unhandled webhook event', type: event.type });
    }
  }

  // ─── Private handlers ───────────────────────────────────────────────────────

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const { user_id: userId, bot_listing_id: botListingId } = session.metadata || {};
    if (!userId || !botListingId) {
      this.logger.error({ msg: 'Missing metadata in checkout session', sessionId: session.id });
      return;
    }

    // Use a transaction: create subscription + payment record + license atomically
    await this.dataSource.transaction(async (manager) => {
      const [listing] = await manager.query(
        `SELECT bl.id, bl.listing_type, bl.price_cents, bl.currency,
                b.id as bot_id, b.slug as bot_slug
         FROM bot_listings bl JOIN bots b ON b.id = bl.bot_id
         WHERE bl.id = $1`,
        [botListingId],
      );
      if (!listing) throw new Error(`Listing ${botListingId} not found`);

      // Determine subscription end date
      const now = new Date();
      let periodEnd: Date | null = null;
      if (listing.listing_type === 'subscription_monthly') {
        periodEnd = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
      } else if (listing.listing_type === 'subscription_yearly') {
        periodEnd = new Date(now.getTime() + 365 * 24 * 3600 * 1000);
      }

      // Create subscription record
      const stripeSubId = session.subscription as string | null;
      const [subscription] = await manager.query(
        `INSERT INTO subscriptions
           (user_id, bot_listing_id, stripe_subscription_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, bot_listing_id) WHERE status IN ('trialing','active') DO NOTHING
         RETURNING id`,
        [
          userId,
          botListingId,
          stripeSubId,
          listing.listing_type === 'one_time' ? 'active' : 'active',
          now,
          periodEnd,
        ],
      );

      if (!subscription) {
        this.logger.warn({ msg: 'Duplicate checkout — subscription already exists', userId, botListingId });
        return;
      }

      // Create payment record
      const platformFee = Math.round(listing.price_cents * PLATFORM_FEE_PERCENT);
      await manager.query(
        `INSERT INTO payments
           (user_id, subscription_id, status, amount_cents, currency, platform_fee_cents,
            seller_payout_cents, stripe_payment_intent_id, metadata)
         VALUES ($1, $2, 'succeeded', $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          subscription.id,
          listing.price_cents,
          listing.currency,
          platformFee,
          listing.price_cents - platformFee,
          session.payment_intent as string,
          JSON.stringify({ checkout_session_id: session.id }),
        ],
      );

      // Generate license key and create license record
      await this.licensingService.createLicenseForSubscription(
        manager,
        subscription.id,
        userId,
        listing.bot_id,
      );

      this.logger.log({
        msg: 'Checkout completed — subscription and license created',
        userId,
        botListingId,
        subscriptionId: subscription.id,
      });
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
      [
        (invoice.period_start),
        (invoice.period_end),
        subId,
      ],
    );

    this.logger.log({ msg: 'Invoice paid — subscription renewed', stripeSubId: subId });
  }

  private async handleSubscriptionCancelled(subscription: Stripe.Subscription): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Mark subscription canceled
      const [sub] = await manager.query(
        `UPDATE subscriptions SET status = 'canceled', updated_at = NOW()
         WHERE stripe_subscription_id = $1
         RETURNING id`,
        [subscription.id],
      );
      if (!sub) return;

      // Revoke associated license
      await manager.query(
        `UPDATE licenses SET status = 'revoked', updated_at = NOW()
         WHERE subscription_id = $1 AND status = 'active'`,
        [sub.id],
      );
    });

    this.logger.log({ msg: 'Subscription cancelled — license revoked', stripeSubId: subscription.id });
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;

    await this.dataSource.query(
      `UPDATE subscriptions SET status = 'past_due', updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [invoice.subscription as string],
    );

    this.logger.warn({ msg: 'Payment failed — subscription past_due', stripeSubId: invoice.subscription });
  }
}
