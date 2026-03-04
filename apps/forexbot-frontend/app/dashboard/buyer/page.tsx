'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Key, ShoppingBag, TrendingUp, AlertTriangle, CheckCircle2,
  XCircle, Loader2, Copy, Check, RefreshCw, ExternalLink,
  CreditCard, ChevronRight, Activity,
} from 'lucide-react';
import { api } from '@/lib/api';

type Subscription = {
  id: string;
  status: string;
  plan: string;
  price_cents: number;
  currency: string;
  current_period_end: string;
  canceled_at: string | null;
  bot_id: string;
  bot_name: string;
  bot_slug: string;
  mt_platform: string;
  avg_rating: number;
  seller_name: string;
  license_id: string | null;
  license_key: string | null;
  license_status: string | null;
  license_expires_at: string | null;
  last_validated_at: string | null;
  current_activations: number;
  max_activations: number;
  sharpe_ratio: number | null;
  win_rate: number | null;
  max_drawdown_pct: number | null;
  profit_factor: number | null;
};

const STATUS_STYLE: Record<string, string> = {
  active: 'text-green-400 bg-green-500/10 border-green-500/30',
  trialing: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  past_due: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  canceled: 'text-gray-500 bg-gray-500/10 border-gray-500/30',
  unpaid: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const LICENSE_STATUS_STYLE: Record<string, string> = {
  active: 'text-green-400',
  expired: 'text-red-400',
  revoked: 'text-red-500',
  suspended: 'text-yellow-400',
};

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
    } catch {
      showToast('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/auth/login'); return; }
    load();
  }, [router, load]);

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this subscription at the end of the billing period?')) return;
    setActing(true);
    try {
      await api.post(`/subscriptions/${id}/cancel`);
      showToast('Subscription will cancel at period end');
      load();
    } catch (e: unknown) {
      showToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error');
    } finally { setActing(false); }
  };

  const handleReactivate = async (id: string) => {
    setActing(true);
    try {
      await api.post(`/subscriptions/${id}/reactivate`);
      showToast('Subscription reactivated ✓');
      load();
    } catch (e: unknown) {
      showToast((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error');
    } finally { setActing(false); }
  };

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await api.get('/subscriptions/billing-portal');
      window.location.href = res.data;
    } catch {
      showToast('Could not open billing portal');
    } finally { setPortalLoading(false); }
  };

  const activeSubs = subs.filter(s => ['active', 'trialing'].includes(s.status));
  const licenses = subs.filter(s => s.license_key);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white font-mono">
      {/* Top bar */}
      <div className="bg-[#161b22] border-b border-[#30363d] h-10 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold tracking-wider">FOREXBOT</span>
          <span className="text-[10px] text-gray-500">BUYER DASHBOARD</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openBillingPortal} disabled={portalLoading}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white border border-[#30363d] hover:border-gray-500 px-3 py-1 rounded transition-colors">
            {portalLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
            Billing
          </button>
          <button onClick={load} className="text-gray-500 hover:text-white p-1">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-14 right-4 z-50 bg-[#161b22] border border-[#30363d] px-4 py-2.5 rounded text-xs text-white shadow-lg">{toast}</div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active Subs', value: activeSubs.length, icon: ShoppingBag, color: 'text-green-400' },
            { label: 'Total Bots', value: subs.length, icon: TrendingUp, color: 'text-blue-400' },
            { label: 'Licenses', value: licenses.length, icon: Key, color: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#161b22] border border-[#30363d] rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">{s.label}</span>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[#30363d]">
          {(['subscriptions', 'licenses'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors uppercase tracking-wider ${tab === t ? 'border-blue-400 text-white' : 'border-transparent text-gray-500 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        )}

        {/* Subscriptions tab */}
        {!loading && tab === 'subscriptions' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* List */}
            <div className="bg-[#161b22] border border-[#30363d] rounded overflow-hidden">
              {subs.length === 0 && (
                <div className="flex flex-col items-center py-12 text-gray-600">
                  <ShoppingBag className="w-8 h-8 mb-2" />
                  <p className="text-sm">No subscriptions yet.</p>
                  <Link href="/marketplace" className="text-blue-400 text-xs mt-2 hover:underline">Browse bots →</Link>
                </div>
              )}
              {subs.map(sub => (
                <div key={sub.id} onClick={() => setSelected(sub)}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-[#30363d] cursor-pointer transition-colors ${selected?.id === sub.id ? 'bg-[#21262d]' : 'hover:bg-[#1c2128]'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold truncate">{sub.bot_name}</p>
                    <p className="text-gray-500 text-xs">{sub.seller_name} · {sub.plan.replace('subscription_', '')}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${STATUS_STYLE[sub.status]}`}>
                      {sub.status.toUpperCase()}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                </div>
              ))}
            </div>

            {/* Detail */}
            <div className="bg-[#161b22] border border-[#30363d] rounded overflow-hidden">
              {!selected ? (
                <div className="flex items-center justify-center py-20 text-gray-600 text-sm">Select a subscription</div>
              ) : (
                <>
                  <div className="px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">{selected.bot_name}</span>
                    <Link href={`/marketplace/${selected.bot_slug}`}
                      className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors">
                      <ExternalLink className="w-3 h-3" /> View Bot
                    </Link>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { label: 'Plan', value: selected.plan.replace('subscription_', '').toUpperCase() },
                        { label: 'Price', value: `$${(selected.price_cents / 100).toFixed(2)}/${selected.plan.includes('yearly') ? 'yr' : 'mo'}` },
                        { label: 'Platform', value: selected.mt_platform },
                        { label: 'Seller', value: selected.seller_name },
                        { label: 'Next Billing', value: selected.canceled_at ? 'Cancels at period end' : selected.current_period_end ? new Date(selected.current_period_end).toLocaleDateString() : '—' },
                        { label: 'Status', value: selected.status.toUpperCase() },
                      ].map(item => (
                        <div key={item.label}>
                          <p className="text-gray-500">{item.label}</p>
                          <p className="text-white font-medium">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Performance stats */}
                    {selected.sharpe_ratio != null && (
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { label: 'SHARPE', value: selected.sharpe_ratio?.toFixed(2) ?? '—', color: 'text-blue-400' },
                          { label: 'WIN RATE', value: selected.win_rate != null ? `${(selected.win_rate * 100).toFixed(1)}%` : '—', color: 'text-green-400' },
                          { label: 'MAX DD', value: selected.max_drawdown_pct != null ? `${selected.max_drawdown_pct.toFixed(1)}%` : '—', color: 'text-red-400' },
                          { label: 'PROFIT F.', value: selected.profit_factor?.toFixed(2) ?? '—', color: 'text-purple-400' },
                        ].map(stat => (
                          <div key={stat.label} className="bg-[#0d1117] border border-[#30363d] rounded p-2 text-center">
                            <p className="text-[9px] text-gray-500 mb-1">{stat.label}</p>
                            <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* License key */}
                    {selected.license_key && (
                      <div className="bg-[#0d1117] border border-[#30363d] rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest">License Key</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold ${LICENSE_STATUS_STYLE[selected.license_status ?? 'active']}`}>
                              {selected.license_status?.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-gray-600">
                              {selected.current_activations}/{selected.max_activations} activations
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-[11px] text-green-400 bg-[#161b22] px-2 py-1.5 rounded truncate">
                            {selected.license_key}
                          </code>
                          <button onClick={() => copyKey(selected.license_key!)}
                            className="p-1.5 bg-[#21262d] hover:bg-[#30363d] rounded transition-colors shrink-0">
                            {copiedKey === selected.license_key
                              ? <Check className="w-3.5 h-3.5 text-green-400" />
                              : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                          </button>
                        </div>
                        {selected.last_validated_at && (
                          <p className="text-[10px] text-gray-600 mt-1.5">
                            Last validated: {new Date(selected.last_validated_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      {selected.canceled_at && selected.status !== 'canceled' ? (
                        <button onClick={() => handleReactivate(selected.id)} disabled={acting}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded text-xs font-bold transition-colors">
                          {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Reactivate
                        </button>
                      ) : selected.status === 'active' || selected.status === 'trialing' ? (
                        <button onClick={() => handleCancel(selected.id)} disabled={acting}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#21262d] hover:bg-red-900/40 border border-[#30363d] hover:border-red-500/40 disabled:opacity-50 rounded text-xs font-bold text-gray-400 hover:text-red-400 transition-colors">
                          {acting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                          Cancel at Period End
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
          <div className="bg-[#161b22] border border-[#30363d] rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#30363d]">
                    {['Bot', 'License Key', 'Platform', 'Status', 'Activations', 'Last Validated'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] text-gray-500 uppercase tracking-wider font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {licenses.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-10 text-center text-gray-600">No licenses yet.</td></tr>
                  )}
                  {licenses.map(sub => (
                    <tr key={sub.license_id} className="border-b border-[#30363d] hover:bg-[#1c2128] transition-colors">
                      <td className="px-3 py-3">
                        <p className="text-white font-bold">{sub.bot_name}</p>
                        <p className="text-gray-500 text-[10px]">{sub.seller_name}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <code className="text-green-400 text-[11px]">{sub.license_key?.slice(0, 20)}...</code>
                          <button onClick={() => copyKey(sub.license_key!)}
                            className="p-1 hover:bg-[#30363d] rounded transition-colors">
                            {copiedKey === sub.license_key
                              ? <Check className="w-3 h-3 text-green-400" />
                              : <Copy className="w-3 h-3 text-gray-500" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold">{sub.mt_platform}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`font-bold ${LICENSE_STATUS_STYLE[sub.license_status ?? 'active']}`}>
                          {sub.license_status?.toUpperCase() ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-white">
                        {sub.current_activations}/{sub.max_activations}
                      </td>
                      <td className="px-3 py-3 text-gray-500">
                        {sub.last_validated_at ? new Date(sub.last_validated_at).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
