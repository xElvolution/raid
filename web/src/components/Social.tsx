'use client';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, MessageCircle, Send, Swords, UserPlus, UserCheck, WifiOff } from 'lucide-react';
import { social, signInSocial, useSession, type Post } from '@/lib/social';
import { useAccount, connect } from '@/lib/wallet';
import { toast } from '@/lib/bus';
import { ago } from '@/lib/market';
import { coinBySymbol } from '@/lib/coins';
import { useNow } from '@/lib/hooks';
import { Button, Empty, Identicon, Skeleton } from './ui';

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
  return <>{text.split(/(\$[A-Z0-9]{2,12})/).map((part, i) => {
    if (!/^\$[A-Z0-9]{2,12}$/.test(part)) return <span key={i}>{part}</span>;
    const sym = part.slice(1);
    return coinBySymbol(sym) ? <Link key={i} href={`/coin/${sym}`} className="font-semibold text-brand hover:underline">{part}</Link> : <b key={i} className="font-semibold text-ink">{part}</b>;
  })}</>;
}

export function Composer({ raidId, coin, replyTo, placeholder = 'Call it. What are you raiding and why?', onPosted, compact }: { raidId?: number; coin?: string; replyTo?: string; placeholder?: string; onPosted?: () => void; compact?: boolean }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const { acct, sess, busy, ensure } = useSocialAuth();
  const qc = useQueryClient();
  const left = 500 - text.length;
  async function post() {
    if (!(await ensure())) return;
    const body = text.trim(); if (!body) return;
    const tag = coin ?? body.match(/\$([A-Z0-9]{2,12})/)?.[1];
    setSending(true);
    try {
      await social.post({ body, raidId, coin: tag, replyTo });
      setText(''); onPosted?.();
      void qc.invalidateQueries({ queryKey: ['feed'] }); void qc.invalidateQueries({ queryKey: ['thread'] });
    } catch (e) { const m = errMsg(e); if (m) toast({ title: 'Didn’t post', body: m, tone: 'down' }); }
    finally { setSending(false); }
  }
  return (
    <div className={`flex gap-3 ${compact ? '' : 'panel p-4'}`}>
      <Identicon seed={sess?.account ?? acct ?? 'guest'} size={compact ? 30 : 40} />
      <div className="min-w-0 flex-1">
        <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} placeholder={placeholder} rows={compact ? 1 : 2} aria-label={placeholder}
          className="w-full resize-none bg-transparent text-[15px] leading-snug outline-none placeholder:text-faint" />
        <div className="mt-2 flex items-center gap-2">
          {raidId !== undefined && !replyTo && <span className="chip chip-ghost"><Swords size={12} />Raid #{raidId}</span>}
          <span className={`ml-auto mono text-[11px] ${left < 40 ? 'text-down' : 'text-faint'}`}>{text ? left : ''}</span>
          {sess || !acct ? (
            <Button size="sm" tone="lime" disabled={(!!sess && !text.trim()) || sending || busy} onClick={post}>{!acct ? 'Connect to post' : sending ? 'Posting…' : <><Send size={14} />{replyTo ? 'Reply' : 'Post'}</>}</Button>
          ) : (
            <Button size="sm" tone="lime" disabled={busy} onClick={() => void ensure()}>{busy ? 'Check wallet…' : 'Sign in to post'}</Button>
          )}
        </div>
        {acct && !sess && <p className="mt-1.5 text-[11px] text-faint">Signing in is one message signature in your wallet. No transaction, no gas.</p>}
      </div>
    </div>
  );
}

export function PostCard({ p, i = 0, now, threaded = true }: { p: Post; i?: number; now: number; threaded?: boolean }) {
  const [liked, setLiked] = useState(p.liked);
  const [likes, setLikes] = useState(p.likes);
  const [following, setFollowing] = useState(p.following);
  const [open, setOpen] = useState(false);
  const { sess, ensure } = useSocialAuth();
  const mine = sess?.handle === p.handle;
  async function like() {
    if (!(await ensure())) return;
    const on = !liked; setLiked(on); setLikes((n) => n + (on ? 1 : -1));
    try { const r = await social.like(p.id, on); setLikes(r.likes); } catch (e) { setLiked(!on); setLikes((n) => n - (on ? 1 : -1)); const m = errMsg(e); if (m) toast({ title: 'Like failed', body: m, tone: 'down' }); }
  }
  async function follow() {
    if (!(await ensure())) return;
    const on = !following; setFollowing(on);
    try { await social.follow(p.handle, on); } catch (e) { setFollowing(!on); const m = errMsg(e); if (m) toast({ title: 'Follow failed', body: m, tone: 'down' }); }
  }
  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.035 }} className="flex gap-3 px-4 py-3.5">
      <Identicon seed={p.near_account ?? p.handle} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5 text-[13.5px]">
          <span className="truncate font-semibold">{(p.display_name || p.handle).replace(/\s*\(demo\)$/i, '')}</span>
          {p.demo && <span className="chip chip-ghost !h-[18px] !px-1.5 !text-[9.5px]" title="Seeded demo account, not a real person">DEMO</span>}
          <span className="hidden truncate text-mute sm:inline">@{p.handle}</span>
          <span className="shrink-0 text-faint">· {now ? ago(new Date(p.created_at).getTime(), now) : ''}</span>
          {!mine && <button onClick={follow} aria-pressed={following} aria-label={following ? `Unfollow @${p.handle}` : `Follow @${p.handle}`} className={`press ml-auto flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-bold ${following ? 'hairline text-mute' : 'bg-ink text-bg'}`}>{following ? <><UserCheck size={13} /><span className="hidden sm:inline">Following</span></> : <><UserPlus size={13} /><span className="hidden sm:inline">Follow</span></>}</button>}
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-snug"><Body text={p.body} /></p>
        {p.raid_id !== null && !p.reply_to && <Link href={`/raids/${p.raid_id}`} className="lift mt-2 inline-flex items-center gap-1.5 rounded-[10px] hairline px-2.5 py-1.5 text-[12px] font-semibold"><Swords size={13} className="text-lime" />Raid #{p.raid_id}{p.coin ? ` · $${p.coin}` : ''}</Link>}
        <div className="mt-2 flex items-center gap-5 text-[12.5px] text-mute">
          {threaded && <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="press flex items-center gap-1.5 hover:text-ink"><MessageCircle size={16} />{p.replies || ''}<span className="sr-only">replies</span></button>}
          <button onClick={like} aria-pressed={liked} aria-label={liked ? 'Unlike' : 'Like'} className={`press flex items-center gap-1.5 ${liked ? 'text-down' : 'hover:text-ink'}`}>
            <motion.span key={String(liked)} initial={{ scale: liked ? 0.5 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 15 }}><Heart size={16} fill={liked ? 'currentColor' : 'none'} /></motion.span>{likes || ''}
          </button>
        </div>
        <AnimatePresence>{open && threaded && <Thread id={p.id} now={now} />}</AnimatePresence>
      </div>
    </motion.article>
  );
}

