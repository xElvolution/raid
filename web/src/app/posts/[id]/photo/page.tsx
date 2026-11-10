'use client';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { MediaViewer } from '@/components/social/MediaViewer';
import { useSocialApi } from '@/lib/social';

/** Shareable deep link to a post's media; closing returns to the thread. */
export default function PhotoPage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const s = useSocialApi();
  const q = useQuery({ queryKey: ['thread', id], queryFn: () => s.thread(id) });
  const p = q.data?.post;
  return <div className="min-h-dvh bg-[#000]">
    {q.isLoading && <div className="grid min-h-dvh place-items-center mn text-[12px] uppercase text-white/50">Loading…</div>}
    {q.data && !p?.media_url && <div className="grid min-h-dvh place-items-center text-white/70">No media on this post.</div>}
    <MediaViewer src={p?.media_url ?? null} onClose={() => router.replace(`/posts/${id}`)} caption={p && <><b>{p.display_name}</b> <span className="text-white/60">@{p.handle}</span><div className="mt-1 line-clamp-3">{p.body}</div></>} />
  </div>;
}
