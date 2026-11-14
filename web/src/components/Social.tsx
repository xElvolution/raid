'use client';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, MessageCircle, Repeat2, Send, WifiOff } from 'lucide-react';
import { social, signInSocial, useSession, type Post } from '@/lib/social';
import { useAccount, connect } from '@/lib/wallet';
import { toast } from '@/lib/bus';
import { ago } from '@/lib/market';
import { coinBySymbol } from '@/lib/coins';
import { useNow } from '@/lib/hooks';
import { Button, Empty, Skeleton } from './ui';
import { Avatar, TestnetChip } from './app/Avatar';
import { RaidEmbed } from './app/RaidEmbed';
import { personByAccount, personByHandle } from '@/lib/people';

const errMsg = (e: unknown) => {
  const m = (e as Error).message;
  return m === 'connect_wallet' ? null : m === 'session_expired' ? 'Your session expired. Sign in again.' : m === 'rate_limited' ? 'Slow down a little.' : m;
};

/** Sign-in gate: wallet connected -> one NEP-413 signature (no gas) -> session. */
export function useSocialAuth() {
  const acct = useAccount();
  const sess = useSession();
  const [busy, setBusy] = useState(false);
  async function ensure(): Promise<boolean> {
    if (sess) return true;
    if (!acct) { await connect(); return false; }
    setBusy(true);
    try { await signInSocial(); return true; } catch (e) { const m = errMsg(e); if (m) toast({ title: 'Sign-in didn’t finish', body: m, tone: 'down' }); return false; } finally { setBusy(false); }
  }
  return { acct, sess, busy, ensure };
}

