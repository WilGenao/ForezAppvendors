'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/lib/api';

const RULES = [
  { label: 'min 8 chars', test: (p: string) => p.length >= 8 },
  { label: 'uppercase', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'number', test: (p: string) => /\d/.test(p) },
  { label: 'special char', test: (p: string) => /[!@#$%^&*]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = RULES.filter((r) => r.test(password)).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.register(email, password);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (typeof msg === 'string' ? msg : 'ERR: Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-mt-bg flex items-center justify-center px-6">
        <div className="panel w-full max-w-sm">
          <div className="px-4 py-2 border-b border-border">
            <span className="font-mono text-[10px] text-muted tracking-widest uppercase">Registration Complete</span>
          </div>
          <div className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-mt-green mx-auto mb-4" />
            <p className="font-mono text-sm text-white font-semibold mb-2">&gt; ACCOUNT_CREATED()</p>
            <p className="font-mono text-xs text-muted mb-1">Verification email sent to:</p>
            <p className="font-mono text-xs text-mt-blue mb-6">{email}</p>
            <Link href="/auth/login" className="block w-full bg-mt-blue hover:bg-blue-500 text-white font-mono text-xs font-semibold py-2.5 transition-colors text-center">
              &gt; PROCEED_TO_LOGIN()
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mt-bg flex flex-col">
      {/* Top bar */}
      <div className="bg-mt-panel2 border-b border-border h-10 flex items-center px-6 justify-between flex-shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-mt-blue" />
          <span className="font-mono text-sm font-bold text-white tracking-wider">FOREXBOT</span>
          <span className="font-mono text-xs text-muted">v2.4</span>
        </Link>
        <span className="font-mono text-[10px] text-muted hidden md:block">
          <span className="text-mt-green">● </span>SERVER: CONNECTED
        </span>
      </div>

      {/* Main */}
      <div className="flex-1 flex">
        {/* Left panel */}
        <div className="hidden lg:flex lg:w-80 border-r border-border flex-col bg-mt-panel2">
          <div className="px-4 py-2 border-b border-border">
            <span className="font-mono text-[10px] text-muted tracking-widest uppercase">Free Account Includes</span>
          </div>
          <div className="flex-1 p-4 space-y-0">
            {[
              { label: 'VERIFIED_BOTS_ACCESS', value: '2,400+' },
              { label: 'REAL_TRADE_HISTORY', value: 'YES' },
              { label: 'ANOMALY_DETECTION', value: 'ENABLED' },
              { label: 'MT4_MT5_SUPPORT', value: 'BOTH' },
              { label: 'FREE_TRIAL_DAYS', value: '7' },
              { label: 'CC_REQUIRED', value: 'NO' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b border-[#161616]">
                <span className="font-mono text-[10px] text-muted">{item.label}</span>
                <span className="font-mono text-[10px] text-mt-blue font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-border">
            <p className="font-mono text-[10px] text-muted leading-relaxed">
              // Trading involves substantial risk of loss. Past performance does not guarantee future results.
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <div className="panel mb-0">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted tracking-widest uppercase">New Account — ForexBot Platform</span>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-mt-red" />
                  <div className="w-2 h-2 rounded-full bg-mt-yellow" />
                  <div className="w-2 h-2 rounded-full bg-mt-green" />
                </div>
              </div>

              <div className="p-6">
                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-mt-red/30 px-3 py-2 mb-5">
                    <AlertCircle className="w-3.5 h-3.5 text-mt-red flex-shrink-0" />
                    <span className="font-mono text-xs text-mt-red">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">// Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="trader@example.com"
                      className="w-full bg-mt-bg border border-border focus:border-mt-blue text-white placeholder-[#333] font-mono text-xs px-3 py-2.5 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">// Password</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••••••"
                        className="w-full bg-mt-bg border border-border focus:border-mt-blue text-white placeholder-[#333] font-mono text-xs px-3 py-2.5 pr-9 outline-none transition-colors"
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                        {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Strength indicator */}
                    {password && (
                      <div className="mt-2 space-y-2">
                        <div className="flex gap-1">
                          {[1,2,3,4].map((i) => (
                            <div key={i} className={`flex-1 h-0.5 transition-colors ${
                              i <= strength
                                ? strength <= 1 ? 'bg-mt-red'
                                : strength <= 2 ? 'bg-mt-yellow'
                                : strength <= 3 ? 'bg-mt-blue'
                                : 'bg-mt-green'
                                : 'bg-border'
                            }`} />
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {RULES.map((rule) => (
                            <div key={rule.label} className="flex items-center gap-1.5">
                              <span className={`font-mono text-[10px] ${rule.test(password) ? 'text-mt-green' : 'text-[#333]'}`}>
                                {rule.test(password) ? '[✓]' : '[ ]'} {rule.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || strength < 3}
                    className="w-full bg-mt-blue hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono text-xs font-semibold py-2.5 transition-colors mt-2"
                  >
                    {loading ? '> CREATING_ACCOUNT...' : '> OPEN_FREE_ACCOUNT()'}
                  </button>
                </form>

                <div className="mt-5 pt-4 border-t border-border text-center">
                  <span className="font-mono text-[10px] text-muted">
                    Have an account?{' '}
                    <Link href="/auth/login" className="text-mt-blue hover:underline">LOGIN()</Link>
                  </span>
                </div>
              </div>
            </div>

            <div className="panel mt-0 border-t-0 px-4 py-1.5 flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted">SSL: ENCRYPTED</span>
              <span className="font-mono text-[10px] text-muted">GDPR: COMPLIANT</span>
              <span className="font-mono text-[10px] text-mt-green">● SECURE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}