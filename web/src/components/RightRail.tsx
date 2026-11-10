'use client';
import Link from 'next/link';
import { useQuotes, fmtPrice } from '@/lib/market';
import { useBuyback, useRaids } from '@/lib/hooks';
import { usdcOf } from '@/lib/raid';
import { openCall } from '@/lib/bus';
import { CoinAvatar, CountUp, Delta, Skeleton } from './ui';

export function RightRail() {
  const q = useQuotes();
  const raids = useRaids();
  const bb = useBuyback();
  const movers = [...(q.data ?? [])].sort((a, b) => Math.abs(b.change24h ?? 0) - Math.abs(a.change24h ?? 0)).slice(0, 6);
  const pot = (raids.data ?? []).reduce((s, r) => s + usdcOf(r.pot), 0);
  return (
    <aside className="hidden xl:flex sticky top-[96px] self-start w-[320px] shrink-0 flex-col gap-4 pt-4 pb-10">
      <section className="cobalt-field relative overflow-hidden rounded-[16px] p-5">
        <div className="dots absolute inset-0 opacity-50" />
        <div className="relative">
          <p className="eyebrow">War chest · all raids</p>
          <div className="mt-3 flex items-end gap-2"><span className="wide-black text-[58px] leading-[.8]"><CountUp value={pot} format={(n) => n.toFixed(2)} /></span><span className="wide pb-1 text-[14px]">USDC</span></div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/20 pt-3 text-[12px]">
            <div><p className="text-white/60">Raids called</p><p className="mono mt-0.5 text-[15px] font-bold">{raids.data?.length ?? '–'}</p></div>
            <div><p className="text-white/60">Buyback bucket</p><p className="mono mt-0.5 text-[15px] font-bold">{bb.data !== undefined ? usdcOf(bb.data).toFixed(2) : '–'}</p></div>
          </div>
        </div>
      </section>
      <section className="panel p-4">
        <div className="flex items-center justify-between"><h2 className="wide text-[13px]">Movers 24h</h2><span className="mono text-[10px] text-faint">DexScreener</span></div>
        <ul className="mt-2">
          {q.isLoading && [0, 1, 2, 3].map((i) => <li key={i} className="py-2"><Skeleton className="h-8" /></li>)}
          {movers.map((c) => (
            <li key={c.symbol} className="flex items-center gap-2.5 py-2">
              <CoinAvatar symbol={c.symbol} image={c.image} size={28} />
              <Link href={`/coin/${c.symbol}`} className="min-w-0 flex-1 hover:underline"><span className="block text-[13px] font-semibold">${c.symbol}</span><span className="block mono text-[11px] text-mute">{fmtPrice(c.priceUsd)}</span></Link>
              <Delta pct={c.change24h} className="text-[11.5px]" />
              <button onClick={() => openCall(c.symbol)} className="press ml-1 h-7 rounded-[8px] px-2.5 text-[11.5px] font-bold hairline hover:bg-lime hover:text-[#0a1a00]">Raid</button>
            </li>
          ))}
        </ul>
      </section>
      <p className="px-1 text-[11.5px] leading-relaxed text-faint">RAID is a game on NEAR. Raids can lose money; nothing here is investment advice. Market data from DexScreener, GeckoTerminal and CoinGecko public APIs.</p>
    </aside>
  );
}
