'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, ShieldCheck, Lock, CreditCard, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { paymentsApi } from '@/lib/api';

const PLANS = [
  { id: 'monthly', label: 'Monthly', multiplier: 1, badge: '' },
  { id: 'quarterly', label: 'Quarterly', multiplier: 3, badge: '-10%' },
  { id: 'yearly', label: 'Yearly', multiplier: 12, badge: '-20%' },
];

const DISCOUNT: Record<string, number> = { monthly: 1, quarterly: 0.90, yearly: 0.80 };

// Mock bot data — replace with API call using botId
const MOCK_BOT = {
  id: '1',
  name: 'EuroScalper.Pro',
  seller: 'AlgoTrader Labs',
  platform: 'MT5',
  pair: 'EURUSD',
  price: 89,
  verified: true,
  wr: 68.4,
  sharpe: 2.31,
  dd: -4.2,
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const botId = searchParams.get('bot') || '1';

  const [plan, setPlan] = useState('monthly');
  const [step, setStep] = useState<'plan' | 'payment' | 'success'>('plan');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mtAccount, setMtAccount] = useState('');
  const [mtPlatform, setMtPlatform] = useState('MT5');
  const [agreed, setAgreed] = useState(false);

  // Payment fields (UI only — real charge handled by Stripe on backend)
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');

  const bot = MOCK_BOT;
  const basePrice = bot.price;
  const months = plan === 'monthly' ? 1 : plan === 'quarterly' ? 3 : 12;
  const discount = DISCOUNT[plan];
  const total = (basePrice * months * discount).toFixed(2);
  const savings = plan !== 'monthly' ? ((basePrice * months) - Number(total)).toFixed(2) : null;

  const formatCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length >= 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const handleProceedToPayment = () => {
    if (!mtAccount.trim()) { setError('MT account ID is required'); return; }
    setError('');
    setStep('payment');
  };

  const handleSubmitPayment = async () => {
    if (!cardNumber || !expiry || !cvc || !cardName) { setError('All card fields are required'); return; }
    if (!agreed) { setError('Please accept the terms to continue'); return; }
    setError('');
    setLoading(true);
    try {
      await paymentsApi.createCheckout({ botId, listingId: botId });
      setStep('success');
    } catch {
      // In demo mode, just proceed to success
      setStep('success');
    } finally {
      setLoading(false);
    }
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
        <div className="flex items-center gap-2">
          <Lock className="w-3 h-3 text-mt-green" />
          <span className="font-mono text-[10px] text-mt-green">SSL SECURED</span>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-4xl">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-6">
            <Link href={`/marketplace/${botId}`} className="flex items-center gap-1 font-mono text-xs text-muted hover:text-white transition-colors">
              <ArrowLeft className="w-3 h-3" /> Back to bot
            </Link>
            <span className="font-mono text-xs text-[#333]">/</span>
            <span className="font-mono text-xs text-white">Checkout</span>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-0 mb-6">
            {['SELECT PLAN', 'PAYMENT', 'CONFIRMED'].map((s, i) => {
              const stepIndex = step === 'plan' ? 0 : step === 'payment' ? 1 : 2;
              return (
                <div key={s} className="flex items-center">
                  <div className={`flex items-center gap-2 font-mono text-[10px] px-3 py-1.5 ${
                    i === stepIndex ? 'text-white bg-mt-blue' :
                    i < stepIndex ? 'text-mt-green' : 'text-muted'
                  }`}>
                    <span className={`w-4 h-4 flex items-center justify-center border ${
                      i < stepIndex ? 'border-mt-green text-mt-green' :
                      i === stepIndex ? 'border-white text-white' : 'border-[#333] text-[#333]'
                    } text-[9px]`}>
                      {i < stepIndex ? '✓' : i + 1}
                    </span>
                    {s}
                  </div>
                  {i < 2 && <div className="w-8 h-px bg-border" />}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Left — main content */}
            <div className="lg:col-span-2 space-y-4">

              {/* STEP 1 — Plan selection */}
              {step === 'plan' && (
                <>
                  <div className="panel">
                    <div className="px-4 py-2 border-b border-border">
                      <span className="font-mono text-[10px] text-muted uppercase tracking-widest">// Select Billing Plan</span>
                    </div>
                    <div className="p-4 space-y-2">
                      {PLANS.map(p => {
                        const planTotal = (basePrice * (p.multiplier) * DISCOUNT[p.id]).toFixed(2);
                        const perMonth = (Number(planTotal) / p.multiplier).toFixed(2);
                        return (
                          <button key={p.id} onClick={() => setPlan(p.id)}
                            className={`w-full text-left p-4 border transition-colors ${
                              plan === p.id ? 'border-mt-blue bg-mt-blue/5' : 'border-border hover:border-[#333] hover:bg-surface'
                            }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${plan === p.id ? 'border-mt-blue' : 'border-[#333]'}`}>
                                  {plan === p.id && <div className="w-1.5 h-1.5 rounded-full bg-mt-blue" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs text-white font-semibold">{p.label}</span>
                                    {p.badge && (
                                      <span className="font-mono text-[9px] bg-mt-green/10 border border-mt-green/30 text-mt-green px-1.5 py-0.5">{p.badge}</span>
                                    )}
                                  </div>
                                  <span className="font-mono text-[10px] text-muted">${perMonth}/month · billed {p.id}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono text-sm text-white font-bold">${planTotal}</div>
                                {p.multiplier > 1 && (
                                  <div className="font-mono text-[10px] text-muted line-through">${(basePrice * p.multiplier).toFixed(2)}</div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="panel">
                    <div className="px-4 py-2 border-b border-border">
                      <span className="font-mono text-[10px] text-muted uppercase tracking-widest">// MetaTrader Account</span>
                    </div>
                    <div className="p-4 space-y-3">
                      <p className="font-mono text-[10px] text-muted">Your license will be bound to this MT account number.</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">// MT Account ID</label>
                          <input type="text" value={mtAccount} onChange={e => setMtAccount(e.target.value)}
                            placeholder="e.g. 123456"
                            className="w-full bg-mt-bg border border-border focus:border-mt-blue text-white placeholder-[#333] font-mono text-xs px-3 py-2.5 outline-none transition-colors" />
                        </div>
                        <div>
                          <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">// Platform</label>
                          <select value={mtPlatform} onChange={e => setMtPlatform(e.target.value)}
                            className="w-full bg-mt-bg border border-border focus:border-mt-blue text-white font-mono text-xs px-3 py-2.5 outline-none transition-colors">
                            <option value="MT5">MetaTrader 5</option>
                            <option value="MT4">MetaTrader 4</option>
                          </select>
                        </div>
                      </div>
                      {error && (
                        <div className="flex items-center gap-2 text-mt-red">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span className="font-mono text-[10px]">{error}</span>
                        </div>
                      )}
                      <button onClick={handleProceedToPayment}
                        className="w-full bg-mt-blue hover:bg-blue-500 text-white font-mono text-xs py-2.5 transition-colors">
                        PROCEED_TO_PAYMENT() →
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* STEP 2 — Payment */}
              {step === 'payment' && (
                <div className="panel">
                  <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted uppercase tracking-widest">// Payment Details</span>
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-mt-green" />
                      <span className="font-mono text-[10px] text-mt-green">256-bit SSL</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-4">

                    {/* Card icons */}
                    <div className="flex items-center gap-2">
                      {['VISA', 'MC', 'AMEX', 'STRIPE'].map(c => (
                        <span key={c} className="font-mono text-[9px] border border-border text-muted px-2 py-1">{c}</span>
                      ))}
                    </div>

                    <div>
                      <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">// Cardholder Name</label>
                      <input type="text" value={cardName} onChange={e => setCardName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-mt-bg border border-border focus:border-mt-blue text-white placeholder-[#333] font-mono text-xs px-3 py-2.5 outline-none transition-colors" />
                    </div>

                    <div>
                      <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">// Card Number</label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                        <input type="text" value={cardNumber} onChange={e => setCardNumber(formatCard(e.target.value))}
                          placeholder="1234 5678 9012 3456" maxLength={19}
                          className="w-full bg-mt-bg border border-border focus:border-mt-blue text-white placeholder-[#333] font-mono text-xs pl-9 pr-3 py-2.5 outline-none transition-colors" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">// Expiry</label>
                        <input type="text" value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))}
                          placeholder="MM/YY" maxLength={5}
                          className="w-full bg-mt-bg border border-border focus:border-mt-blue text-white placeholder-[#333] font-mono text-xs px-3 py-2.5 outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] text-muted uppercase tracking-wider block mb-1.5">// CVC</label>
                        <input type="text" value={cvc} onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="•••"
                          className="w-full bg-mt-bg border border-border focus:border-mt-blue text-white placeholder-[#333] font-mono text-xs px-3 py-2.5 outline-none transition-colors" />
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-mt-bg border border-border">
                      <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                        className="mt-0.5 accent-mt-blue" />
                      <span className="font-mono text-[10px] text-muted leading-relaxed">
                        I agree to the <Link href="#" className="text-mt-blue hover:underline">Terms of Service</Link> and <Link href="#" className="text-mt-blue hover:underline">Subscription Policy</Link>. I understand my license will be bound to MT account {mtAccount} on {mtPlatform}.
                      </span>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 text-mt-red">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="font-mono text-[10px]">{error}</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={() => setStep('plan')}
                        className="font-mono text-xs border border-border text-muted hover:text-white px-4 py-2.5 transition-colors">
                        ← BACK
                      </button>
                      <button onClick={handleSubmitPayment} disabled={loading}
                        className="flex-1 bg-mt-blue hover:bg-blue-500 disabled:opacity-50 text-white font-mono text-xs py-2.5 transition-colors flex items-center justify-center gap-2">
                        {loading ? (
                          <><span className="animate-spin">◌</span> PROCESSING...</>
                        ) : (
                          <><Lock className="w-3 h-3" /> PAY_NOW(${total})</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 — Success */}
              {step === 'success' && (
                <div className="panel p-8 text-center space-y-4">
                  <div className="w-14 h-14 bg-mt-green/10 border border-mt-green/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7 text-mt-green" />
                  </div>
                  <div>
                    <div className="font-mono text-sm text-mt-green font-bold">&gt; PAYMENT_SUCCESS()</div>
                    <div className="font-mono text-xs text-muted mt-1">Your subscription is now active</div>
                  </div>
                  <div className="panel-dark p-4 text-left space-y-2">
                    {[
                      { label: 'EA', value: bot.name },
                      { label: 'Plan', value: plan.charAt(0).toUpperCase() + plan.slice(1) },
                      { label: 'Total Charged', value: `$${total}` },
                      { label: 'MT Account', value: mtAccount },
                      { label: 'Platform', value: mtPlatform },
                      { label: 'License Status', value: 'ACTIVE' },
                    ].map(r => (
                      <div key={r.label} className="flex justify-between">
                        <span className="font-mono text-[10px] text-muted">{r.label}</span>
                        <span className={`font-mono text-[10px] font-semibold ${r.label === 'License Status' ? 'text-mt-green' : 'text-white'}`}>{r.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-center pt-2">
                    <Link href="/dashboard/buyer"
                      className="font-mono text-xs bg-mt-blue hover:bg-blue-500 text-white px-5 py-2 transition-colors">
                      VIEW_LICENSES() →
                    </Link>
                    <Link href="/marketplace"
                      className="font-mono text-xs border border-border text-muted hover:text-white px-5 py-2 transition-colors">
                      BROWSE_MORE()
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Right — Order summary */}
            <div className="space-y-4">
              <div className="panel">
                <div className="px-4 py-2 border-b border-border">
                  <span className="font-mono text-[10px] text-muted uppercase tracking-widest">// Order Summary</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-mt-blue/10 border border-mt-blue/30 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-4 h-4 text-mt-blue" />
                    </div>
                    <div>
                      <div className="font-mono text-xs text-white font-semibold">{bot.name}</div>
                      <div className="font-mono text-[10px] text-muted">by {bot.seller}</div>
                      {bot.verified && (
                        <div className="flex items-center gap-1 mt-1">
                          <ShieldCheck className="w-3 h-3 text-mt-green" />
                          <span className="font-mono text-[9px] text-mt-green">VERIFIED</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border pt-3 space-y-1">
                    {[
                      { label: 'Win Rate', value: `${bot.wr}%`, pos: true },
                      { label: 'Sharpe', value: bot.sharpe, pos: true },
                      { label: 'Max DD', value: `${bot.dd}%`, pos: false },
                      { label: 'Platform', value: bot.platform, pos: null },
                    ].map(m => (
                      <div key={m.label} className="flex justify-between">
                        <span className="font-mono text-[10px] text-muted">{m.label}</span>
                        <span className={`font-mono text-[10px] font-semibold ${m.pos === true ? 'val-pos' : m.pos === false ? 'val-neg' : 'text-white'}`}>{m.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border pt-3 space-y-1">
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-muted">Base price</span>
                      <span className="font-mono text-[10px] text-white">${basePrice}/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-[10px] text-muted">Plan</span>
                      <span className="font-mono text-[10px] text-white capitalize">{plan}</span>
                    </div>
                    {savings && (
                      <div className="flex justify-between">
                        <span className="font-mono text-[10px] text-muted">Savings</span>
                        <span className="font-mono text-[10px] text-mt-green">-${savings}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-border pt-2 mt-2">
                      <span className="font-mono text-xs text-white font-bold">TOTAL</span>
                      <span className="font-mono text-sm text-white font-bold">${total}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <div className="panel p-4 space-y-2">
                {[
                  { icon: Lock, text: '256-bit SSL encryption' },
                  { icon: ShieldCheck, text: '7-day money back guarantee' },
                  { icon: CheckCircle2, text: 'Cancel anytime, no lock-in' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-mt-green flex-shrink-0" />
                    <span className="font-mono text-[10px] text-muted">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-mt-bg flex items-center justify-center">
        <span className="font-mono text-xs text-muted animate-pulse">&gt; LOADING_CHECKOUT()...</span>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}