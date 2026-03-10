// apps/api/src/seller/seller.service.ts
// EXTENDED — adds full dashboard with monthlySales[] and refunds
import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
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

  // ─── Dashboard ────────────────────────────────────────────────────────────

  async getDashboard(userId: string) {
    const sellerProfile = await this.getSellerProfile(userId);

    const [revenueStats, bots, monthlySales, refunds, stripeBalance] = await Promise.all([
      this.getRevenueStats(sellerProfile.id),
      this.getBotStats(sellerProfile.id),
      this.getMonthlySales(sellerProfile.id),
      this.getRefunds(sellerProfile.id),
      this.getStripeBalance(sellerProfile.stripe_account_id),
    ]);

    return {
      revenue: {
        totalCents: parseInt(revenueStats.total_payout_cents, 10),
        last30dCents: parseInt(revenueStats.payout_30d_cents, 10),
        last7dCents: parseInt(revenueStats.payout_7d_cents, 10),
        totalPayments: parseInt(revenueStats.total_payments, 10),
        // Formatted for display
        total: (parseInt(revenueStats.total_payout_cents, 10) / 100).toFixed(2),
        last30d: (parseInt(revenueStats.payout_30d_cents, 10) / 100).toFixed(2),
      },
      activeSubscribers: bots.reduce((sum, b) => sum + parseInt(b.active_subs ?? '0', 10), 0),
      bots,
      monthlySales,
      refunds,
      stripe: stripeBalance,
    };
  }

  async getRecentSales(userId: string, page = 1, limit = 20) {
    const sellerProfile = await this.getSellerProfile(userId);
    const offset = (page - 1) * limit;

    const sales = await this.dataSource.query(
      `SELECT
         p.id,
         p.amount_cents,
         p.seller_payout_cents,
         p.platform_fee_cents,
         p.status,
         p.created_at,
         b.name AS bot_name,
         b.slug AS bot_slug,
         bl.listing_type AS plan,
         COALESCE(bp.display_name, 'Anonymous') AS buyer_name
       FROM payments p
       JOIN subscriptions s ON s.id = p.subscription_id
       JOIN bot_listings bl ON bl.id = s.bot_listing_id
       JOIN bots b ON b.id = bl.bot_id
       LEFT JOIN buyer_profiles bp ON bp.user_id = s.user_id
       WHERE b.seller_id = $1 AND p.status = 'succeeded'
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [sellerProfile.id, limit, offset],
    );

    return sales;
  }

  async getStripeOnboardingUrl(userId: string): Promise<{ url: string }> {
    const sellerProfile = await this.getSellerProfile(userId);

    let accountId = sellerProfile.stripe_account_id;

    if (!accountId) {
      const account = await this.stripe.accounts.create({
        type: 'express',
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      });
      accountId = account.id;
      await this.dataSource.query(
        `UPDATE seller_profiles SET stripe_account_id = $1 WHERE id = $2`,
        [accountId, sellerProfile.id],
      );
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${frontendUrl}/auth/onboarding/stripe?retry=1`,
      return_url: `${frontendUrl}/auth/onboarding/stripe?success=1`,
      type: 'account_onboarding',
    });

    return { url: link.url };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  async getSellerProfile(userId: string) {
    const [profile] = await this.dataSource.query(
      `SELECT id, user_id, stripe_account_id, stripe_onboarding_done, display_name
       FROM seller_profiles WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    if (!profile) throw new ForbiddenException('Seller profile not found');
    return profile;
  }

  private async getRevenueStats(sellerId: string) {
    const [stats] = await this.dataSource.query(
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
      [sellerId],
    );
    return stats;
  }

  private async getBotStats(sellerId: string) {
    return this.dataSource.query(
      `SELECT
         b.id, b.name, b.slug, b.status, b.mt_platform,
         b.avg_rating, b.total_subscribers, b.is_verified,
         COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active')   AS active_subs,
         COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'canceled') AS churned_subs,
         COALESCE(SUM(p.seller_payout_cents) FILTER (
           WHERE p.status = 'succeeded' AND p.created_at > NOW() - INTERVAL '30 days'
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
      [sellerId],
    );
  }

  /**
   * Monthly sales breakdown for the last 12 months.
   * Returns array of { month, year, sales, revenueCents }
   */
  private async getMonthlySales(sellerId: string) {
    const rows = await this.dataSource.query(
      `SELECT
         DATE_TRUNC('month', p.created_at) AS month,
         COUNT(p.id)                        AS sales,
         COALESCE(SUM(p.seller_payout_cents), 0) AS revenue_cents
       FROM payments p
       JOIN subscriptions s ON s.id = p.subscription_id
       JOIN bot_listings bl ON bl.id = s.bot_listing_id
       JOIN bots b ON b.id = bl.bot_id
       WHERE b.seller_id = $1
         AND p.status = 'succeeded'
         AND p.created_at > NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', p.created_at)
       ORDER BY month ASC`,
      [sellerId],
    );

    return rows.map((r) => ({
      month: new Date(r.month).toISOString().slice(0, 7), // "2025-01"
      sales: parseInt(r.sales, 10),
      revenueCents: parseInt(r.revenue_cents, 10),
      revenue: (parseInt(r.revenue_cents, 10) / 100).toFixed(2),
    }));
  }

  /**
   * Refund summary for the seller.
   */
  private async getRefunds(sellerId: string) {
    const [stats] = await this.dataSource.query(
      `SELECT
         COUNT(p.id)                         AS total_refunds,
         COALESCE(SUM(p.amount_cents), 0)    AS total_refunded_cents
       FROM payments p
       JOIN subscriptions s ON s.id = p.subscription_id
       JOIN bot_listings bl ON bl.id = s.bot_listing_id
       JOIN bots b ON b.id = bl.bot_id
       WHERE b.seller_id = $1 AND p.status = 'refunded'`,
      [sellerId],
    );

    return {
      count: parseInt(stats.total_refunds, 10),
      totalCents: parseInt(stats.total_refunded_cents, 10),
      total: (parseInt(stats.total_refunded_cents, 10) / 100).toFixed(2),
    };
  }

  private async getStripeBalance(stripeAccountId: string | null) {
    if (!stripeAccountId) return null;
    try {
      const balance = await this.stripe.balance.retrieve({ stripeAccount: stripeAccountId });
      return {
        available: balance.available.map((b) => ({
          amount: b.amount,
          currency: b.currency,
          display: `${(b.amount / 100).toFixed(2)} ${b.currency.toUpperCase()}`,
        })),
        pending: balance.pending.map((b) => ({
          amount: b.amount,
          currency: b.currency,
          display: `${(b.amount / 100).toFixed(2)} ${b.currency.toUpperCase()}`,
        })),
      };
    } catch {
      return null; // Stripe account not yet onboarded
    }
  }
}
