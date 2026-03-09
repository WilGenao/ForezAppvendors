'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Key, ShoppingBag, TrendingUp, AlertCircle, CheckCircle,
  XCircle, Loader2, Copy, Check, RefreshCw, ExternalLink,
  CreditCard, ChevronRight, ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';

type Subscription = {
  id: string; status: string; plan: string; price_cents: number; currency: string;
  current_period_end: string; canceled_at: string | null; bot_id: string; bot_name: string;
  bot_slug: string; mt_platform: string; avg_rating: number; seller_name: string;
  license_id: string | null; license_key: string | null; license_status: string | null;
  license_expires_at: string | null; last_validated_at: string | null;
  current_activations: number; max_activations: number;
  sharpe_ratio: number | null; win_rate: number | null;
  max_drawdown_pct: number | null; profit_factor: number | null;
};

const STATUS: Record<string, { color: string; bg: string; border: string }> = {
  active:   { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  trialing: { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  past_due: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  canceled: { color: '#94A3B8', bg: '#F8FAFC', border: '#E2E8F0' },
  unpaid:   { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
};

const card = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

export default function BuyerDashboardPage() {
  const router = useRouter();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [selected, setSelected] = useState<Subscription | null>(null);
  const [tab, setTab] = useState<'subscriptions' | 'licenses'>('subscriptions');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const [toast, setToast] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/subscriptions');
      setSubs(res.data);
      if (res.data.length > 0 && !selected) setSelected(res.data[0]);
    } catch { showToast('Failed to load subscriptions'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/auth/login'); return; }
    load();
  }, [router, load]);

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key); setTimeout(() => setCopiedKey(''), 2000);
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel at period end?')) return;
    setActing(true);
    try { await api.post(`/subscriptions/${id}/cancel`); showToast('Cancels at period end'); load(); }
    catch (e: unknown) { showToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'); }
    finally { setActing(false); }
  };

  const handleReactivate = async (id: string) => {
    setActing(true);
    try { await api.post(`/subscriptions/${id}/reactivate`); showToast('Reactivated ✓'); load(); }
    catch (e: unknown) { showToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error'); }
    finally { setActing(false); }
  };

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try { const res = await api.get('/subscriptions/billing-portal'); window.location.href = res.data; }
    catch { showToast('Could not open billing portal'); }
    finally { setPortalLoading(false); }
  };

  const activeSubs = subs.filter(s => ['active', 'trialing'].includes(s.status));
  const licenses = subs.filter(s => s.license_key);

  return (
    <div style={{ padding: 28, fontFamily: 'DM Sans, sans-serif', minHeight: '100vh' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, background: '#0A1628', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26, color: '#0A1628', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 2 }}>My Subscriptions</h1>
          <p style={{ fontSize: 14, color: '#64748B' }}>Manage your EA subscriptions and license keys</p>
        </div>
        <button onClick={openBillingPortal} disabled={portalLoading} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#475569', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          {portalLoading ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <CreditCard style={{ width: 14, height: 14 }} />}
          Billing Portal
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Active Subscriptions', value: activeSubs.length, icon: ShoppingBag, color: '#059669', bg: '#ECFDF5' },
          { label: 'Total Bots', value: subs.length, icon: TrendingUp, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'License Keys', value: licenses.length, icon: Key, color: '#7C3AED', bg: '#F5F3FF' },
        ].map(s => (
          <div key={s.label} style={{ ...card, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>{s.label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon style={{ width: 16, height: 16, color: s.color }} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#0A1628', fontFamily: 'DM Serif Display, serif' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #E2E8F0', paddingBottom: 0 }}>
        {(['subscriptions', 'licenses'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ fontSize: 14, fontWeight: tab === t ? 600 : 500, color: tab === t ? '#2563EB' : '#64748B', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t ? '#2563EB' : 'transparent'}`, padding: '8px 16px', cursor: 'pointer', textTransform: 'capitalize', marginBottom: -1 }}>
            {t}
          </button>
        ))}
        <button onClick={load} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '8px' }}>
          <RefreshCw style={{ width: 14, height: 14, ...(loading ? { animation: 'spin 1s linear infinite' } : {}) }} />
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 10, color: '#94A3B8' }}>
          <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 14 }}>Loading...</span>
        </div>
      )}

      {/* Subscriptions tab */}
      {!loading && tab === 'subscriptions' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16 }}>
          {/* List */}
          <div style={{ ...card, overflow: 'hidden' }}>
            {subs.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', gap: 10 }}>
                <ShoppingBag style={{ width: 32, height: 32, color: '#CBD5E1' }} />
                <p style={{ fontSize: 14, color: '#64748B' }}>No subscriptions yet</p>
                <Link href="/marketplace" style={{ fontSize: 13, color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>Browse EAs →</Link>
              </div>
            ) : subs.map(sub => {
              const st = STATUS[sub.status] || STATUS.canceled;
              const active = selected?.id === sub.id;
              return (
                <div key={sub.id} onClick={() => setSelected(sub)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #F1F5F9', cursor: 'pointer', background: active ? '#EFF6FF' : '#fff', transition: 'background 0.15s' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0A1628', marginBottom: 2 }}>{sub.bot_name}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>{sub.seller_name} · {sub.mt_platform}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 100, padding: '2px 8px' }}>{sub.status.toUpperCase()}</span>
                    <ChevronRight style={{ width: 14, height: 14, color: active ? '#2563EB' : '#CBD5E1' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail */}
          <div style={{ ...card, overflow: 'hidden' }}>
            {!selected ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, color: '#94A3B8', fontSize: 14 }}>
                Select a subscription
              </div>
            ) : (
              <>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#0A1628' }}>{selected.bot_name}</span>
                    {selected.avg_rating > 0 && <span style={{ fontSize: 11, color: '#F59E0B' }}>★ {selected.avg_rating?.toFixed(1)}</span>}
                  </div>
                  <Link href={`/marketplace/${selected.bot_slug}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#2563EB', textDecoration: 'none' }}>
                    <ExternalLink style={{ width: 12, height: 12 }} /> View
                  </Link>
                </div>

                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Info grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Plan', value: selected.plan.replace('subscription_', '').toUpperCase() },
                      { label: 'Price', value: `$${(selected.price_cents / 100).toFixed(2)}${selected.plan.includes('yearly') ? '/yr' : '/mo'}` },
                      { label: 'Platform', value: selected.mt_platform },
                      { label: 'Seller', value: selected.seller_name },
                      { label: 'Next Billing', value: selected.canceled_at ? 'Cancels at period end' : selected.current_period_end ? new Date(selected.current_period_end).toLocaleDateString() : '—' },
                    ].map(item => (
                      <div key={item.label} style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginBottom: 3 }}>{item.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Performance */}
                  {selected.sharpe_ratio != null && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {[
                        { label: 'Sharpe', value: selected.sharpe_ratio?.toFixed(2) ?? '—', color: '#2563EB' },
                        { label: 'Win Rate', value: selected.win_rate != null ? `${(selected.win_rate * 100).toFixed(1)}%` : '—', color: '#059669' },
                        { label: 'Max DD', value: selected.max_drawdown_pct != null ? `${selected.max_drawdown_pct.toFixed(1)}%` : '—', color: '#DC2626' },
                        { label: 'Prof. F.', value: selected.profit_factor?.toFixed(2) ?? '—', color: '#7C3AED' },
                      ].map(m => (
                        <div key={m.label} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>{m.label}</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: m.color, fontFamily: 'JetBrains Mono, monospace' }}>{m.value}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* License key */}
                  {selected.license_key && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', fontWeight: 600 }}>
                          <Key style={{ width: 13, height: 13 }} /> License Key
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>{selected.license_status?.toUpperCase()}</span>
                          <span style={{ fontSize: 11, color: '#94A3B8' }}>{selected.current_activations}/{selected.max_activations} uses</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code style={{ flex: 1, fontSize: 12, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 6, padding: '7px 10px', fontFamily: 'JetBrains Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.license_key}</code>
                        <button onClick={() => copyKey(selected.license_key!)} style={{ padding: 7, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, cursor: 'pointer' }}>
                          {copiedKey === selected.license_key ? <Check style={{ width: 14, height: 14, color: '#059669' }} /> : <Copy style={{ width: 14, height: 14, color: '#94A3B8' }} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {selected.canceled_at && selected.status !== 'canceled' ? (
                      <button onClick={() => handleReactivate(selected.id)} disabled={acting} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        {acting ? <Loader2 style={{ width: 14, height: 14 }} /> : <CheckCircle style={{ width: 14, height: 14 }} />} Reactivate
                      </button>
                    ) : selected.status === 'active' || selected.status === 'trialing' ? (
                      <button onClick={() => handleCancel(selected.id)} disabled={acting} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px', background: '#fff', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        {acting ? <Loader2 style={{ width: 14, height: 14 }} /> : <XCircle style={{ width: 14, height: 14 }} />} Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Licenses tab */}
      {!loading && tab === 'licenses' && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                {['Bot', 'License Key', 'Platform', 'Status', 'Activations', 'Last Validated'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {licenses.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: '#94A3B8' }}>No licenses yet.</td></tr>
              )}
              {licenses.map(sub => (
                <tr key={sub.license_id} style={{ borderBottom: '1px solid #F1F5F9' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFC'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0A1628' }}>{sub.bot_name}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>{sub.seller_name}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <code style={{ fontSize: 11, color: '#059669', fontFamily: 'JetBrains Mono, monospace' }}>{sub.license_key?.slice(0, 20)}...</code>
                      <button onClick={() => copyKey(sub.license_key!)} style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
                        {copiedKey === sub.license_key ? <Check style={{ width: 12, height: 12, color: '#059669' }} /> : <Copy style={{ width: 12, height: 12, color: '#94A3B8' }} />}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '2px 8px' }}>{sub.mt_platform}</span></td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#059669', fontSize: 12 }}>{sub.license_status?.toUpperCase() ?? '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#334155' }}>{sub.current_activations}/{sub.max_activations}</td>
                  <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: 12 }}>{sub.last_validated_at ? new Date(sub.last_validated_at).toLocaleDateString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
