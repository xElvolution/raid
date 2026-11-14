'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Shell } from '@/components/Shell';
import { RaidCard, RaidCardSkeleton } from '@/components/RaidCard';
import { CoinAvatar, Delta, Empty, ErrorState, Segmented } from '@/components/ui';
import { useNow, useRaids } from '@/lib/hooks';
import { useQuotes, fmtPrice } from '@/lib/market';
import { openCall } from '@/lib/bus';
import { CHEST_ID, phase, usdcOf } from '@/lib/raid';
import { shortAddr } from '@/lib/market';
import { JudgeBox } from '@/components/JudgeKit';
import { ChromeChest } from '@/components/Chrome';

export default function RaidsPage() {
  const [f, setF] = useState<'all' | 'live' | 'done'>('all');
  const raids = useRaids();
  const q = useQuotes();
  const now = useNow();
  const list = [...(raids.data ?? [])].reverse().filter((r) => f === 'all' || (f === 'live' ? r.status !== 'Closed' : r.status === 'Closed'));
  const live = (raids.data ?? []).filter((r) => now && phase(r, now).live).length;
  const pot = (raids.data ?? []).reduce((s, r) => s + usdcOf(r.pot), 0);
  return (
    <Shell title="Raids">
      <section className="cobalt-field grain relative overflow-hidden rounded-[24px] md:rounded-[32px] p-4 md:p-8">
        <div className="pointer-events-none absolute right-6 top-4 hidden opacity-95 md:block"><ChromeChest size={190} fill={Math.min(1, pot / 1000)} /></div>
        <div className="relative grid gap-3 md:gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow truncate">War chest · {CHEST_ID}</p>
            <h2 className="display mt-3 md:mt-4 text-[2.25rem] md:text-[60px]"><span className="block whitespace-nowrap">Pick a coin.</span><span className="block whitespace-nowrap text-white/40">Set the line.</span></h2>
            <p className="mt-1.5 md:mt-3 max-w-[46ch] text-[12.5px] md:text-[14px] leading-snug text-white/60">The crew pools USDC, the chest buys through NEAR Intents, and it only sells once the line is hit.</p>
          </div>
          <div className="relative grid grid-cols-3 gap-2 md:gap-3">
            <Stat k="Raids" v={String(raids.data?.length ?? '–')} /><Stat k="Live" v={String(live)} /><Stat k="Pot USDC" v={pot.toFixed(2)} />
          </div>
        </div>
      </section>

      <nav aria-label="More" className="mt-2.5 flex gap-1.5 md:hidden">
        {[['/launch', 'Launchpad'], ['/live', 'Live tape'], ['/leaderboard', 'Ranks'], ['/judges', 'Judges']].map(([h, l]) => <Link key={h} href={h!} className="press flex h-9 flex-1 items-center justify-center rounded-full text-[12px] font-medium btn-pearl">{l}</Link>)}
      </nav>
      <JudgeBox className="mt-3 md:mt-4" />

      <div className="mt-4 md:mt-5">
        <p className="eyebrow mb-2 md:mb-2.5">Raidable right now</p>
        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:px-0">
          {(q.data ?? []).slice(0, 10).map((c) => (
            <button key={c.symbol} onClick={() => openCall(c.symbol)} className="lift panel flex w-[9.75rem] shrink-0 flex-col p-3.5 text-left">
              <div className="flex items-center gap-2"><CoinAvatar symbol={c.symbol} image={c.image} size={26} /><span className="font-semibold text-[13.5px] truncate">${c.symbol}</span></div>
              <span className="mono mt-2.5 text-[13px]">{fmtPrice(c.priceUsd)}</span>
              <Delta pct={c.change24h} className="text-[11px] mt-0.5" />
              <span className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold text-lime">Call raid<span aria-hidden>↗</span></span>
            </button>
          ))}
          {q.isLoading && [0, 1, 2, 3].map((i) => <div key={i} className="shimmer h-[7.75rem] w-[9.375rem] shrink-0" />)}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Segmented id="raids" value={f} onChange={setF} options={[{ value: 'all', label: 'All' }, { value: 'live', label: 'Active' }, { value: 'done', label: 'Settled' }]} />
        <span className="mono text-[10.5px] text-faint">on-chain · 10s</span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {raids.isLoading && [0, 1].map((i) => <RaidCardSkeleton key={i} />)}
        {list.map((r, i) => <RaidCard key={r.id} r={r} i={i} />)}
      </div>
      {raids.error && <ErrorState title="Can’t reach the war chest" body="The NEAR RPC didn’t answer. Retrying every 10 seconds." retry={() => raids.refetch()} />}
      {!raids.isLoading && !raids.error && !list.length && <Empty title={f === 'done' ? 'No settled raids yet' : 'No raids here yet'} body="Every raid starts with one caller. It could be you." action={<button onClick={() => openCall()} className="press h-11 rounded-full btn-signal px-6 font-semibold">Call the first raid</button>} />}
    </Shell>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return <div className="rounded-[16px] bg-white/[.06] px-3 py-2.5 shadow-[inset_0_0_0_1px_rgb(255_255_255/.08)] md:px-4 md:py-3"><p className="mono text-[1.25rem] md:text-[30px] font-semibold leading-none tracking-[-0.04em]">{v}</p><p className="eyebrow mt-1.5">{k}</p></div>;
}
