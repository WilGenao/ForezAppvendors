'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Activity, Upload, ChevronRight, ChevronLeft, CheckCircle2,
  AlertTriangle, X, Plus, FileCode, DollarSign, Settings, Eye
} from 'lucide-react';
import { marketplaceApi } from '@/lib/api';
import { api } from '@/lib/api';

const CURRENCY_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD',
  'USDCAD', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY',
  'XAUUSD', 'XAGUSD', 'US30', 'NAS100', 'SPX500',
];

const TIMEFRAMES = ['M1','M5','M15','M30','H1','H4','D1','W1','MN'];

const STEPS = [
  { id: 1, label: 'Info',    icon: FileCode },
  { id: 2, label: 'File',    icon: Upload },
  { id: 3, label: 'Pricing', icon: DollarSign },
  { id: 4, label: 'Review',  icon: Eye },
];

type ListingType = 'subscription_monthly' | 'subscription_yearly' | 'one_time';

interface BotForm {
  name: string;
  shortDescription: string;
  description: string;
  mtPlatform: 'MT4' | 'MT5';
  currencyPairs: string[];
  timeframes: string[];
  riskLevel: number;
  listingType: ListingType;
  priceCents: number;
  trialDays: number;
  file: File | null;
}

export default function SellerUploadPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<BotForm>({
    name: '',
    shortDescription: '',
    description: '',
    mtPlatform: 'MT5',
    currencyPairs: [],
    timeframes: [],
    riskLevel: 5,
    listingType: 'subscription_monthly',
    priceCents: 4900,
    trialDays: 7,
    file: null,
  });

  const set = (key: keyof BotForm, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleArr = (key: 'currencyPairs' | 'timeframes', val: string) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val],
    }));
  };

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(ex4|ex5|mq4|mq5)$/i)) {
      setError('Only .ex4, .ex5, .mq4, .mq5 files are accepted');
      return;
    }
    set('file', file);
    setError('');
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.name.trim()) return 'Bot name is required';
      if (!form.shortDescription.trim()) return 'Short description is required';
      if (form.currencyPairs.length === 0) return 'Select at least one currency pair';
      if (form.timeframes.length === 0) return 'Select at least one timeframe';
    }
    if (step === 2) {
      if (!form.file) return 'Please upload the bot file';
    }
    if (step === 3) {
      if (form.priceCents < 100) return 'Minimum price is $1.00';
    }
    return '';
  };

  const next = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError('');
    setStep((s) => s + 1);
  };

