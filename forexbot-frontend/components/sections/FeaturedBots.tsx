import { Star, TrendingUp, ShieldCheck, BarChart3 } from 'lucide-react';
import Link from 'next/link';

const BOTS = [
  {
    name: 'EuroScalper Pro',
    seller: 'AlgoTrader Labs',
    verified: true,
    platform: 'MT5',
    pairs: ['EURUSD', 'EURGBP'],
    winRate: 68.4,
    sharpe: 2.31,
    maxDD: 4.2,
    profitFactor: 2.54,
    price: '$89/mo',
    rating: 4.8,
    reviews: 142,
    badge: 'Top Rated',
  },
  {
    name: 'GoldRush Swing',
    seller: 'QuantFX Capital',
    verified: true,
    platform: 'MT4',
    pairs: ['XAUUSD'],
    winRate: 61.2,
    sharpe: 1.87,
    maxDD: 6.8,
    profitFactor: 1.98,
    price: '$129/mo',
    rating: 4.6,
    reviews: 89,
    badge: 'New',
  },
  {
    name: 'Trend Harvester',
    seller: 'SilverFox Systems',
    verified: true,
    platform: 'BOTH',
    pairs: ['EURUSD', 'GBPUSD', 'USDJPY'],
    winRate: 54.9,
    sharpe: 3.12,
    maxDD: 3.1,
    profitFactor: 3.21,
    price: '$199/mo',
    rating: 4.9,
    reviews: 312,
    badge: 'Best Sharpe',
  },
];

function MetricBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1 w-full bg-navy-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  );
}

export default function FeaturedBots() {
  return (
    <section className="bg-navy-950 py-24 relative">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-xs font-mono text-gold-400 uppercase tracking-widest mb-3">Featured Algorithms</p>
            <h2 className="font-display text-4xl font-bold text-white">Top Performing Bots</h2>
          </div>
          <Link href="/marketplace" className="hidden md:flex text-sm text-slate-400 hover:text-white transition-colors items-center gap-1">
            View all <span className="text-gold-400">→</span>
          </Link>
        </div>

        {/* Bot Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {BOTS.map((bot) => (
            <div
              key={bot.name}
              className="stat-card rounded-2xl p-6 hover:border-navy-600/60 transition-all group cursor-pointer relative overflow-hidden"
            >
              {/* Badge */}
              {bot.badge && (
                <div className="absolute top-4 right-4 text-xs bg-gold-500/10 border border-gold-500/30 text-gold-400 px-2 py-0.5 rounded-full font-mono">
                  {bot.badge}
                </div>
              )}

              {/* Header */}
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-navy-700 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-gold-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-white text-sm">{bot.name}</h3>
                    {bot.verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{bot.seller}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                <span className="text-xs bg-navy-800 text-slate-400 px-2 py-0.5 rounded font-mono">{bot.platform}</span>
                {bot.pairs.map((p) => (
                  <span key={p} className="text-xs bg-navy-800 text-slate-400 px-2 py-0.5 rounded font-mono">{p}</span>
                ))}
              </div>

              {/* Metrics */}
              <div className="space-y-3 mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Win Rate</span>
                  <span className="text-xs font-mono text-emerald-400">{bot.winRate}%</span>
                </div>
                <MetricBar value={bot.winRate} max={100} color="bg-emerald-500" />

                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Profit Factor</span>
                  <span className="text-xs font-mono text-blue-400">{bot.profitFactor}</span>
                </div>
                <MetricBar value={bot.profitFactor} max={5} color="bg-blue-500" />

                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Max Drawdown</span>
                  <span className="text-xs font-mono text-amber-400">{bot.maxDD}%</span>
                </div>
                <MetricBar value={bot.maxDD} max={20} color="bg-amber-500" />
              </div>

              {/* Sharpe */}
              <div className="flex items-center justify-between py-3 border-t border-navy-800/60 mb-4">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs text-slate-500">Sharpe Ratio</span>
                </div>
                <span className="font-mono text-sm font-semibold text-white">{bot.sharpe}</span>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-gold-400 fill-gold-400" />
                  <span className="text-xs text-white font-semibold">{bot.rating}</span>
                  <span className="text-xs text-slate-500">({bot.reviews})</span>
                </div>
                <span className="text-sm font-semibold text-gold-400">{bot.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
