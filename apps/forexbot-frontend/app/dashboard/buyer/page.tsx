'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, TrendingUp, Key, ShoppingBag, Clock, LogOut, Download, RefreshCw, AlertTriangle, CheckCircle2, XCircle, BarChart2 } from 'lucide-react';

const SUBSCRIPTIONS = [
  {
    id: 'SUB-1042',
    bot: 'EuroScalper.Pro',
    seller: 'AlgoTrader Labs',
    platform: 'MT5',
    pair: 'EURUSD',
    plan: 'Monthly',
    price: 89,
    status: 'ACTIVE',
    startDate: '2026-02-02',
    nextBilling: '2026-04-02',
    daysLeft: 31,
    licenseKey: 'LK-A8F2C4E1B9D3F7A2C5E8B1D4F6A9C2E5',
    accountId: '123456',
    wr: 68.4,
    pf: 2.54,
    dd: -4.2,
    sharpe: 2.31,
  },
  {
    id: 'SUB-0891',
    bot: 'TrendHarvester.v3',
    seller: 'SilverFox Systems',
    platform: 'BOTH',
    pair: 'MULTI',
    plan: 'Yearly',
    price: 1990,
    status: 'ACTIVE',
    startDate: '2026-01-15',
    nextBilling: '2027-01-15',
    daysLeft: 319,
    licenseKey: 'LK-B3D6A9C2E5F8B1D4A7C0E3F6B9D2A5C8',
    accountId: '789012',
    wr: 54.9,
    pf: 3.21,
    dd: -3.1,
    sharpe: 3.12,
  },
  {
    id: 'SUB-0734',
    bot: 'NightScalper.EA',
    seller: 'LondonFX Group',
    platform: 'MT4',
    pair: 'GBPUSD',
    plan: 'Monthly',
    price: 79,
    status: 'EXPIRED',
    startDate: '2025-12-01',
    nextBilling: '—',
    daysLeft: 0,
    licenseKey: 'LK-C4E7B0D3F6A9C2E5B8D1A4C7E0F3B6D9',
    accountId: '345678',
    wr: 66.3,
    pf: 2.11,
    dd: -7.2,
    sharpe: 1.94,
  },
];

const LICENSES = [
  { key: 'LK-A8F2C4E1B9D3F7A2C5E8B1D4F6A9C2E5', bot: 'EuroScalper.Pro', account: '123456', platform: 'MT5', status: 'VALID', lastValidated: '2026-03-02 09:14', activations: 1, maxActivations: 2 },
  { key: 'LK-B3D6A9C2E5F8B1D4A7C0E3F6B9D2A5C8', bot: 'TrendHarvester.v3', account: '789012', platform: 'MT5', status: 'VALID', lastValidated: '2026-03-02 08:55', activations: 2, maxActivations: 2 },
  { key: 'LK-C4E7B0D3F6A9C2E5B8D1A4C7E0F3B6D9', bot: 'NightScalper.EA', account: '345678', platform: 'MT4', status: 'EXPIRED', lastValidated: '2026-01-01 12:00', activations: 1, maxActivations: 2 },
];

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'text-mt-green',
  EXPIRED: 'text-mt-red',
  PAUSED: 'text-mt-yellow',
  VALID: 'text-mt-green',
  INVALID: 'text-mt-red',
};

const STATUS_BG: Record<string, string> = {
  ACTIVE: 'bg-mt-green/10 border-mt-green/30',
  EXPIRED: 'bg-mt-red/10 border-mt-red/30',
  PAUSED: 'bg-mt-yellow/10 border-mt-yellow/30',
  VALID: 'bg-mt-green/10 border-mt-green/30',
  INVALID: 'bg-mt-red/10 border-mt-red/30',
};

