'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Activity, ShieldCheck, ArrowLeft, TrendingUp, TrendingDown, BarChart2, AlertTriangle, CheckCircle2, Clock, Hash } from 'lucide-react';

const BOT = {
  id: 1,
  name: 'EuroScalper.Pro',
  seller: 'AlgoTrader Labs',
  pair: 'EURUSD',
  platform: 'MT5',
  verified: true,
  status: 'ACTIVE',
  version: 'v4.2.1',
  released: '2024-08-15',
  description: 'High-frequency scalping EA for EURUSD using RSI divergence and Bollinger Band breakouts. Optimized for low-spread ECN brokers. Operates during London and New York sessions only.',
  price: 89,
  metrics: {
    totalTrades: 1842,
    winRate: 68.4,
    profitFactor: 2.54,
    sharpe: 2.31,
    sortino: 3.14,
    maxDD: -4.2,
    maxDDAbs: -842,
    expectancy: 18.4,
    avgRRR: 1.69,
    recoveryFactor: 2.83,
    calmar: 391.4,
    totalProfit: 2384.5,
    tradingDays: 186,
    winningTrades: 1260,
    losingTrades: 582,
  },
  equity: [
    10000, 10180, 10290, 10150, 10380, 10520, 10440, 10680, 10820, 10760,
    10980, 11120, 11050, 11280, 11420, 11380, 11560, 11720, 11640, 11890,
    12040, 11980, 12180, 12350, 12290, 12480, 12620, 12540, 12780, 12940,
    12860, 12384,
  ],
  trades: [
    { ticket: 10421, dir: 'BUY', symbol: 'EURUSD', lot: 0.10, open: 1.08432, close: 1.08521, profit: 89.0, date: '2024-11-01 09:14', duration: '1h 22m' },
    { ticket: 10422, dir: 'SELL', symbol: 'EURUSD', lot: 0.10, open: 1.08610, close: 1.08490, profit: 120.0, date: '2024-11-01 11:30', duration: '2h 05m' },
    { ticket: 10423, dir: 'BUY', symbol: 'EURUSD', lot: 0.10, open: 1.08350, close: 1.08290, profit: -60.0, date: '2024-11-02 09:05', duration: '0h 48m' },
    { ticket: 10424, dir: 'BUY', symbol: 'EURUSD', lot: 0.10, open: 1.08180, close: 1.08310, profit: 130.0, date: '2024-11-02 14:22', duration: '3h 11m' },
    { ticket: 10425, dir: 'SELL', symbol: 'EURUSD', lot: 0.10, open: 1.08490, close: 1.08420, profit: 70.0, date: '2024-11-03 10:15', duration: '1h 55m' },
    { ticket: 10426, dir: 'BUY', symbol: 'EURUSD', lot: 0.10, open: 1.08320, close: 1.08260, profit: -60.0, date: '2024-11-04 09:30', duration: '0h 55m' },
    { ticket: 10427, dir: 'SELL', symbol: 'EURUSD', lot: 0.10, open: 1.08550, close: 1.08430, profit: 120.0, date: '2024-11-04 13:45', duration: '2h 30m' },
    { ticket: 10428, dir: 'BUY', symbol: 'EURUSD', lot: 0.10, open: 1.08210, close: 1.08340, profit: 130.0, date: '2024-11-05 10:00', duration: '1h 40m' },
  ],
  anomalies: [],
};

