'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, User, Shield, Bell, Key, LogOut, Save, Eye, EyeOff, CheckCircle2, AlertTriangle, Smartphone } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [tab, setTab] = useState<'profile' | 'security' | 'notifications' | 'api'>('profile');

  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('UTC-5');
  const [currency, setCurrency] = useState('USD');
  const [savedProfile, setSavedProfile] = useState(false);

  // Security fields
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [savedSecurity, setSavedSecurity] = useState(false);

  // Notifications
  const [notifs, setNotifs] = useState({
    subscriptionRenewal: true,
    botAnomalyAlert: true,
    newBotFromSeller: false,
    weeklyReport: true,
    priceChanges: false,
    licenseExpiry: true,
  });

  // API Keys (mock)
  const API_KEYS = [
    { id: 'key_1', name: 'Production MT5 Bot', key: 'fbk_live_a8f2c4e1b9d3f7a2c5e8b1d4', created: '2026-01-15', lastUsed: '2026-03-02', status: 'ACTIVE' },
    { id: 'key_2', name: 'Test Environment', key: 'fbk_test_b3d6a9c2e5f8b1d4a7c0e3f6', created: '2026-02-01', lastUsed: '2026-02-28', status: 'ACTIVE' },
  ];

  const [copiedKey, setCopiedKey] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/auth/login'); return; }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setEmail(payload.email || '');
      setDisplayName(payload.email?.split('@')[0] || '');
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

  const saveProfile = () => {
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2000);
  };

  const saveSecurity = () => {
    setSavedSecurity(true);
    setTimeout(() => setSavedSecurity(false), 2000);
  };

  const toggleNotif = (key: keyof typeof notifs) => {
    setNotifs(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
            <span className="font-mono text-[10px] text-muted tracking-widest uppercase">Account</span>
          </div>
          <nav className="flex-1 py-2">
            {[
              { icon: User, label: 'Profile', key: 'profile' },
              { icon: Shield, label: 'Security', key: 'security' },
              { icon: Bell, label: 'Notifications', key: 'notifications' },
              { icon: Key, label: 'API Keys', key: 'api' },
            ].map(({ icon: Icon, label, key }) => (
              <button
                key={key}
                onClick={() => setTab(key as typeof tab)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 font-mono text-xs transition-colors ${tab === key ? 'bg-mt-blue/10 text-white border-r-2 border-mt-blue' : 'text-muted hover:text-white hover:bg-surface'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </nav>
          <div className="border-t border-border p-3 space-y-1.5">
            <Link href="/dashboard/buyer" className="w-full block text-center font-mono text-xs border border-border text-muted hover:text-white py-1.5 transition-colors">
              BUYER_DASH()
            </Link>
            <Link href="/dashboard/seller" className="w-full block text-center font-mono text-xs border border-border text-muted hover:text-white py-1.5 transition-colors">
              SELLER_DASH()
            </Link>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 overflow-auto">
          <div className="border-b border-border px-6 py-3 bg-mt-panel2 flex items-center justify-between flex-shrink-0">
            <div>
              <span className="font-mono text-[10px] text-muted uppercase tracking-widest">Account Settings</span>
              <div className="font-mono text-xs text-white mt-0.5 capitalize">{tab}</div>
            </div>
            <span className="font-mono text-[10px] text-mt-green">● VERIFIED ACCOUNT</span>
          </div>

          <div className="p-6 max-w-3xl space-y-4">

            {/* PROFILE TAB */}
            {tab === 'profile' && (
              <>
                {/* Account info panel */}
                <div className="panel">
                  <div className="px-4 py-2 border-b border-border">
                    <span className="font-mono text-[10px] text-muted uppercase tracking-widest">// Account Info</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-4 p-3 bg-mt-bg border border-border">
                      <div className="w-10 h-10 bg-mt-blue/10 border border-mt-blue/30 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-mt-blue" />
                      </div>
                      <div>
                        <div className="font-mono text-xs text-white font-semibold">{email}</div>
                        <div className="font-mono text-[10px] text-mt-green flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" /> EMAIL VERIFIED
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">// Display Name</label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full bg-mt-bg border border-border focus:border-mt-blue text-white placeholder-[#333] font-mono text-xs px-3 py-2.5 outline-none transition-colors"
                          placeholder="trader_username"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">// Phone (optional)</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-mt-bg border border-border focus:border-mt-blue text-white placeholder-[#333] font-mono text-xs px-3 py-2.5 outline-none transition-colors"
                          placeholder="+1 555 000 0000"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">// Timezone</label>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full bg-mt-bg border border-border focus:border-mt-blue text-white font-mono text-xs px-3 py-2.5 outline-none transition-colors"
                        >
                          {['UTC-8', 'UTC-5', 'UTC+0', 'UTC+1', 'UTC+2', 'UTC+3', 'UTC+8'].map(tz => (
                            <option key={tz} value={tz}>{tz}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">// Base Currency</label>
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full bg-mt-bg border border-border focus:border-mt-blue text-white font-mono text-xs px-3 py-2.5 outline-none transition-colors"
                        >
                          {['USD', 'EUR', 'GBP', 'JPY', 'AUD'].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={saveProfile}
                      className={`flex items-center gap-2 font-mono text-xs px-4 py-2 transition-colors ${savedProfile ? 'bg-mt-green/10 border border-mt-green/30 text-mt-green' : 'bg-mt-blue hover:bg-blue-500 text-white'}`}
                    >
                      {savedProfile ? <><CheckCircle2 className="w-3.5 h-3.5" /> SAVED()</> : <><Save className="w-3.5 h-3.5" /> SAVE_PROFILE()</>}
                    </button>
                  </div>
                </div>

                {/* KYC Status */}
                <div className="panel">
                  <div className="px-4 py-2 border-b border-border">
                    <span className="font-mono text-[10px] text-muted uppercase tracking-widest">// KYC Verification</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between p-3 bg-mt-yellow/5 border border-mt-yellow/20">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4 text-mt-yellow" />
                        <div>
                          <div className="font-mono text-xs text-mt-yellow font-semibold">KYC_STATUS: PENDING</div>
                          <div className="font-mono text-[10px] text-muted mt-0.5">Required to become a seller and withdraw funds</div>
                        </div>
                      </div>
                      <Link href="/dashboard/kyc" className="font-mono text-xs bg-mt-yellow/10 border border-mt-yellow/30 text-mt-yellow hover:bg-mt-yellow/20 px-3 py-1.5 transition-colors">
                        SUBMIT_KYC()
                      </Link>
                    </div>
                    <div className="mt-3 space-y-1">
                      {[
                        { step: 'Email verification', done: true },
                        { step: 'Identity document', done: false },
                        { step: 'Selfie verification', done: false },
                        { step: 'Address proof', done: false },
                      ].map((s) => (
                        <div key={s.step} className="flex items-center gap-2 py-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${s.done ? 'bg-mt-green' : 'bg-[#333]'}`} />
                          <span className={`font-mono text-[10px] ${s.done ? 'text-mt-green' : 'text-muted'}`}>{s.step}</span>
                          {s.done && <span className="font-mono text-[10px] text-mt-green">[✓]</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* SECURITY TAB */}
            {tab === 'security' && (
              <>
                <div className="panel">
                  <div className="px-4 py-2 border-b border-border">
                    <span className="font-mono text-[10px] text-muted uppercase tracking-widest">// Change Password</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {[
                      { label: 'Current Password', value: currentPass, set: setCurrentPass, show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
                      { label: 'New Password', value: newPass, set: setNewPass, show: showNew, toggle: () => setShowNew(!showNew) },
                      { label: 'Confirm New Password', value: confirmPass, set: setConfirmPass, show: showNew, toggle: () => setShowNew(!showNew) },
                    ].map((field) => (
                      <div key={field.label}>
                        <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">// {field.label}</label>
                        <div className="relative">
                          <input
                            type={field.show ? 'text' : 'password'}
                            value={field.value}
                            onChange={(e) => field.set(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full bg-mt-bg border border-border focus:border-mt-blue text-white placeholder-[#333] font-mono text-xs px-3 py-2.5 pr-9 outline-none transition-colors"
                          />
                          <button type="button" onClick={field.toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                            {field.show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ))}
                    {confirmPass && newPass && confirmPass !== newPass && (
                      <div className="flex items-center gap-2 text-mt-red">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="font-mono text-[10px]">ERR: Passwords do not match</span>
                      </div>
                    )}
                    <button
                      onClick={saveSecurity}
                      disabled={!currentPass || !newPass || newPass !== confirmPass}
                      className={`flex items-center gap-2 font-mono text-xs px-4 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${savedSecurity ? 'bg-mt-green/10 border border-mt-green/30 text-mt-green' : 'bg-mt-blue hover:bg-blue-500 text-white'}`}
                    >
                      {savedSecurity ? <><CheckCircle2 className="w-3.5 h-3.5" /> UPDATED()</> : <><Save className="w-3.5 h-3.5" /> UPDATE_PASSWORD()</>}
                    </button>
                  </div>
                </div>

                {/* 2FA */}
                <div className="panel">
                  <div className="px-4 py-2 border-b border-border">
                    <span className="font-mono text-[10px] text-muted uppercase tracking-widest">// Two-Factor Authentication</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-4 h-4 text-muted" />
                        <div>
                          <div className="font-mono text-xs text-white">Authenticator App (TOTP)</div>
                          <div className="font-mono text-[10px] text-muted mt-0.5">Google Authenticator, Authy, etc.</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setTwoFAEnabled(!twoFAEnabled)}
                        className={`font-mono text-xs px-4 py-1.5 transition-colors ${twoFAEnabled ? 'bg-mt-red/10 border border-mt-red/30 text-mt-red hover:bg-mt-red/20' : 'bg-mt-blue hover:bg-blue-500 text-white'}`}
                      >
                        {twoFAEnabled ? 'DISABLE_2FA()' : 'ENABLE_2FA()'}
                      </button>
                    </div>
                    <div className={`mt-3 flex items-center gap-2 font-mono text-[10px] ${twoFAEnabled ? 'text-mt-green' : 'text-muted'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${twoFAEnabled ? 'bg-mt-green' : 'bg-[#333]'}`} />
                      STATUS: {twoFAEnabled ? 'ENABLED' : 'DISABLED'}
                    </div>
                  </div>
                </div>

                {/* Active sessions */}
                <div className="panel">
                  <div className="px-4 py-2 border-b border-border">
                    <span className="font-mono text-[10px] text-muted uppercase tracking-widest">// Active Sessions</span>
                  </div>
                  <div className="divide-y divide-[#161616]">
                    {[
                      { device: 'Windows Chrome', ip: '190.xxx.xxx.12', location: 'Santo Domingo, DO', current: true, time: 'Now' },
                      { device: 'iPhone Safari', ip: '190.xxx.xxx.13', location: 'Santo Domingo, DO', current: false, time: '2h ago' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-white">{s.device}</span>
                            {s.current && <span className="font-mono text-[9px] bg-mt-green/10 border border-mt-green/30 text-mt-green px-1.5 py-0.5">CURRENT</span>}
                          </div>
                          <div className="font-mono text-[10px] text-muted mt-0.5">{s.ip} · {s.location} · {s.time}</div>
                        </div>
                        {!s.current && (
                          <button className="font-mono text-[10px] text-mt-red hover:underline">REVOKE</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* NOTIFICATIONS TAB */}
            {tab === 'notifications' && (
              <div className="panel">
                <div className="px-4 py-2 border-b border-border">
                  <span className="font-mono text-[10px] text-muted uppercase tracking-widest">// Notification Preferences</span>
                </div>
                <div className="divide-y divide-[#161616]">
                  {[
                    { key: 'subscriptionRenewal', label: 'Subscription renewal reminders', desc: '3 days before next billing date' },
                    { key: 'botAnomalyAlert', label: 'Bot anomaly alerts', desc: 'Immediate alert when subscribed EA is flagged' },
                    { key: 'newBotFromSeller', label: 'New bots from followed sellers', desc: 'When a seller you follow publishes a new EA' },
                    { key: 'weeklyReport', label: 'Weekly performance report', desc: 'Summary of all your active EAs every Monday' },
                    { key: 'priceChanges', label: 'Price change notifications', desc: 'When a subscribed bot changes its price' },
                    { key: 'licenseExpiry', label: 'License expiry warnings', desc: '7 days before license expires' },
                  ].map((n) => (
                    <div key={n.key} className="flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors">
                      <div>
                        <div className="font-mono text-xs text-white">{n.label}</div>
                        <div className="font-mono text-[10px] text-muted mt-0.5">{n.desc}</div>
                      </div>
                      <button
                        onClick={() => toggleNotif(n.key as keyof typeof notifs)}
                        className={`flex-shrink-0 w-10 h-5 rounded-full transition-colors relative ${notifs[n.key as keyof typeof notifs] ? 'bg-mt-blue' : 'bg-[#2a2a2a]'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${notifs[n.key as keyof typeof notifs] ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-border">
                  <button className="flex items-center gap-2 font-mono text-xs bg-mt-blue hover:bg-blue-500 text-white px-4 py-2 transition-colors">
                    <Save className="w-3.5 h-3.5" /> SAVE_PREFERENCES()
                  </button>
                </div>
              </div>
            )}

            {/* API KEYS TAB */}
            {tab === 'api' && (
              <>
                <div className="panel">
                  <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted uppercase tracking-widest">// API Keys</span>
                    <button className="font-mono text-[10px] bg-mt-blue hover:bg-blue-500 text-white px-2 py-1 transition-colors">
                      + GENERATE_KEY()
                    </button>
                  </div>
                  <div className="divide-y divide-[#161616]">
                    {API_KEYS.map((k) => (
                      <div key={k.id} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs text-white font-semibold">{k.name}</span>
                          <span className="font-mono text-[9px] bg-mt-green/10 border border-mt-green/30 text-mt-green px-1.5 py-0.5">{k.status}</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-mt-bg border border-border mb-2">
                          <Key className="w-3 h-3 text-muted flex-shrink-0" />
                          <span className="font-mono text-[10px] text-white flex-1 truncate">{k.key}</span>
                          <button
                            onClick={() => copyKey(k.key)}
                            className={`font-mono text-[10px] px-2 py-0.5 transition-colors flex-shrink-0 ${copiedKey === k.key ? 'bg-mt-green/10 text-mt-green border border-mt-green/30' : 'bg-surface border border-border text-muted hover:text-white'}`}
                          >
                            {copiedKey === k.key ? '[✓]' : 'COPY'}
                          </button>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-[10px] text-muted">Created: {k.created}</span>
                          <span className="font-mono text-[10px] text-muted">Last used: {k.lastUsed}</span>
                          <button className="font-mono text-[10px] text-mt-red hover:underline ml-auto">REVOKE</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel p-4">
                  <div className="font-mono text-[10px] text-muted uppercase tracking-widest mb-3">// Usage Example</div>
                  <div className="bg-mt-bg border border-border p-3 font-mono text-[10px] text-muted space-y-1">
                    <p><span className="text-mt-blue">POST</span> https://api.forexbot.io/v1/licensing/validate</p>
                    <p><span className="text-muted">Authorization:</span> <span className="text-white">Bearer fbk_live_a8f2c4...</span></p>
                    <p className="pt-1"><span className="text-mt-green">{'{'}</span></p>
                    <p className="pl-4"><span className="text-white">"licenseKey"</span>: <span className="text-mt-yellow">"LK-XXXX..."</span>,</p>
                    <p className="pl-4"><span className="text-white">"mtAccountId"</span>: <span className="text-mt-yellow">"123456"</span>,</p>
                    <p className="pl-4"><span className="text-white">"mtPlatform"</span>: <span className="text-mt-yellow">"MT5"</span></p>
                    <p><span className="text-mt-green">{'}'}</span></p>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="border-t border-border px-4 py-1.5 bg-mt-panel2 flex items-center justify-between flex-shrink-0">
        <span className="font-mono text-[10px] text-muted">Account Settings · {email}</span>
        <span className="font-mono text-[10px] val-pos">● SESSION ACTIVE</span>
      </div>
    </div>
  );
}