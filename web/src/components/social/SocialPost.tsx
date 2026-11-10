'use client';
/* eslint-disable @next/next/no-img-element -- user media */
import type { Market, SocialPost as P } from '@called/sdk';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BadgeCheck, Bookmark, Hash, Quote } from 'lucide-react';
import { ago } from '@/lib/format';
import { haptic } from '@/lib/fx';
import { useSession } from '@/lib/session';
import { useSocialApi } from '@/lib/social';
import { IconHeart, IconReply, IconRepost, IconShare } from '../icons';
import { MarketCard } from '../MarketCard';
import { RichText } from '../RichText';
import { Avatar } from '../ui';
import { MediaViewer } from './MediaViewer';

export const fmtN = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n));

function marketOf(p: P): Market | null {
  if (!p.market_id) return null;
  return { id: p.market_id, venue: p.venue ?? 'called', external_id: '', question: p.question ?? '', price_yes: p.price_yes ?? 0.5, volume: p.market_volume ?? '0',
    status: p.status ?? 'open', outcome: null, close_ts: p.close_ts, created_at: p.created_at, image_url: p.market_image ?? null, category: p.market_category ?? null } as Market;
}

type Quoted = { id: string; body: string; created_at: string; handle: string; display_name: string; avatar_url: string | null; media_url?: string | null };

export function QuoteBox({ q }: { q: Quoted }) {
  return (
    <Link href={`/posts/${q.id}`} onClick={(e) => e.stopPropagation()} className="mt-2 block border border-line p-3 hover:bg-ink/[.03]">
      <div className="flex items-center gap-1.5 text-[14px]"><Avatar handle={q.handle} url={q.avatar_url} size={20} /><b className="truncate">{q.display_name}</b><span className="truncate text-mute">@{q.handle} · {ago(q.created_at)}</span></div>
      <p className="mt-1 line-clamp-4 text-[14px] leading-snug whitespace-pre-wrap break-words">{q.body}</p>
      {q.media_url && <img src={q.media_url} alt="" className="mt-2 max-h-40 w-full object-cover" loading="lazy" />}
    </Link>
  );
}

/** Live action bar: reply, recast/quote, like, bookmark, share. Optimistic, server-backed. */
export function SocialActions({ p, onReply, onQuote, big }: { p: P; onReply?: () => void; onQuote?: () => void; big?: boolean }) {
  const { me } = useSession(); const s = useSocialApi(); const router = useRouter();
  const [st, setSt] = useState({ liked: p.liked, likes: p.likes, recasted: p.recasted, recasts: p.recasts, bookmarked: p.bookmarked });
  const [menu, setMenu] = useState(false);
  const m = useMutation({
    mutationFn: ({ kind, on }: { kind: 'like' | 'recast' | 'bookmark'; on: boolean }) => s.react(String(p.id), kind, on),
    onError: (_e, v) => setSt((x) => v.kind === 'like' ? { ...x, liked: !v.on, likes: x.likes + (v.on ? -1 : 1) } : v.kind === 'recast' ? { ...x, recasted: !v.on, recasts: x.recasts + (v.on ? -1 : 1) } : { ...x, bookmarked: !v.on }),
  });
  const gate = (f: () => void) => () => { if (!me) { router.push('/signin'); return; } haptic('tap'); f(); };
  const like = gate(() => { const on = !st.liked; setSt((x) => ({ ...x, liked: on, likes: x.likes + (on ? 1 : -1) })); m.mutate({ kind: 'like', on }); });
  const recast = () => { const on = !st.recasted; setSt((x) => ({ ...x, recasted: on, recasts: x.recasts + (on ? 1 : -1) })); m.mutate({ kind: 'recast', on }); setMenu(false); };
  const mark = gate(() => { const on = !st.bookmarked; setSt((x) => ({ ...x, bookmarked: on })); m.mutate({ kind: 'bookmark', on }); });
  const share = () => { const url = `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/posts/${p.id}`; if (navigator.share) void navigator.share({ url }).catch(() => undefined); else void navigator.clipboard?.writeText(url); };
  const sz = big ? 21 : 18;
  const btn = 'group relative flex items-center gap-1 text-mute text-[13px] tabular-nums min-w-[44px]';
  const ring = 'grid place-items-center h-8 w-8 -ml-2 rounded-full transition-colors';
  return (
    <div className={`relative flex items-center justify-between ${big ? 'py-1.5' : 'mt-2 -mb-1 max-w-[360px]'}`} onClick={(e) => e.stopPropagation()}>
      <button aria-label="Reply" className={btn} onClick={gate(() => onReply ? onReply() : router.push(`/posts/${p.id}#reply`))}><span className={`${ring} group-hover:bg-grape/15 group-hover:text-grape`}><IconReply size={sz} /></span>{!big && p.replies ? fmtN(p.replies) : ''}</button>
      <button aria-label="Recast or quote" aria-expanded={menu} className={btn} style={st.recasted ? { color: 'var(--color-mint)' } : undefined} onClick={gate(() => setMenu((v) => !v))}><span className={`${ring} group-hover:bg-mint/15`}><IconRepost size={sz} /></span>{!big && st.recasts ? fmtN(st.recasts) : ''}</button>
      <motion.button whileTap={{ scale: 0.85 }} aria-label="Like" aria-pressed={st.liked} className={btn} style={st.liked ? { color: '#f91880' } : undefined} onClick={like}>
        <motion.span key={String(st.liked)} initial={st.liked ? { scale: 0.4 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 700, damping: 14 }} className={`${ring} group-hover:bg-[#f91880]/15`}><IconHeart size={sz} filled={st.liked} /></motion.span>{!big && st.likes ? fmtN(st.likes) : ''}
      </motion.button>
      <button aria-label="Bookmark" aria-pressed={st.bookmarked} className={btn} style={st.bookmarked ? { color: 'var(--color-grape)' } : undefined} onClick={mark}><span className={`${ring} group-hover:bg-grape/15`}><Bookmark size={sz - 1} fill={st.bookmarked ? 'currentColor' : 'none'} /></span></button>
      <button aria-label="Share" className={btn} onClick={share}><span className={`${ring} group-hover:bg-grape/15`}><IconShare size={sz} /></span></button>
      {menu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="cuts absolute left-10 top-9 z-40 w-44 overflow-hidden border border-line bg-panel shadow-xl">
            <button onClick={recast} className="flex w-full items-center gap-3 px-4 h-12 text-[15px] font-bold hover:bg-ink/[.05]"><IconRepost size={18} />{st.recasted ? 'Undo recast' : 'Recast'}</button>
            <button onClick={() => { setMenu(false); if (onQuote) onQuote(); else router.push(`/posts/${p.id}?quote=1`); }} className="flex w-full items-center gap-3 px-4 h-12 text-[15px] font-bold hover:bg-ink/[.05]"><Quote size={18} />Quote</button>
          </motion.div>
        </>
      )}
      {big && <span className="sr-only">{st.likes} likes</span>}
    </div>
  );
}

