'use client';
import { useMemo, useState } from 'react';
import { Shell } from '@/components/Shell';
import { FeedList, useFeedItems } from '@/components/Feed';
import { RaidEmbedView } from '@/components/app/RaidEmbed';
import { Empty, ErrorState, Segmented, Skeleton } from '@/components/ui';
import { useChestTxs, useLaunches, useTrades } from '@/lib/market';
import { useNow, useRaids } from '@/lib/hooks';
import { openCall } from '@/lib/bus';

const WATCH = ['PEPE', 'TRUMP', 'BRETT', 'SHITZU'];
type F = 'all' | 'raids' | 'tape' | 'launches';

export default function LivePage() {
  const [f, setF] = useState<F>('all');
  const now = useNow();
  const trades = useTrades(WATCH);
  const chest = useChestTxs();
  const launches = useLaunches();
  const raids = useRaids();
  const all = useFeedItems(trades.data, chest.data, launches.data, raids.data);
  const items = useMemo(() => all.filter((i) => f === 'all' || (f === 'raids' ? i.kind === 'chest' : f === 'tape' ? i.kind === 'trade' : i.kind === 'launch')).slice(0, 80), [all, f]);
  const loading = trades.isLoading && chest.isLoading && launches.isLoading;
  const lastHour = now ? all.filter((i) => now - i.t < 3_600_000).length : 0;
  const liveRooms = [...(raids.data ?? [])].filter((r) => r.status !== 'Closed').sort((a, b) => Number(b.pot) - Number(a.pot));

  return (
    <Shell title={<div className="flex items-center gap-2.5"><h1 className="text-[16px] font-semibold md:text-[20px]">Live</h1><span className="chip chip-lime"><span className="live-dot" />{lastHour} / hr</span></div>}>
      <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.02em]">Raid rooms live now</h2>
      <p className="text-[12.5px] text-mute">Each room is a group buy forming. Watch the pot fill, chat, and join before the timer ends.</p>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {liveRooms.map((r) => <RaidEmbedView key={r.id} r={r} />)}
        {!raids.isLoading && !liveRooms.length && <Empty title="No rooms open right now" body="Start a raid and your room opens here." action={<button onClick={() => openCall()} className="press h-10 rounded-full btn-signal px-5 text-[13.5px] font-semibold">Start a raid</button>} />}
      </div>
      <h2 className="mb-2 mt-6 text-[17px] font-semibold tracking-[-0.02em]">Market tape</h2>
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-line px-2.5 py-2 md:px-4 md:py-2.5">
          <Segmented id="feed" value={f} onChange={setF} options={[{ value: 'all', label: 'All' }, { value: 'raids', label: 'Raids' }, { value: 'tape', label: 'Tape' }, { value: 'launches', label: 'Launches' }]} />
          <span className="hidden sm:inline mono text-[10.5px] text-faint">auto-refresh 15s</span>
        </div>
        {trades.error && f !== 'raids' && f !== 'launches' && <div className="p-3"><ErrorState title="Market tape is catching its breath" body="GeckoTerminal didn’t answer. Retrying automatically." retry={() => trades.refetch()} /></div>}
        {loading ? (
          <div className="divide-y divide-line">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="flex gap-3 p-4"><Skeleton className="h-10 w-10 !rounded-[12px]" /><div className="flex-1"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="mt-3 h-12 w-full" /></div></div>)}</div>
        ) : items.length ? <FeedList items={items} now={now} /> : (
          <Empty title={f === 'raids' ? 'No raid activity yet' : 'Quiet for a moment'} body={f === 'raids' ? 'Be the first caller. Pick a coin, set your line, and the crew can back it.' : 'Nothing new from this source in the last few minutes.'} action={<button onClick={() => openCall()} className="press h-11 rounded-[14px] btn-signal px-5 font-semibold">Start a raid</button>} />
        )}
      </div>
      <p className="mt-3 px-1 text-[11.5px] text-faint">The tape shows real on-chain swaps of $250+ on each coin’s deepest pool. Raid events are the war chest’s own transactions on NEAR {raids.data ? 'testnet' : ''}.</p>
    </Shell>
  );
}
