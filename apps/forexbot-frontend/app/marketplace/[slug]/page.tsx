'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity, ShieldCheck, Star, TrendingUp, TrendingDown,
  AlertTriangle, Users, BarChart2, Loader2, ChevronLeft,
  DollarSign, Clock,
} from 'lucide-react';
import { marketplaceApi, reviewsApi, api } from '@/lib/api';

type BotDetail = {
  id: string; name: string; slug: string; status: string;
  short_description: string; description: string; mt_platform: string;
  currency_pairs: string[]; timeframes: string[]; risk_level: number;
  is_verified: boolean; avg_rating: number; total_subscribers: number; total_reviews: number;
  seller_name: string; is_verified_seller: boolean; seller_rating: number;
  sharpe_ratio: number; win_rate: number; max_drawdown_pct: number;
  profit_factor: number; total_trades: number; expectancy_usd: number;
  listings: { type: string; price_cents: number; listing_id: string; trial_days: number }[];
  anomalies: { type: string; severity: string; description: string }[];
};

type Review = {
  id: string; rating: number; title: string; body: string;
  created_at: string; display_name: string; is_verified_purchase: boolean;
};

const RISK_LABEL = ['', 'Very Low', 'Low', 'Medium', 'High', 'Very High'];
const RISK_COLOR = ['', 'text-green-400', 'text-green-400', 'text-yellow-400', 'text-orange-400', 'text-red-400'];

