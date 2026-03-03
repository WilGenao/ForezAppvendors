'use client';
import Link from 'next/link';
import { ArrowRight, Shield, BarChart2, Zap } from 'lucide-react';

const TICKER_ITEMS = [
  { pair: 'EURUSD', change: '+0.42%', up: true },
  { pair: 'GBPUSD', change: '+0.18%', up: true },
  { pair: 'USDJPY', change: '-0.31%', up: false },
  { pair: 'AUDUSD', change: '+0.55%', up: true },
  { pair: 'USDCAD', change: '-0.12%', up: false },
  { pair: 'NZDUSD', change: '+0.29%', up: true },
  { pair: 'USDCHF', change: '-0.08%', up: false },
  { pair: 'EURGBP', change: '+0.21%', up: true },
];

const STATS = [
  { value: '2,400+', label: 'Verified Bots' },
  { value: '$840M', label: 'Volume Traded' },
  { value: '18,000+', label: 'Active Traders' },
  { value: '99.7%', label: 'Uptime SLA' },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen bg-navy-950 overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid opacity-40" />

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-navy-700/20 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-gold-500/5 blur-[80px] pointer-events-none" />

      {/* Ticker */}
      <div className="absolute top-16 left-0 right-0 overflow-hidden bg-navy-900/60 border-b border-navy-800/40 backdrop-blur-sm">
        <div className="flex animate-ticker whitespace-nowrap py-2">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-6 font-mono text-xs">
              <span className="text-slate-400">{item.pair}</span>
              <span className={item.up ? 'text-emerald-400' : 'text-red-400'}>{item.change}</span>
              <span className="text-navy-700 select-none">|</span>
            </span>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-48 pb-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-navy-800/60 border border-navy-700/60 rounded-full px-4 py-1.5 mb-8 animate-fade-in">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-300 font-mono tracking-wide">PLATFORM LIVE — 18,000+ TRADERS</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl md:text-7xl font-bold text-white leading-[1.05] mb-6 animate-fade-up opacity-0 delay-100">
            Trade Smarter With
            <br />
            <span className="text-gold-400 text-glow-gold">Verified Algorithms</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-10 animate-fade-up opacity-0 delay-200">
            The only marketplace where every bot is performance-verified with real trade history, anomaly detection, and institutional-grade risk metrics.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-up opacity-0 delay-300">
            <Link
              href="/marketplace"
              className="group inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-navy-950 font-semibold px-8 py-3.5 rounded transition-all hover:glow-gold text-sm"
            >
              Browse Marketplace
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 bg-navy-800/60 hover:bg-navy-700/60 border border-navy-700/60 text-white font-medium px-8 py-3.5 rounded transition-all text-sm"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 mb-20 animate-fade-up opacity-0 delay-400">
            {[
              { icon: Shield, text: 'Every bot verified' },
              { icon: BarChart2, text: 'Real trade history' },
              { icon: Zap, text: 'MT4 & MT5 ready' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-slate-500">
                <Icon className="w-3.5 h-3.5 text-gold-500" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-up opacity-0 delay-500">
            {STATS.map((stat) => (
              <div key={stat.label} className="stat-card rounded-xl p-5">
                <div className="font-display text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
