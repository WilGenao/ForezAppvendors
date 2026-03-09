'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  TrendingUp, DollarSign, Users, Plus, ShieldCheck,
  ExternalLink, RefreshCw, Loader2, CheckCircle, ArrowUpRight,
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
  avg_rating: number; activeSubs: number; revenue30dFormatted: string; is_verified: boolean;
  sharpe_ratio: number; win_rate: number; max_drawdown_pct: number;
};

type Sale = {
  subscription_id: string; bot_name: string; plan: string;
  amount_cents: number; seller_payout_cents: number;
  payment_status: string; sale_date: string; subscription_status: string; buyer_name: string;
};

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  active:         { color: '#059669', bg: '#ECFDF5' },
  draft:          { color: '#94A3B8', bg: '#F8FAFC' },
  pending_review: { color: '#D97706', bg: '#FFFBEB' },
  suspended:      { color: '#DC2626', bg: '#FEF2F2' },
};

const card = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

function SellerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);
  const [error, setError] = useState('');
  const [banner, setBanner] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true); setError('');
    try { const res = await api.get('/seller/dashboard'); setData(res.data); }
    catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg?.includes('KYC') || msg?.includes('Seller profile') ? 'kyc_required' : msg ?? 'Error');
    } finally { setLoading(false); }
  }, []);

  const fetchSales = useCallback(async () => {
    setSalesLoading(true);
    try { const res = await api.get('/seller/sales?limit=10'); setSales(res.data.data); }
    catch {} finally { setSalesLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); fetchSales(); }, [fetchDashboard, fetchSales]);
  useEffect(() => {
    const s = searchParams.get('stripe');
    if (s === 'connected') setBanner('✓ Stripe account connected successfully!');
    if (s === 'refresh') setBanner('Stripe onboarding was interrupted. Please try again.');
  }, [searchParams]);

  const handleStripeOnboarding = async () => {
    try { const res = await api.post('/seller/stripe/onboarding'); window.location.href = res.data; }
    catch { setError('Failed to start Stripe onboarding'); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 12, color: '#94A3B8', fontFamily: 'DM Sans, sans-serif' }}>
      <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
      Loading seller dashboard...
    </div>
  );

  if (error === 'kyc_required') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ ...card, padding: 32, textAlign: 'center', maxWidth: 360 }}>
        <ShieldCheck style={{ width: 36, height: 36, color: '#D97706', margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0A1628', marginBottom: 8 }}>KYC Verification Required</h3>
        <p style={{ fontSize: 14, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>Complete identity verification to become a seller and list your algorithms.</p>
        <Link href="/dashboard/profile" style={{ display: 'block', background: '#2563EB', color: '#fff', textDecoration: 'none', padding: '11px', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
          Start KYC Verification
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 28, fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26, color: '#0A1628', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            Seller Dashboard
            {data?.seller.isVerified && <ShieldCheck style={{ width: 20, height: 20, color: '#2563EB' }} />}
          </h1>
          <p style={{ fontSize: 14, color: '#64748B' }}>Manage your algorithms and track revenue</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { fetchDashboard(); fetchSales(); }} style={{ padding: 8, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer' }}>
            <RefreshCw style={{ width: 15, height: 15, color: '#64748B' }} />
          </button>
          <Link href="/seller/upload" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563EB', color: '#fff', textDecoration: 'none', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
            <Plus style={{ width: 14, height: 14 }} /> New Bot
          </Link>
        </div>
      </div>

      {/* Banners */}
      {banner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: banner.includes('✓') ? '#ECFDF5' : '#FFFBEB', border: `1px solid ${banner.includes('✓') ? '#A7F3D0' : '#FDE68A'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: banner.includes('✓') ? '#059669' : '#D97706' }}>
          <CheckCircle style={{ width: 15, height: 15 }} /> {banner}
        </div>
      )}

      {data && !data.seller.stripeConnected && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E', marginBottom: 3 }}>Connect Stripe to receive payments</div>
            <div style={{ fontSize: 13, color: '#92400E', opacity: 0.7 }}>Payouts are unavailable until your Stripe account is verified.</div>
          </div>
          <button onClick={handleStripeOnboarding} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#D97706', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <ExternalLink style={{ width: 14, height: 14 }} /> Connect Stripe
          </button>
        </div>
      )}

      {/* Revenue KPIs */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Earnings', value: data.revenue.formatted.total, icon: DollarSign, color: '#059669', bg: '#ECFDF5' },
            { label: 'Last 30 Days', value: data.revenue.formatted.last30d, icon: TrendingUp, color: '#2563EB', bg: '#EFF6FF' },
            { label: 'Last 7 Days', value: data.revenue.formatted.last7d, icon: ArrowUpRight, color: '#7C3AED', bg: '#F5F3FF' },
            { label: 'Total Sales', value: data.revenue.totalPayments.toString(), icon: Users, color: '#D97706', bg: '#FFFBEB' },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>{s.label}</span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon style={{ width: 16, height: 16, color: s.color }} />
                </div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0A1628', fontFamily: 'DM Serif Display, serif' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Stripe balance */}
      {data?.stripeBalance && (
        <div style={{ ...card, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Stripe Balance</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>Available for payout</div>
              {data.stripeBalance.available.map(b => (
                <div key={b.currency} style={{ fontSize: 22, fontWeight: 700, color: '#059669', fontFamily: 'DM Serif Display, serif' }}>{b.formatted} <span style={{ fontSize: 12, color: '#94A3B8' }}>{b.currency.toUpperCase()}</span></div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>Pending</div>
              {data.stripeBalance.pending.map(b => (
                <div key={b.currency} style={{ fontSize: 22, fontWeight: 700, color: '#D97706', fontFamily: 'DM Serif Display, serif' }}>{b.formatted} <span style={{ fontSize: 12, color: '#94A3B8' }}>{b.currency.toUpperCase()}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bots table */}
      <div style={{ ...card, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>My Algorithms</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
              {['Name', 'Platform', 'Status', 'Active Subs', '30d Revenue', 'Sharpe', 'Win Rate', 'Max DD'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data?.bots.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>No bots yet. <Link href="/seller/upload" style={{ color: '#2563EB', textDecoration: 'none' }}>Upload your first EA.</Link></td></tr>
            )}
            {data?.bots.map(bot => {
              const st = STATUS_STYLE[bot.status] || { color: '#94A3B8', bg: '#F8FAFC' };
              return (
                <tr key={bot.id} style={{ borderBottom: '1px solid #F1F5F9' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFC'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#0A1628' }}>
                      {bot.name}
                      {bot.is_verified && <ShieldCheck style={{ width: 13, height: 13, color: '#2563EB' }} />}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '2px 8px' }}>{bot.mt_platform}</span></td>
                  <td style={{ padding: '12px 16px' }}><span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, borderRadius: 100, padding: '3px 10px' }}>{bot.status.replace('_', ' ').toUpperCase()}</span></td>
                  <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 600 }}>{bot.activeSubs}</td>
                  <td style={{ padding: '12px 16px', color: '#059669', fontWeight: 700 }}>{bot.revenue30dFormatted}</td>
                  <td style={{ padding: '12px 16px', color: '#334155', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{bot.sharpe_ratio?.toFixed(2) ?? '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#059669', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{bot.win_rate != null ? `${(bot.win_rate * 100).toFixed(1)}%` : '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#DC2626', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>{bot.max_drawdown_pct != null ? `${bot.max_drawdown_pct.toFixed(1)}%` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recent sales */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>Recent Sales</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
              {['Bot', 'Plan', 'Buyer', 'Your Payout', 'Date', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {salesLoading && <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center' }}><Loader2 style={{ width: 16, height: 16, margin: '0 auto', animation: 'spin 1s linear infinite', color: '#94A3B8' }} /></td></tr>}
            {!salesLoading && sales.length === 0 && <tr><td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: '#94A3B8' }}>No sales yet.</td></tr>}
            {!salesLoading && sales.map(s => (
              <tr key={s.subscription_id} style={{ borderBottom: '1px solid #F1F5F9' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFC'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0A1628' }}>{s.bot_name}</td>
                <td style={{ padding: '12px 16px', color: '#64748B' }}>{s.plan.replace('subscription_', '')}</td>
                <td style={{ padding: '12px 16px', color: '#64748B' }}>{s.buyer_name}</td>
                <td style={{ padding: '12px 16px', color: '#059669', fontWeight: 700 }}>${(s.seller_payout_cents / 100).toFixed(2)}</td>
                <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: 12 }}>{new Date(s.sale_date).toLocaleDateString()}</td>
                <td style={{ padding: '12px 16px' }}><span style={{ fontSize: 11, fontWeight: 600, color: s.subscription_status === 'active' ? '#059669' : '#94A3B8', background: s.subscription_status === 'active' ? '#ECFDF5' : '#F8FAFC', borderRadius: 100, padding: '2px 8px' }}>{s.subscription_status.toUpperCase()}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function SellerDashboardPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', fontFamily: 'DM Sans, sans-serif', color: '#94A3B8' }}>Loading...</div>}>
      <SellerContent />
    </Suspense>
  );
}
