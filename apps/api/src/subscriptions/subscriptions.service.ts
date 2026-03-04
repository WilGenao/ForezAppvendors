// apps/api/src/subscriptions/subscriptions.service.ts
import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(config.getOrThrow('STRIPE_SECRET_KEY'), { apiVersion: '2024-04-10' });
  }

  /** All subscriptions + licenses for the logged-in buyer */
  async getBuyerSubscriptions(userId: string) {
    const rows = await this.dataSource.query(
      `SELECT
         s.id, s.status, s.current_period_start, s.current_period_end, s.canceled_at,
         s.stripe_subscription_id, s.created_at,
         bl.listing_type AS plan, bl.price_cents, bl.currency,
         b.id AS bot_id, b.name AS bot_name, b.slug AS bot_slug,
         b.mt_platform, b.avg_rating,
         sp.display_name AS seller_name,
         l.id AS license_id, l.license_key, l.status AS license_status,
         l.expires_at AS license_expires_at, l.last_validated_at,
         l.current_activations, l.max_activations,
         ps.sharpe_ratio, ps.win_rate, ps.max_drawdown_pct, ps.profit_factor
       FROM subscriptions s
       JOIN bot_listings bl ON bl.id = s.bot_listing_id
       JOIN bots b ON b.id = bl.bot_id
       JOIN seller_profiles sp ON sp.id = b.seller_id
       LEFT JOIN licenses l ON l.subscription_id = s.id AND l.status != 'revoked'
       LEFT JOIN performance_snapshots ps
         ON ps.bot_id = b.id AND ps.period_type = 'all_time'
         AND ps.snapshot_date = (
           SELECT MAX(snapshot_date) FROM performance_snapshots
           WHERE bot_id = b.id AND period_type = 'all_time'
         )
       WHERE s.user_id = $1
       ORDER BY
         CASE s.status WHEN 'active' THEN 0 WHEN 'trialing' THEN 1 WHEN 'past_due' THEN 2 ELSE 3 END,
         s.created_at DESC`,
      [userId],
    );
    return rows;
  }

  /** Cancel a subscription at period end (via Stripe) */
  async cancelSubscription(userId: string, subscriptionId: string) {
    const [sub] = await this.dataSource.query(
      `SELECT id, user_id, stripe_subscription_id, status FROM subscriptions WHERE id = $1`,
      [subscriptionId],
    );
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.user_id !== userId) throw new ForbiddenException('Not your subscription');
    if (sub.status === 'canceled') throw new ForbiddenException('Already canceled');

    if (sub.stripe_subscription_id) {
      await this.stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    }

    await this.dataSource.query(
      `UPDATE subscriptions SET canceled_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [subscriptionId],
    );

    this.logger.log({ msg: 'Subscription canceled at period end', subscriptionId, userId });
    return { message: 'Subscription will cancel at the end of the current billing period.' };
  }

  /** Reactivate a subscription that was set to cancel_at_period_end */
  async reactivateSubscription(userId: string, subscriptionId: string) {
    const [sub] = await this.dataSource.query(
      `SELECT id, user_id, stripe_subscription_id, status, canceled_at FROM subscriptions WHERE id = $1`,
      [subscriptionId],
    );
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.user_id !== userId) throw new ForbiddenException('Not your subscription');
    if (sub.status === 'canceled' && !sub.stripe_subscription_id) {
      throw new ForbiddenException('Subscription has fully expired and cannot be reactivated. Please subscribe again.');
    }

    if (sub.stripe_subscription_id) {
      await this.stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: false,
      });
    }

    await this.dataSource.query(
      `UPDATE subscriptions SET canceled_at = NULL, updated_at = NOW() WHERE id = $1`,
      [subscriptionId],
    );

    this.logger.log({ msg: 'Subscription reactivated', subscriptionId, userId });
    return { message: 'Subscription reactivated successfully.' };
  }

  /** Get Stripe portal URL for billing management */
  async getBillingPortalUrl(userId: string): Promise<string> {
    const [row] = await this.dataSource.query(
      `SELECT stripe_customer_id FROM buyer_profiles WHERE user_id = $1`,
      [userId],
    );
    if (!row?.stripe_customer_id) {
      throw new NotFoundException('No billing account found. Make a purchase first.');
    }

    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    const session = await this.stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${frontendUrl}/dashboard/buyer`,
    });
    return session.url;
  }
}
