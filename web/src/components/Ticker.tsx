'use client';
import Link from 'next/link';
import { useQuotes, fmtPrice } from '@/lib/market';
import { Delta } from './ui';

/** Live tape of every raidable memecoin. Prices: DexScreener / CoinGecko, refreshed every 20 s. */
export function TickerTape({ roomy = false }: { roomy?: boolean }) {
  const q = useQuotes();
  const items = q.data ?? [];
  const h = roomy ? 'h-12' : 'h-9';
  if (!items.length) return null;
  const row = items.map((c) => (
    <Link key={c.symbol} href={`/coin/${c.symbol}`} className={`flex shrink-0 items-center gap-2.5 px-4 ${h} hover:bg-raised`}>
      <span className="mono text-[12px] font-bold">${c.symbol}</span>
      <span className="mono text-[12px] text-mute">{fmtPrice(c.priceUsd)}</span>
      <Delta pct={c.change24h} className="text-[11px]" />
    </Link>
  ));
  return (
    <div className={`relative ${h} overflow-hidden border-y border-line bg-bg`} aria-label="Live memecoin prices">
      <div className="marquee flex w-max">{row}{row}</div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-bg" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-bg" />
    </div>
  );
}