function MiniChart({ data }: { data: number[] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const w = 600;
  const h = 120;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  const areaPath = `M0,${h} L${pts.split(' ').map(p => p).join(' L')} L${w},${h} Z`;
  const final = data[data.length - 1];
  const start = data[0];
  const isUp = final >= start;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={isUp ? '#2196f3' : '#f44336'} stopOpacity="0.2" />
          <stop offset="100%" stopColor={isUp ? '#2196f3' : '#f44336'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#chartGrad)" />
      <polyline points={pts} fill="none" stroke={isUp ? '#2196f3' : '#f44336'} strokeWidth="1.5" />
    </svg>
  );
}

export default function BotDetailPage() {
  const [tab, setTab] = useState<'overview' | 'trades' | 'risk'>('overview');
  const bot = BOT;
  const m = bot.metrics;

  return (
    <div className="min-h-screen bg-mt-bg flex flex-col">
      {/* Topbar */}
      <div className="bg-mt-panel2 border-b border-border h-10 flex items-center px-4 justify-between flex-shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-mt-blue" />
          <span className="font-mono text-sm font-bold text-white tracking-wider">FOREXBOT</span>
          <span className="font-mono text-xs text-muted">v2.4</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="font-mono text-xs text-muted hover:text-white">LOGIN</Link>
          <Link href="/auth/register" className="font-mono text-xs bg-mt-blue hover:bg-blue-500 text-white px-3 py-1 transition-colors">OPEN_ACCOUNT</Link>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <Link href="/marketplace" className="flex items-center gap-1 font-mono text-xs text-muted hover:text-white transition-colors">
            <ArrowLeft className="w-3 h-3" /> Marketplace
          </Link>
          <span className="font-mono text-xs text-[#333]">/</span>
          <span className="font-mono text-xs text-white">{bot.name}</span>
        </div>

        {/* Header panel */}
        <div className="panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-mt-blue/10 border border-mt-blue/30 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-mt-blue" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-mono text-lg font-bold text-white">{bot.name}</h1>
                {bot.verified && (
                  <span className="flex items-center gap-1 font-mono text-[10px] bg-mt-green/10 border border-mt-green/30 text-mt-green px-2 py-0.5">
                    <ShieldCheck className="w-3 h-3" /> VERIFIED
                  </span>
                )}
                <span className="font-mono text-[10px] bg-surface border border-border text-muted px-2 py-0.5">{bot.platform}</span>
                <span className="font-mono text-[10px] bg-surface border border-border text-muted px-2 py-0.5">{bot.pair}</span>
                <span className="font-mono text-[10px] text-muted">{bot.version}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-xs text-muted">by {bot.seller}</span>
                <span className="font-mono text-[10px] text-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Released {bot.released}
                </span>
              </div>
              <p className="font-mono text-xs text-muted mt-2 max-w-xl leading-relaxed">{bot.description}</p>
            </div>
          </div>

          <div className="flex-shrink-0 text-right">
            <div className="font-mono text-2xl font-bold text-white">${bot.price}<span className="text-xs text-muted">/mo</span></div>
            <button className="mt-2 w-full md:w-auto bg-mt-blue hover:bg-blue-500 text-white font-mono text-xs font-semibold px-6 py-2 transition-colors block">
              &gt; SUBSCRIBE()
            </button>
            <div className="font-mono text-[10px] text-muted mt-1">7-day free trial</div>
          </div>
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: 'WIN_RATE', value: `${m.winRate}%`, pos: true },
            { label: 'PROFIT_FACTOR', value: m.profitFactor, pos: true },
            { label: 'SHARPE', value: m.sharpe, pos: true },
            { label: 'SORTINO', value: m.sortino, pos: true },
            { label: 'MAX_DD', value: `${m.maxDD}%`, pos: false },
            { label: 'EXPECTANCY', value: `$${m.expectancy}`, pos: true },
            { label: 'TOTAL_TRADES', value: m.totalTrades.toLocaleString(), pos: null },
            { label: 'NET_PROFIT', value: `$${m.totalProfit.toLocaleString()}`, pos: true },
          ].map((s) => (
            <div key={s.label} className="panel p-3">
              <div className="font-mono text-[9px] text-muted mb-1 truncate">{s.label}</div>
              <div className={`font-mono text-sm font-bold ${s.pos === true ? 'val-pos' : s.pos === false ? 'val-neg' : 'text-white'}`}>
                {String(s.value)}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b border-border flex gap-0">
          {(['overview', 'trades', 'risk'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-mono text-xs px-5 py-2 border-b-2 transition-colors uppercase tracking-wider ${
                tab === t ? 'border-mt-blue text-white' : 'border-transparent text-muted hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Equity chart */}
            <div className="lg:col-span-2 panel">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted uppercase tracking-widest">Equity Curve</span>
                <span className="font-mono text-[10px] val-pos">+{((BOT.equity[BOT.equity.length-1] - BOT.equity[0]) / BOT.equity[0] * 100).toFixed(1)}%</span>
              </div>
              <div className="p-4">
                <MiniChart data={bot.equity} />
                <div className="flex justify-between mt-2">
                  <span className="font-mono text-[10px] text-muted">Initial: $10,000</span>
                  <span className="font-mono text-[10px] val-pos">Final: ${bot.equity[bot.equity.length-1].toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Stats panel */}
            <div className="panel">
              <div className="px-4 py-2 border-b border-border">
                <span className="font-mono text-[10px] text-muted uppercase tracking-widest">Performance Stats</span>
              </div>
              <div className="divide-y divide-[#161616]">
                {[
                  { label: 'Total Trades', value: m.totalTrades.toLocaleString(), pos: null },
                  { label: 'Winning Trades', value: m.winningTrades.toLocaleString(), pos: true },
                  { label: 'Losing Trades', value: m.losingTrades.toLocaleString(), pos: false },
                  { label: 'Avg RRR', value: m.avgRRR, pos: true },
                  { label: 'Recovery Factor', value: m.recoveryFactor, pos: true },
                  { label: 'Calmar Ratio', value: m.calmar, pos: true },
                  { label: 'Max DD (abs)', value: `$${Math.abs(m.maxDDAbs)}`, pos: false },
                  { label: 'Trading Days', value: m.tradingDays, pos: null },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center px-4 py-2">
                    <span className="font-mono text-[10px] text-muted">{row.label}</span>
                    <span className={`font-mono text-xs font-semibold ${row.pos === true ? 'val-pos' : row.pos === false ? 'val-neg' : 'text-white'}`}>
                      {String(row.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'trades' && (
          <div className="panel">
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted uppercase tracking-widest">Trade History (last 8)</span>
              <span className="font-mono text-[10px] text-muted">{m.totalTrades.toLocaleString()} total trades</span>
            </div>
            <div className="overflow-x-auto">
              <table className="mt-table">
                <thead>
                  <tr>
                    <th className="text-left"><Hash className="w-3 h-3 inline" /> Ticket</th>
                    <th className="text-center">Dir</th>
                    <th className="text-left">Symbol</th>
                    <th className="text-right">Lot</th>
                    <th className="text-right">Open</th>
                    <th className="text-right">Close</th>
                    <th className="text-right">Profit</th>
                    <th className="text-right">Duration</th>
                    <th className="text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {bot.trades.map((t) => (
                    <tr key={t.ticket}>
                      <td className="text-left text-muted font-mono">{t.ticket}</td>
                      <td className="text-center">
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 ${t.dir === 'BUY' ? 'bg-mt-blue/10 text-mt-blue' : 'bg-mt-red/10 text-mt-red'}`}>
                          {t.dir === 'BUY' ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />} {t.dir}
                        </span>
                      </td>
                      <td className="text-left text-white">{t.symbol}</td>
                      <td className="text-right text-muted">{t.lot}</td>
                      <td className="text-right text-muted">{t.open}</td>
                      <td className="text-right text-muted">{t.close}</td>
                      <td className={`text-right font-semibold ${t.profit >= 0 ? 'val-pos' : 'val-neg'}`}>
                        {t.profit >= 0 ? '+' : ''}{t.profit.toFixed(2)}
                      </td>
                      <td className="text-right text-muted">{t.duration}</td>
                      <td className="text-right text-muted">{t.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'risk' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Anomaly check */}
            <div className="panel">
              <div className="px-4 py-2 border-b border-border">
                <span className="font-mono text-[10px] text-muted uppercase tracking-widest">Anomaly Detection Report</span>
              </div>
              <div className="p-4">
                {bot.anomalies.length === 0 ? (
                  <div className="flex items-center gap-3 p-4 bg-mt-green/5 border border-mt-green/20">
                    <CheckCircle2 className="w-5 h-5 text-mt-green flex-shrink-0" />
                    <div>
                      <div className="font-mono text-xs text-mt-green font-semibold">NO_ANOMALIES_DETECTED()</div>
                      <div className="font-mono text-[10px] text-muted mt-0.5">All 7 checks passed. No suspicious patterns found.</div>
                    </div>
                  </div>
                ) : (
                  bot.anomalies.map((a: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-mt-red/5 border border-mt-red/20 mb-2">
                      <AlertTriangle className="w-4 h-4 text-mt-red" />
                      <span className="font-mono text-xs text-mt-red">{a}</span>
                    </div>
                  ))
                )}

                <div className="mt-4 space-y-2">
                  {[
                    { check: 'MARTINGALE_DETECTION', pass: true },
                    { check: 'STOP_LOSS_USAGE', pass: true },
                    { check: 'EXCESSIVE_RISK_PER_TRADE', pass: true },
                    { check: 'EQUITY_CURVE_MANIPULATION', pass: true },
                    { check: 'ZERO_LOSS_DETECTION', pass: true },
                    { check: 'OVERFITTING_DETECTION', pass: true },
                    { check: 'TRADE_HISTORY_SUFFICIENCY', pass: true },
                  ].map((c) => (
                    <div key={c.check} className="flex items-center justify-between py-1.5 border-b border-[#161616]">
                      <span className="font-mono text-[10px] text-muted">{c.check}</span>
                      <span className={`font-mono text-[10px] font-semibold ${c.pass ? 'text-mt-green' : 'text-mt-red'}`}>
                        {c.pass ? '[✓] PASS' : '[✗] FAIL'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk metrics */}
            <div className="panel">
              <div className="px-4 py-2 border-b border-border">
                <span className="font-mono text-[10px] text-muted uppercase tracking-widest">Risk Assessment</span>
              </div>
              <div className="p-4 space-y-4">
                {[
                  { label: 'Max Drawdown', value: `${m.maxDD}%`, bar: Math.abs(m.maxDD) / 20, color: 'bg-mt-red', risk: 'LOW' },
                  { label: 'Win Rate', value: `${m.winRate}%`, bar: m.winRate / 100, color: 'bg-mt-blue', risk: 'GOOD' },
                  { label: 'Profit Factor', value: m.profitFactor, bar: m.profitFactor / 5, color: 'bg-mt-blue', risk: 'GOOD' },
                  { label: 'Sharpe Ratio', value: m.sharpe, bar: m.sharpe / 4, color: 'bg-mt-blue', risk: 'EXCELLENT' },
                ].map((r) => (
                  <div key={r.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-mono text-[10px] text-muted">{r.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-white">{r.value}</span>
                        <span className={`font-mono text-[9px] px-1.5 py-0.5 ${r.risk === 'EXCELLENT' || r.risk === 'GOOD' ? 'bg-mt-blue/10 text-mt-blue' : 'bg-mt-yellow/10 text-mt-yellow'}`}>
                          {r.risk}
                        </span>
                      </div>
                    </div>
                    <div className="h-1 bg-border rounded-full overflow-hidden">
                      <div className={`h-full ${r.color} transition-all`} style={{ width: `${Math.min(r.bar * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}

                <div className="mt-4 p-3 bg-mt-blue/5 border border-mt-blue/20">
                  <div className="font-mono text-[10px] text-mt-blue font-semibold mb-1">OVERALL_RISK_SCORE: LOW</div>
                  <div className="font-mono text-[10px] text-muted">This EA demonstrates strong risk-adjusted returns with controlled drawdown and consistent performance across 186 trading days.</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}