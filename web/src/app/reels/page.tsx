'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Plus, Trophy } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { ReelComposer, ReelView } from '@/components/Reels';
import { Empty, ErrorState, Skeleton } from '@/components/ui';
import { useReels } from '@/lib/reels';

export default function ReelsPage() {
  const q = useReels();
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const [active, setActive] = useState(0);
  const [compose, setCompose] = useState(() => typeof location !== 'undefined' && location.search.includes('new=1'));
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current; if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { const i = Number((e.target as HTMLElement).dataset.i); setActive(i); if (i >= items.length - 2 && q.hasNextPage) void q.fetchNextPage(); } }), { root: el, threshold: 0.6 });
    el.querySelectorAll('[data-i]').forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [items.length, q]);
  return (
    <Shell title="Reels" rail={false} flush actions={<>
      <Link href="/reels/top" aria-label="Top reel creators" className="press hidden h-9 w-9 place-items-center rounded-[13px] text-mute hover:bg-raised hover:text-ink md:grid"><Trophy size={17} /></Link>
      <button onClick={() => setCompose(true)} aria-label="Post a reel" className="press flex h-8 w-8 items-center justify-center gap-1 rounded-full bg-lime text-[12.5px] font-bold text-[#1c0900] md:w-auto md:px-2.5"><Plus size={15} strokeWidth={3} /><span className="hidden md:inline">Reel</span></button>
    </>}>
      <div ref={box} className="-mt-3 md:mt-0 mx-auto h-[calc(100dvh-102px-env(safe-area-inset-bottom))] md:h-[calc(100dvh-8rem)] w-full max-w-[420px] snap-y snap-mandatory overflow-y-auto no-scrollbar md:rounded-[18px]">
        {items.map((r, i) => <div key={r.id} data-i={i} className="h-full w-full md:pb-3"><ReelView r={r} active={i === active} /></div>)}
        {q.isLoading && <Skeleton className="h-full w-full" />}
        {q.error && <div className="p-4"><ErrorState title="Can’t reach the reels API" body="The RAID social API didn’t answer." retry={() => q.refetch()} /></div>}
        {!q.isLoading && !q.error && !items.length && <Empty title="No reels yet" body="Post the first one: a short clip that sells a raid." action={<button onClick={() => setCompose(true)} className="press h-10 rounded-[13px] bg-lime px-4 font-bold text-[#1c0900]">Post a reel</button>} />}
      </div>
      <ReelComposer open={compose} onClose={() => setCompose(false)} />
    </Shell>
  );
}
