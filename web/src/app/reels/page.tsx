'use client';
/** Reels: a full-screen vertical player with For you | Following | Live tabs on top, like any short-video app. */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Users } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { ReelComposer, ReelView } from '@/components/Reels';
import { PhaseChip } from '@/components/RaidCard';
import { CoinAvatar, Delta } from '@/components/ui';
import { FlipClock } from '@/components/Chrome';
import { Loop } from '@/components/app/RaidEmbed';
import { openJoin } from '@/components/app/Flow';
import { useReels } from '@/lib/reels';
import { useSession } from '@/lib/social';
import { useBackers, useNow, useRaids } from '@/lib/hooks';
import { useQuote, fmtPrice } from '@/lib/market';
import { target, usdcOf, xLabel, type Raid } from '@/lib/raid';
import { displayName } from '@/lib/people';
import { signInSheet } from '@/lib/bus';

type Tab = 'foryou' | 'following' | 'live';
const TABS: [Tab, string][] = [['foryou', 'For you'], ['following', 'Following'], ['live', 'Live']];

/** Snap-scrolling vertical pager that reports the active index. */
function Pager({ count, onActive, onEnd, children }: { count: number; onActive: (i: number) => void; onEnd?: () => void; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { const i = Number((e.target as HTMLElement).dataset.i); onActive(i); if (i >= count - 2) onEnd?.(); } }), { root: el, threshold: 0.6 });
    el.querySelectorAll('[data-i]').forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [count, onActive, onEnd]);
  return <div ref={box} className="h-full w-full snap-y snap-mandatory overflow-y-auto no-scrollbar">{children}</div>;
}

function Center({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <div className="grid h-full place-items-center p-8 text-center text-white"><div><p className="text-[17px] font-semibold">{title}</p><p className="mt-1.5 text-[13.5px] leading-relaxed text-white/60">{body}</p>{action && <div className="mt-4">{action}</div>}</div></div>;
}

function ReelsFeed({ following }: { following: boolean }) {
  const sess = useSession();
  const q = useReels(following, !following || !!sess);
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const [active, setActive] = useState(0);
  if (following && !sess) return <Center title="Reels from people you follow" body="Sign in to see reels from the traders you follow." action={<button onClick={() => signInSheet.emit()} className="press h-11 rounded-full btn-signal px-6 text-[14px] font-semibold">Sign in</button>} />;
  if (q.isLoading) return <div className="grid h-full place-items-center text-white/60"><Loader2 className="animate-spin" /></div>;
  if (q.error) return <Center title="Can’t load reels" body="The RAID API didn’t answer. Try again in a moment." action={<button onClick={() => q.refetch()} className="press h-10 rounded-full bg-white px-5 text-[13.5px] font-semibold text-black">Retry</button>} />;
  if (!items.length) return <Center title={following ? 'Nothing here yet' : 'No reels yet'} body={following ? 'People you follow haven’t posted reels. Follow more traders from the For you tab.' : 'Post the first one: a short clip that sells a coin.'} />;
  return (
    <Pager count={items.length} onActive={setActive} onEnd={() => { if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage(); }}>
      {items.map((r, i) => <div key={r.id} data-i={i} className="h-full w-full snap-start snap-always"><ReelView r={r} active={i === active} /></div>)}
    </Pager>
  );
}

/** One live raid room, full screen: coin, live price, pot, timer, who's in, and Join. */
function LiveRoom({ r, now }: { r: Raid; now: number }) {
  const t = target(r);
  const q = useQuote(t.symbol.replace(/^t(?=[A-Z])/, ''));
  const crew = useBackers(r.id);
  const open = r.status === 'Open' && now > 0 && now < r.opens_until_ms;
  const ms = open ? r.opens_until_ms - now : r.buy_after_ms && now < r.buy_after_ms ? r.buy_after_ms - now : 0;
  const people = crew.data ?? [];
  return (
    <article className="relative h-full w-full overflow-hidden bg-[radial-gradient(120%_70%_at_50%_0%,#3a1a0c_0,#0b0b0d_65%)] text-white">
      <div className="absolute inset-x-0 top-14 px-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-signal px-2.5 py-1 text-[11px] font-bold tracking-[.06em]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />LIVE ROOM</span>
        <p className="mt-2 text-[12px] text-white/55">Live data room · no video</p>
      </div>
      <div className="absolute inset-x-0 top-[30%] px-5 text-center">
        <div className="mx-auto w-fit"><CoinAvatar symbol={t.symbol} image={q.data?.image} size={72} /></div>
        <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.04em]">${t.symbol} <span className="text-signal">{xLabel(r.target_x_bps)}</span></h2>
        <p className="mt-1 flex items-center justify-center gap-2 text-[13px] text-white/70"><span className="mono">{fmtPrice(q.data?.priceUsd)}</span><Delta pct={q.data?.change24h} className="text-[12px]" /></p>
        <div className="mt-5 flex justify-center text-[34px]">{ms > 0 ? <FlipClock ms={ms} /> : <PhaseChip r={r} now={now} />}</div>
        <p className="mt-2 text-[12px] text-white/55">{open ? 'until the group buys together' : ms > 0 ? 'public countdown to the buy' : ''}</p>
        <div className="mx-auto mt-6 grid max-w-[18rem] grid-cols-2 gap-3 text-left">
          <div className="rounded-[14px] bg-white/8 p-3"><p className="text-[11.5px] text-white/55">Pot</p><p className="mono mt-0.5 text-[17px] font-semibold">{usdcOf(r.pot).toFixed(0)} <span className="text-[11px] text-white/50">tUSDC</span></p></div>
          <div className="rounded-[14px] bg-white/8 p-3"><p className="text-[11.5px] text-white/55">In the raid</p><p className="mono mt-0.5 text-[17px] font-semibold">{people.length} <span className="text-[11px] text-white/50">people</span></p></div>
        </div>
        <Loop r={r} className="mx-auto mt-5 max-w-[18rem] [&_*]:!text-white/70" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        {people.length > 0 && <p className="mb-2 flex items-center gap-1.5 truncate text-[12.5px] text-white/70"><Users size={14} />{people.slice(0, 3).map(([a]) => displayName(a)).join(', ')}{people.length > 3 ? ` and ${people.length - 3} more` : ''} joined</p>}
        <div className="flex gap-2">
          <Link href={`/raids/${r.id}`} className="press flex h-12 flex-1 items-center justify-center rounded-full bg-white/12 text-[14px] font-semibold">Open chat</Link>
          {open && <button onClick={() => openJoin(r.id)} className="press flex h-12 flex-[1.4] items-center justify-center rounded-full btn-signal text-[14.5px] font-semibold">Join raid</button>}
        </div>
      </div>
    </article>
  );
}

