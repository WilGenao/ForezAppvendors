'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { Upload, ChevronRight, ChevronLeft, CheckCircle, AlertTriangle, X, FileCode, DollarSign, Settings, Eye } from 'lucide-react';
import { marketplaceApi } from '@/lib/api';
import { api } from '@/lib/api';

const PAIRS = ['EURUSD','GBPUSD','USDJPY','USDCHF','AUDUSD','USDCAD','NZDUSD','EURGBP','EURJPY','GBPJPY','XAUUSD','XAGUSD','US30','NAS100','SPX500'];
const TFS = ['M1','M5','M15','M30','H1','H4','D1','W1','MN'];
const STEPS = [{ id: 1, label: 'Information', icon: FileCode }, { id: 2, label: 'Upload File', icon: Upload }, { id: 3, label: 'Pricing', icon: DollarSign }, { id: 4, label: 'Review', icon: Eye }];

type ListingType = 'subscription_monthly' | 'subscription_yearly' | 'one_time';
interface BotForm { name: string; shortDescription: string; description: string; mtPlatform: 'MT4' | 'MT5'; currencyPairs: string[]; timeframes: string[]; riskLevel: number; listingType: ListingType; priceCents: number; trialDays: number; file: File | null; }

const card = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };
const input = { width: '100%', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '11px 14px', fontSize: 14, color: '#0A1628', outline: 'none', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' as const };

export default function SellerUploadPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<BotForm>({ name: '', shortDescription: '', description: '', mtPlatform: 'MT5', currencyPairs: [], timeframes: [], riskLevel: 5, listingType: 'subscription_monthly', priceCents: 4900, trialDays: 7, file: null });

  const set = (key: keyof BotForm, value: unknown) => setForm(f => ({ ...f, [key]: value }));
  const toggleArr = (key: 'currencyPairs' | 'timeframes', val: string) => setForm(f => ({ ...f, [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val] }));

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(ex4|ex5|mq4|mq5)$/i)) { setError('Only .ex4, .ex5, .mq4, .mq5 files are accepted'); return; }
    set('file', file); setError('');
  };

  const validate = () => {
    if (step === 1) { if (!form.name.trim()) return 'Bot name is required'; if (!form.shortDescription.trim()) return 'Short description is required'; if (!form.currencyPairs.length) return 'Select at least one currency pair'; if (!form.timeframes.length) return 'Select at least one timeframe'; }
    if (step === 2 && !form.file) return 'Please upload the bot file';
    if (step === 3 && form.priceCents < 100) return 'Minimum price is $1.00';
    return '';
  };

  const next = () => { const e = validate(); if (e) { setError(e); return; } setError(''); setStep(s => s + 1); };

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const { data: bot } = await marketplaceApi.createBot({ name: form.name, shortDescription: form.shortDescription, description: form.description, mtPlatform: form.mtPlatform, currencyPairs: form.currencyPairs, timeframes: form.timeframes, riskLevel: form.riskLevel });
      await api.post(`/marketplace/bots/${bot.id}/listings`, { listingType: form.listingType, priceCents: form.priceCents, trialDays: form.trialDays });
      setSuccess(true);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to upload bot.');
    } finally { setLoading(false); }
  };

  if (success) return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', padding: 24 }}>
      <div style={{ ...card, padding: 40, maxWidth: 380, textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#ECFDF5', border: '2px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle style={{ width: 30, height: 30, color: '#059669' }} />
        </div>
        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 24, color: '#0A1628', fontWeight: 400, marginBottom: 10 }}>Bot Submitted!</h2>
        <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>Your bot is under review. We&apos;ll notify you once it&apos;s approved and live on the marketplace (1-3 business days).</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/dashboard/seller" style={{ flex: 1, background: '#2563EB', color: '#fff', textDecoration: 'none', padding: '11px', borderRadius: 8, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>Dashboard</Link>
          <button onClick={() => { setSuccess(false); setStep(1); setForm({ name: '', shortDescription: '', description: '', mtPlatform: 'MT5', currencyPairs: [], timeframes: [], riskLevel: 5, listingType: 'subscription_monthly', priceCents: 4900, trialDays: 7, file: null }); }}
            style={{ flex: 1, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '11px', fontSize: 13, cursor: 'pointer', color: '#475569' }}>
            Upload Another
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#0A1628' }}>Upload Algorithm</span>
        <Link href="/dashboard/seller" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
          <ChevronLeft style={{ width: 14, height: 14 }} /> Back to Dashboard
        </Link>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28 }}>
          {STEPS.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? '#059669' : active ? '#2563EB' : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {done ? <CheckCircle style={{ width: 16, height: 16, color: '#fff' }} /> : <s.icon style={{ width: 13, height: 13, color: active ? '#fff' : '#94A3B8' }} />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#0A1628' : '#94A3B8' }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: done ? '#A7F3D0' : '#E2E8F0', margin: '0 12px' }} />}
              </div>
            );
          })}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ ...card, padding: 22 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 16 }}>Basic Information</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Bot Name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. EuroScalper Pro" style={input}
                    onFocus={e => (e.target.style.borderColor = '#2563EB')} onBlur={e => (e.target.style.borderColor = '#E2E8F0')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Short Description * <span style={{ color: '#94A3B8', fontWeight: 400 }}>({form.shortDescription.length}/120)</span></label>
                  <input value={form.shortDescription} onChange={e => set('shortDescription', e.target.value.slice(0, 120))} placeholder="One-line summary for marketplace listings" style={input}
                    onFocus={e => (e.target.style.borderColor = '#2563EB')} onBlur={e => (e.target.style.borderColor = '#E2E8F0')} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Full Description</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} placeholder="Detailed description of your strategy, requirements, and features..."
                    style={{ ...input, resize: 'none' as const, lineHeight: 1.6 }} onFocus={e => (e.target.style.borderColor = '#2563EB')} onBlur={e => (e.target.style.borderColor = '#E2E8F0')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Platform *</label>
                    <select value={form.mtPlatform} onChange={e => set('mtPlatform', e.target.value)} style={{ ...input }}>
                      <option value="MT5">MetaTrader 5</option>
                      <option value="MT4">MetaTrader 4</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Risk Level: <span style={{ color: form.riskLevel <= 3 ? '#059669' : form.riskLevel <= 6 ? '#D97706' : '#DC2626' }}>{form.riskLevel}/10</span></label>
                    <input type="range" min={1} max={10} value={form.riskLevel} onChange={e => set('riskLevel', Number(e.target.value))}
                      style={{ width: '100%', marginTop: 14, accentColor: '#2563EB' }} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ ...card, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 12 }}>Currency Pairs *</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PAIRS.map(p => (
                  <button key={p} onClick={() => toggleArr('currencyPairs', p)}
                    style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 6, border: `1.5px solid ${form.currencyPairs.includes(p) ? '#2563EB' : '#E2E8F0'}`, background: form.currencyPairs.includes(p) ? '#EFF6FF' : '#fff', color: form.currencyPairs.includes(p) ? '#2563EB' : '#475569', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ ...card, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 12 }}>Timeframes *</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TFS.map(t => (
                  <button key={t} onClick={() => toggleArr('timeframes', t)}
                    style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 6, border: `1.5px solid ${form.timeframes.includes(t) ? '#2563EB' : '#E2E8F0'}`, background: form.timeframes.includes(t) ? '#EFF6FF' : '#fff', color: form.timeframes.includes(t) ? '#2563EB' : '#475569', cursor: 'pointer', fontFamily: 'JetBrains Mono, monospace' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileRef.current?.click()}
              style={{ ...card, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', border: `2px dashed ${dragOver ? '#2563EB' : form.file ? '#A7F3D0' : '#E2E8F0'}`, background: dragOver ? '#EFF6FF' : form.file ? '#ECFDF5' : '#fff', transition: 'all 0.2s' }}>
              <input ref={fileRef} type="file" accept=".ex4,.ex5,.mq4,.mq5" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {form.file ? (
                <div>
                  <CheckCircle style={{ width: 36, height: 36, color: '#059669', margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#059669', marginBottom: 4 }}>{form.file.name}</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 12 }}>{(form.file.size / 1024).toFixed(1)} KB</div>
                  <button onClick={e => { e.stopPropagation(); set('file', null); }} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', margin: '0 auto' }}>
                    <X style={{ width: 13, height: 13 }} /> Remove file
                  </button>
                </div>
              ) : (
                <div>
                  <Upload style={{ width: 36, height: 36, color: '#94A3B8', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#334155', marginBottom: 6 }}>Drop your bot file here</div>
                  <div style={{ fontSize: 13, color: '#94A3B8' }}>or click to browse · .ex4, .ex5, .mq4, .mq5 · Max 10MB</div>
                </div>
              )}
            </div>

            <div style={{ ...card, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0A1628', marginBottom: 10 }}>Before uploading</div>
              {['Remove any hardcoded account numbers or personal data', 'Test on a demo account first', 'Compiled .ex5/.ex4 files are preferred over source code'].map(tip => (
                <div key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#64748B', paddingBottom: 8 }}>
                  <span style={{ color: '#2563EB', marginTop: 1 }}>·</span> {tip}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ ...card, padding: 22 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 16 }}>Subscription Plan</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {([
                  { id: 'subscription_monthly', label: 'Monthly Subscription', desc: 'Recurring monthly payment' },
                  { id: 'subscription_yearly',  label: 'Yearly Subscription',  desc: 'Recurring annual — offer a discount' },
                  { id: 'one_time',             label: 'One-time Purchase',     desc: 'Lifetime access, single payment' },
                ] as { id: ListingType; label: string; desc: string }[]).map(p => {
                  const active = form.listingType === p.id;
                  return (
                    <button key={p.id} onClick={() => set('listingType', p.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8, border: `1.5px solid ${active ? '#2563EB' : '#E2E8F0'}`, background: active ? '#EFF6FF' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${active ? '#2563EB' : '#CBD5E1'}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: active ? '#2563EB' : '#334155' }}>{p.label}</div>
                        <div style={{ fontSize: 12, color: '#94A3B8' }}>{p.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ ...card, padding: 22 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 16 }}>Pricing</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 16, color: '#94A3B8' }}>$</span>
                <input type="number" min={1} value={(form.priceCents / 100).toFixed(0)} onChange={e => set('priceCents', Math.round(Number(e.target.value) * 100))}
                  style={{ ...input, width: 100 }} onFocus={e => (e.target.style.borderColor = '#2563EB')} onBlur={e => (e.target.style.borderColor = '#E2E8F0')} />
                <span style={{ fontSize: 13, color: '#94A3B8' }}>USD {form.listingType === 'subscription_monthly' ? '/month' : form.listingType === 'subscription_yearly' ? '/year' : 'one-time'}</span>
              </div>

              <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#64748B' }}>Platform fee (20%)</span>
                  <span style={{ color: '#DC2626', fontWeight: 600 }}>-${(form.priceCents * 0.20 / 100).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>Your payout</span>
                  <span style={{ fontWeight: 700, color: '#059669', fontSize: 16 }}>${(form.priceCents * 0.80 / 100).toFixed(2)}</span>
                </div>
              </div>

              {form.listingType !== 'one_time' && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Free Trial Days</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="number" min={0} max={30} value={form.trialDays} onChange={e => set('trialDays', Number(e.target.value))}
                      style={{ ...input, width: 80 }} onFocus={e => (e.target.style.borderColor = '#2563EB')} onBlur={e => (e.target.style.borderColor = '#E2E8F0')} />
                    <span style={{ fontSize: 13, color: '#94A3B8' }}>days (0 = no trial)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ ...card, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0A1628', marginBottom: 14 }}>Submission Summary</h3>
              {[
                { label: 'Name', value: form.name },
                { label: 'Platform', value: form.mtPlatform },
                { label: 'Pairs', value: form.currencyPairs.join(', ') },
                { label: 'Timeframes', value: form.timeframes.join(', ') },
                { label: 'File', value: form.file?.name ?? '—' },
                { label: 'Plan', value: form.listingType.replace('_', ' ') },
                { label: 'Price', value: `$${(form.priceCents / 100).toFixed(2)}` },
                { label: 'Your payout', value: `$${(form.priceCents * 0.80 / 100).toFixed(2)}` },
              ].map((item, i, arr) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                  <span style={{ color: '#94A3B8' }}>{item.label}</span>
                  <span style={{ fontWeight: 600, color: i === arr.length - 1 ? '#059669' : '#334155', textAlign: 'right', maxWidth: 280 }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 8 }}>What happens next?</div>
              {['Your bot will be reviewed by our team (1-3 business days)', 'You will need Stripe Connect onboarding to receive payouts', 'Once approved, your bot goes live on the marketplace'].map(tip => (
                <div key={tip} style={{ fontSize: 13, color: '#92400E', display: 'flex', gap: 7, paddingBottom: 5 }}>
                  <span>·</span> {tip}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginTop: 4 }}>
            <AlertTriangle style={{ width: 14, height: 14 }} /> {error}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          {step > 1 && (
            <button onClick={() => { setStep(s => s - 1); setError(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 20px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#475569' }}>
              <ChevronLeft style={{ width: 15, height: 15 }} /> Back
            </button>
          )}
          {step < 4 ? (
            <button onClick={next} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}>
              Continue <ChevronRight style={{ width: 15, height: 15 }} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '11px', background: loading ? '#A7F3D0' : '#059669', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}>
              {loading ? 'Submitting...' : 'Submit for Review'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
