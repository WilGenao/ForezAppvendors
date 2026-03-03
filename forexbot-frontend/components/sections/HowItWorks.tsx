import { Search, ShieldCheck, Download, TrendingUp } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    icon: Search,
    title: 'Browse & Filter',
    description: 'Search thousands of verified bots by strategy, currency pair, risk level, and performance metrics. Every bot shows real trade history.',
  },
  {
    number: '02',
    icon: ShieldCheck,
    title: 'Verify Performance',
    description: 'Review Sharpe ratio, max drawdown, profit factor, and anomaly detection reports. Our AI flags suspicious patterns automatically.',
  },
  {
    number: '03',
    icon: Download,
    title: 'Subscribe & Deploy',
    description: 'Purchase a license, download the EA file, and install it in MetaTrader 4 or 5. License validation runs automatically.',
  },
  {
    number: '04',
    icon: TrendingUp,
    title: 'Monitor & Scale',
    description: 'Track performance live from your dashboard. Upgrade, pause, or cancel any subscription at any time.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-navy-900 py-24 border-y border-navy-800/60">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs font-mono text-gold-400 uppercase tracking-widest mb-3">Process</p>
          <h2 className="font-display text-4xl font-bold text-white">How It Works</h2>
          <p className="text-slate-400 mt-4 max-w-xl mx-auto">
            From discovery to live trading in under 10 minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-navy-700 to-transparent" />

          {STEPS.map((step, i) => (
            <div key={step.number} className="relative flex flex-col items-center text-center group">
              {/* Icon circle */}
              <div className="w-16 h-16 rounded-full bg-navy-800 border border-navy-700 group-hover:border-gold-500/40 flex items-center justify-center mb-5 relative z-10 transition-all">
                <step.icon className="w-6 h-6 text-gold-400" />
              </div>

              {/* Step number */}
              <div className="font-mono text-xs text-slate-600 mb-2">{step.number}</div>

              <h3 className="font-semibold text-white mb-3">{step.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