function LiveFeed() {
  const raids = useRaids();
  const now = useNow();
  const [, setActive] = useState(0);
  const live = (raids.data ?? []).filter((r) => r.status === 'Open').sort((a, b) => usdcOf(b.pot) - usdcOf(a.pot));
  if (raids.isLoading) return <div className="grid h-full place-items-center text-white/60"><Loader2 className="animate-spin" /></div>;
  if (!live.length) return <Center title="No live rooms right now" body="A room opens when someone starts a raid. Start one and others can join live." action={<Link href="/raids" className="press inline-flex h-11 items-center rounded-full btn-signal px-6 text-[14px] font-semibold">Start a raid</Link>} />;
  return <Pager count={live.length} onActive={setActive}>{live.map((r, i) => <div key={r.id} data-i={i} className="h-full w-full snap-start snap-always"><LiveRoom r={r} now={now} /></div>)}</Pager>;
}

export default function ReelsPage() {
  const [tab, setTab] = useState<Tab>('foryou');
  const [compose, setCompose] = useState(false);
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const t = setTimeout(() => { const x = sp.get('tab'); if (x === 'live' || x === 'following') setTab(x); if (sp.get('new') === '1') setCompose(true); }, 0);
    return () => clearTimeout(t);
  }, []);
  const pick = (t: Tab) => { setTab(t); history.replaceState(null, '', t === 'foryou' ? '/reels' : `/reels?tab=${t}`); };
  return (
    <Shell immersive rail={false} flush>
      <div className="fixed inset-x-0 top-0 bottom-[calc(54px+env(safe-area-inset-bottom))] z-30 bg-[#0b0b0d] md:static md:mx-auto md:h-[calc(100dvh-8rem)] md:max-w-[420px] md:overflow-hidden md:rounded-[18px]">
        <div className="absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-center bg-gradient-to-b from-black/60 to-transparent px-3">
          <nav role="tablist" aria-label="Reels" className="flex items-center gap-5">
            {TABS.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => pick(k)} className={`relative py-2 text-[15px] font-semibold transition-colors ${tab === k ? 'text-white' : 'text-white/55'}`}>
                {k === 'live' && <span className="mr-1 inline-block h-1.5 w-1.5 -translate-y-0.5 rounded-full bg-signal" />}{l}
                {tab === k && <span className="absolute inset-x-2 -bottom-0.5 h-[2.5px] rounded-full bg-white" />}
              </button>
            ))}
          </nav>
          <button onClick={() => setCompose(true)} aria-label="Post a reel" className="press absolute right-3 grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white"><Plus size={18} strokeWidth={2.6} /></button>
        </div>
        {tab === 'live' ? <LiveFeed /> : <ReelsFeed key={tab} following={tab === 'following'} />}
      </div>
      <ReelComposer open={compose} onClose={() => setCompose(false)} />
    </Shell>
  );
}
