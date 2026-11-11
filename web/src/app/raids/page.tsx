'use client';
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
      <section className="cobalt-field relative overflow-hidden rounded-[14px] md:rounded-[18px] p-3.5 md:p-7">
        <div className="dots absolute inset-0 opacity-50" />
        <div className="relative grid gap-3 md:gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow">War chest · {shortAddr(CHEST_ID)}</p>
            <h2 className="wide-black mt-2 md:mt-3 text-[1.25rem] md:text-[60px] leading-[.95] md:leading-[.86]">Pick a coin. <span className="md:block">Set the line.</span></h2>
            <p className="mt-1.5 md:mt-3 max-w-[46ch] text-[12.5px] md:text-[14px] leading-snug text-white/75">The crew pools USDC, the chest buys through NEAR Intents, and it only sells once the line is hit.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-6 md:text-right">
            <Stat k="Raids" v={String(raids.data?.length ?? '–')} /><Stat k="Live" v={String(live)} /><Stat k="Pot USDC" v={pot.toFixed(2)} />
          </div>
        </div>
      </section>

      <JudgeBox className="mt-3 md:mt-4" />

      <div className="mt-4 md:mt-5">
        <p className="eyebrow mb-2 md:mb-2.5">Raidable right now</p>
        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:px-0">
          {(q.data ?? []).slice(0, 10).map((c) => (
            <button key={c.symbol} onClick={() => openCall(c.symbol)} className="lift panel flex w-[9.375rem] shrink-0 flex-col p-3 text-left">
              <div className="flex items-center gap-2"><CoinAvatar symbol={c.symbol} image={c.image} size={26} /><span className="font-semibold text-[13.5px] truncate">${c.symbol}</span></div>
              <span className="mono mt-2.5 text-[13px]">{fmtPrice(c.priceUsd)}</span>
              <Delta pct={c.change24h} className="text-[11px] mt-0.5" />
              <span className="mt-2.5 text-[11.5px] font-bold text-lime">Call raid →</span>
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
      {!raids.isLoading && !raids.error && !list.length && <Empty title={f === 'done' ? 'No settled raids yet' : 'No raids here yet'} body="Every raid starts with one caller. It could be you." action={<button onClick={() => openCall()} className="press h-11 rounded-[11px] bg-lime px-5 font-bold text-[#0a1a00]">Call the first raid</button>} />}
    </Shell>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return <div><p className="wide-black text-[1.25rem] md:text-[40px] leading-none">{v}</p><p className="eyebrow mt-1 md:mt-1.5">{k}</p></div>;
}
