'use client';
import Link from 'next/link';
import { ArrowRight, Activity } from 'lucide-react';

const TICKER = [
  { pair: 'EURUSD', bid: '1.08432', ask: '1.08435', change: '+0.0018', pct: '+0.17%', pos: true },
  { pair: 'GBPUSD', bid: '1.26710', ask: '1.26714', change: '+0.0024', pct: '+0.19%', pos: true },
  { pair: 'USDJPY', bid: '149.832', ask: '149.836', change: '-0.412', pct: '-0.27%', pos: false },
  { pair: 'XAUUSD', bid: '2024.45', ask: '2024.85', change: '+4.20', pct: '+0.21%', pos: true },
  { pair: 'AUDUSD', bid: '0.65234', ask: '0.65238', change: '+0.0011', pct: '+0.17%', pos: true },
  { pair: 'USDCAD', bid: '1.35642', ask: '1.35646', change: '-0.0008', pct: '-0.06%', pos: false },
  { pair: 'NZDUSD', bid: '0.60128', ask: '0.60132', change: '+0.0009', pct: '+0.15%', pos: true },
  { pair: 'EURGBP', bid: '0.85530', ask: '0.85534', change: '+0.0003', pct: '+0.04%', pos: true },
];

export default function Hero() {
  return (
    <section className="min-h-screen bg-mt-bg flex flex-col pt-10">
      {/* Ticker */}
      <div className="ticker-bar overflow-hidden flex-shrink-0">
        <div className="flex animate-ticker whitespace-nowrap py-1.5">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="inline-flex items-center gap-3 px-5">
              <span className="text-white font-semibold">{t.pair}</span>
              <span className="text-muted">{t.bid}</span>
              <span className="text-muted">/</span>
              <span className="text-muted">{t.ask}</span>
              <span className={t.pos ? 'val-pos' : 'val-neg'}>{t.change}</span>
              <span className={t.pos ? 'val-pos' : 'val-neg'}>{t.pct}</span>
              <span className="text-[#222] select-none">│</span>
            </span>
          ))}
        </div>
      </div>

      {/* Centered content */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl text-center">

          {/* Status badge */}
          <div className="inline-flex items-center gap-2 mb-8">
            <Activity className="w-3.5 h-3.5 text-mt-blue" />
            <span className="font-mono text-xs text-muted tracking-widest uppercase">Platform v2.4.1 — Live</span>
          </div>

          {/* Headline */}
          <h1 className="font-mono text-5xl md:text-6xl font-bold text-white leading-tight mb-6">
            FOREXBOT<br />
            <span className="text-mt-blue">MARKETPLACE</span>
          </h1>

          {/* Code comment description */}
          <div className="font-mono text-xs text-muted leading-loose mb-10 text-left inline-block border-l-2 border-mt-blue pl-4">
            <span className="block">// Institutional-grade algorithmic trading platform</span>
            <span className="block">// Every EA verified with real forward-test data</span>
            <span className="block">// MT4 &amp; MT5 compatible — deploy in minutes</span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-10">
            {[
              { label: 'VERIFIED_BOTS', value: '2,400', unit: 'ea' },
              { label: 'ACTIVE_TRADERS', value: '18,241', unit: 'users' },
              { label: 'TOTAL_VOLUME', value: '840M', unit: 'USD' },
              { label: 'AVG_WIN_RATE', value: '64.2', unit: '%' },
            ].map((s) => (
              <div key={s.label} className="panel p-4 text-left">
                <div className="font-mono text-[10px] text-muted mb-1 tracking-wider">{s.label}</div>
                <div className="font-mono text-xl font-bold text-white">
                  {s.value} <span className="text-xs text-muted">{s.unit}</span>
                </div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center gap-2 bg-mt-blue hover:bg-blue-500 text-white font-mono text-xs font-semibold px-6 py-3 transition-colors"
            >
              BROWSE_BOTS() <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 border border-border hover:border-[#333] text-muted hover:text-white font-mono text-xs px-6 py-3 transition-colors"
            >
              REGISTER_FREE()
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}