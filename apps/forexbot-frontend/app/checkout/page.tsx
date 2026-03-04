'use client';

/**
 * FIX: Card data is NO LONGER collected in React state.
 *
 * BEFORE (broken): Raw card number/expiry/CVC were stored as useState strings.
 * This is a PCI DSS violation — card data must never touch your server or JS memory.
 *
 * AFTER (correct): Stripe.js Elements handles card input in a secure iframe.
 * Only a Stripe payment token is passed to your backend.
 *
 * SETUP REQUIRED:
 * 1. npm install @stripe/react-stripe-js @stripe/stripe-js  (in apps/forexbot-frontend)
 * 2. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local
 * 3. The backend must return { checkoutUrl } from POST /payments/checkout
 *    and redirect the user to Stripe Checkout (simplest approach) OR
 *    return a { clientSecret } for Stripe Payment Element (embedded approach).
 *
 * This implementation uses the Stripe Checkout redirect approach (simplest + most secure).
 */

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Activity, ShieldCheck, Lock, CreditCard, CheckCircle2, AlertTriangle, ArrowLeft, ExternalLink } from 'lucide-react';
import { paymentsApi } from '@/lib/api';

const PLANS = [
  { id: 'subscription_monthly',  label: 'Monthly',   multiplier: 1,  badge: '' },
  { id: 'subscription_yearly',   label: 'Yearly',    multiplier: 12, badge: '-20%' },
  { id: 'one_time',              label: 'One-time',  multiplier: 1,  badge: 'Lifetime' },
];

const DISCOUNT: Record<string, number> = {
  subscription_monthly: 1,
  subscription_yearly: 0.80,
  one_time: 1,
};

