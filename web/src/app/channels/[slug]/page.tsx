'use client';
/* eslint-disable @next/next/no-img-element -- channel art */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Hash } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { InlineComposer } from '@/components/social/Reply';
import { SocialPostRow, fmtN } from '@/components/social/SocialPost';
import { Avatar, Button, Empty } from '@/components/ui';
import { useSocialApi } from '@/lib/social';
import { ChannelBadge, JoinButton } from '@/components/social/Channel';

export default function ChannelFeed() {
  const { slug } = useParams<{ slug: string }>(); const s = useSocialApi();
  const c = useQuery({ queryKey: ['channel', slug], queryFn: () => s.channel(slug) });
  const f = useInfiniteQuery({ queryKey: ['channel-feed', slug], queryFn: ({ pageParam }) => s.channelFeed(slug, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (p) => p.next ?? undefined });
  const ch = c.data?.channel; const posts = f.data?.pages.flatMap((p) => p.items) ?? [];
  if (c.isError) return <Shell title="Channel" back="/channels"><Empty title="Channel not found" /></Shell>;
  return (
    <Shell title={ch?.name ?? 'Channel'} back="/channels" flush>
      <div className="relative h-28 overflow-hidden bg-[#000]">
        {ch?.image_url ? <img src={ch.image_url} alt="" className="h-full w-full object-cover opacity-70" /> : <div className="h-full w-full" style={{ background: 'repeating-linear-gradient(115deg,#7c5cff 0 18px,#5a3fe0 18px 36px)' }} />}
        <div className="absolute inset-0 bg-gradient-to-t from-bg to-transparent" />
      </div>
      <div className="-mt-10 relative px-4">
        <div className="flex items-end justify-between">{ch ? <ChannelBadge c={ch} size={76} /> : <span className="h-[76px] w-[76px] shimmer" />}{ch && <JoinButton c={ch} />}</div>
        <h1 className="cd mt-2 text-[34px] leading-none">{ch?.name ?? '…'}</h1>
        <div className="mn mt-1 flex items-center gap-0.5 text-[11px] uppercase text-mute"><Hash size={10} />{slug}</div>
        {ch?.description && <p className="mt-2 text-[15px] leading-snug">{ch.description}</p>}
        <div className="mt-3 flex items-center gap-2 pb-3">
          <div className="flex -space-x-2">{c.data?.faces.map((x) => <span key={x.handle} className="rounded-full ring-2 ring-bg"><Avatar handle={x.handle} url={x.avatar_url} size={24} /></span>)}</div>
          <span className="text-[14px]"><b>{fmtN(ch?.members ?? 0)}</b> <span className="text-mute">members</span></span>
        </div>
      </div>
      <div className="border-t border-line">{ch?.joined && <InlineComposer placeholder={`Post in /${slug}`} cta="Post" channel={slug} onDone={() => void f.refetch()} />}</div>
      {f.isLoading ? <div className="space-y-4 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-20 shimmer" />)}</div>
        : posts.length === 0 ? <Empty title="No posts yet" body={ch?.joined ? 'Kick things off.' : 'Join to post here.'} />
        : <>{posts.map((p, i) => <SocialPostRow key={p.id} p={p} index={i} />)}
          {f.hasNextPage && <div className="flex justify-center py-6"><Button tone="white" disabled={f.isFetchingNextPage} onClick={() => void f.fetchNextPage()}>{f.isFetchingNextPage ? 'Loading…' : 'Load more'}</Button></div>}</>}
    </Shell>
  );
}
