import { Injectable, RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import Stripe from 'stripe';
import { NotFoundError, ValidationError, ExternalServiceError } from '../../common/errors/app.errors';
import { Request } from 'express';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.stripe = new Stripe(this.config.get<string>('stripe.secretKey')!, {
      apiVersion: '2024-06-20',
    });
  }

  async createCheckoutSession(buyerId: string, listingId: string) {
    const listing = await this.prisma.botListing.findFirst({
      where: { id: listingId, status: 'published', deletedAt: null },
      include: { bot: { include: { seller: true } } },
    });
    if (!listing) throw new NotFoundError('BotListing', listingId);
    if (!listing.stripePriceId) throw new ValidationError('Listing not ready for purchase');
    if (!listing.bot.seller.stripeAccountId) throw new ValidationError('Seller payment setup incomplete');
    if (!listing.bot.seller.stripeOnboardingDone) throw new ValidationError('Seller onboarding incomplete');

    const platformFeePercent = this.config.get<number>('app.platformFeePercent', 15);
    const applicationFeeAmount = Math.round((listing.priceCents * platformFeePercent) / 100);

    const session = await this.stripe.checkout.sessions.create({
      mode: listing.listingType === 'one_time' ? 'payment' : 'subscription',
      line_items: [{ price: listing.stripePriceId, quantity: 1 }],
      payment_intent_data: listing.listingType === 'one_time'
        ? { application_fee_amount: applicationFeeAmount, transfer_data: { destination: listing.bot.seller.stripeAccountId } }
        : undefined,
      subscription_data: listing.listingType !== 'one_time'
        ? { application_fee_percent: platformFeePercent, transfer_data: { destination: listing.bot.seller.stripeAccountId } }
        : undefined,
      success_url: `${process.env.FRONTEND_URL}/marketplace/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/marketplace/bots/${listing.bot.slug}`,
      metadata: { buyerId, listingId, botId: listing.botId },
    });

    return { checkoutUrl: session.url, sessionId: session.id };
  }

  // DECISIÓN CRÍTICA: Idempotencia en webhooks.
  // Stripe puede enviar el mismo evento múltiples veces (network retry, etc).
  // Solución: tabla stripe_events con UNIQUE en stripe_event_id.
  // Intentar insertar → si falla por constraint = ya procesado → return early.
  // NO usar "verificar si existe y luego insertar" (race condition).
  async handleWebhook(req: RawBodyRequest<Request>) {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody!,
        sig,
        this.config.get<string>('stripe.webhookSecret')!,
      );
    } catch (err: any) {
      throw new ValidationError(`Webhook signature verification failed: ${err.message}`);
    }

    // Idempotency: try to insert the event record
    try {
      await this.prisma.stripeEvent.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          payload: event as any,
        },
      });
    } catch (err: any) {
      // Unique constraint violation = already processed
      if (err.code === 'P2002') {
        return { received: true, alreadyProcessed: true };
      }
      throw err;
    }

    // Process event
    try {
      await this.processStripeEvent(event);
      await this.prisma.stripeEvent.update({
        where: { stripeEventId: event.id },
        data: { processed: true, processedAt: new Date() },
      });
    } catch (err: any) {
      await this.prisma.stripeEvent.update({
        where: { stripeEventId: event.id },
        data: { errorMessage: err.message, retryCount: { increment: 1 } },
      });
      throw err;
    }

    return { received: true };
  }

  private async processStripeEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoiceSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const { buyerId, listingId, botId } = session.metadata!;

    const listing = await this.prisma.botListing.findUnique({
      where: { id: listingId },
      include: { bot: { include: { seller: true } } },
    });
    if (!listing) throw new NotFoundError('BotListing', listingId);

    await this.prisma.$transaction(async (tx) => {
      let subscription = null;

      if (session.mode === 'subscription' && session.subscription) {
        const stripeSub = await this.stripe.subscriptions.retrieve(session.subscription as string);
        subscription = await tx.subscription.create({
          data: {
            buyerId,
            listingId,
            status: stripeSub.status,
            stripeSubscriptionId: stripeSub.id,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            trialEnd: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
          },
        });
      }

      const payment = await tx.payment.create({
        data: {
          subscriptionId: subscription?.id,
          buyerId,
          sellerId: listing.bot.seller.id,
          amountCents: session.amount_total ?? listing.priceCents,
          currency: session.currency?.toUpperCase() ?? 'USD',
          status: 'succeeded',
          stripePaymentIntentId: session.payment_intent as string,
          metadata: { sessionId: session.id },
        },
      });

      // Create license
      await tx.license.create({
        data: {
          subscriptionId: subscription?.id,
          paymentId: payment.id,
          buyerId,
          botId,
          status: 'active',
          expiresAt: listing.listingType === 'one_time' ? null : undefined,
        },
      });
    });
  }

  private async handleInvoiceSucceeded(invoice: Stripe.Invoice) {
    if (!invoice.subscription) return;
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: invoice.subscription as string },
      data: { status: 'active' },
    });
  }

  private async handleInvoiceFailed(invoice: Stripe.Invoice) {
    if (!invoice.subscription) return;
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: invoice.subscription as string },
      data: { status: 'past_due' },
    });
    // TODO: suspend licenses associated with this subscription
  }

  private async handleSubscriptionDeleted(sub: Stripe.Subscription) {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data: { status: 'canceled', canceledAt: new Date() },
    });
    // Revoke licenses
    const subscription = await this.prisma.subscription.findFirst({ where: { stripeSubscriptionId: sub.id } });
    if (subscription) {
      await this.prisma.license.updateMany({
        where: { subscriptionId: subscription.id },
        data: { status: 'revoked', revokedAt: new Date(), revokeReason: 'Subscription canceled' },
      });
    }
  }

  private async handleSubscriptionUpdated(sub: Stripe.Subscription) {
    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data: {
        status: sub.status,
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    });
  }
}