function Body({ text }: { text: string }) {
  return <>{text.split(/(\$[A-Za-z0-9]{2,12}|#\d+)/).map((part, i) => {
    if (/^#\d+$/.test(part)) return <Link key={i} href={`/raids/${part.slice(1)}`} className="font-medium text-lime hover:underline">{part}</Link>;
    if (!/^\$[A-Za-z0-9]{2,12}$/.test(part)) return <span key={i}>{part}</span>;
    const sym = part.slice(1);
    return coinBySymbol(sym) ? <Link key={i} href={`/coin/${sym}`} className="font-semibold hover:underline">{part}</Link> : <b key={i} className="font-semibold">{part}</b>;
  })}</>;
}

const profileOf = (p: Pick<Post, 'handle' | 'near_account'>) => `/u/${personByHandle(p.handle)?.handle ?? p.near_account ?? p.handle}`;

export function Composer({ raidId, coin, replyTo, placeholder = 'What are you raiding?', onPosted, compact }: { raidId?: number; coin?: string; replyTo?: string; placeholder?: string; onPosted?: () => void; compact?: boolean }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const { acct, sess, busy, ensure } = useSocialAuth();
  const qc = useQueryClient();
  const left = 500 - text.length;
  async function post() {
    if (!(await ensure())) return;
    const body = text.trim(); if (!body) return;
    const raw = coin ?? body.match(/\$([A-Za-z0-9]{2,12})/)?.[1];
    const tag = raw && /^[A-Z0-9]{2,12}$/.test(raw) ? raw : undefined;
    const ref = raidId ?? (body.match(/#(\d+)/) ? Number(body.match(/#(\d+)/)![1]) : undefined);
    setSending(true);
    try {
      await social.post({ body, raidId: ref, coin: tag, replyTo });
      setText(''); onPosted?.();
      void qc.invalidateQueries({ queryKey: ['feed'] }); void qc.invalidateQueries({ queryKey: ['thread'] });
    } catch (e) { const m = errMsg(e); if (m) toast({ title: 'Didn’t post', body: m, tone: 'down' }); }
    finally { setSending(false); }
  }
  return (
    <div className={`flex gap-3 ${compact ? 'py-2' : 'py-3'}`}>
      <Avatar id={sess?.account ?? acct ?? 'guest'} size={compact ? 32 : 44} />
      <div className="min-w-0 flex-1">
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} placeholder={placeholder} rows={compact ? 1 : 2} aria-label={placeholder}
          className="w-full resize-none bg-transparent pt-2 text-[15px] leading-snug outline-none placeholder:text-faint" />
        <div className="mt-2 flex items-center gap-2">
          {raidId !== undefined && !replyTo && <span className="text-[12.5px] text-mute">Posting to raid #{raidId}</span>}
          <span className={`ml-auto mono text-[12px] ${left < 40 ? 'text-down' : 'text-faint'}`}>{text ? left : ''}</span>
          {sess || !acct ? (
            <Button size="sm" tone="ink" disabled={(!!sess && !text.trim()) || sending || busy} onClick={post}>{!acct ? 'Connect to post' : sending ? 'Posting…' : <><Send size={14} />{replyTo ? 'Reply' : 'Post'}</>}</Button>
          ) : (
            <Button size="sm" tone="ink" disabled={busy} onClick={() => void ensure()}>{busy ? 'Check wallet…' : 'Sign in to post'}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** One post, X/Farcaster shape: avatar, name, handle, time, text, the raid it points at, and actions. */
export function PostCard({ p, i = 0, now, threaded = true, embed = true }: { p: Post; i?: number; now: number; threaded?: boolean; embed?: boolean }) {
  const [liked, setLiked] = useState(p.liked);
  const [likes, setLikes] = useState(p.likes);
  const [open, setOpen] = useState(false);
  const { ensure } = useSocialAuth();
  const person = personByHandle(p.handle) ?? personByAccount(p.near_account);
  async function like() {
    if (!(await ensure())) return;
    const on = !liked; setLiked(on); setLikes((n) => n + (on ? 1 : -1));
    try { const r = await social.like(p.id, on); setLikes(r.likes); } catch (e) { setLiked(!on); setLikes((n) => n - (on ? 1 : -1)); const m = errMsg(e); if (m) toast({ title: 'Like failed', body: m, tone: 'down' }); }
  }
  const href = profileOf(p);
  return (
    <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }} className="flex gap-3 py-3">
      <Link href={href} className="shrink-0"><Avatar id={p.near_account} handle={p.handle} size={38} /></Link>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5 text-[14px] leading-tight">
          <Link href={href} className="truncate font-semibold hover:underline">{person?.name ?? (p.display_name || p.handle)}</Link>
          <span className="truncate text-mute">@{p.handle}</span>
          <span className="shrink-0 text-faint">· {now ? ago(new Date(p.created_at).getTime(), now) : ''}</span>
          {person && <TestnetChip className="ml-auto" />}
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-[14.5px] leading-[1.45]"><Body text={p.body} /></p>
        {embed && p.raid_id !== null && !p.reply_to && <RaidEmbed id={p.raid_id} className="mt-3" />}
        <div className="mt-3 flex items-center gap-7 text-[12.5px] text-mute">
          {threaded && <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="press -ml-2 flex items-center gap-1.5 rounded-full px-2 py-1 hover:bg-raised hover:text-ink"><MessageCircle size={18} />{p.replies || ''}<span className="sr-only">replies</span></button>}
          <button onClick={like} aria-pressed={liked} aria-label={liked ? 'Unlike' : 'Like'} className={`press flex items-center gap-1.5 rounded-full px-2 py-1 hover:bg-raised ${liked ? 'text-down' : 'hover:text-ink'}`}>
            <motion.span key={String(liked)} initial={{ scale: liked ? 0.5 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 15 }}><Heart size={18} fill={liked ? 'currentColor' : 'none'} /></motion.span>{likes || ''}
          </button>
          {p.raid_id !== null && <Link href={`/raids/${p.raid_id}#back`} className="press ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold text-ink hairline hover:bg-raised"><Repeat2 size={16} />Back</Link>}
        </div>
        <AnimatePresence>{open && threaded && <Thread id={p.id} now={now} />}</AnimatePresence>
      </div>
    </motion.article>
  );
}

function Thread({ id, now }: { id: string; now: number }) {
  const t = useQuery({ queryKey: ['thread', id], queryFn: () => social.thread(id) });
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 overflow-hidden border-l-2 border-line pl-3">
      {t.isLoading && <Skeleton className="h-12" />}
      {t.data?.replies.map((r) => <PostCard key={r.id} p={r} now={now} threaded={false} />)}
      {t.data && !t.data.replies.length && <p className="py-2 text-[13px] text-faint">No replies yet.</p>}
      <Composer replyTo={id} compact placeholder="Reply…" />
    </motion.div>
  );
}

/** Posts from the social API. Seeded placeholder accounts are left out: the feed shows real testnet activity only. */
export function usePosts(q: { tab?: 'all' | 'following'; raid?: number; author?: string }) {
  const { sess } = useSocialAuth();
  const r = useInfiniteQuery({
    queryKey: ['feed', q.tab ?? 'all', q.raid, q.author, sess?.handle], initialPageParam: undefined as string | undefined, refetchInterval: 15_000,
    queryFn: ({ pageParam }) => social.feed({ tab: q.tab ?? 'all', raid: q.raid, author: q.author, cursor: pageParam }), getNextPageParam: (l) => l.next ?? undefined,
  });
  const items = (r.data?.pages.flatMap((p) => p.items) ?? []).filter((p) => !p.demo);
  return { ...r, items };
}

export function Feed({ raidId, author, tab = 'all', emptyTitle = 'Nothing posted yet', emptyBody = 'Be the first to call it.', embed = true }: { raidId?: number; author?: string; tab?: 'all' | 'following'; header?: ReactNode; emptyTitle?: string; emptyBody?: string; embed?: boolean }) {
  const now = useNow(30_000);
  const q = usePosts({ tab, raid: raidId, author });
  return (
    <section>
      <div className="divide-y divide-line">
        {q.isLoading && [0, 1, 2].map((i) => <div key={i} className="flex gap-3 py-3"><Skeleton className="h-11 w-11 !rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-full" /></div></div>)}
        {q.error && <Empty art={<WifiOff size={36} className="text-faint" />} title="Social feed is offline" body="Can’t reach the RAID social API. Raids and the chest still work." action={<button onClick={() => q.refetch()} className="font-semibold">Retry</button>} />}
        {!q.isLoading && !q.error && !q.items.length && <Empty title={emptyTitle} body={emptyBody} />}
        {q.items.map((p, i) => <PostCard key={p.id} p={p} i={i} now={now} embed={embed} />)}
      </div>
      {q.hasNextPage && <Button tone="ghost" className="mt-3 w-full" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>{q.isFetchingNextPage ? 'Loading…' : 'Load more'}</Button>}
    </section>
  );
}

export function WhoToFollow() { return null; }
