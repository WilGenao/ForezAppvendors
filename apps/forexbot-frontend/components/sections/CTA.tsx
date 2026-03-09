'use client';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Clock, CreditCard } from 'lucide-react';

export default function CTA() {
  return (
    <section style={{ background: '#0A1628', padding: '80px 24px', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>

        {/* Eyebrow */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.4)', borderRadius: 100, padding: '6px 16px', marginBottom: 28 }}>
          <ShieldCheck style={{ width: 14, height: 14, color: '#60A5FA' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#93C5FD', letterSpacing: '0.06em' }}>TRUSTED BY 18,000+ TRADERS WORLDWIDE</span>
        </div>

        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 400, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 18 }}>
          Start Trading with Verified<br />
          <em style={{ fontStyle: 'italic', color: '#60A5FA' }}>Algorithms Today</em>
        </h2>

        <p style={{ fontSize: 17, color: '#94A3B8', marginBottom: 40, maxWidth: 560, margin: '0 auto 40px' }}>
          Join thousands of traders using independently verified algorithms.
          7-day free trial on all plans — no commitment required.
        </p>

        {/* Trust pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 36, flexWrap: 'wrap' }}>
          {[
            { icon: CreditCard, text: 'No credit card required' },
            { icon: Clock,      text: '7-day free trial'        },
            { icon: ShieldCheck, text: 'Cancel anytime'         },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#64748B' }}>
              <item.icon style={{ width: 14, height: 14, color: '#475569' }} />
              {item.text}
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/auth/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#2563EB', color: '#fff',
            fontSize: 16, fontWeight: 600, padding: '14px 32px',
            borderRadius: 10, textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
          }}>
            Create Free Account <ArrowRight style={{ width: 18, height: 18 }} />
          </Link>
          <Link href="/marketplace" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.08)', color: '#fff',
            fontSize: 16, fontWeight: 600, padding: '14px 32px',
            borderRadius: 10, textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.12)',
          }}>
            Browse Marketplace
          </Link>
        </div>

        {/* Disclaimer */}
        <p style={{ fontSize: 11, color: '#334155', marginTop: 40, maxWidth: 600, margin: '40px auto 0', lineHeight: 1.6 }}>
          ⚠ Risk Disclosure: Trading foreign exchange and derivatives involves significant risk of loss. Past performance is not indicative of future results. ForexBot Markets is a technology intermediary and does not provide financial advice.
        </p>
      </div>
    </section>
  );
}
