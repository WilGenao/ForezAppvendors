'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Activity, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login(email, password);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'ERR: Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

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
        {/* Left info panel */}
        <div className="hidden lg:flex lg:w-80 border-r border-border flex-col bg-mt-panel2">
          {/* Panel header */}
          <div className="px-4 py-2 border-b border-border">
            <span className="font-mono text-[10px] text-muted tracking-widest uppercase">Account Info</span>
          </div>

          {/* Terminal output */}
          <div className="flex-1 p-4 font-mono text-xs text-muted space-y-1 overflow-hidden">
            <p><span className="text-mt-blue">&gt;</span> Connecting to ForexBot...</p>
            <p><span className="text-mt-green">&gt;</span> Server: ONLINE</p>
            <p><span className="text-mt-blue">&gt;</span> Bots available: 2,400</p>
            <p><span className="text-mt-blue">&gt;</span> Active traders: 18,241</p>
            <p className="pt-2 text-[#333]">─────────────────────</p>
            <p className="text-muted">Requires authentication</p>
            <p className="text-muted">to access platform.</p>
            <p className="pt-2"><span className="text-mt-blue">&gt;</span> Enter credentials_</p>
            <p className="animate-pulse text-mt-blue">█</p>
          </div>

          {/* Bottom stats */}
          <div className="border-t border-border">
            {[
              { label: 'AVG_WIN_RATE', value: '64.2%', pos: true },
              { label: 'TOP_SHARPE', value: '3.12', pos: true },
              { label: 'MIN_DRAWDOWN', value: '-3.1%', pos: false },
            ].map((s) => (
              <div key={s.label} className="flex justify-between items-center px-4 py-2 border-b border-border">
                <span className="font-mono text-[10px] text-muted">{s.label}</span>
                <span className={`font-mono text-xs font-semibold ${s.pos ? 'val-pos' : 'val-neg'}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Center: form */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            {/* Form header */}
            <div className="panel mb-0">
              <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted tracking-widest uppercase">Login — ForexBot Platform</span>
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
                    <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">
                      // Login (email)
                    </label>
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
                    <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">
                      // Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••••••"
                        className="w-full bg-mt-bg border border-border focus:border-mt-blue text-white placeholder-[#333] font-mono text-xs px-3 py-2.5 pr-9 outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white"
                      >
                        {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="accent-mt-blue w-3 h-3" />
                      <span className="font-mono text-[10px] text-muted">Remember me</span>
                    </label>
                    <Link href="#" className="font-mono text-[10px] text-mt-blue hover:underline">
                      Forgot password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-mt-blue hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono text-xs font-semibold py-2.5 transition-colors mt-2"
                  >
                    {loading ? '> AUTHENTICATING...' : '> LOGIN()'}
                  </button>
                </form>

                <div className="mt-5 pt-4 border-t border-border text-center">
                  <span className="font-mono text-[10px] text-muted">
                    No account?{' '}
                    <Link href="/auth/register" className="text-mt-blue hover:underline">
                      OPEN_FREE_ACCOUNT()
                    </Link>
                  </span>
                </div>
              </div>
            </div>

            {/* Status bar */}
            <div className="panel mt-0 border-t-0 px-4 py-1.5 flex items-center justify-between">
              <span className="font-mono text-[10px] text-muted">SSL: ENCRYPTED</span>
              <span className="font-mono text-[10px] text-muted">2FA: AVAILABLE</span>
              <span className="font-mono text-[10px] text-mt-green">● SECURE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}