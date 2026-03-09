'use client';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

const COLS = [
  { title: 'Platform',  links: ['Marketplace', 'How It Works', 'Verified Bots', 'Performance Data', 'API Access'] },
  { title: 'Sellers',   links: ['Become a Seller', 'Seller Dashboard', 'Submission Guidelines', 'Pricing', 'Documentation'] },
  { title: 'Company',   links: ['About Us', 'Blog', 'Careers', 'Press', 'Contact'] },
  { title: 'Legal',     links: ['Privacy Policy', 'Terms of Service', 'Risk Disclaimer', 'Cookie Policy'] },
];

export default function Footer() {
  return (
    <footer style={{ background: '#0F172A', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 24px 32px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 1fr 1fr', gap: 32, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp style={{ width: 16, height: 16, color: '#fff' }} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>ForexBot Markets</span>
            </Link>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, marginBottom: 20 }}>
              Institutional-grade algorithmic trading infrastructure for the modern trader. Every algorithm independently verified.
            </p>
            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#334155' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
              All systems operational
            </div>
          </div>

          {COLS.map(col => (
            <div key={col.title}>
              <h4 style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>{col.title}</h4>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(link => (
                  <li key={link}>
                    <Link href="#" style={{ fontSize: 13, color: '#475569', textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#94A3B8')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#475569')}
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div style={{ borderTop: '1px solid #1E293B', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 12, color: '#334155' }}>
            © 2026 ForexBot Markets Ltd. All rights reserved. Trading involves risk of loss.
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            {['Privacy', 'Terms', 'Cookies', 'Disclaimer'].map(item => (
              <Link key={item} href="#" style={{ fontSize: 12, color: '#334155', textDecoration: 'none', padding: '4px 10px', borderRadius: 4 }}>{item}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
