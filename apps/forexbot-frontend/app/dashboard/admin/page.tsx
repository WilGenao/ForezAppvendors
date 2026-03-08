'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity, ShieldCheck, Users, Bot, CheckCircle2,
  XCircle, Loader2, RefreshCw, Search, AlertTriangle,
  Eye, Ban, BarChart2,
} from 'lucide-react';
import { api } from '@/lib/api';

type BotReview = {
  id: string; name: string; slug: string; status: string;
  mt_platform: string; seller_name: string; created_at: string;
  listing_count: number;
};

type KycItem = {
  id: string; user_email: string; document_type: string;
  status: string; submitted_at: string;
};

type UserItem = {
  id: string; email: string; status: string;
  roles: string[]; kyc_status: string; created_at: string;
};

type Stats = {
  total_users: number; total_bots: number;
  total_revenue_cents: number; pending_kyc: number;
  active_subscriptions: number;
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-gray-400 bg-gray-500/10',
  active: 'text-green-400 bg-green-500/10',
  pending_review: 'text-yellow-400 bg-yellow-500/10',
  suspended: 'text-red-400 bg-red-500/10',
  approved: 'text-green-400 bg-green-500/10',
  rejected: 'text-red-400 bg-red-500/10',
  pending: 'text-yellow-400 bg-yellow-500/10',
};