const handleSubmit = async () => {
  setLoading(true);
  setError('');
  try {
    const { data: bot } = await marketplaceApi.createBot({
      name: form.name,
      shortDescription: form.shortDescription,
      description: form.description,
      mtPlatform: form.mtPlatform,
      currencyPairs: form.currencyPairs,
      timeframes: form.timeframes,
      riskLevel: form.riskLevel,
    });

    // Create bot_version placeholder


    await api.post(`/marketplace/bots/${bot.id}/listings`, {
      listingType: form.listingType,
      priceCents: form.priceCents,
      trialDays: form.trialDays,
    });

    setSuccess(true);
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      || 'Failed to upload bot. Please try again.';
    setError(msg);
  } finally {
    setLoading(false);
  }
};

  if (success) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center font-mono text-white">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <div className="text-lg font-bold">Bot Submitted!</div>
          <div className="text-sm text-gray-400">
            Your bot is under review. We&apos;ll notify you once it&apos;s approved and live on the marketplace.
          </div>
          <div className="flex gap-2 justify-center pt-2">
            <Link href="/dashboard/seller" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold transition-colors">
              Go to Dashboard
            </Link>
            <button onClick={() => { setSuccess(false); setStep(1); setForm({ name: '', shortDescription: '', description: '', mtPlatform: 'MT5', currencyPairs: [], timeframes: [], riskLevel: 5, listingType: 'subscription_monthly', priceCents: 4900, trialDays: 7, file: null }); }}
              className="px-4 py-2 border border-[#30363d] hover:bg-[#21262d] rounded text-sm transition-colors">
              Upload Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white font-mono">
      {/* Header */}
      <div className="bg-[#161b22] border-b border-[#30363d] h-10 flex items-center px-4 justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold tracking-wider">FOREXBOT</span>
        </Link>
        <Link href="/dashboard/seller" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <div className="text-lg font-bold">Upload Bot</div>
          <div className="text-xs text-gray-500 mt-0.5">List your Expert Advisor on the marketplace</div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  active ? 'bg-blue-600 text-white' : done ? 'text-green-400' : 'text-gray-600'
                }`}>
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  {s.label}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-1 ${done ? 'bg-green-500/40' : 'bg-[#30363d]'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Bot Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-[#161b22] border border-[#30363d] rounded p-4 space-y-4">
              <div className="text-xs text-gray-400 uppercase tracking-widest">Basic Information</div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Bot Name *</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. EuroScalper Pro"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Short Description * <span className="text-gray-600">({form.shortDescription.length}/120)</span></label>
                <input value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value.slice(0, 120))}
                  placeholder="One-line summary shown in marketplace listings"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400">Full Description</label>
                <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
                  rows={4} placeholder="Detailed description of your bot's strategy, features, and requirements..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Platform *</label>
                  <select value={form.mtPlatform} onChange={(e) => set('mtPlatform', e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                    <option value="MT5">MetaTrader 5</option>
                    <option value="MT4">MetaTrader 4</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Risk Level (1-10)</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={1} max={10} value={form.riskLevel}
                      onChange={(e) => set('riskLevel', Number(e.target.value))}
                      className="flex-1 accent-blue-500" />
                    <span className={`text-sm font-bold w-6 text-center ${
                      form.riskLevel <= 3 ? 'text-green-400' : form.riskLevel <= 6 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{form.riskLevel}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#161b22] border border-[#30363d] rounded p-4 space-y-3">
              <div className="text-xs text-gray-400 uppercase tracking-widest">Currency Pairs *</div>
              <div className="flex flex-wrap gap-1.5">
                {CURRENCY_PAIRS.map((p) => (
                  <button key={p} onClick={() => toggleArr('currencyPairs', p)}
                    className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                      form.currencyPairs.includes(p)
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'border-[#30363d] text-gray-400 hover:border-[#484f58]'
                    }`}>{p}</button>
                ))}
              </div>
            </div>

            <div className="bg-[#161b22] border border-[#30363d] rounded p-4 space-y-3">
              <div className="text-xs text-gray-400 uppercase tracking-widest">Timeframes *</div>
              <div className="flex flex-wrap gap-1.5">
                {TIMEFRAMES.map((t) => (
                  <button key={t} onClick={() => toggleArr('timeframes', t)}
                    className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                      form.timeframes.includes(t)
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'border-[#30363d] text-gray-400 hover:border-[#484f58]'
                    }`}>{t}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: File Upload */}
        {step === 2 && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-blue-500 bg-blue-500/5' : form.file ? 'border-green-500/50 bg-green-500/5' : 'border-[#30363d] hover:border-[#484f58]'
              }`}
            >
              <input ref={fileRef} type="file" accept=".ex4,.ex5,.mq4,.mq5" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

              {form.file ? (
                <div className="space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
                  <div className="text-sm font-bold text-green-400">{form.file.name}</div>
                  <div className="text-xs text-gray-500">{(form.file.size / 1024).toFixed(1)} KB</div>
                  <button onClick={(e) => { e.stopPropagation(); set('file', null); }}
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mx-auto">
                    <X className="w-3 h-3" /> Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-10 h-10 text-gray-600 mx-auto" />
                  <div className="text-sm text-gray-400">Drop your bot file here or click to browse</div>
                  <div className="text-xs text-gray-600">Accepted: .ex4, .ex5, .mq4, .mq5 — Max 10MB</div>
                </div>
              )}
            </div>

            <div className="bg-[#161b22] border border-[#30363d] rounded p-3 text-xs text-gray-400 space-y-1">
              <div className="font-medium text-gray-300">Before uploading:</div>
              <div>• Remove any hardcoded account numbers or personal data</div>
              <div>• Test the bot on a demo account first</div>
              <div>• Compiled .ex5/.ex4 files are preferred over source code</div>
            </div>
          </div>
        )}

        {/* Step 3: Pricing */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-[#161b22] border border-[#30363d] rounded p-4 space-y-4">
              <div className="text-xs text-gray-400 uppercase tracking-widest">Plan Type</div>
              <div className="space-y-2">
                {([
                  { id: 'subscription_monthly', label: 'Monthly Subscription', desc: 'Recurring monthly payment' },
                  { id: 'subscription_yearly',  label: 'Yearly Subscription',  desc: 'Recurring annual payment' },
                  { id: 'one_time',             label: 'One-time Purchase',     desc: 'Lifetime access' },
                ] as { id: ListingType; label: string; desc: string }[]).map((p) => (
                  <button key={p.id} onClick={() => set('listingType', p.id)}
                    className={`w-full flex items-center justify-between p-3 rounded border text-left transition-colors ${
                      form.listingType === p.id ? 'border-blue-500 bg-blue-500/10' : 'border-[#30363d] hover:border-[#484f58]'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${form.listingType === p.id ? 'border-blue-500' : 'border-gray-600'}`}>
                        {form.listingType === p.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{p.label}</div>
                        <div className="text-xs text-gray-500">{p.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#161b22] border border-[#30363d] rounded p-4 space-y-4">
              <div className="text-xs text-gray-400 uppercase tracking-widest">Price</div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm">$</span>
                <input
                  type="number" min={1} step={1}
                  value={(form.priceCents / 100).toFixed(0)}
                  onChange={(e) => set('priceCents', Math.round(Number(e.target.value) * 100))}
                  className="w-32 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-xs text-gray-500">USD {form.listingType === 'subscription_monthly' ? '/month' : form.listingType === 'subscription_yearly' ? '/year' : 'one-time'}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 bg-[#0d1117] rounded p-2">
                <span>Platform fee (20%)</span>
                <span className="text-red-400">-${(form.priceCents * 0.20 / 100).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-300">Your payout</span>
                <span className="text-green-400">${(form.priceCents * 0.80 / 100).toFixed(2)}</span>
              </div>

              {form.listingType !== 'one_time' && (
                <div className="space-y-1 pt-2 border-t border-[#30363d]">
                  <label className="text-xs text-gray-400">Free Trial Days</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} max={30} value={form.trialDays}
                      onChange={(e) => set('trialDays', Number(e.target.value))}
                      className="w-20 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                    <span className="text-xs text-gray-500">days (0 = no trial)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-[#161b22] border border-[#30363d] rounded p-4 space-y-3 text-sm">
              <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">Summary</div>

              <div className="flex justify-between">
                <span className="text-gray-400">Name</span>
                <span className="font-medium">{form.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Platform</span>
                <span>{form.mtPlatform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Pairs</span>
                <span className="text-right max-w-xs text-xs">{form.currencyPairs.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Timeframes</span>
                <span>{form.timeframes.join(', ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">File</span>
                <span className="text-green-400">{form.file?.name ?? '—'}</span>
              </div>
              <div className="flex justify-between border-t border-[#30363d] pt-2">
                <span className="text-gray-400">Plan</span>
                <span>{form.listingType.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Price</span>
                <span className="font-bold">${(form.priceCents / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Your payout</span>
                <span className="text-green-400 font-bold">${(form.priceCents * 0.80 / 100).toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 text-xs text-yellow-300 space-y-1">
              <div className="font-medium">Before submitting:</div>
              <div>• Your bot will be reviewed by our team (1-3 business days)</div>
              <div>• You&apos;ll need to complete Stripe Connect onboarding to receive payouts</div>
              <div>• Once approved, your bot goes live on the marketplace</div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded p-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-2">
          {step > 1 && (
            <button onClick={() => { setStep((s) => s - 1); setError(''); }}
              className="flex items-center gap-1 px-4 py-2 border border-[#30363d] rounded text-sm hover:bg-[#21262d] transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          {step < 4 ? (
            <button onClick={next}
              className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold transition-colors">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded text-sm font-bold transition-colors">
              {loading ? 'Submitting...' : 'Submit Bot for Review'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

