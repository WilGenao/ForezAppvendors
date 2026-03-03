import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ForexBot Marketplace — Institutional-Grade Trading Automation',
  description: 'Discover, verify, and deploy battle-tested algorithmic trading bots for MetaTrader 4 & 5. Every bot is performance-verified with real trade history.',
  keywords: 'forex bot, trading automation, metatrader, EA, expert advisor, algorithmic trading',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
