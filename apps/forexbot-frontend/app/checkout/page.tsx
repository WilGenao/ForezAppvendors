'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Lock, CreditCard, AlertTriangle, ArrowLeft, ExternalLink, ChevronLeft, CheckCircle } from 'lucide-react';
import { paymentsApi } from '@/lib/api';

const PLANS = [
  { id: 'subscription_monthly', label: 'Monthly',  badge: '',     suffix: '/mo'  },
  { id: 'subscription_yearly',  label: 'Yearly',   badge: '-20%', suffix: '/yr'  },
  { id: 'one_time',             label: 'Lifetime', badge: '',     suffix: ''     },
];
const DISCOUNT: Record<string, number> = { subscription_monthly: 1, subscription_yearly: 0.80, one_time: 1 };

const MOCK_BOT = { id: '1', listingId: '0e033741-b04a-4c0c-a3c2-d20841db05b6', name: 'EuroScalper Pro', seller: 'AlgoTrader Labs', platform: 'MT5', pair: 'EURUSD', price: 89, verified: true, wr: 68.4, sharpe: 2.31, dd: -4.2 };

const card = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

function CheckoutContent() {
  const searchParams = useSearchParams();
  const botId = searchParams.get('bot') || '1';
  const [plan, setPlan] = useState('subscription_monthly');
  const [step, setStep] = useState<'plan' | 'confirm' | 'redirecting' | 'error'>('plan');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mtAccount, setMtAccount] = useState('');
  const [mtPlatform, setMtPlatform] = useState('MT5');
  const [agreed, setAgreed] = useState(false);

  const bot = MOCK_BOT;
  const discount = DISCOUNT[plan] ?? 1;
  const months = plan === 'subscription_yearly' ? 12 : 1;
  const total = plan === 'one_time' ? bot.price.toFixed(2) : (bot.price * months * discount).toFixed(2);
  const savings = discount < 1 ? ((bot.price * months) - Number(total)).toFixed(2) : null;
  const selectedPlan = PLANS.find(p => p.id === plan)!;

  const handleProceed = () => {
    if (!mtAccount.trim()) { setError('MT account ID is required'); return; }
    setError(''); setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!agreed) { setError('Please accept the terms to continue'); return; }
    setError(''); setLoading(true); setStep('redirecting');
    try {
      const res = await paymentsApi.createCheckout({ botListingId: bot.listingId, listingType: plan });
      const { checkoutUrl } = res.data;
      if (!checkoutUrl) throw new Error('No checkout URL');
      window.location.href = checkoutUrl;
    } catch (err: unknown) {
      setStep('confirm'); setLoading(false);
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create checkout session.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, background: '#2563EB', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>💹</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0A1628' }}>ForexBot Markets</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#059669' }}>
          <Lock style={{ width: 13, height: 13 }} /> SSL Secured Checkout
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

        {/* Left: Form */}
        <div>
          <Link href={`/marketplace/${botId}`} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#64748B', textDecoration: 'none', marginBottom: 20 }}>
            <ChevronLeft style={{ width: 14, height: 14 }} /> Back to bot details
          </Link>

          {step === 'plan' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, color: '#0A1628', fontWeight: 400, letterSpacing: '-0.02em' }}>Choose Your Plan</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PLANS.map(p => {
                  const d = DISCOUNT[p.id] ?? 1;
                  const t = p.id === 'one_time' ? bot.price : bot.price * (p.id === 'subscription_yearly' ? 12 : 1) * d;
                  const active = plan === p.id;
                  return (
                    <button key={p.id} onClick={() => setPlan(p.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 10, border: `1.5px solid ${active ? '#2563EB' : '#E2E8F0'}`, background: active ? '#EFF6FF' : '#fff', cursor: 'pointer', boxShadow: active ? '0 0 0 2px rgba(37,99,235,0.1)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${active ? '#2563EB' : '#CBD5E1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }} />}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: active ? '#2563EB' : '#334155' }}>{p.label}</span>
                          {p.badge && <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 100, padding: '1px 8px', marginLeft: 8 }}>{p.badge}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: 16, fontWeight: 700, color: active ? '#2563EB' : '#0A1628', fontFamily: 'DM Serif Display, serif' }}>${t.toFixed(0)}{p.suffix}</span>
                    </button>
                  );
                })}
              </div>

              {savings && <div style={{ fontSize: 13, color: '#059669', textAlign: 'center', fontWeight: 600 }}>You save ${savings} vs monthly billing</div>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>MT Account ID <span style={{ color: '#DC2626' }}>*</span></label>
                  <input type="text" value={mtAccount} onChange={e => setMtAccount(e.target.value)} placeholder="e.g. 12345678"
                    style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '11px 14px', fontSize: 14, color: '#0A1628', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
                    onFocus={e => (e.target.style.borderColor = '#2563EB')} onBlur={e => (e.target.style.borderColor = '#E2E8F0')} />
                  <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 5 }}>Your MetaTrader account number for license binding.</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Platform</label>
                  <select value={mtPlatform} onChange={e => setMtPlatform(e.target.value)}
                    style={{ width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '11px 14px', fontSize: 14, color: '#334155', outline: 'none', fontFamily: 'DM Sans, sans-serif' }}>
                    <option value="MT5">MetaTrader 5</option>
                    <option value="MT4">MetaTrader 4</option>
                  </select>
                </div>
              </div>

              {error && <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626' }}><AlertTriangle style={{ width: 14, height: 14 }} /> {error}</div>}

              <button onClick={handleProceed} style={{ padding: '13px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
                Continue to Payment
              </button>
            </div>
          )}

          {step === 'confirm' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, color: '#0A1628', fontWeight: 400, letterSpacing: '-0.02em' }}>Confirm & Pay</h2>

              <div style={{ ...card, padding: 16 }}>
                {[
                  { label: 'Plan', value: selectedPlan.label },
                  { label: 'MT Account', value: `${mtAccount} (${mtPlatform})` },
                  { label: 'Subtotal', value: `$${total}` },
                ].map((item, i, arr) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                    <span style={{ color: '#64748B' }}>{item.label}</span>
                    <span style={{ fontWeight: i === arr.length - 1 ? 700 : 500, color: '#0A1628' }}>{item.value}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 10 }}>
                <ExternalLink style={{ width: 15, height: 15, color: '#2563EB', flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: '#1D4ED8', lineHeight: 1.6 }}>
                  You'll be redirected to Stripe's secure checkout. Your payment details are handled directly by Stripe — we never store card information.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <input type="checkbox" id="terms" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="terms" style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                  I understand this is a technology tool, not financial advice. Trading involves significant risk of loss. Past performance does not guarantee future results.
                </label>
              </div>

              {error && <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626' }}><AlertTriangle style={{ width: 14, height: 14 }} /> {error}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep('plan')} style={{ flex: 1, padding: '12px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <ArrowLeft style={{ width: 14, height: 14 }} /> Back
                </button>
                <button onClick={handleSubmit} disabled={loading || !agreed}
                  style={{ flex: 2, padding: '12px', background: !agreed ? '#93C5FD' : '#2563EB', color: '#fff', border: 'none', borderRadius: 8, cursor: !agreed ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <CreditCard style={{ width: 15, height: 15 }} /> Pay with Stripe
                </button>
              </div>
            </div>
          )}

          {step === 'redirecting' && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #EFF6FF', borderTopColor: '#2563EB', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 15, color: '#475569' }}>Redirecting to Stripe Checkout...</p>
            </div>
          )}
        </div>

        {/* Right: Bot summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 24 }}>
          <div style={{ ...card, overflow: 'hidden' }}>
            <div style={{ background: '#0A1628', padding: '16px 18px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>You're subscribing to</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{bot.name}</span>
                {bot.verified && <ShieldCheck style={{ width: 15, height: 15, color: '#34D399' }} />}
              </div>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>{bot.seller} · {bot.platform}</div>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {[
                  { label: 'Win Rate', value: `${bot.wr}%`, color: '#059669' },
                  { label: 'Sharpe', value: String(bot.sharpe), color: '#2563EB' },
                  { label: 'Max DD', value: `${bot.dd}%`, color: '#DC2626' },
                  { label: 'Pair', value: bot.pair, color: '#334155' },
                ].map(m => (
                  <div key={m.label} style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 10px' }}>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 3 }}>{m.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: m.color, fontFamily: 'JetBrains Mono, monospace' }}>{m.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#64748B' }}>{selectedPlan.label} plan</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#0A1628', fontFamily: 'DM Serif Display, serif' }}>${total}{selectedPlan.suffix}</span>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div style={{ ...card, padding: 14 }}>
            {[
              { icon: ShieldCheck, text: 'Verified algorithm · Real trade data', color: '#2563EB' },
              { icon: Lock, text: 'PCI-DSS compliant via Stripe', color: '#059669' },
              { icon: CheckCircle, text: 'Cancel anytime, no lock-in', color: '#7C3AED' },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #F8FAFC', fontSize: 12, color: '#475569' }}>
                <item.icon style={{ width: 14, height: 14, color: item.color, flexShrink: 0 }} /> {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
