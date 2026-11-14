'use client';
/** The home timeline: people's posts plus every raid called on the chest, newest first. */
import Link from 'next/link';
import { motion } from 'motion/react';
import { Repeat2, Users } from 'lucide-react';
import { useBackers, useNow, useRaids } from '@/lib/hooks';
import { phase, type Raid } from '@/lib/raid';
import { displayName, personByAccount, profileHref } from '@/lib/people';
import { Avatar, TestnetChip } from './Avatar';
import { RaidEmbedView } from './RaidEmbed';
import { PostCard, usePosts } from '../Social';
import { Empty, Skeleton } from '../ui';

export function RaidCallPost({ r, i = 0 }: { r: Raid; i?: number }) {
  const now = useNow();
  const crew = useBackers(r.id);
  const person = personByAccount(r.caller);
  const href = profileHref(r.caller);
  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.4 }} className="flex gap-3 py-3">
      <Link href={href} className="shrink-0"><Avatar id={r.caller} size={38} /></Link>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5 text-[14px] leading-tight">
          <Link href={href} className="truncate font-semibold hover:underline">{displayName(r.caller)}</Link>
          <span className="shrink-0 text-mute">called a raid</span>
          {person && <TestnetChip className="ml-auto" />}
        </div>
        <p className="mt-1 break-words text-[14.5px] leading-[1.45]">{r.title}</p>
        <RaidEmbedView r={r} className="mt-3" />
        <div className="mt-3 flex items-center gap-6 text-[12.5px] text-mute">
          <Link href={`/raids/${r.id}#crew`} className="flex items-center gap-1.5 hover:text-ink"><Users size={17} />{crew.data?.length ?? ''}</Link>
          <span className="text-[12.5px]">{now ? phase(r, now).label : ''}</span>
          {r.status === 'Open' && <Link href={`/raids/${r.id}#back`} className="press ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold btn-signal"><Repeat2 size={16} />Back</Link>}
        </div>
      </div>
    </motion.article>
  );
}

type Item = { k: string; t: number; post?: ReturnType<typeof usePosts>['items'][number]; raid?: Raid };

export function Timeline({ mode }: { mode: 'foryou' | 'live' | 'following' }) {
  const raids = useRaids();
  const posts = usePosts({ tab: mode === 'following' ? 'following' : 'all' });
  const now = useNow(30_000);
  const list = raids.data ?? [];
  let items: Item[] = [];
  if (mode === 'live') items = [...list].filter((r) => r.status !== 'Closed').reverse().map((r) => ({ k: `r${r.id}`, t: r.opens_until_ms, raid: r }));
  else {
    items = posts.items.map((p) => ({ k: p.id, t: new Date(p.created_at).getTime(), post: p }));
    // A raid already shared in a post shows inside that post; the rest appear as the caller's call, placed at its crew window.
    const shared = new Set(posts.items.map((p) => p.raid_id));
    if (mode === 'foryou') items.push(...list.filter((r) => !shared.has(r.id)).map((r) => ({ k: `r${r.id}`, t: Math.min(r.opens_until_ms, now || r.opens_until_ms), raid: r })));
    items.sort((a, b) => b.t - a.t);
  }
  const loading = raids.isLoading || (mode !== 'live' && posts.isLoading);
  return (
    <div className="divide-y divide-line">
      {loading && [0, 1, 2].map((i) => <div key={i} className="flex gap-3 py-3"><Skeleton className="h-11 w-11 !rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-full" /><Skeleton className="h-28 w-full" /></div></div>)}
      {!loading && !items.length && (mode === 'following'
        ? <Empty title="Follow some raiders" body="Open a profile from any post and follow it. Their posts land here." />
        : <Empty title="No live raids right now" body="Call one with the orange button. The crew has a few minutes to form." />)}
      {items.map((it, i) => it.raid ? <RaidCallPost key={it.k} r={it.raid} i={i} /> : <PostCard key={it.k} p={it.post!} i={i} now={now} />)}
      {mode !== 'live' && posts.hasNextPage && <button className="w-full py-3 text-[13px] font-semibold text-mute hover:text-ink" onClick={() => posts.fetchNextPage()}>{posts.isFetchingNextPage ? 'Loading…' : 'Show more'}</button>}
    </div>
  );
}
