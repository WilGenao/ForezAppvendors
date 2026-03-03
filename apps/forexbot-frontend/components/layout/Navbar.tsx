'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Activity, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-mt-panel2 border-b border-border">
      <div className="max-w-full px-4 h-10 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-mt-blue" />
            <span className="font-mono text-sm font-bold text-white tracking-wider">FOREXBOT</span>
            <span className="font-mono text-xs text-muted">v2.4</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {['Marketplace', 'Signals', 'Analytics', 'Sellers', 'Docs'].map((item) => (
              <Link key={item} href="#" className="font-mono text-xs text-muted hover:text-white px-3 py-1 hover:bg-surface transition-colors">
                {item}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <div className="font-mono text-[10px] text-muted mr-2 hidden lg:block">
            <span className="text-mt-green">● </span>SERVER: CONNECTED
          </div>
          <Link href="/auth/login" className="font-mono text-xs text-muted hover:text-white px-3 py-1 transition-colors">
            LOGIN
          </Link>
          <Link href="/auth/register" className="font-mono text-xs bg-mt-blue hover:bg-blue-500 text-white px-3 py-1 transition-colors">
            OPEN_ACCOUNT
          </Link>
        </div>
        <button className="md:hidden text-muted" onClick={() => setOpen(!open)}>
          {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-mt-panel2 border-t border-border px-4 py-3 flex flex-col gap-2">
          {['Marketplace', 'Analytics', 'Sellers', 'Docs'].map((item) => (
            <Link key={item} href="#" className="font-mono text-xs text-muted py-1.5">{item}</Link>
          ))}
          <div className="flex gap-2 pt-2 border-t border-border">
            <Link href="/auth/login" className="font-mono text-xs text-muted py-1.5">LOGIN</Link>
            <Link href="/auth/register" className="font-mono text-xs bg-mt-blue text-white px-3 py-1.5">OPEN_ACCOUNT</Link>
          </div>
        </div>
      )}
    </header>
  );
}