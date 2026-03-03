import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ForexBot Marketplace — Institutional-Grade Trading Automation',
  description: 'Discover, verify, and deploy battle-tested algorithmic trading bots for MetaTrader 4 & 5.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-mt-bg text-white antialiased">{children}</body>
    </html>
  );
}