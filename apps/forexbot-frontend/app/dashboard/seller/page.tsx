'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, TrendingUp, TrendingDown, DollarSign, Users, Key, Plus, Settings, LogOut, BarChart2, ShieldCheck, AlertTriangle, ChevronRight } from 'lucide-react';

const SELLER_BOTS = [
  { id: 1, name: 'EuroScalper.Pro', status: 'ACTIVE', platform: 'MT5', pair: 'EURUSD', subscribers: 142, revenue: 12638, wr: 68.4, sharpe: 2.31, dd: -4.2, verified: true, anomalies: 0, version: 'v4.2.1' },
  { id: 2, name: 'NightGrid.EA', status: 'DRAFT', platform: 'MT4', pair: 'GBPUSD', subscribers: 0, revenue: 0, wr: 0, sharpe: 0, dd: 0, verified: false, anomalies: 0, version: 'v1.0.0' },
  { id: 3, name: 'AsiaBreak.v2', status: 'PENDING_REVIEW', platform: 'MT5', pair: 'USDJPY', subscribers: 0, revenue: 0, wr: 71.2, sharpe: 2.64, dd: -5.4, verified: false, anomalies: 2, version: 'v2.0.0' },
];

const RECENT_SALES = [
  { id: 'SUB-1042', buyer: 'trader_x91', bot: 'EuroScalper.Pro', plan: 'Monthly', amount: 89, date: '2026-03-02 09:14', status: 'ACTIVE' },
  { id: 'SUB-1041', buyer: 'fx_master22', bot: 'EuroScalper.Pro', plan: 'Monthly', amount: 89, date: '2026-03-01 14:30', status: 'ACTIVE' },
  { id: 'SUB-1040', buyer: 'algo_pro', bot: 'EuroScalper.Pro', plan: 'Yearly', amount: 890, date: '2026-02-28 11:22', status: 'ACTIVE' },
  { id: 'SUB-1039', buyer: 'uk_trader', bot: 'EuroScalper.Pro', plan: 'Monthly', amount: 89, date: '2026-02-27 16:45', status: 'CANCELED' },
  { id: 'SUB-1038', buyer: 'quant_55', bot: 'EuroScalper.Pro', plan: 'Monthly', amount: 89, date: '2026-02-26 08:30', status: 'ACTIVE' },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-mt-green',
  DRAFT: 'text-muted',
  PENDING_REVIEW: 'text-mt-yellow',
  SUSPENDED: 'text-mt-red',
  CANCELED: 'text-mt-red',
};

const STATUS_BG: Record<string, string> = {
  ACTIVE: 'bg-mt-green/10 border-mt-green/30',
  DRAFT: 'bg-surface border-border',
  PENDING_REVIEW: 'bg-mt-yellow/10 border-mt-yellow/30',
  SUSPENDED: 'bg-mt-red/10 border-mt-red/30',
  CANCELED: 'bg-mt-red/10 border-mt-red/30',
};