export default function BuyerDashboard() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [tab, setTab] = useState<'subscriptions' | 'licenses'>('subscriptions');
  const [selected, setSelected] = useState(SUBSCRIPTIONS[0].id);
  const [copiedKey, setCopiedKey] = useState('');

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

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const activeSubs = SUBSCRIPTIONS.filter(s => s.status === 'ACTIVE');
  const selectedSub = SUBSCRIPTIONS.find(s => s.id === selected) || SUBSCRIPTIONS[0];

  return (
    <div className="min-h-screen bg-mt-bg flex flex-col">
      {/* Topbar */}
      <div className="bg-mt-panel2 border-b border-border h-10 flex items-center px-4 justify-between flex-shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-mt-blue" />
          <span className="font-mono text-sm font-bold text-white tracking-wider">FOREXBOT</span>
          <span className="font-mono text-xs text-muted">v2.4</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-muted hidden md:block">{email}</span>
          <button onClick={handleLogout} className="flex items-center gap-1.5 font-mono text-[10px] text-muted hover:text-white transition-colors">
            <LogOut className="w-3 h-3" /> LOGOUT
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden lg:flex w-48 border-r border-border flex-col bg-mt-panel2 flex-shrink-0">
          <div className="px-4 py-2 border-b border-border">
            <span className="font-mono text-[10px] text-muted tracking-widest uppercase">Buyer Panel</span>
          </div>
          <nav className="flex-1 py-2">
            {[
              { icon: BarChart2, label: 'Overview', active: true },
              { icon: ShoppingBag, label: 'Subscriptions', active: false },
              { icon: Key, label: 'Licenses', active: false },
              { icon: TrendingUp, label: 'Performance', active: false },
              { icon: Clock, label: 'History', active: false },
            ].map(({ icon: Icon, label, active }) => (
              <button key={label} className={`w-full flex items-center gap-2.5 px-4 py-2 font-mono text-xs transition-colors ${active ? 'bg-mt-blue/10 text-white border-r-2 border-mt-blue' : 'text-muted hover:text-white hover:bg-surface'}`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </nav>
          <div className="border-t border-border p-3">
            <Link href="/marketplace" className="w-full flex items-center justify-center gap-1.5 bg-mt-blue hover:bg-blue-500 text-white font-mono text-xs py-2 transition-colors">
              <ShoppingBag className="w-3 h-3" /> BROWSE_BOTS()
            </Link>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Header */}
          <div className="border-b border-border px-6 py-3 bg-mt-panel2 flex items-center justify-between flex-shrink-0">
            <div>
              <span className="font-mono text-[10px] text-muted uppercase tracking-widest">Buyer Dashboard</span>
              <div className="font-mono text-xs text-white mt-0.5">My EAs — March 2026</div>
            </div>
            <span className="font-mono text-[10px] text-mt-green">● SESSION ACTIVE</span>
          </div>

          <div className="p-6 space-y-4">
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'ACTIVE_SUBS', value: activeSubs.length, sub: `${SUBSCRIPTIONS.length} total`, icon: ShoppingBag, pos: null },
                { label: 'LICENSES_VALID', value: LICENSES.filter(l => l.status === 'VALID').length, sub: `${LICENSES.length} total`, icon: Key, pos: null },
                { label: 'MONTHLY_SPEND', value: `$${activeSubs.filter(s => s.plan === 'Monthly').reduce((a, s) => a + s.price, 0)}`, sub: 'per month', icon: TrendingUp, pos: null },
                { label: 'NEXT_BILLING', value: '2 Apr', sub: '$89 due', icon: Clock, pos: null },
              ].map(({ label, value, sub, icon: Icon }) => (
                <div key={label} className="panel p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[9px] text-muted tracking-wider">{label}</span>
                    <Icon className="w-3.5 h-3.5 text-muted" />
                  </div>
                  <div className="font-mono text-xl font-bold text-white">{value}</div>
                  <div className="font-mono text-[10px] text-muted mt-1">{sub}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="border-b border-border flex gap-0">
              {(['subscriptions', 'licenses'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`font-mono text-xs px-5 py-2 border-b-2 transition-colors uppercase tracking-wider ${tab === t ? 'border-mt-blue text-white' : 'border-transparent text-muted hover:text-white'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === 'subscriptions' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Sub list */}
                <div className="panel">
                  <div className="px-4 py-2 border-b border-border">
                    <span className="font-mono text-[10px] text-muted uppercase tracking-widest">Subscriptions</span>
                  </div>
                  <div className="divide-y divide-[#161616]">
                    {SUBSCRIPTIONS.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setSelected(sub.id)}
                        className={`w-full text-left px-4 py-3 hover:bg-surface transition-colors ${selected === sub.id ? 'bg-mt-blue/5 border-l-2 border-mt-blue' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-white font-semibold">{sub.bot}</span>
                          <span className={`font-mono text-[9px] px-1.5 py-0.5 border ${STATUS_BG[sub.status]} ${STATUS_STYLE[sub.status]}`}>
                            {sub.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[10px] text-muted">{sub.plan}</span>
                          <span className="font-mono text-[10px] text-muted">·</span>
                          <span className="font-mono text-[10px] text-muted">${sub.price}/mo</span>
                          {sub.daysLeft > 0 && (
                            <>
                              <span className="font-mono text-[10px] text-muted">·</span>
                              <span className="font-mono text-[10px] text-mt-yellow">{sub.daysLeft}d left</span>
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub detail */}
                <div className="lg:col-span-2 panel">
                  <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted uppercase tracking-widest">{selectedSub.bot} — Detail</span>
                    <span className={`font-mono text-[10px] ${STATUS_STYLE[selectedSub.status]}`}>{selectedSub.status}</span>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Info row */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { label: 'SELLER', value: selectedSub.seller },
                        { label: 'PLATFORM', value: selectedSub.platform },
                        { label: 'SYMBOL', value: selectedSub.pair },
                        { label: 'PLAN', value: selectedSub.plan },
                        { label: 'PRICE', value: `$${selectedSub.price}/mo` },
                        { label: 'NEXT_BILLING', value: selectedSub.nextBilling },
                      ].map((i) => (
                        <div key={i.label} className="panel-dark p-2">
                          <div className="font-mono text-[9px] text-muted mb-0.5">{i.label}</div>
                          <div className="font-mono text-xs text-white">{i.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Performance */}
                    {selectedSub.status === 'ACTIVE' && (
                      <div>
                        <div className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">// Live Performance</div>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: 'WIN_RATE', value: `${selectedSub.wr}%`, pos: true },
                            { label: 'PROFIT_FACTOR', value: selectedSub.pf, pos: true },
                            { label: 'MAX_DD', value: `${selectedSub.dd}%`, pos: false },
                            { label: 'SHARPE', value: selectedSub.sharpe, pos: true },
                          ].map((m) => (
                            <div key={m.label} className="panel-dark p-3 text-center">
                              <div className="font-mono text-[9px] text-muted mb-1">{m.label}</div>
                              <div className={`font-mono text-sm font-bold ${m.pos ? 'val-pos' : 'val-neg'}`}>{m.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* License key */}
                    <div>
                      <div className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">// License Key</div>
                      <div className="flex items-center gap-2 p-3 bg-mt-bg border border-border">
                        <Key className="w-3.5 h-3.5 text-muted flex-shrink-0" />
                        <span className="font-mono text-[10px] text-white flex-1 truncate">{selectedSub.licenseKey}</span>
                        <button
                          onClick={() => copyKey(selectedSub.licenseKey)}
                          className={`font-mono text-[10px] px-2 py-1 transition-colors flex-shrink-0 ${copiedKey === selectedSub.licenseKey ? 'bg-mt-green/10 text-mt-green border border-mt-green/30' : 'bg-surface border border-border text-muted hover:text-white'}`}
                        >
                          {copiedKey === selectedSub.licenseKey ? '[✓] COPIED' : 'COPY'}
                        </button>
                      </div>
                      <div className="font-mono text-[10px] text-muted mt-1">MT Account: {selectedSub.accountId} · {selectedSub.platform}</div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <button className="flex items-center gap-1.5 font-mono text-xs border border-border text-muted hover:text-white px-3 py-2 transition-colors">
                        <Download className="w-3 h-3" /> DOWNLOAD_EA()
                      </button>
                      <button className="flex items-center gap-1.5 font-mono text-xs border border-border text-muted hover:text-white px-3 py-2 transition-colors">
                        <RefreshCw className="w-3 h-3" /> RENEW()
                      </button>
                      {selectedSub.status === 'ACTIVE' && (
                        <button className="flex items-center gap-1.5 font-mono text-xs border border-mt-red/30 text-mt-red hover:bg-mt-red/10 px-3 py-2 transition-colors ml-auto">
                          <XCircle className="w-3 h-3" /> CANCEL()
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'licenses' && (
              <div className="panel">
                <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted uppercase tracking-widest">License Manager</span>
                  <span className="font-mono text-[10px] text-muted">{LICENSES.length} licenses</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="mt-table">
                    <thead>
                      <tr>
                        <th className="text-left">License Key</th>
                        <th className="text-left">EA</th>
                        <th className="text-center">Platform</th>
                        <th className="text-center">MT Account</th>
                        <th className="text-center">Activations</th>
                        <th className="text-center">Status</th>
                        <th className="text-right">Last Validated</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {LICENSES.map((lic) => (
                        <tr key={lic.key}>
                          <td className="text-left">
                            <span className="font-mono text-[10px] text-muted">{lic.key.substring(0, 18)}...</span>
                          </td>
                          <td className="text-left text-white">{lic.bot}</td>
                          <td className="text-center">
                            <span className={`font-mono text-[10px] ${lic.platform === 'MT5' ? 'text-mt-blue' : 'text-mt-yellow'}`}>{lic.platform}</span>
                          </td>
                          <td className="text-center text-muted">{lic.account}</td>
                          <td className="text-center">
                            <span className={`font-mono text-xs ${lic.activations >= lic.maxActivations ? 'text-mt-yellow' : 'val-pos'}`}>
                              {lic.activations}/{lic.maxActivations}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className={`font-mono text-[10px] flex items-center justify-center gap-1 ${STATUS_STYLE[lic.status]}`}>
                              {lic.status === 'VALID' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                              {lic.status}
                            </span>
                          </td>
                          <td className="text-right text-muted">{lic.lastValidated}</td>
                          <td className="text-center">
                            <button
                              onClick={() => copyKey(lic.key)}
                              className={`font-mono text-[10px] px-2 py-1 transition-colors ${copiedKey === lic.key ? 'bg-mt-green/10 text-mt-green border border-mt-green/30' : 'bg-surface border border-border text-muted hover:text-white'}`}
                            >
                              {copiedKey === lic.key ? '[✓]' : 'COPY'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 border-t border-border">
                  <p className="font-mono text-[10px] text-muted">// Paste license key into your EA inputs in MetaTrader to activate. Max 2 simultaneous activations per license.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="border-t border-border px-4 py-1.5 bg-mt-panel2 flex items-center justify-between flex-shrink-0">
        <span className="font-mono text-[10px] text-muted">Buyer Dashboard · {email}</span>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-muted">ACTIVE_LICENSES: {LICENSES.filter(l => l.status === 'VALID').length}</span>
          <span className="font-mono text-[10px] val-pos">● CONNECTED</span>
        </div>
      </div>
    </div>
  );
}