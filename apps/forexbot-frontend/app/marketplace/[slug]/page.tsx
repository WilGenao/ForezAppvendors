'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity, ShieldCheck, Star, TrendingUp, AlertTriangle,
  ChevronLeft, ExternalLink, Zap, BarChart2, Shield,
  Clock, Users, Award, ArrowRight, Loader2,
} from 'lucide-react';
import { marketplaceApi } from '@/lib/api';

type Listing = {
  type: string;
  price_cents: number;
  listing_id: string;
  trial_days: number;
};

type Anomaly = {
  type: string;
  severity: string;
  description: string;
};

type Bot = {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  status: string;
  mt_platform: string;
  currency_pairs: string[];
  timeframes: string[];
  risk_level: number;
  avg_rating: number;
  total_subscribers: number;
  is_verified: boolean;
  seller_name: string;
  seller_rating: number;
  is_verified_seller: boolean;
  sharpe_ratio: number | null;
  win_rate: number | null;
  max_drawdown_pct: number | null;
  profit_factor: number | null;
  total_trades: number | null;
  expectancy_usd: number | null;
  calmar_ratio: number | null;
  sortino_ratio: number | null;
  listings: Listing[];
  anomalies: Anomaly[];
};

const PLAN_LABELS: Record<string, string> = {
  subscription_monthly: 'Monthly',
  subscription_yearly: 'Yearly',
  one_time: 'Lifetime',
};

const RISK_LABEL = (r: number) =>
  r <= 3 ? { label: 'Low', color: 'text-green-400' }
  : r <= 6 ? { label: 'Medium', color: 'text-yellow-400' }
  : { label: 'High', color: 'text-red-400' };

