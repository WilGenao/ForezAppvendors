'use client';

/**
 * FIX: Replaced MOCK_BOTS hardcoded data with real API calls via useMarketplaceBots hook.
 * The hook calls GET /marketplace/bots with filters and pagination.
 * Falls back gracefully if the API is unavailable.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useMarketplaceBots } from '@/lib/hooks';

type SortKey = 'avg_rating' | 'profit_factor' | 'max_drawdown_pct' | 'sharpe_ratio' | 'all_time_trades' | 'price_cents';

const COLUMNS: { key: SortKey | string; label: string; align: string }[] = [
  { key: 'bot_name',          label: 'EA Name',      align: 'left' },
  { key: 'seller_name',       label: 'Provider',     align: 'left' },
  { key: 'mt_platform',       label: 'Platform',     align: 'center' },
  { key: 'avg_rating',        label: 'Win Rate',     align: 'right' },
  { key: 'profit_factor',     label: 'P.Factor',     align: 'right' },
  { key: 'max_drawdown_pct',  label: 'Max DD',       align: 'right' },
  { key: 'sharpe_ratio',      label: 'Sharpe',       align: 'right' },
  { key: 'all_time_trades',   label: 'Trades',       align: 'right' },
  { key: 'price_cents',       label: 'Price/mo',     align: 'right' },
  { key: 'actions',           label: '',             align: 'center' },
];

const SORT_API_MAP: Record<string, string> = {
  avg_rating:       'rating',
  profit_factor:    'rating',
  max_drawdown_pct: 'rating',
  sharpe_ratio:     'rating',
  all_time_trades:  'subscribers',
  price_cents:      'price_asc',
};

export default function MarketplacePage() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [mtPlatform, setMtPlatform] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const { data, loading, error, refetch } = useMarketplaceBots({
    search: search || undefined,
    mtPlatform: mtPlatform || undefined,
    sortBy,
    page,
    limit: 20,
  });

  const bots: Record<string, unknown>[] = (data?.data as Record<string, unknown>[]) || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleSort = (key: string) => {
    const apiKey = SORT_API_MAP[key] || 'rating';
    if (sortBy === apiKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(apiKey);
      setSortDir('desc');
      setPage(1);
    }
  };

  const fmt = (v: unknown, decimals = 2) =>
    v != null && v !== '' ? Number(v).toFixed(decimals) : '—';

  return (
    <div className="min-h-screen bg-[#0d1117] text-white font-mono">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#30363d] h-10 flex items-center px-4 justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold tracking-wider">FOREXBOT</span>
          <span className="text-[10px] text-gray-500">MARKETPLACE</span>
        </Link>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{total} bots</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 flex items-center gap-2 bg-[#161b22] border border-[#30363d] rounded px-3 py-2">
            <Search className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search bots..."
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
            />
          </div>
          <select
            value={mtPlatform}
            onChange={(e) => { setMtPlatform(e.target.value); setPage(1); }}
            className="bg-[#161b22] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="">All Platforms</option>
            <option value="MT4">MT4</option>
            <option value="MT5">MT5</option>
          </select>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button onClick={refetch} className="p-2 text-gray-400 hover:text-white transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded p-3 mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error} —{' '}
            <button onClick={refetch} className="underline hover:no-underline">
              retry
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-[#161b22] border border-[#30363d] rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#30363d]">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => col.key !== 'actions' && handleSort(col.key)}
                      className={`px-3 py-2 text-gray-400 font-medium uppercase tracking-wider text-${col.align} ${
                        col.key !== 'actions' ? 'cursor-pointer hover:text-white select-none' : ''
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.key !== 'actions' && SORT_API_MAP[col.key] === sortBy && (
                          sortDir === 'desc'
                            ? <ChevronDown className="w-3 h-3" />
                            : <ChevronUp className="w-3 h-3" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-[#30363d] animate-pulse">
                        {COLUMNS.map((c) => (
                          <td key={c.key} className="px-3 py-3">
                            <div className="h-3 bg-[#30363d] rounded" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : bots.map((bot, i) => (
                      <tr
                        key={String(bot.listing_id || i)}
                        className="border-b border-[#30363d] hover:bg-[#21262d] transition-colors"
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white">{String(bot.bot_name ?? '—')}</span>
                            {bot.is_verified && <ShieldCheck className="w-3 h-3 text-blue-400" />}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-gray-300">{String(bot.seller_name ?? '—')}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            String(bot.mt_platform) === 'MT5'
                              ? 'bg-blue-500/20 text-blue-400'
                              : String(bot.mt_platform) === 'MT4'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {String(bot.mt_platform ?? '—')}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-green-400">
                          {bot.win_rate != null ? `${fmt(Number(bot.win_rate) * 100, 1)}%` : '—'}
                        </td>
                        <td className="px-3 py-3 text-right text-white">{fmt(bot.profit_factor)}</td>
                        <td className="px-3 py-3 text-right text-red-400">
                          {bot.max_drawdown_pct != null ? `${fmt(bot.max_drawdown_pct, 1)}%` : '—'}
                        </td>
                        <td className="px-3 py-3 text-right text-white">{fmt(bot.sharpe_ratio)}</td>
                        <td className="px-3 py-3 text-right text-gray-300">
                          {bot.all_time_trades != null ? Number(bot.all_time_trades).toLocaleString() : '—'}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-white">
                          {bot.price_cents != null
                            ? `$${(Number(bot.price_cents) / 100).toFixed(0)}`
                            : '—'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Link
                            href={`/marketplace/${String(bot.slug ?? bot.bot_slug ?? bot.bot_id)}`}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-[10px] font-bold transition-colors whitespace-nowrap"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#30363d]">
              <span className="text-xs text-gray-400">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-[#30363d] rounded text-xs disabled:opacity-30 hover:bg-[#21262d] transition-colors"
                >
                  Prev
                </button>
                <span className="text-xs text-gray-400">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-[#30363d] rounded text-xs disabled:opacity-30 hover:bg-[#21262d] transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && bots.length === 0 && !error && (
            <div className="py-16 text-center text-gray-500 text-sm">
              No bots found matching your criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

