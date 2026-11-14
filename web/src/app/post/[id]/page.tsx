'use client';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shell } from '@/components/Shell';
import { Empty, Skeleton } from '@/components/ui';
import { PostItem } from '@/components/app/Post';
import { openComposer } from '@/components/app/Composer';
import { posts } from '@/lib/social';
import { useNow } from '@/lib/hooks';

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const now = useNow(30_000);
  const q = useQuery({ queryKey: ['post', id], queryFn: () => posts.get(id), refetchInterval: 15_000 });
  return (
    <Shell title="Post" back="/feed">
      {q.isLoading && <Skeleton className="mt-3 h-32" />}
      {q.error && <Empty title="Post not found" body="It may have been removed." />}
      {q.data && (
        <>
          {q.data.ancestors.map((a) => <div key={a.id} className="relative"><PostItem p={a} now={now} compact /><span className="absolute bottom-0 left-[18px] top-12 w-0.5 bg-line" /></div>)}
          <div className="border-b border-line"><PostItem p={q.data.post} now={now} /></div>
          <button onClick={() => openComposer({ replyTo: q.data!.post })} className="flex w-full items-center gap-2 border-b border-line py-3 text-left text-[14px] text-faint">Post your reply<span className="ml-auto rounded-full bg-ink px-3.5 py-1.5 text-[13px] font-semibold text-bg">Reply</span></button>
          <div className="divide-y divide-line">{q.data.replies.map((r, i) => <PostItem key={r.id} p={r} i={i} now={now} compact />)}</div>
          {!q.data.replies.length && <p className="py-6 text-center text-[13.5px] text-mute">No replies yet. Start the conversation.</p>}
        </>
      )}
    </Shell>
  );
}