const SEVERITY_COLOR: Record<string, string> = {
  low: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  medium: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  high: 'text-red-400 bg-red-500/10 border-red-500/30',
};

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
      .then(res => {
        setBot(res.data);
        if (res.data.listings?.length > 0) setSelectedListing(res.data.listings[0]);
      })
      .catch(() => setError('Bot not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubscribe = () => {
    if (!selectedListing) return;
    router.push(`/checkout?bot=${selectedListing.listing_id}`);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center font-mono">
      <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
    </div>
  );

  if (error || !bot) return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center font-mono text-white">
      <div className="text-center space-y-3">
        <div className="text-4xl">404</div>
        <div className="text-gray-400">Bot not found</div>
        <Link href="/marketplace" className="text-blue-400 hover:underline text-sm">← Back to marketplace</Link>
      </div>
    </div>
  );

  const risk = RISK_LABEL(bot.risk_level);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white font-mono">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#30363d] h-10 flex items-center px-4 justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold tracking-wider">FOREXBOT</span>
        </div>
        <Link href="/marketplace" className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Marketplace
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Hero */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold">{bot.mt_platform}</span>
                {bot.is_verified && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded text-[10px] font-bold">
                    <ShieldCheck className="w-3 h-3" /> VERIFIED
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${risk.color} bg-current/10`}>
                  RISK: {risk.label}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white">{bot.name}</h1>
              <p className="text-gray-400 text-sm">{bot.short_description}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-400" />
                  {bot.avg_rating?.toFixed(1) ?? '—'}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {bot.total_subscribers} subscribers
                </span>
                <span>by <span className="text-white font-medium">{bot.seller_name}</span>
                  {bot.is_verified_seller && <ShieldCheck className="w-3 h-3 text-blue-400 inline ml-1" />}
                </span>
              </div>
            </div>

            {/* Pricing card */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4 w-56 shrink-0 space-y-3">
              {bot.listings.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No plans available</p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    {bot.listings.map(l => (
                      <button key={l.listing_id} onClick={() => setSelectedListing(l)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded border text-xs transition-colors ${
                          selectedListing?.listing_id === l.listing_id
                            ? 'border-blue-500 bg-blue-500/10 text-white'
                            : 'border-[#30363d] text-gray-400 hover:border-[#484f58]'
                        }`}>
                        <span>{PLAN_LABELS[l.type] ?? l.type}</span>
                        <span className="font-bold">${(l.price_cents / 100).toFixed(0)}{l.type.includes('monthly') ? '/mo' : l.type.includes('yearly') ? '/yr' : ''}</span>
                      </button>
                    ))}
                  </div>
                  {selectedListing?.trial_days > 0 && (
                    <p className="text-[10px] text-green-400 text-center">{selectedListing.trial_days}-day free trial</p>
                  )}
                  <button onClick={handleSubscribe}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold transition-colors">
                    Get Started <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Anomalies */}
        {bot.anomalies.length > 0 && (
          <div className="space-y-2">
            {bot.anomalies.map((a, i) => (
              <div key={i} className={`flex items-start gap-2 px-3 py-2 rounded border text-xs ${SEVERITY_COLOR[a.severity] ?? 'text-gray-400 border-gray-500/30'}`}>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{a.description}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Stats + Info */}
          <div className="lg:col-span-2 space-y-4">

            {/* Performance stats */}
            {bot.sharpe_ratio != null && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-[#30363d]">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">Performance</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-[#30363d]">
                  {[
                    { label: 'Sharpe Ratio', value: bot.sharpe_ratio?.toFixed(2) ?? '—', icon: TrendingUp, color: 'text-blue-400' },
                    { label: 'Win Rate', value: bot.win_rate != null ? `${(bot.win_rate * 100).toFixed(1)}%` : '—', icon: Award, color: 'text-green-400' },
                    { label: 'Max Drawdown', value: bot.max_drawdown_pct != null ? `${bot.max_drawdown_pct.toFixed(1)}%` : '—', icon: BarChart2, color: 'text-red-400' },
                    { label: 'Profit Factor', value: bot.profit_factor?.toFixed(2) ?? '—', icon: Zap, color: 'text-purple-400' },
                  ].map(stat => (
                    <div key={stat.label} className="p-4 text-center">
                      <stat.icon className={`w-4 h-4 ${stat.color} mx-auto mb-1`} />
                      <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>
                {(bot.total_trades != null || bot.expectancy_usd != null) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-0 divide-x divide-[#30363d] border-t border-[#30363d]">
                    {[
                      { label: 'Total Trades', value: bot.total_trades?.toLocaleString() ?? '—' },
                      { label: 'Expectancy', value: bot.expectancy_usd != null ? `$${bot.expectancy_usd.toFixed(2)}` : '—' },
                      { label: 'Calmar Ratio', value: bot.calmar_ratio?.toFixed(2) ?? '—' },
                      { label: 'Sortino Ratio', value: bot.sortino_ratio?.toFixed(2) ?? '—' },
                    ].map(stat => (
                      <div key={stat.label} className="p-3 text-center">
                        <div className="text-sm font-bold text-white">{stat.value}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {bot.description && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-widest">Description</div>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{bot.description}</p>
              </div>
            )}

            {/* Currency pairs & timeframes */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-4">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">Trading Specs</div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1.5">Currency Pairs</div>
                  <div className="flex flex-wrap gap-1.5">
                    {bot.currency_pairs?.map(p => (
                      <span key={p} className="px-2 py-0.5 bg-[#0d1117] border border-[#30363d] rounded text-xs text-white">{p}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1.5">Timeframes</div>
                  <div className="flex flex-wrap gap-1.5">
                    {bot.timeframes?.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-[#0d1117] border border-[#30363d] rounded text-xs text-white">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Details */}
          <div className="space-y-4">
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">Details</div>
              {[
                { label: 'Platform', value: bot.mt_platform },
                { label: 'Risk Level', value: `${bot.risk_level}/10` },
                { label: 'Subscribers', value: bot.total_subscribers?.toString() },
                { label: 'Rating', value: bot.avg_rating ? `${bot.avg_rating.toFixed(1)} / 5.0` : 'No ratings yet' },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="text-white font-medium">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">Seller</div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{bot.seller_name}</span>
                  {bot.is_verified_seller && <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                {bot.seller_rating && (
                  <div className="flex items-center gap-1 text-gray-400">
                    <Star className="w-3 h-3 text-yellow-400" />
                    {bot.seller_rating.toFixed(1)} seller rating
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-2 text-xs text-gray-400">
              <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-green-400" /> Secure payment via Stripe</div>
              <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-400" /> Cancel anytime</div>
              <div className="flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5 text-purple-400" /> Instant license delivery</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
