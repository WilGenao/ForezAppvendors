'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Activity, Search, SlidersHorizontal, ShieldCheck, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import { marketplaceApi } from '@/lib/api';

const MOCK_BOTS = [
  { id: 1, slug: '1', name: 'EuroScalper.Pro', seller: 'AlgoTrader Labs', pair: 'EURUSD', platform: 'MT5', wr: 68.4, pf: 2.54, dd: -4.2, sharpe: 2.31, trades: 1842, price: 89, verified: true },
  { id: 2, slug: '2', name: 'GoldRush.Swing', seller: 'QuantFX Capital', pair: 'XAUUSD', platform: 'MT4', wr: 61.2, pf: 1.98, dd: -6.8, sharpe: 1.87, trades: 934, price: 129, verified: true },
  { id: 3, slug: '3', name: 'TrendHarvester.v3', seller: 'SilverFox Systems', pair: 'MULTI', platform: 'BOTH', wr: 54.9, pf: 3.21, dd: -3.1, sharpe: 3.12, trades: 2201, price: 199, verified: true },
  { id: 4, slug: '4', name: 'AsiaBreakout.v2', seller: 'NightOwl Trading', pair: 'USDJPY', platform: 'MT5', wr: 72.1, pf: 2.88, dd: -5.4, sharpe: 2.64, trades: 1103, price: 149, verified: true },
  { id: 5, slug: '5', name: 'NightScalper.EA', seller: 'LondonFX Group', pair: 'GBPUSD', platform: 'MT4', wr: 66.3, pf: 2.11, dd: -7.2, sharpe: 1.94, trades: 3420, price: 79, verified: false },
  { id: 6, slug: '6', name: 'VolatilityHunter', seller: 'AlphaQuant LLC', pair: 'MULTI', platform: 'MT5', wr: 58.7, pf: 2.67, dd: -8.1, sharpe: 2.18, trades: 776, price: 249, verified: true },
  { id: 7, slug: '7', name: 'CableRider.Pro', seller: 'BritishAlgo Co', pair: 'GBPUSD', platform: 'MT4', wr: 63.8, pf: 2.02, dd: -5.9, sharpe: 1.76, trades: 1567, price: 99, verified: true },
  { id: 8, slug: '8', name: 'AussieGrid.EA', seller: 'PacificQuant', pair: 'AUDUSD', platform: 'BOTH', wr: 51.2, pf: 1.74, dd: -11.3, sharpe: 1.44, trades: 4891, price: 59, verified: false },
  { id: 9, slug: '9', name: 'SwissFranc.Bot', seller: 'AlpineTraders', pair: 'USDCHF', platform: 'MT5', wr: 69.4, pf: 2.93, dd: -4.7, sharpe: 2.87, trades: 621, price: 179, verified: true },
  { id: 10, slug: '10', name: 'NewsTrader.v4', seller: 'EventFX Systems', pair: 'MULTI', platform: 'BOTH', wr: 74.2, pf: 3.44, dd: -2.8, sharpe: 3.61, trades: 312, price: 299, verified: true },
];

type Bot = typeof MOCK_BOTS[0];
type SortKey = 'wr' | 'pf' | 'dd' | 'sharpe' | 'trades' | 'price';

const COLUMNS = [
  { key: 'name', label: 'EA Name', align: 'left' },
  { key: 'seller', label: 'Provider', align: 'left' },
  { key: 'pair', label: 'Symbol', align: 'center' },
  { key: 'platform', label: 'Platform', align: 'center' },
  { key: 'wr', label: 'Win Rate', align: 'right' },
  { key: 'pf', label: 'Profit Factor', align: 'right' },
  { key: 'dd', label: 'Max DD', align: 'right' },
  { key: 'sharpe', label: 'Sharpe', align: 'right' },
  { key: 'trades', label: 'Trades', align: 'right' },
  { key: 'price', label: 'Price/mo', align: 'right' },
];

