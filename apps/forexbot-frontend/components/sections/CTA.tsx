import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CTA() {
  return (
    <section className="bg-navy-950 py-24">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="relative bg-gradient-to-br from-navy-800 to-navy-900 border border-navy-700/60 rounded-3xl p-12 overflow-hidden">
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

          <p className="font-mono text-xs text-gold-400 uppercase tracking-widest mb-4">Get Started Today</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6 relative">
            Start Trading Smarter
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
            Join 18,000+ traders using verified algorithms. 7-day free trial on all plans. No credit card required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="group inline-flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-navy-950 font-semibold px-8 py-3.5 rounded transition-all hover:glow-gold text-sm"
            >
              Create Free Account
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center gap-2 bg-navy-700/60 hover:bg-navy-700 border border-navy-600/60 text-white font-medium px-8 py-3.5 rounded transition-all text-sm"
            >
              Browse Bots
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
