'use client';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BadgeCheck, ChevronLeft, Info, SendHorizontal } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { Avatar, Empty, LinkButton } from '@/components/ui';
import { haptic } from '@/lib/fx';
import { useLive } from '@/lib/live-hooks';
import { useSession } from '@/lib/session';
import { useSocialApi, type DmMessage } from '@/lib/social';

const day = (d: string) => new Date(d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
const time = (d: string) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function Conversation() {
  const { handle } = useParams<{ handle: string }>();
  const { me } = useSession(); const s = useSocialApi(); const qc = useQueryClient(); const router = useRouter();
  const key = ['dm', handle];
  const q = useInfiniteQuery({ queryKey: key, queryFn: ({ pageParam }) => s.dm(handle, pageParam), initialPageParam: undefined as string | undefined, getNextPageParam: (p) => p.next ?? undefined, enabled: !!me, refetchInterval: 8_000 });
  const peer = q.data?.pages[0]?.with;
  const [pending, setPending] = useState<DmMessage[]>([]);
  const msgs = [...(q.data?.pages.flatMap((p) => p.items) ?? [])].reverse().concat(pending);
  const [body, setBody] = useState('');
  const end = useRef<HTMLDivElement>(null); const ta = useRef<HTMLTextAreaElement>(null);
  useLive(me ? (`dm:${me.id}` as never) : null, () => void qc.invalidateQueries({ queryKey: key }));
  useLayoutEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);
  useEffect(() => { void qc.invalidateQueries({ queryKey: ['dms'] }); }, [q.dataUpdatedAt, qc]);
  const send = useMutation({
    mutationFn: (text: string) => s.sendDm(handle, text),
    onMutate: (text) => { const tmp: DmMessage = { id: `tmp${Date.now()}`, body: text, created_at: new Date().toISOString(), read_at: null, mine: true, market_id: null, question: null, price_yes: null }; setPending((p) => [...p, tmp]); return tmp.id; },
    onSuccess: async () => { haptic('tap'); await q.refetch(); setPending([]); },
    onError: (_e, _v, id) => setPending((p) => p.map((m) => (m.id === id ? { ...m, read_at: 'failed' } : m))),
  });
  const submit = () => { const t = body.trim(); if (!t || t.length > 2000) return; setBody(''); send.mutate(t); ta.current?.focus(); };

  if (!me) return <Shell title="Messages" back="/messages"><Empty title="Sign in to chat" action={<LinkButton href="/signin">Sign in</LinkButton>} /></Shell>;
  if (me.handle === handle) return <Shell title="Messages" back="/messages"><Empty title="That’s you" body="Pick someone else to message." action={<LinkButton href="/messages">Inbox</LinkButton>} /></Shell>;
  const header = (
    <div className="flex min-w-0 items-center gap-2">
      <button onClick={() => router.push('/messages')} aria-label="Back" className="press -ml-1.5 grid h-9 w-9 place-items-center"><ChevronLeft size={26} strokeWidth={2.2} /></button>
      <Link href={`/u/${handle}`} className="flex min-w-0 items-center gap-2.5"><Avatar handle={handle} url={peer?.avatar_url} size={32} />
        <div className="min-w-0 leading-tight"><div className="flex items-center gap-1 truncate text-[16px] font-extrabold">{peer?.display_name ?? handle}{peer?.verified && <BadgeCheck size={15} className="text-grape" />}</div><div className="text-[12px] text-mute">@{handle}</div></div></Link>
    </div>
  );
  return (
    <Shell title={header} flush hideTabs actions={<Link href={`/u/${handle}`} aria-label="Profile" className="press"><Info size={21} /></Link>}>
      <div className="flex min-h-[calc(100dvh-58px)] flex-col">
        <div className="flex-1 px-3 pb-3">
          {q.hasNextPage && <button onClick={() => void q.fetchNextPage()} className="mx-auto my-3 block text-[13px] font-bold text-grape">{q.isFetchingNextPage ? 'Loading…' : 'Load earlier'}</button>}
          {!q.isLoading && msgs.length === 0 && (
            <div className="flex flex-col items-center px-6 py-12 text-center"><Avatar handle={handle} url={peer?.avatar_url} size={72} /><b className="mt-3 text-[18px]">{peer?.display_name ?? handle}</b><span className="text-mute">@{handle}</span>
              <p className="mt-3 max-w-[280px] text-[14px] text-mute">Start the conversation. Share a call, talk odds, or settle a debate.</p></div>
          )}
          <AnimatePresence initial={false}>
            {msgs.map((m, i) => {
              const d = day(m.created_at); const prev = msgs[i - 1]; const sep = !prev || day(prev.created_at) !== d;
              const next = msgs[i + 1]; const tail = !next || next.mine !== m.mine || day(next.created_at) !== d;
              return (
                <div key={m.id}>
                  {sep && <div className="my-4 flex justify-center"><span className="mn bg-snow px-2 py-1 text-[10px] uppercase tracking-[.12em] text-mute">{d}</span></div>}
                  <motion.div layout initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex ${m.mine ? 'justify-end' : 'justify-start'} ${tail ? 'mb-2.5' : 'mb-1'}`}>
                    <div className={`max-w-[78%] ${m.mine ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`whitespace-pre-wrap break-words px-3.5 py-2 text-[15px] leading-snug ${m.mine ? 'bg-grape text-white' : 'bg-snow text-ink'}`}
                        style={tail ? { clipPath: m.mine ? 'polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)' : 'polygon(0 0,100% 0,100% 100%,10px 100%,0 calc(100% - 10px))' } : undefined}>
                        {m.body}
                        {m.market_id && <Link href={`/markets/${m.market_id}`} className="mt-2 block border border-current/30 p-2 text-[13px]"><span className="line-clamp-2 font-semibold">{m.question}</span><span className="cd text-[20px]">{Math.round(Number(m.price_yes ?? 0.5) * 100)}% YES</span></Link>}
                      </div>
                      {tail && <span className="mn mt-1 text-[10px] uppercase text-mute">{m.read_at === 'failed' ? <span className="text-coral">Not sent</span> : <>{time(m.created_at)}{m.mine && i === msgs.length - 1 && (m.id.startsWith('tmp') ? ' · Sending' : m.read_at ? ' · Seen' : ' · Sent')}</>}</span>}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>
          <div ref={end} />
        </div>
        <div className="sticky bottom-0 border-t border-line bg-bg/95 px-3 py-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] backdrop-blur-xl">
          <div className="flex items-end gap-2">
            <textarea ref={ta} value={body} onChange={(e) => setBody(e.target.value)} rows={1} maxLength={2000} placeholder="Start a message"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              className="max-h-32 min-h-11 flex-1 resize-none border border-line bg-snow px-3 py-2.5 text-[15px] outline-none placeholder:text-mute focus:border-grape" style={{ fieldSizing: 'content' } as React.CSSProperties} />
            <motion.button whileTap={{ scale: 0.9 }} aria-label="Send" disabled={!body.trim()} onClick={submit} className="cuts grid h-11 w-12 place-items-center bg-grape text-white disabled:opacity-40"><SendHorizontal size={20} /></motion.button>
          </div>
        </div>
      </div>
    </Shell>
  );
}