export default function MarketplacePage() {
  const [bots, setBots] = useState<Bot[]>(MOCK_BOTS);
  const [loading, setLoading] = useState(true);
  const [apiSource, setApiSource] = useState(false);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('ALL');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('sharpe');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    marketplaceApi.listBots({ page: 1, limit: 50 })
      .then(res => {
        if (res.data.data && res.data.data.length > 0) {
          const apiBots = res.data.data.map((b: Record<string, unknown>, i: number) => ({
            id: i + 1,
            slug: b.slug as string,
            name: b.bot_name as string || b.name as string,
            seller: b.seller_name as string || 'Unknown',
            pair: (b.currency_pairs as string[])?.[0] || 'MULTI',
            platform: b.mt_platform as string || 'MT5',
            wr: Number(b.win_rate) || 0,
            pf: Number(b.profit_factor) || 0,
            dd: Number(b.max_drawdown_pct) || 0,
            sharpe: Number(b.sharpe_ratio) || 0,
            trades: Number(b.total_trades) || 0,
            price: Number(b.price_cents) / 100 || 0,
            verified: b.is_verified as boolean || false,
          }));
          setBots(apiBots);
          setApiSource(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (key: string) => {
    if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key as SortKey); setSortDir('desc'); }
  };

  const filtered = bots
    .filter(b => {
      if (search && !b.name.toLowerCase().includes(search.toLowerCase()) && !b.pair.toLowerCase().includes(search.toLowerCase())) return false;
      if (platform !== 'ALL' && b.platform !== platform && b.platform !== 'BOTH') return false;
      if (verifiedOnly && !b.verified) return false;
      return true;
    })
    .sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === 'desc' ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
    });

  return (
    <div className="min-h-screen bg-mt-bg flex flex-col">
      <div className="bg-mt-panel2 border-b border-border h-10 flex items-center px-4 justify-between flex-shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-mt-blue" />
          <span className="font-mono text-sm font-bold text-white tracking-wider">FOREXBOT</span>
          <span className="font-mono text-xs text-muted">v2.4</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-muted hidden md:block">
            {apiSource ? <span className="text-mt-green">● API LIVE</span> : <span className="text-mt-yellow">● DEMO DATA</span>}
          </span>
          <Link href="/auth/login" className="font-mono text-xs text-muted hover:text-white">LOGIN</Link>
          <Link href="/auth/register" className="font-mono text-xs bg-mt-blue hover:bg-blue-500 text-white px-3 py-1 transition-colors">OPEN_ACCOUNT</Link>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:flex w-56 border-r border-border flex-col bg-mt-panel2 flex-shrink-0">
          <div className="px-4 py-2 border-b border-border flex items-center gap-2">
            <SlidersHorizontal className="w-3 h-3 text-muted" />
            <span className="font-mono text-[10px] text-muted tracking-widest uppercase">Filters</span>
          </div>
          <div className="p-3 space-y-4 overflow-y-auto flex-1">
            <div>
              <div className="font-mono text-[10px] text-muted uppercase tracking-wider mb-2">// Platform</div>
              {['ALL', 'MT4', 'MT5', 'BOTH'].map(p => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={`w-full text-left font-mono text-xs px-3 py-1.5 mb-0.5 transition-colors ${platform === p ? 'bg-mt-blue text-white' : 'text-muted hover:text-white hover:bg-surface'}`}>
                  {platform === p ? '► ' : '  '}{p}
                </button>
              ))}
            </div>
            <div>
              <div className="font-mono text-[10px] text-muted uppercase tracking-wider mb-2">// Verification</div>
              <button onClick={() => setVerifiedOnly(!verifiedOnly)}
                className={`w-full text-left font-mono text-xs px-3 py-1.5 transition-colors flex items-center gap-2 ${verifiedOnly ? 'bg-mt-blue text-white' : 'text-muted hover:text-white hover:bg-surface'}`}>
                <ShieldCheck className="w-3 h-3" /> Verified Only
              </button>
            </div>
            <div className="border-t border-border pt-3">
              <div className="font-mono text-[10px] text-muted uppercase tracking-wider mb-2">// Summary</div>
              <div className="space-y-1">
                {[
                  { label: 'SHOWING', value: `${filtered.length}/${bots.length}` },
                  { label: 'VERIFIED', value: filtered.filter(b => b.verified).length, pos: true },
                  { label: 'AVG_SHARPE', value: filtered.length ? (filtered.reduce((s, b) => s + b.sharpe, 0) / filtered.length).toFixed(2) : '—', pos: true },
                  { label: 'AVG_WINRATE', value: filtered.length ? `${(filtered.reduce((s, b) => s + b.wr, 0) / filtered.length).toFixed(1)}%` : '—', pos: true },
                ].map(s => (
                  <div key={s.label} className="flex justify-between">
                    <span className="font-mono text-[10px] text-muted">{s.label}</span>
                    <span className={`font-mono text-[10px] ${'pos' in s && s.pos ? 'val-pos' : 'text-white'}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-border px-4 py-2 flex items-center gap-3 bg-mt-panel2 flex-shrink-0">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted" />
              <input type="text" placeholder="Search EA, symbol..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-mt-bg border border-border focus:border-mt-blue text-white placeholder-[#333] font-mono text-xs pl-7 pr-3 py-1.5 outline-none transition-colors" />
            </div>
            {loading && <RefreshCw className="w-3 h-3 text-muted animate-spin" />}
            <div className="ml-auto">
              <span className="font-mono text-[10px] text-muted">{filtered.length} results</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="mt-table w-full">
              <thead className="sticky top-0 bg-mt-panel2 z-10">
                <tr>
                  {COLUMNS.map(col => (
                    <th key={col.key} onClick={() => ['wr','pf','dd','sharpe','trades','price'].includes(col.key) && handleSort(col.key)}
                      className={`${col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right'} ${['wr','pf','dd','sharpe','trades','price'].includes(col.key) ? 'cursor-pointer hover:text-white' : ''} select-none`}>
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortKey === col.key && (sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
                      </span>
                    </th>
                  ))}
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(bot => (
                  <tr key={bot.id} onClick={() => setSelected(selected === bot.id ? null : bot.id)}
                    className={`cursor-pointer ${selected === bot.id ? 'bg-mt-blue/10 border-l-2 border-mt-blue' : ''}`}>
                    <td className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white font-semibold">{bot.name}</span>
                        {bot.verified && <ShieldCheck className="w-3 h-3 text-mt-green flex-shrink-0" />}
                      </div>
                    </td>
                    <td className="text-left text-muted">{bot.seller}</td>
                    <td className="text-center"><span className="font-mono text-[10px] bg-surface border border-border px-1.5 py-0.5 text-white">{bot.pair}</span></td>
                    <td className="text-center">
                      <span className={`font-mono text-[10px] ${bot.platform === 'MT5' ? 'text-mt-blue' : bot.platform === 'MT4' ? 'text-mt-yellow' : 'text-mt-green'}`}>{bot.platform}</span>
                    </td>
                    <td className="text-right val-pos">{bot.wr > 0 ? `${bot.wr}%` : '—'}</td>
                    <td className="text-right val-pos">{bot.pf > 0 ? bot.pf : '—'}</td>
                    <td className="text-right val-neg">{bot.dd < 0 ? `${bot.dd}%` : '—'}</td>
                    <td className={`text-right ${bot.sharpe >= 2.5 ? 'val-pos' : bot.sharpe >= 2 ? 'text-mt-yellow' : 'text-muted'}`}>{bot.sharpe > 0 ? bot.sharpe : '—'}</td>
                    <td className="text-right text-muted">{bot.trades > 0 ? bot.trades.toLocaleString() : '—'}</td>
                    <td className="text-right text-white font-semibold">{bot.price > 0 ? `$${bot.price}` : 'Free'}</td>
                    <td className="text-center">
                      <Link href={`/marketplace/${bot.slug}`} onClick={e => e.stopPropagation()}
                        className="font-mono text-[10px] bg-mt-blue hover:bg-blue-500 text-white px-2 py-1 transition-colors inline-block">
                        VIEW
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && !loading && (
              <div className="flex items-center justify-center py-20">
                <p className="font-mono text-xs text-muted">&gt; NO_RESULTS_FOUND()</p>
              </div>
            )}
          </div>

          <div className="border-t border-border px-4 py-1.5 bg-mt-panel2 flex items-center justify-between flex-shrink-0">
            <span className="font-mono text-[10px] text-muted">{filtered.length} EAs · {apiSource ? 'Live API data' : 'Demo data'}</span>
            <span className="font-mono text-[10px] text-mt-green">● LIVE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
