'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import Link from 'next/link';
import { Hash, Radio } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Empty } from '@/components/ui';
import { fmtN } from '@/components/social/SocialPost';
import { useSocialApi } from '@/lib/social';
import { ChannelBadge, JoinButton } from '@/components/social/Channel';

export default function Channels() {
  const s = useSocialApi();
  const q = useQuery({ queryKey: ['channels'], queryFn: () => s.channels() });
  const items = q.data?.items ?? [];
  const mine = items.filter((c) => c.joined);
  return (
    <Shell title="Channels" flush>
      {q.isLoading ? [0, 1, 2, 3, 4].map((i) => <div key={i} className="flex gap-3 px-4 py-3"><span className="h-12 w-12 shimmer" /><div className="flex-1 space-y-2 pt-1"><div className="h-3.5 w-1/3 shimmer" /><div className="h-3.5 w-2/3 shimmer" /></div></div>)
        : items.length === 0 ? <Empty icon={Radio} title="No channels yet" />
        : <>
          {mine.length > 0 && <>
            <h2 className="cd px-4 pt-2 text-[22px]">Your channels</h2>
            <div className="flex gap-3 overflow-x-auto px-4 pb-4 pt-2 [scrollbar-width:none]">
              {mine.map((c) => <Link key={c.slug} href={`/channels/${c.slug}`} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5"><ChannelBadge c={c} size={60} /><span className="w-full truncate text-center text-[12px] font-semibold">{c.name}</span></Link>)}
            </div>
          </>}
          <div className="flex items-end justify-between border-t border-line px-4 pb-1 pt-4"><h2 className="cd text-[22px]">All channels</h2><span className="mn text-[11px] text-mute">{items.length} LIVE</span></div>
          {items.map((c, i) => (
            <motion.div key={c.slug} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}>
              <Link href={`/channels/${c.slug}`} className="flex items-center gap-3 border-b border-line px-4 py-3 hover:bg-ink/[.03]">
                <ChannelBadge c={c} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-[16px] font-extrabold"><span className="truncate">{c.name}</span></div>
                  <div className="mn flex items-center gap-0.5 text-[11px] uppercase text-mute"><Hash size={10} />{c.slug} · {fmtN(c.members)} members{c.posts_week ? ` · ${c.posts_week} this week` : ''}</div>
                  {c.description && <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug text-mute">{c.description}</p>}
                </div>
                <JoinButton c={c} small />
              </Link>
            </motion.div>
          ))}
        </>}
    </Shell>
  );
}
