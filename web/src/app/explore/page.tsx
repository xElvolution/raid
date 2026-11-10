'use client';
import type { Market, MarketCategory } from '@called/sdk';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { useDeferredValue, useState } from 'react';
import { MarketRow, RowSkeleton } from '@/components/home-bits';
import { Shell } from '@/components/Shell';
import { BRAND } from '@/lib/brand';
import { haptic } from '@/lib/fx';
import { useSession } from '@/lib/session';

const CATS: { v: MarketCategory | 'all'; l: string }[] = [
  { v: 'all', l: 'Trending' }, { v: 'sports', l: 'Sports' }, { v: 'crypto', l: 'Crypto' }, { v: 'culture', l: 'Culture' },
  { v: 'tech', l: 'Tech' }, { v: 'music', l: 'Music' }, { v: 'weather', l: 'Weather' },
];

export default function Explore() {
  const { api } = useSession();
  const [cat, setCat] = useState<MarketCategory | 'all'>('all');
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q.trim().toLowerCase());
  const called = useQuery({ queryKey: ['markets', 'called', cat], queryFn: () => api.markets({ venue: 'called', sort: 'volume', category: cat === 'all' ? undefined : cat }), refetchInterval: 30_000 });
  const f = (ms: Market[] = []) => (dq ? ms.filter((m) => m.question.toLowerCase().includes(dq)) : ms);
  const cm = f(called.data?.items);
  return (
    <Shell title="Explore" wide flush>
      <div className="px-4 pt-3">
        <label className="flex items-center gap-2.5 h-11 bg-panel border border-line cut-tr px-4 focus-within:border-grape transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-mute" aria-hidden><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" strokeLinecap="round" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search markets" className="flex-1 bg-transparent text-[15px] outline-none" aria-label="Search markets" />
        </label>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
        {CATS.map((c) => (
          <motion.button key={c.v} whileTap={{ scale: 0.94 }} onClick={() => { setCat(c.v); haptic('tap'); }}
            className={`shrink-0 h-[30px] px-3 text-[12px] font-bold uppercase tracking-[.08em] border transition-colors ${cat === c.v ? 'bg-ink text-bg border-transparent' : 'border-line text-mute hover:text-ink'}`}>{c.l}</motion.button>
        ))}
      </div>
      <section className="px-4 pt-3">
        <div className="flex items-baseline justify-between gap-3 mb-2"><h2 className="cd text-[24px]">On {BRAND.name}</h2><span className="text-[12px] text-mute text-right">Drafted by AI from community posts</span></div>
      </section>
      <section>
        <div className="divide-y divide-line/60 border-y border-line">
          {called.isLoading && [0, 1, 2, 3].map((i) => <RowSkeleton key={i} />)}
          {cm.map((m, i) => <MarketRow key={m.id} m={m} i={i} />)}
        </div>
        {!called.isLoading && cm.length === 0 && <p className="py-10 text-center text-[14px] text-mute">Nothing matches yet.</p>}
      </section>
    </Shell>
  );
}
