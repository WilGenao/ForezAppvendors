'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, BarChart2, ShoppingBag, TrendingUp, Key, User, Settings, LogOut, Menu, X, ChevronRight } from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: 'OVERVIEW', icon: BarChart2, exact: true },
  { href: '/dashboard/buyer', label: 'BUYER', icon: ShoppingBag },
  { href: '/dashboard/seller', label: 'SELLER', icon: TrendingUp },
  { href: '/dashboard/profile', label: 'ACCOUNT', icon: User },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [time, setTime] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/auth/login'); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setEmail(payload.email || '');
    } catch {}
  }, [router]);

  useEffect(() => {
    setTime(new Date().toUTCString().replace(' GMT', ' UTC'));
    const interval = setInterval(() => {
      setTime(new Date().toUTCString().replace(' GMT', ' UTC'));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/auth/login');
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-mt-bg flex flex-col">
      <div className="bg-mt-panel2 border-b border-border h-10 flex items-center px-4 justify-between flex-shrink-0 z-50 fixed top-0 left-0 right-0">
        <div className="flex items-center gap-4">
          <button className="lg:hidden text-muted hover:text-white" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <Link href="/" className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-mt-blue" />
            <span className="font-mono text-sm font-bold text-white tracking-wider">FOREXBOT</span>
            <span className="font-mono text-xs text-muted hidden sm:block">v2.4</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-0 ml-4">
            {NAV.map(item => (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-1.5 font-mono text-xs px-3 py-2 border-b-2 transition-colors ${
                  isActive(item.href, item.exact)
                    ? 'border-mt-blue text-white'
                    : 'border-transparent text-muted hover:text-white hover:border-[#333]'
                }`}>
                <item.icon className="w-3 h-3" />
                {item.label}
              </Link>
            ))}
            <Link href="/marketplace"
              className="flex items-center gap-1.5 font-mono text-xs px-3 py-2 border-b-2 border-transparent text-muted hover:text-white transition-colors">
              <Key className="w-3 h-3" />
              MARKETPLACE
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-muted hidden md:block truncate max-w-32">{email}</span>
          <Link href="/dashboard/profile"
            className={`p-1 transition-colors ${pathname.startsWith('/dashboard/profile') ? 'text-mt-blue' : 'text-muted hover:text-white'}`}>
            <Settings className="w-3.5 h-3.5" />
          </Link>
          <button onClick={handleLogout}
            className="flex items-center gap-1 font-mono text-[10px] text-muted hover:text-mt-red transition-colors">
            <LogOut className="w-3 h-3" />
            <span className="hidden sm:block">LOGOUT</span>
          </button>
        </div>
      </div>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setSidebarOpen(false)}>
          <div className="w-56 h-full bg-mt-panel2 border-r border-border pt-10" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-2 border-b border-border">
              <span className="font-mono text-[10px] text-muted uppercase tracking-widest">Navigation</span>
            </div>
            <nav className="py-2">
              {[...NAV, { href: '/marketplace', label: 'MARKETPLACE', icon: Key, exact: false }].map(item => (
                <Link key={item.href} href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 font-mono text-xs transition-colors ${
                    isActive(item.href, item.exact)
                      ? 'bg-mt-blue/10 text-white border-l-2 border-mt-blue'
                      : 'text-muted hover:text-white hover:bg-surface'
                  }`}>
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                  <ChevronRight className="w-3 h-3 ml-auto" />
                </Link>
              ))}
            </nav>
            <div className="border-t border-border p-4">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2 font-mono text-xs text-mt-red px-2 py-2">
                <LogOut className="w-3.5 h-3.5" />
                LOGOUT()
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed top-10 left-0 right-0 z-40 bg-mt-bg border-b border-border px-4 py-1.5 flex items-center gap-2">
        <Link href="/dashboard" className="font-mono text-[10px] text-muted hover:text-white transition-colors">DASHBOARD</Link>
        {pathname !== '/dashboard' && (
          <>
            <span className="font-mono text-[10px] text-[#333]">/</span>
            <span className="font-mono text-[10px] text-white uppercase">
              {pathname.split('/').pop()}
            </span>
          </>
        )}
        <span className="ml-auto font-mono text-[10px] text-mt-green">● ONLINE</span>
      </div>

      <div className="mt-[80px] flex-1 flex flex-col">
        {children}
      </div>

      <div className="border-t border-border px-4 py-1 bg-mt-panel2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-muted">{email}</span>
          <span className="font-mono text-[10px] text-muted hidden md:block">{time}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-muted hidden md:block">API: localhost:3001</span>
          <span className="font-mono text-[10px] val-pos">● CONNECTED</span>
        </div>
      </div>
    </div>
  );
}