export default function AdminPage() {
  const [tab, setTab] = useState<'bots' | 'kyc' | 'users'>('bots');
  const [stats, setStats] = useState<Stats | null>(null);
  const [bots, setBots] = useState<BotReview[]>([]);
  const [kyc, setKyc] = useState<KycItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [rejectModal, setRejectModal] = useState<{ type: 'bot' | 'kyc'; id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, botsRes, kycRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/bots?status=draft&limit=50'),
        api.get('/admin/kyc?limit=50'),
      ]);
      setStats(statsRes.data);
      setBots(botsRes.data.data ?? botsRes.data);
      setKyc(kycRes.data.data ?? kycRes.data);
    } catch { showToast('Failed to load admin data'); }
    finally { setLoading(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get(`/admin/users?search=${search}&limit=50`);
      setUsers(res.data.data ?? res.data);
    } catch { showToast('Failed to load users'); }
  }, [search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { if (tab === 'users') fetchUsers(); }, [tab, fetchUsers]);

  const approveBot = async (id: string) => {
    setActing(id);
    try {
      await api.patch(`/admin/bots/${id}/approve`);
      showToast('Bot approved ✓');
      fetchAll();
    } catch { showToast('Failed to approve bot'); }
    finally { setActing(''); }
  };

  const rejectBot = async (id: string, reason: string) => {
    setActing(id);
    try {
      await api.patch(`/admin/bots/${id}/reject`, { reason });
      showToast('Bot rejected');
      fetchAll();
    } catch { showToast('Failed to reject bot'); }
    finally { setActing(''); setRejectModal(null); setRejectReason(''); }
  };

  const approveKyc = async (id: string) => {
    setActing(id);
    try {
      await api.post(`/admin/kyc/${id}/approve`);
      showToast('KYC approved ✓');
      fetchAll();
    } catch { showToast('Failed to approve KYC'); }
    finally { setActing(''); }
  };

  const rejectKyc = async (id: string, reason: string) => {
    setActing(id);
    try {
      await api.post(`/admin/kyc/${id}/reject`, { reason });
      showToast('KYC rejected');
      fetchAll();
    } catch { showToast('Failed to reject KYC'); }
    finally { setActing(''); setRejectModal(null); setRejectReason(''); }
  };

  const suspendUser = async (id: string) => {
    setActing(id);
    try {
      await api.patch(`/admin/users/${id}/suspend`);
      showToast('User suspended');
      fetchUsers();
    } catch { showToast('Failed to suspend user'); }
    finally { setActing(''); }
  };

  const activateUser = async (id: string) => {
    setActing(id);
    try {
      await api.patch(`/admin/users/${id}/activate`);
      showToast('User activated ✓');
      fetchUsers();
    } catch { showToast('Failed to activate user'); }
    finally { setActing(''); }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white font-mono">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#30363d] h-10 flex items-center px-4 justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-red-400" />
          <span className="text-sm font-bold tracking-wider">FOREXBOT</span>
          <span className="text-[10px] text-gray-500">ADMIN</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/marketplace" className="text-xs text-gray-500 hover:text-white transition-colors">Marketplace</Link>
          <button onClick={fetchAll} className="text-gray-500 hover:text-white p-1">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed top-14 right-4 z-50 bg-[#161b22] border border-[#30363d] px-4 py-2.5 rounded text-xs text-white shadow-lg">{toast}</div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 w-full max-w-sm space-y-4">
            <div className="text-sm font-bold">Reject {rejectModal.type === 'bot' ? 'Bot' : 'KYC'}</div>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..." rows={3}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 resize-none" />
            <div className="flex gap-2">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="flex-1 py-2 border border-[#30363d] rounded text-xs hover:bg-[#21262d] transition-colors">
                Cancel
              </button>
              <button onClick={() => rejectModal.type === 'bot' ? rejectBot(rejectModal.id, rejectReason) : rejectKyc(rejectModal.id, rejectReason)}
                disabled={!rejectReason.trim()}
                className="flex-1 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 rounded text-xs font-bold transition-colors">
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Users', value: stats.total_users, icon: Users, color: 'text-blue-400' },
              { label: 'Bots', value: stats.total_bots, icon: Bot, color: 'text-purple-400' },
              { label: 'Revenue', value: `$${(stats.total_revenue_cents / 100).toFixed(0)}`, icon: BarChart2, color: 'text-green-400' },
              { label: 'Pending KYC', value: stats.pending_kyc, icon: ShieldCheck, color: 'text-yellow-400' },
              { label: 'Active Subs', value: stats.active_subscriptions, icon: CheckCircle2, color: 'text-green-400' },
            ].map(s => (
              <div key={s.label} className="bg-[#161b22] border border-[#30363d] rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">{s.label}</span>
                </div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[#30363d]">
          {([
            { id: 'bots', label: `Bots (${bots.length})` },
            { id: 'kyc', label: `KYC Queue (${kyc.length})` },
            { id: 'users', label: 'Users' },
          ] as { id: typeof tab; label: string }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors uppercase tracking-wider ${tab === t.id ? 'border-red-400 text-white' : 'border-transparent text-gray-500 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        )}

        {/* Bots tab */}
        {!loading && tab === 'bots' && (
          <div className="bg-[#161b22] border border-[#30363d] rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#30363d]">
                  {['Bot', 'Seller', 'Platform', 'Status', 'Submitted', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bots.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-10 text-center text-gray-600">No bots pending review.</td></tr>
                )}
                {bots.map(bot => (
                  <tr key={bot.id} className="border-b border-[#30363d] hover:bg-[#1c2128] transition-colors">
                    <td className="px-3 py-3">
                      <div className="font-bold text-white">{bot.name}</div>
                      <div className="text-[10px] text-gray-500">{bot.slug}</div>
                    </td>
                    <td className="px-3 py-3 text-gray-400">{bot.seller_name}</td>
                    <td className="px-3 py-3">
                      <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-bold">{bot.mt_platform}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_COLOR[bot.status] ?? 'text-gray-400'}`}>
                        {bot.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{new Date(bot.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/marketplace/${bot.slug}`} target="_blank"
                          className="p-1.5 bg-[#21262d] hover:bg-[#30363d] rounded transition-colors">
                          <Eye className="w-3 h-3 text-gray-400" />
                        </Link>
                        <button onClick={() => approveBot(bot.id)} disabled={acting === bot.id}
                          className="flex items-center gap-1 px-2 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded transition-colors">
                          {acting === bot.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Approve
                        </button>
                        <button onClick={() => setRejectModal({ type: 'bot', id: bot.id })}
                          className="flex items-center gap-1 px-2 py-1 bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 rounded transition-colors text-red-400">
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* KYC tab */}
        {!loading && tab === 'kyc' && (
          <div className="bg-[#161b22] border border-[#30363d] rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#30363d]">
                  {['User', 'Document', 'Status', 'Submitted', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-[10px] text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kyc.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-gray-600">No KYC submissions pending.</td></tr>
                )}
                {kyc.map(k => (
                  <tr key={k.id} className="border-b border-[#30363d] hover:bg-[#1c2128] transition-colors">
                    <td className="px-3 py-3 text-white">{k.user_email}</td>
                    <td className="px-3 py-3 text-gray-400 capitalize">{k.document_type?.replace('_', ' ')}</td>
                    <td className="px-3 py-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_COLOR[k.status] ?? 'text-gray-400'}`}>
                        {k.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{new Date(k.submitted_at).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => approveKyc(k.id)} disabled={acting === k.id}
                          className="flex items-center gap-1 px-2 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded transition-colors">
                          {acting === k.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Approve
                        </button>
                        <button onClick={() => setRejectModal({ type: 'kyc', id: k.id })}
                          className="flex items-center gap-1 px-2 py-1 bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 rounded transition-colors text-red-400">
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Users tab */}
        {tab === 'users' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchUsers()}
                  placeholder="Search by email..."
                  className="w-full bg-[#161b22] border border-[#30363d] rounded pl-8 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
              </div>
              <button onClick={fetchUsers} className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded text-xs transition-colors">
                Search
              </button>
            </div>

            <div className="bg-[#161b22] border border-[#30363d] rounded overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#30363d]">
                    {['Email', 'Roles', 'Status', 'KYC', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-10 text-center text-gray-600">No users found.</td></tr>
                  )}
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-[#30363d] hover:bg-[#1c2128] transition-colors">
                      <td className="px-3 py-3 text-white">{u.email}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {u.roles?.map(r => (
                            <span key={r} className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px] font-bold">{r}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_COLOR[u.status] ?? 'text-gray-400'}`}>
                          {u.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-[10px] font-bold ${STATUS_COLOR[u.kyc_status] ?? 'text-gray-500'}`}>
                          {u.kyc_status?.toUpperCase() ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          {u.status === 'active' ? (
                            <button onClick={() => suspendUser(u.id)} disabled={acting === u.id}
                              className="flex items-center gap-1 px-2 py-1 bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 rounded transition-colors text-red-400">
                              {acting === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                              Suspend
                            </button>
                          ) : (
                            <button onClick={() => activateUser(u.id)} disabled={acting === u.id}
                              className="flex items-center gap-1 px-2 py-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded transition-colors">
                              {acting === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              Activate
                            </button>
                          )}
                        </div>
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
