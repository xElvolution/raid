'use client';
/* eslint-disable @next/next/no-img-element -- user media */
import type { Market } from '@called/sdk';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { BadgeCheck, Hash } from 'lucide-react';
import { MarketCard } from '@/components/MarketCard';
import { RichText } from '@/components/RichText';
import { Shell } from '@/components/Shell';
import { MediaViewer } from '@/components/social/MediaViewer';
import { InlineComposer } from '@/components/social/Reply';
import { QuoteBox, SocialActions, SocialPostRow, fmtN } from '@/components/social/SocialPost';
import { Avatar, Button, Empty } from '@/components/ui';
import { useSocialApi } from '@/lib/social';

function Thread() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams(); const router = useRouter();
  const s = useSocialApi();
  const q = useQuery({ queryKey: ['thread', id], queryFn: () => s.thread(id) });
  const [quoting, setQuoting] = useState(sp.get('quote') === '1');
  const [view, setView] = useState<string | null>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (q.data) { if (q.data.ancestors.length) mainRef.current?.scrollIntoView({ block: 'start' }); if (location.hash === '#reply') replyRef.current?.focus(); } }, [q.data]);

  if (q.isLoading) return <div className="space-y-3 p-4">{[0, 1, 2].map((i) => <div key={i} className="flex gap-3"><span className="h-10 w-10 rounded-full shimmer" /><div className="flex-1 space-y-2 pt-1"><div className="h-3.5 w-1/3 shimmer" /><div className="h-3.5 w-full shimmer" /></div></div>)}</div>;
  if (q.isError || !q.data) return <Empty title="Post not found" body="It may have been deleted." action={<Button tone="white" onClick={() => router.push('/social')}>Back to feed</Button>} />;
  const { post: p, ancestors, replies } = q.data;
  const qd = (p as unknown as { quoted?: Parameters<typeof QuoteBox>[0]['q'] | null }).quoted;
  const verified = p.author_verified || (p as unknown as { verified?: boolean }).verified;
  const market = p.market_id ? ({ id: p.market_id, venue: p.venue ?? 'called', external_id: '', question: p.question ?? '', price_yes: p.price_yes ?? 0.5, volume: p.market_volume ?? '0', status: p.status ?? 'open', outcome: null, close_ts: p.close_ts, created_at: p.created_at, image_url: p.market_image ?? null, category: p.market_category ?? null } as Market) : null;
  const when = new Date(p.created_at);
  return (
    <>
      {ancestors.map((a, i) => <SocialPostRow key={a.id} p={a} line index={i} />)}
      <motion.div ref={mainRef} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="scroll-mt-[58px] border-b border-line px-4 pt-3">
        <div className="flex items-center gap-3">
          <Link href={`/u/${p.handle}`}><Avatar handle={p.handle} url={p.avatar_url} size={44} /></Link>
          <div className="min-w-0 flex-1 leading-tight">
            <Link href={`/u/${p.handle}`} className="flex items-center gap-1 text-[16px] font-extrabold hover:underline"><span className="truncate">{p.display_name}</span>{verified && <BadgeCheck size={16} className="text-grape" />}</Link>
            <div className="text-[14px] text-mute">@{p.handle}</div>
          </div>
          {p.channel && <Link href={`/channels/${p.channel}`} className="bug bg-grape text-white"><Hash size={11} />{p.channel}</Link>}
        </div>
        <p className="mt-3 whitespace-pre-wrap break-words text-[18px] leading-[1.45]"><RichText text={p.body} /></p>
        {p.media_url && <button onClick={() => setView(p.media_url!)} aria-label="Open media" className="mt-3 block w-full overflow-hidden border border-line"><img src={p.media_url} alt="" className="max-h-[520px] w-full object-cover" /></button>}
        {qd && <QuoteBox q={qd} />}
        {market && <MarketCard m={market} embedded by={{ handle: p.handle, display_name: p.display_name, avatar_url: p.avatar_url }} />}
        <div className="mn mt-3 text-[12px] uppercase text-mute">{when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {when.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}</div>
        <div className="mt-3 grid grid-cols-4 border-y border-line">
          {[['Replies', p.replies], ['Recasts', p.recasts], ['Quotes', p.quotes ?? 0], ['Likes', p.likes]].map(([l, n]) => (
            <div key={l as string} className="py-2.5 text-center"><div className="cd text-[24px] leading-none">{fmtN(n as number)}</div><div className="mn mt-1 text-[10px] uppercase tracking-[.1em] text-mute">{l}</div></div>
          ))}
        </div>
        <SocialActions big p={p} onReply={() => replyRef.current?.focus()} onQuote={() => setQuoting(true)} />
      </motion.div>
      {quoting && (
        <div className="border-b-2 border-grape">
          <div className="flex items-center justify-between px-4 pt-3"><span className="bug bg-grape text-white">Quote</span><button className="text-[13px] font-bold text-mute" onClick={() => setQuoting(false)}>Cancel</button></div>
          <InlineComposer placeholder="Add your take" cta="Quote" quoteOf={String(p.id)} onDone={() => { setQuoting(false); void q.refetch(); }}>
            <QuoteBox q={{ id: String(p.id), body: p.body, created_at: p.created_at, handle: p.handle, display_name: p.display_name, avatar_url: p.avatar_url, media_url: p.media_url }} />
          </InlineComposer>
        </div>
      )}
      <div id="reply"><InlineComposer ref={replyRef} placeholder={`Reply to @${p.handle}`} cta="Reply" replyTo={String(p.id)} onDone={() => void q.refetch()} /></div>
      {replies.length === 0
        ? <p className="px-4 py-10 text-center text-[14px] text-mute">No replies yet. Start the conversation.</p>
        : replies.map((r, i) => <SocialPostRow key={r.id} p={r} index={i} />)}
      <MediaViewer src={view} onClose={() => setView(null)} caption={<><b>{p.display_name}</b> <span className="text-white/60">@{p.handle}</span><div className="mt-1 line-clamp-3">{p.body}</div></>} />
    </>
  );
}

export default function PostPage() {
  return <Shell title="Post" back flush><Suspense><Thread /></Suspense></Shell>;
}
