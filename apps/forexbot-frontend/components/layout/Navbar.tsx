'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, Menu, X, ChevronDown } from 'lucide-react';

const NAV = [
  { label: 'Marketplace', href: '/marketplace' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'For Sellers', href: '#' },
  { label: 'Pricing', href: '#' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: scrolled ? 'rgba(255,255,255,0.97)' : '#ffffff',
      borderBottom: `1px solid ${scrolled ? '#E2E8F0' : '#E2E8F0'}`,
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      transition: 'all 0.2s',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp style={{ width: 18, height: 18, color: '#fff' }} />
          </div>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.02em' }}>ForexBot</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8', marginLeft: 2 }}>Markets</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hidden md:flex">
          {NAV.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.label} href={item.href} style={{
                fontSize: 14, fontWeight: 500,
                color: active ? '#2563EB' : '#475569',
                padding: '6px 14px', borderRadius: 6,
                textDecoration: 'none',
                background: active ? '#EFF6FF' : 'transparent',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="hidden md:flex">
          <Link href="/auth/login" style={{ fontSize: 14, fontWeight: 500, color: '#475569', padding: '8px 16px', textDecoration: 'none', borderRadius: 6, transition: 'color 0.15s' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#0A1628')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#475569')}
          >
            Sign In
          </Link>
          <Link href="/auth/register" style={{
            fontSize: 14, fontWeight: 600, color: '#fff',
            background: '#2563EB', padding: '8px 20px',
            borderRadius: 8, textDecoration: 'none',
            transition: 'background 0.15s',
            boxShadow: '0 1px 3px rgba(37,99,235,0.3)',
          }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#1D4ED8')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#2563EB')}
          >
            Get Started
          </Link>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="md:hidden" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4 }}>
          {open ? <X style={{ width: 22, height: 22 }} /> : <Menu style={{ width: 22, height: 22 }} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ background: '#fff', borderTop: '1px solid #E2E8F0', padding: '12px 24px 20px' }}>
          {NAV.map(item => (
            <Link key={item.label} href={item.href} onClick={() => setOpen(false)} style={{ display: 'block', fontSize: 15, fontWeight: 500, color: '#334155', padding: '10px 0', borderBottom: '1px solid #F1F5F9', textDecoration: 'none' }}>
              {item.label}
            </Link>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Link href="/auth/login" style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 500, color: '#475569', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px', textDecoration: 'none' }}>Sign In</Link>
            <Link href="/auth/register" style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#fff', background: '#2563EB', borderRadius: 8, padding: '10px', textDecoration: 'none' }}>Get Started</Link>
          </div>
        </div>
      )}
    </header>
  );
}
