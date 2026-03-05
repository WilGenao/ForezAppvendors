'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity, TrendingUp, DollarSign, Users, Plus, ShieldCheck,
  AlertTriangle, ExternalLink, RefreshCw, Loader2, CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';

type DashboardData = {
  seller: { displayName: string; isVerified: boolean; stripeConnected: boolean; stripeOnboardingUrl: string | null };
  revenue: { totalCents: number; last30dCents: number; last7dCents: number; totalPayments: number; formatted: { total: string; last30d: string; last7d: string } };
  stripeBalance: { available: { currency: string; formatted: string }[]; pending: { currency: string; formatted: string }[] } | null;
  bots: BotStat[];
};

type BotStat = {
  id: string; name: string; slug: string; status: string; mt_platform: string;
  avg_rating: number; activeSubs: number; churnedSubs: number;
  revenue30dFormatted: string; is_verified: boolean;
  sharpe_ratio: number; win_rate: number; max_drawdown_pct: number;
};

type Sale = {
  subscription_id: string; bot_name: string; plan: string;
  amount_cents: number; seller_payout_cents: number;
  payment_status: string; sale_date: string; subscription_status: string; buyer_name: string;
};

const STATUS_COLOR: Record<string, string> = {
  active: 'text-green-400 bg-green-500/10',
  draft: 'text-gray-400 bg-gray-500/10',
  pending_review: 'text-yellow-400 bg-yellow-500/10',
  suspended: 'text-red-400 bg-red-500/10',
  archived: 'text-gray-500 bg-gray-500/10',
};

