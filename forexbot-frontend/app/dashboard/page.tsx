'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, ShoppingBag, Key, FileText, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/auth/login'); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setEmail(payload.email || '');
    } catch {}
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-navy-950">
      <header className="border-b border-navy-800/60 bg-navy-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gold-500 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-navy-950" strokeWidth={2.5} />
            </div>
            <span className="font-display font-semibold text-white">ForexBot<span className="text-gold-400">.</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">{email}</span>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors">
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="font-display text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-slate-400">Welcome back. Here is your trading overview.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Active Licenses', value: '0', icon: Key },
            { label: 'Subscriptions', value: '0', icon: ShoppingBag },
            { label: 'Bots Listed', value: '0', icon: TrendingUp },
            { label: 'KYC Status', value: 'Pending', icon: FileText },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="stat-card rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
                <Icon className="w-4 h-4 text-slate-600" />
              </div>
              <div className="font-display text-2xl font-bold text-white">{value}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Browse Marketplace', desc: 'Find your next trading algorithm', href: '/marketplace', cta: 'Browse Bots' },
            { title: 'Complete KYC', desc: 'Verify your identity to become a seller', href: '#', cta: 'Submit Documents' },
            { title: 'View Documentation', desc: 'Learn how to install and configure bots', href: '#', cta: 'Read Docs' },
          ].map((card) => (
            <div key={card.title} className="stat-card rounded-xl p-6">
              <h3 className="font-semibold text-white mb-2">{card.title}</h3>
              <p className="text-sm text-slate-500 mb-4">{card.desc}</p>
              <Link href={card.href} className="text-sm text-gold-400 hover:text-gold-300 transition-colors font-medium">
                {card.cta} &rarr;
              </Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
