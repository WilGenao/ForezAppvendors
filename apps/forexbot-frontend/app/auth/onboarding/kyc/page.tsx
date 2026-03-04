'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Upload, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';

const DOC_TYPES = ['passport', 'national_id', 'drivers_license'];

export default function OnboardingKycPage() {
  const router = useRouter();
  const [docType, setDocType] = useState('passport');
  const [frontUrl, setFrontUrl] = useState('');
  const [backUrl, setBackUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!frontUrl || !selfieUrl) { setError('Front document and selfie are required.'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/kyc/submit', {
        documentType: docType,
        documentFrontUrl: frontUrl,
        documentBackUrl: backUrl || undefined,
        selfieUrl,
      });
      router.push('/auth/onboarding/stripe');
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Submission failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-lg space-y-4">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {['Identity', 'Payments', 'First Bot'].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-blue-600 text-white' : 'bg-[#21262d] text-gray-600 border border-[#30363d]'}`}>
                {i + 1}
              </div>
              <span className={`text-xs ${i === 0 ? 'text-white font-bold' : 'text-gray-600'}`}>{step}</span>
              {i < 2 && <div className="w-8 h-px bg-[#30363d]" />}
            </div>
          ))}
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded overflow-hidden">
          <div className="bg-[#1c2128] px-5 py-4 border-b border-[#30363d] flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-white font-bold text-sm">Identity Verification</p>
              <p className="text-gray-500 text-xs">Required to become a seller. Takes 1-2 business days.</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded p-3 text-xs text-red-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Document type */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-2">Document Type</label>
              <div className="grid grid-cols-3 gap-2">
                {DOC_TYPES.map(t => (
                  <button key={t} onClick={() => setDocType(t)}
                    className={`py-2 px-3 rounded border text-xs font-bold capitalize transition-colors ${docType === t ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-[#21262d] border-[#30363d] text-gray-500 hover:text-white'}`}>
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* URL inputs (in production, replace with file upload to S3) */}
            {[
              { label: 'Document Front URL *', value: frontUrl, onChange: setFrontUrl, placeholder: 'https://...' },
              { label: `Document Back URL ${docType === 'passport' ? '(not required for passport)' : ''}`, value: backUrl, onChange: setBackUrl, placeholder: 'https://...' },
              { label: 'Selfie URL *', value: selfieUrl, onChange: setSelfieUrl, placeholder: 'https://...' },
            ].map(field => (
              <div key={field.label}>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1.5">{field.label}</label>
                <input value={field.value} onChange={e => field.onChange(e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-blue-500 rounded px-3 py-2 text-xs text-white placeholder-gray-600 outline-none transition-colors" />
              </div>
            ))}

            <div className="bg-[#21262d] border border-[#30363d] rounded p-3 text-xs text-gray-500 leading-relaxed">
              <p className="font-bold text-gray-400 mb-1">📋 Requirements</p>
              <p>· Government-issued ID, valid and not expired</p>
              <p>· Photos must be clear and fully legible</p>
              <p>· Selfie must show your face + document held up</p>
            </div>

            <button onClick={handleSubmit} disabled={loading || !frontUrl || !selfieUrl}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Submit for Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
