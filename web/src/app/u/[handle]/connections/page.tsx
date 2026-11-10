'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { BadgeCheck, Users } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Avatar, Empty } from '@/components/ui';
import { haptic } from '@/lib/fx';
import { useSession } from '@/lib/session';
import { useSocialApi, type Connection } from '@/lib/social';

function FollowBtn({ c }: { c: Connection }) {
  const { me } = useSession(); const s = useSocialApi(); const qc = useQueryClient(); const router = useRouter();
  const [on, setOn] = useState(c.am_following); const [hover, setHover] = useState(false);
  const m = useMutation({ mutationFn: (v: boolean) => s.follow(c.handle, v), onError: (_e, v) => setOn(!v), onSuccess: () => void qc.invalidateQueries({ queryKey: ['caller'] }) });
  if (me?.handle === c.handle) return null;
  return (
    <button onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={(e) => { e.preventDefault(); if (!me) return router.push('/signin'); haptic('tap'); setOn(!on); m.mutate(!on); }}
      className={`press h-8 w-[104px] shrink-0 rounded-full text-[14px] font-bold ${on ? (hover ? 'border border-coral text-coral' : 'border border-line') : 'bg-ink text-bg'}`}>
      {on ? (hover ? 'Unfollow' : 'Following') : 'Follow'}
    </button>
  );
}

function Lists() {
  const { handle } = useParams<{ handle: string }>(); const sp = useSearchParams(); const router = useRouter(); const s = useSocialApi();
  const list = sp.get('list') === 'following' ? 'following' : 'followers';
  const q = useQuery({ queryKey: ['conn', handle, list], queryFn: () => s.connections(handle, list) });
  const tabs = [['followers', 'Followers'], ['following', 'Following']] as const;
  return (
    <>
      <div className="sticky top-[58px] z-10 grid grid-cols-2 border-b border-line bg-bg/90 backdrop-blur-xl">
        {tabs.map(([v, l]) => (
          <button key={v} onClick={() => router.replace(`/u/${handle}/connections?list=${v}`)} className={`relative h-12 text-[15px] font-bold ${list === v ? 'text-ink' : 'text-mute'}`}>
            {l}{list === v && <motion.span layoutId="conn-tab" className="absolute inset-x-[30%] bottom-0 h-1 bg-grape" />}
          </button>
        ))}
      </div>
      {q.isLoading ? [0, 1, 2, 3, 4].map((i) => <div key={i} className="flex gap-3 px-4 py-3"><span className="h-11 w-11 rounded-full shimmer" /><div className="flex-1 space-y-2 pt-1"><div className="h-3.5 w-1/3 shimmer" /><div className="h-3.5 w-2/3 shimmer" /></div></div>)
        : q.isError ? <Empty title="Couldn’t load this list" />
        : !q.data?.items.length ? <Empty icon={Users} title={list === 'followers' ? 'No followers yet' : 'Not following anyone'} body={list === 'followers' ? `When people follow @${handle}, they’ll show up here.` : `When @${handle} follows callers, they’ll show up here.`} />
        : q.data.items.map((c, i) => (
          <motion.div key={c.handle} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.025 }}>
            <Link href={`/u/${c.handle}`} className="flex gap-3 px-4 py-3 hover:bg-ink/[.03]">
              <Avatar handle={c.handle} url={c.avatar_url} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 leading-tight"><div className="flex items-center gap-1 text-[15px] font-bold"><span className="truncate">{c.display_name}</span>{c.verified && <BadgeCheck size={15} className="shrink-0 text-grape" />}</div><div className="truncate text-[14px] text-mute">@{c.handle}</div></div>
                  <FollowBtn c={c} />
                </div>
                {c.bio && <p className="mt-1 line-clamp-2 text-[14px] leading-snug">{c.bio}</p>}
              </div>
            </Link>
          </motion.div>
        ))}
    </>
  );
}

export default function Connections() {
  const { handle } = useParams<{ handle: string }>();
  return <Shell title={<div className="leading-tight"><h1 className="cd text-[26px]">@{handle}</h1></div>} back={`/u/${handle}`} flush><Suspense><Lists /></Suspense></Shell>;
}
