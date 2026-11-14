'use client';
/** A post in the RAID feed: text, image, token chips, an embedded raid or quoted post, and the full action row. */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bookmark, Heart, MessageCircle, Quote, Repeat2, Share } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { posts, mediaSrc, type FeedPost } from '@/lib/social';
import { coinBySymbol } from '@/lib/coins';
import { useQuote, fmtPrice, ago } from '@/lib/market';
import { personByAccount, personByHandle } from '@/lib/people';
import { toast } from '@/lib/bus';
import { useSocialAuth } from '../Social';
import { CoinAvatar } from '../ui';
import { Avatar, TestnetChip } from './Avatar';
import { RaidEmbed } from './RaidEmbed';
import { openComposer } from './Composer';

/** $TICKER as a live chip: logo, price and 24h change, linking to the coin page. */
export function TokenChip({ symbol }: { symbol: string }) {
  const q = useQuote(symbol);
  const known = !!coinBySymbol(symbol);
  if (!known) return <b className="font-semibold">${symbol}</b>;
  const ch = q.data?.change24h;
  return (
    <Link href={`/coin/${symbol}`} onClick={(e) => e.stopPropagation()} className="mx-0.5 inline-flex translate-y-[2px] items-center gap-1 rounded-full bg-raised py-0.5 pl-0.5 pr-2 align-baseline text-[12.5px] font-semibold leading-none hover:bg-line">
      <CoinAvatar symbol={symbol} size={16} />${symbol}
      {q.data && <span className="mono font-medium text-mute">{fmtPrice(q.data.priceUsd)}</span>}
      {ch != null && <span className={`mono font-medium ${ch >= 0 ? 'text-up' : 'text-down'}`}>{ch >= 0 ? '+' : ''}{ch.toFixed(1)}%</span>}
    </Link>
  );
}

export function RichText({ text }: { text: string }) {
  return <>{text.split(/(\$[A-Za-z][A-Za-z0-9]{1,11}\b|@[a-z0-9_]{3,20}|#\d+)/).map((part, i) => {
    if (/^\$[A-Za-z]/.test(part)) return <TokenChip key={i} symbol={part.slice(1).toUpperCase() === part.slice(1) ? part.slice(1) : part.slice(1)} />;
    if (part.startsWith('@')) return <Link key={i} href={`/u/${part.slice(1)}`} onClick={(e) => e.stopPropagation()} className="font-medium text-lime hover:underline">{part}</Link>;
    if (/^#\d+$/.test(part)) return <Link key={i} href={`/raids/${part.slice(1)}`} onClick={(e) => e.stopPropagation()} className="font-medium text-lime hover:underline">{part}</Link>;
    return <span key={i}>{part}</span>;
  })}</>;
}

const prof = (h: string, a?: string | null) => `/u/${personByHandle(h)?.handle ?? h ?? a}`;

function Act({ on, n, onClick, label, children, tone }: { on?: boolean; n?: number; onClick: (e: React.MouseEvent) => void; label: string; children: React.ReactNode; tone?: string }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(e); }} aria-label={label} aria-pressed={on} className={`press -ml-1.5 flex min-w-[46px] items-center gap-1 rounded-full px-1.5 py-1 text-[12.5px] ${on ? tone : 'text-mute hover:text-ink'}`}>
      {children}{n ? <span className="mono">{n}</span> : null}
    </button>
  );
}

