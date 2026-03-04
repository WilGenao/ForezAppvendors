// apps/api/src/seller/seller.service.ts
import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class SellerService {
  private readonly logger = new Logger(SellerService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(config.getOrThrow<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-04-10',
    });
  }

  /** Dashboard overview: revenue, subscribers, payout balance */
  async getDashboard(userId: string) {
    const sellerProfile = await this.getSellerProfile(userId);

    // Revenue from DB (platform's source of truth for historical data)
    const [revenueStats] = await this.dataSource.query(
      `SELECT
         COALESCE(SUM(p.amount_cents), 0)           AS total_revenue_cents,
         COALESCE(SUM(p.seller_payout_cents), 0)    AS total_payout_cents,
         COALESCE(SUM(CASE WHEN p.created_at > NOW() - INTERVAL '30 days'
                      THEN p.seller_payout_cents ELSE 0 END), 0) AS payout_30d_cents,
         COALESCE(SUM(CASE WHEN p.created_at > NOW() - INTERVAL '7 days'
                      THEN p.seller_payout_cents ELSE 0 END), 0)  AS payout_7d_cents,
         COUNT(DISTINCT p.id)                        AS total_payments
       FROM payments p
       JOIN subscriptions s ON s.id = p.subscription_id
       JOIN bot_listings bl ON bl.id = s.bot_listing_id
       JOIN bots b ON b.id = bl.bot_id
       WHERE b.seller_id = $1 AND p.status = 'succeeded'`,
      [sellerProfile.id],
    );

    // Active subscribers per bot
    const bots = await this.dataSource.query(
      `SELECT
         b.id, b.name, b.slug, b.status, b.mt_platform,
         b.avg_rating, b.total_subscribers, b.is_verified,
         COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active')   AS active_subs,
         COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'canceled') AS churned_subs,
         COALESCE(SUM(p.seller_payout_cents) FILTER (
           WHERE p.status = 'succeeded'
           AND p.created_at > NOW() - INTERVAL '30 days'
         ), 0) AS revenue_30d_cents,
         ps.sharpe_ratio, ps.win_rate, ps.max_drawdown_pct, ps.profit_factor
       FROM bots b
       LEFT JOIN bot_listings bl ON bl.bot_id = b.id AND bl.deleted_at IS NULL
       LEFT JOIN subscriptions s ON s.bot_listing_id = bl.id
       LEFT JOIN payments p ON p.subscription_id = s.id
       LEFT JOIN performance_snapshots ps ON ps.bot_id = b.id
         AND ps.period_type = 'all_time'
         AND ps.snapshot_date = (
           SELECT MAX(snapshot_date) FROM performance_snapshots
           WHERE bot_id = b.id AND period_type = 'all_time'
         )
       WHERE b.seller_id = $1 AND b.deleted_at IS NULL
       GROUP BY b.id, ps.sharpe_ratio, ps.win_rate, ps.max_drawdown_pct, ps.profit_factor
       ORDER BY active_subs DESC`,
      [sellerProfile.id],
    );

    // Stripe Connect balance (live payout balance)
    let stripeBalance = null;
    if (sellerProfile.stripe_account_id && sellerProfile.stripe_onboarding_done) {
      try {
        const balance = await this.stripe.balance.retrieve({
          stripeAccount: sellerProfile.stripe_account_id,
        });
        stripeBalance = {
          available: balance.available.map((b) => ({
            currency: b.currency.toUpperCase(),
            amountCents: b.amount,
            formatted: `$${(b.amount / 100).toFixed(2)}`,
          })),
          pending: balance.pending.map((b) => ({
            currency: b.currency.toUpperCase(),
            amountCents: b.amount,
            formatted: `$${(b.amount / 100).toFixed(2)}`,
          })),
        };
      } catch (err) {
        this.logger.warn({ msg: 'Could not fetch Stripe balance', userId, error: err.message });
      }
    }

    return {
      seller: {
        displayName: sellerProfile.display_name,
        isVerified: sellerProfile.is_verified_seller,
        stripeConnected: !!sellerProfile.stripe_onboarding_done,
        stripeOnboardingUrl: !sellerProfile.stripe_onboarding_done
          ? await this.getStripeOnboardingUrl(userId, sellerProfile)
          : null,
      },
      revenue: {
        totalCents: parseInt(revenueStats.total_payout_cents),
        last30dCents: parseInt(revenueStats.payout_30d_cents),
        last7dCents: parseInt(revenueStats.payout_7d_cents),
        totalPayments: parseInt(revenueStats.total_payments),
        formatted: {
          total: `$${(parseInt(revenueStats.total_payout_cents) / 100).toFixed(2)}`,
          last30d: `$${(parseInt(revenueStats.payout_30d_cents) / 100).toFixed(2)}`,
          last7d: `$${(parseInt(revenueStats.payout_7d_cents) / 100).toFixed(2)}`,
        },
      },
      stripeBalance,
      bots: bots.map((b: Record<string, unknown>) => ({
        ...b,
        activeSubs: parseInt(b.active_subs as string),
        churnedSubs: parseInt(b.churned_subs as string),
        revenue30dCents: parseInt(b.revenue_30d_cents as string),
        revenue30dFormatted: `$${(parseInt(b.revenue_30d_cents as string) / 100).toFixed(2)}`,
      })),
    };
  }

  /** Recent sales for a seller */
  async getRecentSales(userId: string, page = 1, limit = 20) {
    const sellerProfile = await this.getSellerProfile(userId);
    const offset = (page - 1) * limit;

    const [sales, countResult] = await Promise.all([
      this.dataSource.query(
        `SELECT
           s.id AS subscription_id,
           b.name AS bot_name,
           bl.listing_type AS plan,
           p.amount_cents,
           p.seller_payout_cents,
           p.status AS payment_status,
           p.created_at AS sale_date,
           s.status AS subscription_status,
           COALESCE(bp.display_name, 'Buyer') AS buyer_name
         FROM payments p
         JOIN subscriptions s ON s.id = p.subscription_id
         JOIN bot_listings bl ON bl.id = s.bot_listing_id
         JOIN bots b ON b.id = bl.bot_id
         JOIN users u ON u.id = s.user_id
         LEFT JOIN buyer_profiles bp ON bp.user_id = u.id
         WHERE b.seller_id = $1
         ORDER BY p.created_at DESC
         LIMIT $2 OFFSET $3`,
        [sellerProfile.id, limit, offset],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) FROM payments p
         JOIN subscriptions s ON s.id = p.subscription_id
         JOIN bot_listings bl ON bl.id = s.bot_listing_id
         JOIN bots b ON b.id = bl.bot_id
         WHERE b.seller_id = $1`,
        [sellerProfile.id],
      ),
    ]);

    return { data: sales, total: parseInt(countResult[0].count, 10), page, limit };
  }

  /** Stripe Connect onboarding — creates/returns account link */
  async getStripeOnboardingUrl(userId: string, profile?: Record<string, unknown>) {
    const sellerProfile = profile ?? (await this.getSellerProfile(userId));
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');

    let accountId = sellerProfile.stripe_account_id as string | undefined;
    if (!accountId) {
      const account = await this.stripe.accounts.create({ type: 'express' });
      accountId = account.id;
      await this.dataSource.query(
        `UPDATE seller_profiles SET stripe_account_id = $1 WHERE user_id = $2`,
        [accountId, userId],
      );
    }

    const accountLink = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${frontendUrl}/dashboard/seller?stripe=refresh`,
      return_url: `${frontendUrl}/dashboard/seller?stripe=connected`,
      type: 'account_onboarding',
    });

    return accountLink.url;
  }

  private async getSellerProfile(userId: string) {
    const [profile] = await this.dataSource.query(
      `SELECT id, display_name, is_verified_seller, stripe_account_id, stripe_onboarding_done
       FROM seller_profiles WHERE user_id = $1`,
      [userId],
    );
    if (!profile) throw new ForbiddenException('Seller profile not found. Complete KYC first.');
    return profile;
  }
}
