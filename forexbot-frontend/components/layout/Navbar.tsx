'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, TrendingUp } from 'lucide-react';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-navy-800/60 backdrop-blur-xl bg-navy-950/80">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded bg-gold-500 flex items-center justify-center group-hover:glow-gold transition-all">
            <TrendingUp className="w-4 h-4 text-navy-950" strokeWidth={2.5} />
          </div>
          <span className="font-display font-semibold text-white text-lg tracking-tight">
            ForexBot<span className="text-gold-400">.</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'Marketplace', href: '/marketplace' },
            { label: 'How It Works', href: '/#how-it-works' },
            { label: 'Pricing', href: '/#pricing' },
            { label: 'Sellers', href: '/sellers' },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/auth/login"
            className="text-sm text-slate-300 hover:text-white transition-colors px-4 py-2"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="text-sm bg-gold-500 hover:bg-gold-400 text-navy-950 font-semibold px-4 py-2 rounded transition-all hover:glow-gold"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-slate-400 hover:text-white"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-navy-900/95 backdrop-blur-xl border-t border-navy-800/60 px-6 py-4 flex flex-col gap-4">
          {['Marketplace', 'How It Works', 'Pricing', 'Sellers'].map((item) => (
            <Link key={item} href="#" className="text-slate-300 hover:text-white text-sm py-2">
              {item}
            </Link>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t border-navy-800/60">
            <Link href="/auth/login" className="text-center text-sm text-slate-300 py-2">Sign In</Link>
            <Link href="/auth/register" className="text-center text-sm bg-gold-500 text-navy-950 font-semibold py-2 rounded">
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
