'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { CoinAvatar, Delta, Empty, ErrorState } from '@/components/ui';
import { Ring, raidClock } from '@/components/app/Radar';
import { Tabs } from '@/components/app/Tabs';
import { Avatar } from '@/components/app/Avatar';
import { outcome } from '@/components/app/RaidEmbed';
import { useNow, useRaids } from '@/lib/hooks';
import { useQuotes, fmtPrice } from '@/lib/market';
import { openCall } from '@/lib/bus';
import { phase, target, usdcOf, xLabel, type Raid } from '@/lib/raid';
import { displayName } from '@/lib/people';

type F = 'live' | 'riding' | 'settled';
const group = (r: Raid): F => (r.status === 'Open' ? 'live' : r.status === 'Closed' ? 'settled' : 'riding');

export default function RaidsPage() {
  const raids = useRaids();
  const now = useNow();
  const q = useQuotes();
  const all = [...(raids.data ?? [])].reverse();
  const counts = { live: 0, riding: 0, settled: 0 } as Record<F, number>;
  all.forEach((r) => counts[group(r)]++);
  const [pick, setPick] = useState<F | null>(null);
  const f: F = pick ?? (counts.live ? 'live' : counts.riding ? 'riding' : 'settled');
  const list = all.filter((r) => group(r) === f);
  const pot = all.reduce((s, r) => s + usdcOf(r.pot), 0);
  const hit = all.filter((r) => r.hit).length;
  return (
    <Shell title="Raids">
      <header className="pb-5 pt-4 md:pt-2">
        <h1 className="text-[34px] font-semibold leading-[1.02] tracking-[-0.045em] md:text-[44px]">Pick a coin. <span className="text-faint">Set the line.</span></h1>
        <p className="mt-3 max-w-[44ch] text-[16px] leading-relaxed text-mute">A caller sets a target. The crew pools tUSDC. The chest buys through NEAR Intents and only sells at the line.</p>
        <div className="mt-5 flex gap-7 text-[14px] text-mute">
          <span><b className="mono text-[20px] font-semibold text-ink">{all.length || '–'}</b> raids</span>
          <span><b className="mono text-[20px] font-semibold text-ink">{hit}</b> lines hit</span>
          <span><b className="mono text-[20px] font-semibold text-ink">{pot.toFixed(0)}</b> tUSDC pooled</span>
        </div>
        <Link href="/judges" className="mt-5 inline-flex items-center gap-1 text-[14px] font-medium text-mute hover:text-ink">Judging RAID? Try it with a funded testnet wallet<ChevronRight size={16} /></Link>
      </header>

      <div className="sticky top-14 z-30 -mx-4 bg-bg/85 px-4 backdrop-blur-xl md:top-16 md:mx-0 md:px-0">
        <Tabs id="raids" value={f} onChange={setPick} items={[{ key: 'live', label: 'Crew open', count: counts.live }, { key: 'riding', label: 'Riding', count: counts.riding }, { key: 'settled', label: 'Settled', count: counts.settled }]} />
      </div>

      <ul className="divide-y divide-line">
        {raids.isLoading && [0, 1, 2].map((i) => <li key={i} className="flex items-center gap-4 py-4"><span className="shimmer h-16 w-16 !rounded-full" /><span className="flex-1 space-y-2"><span className="shimmer block h-4 w-40" /><span className="shimmer block h-4 w-24" /></span></li>)}
        {list.map((r) => {
          const x = outcome(r);
          return (
            <li key={r.id}><Link href={`/raids/${r.id}`} className="flex items-center gap-4 py-4">
              <Ring r={r} now={now} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-semibold tracking-[-0.02em]">${target(r).symbol} to {xLabel(r.target_x_bps)} <span className="font-normal text-faint">#{r.id}</span></span>
                <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[14px] text-mute"><Avatar id={r.caller} size={18} /><span className="truncate">{displayName(r.caller)}</span><span className="shrink-0">· {usdcOf(r.pot).toFixed(0)} pot</span></span>
              </span>
              <span className="text-right">
                <span className={`block mono text-[15px] font-semibold ${r.status === 'Closed' ? (r.hit ? 'text-lime' : 'text-mute') : 'text-ink'}`}>{x ? `${x.toFixed(2)}x` : raidClock(r, now)}</span>
                <span className="block text-[12px] text-faint">{now ? phase(r, now).label : ''}</span>
              </span>
            </Link></li>
          );
        })}
      </ul>
      {raids.error && <ErrorState title="Can’t reach the war chest" body="The NEAR RPC didn’t answer. Retrying every 10 seconds." retry={() => raids.refetch()} />}
      {!raids.isLoading && !raids.error && !list.length && <Empty title="Nothing here yet" body="Every raid starts with one caller. It could be you." action={<button onClick={() => openCall()} className="press h-12 rounded-full btn-signal px-6 font-semibold">Call a raid</button>} />}

      <section className="mt-10">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em]">Raidable right now</h2>
        <ul className="mt-2 divide-y divide-line">
          {(q.data ?? []).slice(0, 8).map((c) => (
            <li key={c.symbol}><button onClick={() => openCall(c.symbol)} className="flex w-full items-center gap-3.5 py-3.5 text-left">
              <CoinAvatar symbol={c.symbol} image={c.image} size={40} />
              <span className="min-w-0 flex-1"><span className="block text-[16px] font-semibold">${c.symbol}</span><span className="block mono text-[13px] text-mute">{fmtPrice(c.priceUsd)}</span></span>
              <Delta pct={c.change24h} className="text-[13px]" />
              <span className="ml-2 grid h-9 w-9 place-items-center rounded-full bg-raised"><ArrowUpRight size={17} /></span>
            </button></li>
          ))}
          {q.isLoading && [0, 1, 2].map((i) => <li key={i} className="shimmer my-2 h-12" />)}
        </ul>
      </section>
    </Shell>
  );
}
