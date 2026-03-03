'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, TrendingUp, AlertCircle } from 'lucide-react';
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
      setError(typeof msg === 'string' ? msg : 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-navy-900 border-r border-navy-800/60 flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />

        <Link href="/" className="relative flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded bg-gold-500 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-navy-950" strokeWidth={2.5} />
          </div>
          <span className="font-display font-semibold text-white text-lg">
            ForexBot<span className="text-gold-400">.</span>
          </span>
        </Link>

        <div className="relative">
          <blockquote className="font-display text-2xl text-white leading-relaxed mb-6">
            "The only marketplace where every algorithm earns its place through verified performance data."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-navy-700 flex items-center justify-center text-sm font-semibold text-gold-400">JR</div>
            <div>
              <div className="text-sm font-semibold text-white">James R.</div>
              <div className="text-xs text-slate-500">Professional Trader, London</div>
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4">
          {[
            { value: '2,400+', label: 'Verified Bots' },
            { value: '68%', label: 'Avg Win Rate' },
            { value: '$840M', label: 'Total Volume' },
          ].map((s) => (
            <div key={s.label} className="stat-card rounded-xl p-4 text-center">
              <div className="font-display text-xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded bg-gold-500 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-navy-950" strokeWidth={2.5} />
            </div>
            <span className="font-display font-semibold text-white">ForexBot<span className="text-gold-400">.</span></span>
          </Link>

          <h1 className="font-display text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-slate-400 text-sm mb-8">Sign in to your account to continue.</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 mb-6">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-navy-900 border border-navy-700/60 focus:border-gold-500/60 text-white placeholder-slate-600 rounded-lg px-4 py-3 text-sm outline-none transition-colors"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Password</label>
                <Link href="/auth/forgot" className="text-xs text-gold-400 hover:text-gold-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-navy-900 border border-navy-700/60 focus:border-gold-500/60 text-white placeholder-slate-600 rounded-lg px-4 py-3 pr-10 text-sm outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed text-navy-950 font-semibold py-3 rounded-lg transition-all hover:glow-gold text-sm mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-gold-400 hover:text-gold-300 transition-colors font-medium">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
