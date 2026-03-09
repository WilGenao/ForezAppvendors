'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Star, TrendingUp, AlertTriangle, ChevronLeft, ExternalLink, Zap, BarChart2, Shield, Clock, Users, Award, ArrowRight, Loader2 } from 'lucide-react';
import { marketplaceApi } from '@/lib/api';

type Listing = { type: string; price_cents: number; listing_id: string; trial_days: number; };
type Anomaly = { type: string; severity: string; description: string; };
type Bot = {
  id: string; name: string; slug: string; short_description: string; description: string;
  status: string; mt_platform: string; currency_pairs: string[]; timeframes: string[];
  risk_level: number; avg_rating: number; total_subscribers: number; is_verified: boolean;
  seller_name: string; seller_rating: number; is_verified_seller: boolean;
  sharpe_ratio: number | null; win_rate: number | null; max_drawdown_pct: number | null;
  profit_factor: number | null; total_trades: number | null; expectancy_usd: number | null;
  calmar_ratio: number | null; sortino_ratio: number | null;
  listings: Listing[]; anomalies: Anomaly[];
};

const PLAN_LABELS: Record<string, string> = { subscription_monthly: 'Monthly', subscription_yearly: 'Yearly', one_time: 'Lifetime' };
const RISK_LABEL = (r: number) => r <= 3 ? { label: 'Low Risk', color: '#059669', bg: '#ECFDF5' } : r <= 6 ? { label: 'Medium Risk', color: '#D97706', bg: '#FFFBEB' } : { label: 'High Risk', color: '#DC2626', bg: '#FEF2F2' };
const SEV_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  low:    { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  medium: { color: '#D97706', bg: '#FFF7ED', border: '#FED7AA' },
  high:   { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
};

const card = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

export default function BotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [bot, setBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  useEffect(() => {
    if (!slug) return;
    marketplaceApi.getBot(slug)
      .then(res => { setBot(res.data); if (res.data.listings?.length > 0) setSelectedListing(res.data.listings[0]); })
      .catch(() => setError('Bot not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'DM Sans, sans-serif' }}>
      <Loader2 style={{ width: 24, height: 24, color: '#2563EB', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !bot) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 48, color: '#E2E8F0', marginBottom: 12 }}>404</div>
        <p style={{ color: '#64748B', marginBottom: 16 }}>Algorithm not found</p>
        <Link href="/marketplace" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>← Back to Marketplace</Link>
      </div>
    </div>
  );

  const risk = RISK_LABEL(bot.risk_level);

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', background: '#F8FAFC', minHeight: '100vh' }}>
      {/* Nav bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 32px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/marketplace" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', textDecoration: 'none', fontWeight: 500 }}>
          <ChevronLeft style={{ width: 15, height: 15 }} /> Marketplace
        </Link>
        <span style={{ fontSize: 13, color: '#94A3B8' }}>Algorithm Detail</span>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 32px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Hero */}
          <div style={{ ...card, padding: 28 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '3px 10px' }}>{bot.mt_platform}</span>
              {bot.is_verified && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 6, padding: '3px 10px' }}>
                  <ShieldCheck style={{ width: 11, height: 11 }} /> Verified
                </span>
              )}
              <span style={{ fontSize: 11, fontWeight: 600, color: risk.color, background: risk.bg, borderRadius: 6, padding: '3px 10px' }}>{risk.label}</span>
            </div>
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 30, color: '#0A1628', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 8 }}>{bot.name}</h1>
            <p style={{ fontSize: 15, color: '#475569', marginBottom: 16, lineHeight: 1.6 }}>{bot.short_description}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 13, color: '#64748B' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Star style={{ width: 14, height: 14, color: '#F59E0B', fill: '#F59E0B' }} />
                {bot.avg_rating?.toFixed(1) ?? '—'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Users style={{ width: 14, height: 14 }} /> {bot.total_subscribers} subscribers
              </span>
              <span>by <span style={{ fontWeight: 600, color: '#0A1628' }}>{bot.seller_name}</span>
                {bot.is_verified_seller && <ShieldCheck style={{ width: 12, height: 12, color: '#2563EB', marginLeft: 4 }} />}
              </span>
            </div>
          </div>

          {/* Anomalies */}
          {bot.anomalies.length > 0 && bot.anomalies.map((a, i) => {
            const s = SEV_STYLE[a.severity] || SEV_STYLE.low;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: s.color }}>
                <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0 }} /> {a.description}
              </div>
            );
          })}

          {/* Performance */}
          {bot.sharpe_ratio != null && (
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0A1628' }}>Performance Metrics</span>
                <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 8 }}>Independently verified · Forward-test data</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #E2E8F0' }}>
                {[
                  { label: 'Sharpe Ratio', value: bot.sharpe_ratio?.toFixed(2) ?? '—', icon: TrendingUp, color: '#2563EB', bg: '#EFF6FF' },
                  { label: 'Win Rate', value: bot.win_rate != null ? `${(bot.win_rate * 100).toFixed(1)}%` : '—', icon: Award, color: '#059669', bg: '#ECFDF5' },
                  { label: 'Max Drawdown', value: bot.max_drawdown_pct != null ? `${bot.max_drawdown_pct.toFixed(1)}%` : '—', icon: BarChart2, color: '#DC2626', bg: '#FEF2F2' },
                  { label: 'Profit Factor', value: bot.profit_factor?.toFixed(2) ?? '—', icon: Zap, color: '#7C3AED', bg: '#F5F3FF' },
                ].map((stat, i) => (
                  <div key={stat.label} style={{ padding: '20px 16px', textAlign: 'center', borderRight: i < 3 ? '1px solid #E2E8F0' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                      <stat.icon style={{ width: 18, height: 18, color: stat.color }} />
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: stat.color, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>{stat.value}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
              {(bot.total_trades != null || bot.expectancy_usd != null) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', padding: '12px 0' }}>
                  {[
                    { label: 'Total Trades', value: bot.total_trades?.toLocaleString() ?? '—' },
                    { label: 'Expectancy', value: bot.expectancy_usd != null ? `$${bot.expectancy_usd.toFixed(2)}` : '—' },
                    { label: 'Calmar Ratio', value: bot.calmar_ratio?.toFixed(2) ?? '—' },
                    { label: 'Sortino Ratio', value: bot.sortino_ratio?.toFixed(2) ?? '—' },
                  ].map((s, i) => (
                    <div key={s.label} style={{ padding: '8px 16px', textAlign: 'center', borderRight: i < 3 ? '1px solid #E2E8F0' : 'none' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#334155', fontFamily: 'JetBrains Mono, monospace', marginBottom: 2 }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {bot.description && (
            <div style={{ ...card, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', marginBottom: 12 }}>Description</div>
              <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{bot.description}</p>
            </div>
          )}

          {/* Specs */}
          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', marginBottom: 14 }}>Trading Specifications</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, marginBottom: 6 }}>Currency Pairs</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {bot.currency_pairs?.map(p => <span key={p} style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#334155', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '3px 10px' }}>{p}</span>)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, marginBottom: 6 }}>Timeframes</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {bot.timeframes?.map(t => <span key={t} style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#334155', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '3px 10px' }}>{t}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Pricing card */}
          <div style={{ ...card, overflow: 'hidden', position: 'sticky', top: 20 }}>
            <div style={{ background: '#0A1628', padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Subscribe Now</div>
              {selectedListing && (
                <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#fff' }}>
                  ${(selectedListing.price_cents / 100).toFixed(0)}<span style={{ fontSize: 14, color: '#64748B', fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}>{selectedListing.type.includes('monthly') ? '/mo' : selectedListing.type.includes('yearly') ? '/yr' : ''}</span>
                </div>
              )}
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {bot.listings.length === 0 ? (
                <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '16px 0' }}>No plans available</p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {bot.listings.map(l => (
                      <button key={l.listing_id} onClick={() => setSelectedListing(l)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${selectedListing?.listing_id === l.listing_id ? '#2563EB' : '#E2E8F0'}`, background: selectedListing?.listing_id === l.listing_id ? '#EFF6FF' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: selectedListing?.listing_id === l.listing_id ? '#2563EB' : '#334155' }}>
                        <span>{PLAN_LABELS[l.type] ?? l.type}</span>
                        <span style={{ fontWeight: 700 }}>${(l.price_cents / 100).toFixed(0)}{l.type.includes('monthly') ? '/mo' : l.type.includes('yearly') ? '/yr' : ''}</span>
                      </button>
                    ))}
                  </div>
                  {(selectedListing?.trial_days ?? 0) > 0 && (
                    <div style={{ textAlign: 'center', fontSize: 12, color: '#059669', fontWeight: 600, background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 6, padding: '6px' }}>
                      {selectedListing?.trial_days}-day free trial included
                    </div>
                  )}
                  <button onClick={() => selectedListing && router.push(`/checkout?bot=${selectedListing.listing_id}`)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
                    Get Started <ArrowRight style={{ width: 15, height: 15 }} />
                  </button>
                </>
              )}

              {/* Trust items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4, borderTop: '1px solid #F1F5F9' }}>
                {[
                  { icon: Shield, text: 'Secure payment via Stripe', color: '#059669' },
                  { icon: Clock, text: 'Cancel anytime', color: '#2563EB' },
                  { icon: ExternalLink, text: 'Instant license delivery', color: '#7C3AED' },
                ].map(item => (
                  <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748B' }}>
                    <item.icon style={{ width: 13, height: 13, color: item.color, flexShrink: 0 }} /> {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Details */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Details</div>
            {[
              { label: 'Platform', value: bot.mt_platform },
              { label: 'Risk Level', value: `${bot.risk_level} / 10` },
              { label: 'Subscribers', value: bot.total_subscribers?.toString() },
              { label: 'Rating', value: bot.avg_rating ? `${bot.avg_rating.toFixed(1)} / 5.0` : 'No ratings yet' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #F8FAFC' }}>
                <span style={{ color: '#94A3B8' }}>{item.label}</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Seller */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Provider</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#2563EB' }}>
                {bot.seller_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#0A1628' }}>
                  {bot.seller_name}
                  {bot.is_verified_seller && <ShieldCheck style={{ width: 14, height: 14, color: '#2563EB' }} />}
                </div>
                {bot.seller_rating > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748B' }}>
                    <Star style={{ width: 11, height: 11, color: '#F59E0B', fill: '#F59E0B' }} />
                    {bot.seller_rating.toFixed(1)} seller rating
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
