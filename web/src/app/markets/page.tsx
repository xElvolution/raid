'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { MarketCard } from '@/components/MarketCard';
import { Shell } from '@/components/Shell';
import { Button, Empty, LinkButton, Segmented, Skeleton } from '@/components/ui';
import { useSession } from '@/lib/session';

export default function Markets() {
  const { api } = useSession();
  const [status, setStatus] = useState<'open' | 'proposed' | 'final'>('open');
  const q = useInfiniteQuery({
    queryKey: ['markets', 'called', status],
    queryFn: ({ pageParam }) => api.markets({ venue: 'called', status, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (p) => p.next ?? undefined,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <Shell title="Markets">
      <Segmented id="mstatus" value={status} onChange={setStatus} options={[{ value: 'open', label: 'Live' }, { value: 'proposed', label: 'Resolving' }, { value: 'final', label: 'Resolved' }]} />
      <div className="mt-2">
        {q.isLoading ? <div className="space-y-3 mt-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div>
          : items.length === 0 ? <Empty title="No markets here yet" body="Markets are born from posts. Make a call and the AI drafts the market." action={<LinkButton href="/create">Call it</LinkButton>} />
          : items.map((m, i) => <MarketCard key={m.id} m={m} index={i} />)}
        {q.hasNextPage && <div className="flex justify-center py-4"><Button tone="white" onClick={() => void q.fetchNextPage()}>Load more</Button></div>}
      </div>
    </Shell>
  );
}
