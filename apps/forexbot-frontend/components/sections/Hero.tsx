'use client';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, BarChart2, CheckCircle, TrendingUp } from 'lucide-react';

const TICKER = [
  { pair: 'EUR/USD', price: '1.0843', change: '+0.17%', pos: true  },
  { pair: 'GBP/USD', price: '1.2671', change: '+0.19%', pos: true  },
  { pair: 'USD/JPY', price: '149.83', change: '-0.27%', pos: false },
  { pair: 'XAU/USD', price: '2,024', change: '+0.21%', pos: true  },
  { pair: 'AUD/USD', price: '0.6523', change: '+0.17%', pos: true  },
  { pair: 'USD/CAD', price: '1.3564', change: '-0.06%', pos: false },
  { pair: 'NZD/USD', price: '0.6012', change: '+0.15%', pos: true  },
  { pair: 'EUR/GBP', price: '0.8553', change: '+0.04%', pos: true  },
];

const STATS = [
  { value: '2,400+',  label: 'Verified Algorithms' },
  { value: '18,000+', label: 'Active Traders'       },
  { value: '$840M',   label: 'Volume Processed'     },
  { value: '99.7%',   label: 'Platform Uptime'      },
];

const TRUST = [
  'Every EA independently verified',
  'Real forward-test performance data',
  'KYC-verified sellers only',
  'MT4 & MT5 compatible',
];

export default function Hero() {
  return (
    <section style={{ fontFamily: 'DM Sans, sans-serif' }}>

      {/* Ticker bar */}
      <div style={{ background: '#0A1628', overflow: 'hidden', height: 36, display: 'flex', alignItems: 'center', marginTop: 64 }}>
        <div style={{ display: 'flex', animation: 'ticker 50s linear infinite', whiteSpace: 'nowrap' }}>
          {[...TICKER, ...TICKER, ...TICKER].map((t, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 24px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
              <span style={{ color: '#94A3B8', fontWeight: 500 }}>{t.pair}</span>
              <span style={{ color: '#F1F5F9', fontWeight: 600 }}>{t.price}</span>
              <span style={{ color: t.pos ? '#34D399' : '#F87171', fontWeight: 600 }}>{t.change}</span>
              <span style={{ color: '#1E3A5F', marginLeft: 8 }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* Hero content */}
      <div style={{ background: 'linear-gradient(160deg, #F8FAFC 0%, #EFF6FF 50%, #F8FAFC 100%)', padding: '80px 24px 96px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="hero-grid">

          {/* Left: Text */}
          <div>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 100, padding: '6px 14px', marginBottom: 28 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8', letterSpacing: '0.04em' }}>PLATFORM LIVE · 18,000+ TRADERS</span>
            </div>

            {/* Headline */}
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 400, color: '#0A1628', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 20 }}>
              Trade Smarter With<br />
              <em style={{ fontStyle: 'italic', color: '#2563EB' }}>Verified Algorithms</em>
            </h1>

            <p style={{ fontSize: 17, color: '#475569', lineHeight: 1.7, marginBottom: 32, maxWidth: 480 }}>
              The only marketplace where every Expert Advisor is independently verified with real forward-test data, institutional-grade risk metrics, and anomaly detection.
            </p>

            {/* Trust list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 36 }}>
              {TRUST.map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle style={{ width: 16, height: 16, color: '#059669', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: '#334155', fontWeight: 500 }}>{t}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/marketplace" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#2563EB', color: '#fff',
                fontSize: 15, fontWeight: 600, padding: '13px 28px',
                borderRadius: 10, textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                transition: 'all 0.2s',
              }}>
                Browse Marketplace <ArrowRight style={{ width: 16, height: 16 }} />
              </Link>
              <Link href="/auth/register" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#fff', color: '#0A1628',
                fontSize: 15, fontWeight: 600, padding: '13px 28px',
                borderRadius: 10, textDecoration: 'none',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}>
                Start Free Trial
              </Link>
            </div>

            {/* Social proof */}
            <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 20 }}>
              No credit card required · 7-day free trial · Cancel anytime
            </p>
          </div>

          {/* Right: Stats card */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {STATS.map((s, i) => (
              <div key={s.label} style={{
                background: '#fff',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '24px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 32, color: '#0A1628', fontWeight: 400, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}

            {/* Performance card */}
            <div style={{ gridColumn: '1 / -1', background: '#0A1628', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500, marginBottom: 4 }}>TOP EA — TREND HARVESTER</div>
                <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#fff', marginBottom: 2 }}>+847%</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>36-month verified return</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[['Sharpe Ratio', '3.12'], ['Max Drawdown', '3.1%'], ['Win Rate', '54.9%']].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
                      <span style={{ fontSize: 12, color: '#64748B' }}>{k}</span>
                      <span style={{ fontSize: 12, color: '#fff', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logos / trust bar */}
      <div style={{ borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', background: '#fff', padding: '20px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, marginRight: 8 }}>COMPATIBLE WITH</span>
          {['MetaTrader 4', 'MetaTrader 5', 'cTrader', 'TradingView'].map(p => (
            <span key={p} style={{ fontSize: 13, fontWeight: 600, color: '#334155', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '5px 14px' }}>
              {p}
            </span>
          ))}
          <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, marginLeft: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck style={{ width: 14, height: 14, color: '#059669' }} />
            SSL Encrypted · Stripe Payments · GDPR Compliant
          </span>
        </div>
      </div>

      <style>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-33.33%); } }
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        }
      `}</style>
    </section>
  );
}