function Thread({ id, now }: { id: string; now: number }) {
  const t = useQuery({ queryKey: ['thread', id], queryFn: () => social.thread(id) });
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 overflow-hidden border-l-2 border-line pl-1">
      {t.isLoading && <Skeleton className="ml-3 h-12" />}
      {t.data?.replies.map((r) => <PostCard key={r.id} p={r} now={now} threaded={false} />)}
      {t.data && !t.data.replies.length && <p className="px-4 py-2 text-[12.5px] text-faint">No replies yet.</p>}
      <div className="px-3 pb-2 pt-1"><Composer replyTo={id} compact placeholder="Reply…" /></div>
    </motion.div>
  );
}

export function Feed({ raidId, coin, header, emptyTitle = 'Nothing posted yet', emptyBody = 'Be the first to call it.' }: { raidId?: number; coin?: string; header?: ReactNode; emptyTitle?: string; emptyBody?: string }) {
  const now = useNow(30_000);
  const { sess } = useSocialAuth();
  const [tab, setTab] = useState<'all' | 'following'>('all');
  const q = useInfiniteQuery({
    queryKey: ['feed', tab, raidId, coin, sess?.handle], initialPageParam: undefined as string | undefined, refetchInterval: 15_000,
    queryFn: ({ pageParam }) => social.feed({ tab, raid: raidId, coin, cursor: pageParam }), getNextPageParam: (l) => l.next ?? undefined,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <section>
      {header}
      {raidId === undefined && sess && (
        <div className="mb-2 flex gap-1.5">{(['all', 'following'] as const).map((t) => <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t} className={`press h-8 rounded-full px-3.5 text-[12.5px] font-semibold ${tab === t ? 'bg-ink text-bg' : 'hairline text-mute'}`}>{t === 'all' ? 'Everyone' : 'Following'}</button>)}</div>
      )}
      <div className="panel overflow-hidden divide-y divide-line">
        {q.isLoading && [0, 1, 2].map((i) => <div key={i} className="flex gap-3 p-4"><Skeleton className="h-10 w-10 !rounded-[9px]" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3.5 w-full" /></div></div>)}
        {q.error && <div className="p-6"><Empty art={<WifiOff size={36} className="text-faint" />} title="Social feed is offline" body={`Can’t reach the RAID social API. Raids, prices and the chest still work.`} action={<button onClick={() => q.refetch()} className="text-brand font-semibold">Retry</button>} /></div>}
        {!q.isLoading && !q.error && !items.length && <Empty title={tab === 'following' ? 'No posts from people you follow' : emptyTitle} body={tab === 'following' ? 'Follow callers from Everyone to fill this.' : emptyBody} />}
        {items.map((p, i) => <PostCard key={p.id} p={p} i={i} now={now} />)}
      </div>
      {q.hasNextPage && <Button tone="ghost" className="mt-3 w-full" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>{q.isFetchingNextPage ? 'Loading…' : 'Load more'}</Button>}
    </section>
  );
}

export function WhoToFollow() {
  const c = useQuery({ queryKey: ['callers'], queryFn: social.callers, staleTime: 60_000 });
  const { ensure } = useSocialAuth();
  const qc = useQueryClient();
  if (c.error || (c.data && !c.data.items.length)) return null;
  return (
    <section className="panel p-4">
      <p className="eyebrow">Callers to follow</p>
      <ul className="mt-3 space-y-3">
        {c.isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-9" />)}
        {c.data?.items.map((u) => (
          <li key={u.handle} className="flex items-center gap-2.5">
            <Identicon seed={u.near_account ?? u.handle} size={34} />
            <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold">{(u.display_name || u.handle).replace(/\s*\(demo\)$/i, "")}{u.demo && <span className="ml-1.5 mono text-[9.5px] text-faint">DEMO</span>}</p><p className="truncate mono text-[11px] text-mute">{u.followers} followers · {u.posts} posts</p></div>
            <button onClick={async () => { if (!(await ensure())) return; await social.follow(u.handle, !u.following).catch(() => {}); void qc.invalidateQueries({ queryKey: ['callers'] }); void qc.invalidateQueries({ queryKey: ['feed'] }); }}
              className={`press h-7 rounded-full px-2.5 text-[11.5px] font-bold ${u.following ? 'hairline text-mute' : 'bg-ink text-bg'}`}>{u.following ? 'Following' : 'Follow'}</button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-faint">Accounts marked DEMO are seeded examples, not real people.</p>
    </section>
  );
}

