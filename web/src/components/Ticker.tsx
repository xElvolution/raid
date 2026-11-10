'use client';
import Link from 'next/link';
import { useQuotes, fmtPrice } from '@/lib/market';
import { Delta } from './ui';

/** Live tape of every raidable memecoin. Prices: DexScreener / CoinGecko, refreshed every 20 s. */
export function TickerTape() {
  const q = useQuotes();
  const items = q.data ?? [];
  if (!items.length) return <div className="h-9 border-b border-line" aria-hidden />;
  const row = items.map((c) => (
    <Link key={c.symbol} href={`/coin/${c.symbol}`} className="flex shrink-0 items-center gap-2 px-4 h-9 hover:bg-raised">
      <span className="mono text-[11.5px] font-bold">${c.symbol}</span>
      <span className="mono text-[11.5px] text-mute">{fmtPrice(c.priceUsd)}</span>
      <Delta pct={c.change24h} className="text-[11px]" />
    </Link>
  ));
  return (
    <div className="relative h-9 overflow-hidden border-b border-line bg-bg" aria-label="Live memecoin prices">
      <div className="marquee flex w-max">{row}{row}</div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-bg" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg" />
    </div>
  );
}
