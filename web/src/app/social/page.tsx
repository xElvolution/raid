'use client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Composer } from '@/components/Composer';
import { IconCards } from '@/components/icons';
import { MarketCard } from '@/components/MarketCard';
import { PostCard } from '@/components/PostCard';
import { Shell } from '@/components/Shell';
import { Button, Empty, LinkButton, Segmented, Skeleton } from '@/components/ui';
import { useLive } from '@/lib/live-hooks';
import { mixFeed } from '@/lib/feed';
import { useSession } from '@/lib/session';

function DailyBanner() {
  const { api, me } = useSession();
  const q = useQuery({ queryKey: ['daily'], queryFn: () => api.daily(), enabled: !!me });
  const left = q.data?.items.length ?? 0;
  if (!me || left === 0) return null;
  return (
    <Link href="/raids" className="block mb-4">
      <motion.div whileTap={{ scale: 0.99 }} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3 pr-4 hover:border-[#2a2a30] transition-colors">
        <span className="h-10 w-10 rounded-xl bg-grape-light text-grape grid place-items-center"><IconCards size={20} /></span>
        <div className="flex-1 min-w-0"><div className="text-[15px] font-semibold">Live raids</div><div className="text-[13px] text-mute">{left} calls waiting for a crew</div></div>
        <span className="text-[13px] font-semibold text-grape">Start</span>
      </motion.div>
    </Link>
  );
}

export default function Social() {
  const { api, me } = useSession();
  const [tab, setTab] = useState<'foryou' | 'following'>('foryou');
  const [fresh, setFresh] = useState(0);
  const q = useInfiniteQuery({
    queryKey: ['feed', tab, !!me],
    queryFn: ({ pageParam }) => api.feed({ tab, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (p) => p.next ?? undefined,
    enabled: tab === 'foryou' || !!me,
  });
  const markets = useQuery({
    queryKey: ['feed-markets'],
    queryFn: async () => {
      const own = await api.markets({ venue: 'called', status: 'open', sort: 'volume' });
      return own.items.slice(0, 15);
    },
    enabled: tab === 'foryou',
  });
  useLive('feed:global', (e) => { if (e.type === 'post') setFresh((n) => n + 1); });
  const posts = q.data?.pages.flatMap((p) => p.items) ?? [];
  const rows = tab === 'foryou' ? mixFeed(posts, markets.data ?? []) : posts.map((v) => ({ k: 'post' as const, v }));
  let body: ReactNode;
  if (tab === 'following' && !me) body = <Empty title="Sign in to see your circle" action={<LinkButton href="/signin">Sign in</LinkButton>} />;
  else if (q.isLoading) body = <div>{[0, 1, 2, 3].map((i) => <div key={i} className="flex gap-3 px-4 py-3 border-b border-line"><span className="h-10 w-10 rounded-full shimmer" /><div className="flex-1 space-y-2 pt-1"><div className="h-3.5 w-1/3 rounded shimmer" /><div className="h-3.5 w-full rounded shimmer" /><div className="h-3.5 w-2/3 rounded shimmer" /></div></div>)}</div>;
  else if (q.isError) body = <Empty title="Feed didn’t load" body="We couldn't load the feed." action={<Button tone="white" onClick={() => void q.refetch()}>Try again</Button>} />;
  else if (rows.length === 0) body = <Empty title="Quiet in here" body={tab === 'following' ? 'Follow a few callers to fill your feed.' : 'Be the first to make a call.'} />;
  else body = (
    <>
      {rows.map((r, i) => (r.k === 'post' ? <PostCard key={`p${r.v.id}`} item={r.v} index={i} /> : <MarketCard key={`m${r.v.id}`} m={r.v} index={i} />))}
      {q.hasNextPage && <div className="flex justify-center py-6 px-4"><Button tone="white" disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>{q.isFetchingNextPage ? 'Loading…' : 'Load more'}</Button></div>}
    </>
  );

  return (
    <Shell title="Social" flush>
      <div className="sticky top-[52px] z-10 bg-bg/85 backdrop-blur-xl">
        <Segmented id="feedtab" value={tab} onChange={(v) => { setTab(v); setFresh(0); }} options={[{ value: 'foryou', label: 'For you' }, { value: 'following', label: 'Following' }]} />
      </div>
      {me && <div className="border-b border-line"><Composer /></div>}
      <AnimatePresence>
        {fresh > 0 && (
          <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }} className="sticky top-28 z-10 flex justify-center h-0">
            <button className="h-9 px-4 rounded-full bg-grape text-white text-[14px] font-semibold shadow-lg" onClick={() => { setFresh(0); void q.refetch(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>{fresh} new post{fresh > 1 ? 's' : ''}</button>
          </motion.div>
        )}
      </AnimatePresence>
      {body}
      <Link href={me ? '/create' : '/signin'} aria-label="New post" className="md:hidden fixed right-4 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 h-14 w-14 rounded-full bg-grape text-white grid place-items-center shadow-[0_8px_24px_rgba(0,0,0,.5)]">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
      </Link>
    </Shell>
  );
}
