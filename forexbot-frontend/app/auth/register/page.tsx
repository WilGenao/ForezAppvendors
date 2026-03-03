'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, TrendingUp, AlertCircle, CheckCircle2, Check } from 'lucide-react';
import { authApi } from '@/lib/api';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Contains number', test: (p: string) => /\d/.test(p) },
  { label: 'Contains special character', test: (p: string) => /[!@#$%^&*]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordStrength = PASSWORD_RULES.filter((r) => r.test(password)).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.register(email, password);
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (typeof msg === 'string' ? msg : 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="font-display text-3xl font-bold text-white mb-3">Check your email</h2>
          <p className="text-slate-400 mb-8">
            We sent a verification link to <span className="text-white font-medium">{email}</span>. Click it to activate your account.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center bg-gold-500 hover:bg-gold-400 text-navy-950 font-semibold px-8 py-3 rounded-lg transition-all text-sm"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-navy-900 border-r border-navy-800/60 flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl" />

        <Link href="/" className="relative flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-gold-500 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-navy-950" strokeWidth={2.5} />
          </div>
          <span className="font-display font-semibold text-white text-lg">
            ForexBot<span className="text-gold-400">.</span>
          </span>
        </Link>

        <div className="relative space-y-4">
          <h2 className="font-display text-2xl font-bold text-white">Everything you need to trade algorithmically.</h2>
          {[
            'Access 2,400+ performance-verified bots',
            'Real trade history — no backtests only',
            'Automatic anomaly detection & risk scoring',
            'MT4 & MT5 compatible, instant deployment',
            '7-day free trial on all plans',
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-gold-400" />
              </div>
              <span className="text-sm text-slate-300">{item}</span>
            </div>
          ))}
        </div>

        <p className="relative text-xs text-slate-600">
          By creating an account, you agree to our Terms of Service and Privacy Policy. Trading involves substantial risk of loss.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded bg-gold-500 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-navy-950" strokeWidth={2.5} />
            </div>
            <span className="font-display font-semibold text-white">ForexBot<span className="text-gold-400">.</span></span>
          </Link>

          <h1 className="font-display text-3xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-slate-400 text-sm mb-8">Start your 7-day free trial. No credit card required.</p>

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
              <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Create a strong password"
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

              {/* Password strength */}
              {password && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1 rounded-full transition-colors ${
                          i <= passwordStrength
                            ? passwordStrength <= 1 ? 'bg-red-500'
                            : passwordStrength <= 2 ? 'bg-amber-500'
                            : passwordStrength <= 3 ? 'bg-blue-500'
                            : 'bg-emerald-500'
                            : 'bg-navy-700'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {PASSWORD_RULES.map((rule) => (
                      <div key={rule.label} className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${rule.test(password) ? 'bg-emerald-400' : 'bg-navy-700'}`} />
                        <span className={`text-xs ${rule.test(password) ? 'text-emerald-400' : 'text-slate-600'}`}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || passwordStrength < 3}
              className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed text-navy-950 font-semibold py-3 rounded-lg transition-all hover:glow-gold text-sm mt-2"
            >
              {loading ? 'Creating account...' : 'Create Account — Free'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-gold-400 hover:text-gold-300 transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