export default function BotDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [bot, setBot] = useState<BotDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    Promise.all([
      marketplaceApi.getBot(slug),
      reviewsApi.getForBot(''),
    ]).then(([botRes]) => {
      setBot(botRes.data);
      if (botRes.data.listings?.length) setSelectedListing(botRes.data.listings[0].listing_id);
      return reviewsApi.getForBot(botRes.data.id);
    }).then(revRes => {
      setReviews(revRes.data.data ?? []);
    }).catch(() => {
      showToast('Failed to load bot');
    }).finally(() => setLoading(false));
  }, [slug]);

  const handleCheckout = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push(`/auth/login?redirect=/marketplace/${slug}`); return; }
    if (!selectedListing || !bot) return;

    const listing = bot.listings.find(l => l.listing_id === selectedListing);
    if (!listing) return;

    setCheckoutLoading(selectedListing);
    try {
      const res = await api.post('/payments/checkout', {
        botListingId: selectedListing,
        listingType: listing.type,
      });
      window.location.href = res.data.checkoutUrl;
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg ?? 'Failed to start checkout');
      setCheckoutLoading(null);
    }
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center font-mono text-gray-500">
        <p className="text-lg mb-4">Bot not found</p>
        <Link href="/marketplace" className="text-blue-400 text-sm hover:underline">← Back to marketplace</Link>
      </div>
    );
  }

  const criticalAnomalies = bot.anomalies?.filter(a => a.severity === 'critical') ?? [];
  const warningAnomalies = bot.anomalies?.filter(a => a.severity === 'warning') ?? [];

  return (
    <div className="min-h-screen bg-[#0d1117] text-white font-mono">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#30363d] h-10 flex items-center px-4 gap-4">
        <Link href="/marketplace" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> MARKETPLACE
        </Link>
        <Activity className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-bold tracking-wider">FOREXBOT</span>
      </div>

      {toast && (
        <div className="fixed top-14 right-4 z-50 bg-[#161b22] border border-[#30363d] px-4 py-2.5 rounded text-xs text-white shadow-lg">{toast}</div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Hero */}
          <div className="bg-[#161b22] border border-[#30363d] rounded p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded font-bold">{bot.mt_platform}</span>
                  {bot.is_verified && (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/30 font-bold">
                      <ShieldCheck className="w-3 h-3" /> VERIFIED
                    </span>
                  )}
                  {bot.risk_level && (
                    <span className={`text-[10px] font-bold ${RISK_COLOR[bot.risk_level]}`}>
                      RISK: {RISK_LABEL[bot.risk_level]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-white mb-1">{bot.name}</h1>
                <p className="text-gray-400 text-sm">{bot.short_description}</p>
              </div>
              <div className="text-right shrink-0">
                {bot.avg_rating > 0 && (
                  <div className="flex items-center gap-1.5 justify-end mb-1">
                    {renderStars(bot.avg_rating)}
                    <span className="text-sm font-bold text-white">{bot.avg_rating.toFixed(1)}</span>
                  </div>
                )}
                <p className="text-[10px] text-gray-500">{bot.total_reviews} reviews · {bot.total_subscribers} subscribers</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {bot.currency_pairs?.map(p => (
                <span key={p} className="text-[10px] px-2 py-0.5 bg-[#21262d] border border-[#30363d] rounded text-gray-300">{p}</span>
              ))}
              {bot.timeframes?.map(t => (
                <span key={t} className="text-[10px] px-2 py-0.5 bg-[#21262d] border border-[#30363d] rounded text-gray-400">{t}</span>
              ))}
            </div>
          </div>

          {/* Anomaly warnings */}
          {criticalAnomalies.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-red-400 font-bold text-sm">Critical Anomalies Detected</p>
              </div>
              {criticalAnomalies.map((a, i) => (
                <p key={i} className="text-xs text-gray-400 ml-6">{a.description}</p>
              ))}
            </div>
          )}

          {warningAnomalies.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <p className="text-yellow-400 font-bold text-sm">{warningAnomalies.length} Warning{warningAnomalies.length > 1 ? 's' : ''}</p>
              </div>
              {warningAnomalies.map((a, i) => (
                <p key={i} className="text-xs text-gray-400 ml-6">{a.description}</p>
              ))}
            </div>
          )}

          {/* Performance metrics */}
          {bot.sharpe_ratio != null && (
            <div className="bg-[#161b22] border border-[#30363d] rounded overflow-hidden">
              <div className="px-4 py-3 border-b border-[#30363d]">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">Performance Metrics (All Time)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
                {[
                  { label: 'Sharpe Ratio', value: bot.sharpe_ratio?.toFixed(2), color: 'text-blue-400', icon: BarChart2 },
                  { label: 'Win Rate', value: bot.win_rate != null ? `${(bot.win_rate * 100).toFixed(1)}%` : '—', color: 'text-green-400', icon: TrendingUp },
                  { label: 'Max Drawdown', value: bot.max_drawdown_pct != null ? `${bot.max_drawdown_pct.toFixed(1)}%` : '—', color: 'text-red-400', icon: TrendingDown },
                  { label: 'Profit Factor', value: bot.profit_factor?.toFixed(2), color: 'text-purple-400', icon: DollarSign },
                  { label: 'Total Trades', value: bot.total_trades?.toLocaleString(), color: 'text-white', icon: Activity },
                  { label: 'Expectancy', value: bot.expectancy_usd != null ? `$${bot.expectancy_usd.toFixed(2)}` : '—', color: 'text-green-400', icon: DollarSign },
                  { label: 'Subscribers', value: bot.total_subscribers?.toLocaleString(), color: 'text-white', icon: Users },
                  { label: 'Rating', value: bot.avg_rating > 0 ? `${bot.avg_rating.toFixed(1)} / 5` : 'No reviews', color: 'text-yellow-400', icon: Star },
                ].map(m => (
                  <div key={m.label} className="p-4 border-b border-r border-[#30363d] last:border-r-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <m.icon className={`w-3 h-3 ${m.color}`} />
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{m.label}</p>
                    </div>
                    <p className={`text-lg font-bold ${m.color}`}>{m.value ?? '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {bot.description && (
            <div className="bg-[#161b22] border border-[#30363d] rounded p-5">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">About This Bot</p>
              <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{bot.description}</div>
            </div>
          )}

          {/* Reviews */}
          <div className="bg-[#161b22] border border-[#30363d] rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Reviews ({bot.total_reviews})</span>
              {bot.avg_rating > 0 && (
                <div className="flex items-center gap-2">
                  {renderStars(bot.avg_rating)}
                  <span className="text-sm font-bold text-white">{bot.avg_rating.toFixed(1)}</span>
                </div>
              )}
            </div>
            {reviews.length === 0 && (
              <div className="py-8 text-center text-gray-600 text-sm">No reviews yet. Be the first!</div>
            )}
            {reviews.map(r => (
              <div key={r.id} className="px-4 py-4 border-b border-[#30363d] last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400">
                      {r.display_name[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs text-white font-medium">{r.display_name}</span>
                    {r.is_verified_purchase && (
                      <span className="text-[9px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded font-bold">VERIFIED</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {renderStars(r.rating)}
                    <span className="text-[10px] text-gray-600">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {r.title && <p className="text-sm font-bold text-white mb-1">{r.title}</p>}
                <p className="text-xs text-gray-400 leading-relaxed">{r.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar - Purchase */}
        <div className="space-y-4">
          {/* Seller card */}
          <div className="bg-[#161b22] border border-[#30363d] rounded p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Seller</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                {bot.seller_name[0]?.toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-white font-bold">{bot.seller_name}</p>
                  {bot.is_verified_seller && <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                {bot.seller_rating > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    {renderStars(bot.seller_rating)}
                    <span className="text-[10px] text-gray-500">{bot.seller_rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Purchase card */}
          <div className="bg-[#161b22] border border-[#30363d] rounded overflow-hidden sticky top-4">
            <div className="px-4 py-3 border-b border-[#30363d]">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Get Access</span>
            </div>
            <div className="p-4 space-y-3">
              {bot.listings?.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">No active listings.</p>
              )}
              {bot.listings?.map(listing => (
                <button key={listing.listing_id}
                  onClick={() => setSelectedListing(listing.listing_id)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded border transition-colors ${
                    selectedListing === listing.listing_id
                      ? 'bg-blue-600/20 border-blue-500/50 text-white'
                      : 'bg-[#21262d] border-[#30363d] text-gray-400 hover:text-white hover:border-gray-500'
                  }`}>
                  <div className="text-left">
                    <p className="text-xs font-bold capitalize">{listing.type.replace('subscription_', '')}</p>
                    {listing.trial_days > 0 && (
                      <p className="text-[10px] text-green-400">{listing.trial_days}-day free trial</p>
                    )}
                  </div>
                  <p className="text-base font-bold text-white">
                    ${(listing.price_cents / 100).toFixed(0)}
                    <span className="text-[10px] text-gray-500 ml-1">
                      /{listing.type.includes('yearly') ? 'yr' : listing.type.includes('monthly') ? 'mo' : 'once'}
                    </span>
                  </p>
                </button>
              ))}

              {bot.listings?.length > 0 && (
                <button onClick={handleCheckout}
                  disabled={!selectedListing || !!checkoutLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded transition-colors">
                  {checkoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                  {checkoutLoading ? 'Redirecting...' : 'Subscribe Now'}
                </button>
              )}

              <p className="text-[10px] text-gray-600 text-center">Secure payment via Stripe · Cancel anytime</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
