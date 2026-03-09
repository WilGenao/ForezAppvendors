'use client';
import { ShieldCheck, Star, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const BOTS = [
  {
    name: 'EuroScalper Pro',
    seller: 'AlgoTrader Labs',
    verified: true,
    platform: 'MT5',
    pairs: ['EUR/USD', 'EUR/GBP'],
    winRate: 68.4,
    sharpe: 2.31,
    maxDD: 4.2,
    pf: 2.54,
    price: 89,
    rating: 4.8,
    reviews: 142,
    tag: 'Top Rated',
    tagColor: '#D97706',
    tagBg: '#FFFBEB',
    return36m: '+312%',
  },
  {
    name: 'GoldRush Swing',
    seller: 'QuantFX Capital',
    verified: true,
    platform: 'MT4',
    pairs: ['XAU/USD'],
    winRate: 61.2,
    sharpe: 1.87,
    maxDD: 6.8,
    pf: 1.98,
    price: 129,
    rating: 4.6,
    reviews: 89,
    tag: 'New',
    tagColor: '#059669',
    tagBg: '#ECFDF5',
    return36m: '+198%',
  },
  {
    name: 'Trend Harvester',
    seller: 'SilverFox Systems',
    verified: true,
    platform: 'MT5',
    pairs: ['EUR/USD', 'GBP/USD', 'USD/JPY'],
    winRate: 54.9,
    sharpe: 3.12,
    maxDD: 3.1,
    pf: 3.21,
    price: 199,
    rating: 4.9,
    reviews: 312,
    tag: 'Best Sharpe',
    tagColor: '#2563EB',
    tagBg: '#EFF6FF',
    return36m: '+847%',
  },
];

export default function FeaturedBots() {
  return (
    <section style={{ background: '#fff', padding: '80px 24px', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Featured Algorithms</div>
            <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 36, fontWeight: 400, color: '#0A1628', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Top Performing Expert Advisors
            </h2>
          </div>
          <Link href="/marketplace" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}>
            View all EAs <ArrowRight style={{ width: 16, height: 16 }} />
          </Link>
        </div>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          {BOTS.map(bot => (
            <div key={bot.name} style={{
              background: '#fff',
              border: '1px solid #E2E8F0',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              }}
            >
              {/* Card top strip */}
              <div style={{ background: '#0A1628', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, background: 'rgba(37,99,235,0.3)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp style={{ width: 20, height: 20, color: '#60A5FA' }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{bot.name}</span>
                      {bot.verified && <ShieldCheck style={{ width: 14, height: 14, color: '#34D399' }} />}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{bot.seller}</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: bot.tagColor, background: bot.tagBg, padding: '4px 10px', borderRadius: 100 }}>
                  {bot.tag}
                </span>
              </div>

              <div style={{ padding: '20px 24px' }}>
                {/* Platform + pairs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: bot.platform === 'MT5' ? '#2563EB' : '#7C3AED', background: bot.platform === 'MT5' ? '#EFF6FF' : '#F5F3FF', border: `1px solid ${bot.platform === 'MT5' ? '#BFDBFE' : '#DDD6FE'}`, borderRadius: 6, padding: '3px 10px' }}>
                    {bot.platform}
                  </span>
                  {bot.pairs.map(p => (
                    <span key={p} style={{ fontSize: 11, fontWeight: 500, color: '#475569', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '3px 10px', fontFamily: 'JetBrains Mono, monospace' }}>
                      {p}
                    </span>
                  ))}
                </div>

                {/* Key metrics grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Win Rate',      value: `${bot.winRate}%`,  color: '#059669' },
                    { label: 'Profit Factor', value: String(bot.pf),     color: '#2563EB' },
                    { label: 'Max Drawdown',  value: `${bot.maxDD}%`,    color: '#DC2626' },
                    { label: 'Sharpe Ratio',  value: String(bot.sharpe), color: '#0A1628' },
                  ].map(m => (
                    <div key={m.label} style={{ background: '#F8FAFC', borderRadius: 8, padding: '12px' }}>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginBottom: 4 }}>{m.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: m.color, fontFamily: 'JetBrains Mono, monospace' }}>{m.value}</div>
                    </div>
                  ))}
                </div>

                {/* 36m return */}
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <span style={{ fontSize: 12, color: '#065F46', fontWeight: 500 }}>36-month verified return</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#059669', fontFamily: 'JetBrains Mono, monospace' }}>{bot.return36m}</span>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star style={{ width: 14, height: 14, color: '#F59E0B', fill: '#F59E0B' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>{bot.rating}</span>
                    <span style={{ fontSize: 13, color: '#94A3B8' }}>({bot.reviews} reviews)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#0A1628' }}>${bot.price}<span style={{ fontSize: 12, fontWeight: 400, color: '#94A3B8' }}>/mo</span></span>
                    <Link href="/marketplace" style={{
                      fontSize: 13, fontWeight: 600, color: '#fff',
                      background: '#2563EB', borderRadius: 8,
                      padding: '8px 16px', textDecoration: 'none',
                    }}>
                      Subscribe
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
