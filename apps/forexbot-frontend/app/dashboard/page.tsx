'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, TrendingUp, ShoppingBag, Key, FileText, LogOut, User } from 'lucide-react';
import { kycApi } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [kycStatus, setKycStatus] = useState('loading...');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/auth/login'); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setEmail(payload.email || '');
      setRoles(payload.roles || []);
    } catch {}

    kycApi.getStatus()
      .then(res => setKycStatus(res.data.status))
      .catch(() => setKycStatus('unknown'));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/auth/login');
  };

  const kycColor = kycStatus === 'approved' ? 'text-mt-green' : kycStatus === 'pending' ? 'text-mt-yellow' : 'text-muted';

  return (
    <div className="min-h-screen bg-mt-bg flex flex-col">
      <div className="bg-mt-panel2 border-b border-border h-10 flex items-center px-4 justify-between flex-shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-mt-blue" />
          <span className="font-mono text-sm font-bold text-white tracking-wider">FOREXBOT</span>
          <span className="font-mono text-xs text-muted">v2.4</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-muted">{email}</span>
          <button onClick={handleLogout} className="flex items-center gap-1.5 font-mono text-[10px] text-muted hover:text-white transition-colors">
            <LogOut className="w-3 h-3" /> LOGOUT
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto w-full px-6 py-10 space-y-6">
        {/* Welcome */}
        <div className="panel p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-mt-blue/10 border border-mt-blue/30 flex items-center justify-center">
              <User className="w-5 h-5 text-mt-blue" />
            </div>
            <div>
              <div className="font-mono text-xs text-muted uppercase tracking-widest">Logged in as</div>
              <div className="font-mono text-sm text-white font-semibold mt-0.5">{email}</div>
              {roles.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {roles.map(r => (
                    <span key={r} className="font-mono text-[9px] bg-mt-blue/10 border border-mt-blue/30 text-mt-blue px-1.5 py-0.5">{r}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <span className="font-mono text-[10px] text-mt-green hidden md:block">● SESSION ACTIVE</span>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'ACTIVE_LICENSES', value: '0', icon: Key },
            { label: 'SUBSCRIPTIONS', value: '0', icon: ShoppingBag },
            { label: 'BOTS_LISTED', value: '0', icon: TrendingUp },
            { label: 'KYC_STATUS', value: kycStatus.toUpperCase(), icon: FileText, color: kycColor },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="panel p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[9px] text-muted tracking-wider">{label}</span>
                <Icon className="w-3.5 h-3.5 text-muted" />
              </div>
              <div className={`font-mono text-lg font-bold ${color || 'text-white'}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Quick nav */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { title: 'BUYER_DASHBOARD()', desc: 'View subscriptions, licenses, and performance', href: '/dashboard/buyer', cta: 'OPEN →' },
            { title: 'SELLER_DASHBOARD()', desc: 'Manage your EAs, subscribers, and revenue', href: '/dashboard/seller', cta: 'OPEN →' },
            { title: 'ACCOUNT_SETTINGS()', desc: 'Profile, security, notifications, API keys', href: '/dashboard/profile', cta: 'OPEN →' },
          ].map(card => (
            <div key={card.title} className="panel p-5">
              <div className="font-mono text-xs text-white font-semibold mb-1">{card.title}</div>
              <p className="font-mono text-[10px] text-muted mb-4 leading-relaxed">{card.desc}</p>
              <Link href={card.href} className="font-mono text-[10px] text-mt-blue hover:underline">{card.cta}</Link>
            </div>
          ))}
        </div>

        {/* Browse CTA */}
        <div className="panel p-5 flex items-center justify-between">
          <div>
            <div className="font-mono text-xs text-white font-semibold">Ready to find your next EA?</div>
            <div className="font-mono text-[10px] text-muted mt-1">2,400+ verified algorithms available now</div>
          </div>
          <Link href="/marketplace" className="font-mono text-xs bg-mt-blue hover:bg-blue-500 text-white px-4 py-2 transition-colors">
            BROWSE_MARKETPLACE() →
          </Link>
        </div>
      </div>

      <div className="border-t border-border px-4 py-1.5 bg-mt-panel2 flex items-center justify-between mt-auto">
        <span className="font-mono text-[10px] text-muted">Dashboard · {email}</span>
        <span className="font-mono text-[10px] val-pos">● CONNECTED</span>
      </div>
    </div>
  );
}