export default function SellerDashboard() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [activeBot, setActiveBot] = useState(SELLER_BOTS[0].id);

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

  const selected = SELLER_BOTS.find(b => b.id === activeBot) || SELLER_BOTS[0];
  const totalRevenue = SELLER_BOTS.reduce((s, b) => s + b.revenue, 0);
  const totalSubs = SELLER_BOTS.reduce((s, b) => s + b.subscribers, 0);

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
            <span className="font-mono text-[10px] text-muted tracking-widest uppercase">Seller Panel</span>
          </div>
          <nav className="flex-1 py-2">
            {[
              { icon: BarChart2, label: 'Overview', active: true },
              { icon: TrendingUp, label: 'My Bots', active: false },
              { icon: DollarSign, label: 'Revenue', active: false },
              { icon: Users, label: 'Subscribers', active: false },
              { icon: Key, label: 'Licenses', active: false },
              { icon: Settings, label: 'Settings', active: false },
            ].map(({ icon: Icon, label, active }) => (
              <button key={label} className={`w-full flex items-center gap-2.5 px-4 py-2 font-mono text-xs transition-colors ${active ? 'bg-mt-blue/10 text-white border-r-2 border-mt-blue' : 'text-muted hover:text-white hover:bg-surface'}`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </nav>
          <div className="border-t border-border p-3">
            <Link href="/marketplace/new" className="w-full flex items-center justify-center gap-1.5 bg-mt-blue hover:bg-blue-500 text-white font-mono text-xs py-2 transition-colors">
              <Plus className="w-3 h-3" /> NEW_BOT()
            </Link>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Header */}
          <div className="border-b border-border px-6 py-3 bg-mt-panel2 flex items-center justify-between flex-shrink-0">
            <div>
              <span className="font-mono text-[10px] text-muted uppercase tracking-widest">Seller Dashboard</span>
              <div className="font-mono text-xs text-white mt-0.5">Overview — March 2026</div>
            </div>
            <span className="font-mono text-[10px] text-mt-green">● ACCOUNT ACTIVE</span>
          </div>

          <div className="p-6 space-y-4">
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'TOTAL_REVENUE', value: `$${totalRevenue.toLocaleString()}`, sub: '+$89 today', pos: true, icon: DollarSign },
                { label: 'ACTIVE_SUBS', value: totalSubs, sub: '1 new this week', pos: true, icon: Users },
                { label: 'ACTIVE_BOTS', value: SELLER_BOTS.filter(b => b.status === 'ACTIVE').length, sub: `${SELLER_BOTS.length} total`, pos: null, icon: TrendingUp },
                { label: 'PENDING_REVIEW', value: SELLER_BOTS.filter(b => b.status === 'PENDING_REVIEW').length, sub: 'Awaiting verification', pos: null, icon: ShieldCheck },
              ].map(({ label, value, sub, pos, icon: Icon }) => (
                <div key={label} className="panel p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[9px] text-muted tracking-wider">{label}</span>
                    <Icon className="w-3.5 h-3.5 text-muted" />
                  </div>
                  <div className={`font-mono text-xl font-bold ${pos === true ? 'val-pos' : pos === false ? 'val-neg' : 'text-white'}`}>
                    {value}
                  </div>
                  <div className="font-mono text-[10px] text-muted mt-1">{sub}</div>
                </div>
              ))}
            </div>

            {/* Bots table + detail */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Bot list */}
              <div className="panel">
                <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted uppercase tracking-widest">My EAs</span>
                  <Link href="#" className="font-mono text-[10px] text-mt-blue hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </Link>
                </div>
                <div className="divide-y divide-[#161616]">
                  {SELLER_BOTS.map((bot) => (
                    <button
                      key={bot.id}
                      onClick={() => setActiveBot(bot.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-surface transition-colors ${activeBot === bot.id ? 'bg-mt-blue/5 border-l-2 border-mt-blue' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-white font-semibold">{bot.name}</span>
                          {bot.verified && <ShieldCheck className="w-3 h-3 text-mt-green" />}
                          {bot.anomalies > 0 && <AlertTriangle className="w-3 h-3 text-mt-yellow" />}
                        </div>
                        <ChevronRight className="w-3 h-3 text-muted" />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`font-mono text-[9px] px-1.5 py-0.5 border ${STATUS_BG[bot.status]} ${STATUS_COLORS[bot.status]}`}>
                          {bot.status}
                        </span>
                        <span className="font-mono text-[10px] text-muted">{bot.platform} · {bot.pair}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bot detail */}
              <div className="lg:col-span-2 panel">
                <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                  <span className="font-mono text-[10px] text-muted uppercase tracking-widest">{selected.name} — Detail</span>
                  <div className="flex gap-2">
                    <button className="font-mono text-[10px] border border-border text-muted hover:text-white px-2 py-1 transition-colors">EDIT</button>
                    <button className="font-mono text-[10px] bg-mt-blue hover:bg-blue-500 text-white px-2 py-1 transition-colors">MANAGE</button>
                  </div>
                </div>

                <div className="p-4 space-y-4">
                  {/* Status banner */}
                  <div className={`flex items-center justify-between p-3 border ${STATUS_BG[selected.status]}`}>
                    <div className="flex items-center gap-2">
                      {selected.status === 'ACTIVE' && <ShieldCheck className="w-4 h-4 text-mt-green" />}
                      {selected.status === 'PENDING_REVIEW' && <AlertTriangle className="w-4 h-4 text-mt-yellow" />}
                      {selected.status === 'DRAFT' && <Settings className="w-4 h-4 text-muted" />}
                      <span className={`font-mono text-xs font-semibold ${STATUS_COLORS[selected.status]}`}>
                        STATUS: {selected.status}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-muted">{selected.version}</span>
                  </div>

                  {/* Metrics grid */}
                  {selected.status === 'ACTIVE' ? (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'SUBSCRIBERS', value: selected.subscribers, pos: null },
                          { label: 'REVENUE', value: `$${selected.revenue.toLocaleString()}`, pos: true },
                          { label: 'WIN_RATE', value: `${selected.wr}%`, pos: true },
                          { label: 'SHARPE', value: selected.sharpe, pos: true },
                          { label: 'MAX_DD', value: `${selected.dd}%`, pos: false },
                          { label: 'ANOMALIES', value: selected.anomalies, pos: selected.anomalies === 0 ? null : false },
                        ].map((s) => (
                          <div key={s.label} className="panel-dark p-3">
                            <div className="font-mono text-[9px] text-muted mb-1">{s.label}</div>
                            <div className={`font-mono text-sm font-bold ${s.pos === true ? 'val-pos' : s.pos === false ? 'val-neg' : 'text-white'}`}>
                              {String(s.value)}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Revenue breakdown */}
                      <div>
                        <div className="font-mono text-[10px] text-muted uppercase tracking-widest mb-2">// Revenue Breakdown</div>
                        <div className="space-y-1">
                          {[
                            { label: 'Gross Revenue', value: `$${selected.revenue.toLocaleString()}`, pos: true },
                            { label: 'Platform Fee (20%)', value: `-$${(selected.revenue * 0.2).toFixed(0)}`, pos: false },
                            { label: 'Net Payout', value: `$${(selected.revenue * 0.8).toFixed(0)}`, pos: true },
                          ].map((r) => (
                            <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-[#161616]">
                              <span className="font-mono text-[10px] text-muted">{r.label}</span>
                              <span className={`font-mono text-xs font-semibold ${r.pos ? 'val-pos' : 'val-neg'}`}>{r.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : selected.status === 'PENDING_REVIEW' ? (
                    <div className="p-4 space-y-3">
                      <p className="font-mono text-xs text-muted">Your EA is under review. Our team verifies:</p>
                      {['Trade history authenticity', 'Anomaly detection scan', 'Risk metric validation', 'EA file integrity check'].map((item) => (
                        <div key={item} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-mt-yellow animate-pulse" />
                          <span className="font-mono text-xs text-muted">{item}</span>
                        </div>
                      ))}
                      {selected.anomalies > 0 && (
                        <div className="mt-3 p-3 bg-mt-yellow/5 border border-mt-yellow/20">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-mt-yellow" />
                            <span className="font-mono text-xs text-mt-yellow">{selected.anomalies} anomaly/anomalies flagged — review required</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="font-mono text-xs text-muted mb-4">This EA is in draft. Complete setup to submit for review.</p>
                      <button className="font-mono text-xs bg-mt-blue hover:bg-blue-500 text-white px-6 py-2 transition-colors">
                        &gt; COMPLETE_SETUP()
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent sales */}
            <div className="panel">
              <div className="px-4 py-2 border-b border-border">
                <span className="font-mono text-[10px] text-muted uppercase tracking-widest">Recent Subscriptions</span>
              </div>
              <div className="overflow-x-auto">
                <table className="mt-table">
                  <thead>
                    <tr>
                      <th className="text-left">Sub ID</th>
                      <th className="text-left">Buyer</th>
                      <th className="text-left">EA</th>
                      <th className="text-center">Plan</th>
                      <th className="text-right">Amount</th>
                      <th className="text-center">Status</th>
                      <th className="text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RECENT_SALES.map((s) => (
                      <tr key={s.id}>
                        <td className="text-left text-muted">{s.id}</td>
                        <td className="text-left text-white">{s.buyer}</td>
                        <td className="text-left text-muted">{s.bot}</td>
                        <td className="text-center">
                          <span className="font-mono text-[10px] bg-surface border border-border text-muted px-1.5 py-0.5">{s.plan}</span>
                        </td>
                        <td className="text-right val-pos">${s.amount}</td>
                        <td className="text-center">
                          <span className={`font-mono text-[10px] ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                        </td>
                        <td className="text-right text-muted">{s.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="border-t border-border px-4 py-1.5 bg-mt-panel2 flex items-center justify-between flex-shrink-0">
        <span className="font-mono text-[10px] text-muted">Seller Dashboard · {email}</span>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-muted">PLATFORM_FEE: 20%</span>
          <span className="font-mono text-[10px] val-pos">● PAYOUTS: ACTIVE</span>
        </div>
      </div>
    </div>
  );
}