export function PostItem({ p, i = 0, now, compact, onReply }: { p: FeedPost; i?: number; now: number; compact?: boolean; onReply?: () => void }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { ensure } = useSocialAuth();
  const [liked, setLiked] = useState(!!p.liked), [likes, setLikes] = useState(p.likes ?? 0);
  const [rc, setRc] = useState(!!p.recasted), [recasts, setRecasts] = useState(p.recasts ?? 0);
  const [bm, setBm] = useState(!!p.bookmarked);
  const [menu, setMenu] = useState(false);
  const person = personByHandle(p.handle) ?? personByAccount(p.near_account);
  const id = String(p.id);
  async function react(kind: 'like' | 'recast' | 'bookmark', on: boolean, set: (v: boolean) => void, count?: (n: number) => void) {
    if (!(await ensure())) return;
    set(on); count?.(on ? 1 : -1);
    try { const r = await posts.react(id, kind, on); if (kind === 'like') setLikes(r.count); if (kind === 'recast') setRecasts(r.count); }
    catch (e) { set(!on); count?.(on ? -1 : 1); toast({ title: 'Didn’t work', body: (e as Error).message, tone: 'down' }); }
  }
  async function share() {
    const url = `${location.origin}/post/${id}`;
    try { if (navigator.share) await navigator.share({ url, text: p.body.slice(0, 100) }); else { await navigator.clipboard.writeText(url); toast({ title: 'Link copied' }); } } catch { /* closed */ }
  }
  const img = mediaSrc(p.media_url);
  return (
    <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03, duration: 0.3 }}
      onClick={() => router.push(`/post/${id}`)} className="flex cursor-pointer gap-2.5 py-3 hover:bg-raised/25">
      <Link href={prof(p.handle, p.near_account)} onClick={(e) => e.stopPropagation()} className="shrink-0"><Avatar id={p.near_account} handle={p.handle} size={38} /></Link>
      <div className="min-w-0 flex-1">
        {p.reply_to_handle && !compact && <p className="mb-0.5 text-[12px] text-mute">Replying to <Link href={prof(p.reply_to_handle)} onClick={(e) => e.stopPropagation()} className="text-lime">@{p.reply_to_handle}</Link></p>}
        <div className="flex min-w-0 items-center gap-1 text-[13.5px] leading-tight">
          <Link href={prof(p.handle, p.near_account)} onClick={(e) => e.stopPropagation()} className="truncate font-semibold hover:underline">{person?.name ?? (p.display_name || p.handle)}</Link>
          <span className="truncate text-[12.5px] text-mute">@{p.handle}</span>
          <span className="shrink-0 text-[12.5px] text-faint">· {now ? ago(new Date(p.created_at).getTime(), now) : ''}</span>
          {person && <TestnetChip className="ml-auto" />}
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[14.5px] leading-[1.42]"><RichText text={p.body} /></p>
        {img && <img src={img} alt="" loading="lazy" className="mt-2 max-h-[420px] w-full rounded-[14px] border border-line object-cover" />}
        {p.raid_id !== null && p.raid_id !== undefined && !p.reply_to && <div onClick={(e) => e.stopPropagation()}><RaidEmbed id={p.raid_id} className="mt-2" /></div>}
        {p.quoted && (
          <Link href={`/post/${p.quoted.id}`} onClick={(e) => e.stopPropagation()} className="mt-2 block rounded-[14px] border border-line p-2.5">
            <span className="flex items-center gap-1.5 text-[12.5px]"><Avatar id={p.quoted.near_account} handle={p.quoted.handle} size={18} /><b className="font-semibold">{personByHandle(p.quoted.handle)?.name ?? p.quoted.display_name}</b><span className="text-mute">@{p.quoted.handle}</span></span>
            <span className="mt-1 line-clamp-3 block text-[13.5px]"><RichText text={p.quoted.body} /></span>
            {p.quoted.media_url && <img src={mediaSrc(p.quoted.media_url)!} alt="" className="mt-1.5 max-h-48 w-full rounded-[10px] object-cover" />}
          </Link>
        )}
        <div className="relative mt-1.5 flex items-center justify-between pr-2">
          <Act label="Reply" n={p.replies} onClick={() => (onReply ? onReply() : openComposer({ replyTo: p }))}><MessageCircle size={16} /></Act>
          <Act label="Repost" on={rc} n={recasts} tone="text-up" onClick={() => setMenu((m) => !m)}><Repeat2 size={17} /></Act>
          <Act label={liked ? 'Unlike' : 'Like'} on={liked} n={likes} tone="text-down" onClick={() => void react('like', !liked, setLiked, (d) => setLikes((n) => n + d))}>
            <motion.span key={String(liked)} initial={{ scale: liked ? 0.4 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 14 }}><Heart size={16} fill={liked ? 'currentColor' : 'none'} /></motion.span>
          </Act>
          <Act label={bm ? 'Remove bookmark' : 'Bookmark'} on={bm} tone="text-ink" onClick={() => void react('bookmark', !bm, setBm)}><Bookmark size={16} fill={bm ? 'currentColor' : 'none'} /></Act>
          <Act label="Share" onClick={() => void share()}><Share size={16} /></Act>
          <AnimatePresence>{menu && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onClick={(e) => e.stopPropagation()} className="panel absolute left-10 top-8 z-20 w-40 overflow-hidden rounded-[14px] p-1 text-[13px]">
              <button className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 hover:bg-raised" onClick={() => { setMenu(false); void react('recast', !rc, setRc, (d) => setRecasts((n) => n + d)).then(() => qc.invalidateQueries({ queryKey: ['feed2'] })); }}><Repeat2 size={15} />{rc ? 'Undo repost' : 'Repost'}</button>
              <button className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 hover:bg-raised" onClick={() => { setMenu(false); openComposer({ quote: p }); }}><Quote size={15} />Quote</button>
            </motion.div>
          )}</AnimatePresence>
        </div>
      </div>
    </motion.article>
  );
}
