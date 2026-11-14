'use client';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Empty, Skeleton } from '@/components/ui';
import { Tabs } from '@/components/app/Tabs';
import { StoriesRow } from '@/components/app/Stories';
import { TokenList } from '@/components/app/TokenList';
import { PostItem } from '@/components/app/Post';
import { openComposer } from '@/components/app/Composer';
import { Avatar } from '@/components/app/Avatar';
import { useSocialAuth } from '@/components/Social';
import { posts } from '@/lib/social';
import { useNow } from '@/lib/hooks';

type Tab = 'foryou' | 'following' | 'tokens';

export default function FeedPage() {
  const [tab, setTab] = useState<Tab>('foryou');
  const { sess, acct } = useSocialAuth();
  const now = useNow(30_000);
  const q = useInfiniteQuery({
    queryKey: ['feed2', tab, sess?.handle], enabled: tab === 'foryou' || (tab === 'following' && !!sess), initialPageParam: undefined as string | undefined, refetchInterval: 20_000,
    queryFn: ({ pageParam }) => posts.feed(tab, pageParam), getNextPageParam: (l) => l.next ?? undefined,
  });
  const items = (q.data?.pages.flatMap((p) => p.items) ?? []).filter((p) => !p.reply_to);
  return (
    <Shell title="RAID">
      <StoriesRow />
      <div className="sticky top-12 z-30 -mx-4 bg-bg/85 px-4 backdrop-blur-xl md:top-16 md:mx-0 md:px-0">
        <Tabs id="feed" value={tab} onChange={setTab} items={[{ key: 'foryou', label: 'For you' }, { key: 'following', label: 'Following' }, { key: 'tokens', label: 'Tokens' }]} />
      </div>
      {tab === 'tokens' ? <TokenList /> : <>
      <button onClick={() => openComposer()} className="flex w-full items-center gap-2.5 border-b border-line py-2.5 text-left">
        <Avatar id={sess?.account ?? acct ?? 'guest'} size={34} />
        <span className="flex-1 text-[14.5px] text-faint">What’s happening?</span>
        <span className="rounded-full btn-signal px-3.5 py-1.5 text-[13px] font-semibold">Post</span>
      </button>
      <div className="divide-y divide-line">
        {tab === 'following' && !sess && <Empty title="Sign in to see who you follow" body="Follow traders from any post. Their posts land here." />}
        {q.isLoading && q.fetchStatus !== 'idle' && [0, 1, 2].map((i) => <div key={i} className="flex gap-2.5 py-3"><Skeleton className="h-9 w-9 !rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-36" /><Skeleton className="h-3.5 w-full" /></div></div>)}
        {q.error && <Empty art={<WifiOff size={32} className="text-faint" />} title="Feed is offline" body="Can’t reach the RAID social API." action={<button onClick={() => q.refetch()} className="font-semibold">Retry</button>} />}
        {!q.isLoading && !q.error && !items.length && (tab !== 'following' || sess) && <Empty title="Nothing here yet" body="Post a take, tag a coin with $PEPE, or follow someone." action={<button onClick={() => openComposer()} className="press h-10 rounded-full btn-signal px-5 text-[13.5px] font-semibold">Write a post</button>} />}
        {items.map((p, i) => <PostItem key={p.id} p={p} i={i} now={now} />)}
      </div>
      {q.hasNextPage && <button className="w-full py-3 text-[13px] font-semibold text-mute" onClick={() => q.fetchNextPage()}>{q.isFetchingNextPage ? 'Loading…' : 'Show more'}</button>}
      </>}
    </Shell>
  );
}