/** Feed/thread post row. `line` draws the thread connector down from the avatar. */
export function SocialPostRow({ p, line, index = 0, onMedia }: { p: P; line?: boolean; index?: number; onMedia?: (src: string, p: P) => void }) {
  const router = useRouter();
  const [view, setView] = useState<string | null>(null);
  const market = marketOf(p);
  const q = (p as unknown as { quoted?: Quoted | null }).quoted;
  const replyTo = (p as unknown as { reply_to_handle?: string | null }).reply_to_handle;
  const openMedia = (src: string) => (onMedia ? onMedia(src, p) : setView(src));
  return (
    <motion.article initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, delay: Math.min(index, 6) * 0.03 }}
      onClick={() => router.push(`/posts/${p.id}`)} className={`cursor-pointer px-4 pt-3 ${line ? 'pb-0' : 'pb-3 border-b border-line'} hover:bg-ink/[.02] transition-colors`}>
      {p.recast_by && <div className="mb-1 ml-7 flex items-center gap-1.5 text-[13px] font-bold text-mute"><IconRepost size={14} />{p.recast_by} recast</div>}
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <Link href={`/u/${p.handle}`} onClick={(e) => e.stopPropagation()} className="shrink-0"><Avatar handle={p.handle} url={p.avatar_url} size={40} /></Link>
          {line && <span className="mt-1 w-[2px] flex-1 bg-line" aria-hidden />}
        </div>
        <div className={`min-w-0 flex-1 ${line ? 'pb-3' : ''}`}>
          <div className="flex items-center gap-1 text-[15px] leading-5">
            <Link href={`/u/${p.handle}`} onClick={(e) => e.stopPropagation()} className="truncate font-bold hover:underline">{p.display_name}</Link>
            {(p.author_verified || (p as unknown as { verified?: boolean }).verified) && <BadgeCheck size={15} className="shrink-0 text-grape" />}
            <span className="truncate text-mute">@{p.handle}</span><span className="shrink-0 text-mute">· {ago(p.created_at)}</span>
          </div>
          {replyTo && <div className="text-[13px] text-mute">Replying to <Link href={`/u/${replyTo}`} onClick={(e) => e.stopPropagation()} className="text-grape">@{replyTo}</Link></div>}
          {p.channel && <Link href={`/channels/${p.channel}`} onClick={(e) => e.stopPropagation()} className="mn mt-0.5 inline-flex items-center gap-0.5 text-[11px] uppercase text-grape"><Hash size={11} />{p.channel}</Link>}
          <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-[1.4]"><RichText text={p.body} /></p>
          {p.media_url && (
            <button onClick={(e) => { e.stopPropagation(); openMedia(p.media_url!); }} className="mt-2 block w-full overflow-hidden border border-line" aria-label="Open media">
              <img src={p.media_url} alt="" className="max-h-[420px] w-full object-cover" loading="lazy" />
            </button>
          )}
          {q && <QuoteBox q={q} />}
          {market && <div onClick={(e) => e.stopPropagation()}><MarketCard m={market} embedded by={{ handle: p.handle, display_name: p.display_name, avatar_url: p.avatar_url }} /></div>}
          <SocialActions p={p} />
        </div>
      </div>
      {!onMedia && <MediaViewer src={view} onClose={() => setView(null)} caption={<><b>{p.display_name}</b> <span className="text-white/60">@{p.handle}</span><div className="mt-1 line-clamp-3">{p.body}</div></>} />}
    </motion.article>
  );
}
