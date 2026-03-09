'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Key, ShoppingBag, TrendingUp, FileText, ArrowRight, User } from 'lucide-react';
import { kycApi } from '@/lib/api';

const card = (bg = '#fff') => ({
  background: bg, border: '1px solid #E2E8F0', borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
});

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [kycStatus, setKycStatus] = useState('loading');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/auth/login'); return; }
    try { const p = JSON.parse(atob(token.split('.')[1])); setEmail(p.email || ''); setRoles(p.roles || []); } catch {}
    kycApi.getStatus().then(r => setKycStatus(r.data.status)).catch(() => setKycStatus('unknown'));
  }, [router]);

  const kycColor = kycStatus === 'approved' ? '#059669' : kycStatus === 'pending' ? '#D97706' : '#94A3B8';

  return (
    <div style={{ padding: 28, fontFamily: 'DM Sans, sans-serif' }}>

      {/* Welcome header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#0A1628', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Good morning 👋
        </h1>
        <p style={{ fontSize: 14, color: '#64748B' }}>{email}</p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Active Licenses', value: '0', icon: Key, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Subscriptions', value: '0', icon: ShoppingBag, color: '#059669', bg: '#ECFDF5' },
          { label: 'Bots Listed', value: '0', icon: TrendingUp, color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'KYC Status', value: kycStatus.toUpperCase(), icon: FileText, color: kycColor, bg: '#F8FAFC', valueColor: kycColor },
        ].map(s => (
          <div key={s.label} style={{ ...card(), padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>{s.label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon style={{ width: 16, height: 16, color: s.color }} />
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: (s as { valueColor?: string }).valueColor || '#0A1628', fontFamily: 'DM Serif Display, serif' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Quick nav cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { title: 'My Subscriptions', desc: 'View your active EAs, license keys, and subscription status.', href: '/dashboard/buyer', color: '#2563EB' },
          { title: 'Seller Dashboard', desc: 'Manage your listed algorithms, subscribers, and payouts.', href: '/dashboard/seller', color: '#059669' },
          { title: 'Account Settings', desc: 'Update profile, security settings, KYC, and API keys.', href: '/dashboard/profile', color: '#7C3AED' },
        ].map(c => (
          <div key={c.title} style={{ ...card(), padding: 22, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.color, borderRadius: '12px 12px 0 0' }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0A1628', marginBottom: 6 }}>{c.title}</h3>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 1.5 }}>{c.desc}</p>
            <Link href={c.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: c.color, textDecoration: 'none' }}>
              Open <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>
          </div>
        ))}
      </div>

      {/* Roles + Browse CTA */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Roles */}
        <div style={{ ...card(), padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User style={{ width: 18, height: 18, color: '#2563EB' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628' }}>{email}</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>Logged in</div>
            </div>
          </div>
          {roles.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {roles.map(r => (
                <span key={r} style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 100, padding: '2px 10px' }}>
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Browse CTA */}
        <div style={{ ...card('#0A1628'), padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Explore the Marketplace</div>
            <div style={{ fontSize: 13, color: '#475569' }}>2,400+ verified algorithms available now</div>
          </div>
          <Link href="/marketplace" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 600, padding: '9px 18px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(37,99,235,0.4)' }}>
            Browse <ArrowRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      </div>
    </div>
  );
}
