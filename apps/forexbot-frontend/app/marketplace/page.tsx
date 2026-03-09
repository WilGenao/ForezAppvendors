'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, ShieldCheck, ChevronUp, ChevronDown, RefreshCw, AlertCircle, TrendingUp } from 'lucide-react';
import { useMarketplaceBots } from '@/lib/hooks';

type SortKey = 'avg_rating' | 'profit_factor' | 'max_drawdown_pct' | 'sharpe_ratio' | 'all_time_trades' | 'price_cents';

const COLUMNS: { key: string; label: string; align: string }[] = [
  { key: 'bot_name',         label: 'Algorithm',    align: 'left' },
  { key: 'seller_name',      label: 'Provider',     align: 'left' },
  { key: 'mt_platform',      label: 'Platform',     align: 'center' },
  { key: 'avg_rating',       label: 'Win Rate',     align: 'right' },
  { key: 'profit_factor',    label: 'Prof. Factor', align: 'right' },
  { key: 'max_drawdown_pct', label: 'Max DD',       align: 'right' },
  { key: 'sharpe_ratio',     label: 'Sharpe',       align: 'right' },
  { key: 'all_time_trades',  label: 'Trades',       align: 'right' },
  { key: 'price_cents',      label: 'Price/mo',     align: 'right' },
  { key: 'actions',          label: '',             align: 'center' },
];

const SORT_API_MAP: Record<string, string> = {
  avg_rating: 'rating', profit_factor: 'rating', max_drawdown_pct: 'rating',
  sharpe_ratio: 'rating', all_time_trades: 'subscribers', price_cents: 'price_asc',
};

export default function MarketplacePage() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [mtPlatform, setMtPlatform] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const { data, loading, error, refetch } = useMarketplaceBots({ search: search || undefined, mtPlatform: mtPlatform || undefined, sortBy, page, limit: 20 });

  const bots: Record<string, unknown>[] = (data?.data as Record<string, unknown>[]) || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const handleSearch = () => { setSearch(searchInput); setPage(1); };
  const handleSort = (key: string) => {
    const apiKey = SORT_API_MAP[key] || 'rating';
    if (sortBy === apiKey) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortBy(apiKey); setSortDir('desc'); setPage(1); }
  };
  const fmt = (v: unknown, d = 2) => v != null && v !== '' ? Number(v).toFixed(d) : '—';

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', background: '#F8FAFC', minHeight: '100vh' }}>
      {/* Hero bar */}
      <div style={{ background: '#0A1628', padding: '28px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <TrendingUp style={{ width: 20, height: 20, color: '#60A5FA' }} />
            <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26, color: '#fff', fontWeight: 400, letterSpacing: '-0.02em' }}>Algorithm Marketplace</h1>
          </div>
          <p style={{ fontSize: 14, color: '#475569' }}>{total} verified algorithms available · Real forward-test data only</p>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 32px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '9px 14px' }}>
            <Search style={{ width: 15, height: 15, color: '#94A3B8', flexShrink: 0 }} />
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search algorithms by name or strategy..."
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#334155', fontFamily: 'DM Sans, sans-serif', background: 'transparent' }} />
          </div>
          <select value={mtPlatform} onChange={e => { setMtPlatform(e.target.value); setPage(1); }}
            style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '9px 14px', fontSize: 14, color: '#334155', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}>
            <option value="">All Platforms</option>
            <option value="MT4">MT4</option>
            <option value="MT5">MT5</option>
          </select>
          <button onClick={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <SlidersHorizontal style={{ width: 14, height: 14 }} /> Filter
          </button>
          <button onClick={refetch} style={{ padding: 9, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 8, cursor: 'pointer' }}>
            <RefreshCw style={{ width: 15, height: 15, color: '#64748B' }} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#DC2626' }}>
            <AlertCircle style={{ width: 15, height: 15 }} /> {error}
            <button onClick={refetch} style={{ marginLeft: 'auto', textDecoration: 'underline', background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 13 }}>Retry</button>
          </div>
        )}

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                  {COLUMNS.map(col => (
                    <th key={col.key} onClick={() => col.key !== 'actions' && handleSort(col.key)}
                      style={{ padding: '11px 16px', textAlign: col.align as 'left' | 'center' | 'right', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', cursor: col.key !== 'actions' ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {col.label}
                        {col.key !== 'actions' && SORT_API_MAP[col.key] === sortBy && (
                          sortDir === 'desc' ? <ChevronDown style={{ width: 12, height: 12 }} /> : <ChevronUp style={{ width: 12, height: 12 }} />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    {COLUMNS.map(c => (
                      <td key={c.key} style={{ padding: '14px 16px' }}>
                        <div style={{ height: 12, background: '#F1F5F9', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
                      </td>
                    ))}
                  </tr>
                )) : bots.map((bot, i) => (
                  <tr key={String(bot.listing_id || i)} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFC'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontWeight: 600, color: '#0A1628' }}>{String(bot.bot_name ?? '—')}</span>
                        {bot.is_verified && <ShieldCheck style={{ width: 13, height: 13, color: '#2563EB' }} />}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{String(bot.seller_name ?? '—')}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: String(bot.mt_platform) === 'MT5' ? '#2563EB' : '#7C3AED', background: String(bot.mt_platform) === 'MT5' ? '#EFF6FF' : '#F5F3FF', border: `1px solid ${String(bot.mt_platform) === 'MT5' ? '#BFDBFE' : '#DDD6FE'}`, borderRadius: 6, padding: '2px 8px' }}>
                        {String(bot.mt_platform ?? '—')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#059669', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                      {bot.win_rate != null ? `${fmt(Number(bot.win_rate) * 100, 1)}%` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>{fmt(bot.profit_factor)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#DC2626', fontFamily: 'JetBrains Mono, monospace' }}>
                      {bot.max_drawdown_pct != null ? `${fmt(bot.max_drawdown_pct, 1)}%` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>{fmt(bot.sharpe_ratio)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#475569' }}>
                      {bot.all_time_trades != null ? Number(bot.all_time_trades).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0A1628', fontFamily: 'DM Serif Display, serif', fontSize: 15 }}>
                      {bot.price_cents != null ? `$${(Number(bot.price_cents) / 100).toFixed(0)}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <Link href={`/marketplace/${String(bot.slug ?? bot.bot_slug ?? bot.bot_id)}`}
                        style={{ fontSize: 12, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '5px 12px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: 13, color: '#64748B' }}>Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} algorithms</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '6px 14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: 13, color: '#475569', opacity: page === 1 ? 0.4 : 1 }}>
                  Previous
                </button>
                <span style={{ fontSize: 13, color: '#64748B' }}>{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '6px 14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, color: '#475569', opacity: page === totalPages ? 0.4 : 1 }}>
                  Next
                </button>
              </div>
            </div>
          )}

          {!loading && bots.length === 0 && !error && (
            <div style={{ padding: '60px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>No algorithms found matching your criteria.</div>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  );
}
