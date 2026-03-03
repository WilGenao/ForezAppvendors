import Link from 'next/link';
import { TrendingUp } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-navy-800/60 bg-navy-950">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded bg-gold-500 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-navy-950" strokeWidth={2.5} />
              </div>
              <span className="font-display font-semibold text-white">ForexBot<span className="text-gold-400">.</span></span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed">
              Institutional-grade trading automation for the modern trader.
            </p>
          </div>
          {[
            { title: 'Platform', links: ['Marketplace', 'How It Works', 'Verified Bots', 'Performance Data'] },
            { title: 'Sellers', links: ['Become a Seller', 'Seller Dashboard', 'Pricing', 'Documentation'] },
            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
          ].map((section) => (
            <div key={section.title}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">{section.title}</h4>
              <ul className="flex flex-col gap-3">
                {section.links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-sm text-slate-400 hover:text-white transition-colors">{link}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-navy-800/60 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-600">© 2026 ForexBot Marketplace. All rights reserved. Trading involves risk of loss.</p>
          <div className="flex gap-6">
            {['Privacy', 'Terms', 'Disclaimer'].map((item) => (
              <Link key={item} href="#" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">{item}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
