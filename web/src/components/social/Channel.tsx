'use client';
/* eslint-disable @next/next/no-img-element -- channel art */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { haptic } from '@/lib/fx';
import { useSession } from '@/lib/session';
import { useSocialApi, type Channel } from '@/lib/social';

export function ChannelBadge({ c, size = 48 }: { c: Pick<Channel, 'slug' | 'name' | 'image_url'>; size?: number }) {
  return c.image_url
    ? <img src={c.image_url} alt="" className="cuts shrink-0 object-cover" style={{ width: size, height: size }} />
    : <span className="cuts cd grid shrink-0 place-items-center bg-grape text-white" style={{ width: size, height: size, fontSize: size * 0.5 }}>{c.name.slice(0, 1)}</span>;
}

export function JoinButton({ c, small }: { c: Channel; small?: boolean }) {
  const { me } = useSession(); const s = useSocialApi(); const qc = useQueryClient(); const router = useRouter();
  const m = useMutation({ mutationFn: (on: boolean) => s.join(c.slug, on), onSuccess: () => { haptic('tap'); void qc.invalidateQueries({ queryKey: ['channels'] }); void qc.invalidateQueries({ queryKey: ['channel', c.slug] }); } });
  return (
    <button disabled={m.isPending} onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!me) return router.push('/signin'); m.mutate(!c.joined); }}
      className={`press shrink-0 rounded-full font-bold ${small ? 'h-8 px-3.5 text-[13px]' : 'h-9 px-4 text-[14px]'} ${c.joined ? 'border border-line' : 'bg-ink text-bg'}`}>{c.joined ? 'Joined' : 'Join'}</button>
  );
}

