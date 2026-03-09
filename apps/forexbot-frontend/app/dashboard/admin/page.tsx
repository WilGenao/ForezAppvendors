'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ShieldCheck, Users, CheckCircle, XCircle, Loader2, RefreshCw, Search, Eye, Ban, BarChart2, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';

type BotReview = { id: string; name: string; slug: string; status: string; mt_platform: string; seller_name: string; created_at: string; listing_count: number; };
type KycItem = { id: string; user_email: string; document_type: string; status: string; submitted_at: string; };
type UserItem = { id: string; email: string; status: string; roles: string[]; kyc_status: string; created_at: string; };
type Stats = { total_users: number; total_bots: number; total_revenue_cents: number; pending_kyc: number; active_subscriptions: number; };

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  draft: { color: '#94A3B8', bg: '#F8FAFC' }, active: { color: '#059669', bg: '#ECFDF5' },
  pending_review: { color: '#D97706', bg: '#FFFBEB' }, suspended: { color: '#DC2626', bg: '#FEF2F2' },
  approved: { color: '#059669', bg: '#ECFDF5' }, rejected: { color: '#DC2626', bg: '#FEF2F2' },
  pending: { color: '#D97706', bg: '#FFFBEB' },
};

const card = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

const Pill = ({ status }: { status: string }) => {
  const s = STATUS_STYLE[status] || { color: '#94A3B8', bg: '#F8FAFC' };
  return <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, borderRadius: 100, padding: '2px 10px' }}>{status.replace('_', ' ').toUpperCase()}</span>;
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
      const [sRes, bRes, kRes] = await Promise.all([api.get('/admin/stats'), api.get('/admin/bots?status=draft&limit=50'), api.get('/admin/kyc?limit=50')]);
      setStats(sRes.data); setBots(bRes.data.data ?? bRes.data); setKyc(kRes.data.data ?? kRes.data);
    } catch { showToast('Failed to load admin data'); } finally { setLoading(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    try { const res = await api.get(`/admin/users?search=${search}&limit=50`); setUsers(res.data.data ?? res.data); }
    catch { showToast('Failed to load users'); }
  }, [search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { if (tab === 'users') fetchUsers(); }, [tab, fetchUsers]);

  const approveBot = async (id: string) => { setActing(id); try { await api.patch(`/admin/bots/${id}/approve`); showToast('Bot approved ✓'); fetchAll(); } catch { showToast('Error'); } finally { setActing(''); } };
  const rejectBot = async (id: string, reason: string) => { setActing(id); try { await api.patch(`/admin/bots/${id}/reject`, { reason }); showToast('Bot rejected'); fetchAll(); } catch { showToast('Error'); } finally { setActing(''); setRejectModal(null); setRejectReason(''); } };
  const approveKyc = async (id: string) => { setActing(id); try { await api.post(`/admin/kyc/${id}/approve`); showToast('KYC approved ✓'); fetchAll(); } catch { showToast('Error'); } finally { setActing(''); } };
  const rejectKyc = async (id: string, reason: string) => { setActing(id); try { await api.post(`/admin/kyc/${id}/reject`, { reason }); showToast('KYC rejected'); fetchAll(); } catch { showToast('Error'); } finally { setActing(''); setRejectModal(null); setRejectReason(''); } };
  const suspendUser = async (id: string) => { setActing(id); try { await api.patch(`/admin/users/${id}/suspend`); showToast('User suspended'); fetchUsers(); } catch { showToast('Error'); } finally { setActing(''); } };
  const activateUser = async (id: string) => { setActing(id); try { await api.patch(`/admin/users/${id}/activate`); showToast('User activated ✓'); fetchUsers(); } catch { showToast('Error'); } finally { setActing(''); } };

  return (
    <div style={{ padding: 28, fontFamily: 'DM Sans, sans-serif', minHeight: '100vh' }}>
      {/* Toast */}
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, background: '#0A1628', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>{toast}</div>}

      {/* Reject modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ ...card, padding: 24, width: '100%', maxWidth: 380 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0A1628', marginBottom: 14 }}>Reject {rejectModal.type === 'bot' ? 'Bot' : 'KYC'}</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection..." rows={3}
              style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '10px', fontSize: 13, color: '#0A1628', outline: 'none', resize: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} style={{ flex: 1, padding: '10px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#475569' }}>Cancel</button>
              <button onClick={() => rejectModal.type === 'bot' ? rejectBot(rejectModal.id, rejectReason) : rejectKyc(rejectModal.id, rejectReason)} disabled={!rejectReason.trim()}
                style={{ flex: 1, padding: '10px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: !rejectReason.trim() ? 0.5 : 1 }}>
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 26, color: '#0A1628', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 2 }}>Admin Panel</h1>
          <p style={{ fontSize: 14, color: '#64748B' }}>Review bots, KYC submissions, and manage users</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/marketplace" style={{ fontSize: 13, color: '#475569', textDecoration: 'none', padding: '8px 14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8 }}>Marketplace</Link>
          <button onClick={fetchAll} style={{ padding: 8, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer' }}>
            <RefreshCw style={{ width: 15, height: 15, color: '#64748B', ...(loading ? { animation: 'spin 1s linear infinite' } : {}) }} />
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Users', value: stats.total_users, icon: Users, color: '#2563EB', bg: '#EFF6FF' },
            { label: 'Total Bots', value: stats.total_bots, icon: TrendingUp, color: '#7C3AED', bg: '#F5F3FF' },
            { label: 'Revenue', value: `$${(stats.total_revenue_cents / 100).toFixed(0)}`, icon: BarChart2, color: '#059669', bg: '#ECFDF5' },
            { label: 'Pending KYC', value: stats.pending_kyc, icon: ShieldCheck, color: '#D97706', bg: '#FFFBEB' },
            { label: 'Active Subs', value: stats.active_subscriptions, icon: CheckCircle, color: '#059669', bg: '#ECFDF5' },
          ].map(s => (
            <div key={s.label} style={{ ...card, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{s.label}</span>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.icon style={{ width: 14, height: 14, color: s.color }} />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#0A1628', fontFamily: 'DM Serif Display, serif' }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E2E8F0', marginBottom: 16 }}>
        {([{ id: 'bots', label: `Bot Review (${bots.length})` }, { id: 'kyc', label: `KYC Queue (${kyc.length})` }, { id: 'users', label: 'Users' }] as { id: typeof tab; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ fontSize: 14, fontWeight: tab === t.id ? 600 : 500, color: tab === t.id ? '#2563EB' : '#64748B', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? '#2563EB' : 'transparent'}`, padding: '8px 16px', cursor: 'pointer', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 style={{ width: 20, height: 20, color: '#94A3B8', animation: 'spin 1s linear infinite' }} /></div>}

      {/* Bots */}
      {!loading && tab === 'bots' && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ borderBottom: '1px solid #E2E8F0' }}>{['Bot', 'Seller', 'Platform', 'Status', 'Submitted', 'Actions'].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>)}</tr></thead>
            <tbody>
              {bots.length === 0 && <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>No bots pending review.</td></tr>}
              {bots.map(bot => (
                <tr key={bot.id} style={{ borderBottom: '1px solid #F1F5F9' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFC'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
                  <td style={{ padding: '12px 16px' }}><div style={{ fontWeight: 600, color: '#0A1628' }}>{bot.name}</div><div style={{ fontSize: 11, color: '#94A3B8' }}>{bot.slug}</div></td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{bot.seller_name}</td>
                  <td style={{ padding: '12px 16px' }}><span style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '2px 8px' }}>{bot.mt_platform}</span></td>
                  <td style={{ padding: '12px 16px' }}><Pill status={bot.status} /></td>
                  <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: 12 }}>{new Date(bot.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Link href={`/marketplace/${bot.slug}`} target="_blank" style={{ padding: '6px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, display: 'flex', alignItems: 'center' }}><Eye style={{ width: 13, height: 13, color: '#475569' }} /></Link>
                      <button onClick={() => approveBot(bot.id)} disabled={acting === bot.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        {acting === bot.id ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <CheckCircle style={{ width: 12, height: 12 }} />} Approve
                      </button>
                      <button onClick={() => setRejectModal({ type: 'bot', id: bot.id })} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        <XCircle style={{ width: 12, height: 12 }} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* KYC */}
      {!loading && tab === 'kyc' && (
        <div style={{ ...card, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ borderBottom: '1px solid #E2E8F0' }}>{['User', 'Document', 'Status', 'Submitted', 'Actions'].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>)}</tr></thead>
            <tbody>
              {kyc.length === 0 && <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>No KYC submissions pending.</td></tr>}
              {kyc.map(k => (
                <tr key={k.id} style={{ borderBottom: '1px solid #F1F5F9' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFC'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0A1628' }}>{k.user_email}</td>
                  <td style={{ padding: '12px 16px', color: '#475569', textTransform: 'capitalize' }}>{k.document_type?.replace('_', ' ')}</td>
                  <td style={{ padding: '12px 16px' }}><Pill status={k.status} /></td>
                  <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: 12 }}>{new Date(k.submitted_at).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => approveKyc(k.id)} disabled={acting === k.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        {acting === k.id ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <CheckCircle style={{ width: 12, height: 12 }} />} Approve
                      </button>
                      <button onClick={() => setRejectModal({ type: 'kyc', id: k.id })} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        <XCircle style={{ width: 12, height: 12 }} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8, maxWidth: 400 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '8px 12px' }}>
              <Search style={{ width: 14, height: 14, color: '#94A3B8' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchUsers()} placeholder="Search by email..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#334155', fontFamily: 'DM Sans, sans-serif', background: 'transparent' }} />
            </div>
            <button onClick={fetchUsers} style={{ padding: '8px 16px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Search</button>
          </div>
          <div style={{ ...card, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ borderBottom: '1px solid #E2E8F0' }}>{['Email', 'Roles', 'Status', 'KYC', 'Joined', 'Actions'].map(h => <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>)}</tr></thead>
              <tbody>
                {users.length === 0 && <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>No users found.</td></tr>}
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F8FAFC'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#0A1628' }}>{u.email}</td>
                    <td style={{ padding: '12px 16px' }}><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{u.roles?.map(r => <span key={r} style={{ fontSize: 10, fontWeight: 600, color: '#7C3AED', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 100, padding: '1px 8px' }}>{r}</span>)}</div></td>
                    <td style={{ padding: '12px 16px' }}><Pill status={u.status} /></td>
                    <td style={{ padding: '12px 16px' }}><Pill status={u.kyc_status ?? 'unknown'} /></td>
                    <td style={{ padding: '12px 16px', color: '#94A3B8', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {u.status === 'active' ? (
                        <button onClick={() => suspendUser(u.id)} disabled={acting === u.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          {acting === u.id ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <Ban style={{ width: 12, height: 12 }} />} Suspend
                        </button>
                      ) : (
                        <button onClick={() => activateUser(u.id)} disabled={acting === u.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          {acting === u.id ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <CheckCircle style={{ width: 12, height: 12 }} />} Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