export default function SellerDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);
  const [error, setError] = useState('');
  const [stripeMsg, setStripeMsg] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/seller/dashboard');
      setData(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg?.includes('KYC') || msg?.includes('Seller profile')) {
        setError('kyc_required');
      } else {
        setError(msg ?? 'Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSales = useCallback(async () => {
    setSalesLoading(true);
    try {
      const res = await api.get('/seller/sales?limit=10');
      setSales(res.data.data);
    } catch { /* non-critical */ } finally {
      setSalesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchSales();
  }, [fetchDashboard, fetchSales]);

  // Show success message when returning from Stripe onboarding
  useEffect(() => {
    const stripe = searchParams.get('stripe');
    if (stripe === 'connected') setStripeMsg('Stripe account connected successfully!');
    if (stripe === 'refresh') setStripeMsg('Stripe onboarding was interrupted. Please try again.');
  }, [searchParams]);

  const handleStripeOnboarding = async () => {
    try {
      const res = await api.post('/seller/stripe/onboarding');
      window.location.href = res.data;
    } catch { setError('Failed to start Stripe onboarding'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center font-mono">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading seller dashboard...</span>
        </div>
      </div>
    );
  }

  if (error === 'kyc_required') {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4 font-mono">
        <div className="max-w-sm w-full bg-[#161b22] border border-[#30363d] rounded p-6 text-center">
          <ShieldCheck className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
          <p className="text-white font-bold mb-2">KYC Required</p>
          <p className="text-xs text-gray-400 mb-5">
            Complete identity verification to become a seller and list your bots.
          </p>
          <Link href="/dashboard/profile" className="block w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded transition-colors">
            Start KYC Verification
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white font-mono">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#30363d] h-10 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold tracking-wider">FOREXBOT</span>
          <span className="text-[10px] text-gray-500">SELLER DASHBOARD</span>
          {data?.seller.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />}
        </div>
        <button onClick={() => { fetchDashboard(); fetchSales(); }} className="text-gray-500 hover:text-white p-1">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Stripe notification */}
        {stripeMsg && (
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded text-xs border ${stripeMsg.includes('success') ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {stripeMsg}
          </div>
        )}

        {/* Stripe Connect banner */}
        {data && !data.seller.stripeConnected && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-yellow-400 font-bold text-sm">Connect Stripe to receive payments</p>
              <p className="text-xs text-gray-400 mt-1">
                You won't receive any payouts until your Stripe account is connected and verified.
              </p>
            </div>
            <button
              onClick={handleStripeOnboarding}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold rounded transition-colors shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Connect Stripe
            </button>
          </div>
        )}

        {/* Revenue stats */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'TOTAL EARNINGS', value: data.revenue.formatted.total, icon: DollarSign, color: 'text-green-400' },
              { label: 'LAST 30 DAYS', value: data.revenue.formatted.last30d, icon: TrendingUp, color: 'text-blue-400' },
              { label: 'LAST 7 DAYS', value: data.revenue.formatted.last7d, icon: TrendingUp, color: 'text-blue-400' },
              { label: 'TOTAL SALES', value: data.revenue.totalPayments.toString(), icon: Users, color: 'text-purple-400' },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#161b22] border border-[#30363d] rounded p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">{stat.label}</span>
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Stripe balance */}
        {data?.stripeBalance && (
          <div className="bg-[#161b22] border border-[#30363d] rounded p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Stripe Balance</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-gray-600 mb-1">Available for payout</p>
                {data.stripeBalance.available.map((b) => (
                  <p key={b.currency} className="text-lg font-bold text-green-400">{b.formatted} <span className="text-xs text-gray-500">{b.currency}</span></p>
                ))}
              </div>
              <div>
                <p className="text-[10px] text-gray-600 mb-1">Pending</p>
                {data.stripeBalance.pending.map((b) => (
                  <p key={b.currency} className="text-lg font-bold text-yellow-400">{b.formatted} <span className="text-xs text-gray-500">{b.currency}</span></p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* My bots */}
        <div className="bg-[#161b22] border border-[#30363d] rounded overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">My Bots</span>
            <Link href="/seller/upload" className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold transition-colors">
              <Plus className="w-3 h-3" /> New Bot
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#30363d]">
                  {['Name','Platform','Status','Active Subs','30d Revenue','Sharpe','Win Rate','DD'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.bots.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-600">No bots yet. Create your first one.</td></tr>
                )}
                {data?.bots.map((bot) => (
                  <tr key={bot.id} className="border-b border-[#30363d] hover:bg-[#21262d] transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{bot.name}</span>
                        {bot.is_verified && <ShieldCheck className="w-3 h-3 text-blue-400" />}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold">{bot.mt_platform}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_COLOR[bot.status] ?? 'text-gray-400'}`}>
                        {bot.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-white">{bot.activeSubs}</td>
                    <td className="px-3 py-3 text-green-400 font-bold">{bot.revenue30dFormatted}</td>
                    <td className="px-3 py-3 text-white">{bot.sharpe_ratio?.toFixed(2) ?? '—'}</td>
                    <td className="px-3 py-3 text-green-400">{bot.win_rate != null ? `${(bot.win_rate * 100).toFixed(1)}%` : '—'}</td>
                    <td className="px-3 py-3 text-red-400">{bot.max_drawdown_pct != null ? `${bot.max_drawdown_pct.toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent sales */}
        <div className="bg-[#161b22] border border-[#30363d] rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-[#30363d]">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Recent Sales</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#30363d]">
                  {['Bot','Plan','Buyer','Your Payout','Date','Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesLoading && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-gray-500" />
                  </td></tr>
                )}
                {!salesLoading && sales.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-600">No sales yet.</td></tr>
                )}
                {!salesLoading && sales.map((s) => (
                  <tr key={s.subscription_id} className="border-b border-[#30363d] hover:bg-[#21262d] transition-colors">
                    <td className="px-3 py-3 text-white font-medium">{s.bot_name}</td>
                    <td className="px-3 py-3 text-gray-400">{s.plan.replace('subscription_', '')}</td>
                    <td className="px-3 py-3 text-gray-400">{s.buyer_name}</td>
                    <td className="px-3 py-3 text-green-400 font-bold">${(s.seller_payout_cents / 100).toFixed(2)}</td>
                    <td className="px-3 py-3 text-gray-500">{new Date(s.sale_date).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.subscription_status === 'active' ? 'text-green-400 bg-green-500/10' : 'text-gray-400 bg-gray-500/10'}`}>
                        {s.subscription_status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