// This should be fetched from the API using the bot slug/id from search params.
// Using a typed placeholder until API integration is complete.
const MOCK_BOT = {
  id: '1',
  listingId: 'listing-uuid-replace-me',
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
  const botId = searchParams.get('bot') || '1';

  const [plan, setPlan] = useState<string>('subscription_monthly');
  const [step, setStep] = useState<'plan' | 'confirm' | 'redirecting' | 'error'>('plan');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mtAccount, setMtAccount] = useState('');
  const [mtPlatform, setMtPlatform] = useState('MT5');
  const [agreed, setAgreed] = useState(false);

  const bot = MOCK_BOT;
  const basePrice = bot.price;
  const discount = DISCOUNT[plan] ?? 1;
  const selectedPlan = PLANS.find((p) => p.id === plan)!;
  const months = plan === 'subscription_monthly' ? 1 : plan === 'subscription_yearly' ? 12 : 1;
  const total = plan === 'one_time'
    ? basePrice.toFixed(2)
    : (basePrice * months * discount).toFixed(2);
  const savings = discount < 1
    ? ((basePrice * months) - Number(total)).toFixed(2)
    : null;

  const handleProceedToConfirm = () => {
    if (!mtAccount.trim()) {
      setError('MT account ID is required');
      return;
    }
    setError('');
    setStep('confirm');
  };

  // FIX: handleSubmitPayment now calls the API to get a Stripe Checkout URL
  // and redirects the browser to Stripe's hosted checkout page.
  // Card data is NEVER collected here — Stripe handles it entirely.
  const handleSubmitPayment = async () => {
    if (!agreed) {
      setError('Please accept the terms to continue');
      return;
    }
    setError('');
    setLoading(true);
    setStep('redirecting');

    try {
      const res = await paymentsApi.createCheckout({
        botListingId: bot.listingId,
        listingType: plan,
      });

      // Stripe Checkout redirect
      const { checkoutUrl } = res.data;
      if (!checkoutUrl) throw new Error('No checkout URL returned from server');

      window.location.href = checkoutUrl;
    } catch (err: unknown) {
      setStep('confirm');
      setLoading(false);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to create checkout session. Please try again.';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col text-white font-mono">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#30363d] h-10 flex items-center px-4 justify-between flex-shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold tracking-wider">FOREXBOT</span>
        </Link>
        <div className="flex items-center gap-2">
          <Lock className="w-3 h-3 text-green-400" />
          <span className="text-[10px] text-green-400">SSL SECURED</span>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-xl space-y-4">

          {/* Back link */}
          <Link href={`/marketplace/${botId}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
            <ArrowLeft className="w-3 h-3" />
            Back to bot details
          </Link>

          {/* Bot summary */}
          <div className="bg-[#161b22] border border-[#30363d] rounded p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{bot.name}</span>
                {bot.verified && <ShieldCheck className="w-4 h-4 text-blue-400" />}
              </div>
              <div className="text-xs text-gray-400">{bot.seller} · {bot.platform} · {bot.pair}</div>
              <div className="text-xs text-gray-500 mt-1">
                WR {bot.wr}% · Sharpe {bot.sharpe} · DD {bot.dd}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-white">${basePrice}</div>
              <div className="text-xs text-gray-400">/mo</div>
            </div>
          </div>

          {/* Step: Plan selection */}
          {step === 'plan' && (
            <div className="space-y-4">
              <div className="text-xs text-gray-400 uppercase tracking-widest">Select Plan</div>
              <div className="space-y-2">
                {PLANS.map((p) => {
                  const d = DISCOUNT[p.id] ?? 1;
                  const t = p.id === 'one_time' ? basePrice : basePrice * (p.id === 'subscription_yearly' ? 12 : 1) * d;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPlan(p.id)}
                      className={`w-full flex items-center justify-between p-3 rounded border text-left transition-colors ${
                        plan === p.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-[#30363d] hover:border-[#484f58]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${plan === p.id ? 'border-blue-500' : 'border-gray-600'}`}>
                          {plan === p.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                        <span className="text-sm font-medium">{p.label}</span>
                        {p.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold">${t.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>

              {savings && (
                <div className="text-xs text-green-400 text-center">
                  You save ${savings} vs monthly billing
                </div>
              )}

              <div>
                <label className="block text-xs text-gray-400 mb-1">MT Account ID *</label>
                <input
                  type="text"
                  value={mtAccount}
                  onChange={(e) => setMtAccount(e.target.value)}
                  placeholder="e.g. 12345678"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
                <div className="text-[10px] text-gray-500 mt-1">
                  Your MetaTrader account number. Used to bind the license to your account.
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Platform</label>
                <select
                  value={mtPlatform}
                  onChange={(e) => setMtPlatform(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="MT5">MetaTrader 5</option>
                  <option value="MT4">MetaTrader 4</option>
                </select>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded p-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleProceedToConfirm}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold transition-colors"
              >
                Continue to Payment
              </button>
            </div>
          )}

          {/* Step: Confirm + Stripe redirect */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-[#161b22] border border-[#30363d] rounded p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Plan</span>
                  <span>{selectedPlan.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">MT Account</span>
                  <span>{mtAccount} ({mtPlatform})</span>
                </div>
                <div className="flex justify-between border-t border-[#30363d] pt-2 font-bold">
                  <span className="text-gray-400">Total</span>
                  <span>${total}</span>
                </div>
              </div>

              {/* FIX: No card input fields here. Stripe Checkout handles payment securely. */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 flex items-start gap-2">
                <ExternalLink className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-300">
                  You will be redirected to Stripe&apos;s secure checkout page to complete payment.
                  Your card details are handled directly by Stripe — we never see them.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="terms" className="text-xs text-gray-400">
                  I understand this is a technology tool, not financial advice. Trading involves
                  significant risk of loss. Past performance does not guarantee future results.
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded p-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('plan')}
                  className="flex-1 py-2 border border-[#30363d] rounded text-sm hover:bg-[#21262d] transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitPayment}
                  disabled={loading}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Pay with Stripe
                </button>
              </div>
            </div>
          )}

          {/* Step: Redirecting to Stripe */}
          {step === 'redirecting' && (
            <div className="text-center py-8 space-y-3">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-sm text-gray-400">Redirecting to Stripe Checkout...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
