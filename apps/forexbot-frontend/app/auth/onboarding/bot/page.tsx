'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Loader2, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import { api } from '@/lib/api';

const PLATFORMS = ['MT4', 'MT5', 'BOTH'];
const PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD', 'XAUUSD', 'MULTI'];
const TIMEFRAMES = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'];

export default function OnboardingBotPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    shortDescription: '',
    description: '',
    mtPlatform: 'MT5',
    currencyPairs: [] as string[],
    timeframes: [] as string[],
    riskLevel: 3,
  });

  const toggle = (field: 'currencyPairs' | 'timeframes', val: string) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(val) ? f[field].filter(v => v !== val) : [...f[field], val],
    }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.shortDescription || !form.mtPlatform || !form.currencyPairs.length || !form.timeframes.length) {
      setError('Please fill in all required fields.'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await api.post('/marketplace/bots', form);
      router.push(`/dashboard/seller?bot_created=${res.data.slug}`);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create bot');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-xl space-y-4">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {['Identity', 'Payments', 'First Bot'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i < 2 ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
                {i < 2 ? '✓' : i + 1}
              </div>
              <span className={`text-xs ${i === 2 ? 'text-white font-bold' : 'text-green-400'}`}>{step}</span>
              {i < 2 && <div className="w-8 h-px bg-green-600/40" />}
            </div>
          ))}
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded overflow-hidden">
          <div className="bg-[#1c2128] px-5 py-4 border-b border-[#30363d] flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-white font-bold text-sm">Create Your First Bot</p>
              <p className="text-gray-500 text-xs">Start as a draft — go live once reviewed by our team.</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded p-3 text-xs text-red-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1.5">Bot Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                maxLength={200} placeholder="e.g. EuroScalper Pro"
                className="w-full bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition-colors" />
            </div>

            {/* Short description */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1.5">Short Description * <span className="text-gray-600">({form.shortDescription.length}/500)</span></label>
              <input value={form.shortDescription} onChange={e => setForm(f => ({ ...f, shortDescription: e.target.value }))}
                maxLength={500} placeholder="One-line summary shown in marketplace listings"
                className="w-full bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded px-3 py-2 text-sm text-white placeholder-gray-600 outline-none transition-colors" />
            </div>

            {/* Platform */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2">Platform *</label>
              <div className="flex gap-2">
                {PLATFORMS.map(p => (
                  <button key={p} onClick={() => setForm(f => ({ ...f, mtPlatform: p }))}
                    className={`flex-1 py-2 rounded border text-xs font-bold transition-colors ${form.mtPlatform === p ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-[#21262d] border-[#30363d] text-gray-500 hover:text-white'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Currency pairs */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2">Currency Pairs * <span className="text-gray-600">({form.currencyPairs.length} selected)</span></label>
              <div className="flex flex-wrap gap-1.5">
                {PAIRS.map(p => (
                  <button key={p} onClick={() => toggle('currencyPairs', p)}
                    className={`px-2.5 py-1 rounded border text-[10px] font-bold transition-colors ${form.currencyPairs.includes(p) ? 'bg-green-600/20 border-green-500/50 text-green-400' : 'bg-[#21262d] border-[#30363d] text-gray-500 hover:text-white'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Timeframes */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2">Timeframes * <span className="text-gray-600">({form.timeframes.length} selected)</span></label>
              <div className="flex flex-wrap gap-1.5">
                {TIMEFRAMES.map(t => (
                  <button key={t} onClick={() => toggle('timeframes', t)}
                    className={`px-2.5 py-1 rounded border text-[10px] font-bold transition-colors ${form.timeframes.includes(t) ? 'bg-purple-600/20 border-purple-500/50 text-purple-400' : 'bg-[#21262d] border-[#30363d] text-gray-500 hover:text-white'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Risk level */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2">
                Risk Level: <span className={`font-bold ${['', 'text-green-400', 'text-green-400', 'text-yellow-400', 'text-orange-400', 'text-red-400'][form.riskLevel]}`}>
                  {['', 'Very Low', 'Low', 'Medium', 'High', 'Very High'][form.riskLevel]}
                </span>
              </label>
              <input type="range" min={1} max={5} value={form.riskLevel}
                onChange={e => setForm(f => ({ ...f, riskLevel: Number(e.target.value) }))}
                className="w-full accent-blue-500" />
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1.5">Full Description (optional)</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} placeholder="Describe your strategy, entry/exit rules, backtest results..."
                className="w-full bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded px-3 py-2 text-xs text-white placeholder-gray-600 outline-none transition-colors resize-none" />
            </div>

            <button onClick={handleSubmit} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Bot Draft
            </button>

            <p className="text-[10px] text-gray-600 text-center">Bot will be saved as a draft. Submit for review from your seller dashboard.</p>

            <button onClick={() => router.push('/dashboard/seller')}
              className="w-full py-2 text-xs text-gray-500 hover:text-white transition-colors">
              Skip — go to dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
