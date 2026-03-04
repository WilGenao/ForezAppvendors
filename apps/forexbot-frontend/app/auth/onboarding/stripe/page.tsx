'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CreditCard, Loader2, CheckCircle2, ExternalLink, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

export default function OnboardingStripePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const stripe = searchParams.get('stripe');
    if (stripe === 'connected') setConnected(true);
    if (stripe === 'refresh') setError('Onboarding was interrupted. Please try again.');
  }, [searchParams]);

  const handleConnect = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/seller/stripe/onboarding');
      window.location.href = res.data;
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to connect Stripe');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-lg space-y-4">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {['Identity', 'Payments', 'First Bot'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-green-600 text-white' : i === 1 ? 'bg-blue-600 text-white' : 'bg-[#21262d] text-gray-600 border border-[#30363d]'}`}>
                {i === 0 ? '✓' : i + 1}
              </div>
              <span className={`text-xs ${i === 1 ? 'text-white font-bold' : i === 0 ? 'text-green-400' : 'text-gray-600'}`}>{step}</span>
              {i < 2 && <div className="w-8 h-px bg-[#30363d]" />}
            </div>
          ))}
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded overflow-hidden">
          <div className="bg-[#1c2128] px-5 py-4 border-b border-[#30363d] flex items-center gap-3">
            <CreditCard className={`w-5 h-5 ${connected ? 'text-green-400' : 'text-blue-400'}`} />
            <div>
              <p className="text-white font-bold text-sm">Connect Stripe</p>
              <p className="text-gray-500 text-xs">Receive payouts directly to your bank account.</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded p-3 text-xs text-red-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{error}
              </div>
            )}

            {connected ? (
              <div className="flex flex-col items-center py-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-green-400" />
                <p className="text-white font-bold">Stripe Connected!</p>
                <p className="text-gray-500 text-xs">You'll receive 80% of each sale, paid out automatically.</p>
                <button onClick={() => router.push('/auth/onboarding/bot')}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded transition-colors">
                  Continue → Create Your First Bot
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'Your cut', value: '80%', color: 'text-green-400' },
                    { label: 'Platform fee', value: '20%', color: 'text-gray-400' },
                    { label: 'Payout time', value: '2-7 days', color: 'text-blue-400' },
                  ].map(item => (
                    <div key={item.label} className="bg-[#21262d] border border-[#30363d] rounded p-3">
                      <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-[#21262d] border border-[#30363d] rounded p-3 text-xs text-gray-500 space-y-1">
                  <p className="font-bold text-gray-400">You'll need to provide:</p>
                  <p>· Bank account for payouts</p>
                  <p>· Tax ID (SSN or EIN for US, VAT/company number internationally)</p>
                  <p>· Personal details for identity verification</p>
                </div>

                <button onClick={handleConnect} disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded transition-colors">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                  Connect with Stripe
                </button>

                <button onClick={() => router.push('/auth/onboarding/bot')}
                  className="w-full py-2 text-xs text-gray-500 hover:text-white transition-colors">
                  Skip for now (you can connect later)
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
