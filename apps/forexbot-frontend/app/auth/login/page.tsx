'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, TrendingUp, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { authApi } from '@/lib/api';

const PROOF = [
  { value: '2,400+', label: 'Verified Algorithms' },
  { value: '64.2%',  label: 'Average Win Rate'    },
  { value: '$840M',  label: 'Volume Processed'    },
];

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
      setError(typeof msg === 'string' ? msg : 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'DM Sans, sans-serif' }}>

      {/* LEFT: Brand panel */}
      <div style={{ width: '45%', background: '#0A1628', display: 'flex', flexDirection: 'column', padding: '40px 48px', position: 'relative', overflow: 'hidden' }} className="hidden lg:flex">
        {/* Background decoration */}
        <div style={{ position: 'absolute', bottom: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(37,99,235,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 200, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(37,99,235,0.05)', pointerEvents: 'none' }} />

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 'auto' }}>
          <div style={{ width: 36, height: 36, background: '#2563EB', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp style={{ width: 18, height: 18, color: '#fff' }} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>ForexBot Markets</span>
        </Link>

        {/* Main quote */}
        <div style={{ marginBottom: 'auto', paddingTop: 60 }}>
          <blockquote style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#fff', lineHeight: 1.3, fontWeight: 400, marginBottom: 28, fontStyle: 'italic' }}>
            "The only marketplace where every algorithm earns its listing through verified performance data."
          </blockquote>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#60A5FA' }}>JR</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>James Rodriguez</div>
              <div style={{ fontSize: 12, color: '#475569' }}>Professional Trader · London, UK</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {PROOF.map(p => (
            <div key={p.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px 14px' }}>
              <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, color: '#fff', marginBottom: 4 }}>{p.value}</div>
              <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.3 }}>{p.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Login form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: '#fff' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Mobile logo */}
          <Link href="/" className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 32 }}>
            <div style={{ width: 30, height: 30, background: '#2563EB', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp style={{ width: 15, height: 15, color: '#fff' }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0A1628' }}>ForexBot Markets</span>
          </Link>

          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 30, fontWeight: 400, color: '#0A1628', marginBottom: 6, letterSpacing: '-0.02em' }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 28 }}>
            Sign in to access your account and portfolio.
          </p>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
              <AlertCircle style={{ width: 16, height: 16, color: '#DC2626', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#DC2626' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '11px 14px', fontSize: 14, color: '#0A1628', outline: 'none', transition: 'border-color 0.15s', fontFamily: 'DM Sans, sans-serif' }}
                onFocus={e => (e.target.style.borderColor = '#2563EB')}
                onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Password</label>
                <Link href="/auth/forgot-password" style={{ fontSize: 12, color: '#2563EB', textDecoration: 'none', fontWeight: 500 }}>Forgot password?</Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '11px 42px 11px 14px', fontSize: 14, color: '#0A1628', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}
                  onFocus={e => (e.target.style.borderColor = '#2563EB')}
                  onBlur={e => (e.target.style.borderColor = '#E2E8F0')}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}>
                  {showPass ? <EyeOff style={{ width: 17, height: 17 }} /> : <Eye style={{ width: 17, height: 17 }} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{ width: '100%', background: loading ? '#93C5FD' : '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, fontFamily: 'DM Sans, sans-serif', boxShadow: loading ? 'none' : '0 2px 8px rgba(37,99,235,0.3)' }}>
              {loading ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#64748B', marginTop: 24 }}>
            Don't have an account?{' '}
            <Link href="/auth/register" style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>
              Create one free
            </Link>
          </p>

          {/* Security note */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 28, paddingTop: 20, borderTop: '1px solid #F1F5F9' }}>
            <ShieldCheck style={{ width: 13, height: 13, color: '#059669' }} />
            <span style={{ fontSize: 11, color: '#94A3B8' }}>256-bit SSL encryption · GDPR compliant · 2FA available</span>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
