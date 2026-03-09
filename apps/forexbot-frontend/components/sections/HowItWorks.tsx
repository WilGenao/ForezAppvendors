// ═══════════════════════════════════════════════════
// HowItWorks.tsx
// ═══════════════════════════════════════════════════
'use client';
import { Search, ShieldCheck, Download, TrendingUp } from 'lucide-react';

const STEPS = [
  { n: '01', icon: Search,      color: '#EFF6FF', iconColor: '#2563EB', title: 'Browse & Filter',    desc: 'Search thousands of verified EAs by strategy, currency pair, risk level, and performance metrics. Every bot shows real trade history — no backtests.' },
  { n: '02', icon: ShieldCheck, color: '#ECFDF5', iconColor: '#059669', title: 'Verify Performance', desc: 'Review Sharpe ratio, max drawdown, profit factor, and anomaly detection reports. Our engine flags suspicious patterns and data manipulation automatically.' },
  { n: '03', icon: Download,    color: '#FFF7ED', iconColor: '#D97706', title: 'Subscribe & Deploy', desc: 'Purchase a license, download the .ex4 or .ex5 file, and attach it to your MetaTrader chart. License validation runs automatically on every session start.' },
  { n: '04', icon: TrendingUp,  color: '#F5F3FF', iconColor: '#7C3AED', title: 'Monitor & Scale',   desc: 'Track live performance from your dashboard. Compare against benchmarks, set alerts, and upgrade, pause, or cancel any subscription at any time.' },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" style={{ background: '#F8FAFC', padding: '80px 24px', borderTop: '1px solid #E2E8F0', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>How It Works</div>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 36, fontWeight: 400, color: '#0A1628', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 14 }}>
            From Discovery to Live Trading<br />in Under 10 Minutes
          </h2>
          <p style={{ fontSize: 16, color: '#64748B', maxWidth: 520, margin: '0 auto' }}>
            A simple, secure process designed for both beginner and professional traders.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {STEPS.map((step, i) => (
            <div key={step.n} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '28px 24px', position: 'relative' }}>
              {/* Step number */}
              <div style={{ position: 'absolute', top: 20, right: 20, fontSize: 12, fontWeight: 700, color: '#E2E8F0', fontFamily: 'JetBrains Mono, monospace' }}>{step.n}</div>

              {/* Icon */}
              <div style={{ width: 48, height: 48, background: step.color, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <step.icon style={{ width: 22, height: 22, color: step.iconColor }} />
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0A1628', marginBottom: 10 }}>{step.title}</h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.65 }}>{step.desc}</p>

              {/* Connector */}
              {i < STEPS.length - 1 && (
                <div style={{ display: 'none' }} className="connector" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
