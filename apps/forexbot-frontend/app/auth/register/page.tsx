'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, TrendingUp, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { authApi } from '@/lib/api';

const RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
  { label: 'One special character', test: (p: string) => /[!@#$%^&*]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = RULES.filter(r => r.test(password)).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await authApi.register(email, password); setSuccess(true); }
    catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : (typeof msg === 'string' ? msg : 'Registration failed'));
    } finally { setLoading(false); }
  };

  if (success) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: 'DM Sans, sans-serif', padding: 24 }}>
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 40, maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle style={{ width: 28, height: 28, color: '#059669' }} />
        </div>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, color: '#0A1628', fontWeight: 400, marginBottom: 8 }}>Account Created!</h2>
        <p style={{ fontSize: 14, color: '#64748B', marginBottom: 4 }}>Verification email sent to:</p>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#2563EB', marginBottom: 24 }}>{email}</p>
        <Link href="/auth/login" style={{ display: 'block', background: '#2563EB', color: '#fff', textDecoration: 'none', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 600, boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
          Continue to Sign In
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Left panel */}
      <div style={{ width: '42%', background: '#0A1628', display: 'flex', flexDirection: 'column', padding: '40px 48px' }} className="hidden lg:flex">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 48 }}>
          <div style={{ width: 34, height: 34, background: '#2563EB', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp style={{ width: 17, height: 17, color: '#fff' }} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>ForexBot Markets</span>
        </Link>

        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 30, color: '#fff', fontWeight: 400, lineHeight: 1.2, marginBottom: 20 }}>
            Join 18,000+ traders using verified algorithms
          </h2>
          <p style={{ fontSize: 15, color: '#475569', marginBottom: 36, lineHeight: 1.7 }}>
            Every algorithm on our platform is independently verified with real forward-test data and institutional risk metrics.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Verified Algorithms', value: '2,400+' },
              { label: 'Free Trial Period', value: '7 days' },
              { label: 'Credit Card Required', value: 'No' },
              { label: 'Cancel Anytime', value: 'Yes' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #112240', paddingBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#475569' }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#60A5FA' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 11, color: '#334155', lineHeight: 1.6, marginTop: 32 }}>
          Trading foreign exchange involves significant risk. Past performance does not guarantee future results.
        </p>
      </div>

      {/* Right: Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 28 }}>
            <div style={{ width: 30, height: 30, background: '#2563EB', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp style={{ width: 15, height: 15, color: '#fff' }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0A1628' }}>ForexBot Markets</span>
          </Link>

          <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 28, color: '#0A1628', fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 6 }}>Create your account</h1>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 28 }}>Start your 7-day free trial, no credit card required.</p>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 14px', marginBottom: 20 }}>
              <AlertCircle style={{ width: 15, height: 15, color: '#DC2626', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#DC2626' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '11px 14px', fontSize: 14, color: '#0A1628', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
                onFocus={e => (e.target.style.borderColor = '#2563EB')}
                onBlur={e => (e.target.style.borderColor = '#E2E8F0')} />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Create a strong password"
                  style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '11px 42px 11px 14px', fontSize: 14, color: '#0A1628', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
                  onFocus={e => (e.target.style.borderColor = '#2563EB')}
                  onBlur={e => (e.target.style.borderColor = '#E2E8F0')} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>
                  {showPass ? <EyeOff style={{ width: 17, height: 17 }} /> : <Eye style={{ width: 17, height: 17 }} />}
                </button>
              </div>

              {/* Strength */}
              {password && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 9999, background: i <= strength ? (strength <= 1 ? '#DC2626' : strength <= 2 ? '#D97706' : strength <= 3 ? '#2563EB' : '#059669') : '#E2E8F0', transition: 'background 0.2s' }} />
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    {RULES.map(rule => (
                      <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: rule.test(password) ? '#059669' : '#94A3B8' }}>
                        <span style={{ fontSize: 10 }}>{rule.test(password) ? '✓' : '○'}</span> {rule.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading || strength < 3}
              style={{ width: '100%', background: loading || strength < 3 ? '#93C5FD' : '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 15, fontWeight: 600, cursor: loading || strength < 3 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, fontFamily: 'DM Sans, sans-serif', boxShadow: loading || strength < 3 ? 'none' : '0 2px 8px rgba(37,99,235,0.3)' }}>
              {loading ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Creating account...</> : 'Create Free Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#64748B', marginTop: 20 }}>
            Already have an account?{' '}
            <Link href="/auth/login" style={{ color: '#2563EB', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
