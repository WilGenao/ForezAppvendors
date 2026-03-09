'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { TrendingUp, LayoutDashboard, ShoppingBag, BarChart2, User, LogOut, Menu, X, Store, ChevronRight } from 'lucide-react';

const NAV = [
  { href: '/dashboard',         label: 'Overview',    icon: LayoutDashboard, exact: true },
  { href: '/dashboard/buyer',   label: 'My Bots',     icon: ShoppingBag },
  { href: '/dashboard/seller',  label: 'Seller',      icon: BarChart2 },
  { href: '/dashboard/profile', label: 'Account',     icon: User },
];

const S = {
  sidebar: { width: 220, background: '#fff', borderRight: '1px solid #E2E8F0', height: '100vh', position: 'fixed' as const, top: 0, left: 0, display: 'flex', flexDirection: 'column' as const, zIndex: 40 },
  main: { marginLeft: 220, minHeight: '100vh', background: '#F8FAFC', fontFamily: 'DM Sans, sans-serif' },
  logo: { padding: '20px 20px 16px', borderBottom: '1px solid #E2E8F0' },
  nav: { flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column' as const, gap: 2 },
  footer: { padding: '16px 20px', borderTop: '1px solid #E2E8F0' },
  topbar: { background: '#fff', borderBottom: '1px solid #E2E8F0', height: 56, display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between' },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/auth/login'); return; }
    try { const p = JSON.parse(atob(token.split('.')[1])); setEmail(p.email || ''); } catch {}
  }, [router]);

  const logout = () => { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); router.push('/auth/login'); };
  const isActive = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href);

  const SidebarContent = () => (
    <>
      <div style={S.logo}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, background: '#2563EB', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp style={{ width: 15, height: 15, color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', letterSpacing: '-0.01em' }}>ForexBot</div>
            <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>Markets</div>
          </div>
        </Link>
      </div>

      <nav style={S.nav}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 8px', marginBottom: 4 }}>Dashboard</div>
        {NAV.map(item => {
          const active = isActive(item.href, item.exact);
          return (
            <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, textDecoration: 'none', background: active ? '#EFF6FF' : 'transparent', color: active ? '#2563EB' : '#475569', fontSize: 14, fontWeight: active ? 600 : 500, transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              onClick={() => setMobileOpen(false)}>
              <item.icon style={{ width: 16, height: 16 }} />
              {item.label}
            </Link>
          );
        })}
        <div style={{ height: 1, background: '#E2E8F0', margin: '8px 0' }} />
        <Link href="/marketplace" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, textDecoration: 'none', color: '#475569', fontSize: 14, fontWeight: 500 }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#F8FAFC')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
          <Store style={{ width: 16, height: 16 }} />
          Marketplace
        </Link>
      </nav>

      <div style={S.footer}>
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</div>
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#DC2626')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#94A3B8')}>
          <LogOut style={{ width: 14, height: 14 }} /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {/* Desktop sidebar */}
      <aside style={S.sidebar} className="hidden lg:flex" >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)' }} onClick={() => setMobileOpen(false)}>
          <aside style={{ ...S.sidebar, position: 'fixed' }} onClick={e => e.stopPropagation()}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div style={S.main} className="lg:ml-[220px] ml-0">
        {/* Top bar */}
        <div style={S.topbar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
              {mobileOpen ? <X style={{ width: 20, height: 20 }} /> : <Menu style={{ width: 20, height: 20 }} />}
            </button>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#94A3B8' }}>
              <Link href="/dashboard" style={{ color: '#94A3B8', textDecoration: 'none' }}>Dashboard</Link>
              {pathname !== '/dashboard' && (
                <>
                  <ChevronRight style={{ width: 14, height: 14 }} />
                  <span style={{ color: '#334155', fontWeight: 500, textTransform: 'capitalize' }}>{pathname.split('/').pop()}</span>
                </>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
            <span style={{ color: '#64748B' }}>Connected</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
