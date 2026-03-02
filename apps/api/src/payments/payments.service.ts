import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Payment } from './entities/payment.entity';
import { LicensingService } from '../licensing/licensing.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;
  // Plataforma cobra 20% de comisión
  private readonly PLATFORM_FEE_PERCENT = 0.20;

  constructor(
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRedis() private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly licensingService: LicensingService,
    private readonly dataSource: DataSource,
  ) {
    this.stripe = new Stripe(config.getOrThrow<string>('STRIPE_SECRET_KEY'), { apiVersion: '2024-06-20' });
  }

  async createCheckoutSession(userId: string, botListingId: string, listingType: string) {
    // Obtener listing con bot y seller info
    const listing = await this.dataSource.query(
      `SELECT bl.*, b.name as bot_name, sp.stripe_account_id
       FROM bot_listings bl
       JOIN bots b ON b.id = bl.bot_id
       JOIN seller_profiles sp ON sp.id = b.seller_id
       WHERE bl.id = $1 AND bl.status = 'published' AND bl.deleted_at IS NULL`,
      [botListingId],
    );
    if (!listing.length) throw new NotFoundException('Listing not found or unavailable');
    const l = listing[0];
    if (!l.stripe_account_id) throw new BadRequestException('Seller has not completed payment setup');

    const platformFee = Math.round(l.price_cents * this.PLATFORM_FEE_PERCENT);

    if (listingType === 'one_time') {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: l.stripe_price_id, quantity: 1 }],
        mode: 'payment',
        success_url: `${this.config.get('FRONTEND_URL')}/dashboard/purchases?success=1`,
        cancel_url: `${this.config.get('FRONTEND_URL')}/marketplace/${botListingId}`,
        payment_intent_data: {
          application_fee_amount: platformFee,
          transfer_data: { destination: l.stripe_account_id },
        },
        metadata: { userId, botListingId, listingType },
      });
      return { sessionUrl: session.url };
    }

    // Subscription
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: l.stripe_price_id, quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        application_fee_percent: this.PLATFORM_FEE_PERCENT * 100,
        transfer_data: { destination: l.stripe_account_id },
        trial_period_days: l.trial_days || undefined,
      },
      success_url: `${this.config.get('FRONTEND_URL')}/dashboard/purchases?success=1`,
      cancel_url: `${this.config.get('FRONTEND_URL')}/marketplace/${botListingId}`,
      metadata: { userId, botListingId, listingType },
    });
    return { sessionUrl: session.url };
  }

  /**
   * Webhook handler con idempotencia.
   *
   * Stripe puede enviar el mismo evento 2 veces.
   * Estrategia:
   * 1. Verificar firma del webhook (evita eventos falsos)
   * 2. Insertar en stripe_events con UNIQUE en stripe_event_id
   * 3. Si el INSERT falla por conflicto → ya procesado → return OK silencioso
   * 4. Si el INSERT ok → procesar evento → marcar processed_at
   *
   * Esto garantiza exactamente-una-vez desde el punto de vista del negocio.
   */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'),
      );
    } catch (err) {
      this.logger.warn({ msg: 'Invalid webhook signature', err: (err as Error).message });
      throw new BadRequestException('Invalid webhook signature');
    }

    // Idempotencia: intentar insertar el evento
    const inserted = await this.dataSource.query(
      `INSERT INTO stripe_events (stripe_event_id, event_type, payload)
       VALUES ($1, $2, $3)
       ON CONFLICT (stripe_event_id) DO NOTHING
       RETURNING id`,
      [event.id, event.type, JSON.stringify(event)],
    );

    if (!inserted.length) {
      this.logger.log({ msg: 'Duplicate webhook event ignored', eventId: event.id, type: event.type });
      return; // Silencioso — Stripe espera 200
    }

    try {
      await this.processStripeEvent(event);
      await this.dataSource.query(
        `UPDATE stripe_events SET processed_at = NOW() WHERE stripe_event_id = $1`,
        [event.id],
      );
    } catch (err) {
      await this.dataSource.query(
        `UPDATE stripe_events SET processing_error = $1, retry_count = retry_count + 1 WHERE stripe_event_id = $2`,
        [(err as Error).message, event.id],
      );
      this.logger.error({ msg: 'Failed to process webhook', eventId: event.id, type: event.type, err });
      throw err; // Re-throw para que Stripe reintente
    }
  }

  private async processStripeEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        this.logger.log({ msg: 'Unhandled webhook type', type: event.type });
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const { userId, botListingId, listingType } = session.metadata || {};
    if (!userId || !botListingId) return;

    await this.dataSource.transaction(async (manager) => {
      // Crear subscription record
      const [sub] = await manager.query(
        `INSERT INTO subscriptions (user_id, bot_listing_id, status, stripe_subscription_id, stripe_customer_id)
         VALUES ($1, $2, 'active', $3, $4)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [userId, botListingId, session.subscription, session.customer],
      );
      if (!sub) return;

      // Obtener bot_id y bot_version_id del listing
      const [listing] = await manager.query(
        `SELECT bl.bot_id, bl.bot_version_id FROM bot_listings bl WHERE bl.id = $1`,
        [botListingId],
      );

      // Generar licencia
      await this.licensingService.generateLicenseKey(sub.id, userId, listing.bot_id, listing.bot_version_id);

      // Registrar payment
      const amountTotal = session.amount_total || 0;
      const platformFee = Math.round(amountTotal * this.PLATFORM_FEE_PERCENT);
      await manager.query(
        `INSERT INTO payments (subscription_id, user_id, status, amount_cents, platform_fee_cents, seller_payout_cents, stripe_payment_intent_id)
         VALUES ($1, $2, 'succeeded', $3, $4, $5, $6)`,
        [sub.id, userId, amountTotal, platformFee, amountTotal - platformFee, session.payment_intent],
      );

      // Incrementar total_subscribers en el bot
      await manager.query(
        `UPDATE bots SET total_subscribers = total_subscribers + 1 WHERE id = (SELECT bot_id FROM bot_listings WHERE id = $1)`,
        [botListingId],
      );
    });
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;
    await this.dataSource.query(
      `UPDATE subscriptions SET status = 'past_due' WHERE stripe_subscription_id = $1`,
      [invoice.subscription],
    );
    this.logger.warn({ msg: 'Payment failed', subscription: invoice.subscription });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const [sub] = await manager.query(
        `UPDATE subscriptions SET status = 'canceled', canceled_at = NOW()
         WHERE stripe_subscription_id = $1 RETURNING id`,
        [subscription.id],
      );
      if (!sub) return;
      await manager.query(
        `UPDATE licenses SET status = 'revoked' WHERE subscription_id = $1`,
        [sub.id],
      );
    });
  }
}
