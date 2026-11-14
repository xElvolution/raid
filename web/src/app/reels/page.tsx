'use client';
/** Reels: a full-screen vertical player with For you | Following | Live tabs on top, like any short-video app. */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Radio } from 'lucide-react';
import { useStreams } from '@/lib/livecam';
import { LiveView } from '@/components/app/LiveView';
import { Shell } from '@/components/Shell';
import { ReelComposer, ReelView } from '@/components/Reels';
import { useReels } from '@/lib/reels';
import { useSession } from '@/lib/social';
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
function LiveFeed() {
  const streams = useStreams();
  const [active, setActive] = useState(0);
  const list = streams.data ?? [];
  if (streams.isLoading) return <div className="grid h-full place-items-center"><Loader2 className="animate-spin text-white/50" /></div>;
  if (!list.length) return (
    <div className="grid h-full place-items-center px-8 text-center text-white">
      <div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-[20px] bg-gradient-to-br from-[#e0353f] to-[#ff8a8f]"><Radio size={28} /></span>
        <p className="mt-4 text-[19px] font-semibold">Nobody is live right now</p>
        <p className="mt-1.5 text-[14px] text-white/60">Start a stream with your camera and pin the coin you’re talking about.</p>
        <Link href="/golive" className="press mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-[#ff2d55] px-6 text-[15px] font-bold">Go live</Link>
      </div>
    </div>
  );
  return <Pager count={list.length} onActive={setActive}>{list.map((s, i) => <div key={s.id} data-i={i} className="h-full w-full snap-start snap-always"><LiveView s={s} active={i === active} /></div>)}</Pager>;
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
      <div className="fixed inset-0 z-30 bg-[#0b0b0d] pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-0 md:static md:mx-auto md:h-[calc(100dvh-8rem)] md:max-w-[420px] md:overflow-hidden md:rounded-[18px]">
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
