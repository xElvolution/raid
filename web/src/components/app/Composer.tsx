'use client';
/** Full composer sheet: text, image, $TICKER chips, @mentions, an optional raid, or a 24 h story. Opened from the + button, replies and quotes. */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { Crosshair, ImagePlus, Sparkles, X } from 'lucide-react';
import { posts, type FeedPost } from '@/lib/social';
import { coinBySymbol } from '@/lib/coins';
import { toast } from '@/lib/bus';
import { useRaids } from '@/lib/hooks';
import { target, xLabel } from '@/lib/raid';
import { useSocialAuth } from '../Social';
import { Avatar } from './Avatar';
import { RichText } from './Post';

type Opts = { replyTo?: FeedPost; quote?: FeedPost; raidId?: number; story?: boolean; text?: string };
const subs = new Set<(o: Opts) => void>();
export const openComposer = (o: Opts = {}) => subs.forEach((f) => f(o));

export const STORY_BG = ['linear-gradient(160deg,#ff5a1f,#ff9a3c)', 'linear-gradient(160deg,#15161a,#3a3b42)', 'linear-gradient(160deg,#0d8f50,#6ee7a8)', 'linear-gradient(160deg,#5b3df5,#b18cff)', 'linear-gradient(160deg,#e0353f,#ff8a8f)', 'linear-gradient(160deg,#0a6cff,#7cc3ff)'];

async function shrink(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const k = Math.min(1, 1440 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.86);
}

export function ComposerSheet() {
  const [o, setO] = useState<Opts | null>(null);
  const [text, setText] = useState('');
  const [img, setImg] = useState<string | null>(null);
  const [raid, setRaid] = useState<number | undefined>();
  const [story, setStory] = useState(false);
  const [bg, setBg] = useState(0);
  const [busy, setBusy] = useState(false);
  const [pickRaid, setPickRaid] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const { acct, sess, ensure, busy: signing } = useSocialAuth();
  const raids = useRaids();
  const qc = useQueryClient();
  useEffect(() => { const f = (x: Opts) => { setO(x); setRaid(x.raidId); setStory(!!x.story); setText(x.text ?? ''); setImg(null); }; subs.add(f); return () => { subs.delete(f); }; }, []);
  const close = () => setO(null);
  const tickers = [...new Set([...text.matchAll(/\$([A-Za-z][A-Za-z0-9]{1,11})\b/g)].map((m) => m[1]!.toUpperCase()))].filter((t) => coinBySymbol(t));
  async function submit() {
    if (!(await ensure())) return;
    if (!text.trim() && !img) return;
    setBusy(true);
    try {
      const mediaUrl = img ? (await posts.upload(img)).url : undefined;
      if (story) await posts.story({ body: text.trim(), mediaUrl, coin: tickers[0], bg });
      else await posts.create({ body: text.trim() || ' ', mediaUrl, raidId: raid, coin: tickers[0], replyTo: o?.replyTo ? String(o.replyTo.id) : undefined, quoteOf: o?.quote ? String(o.quote.id) : undefined });
      toast({ title: story ? 'Story is live for 24 hours' : o?.replyTo ? 'Reply posted' : 'Posted', tone: 'lime' });
      void qc.invalidateQueries({ queryKey: ['feed2'] }); void qc.invalidateQueries({ queryKey: ['post'] }); void qc.invalidateQueries({ queryKey: ['stories'] });
      close();
    } catch (e) { toast({ title: 'Didn’t post', body: (e as Error).message, tone: 'down' }); }
    finally { setBusy(false); }
  }
  const open = (raids.data ?? []).filter((r) => r.status !== 'Closed').reverse();
  return (
    <AnimatePresence>
      {o && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 md:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div role="dialog" aria-label="New post" onClick={(e) => e.stopPropagation()} initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ type: 'spring', stiffness: 420, damping: 36 }}
            className="flex max-h-[92dvh] w-full max-w-[560px] flex-col glass-strong rounded-t-[26px] pb-[env(safe-area-inset-bottom)] md:rounded-[22px]">
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <button onClick={close} aria-label="Close" className="press grid h-9 w-9 place-items-center rounded-full hover:bg-raised"><X size={18} /></button>
              {!o.replyTo && !o.quote && (
                <div className="mx-auto flex rounded-full bg-raised p-0.5 text-[12.5px] font-semibold">
                  <button onClick={() => setStory(false)} className={`rounded-full px-3 py-1 ${!story ? 'bg-bg shadow-sm' : 'text-mute'}`}>Post</button>
                  <button onClick={() => setStory(true)} className={`rounded-full px-3 py-1 ${story ? 'bg-bg shadow-sm' : 'text-mute'}`}>Story · 24h</button>
                </div>
              )}
              <button disabled={busy || signing || (!!sess && !text.trim() && !img)} onClick={() => void submit()} className="press ml-auto h-9 rounded-full btn-signal px-4 text-[13.5px] font-semibold disabled:opacity-50">
                {!acct ? 'Sign in' : !sess ? (signing ? 'Check wallet…' : 'Sign in to post') : busy ? 'Posting…' : o.replyTo ? 'Reply' : story ? 'Share story' : 'Post'}
              </button>
            </div>
            <div className="overflow-y-auto px-3 py-3">
              {o.replyTo && <p className="mb-2 text-[12.5px] text-mute">Replying to <b className="text-lime">@{o.replyTo.handle}</b>: <span className="line-clamp-1">{o.replyTo.body}</span></p>}
              {story ? (
                <div className="relative mx-auto aspect-[9/16] w-[62%] overflow-hidden rounded-[18px] text-white" style={{ background: img ? '#000' : STORY_BG[bg] }}>
                  {img && <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                  <textarea autoFocus value={text} onChange={(e) => setText(e.target.value.slice(0, 280))} placeholder="Say something…" className="absolute inset-x-3 bottom-4 resize-none bg-transparent text-center text-[17px] font-semibold leading-snug text-white outline-none placeholder:text-white/60 [text-shadow:0_1px_8px_rgb(0_0_0/.4)]" rows={3} />
                </div>
              ) : (
                <div className="flex gap-2.5">
                  <Avatar id={sess?.account ?? acct ?? 'guest'} size={36} />
                  <div className="min-w-0 flex-1">
                    <textarea autoFocus value={text} onChange={(e) => setText(e.target.value.slice(0, 1000))} rows={4} placeholder={o.replyTo ? 'Post your reply' : o.quote ? 'Add a comment' : 'What’s happening? Tag a coin with $PEPE'}
                      className="w-full resize-none bg-transparent pt-1.5 text-[15px] leading-snug outline-none placeholder:text-faint" />
                    {tickers.length > 0 && <p className="mt-1 text-[13px]"><RichText text={tickers.map((t) => `$${t}`).join(' ')} /></p>}
                    {img && <div className="relative mt-2"><img src={img} alt="" className="max-h-72 w-full rounded-[14px] object-cover" /><button onClick={() => setImg(null)} aria-label="Remove image" className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"><X size={14} /></button></div>}
                    {o.quote && <div className="mt-2 rounded-[14px] border border-line p-2.5 text-[13px]"><b>@{o.quote.handle}</b> <span className="text-mute">{o.quote.body.slice(0, 160)}</span></div>}
                    {raid !== undefined && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-1 text-[12.5px] font-medium"><Crosshair size={13} />Raid #{raid}<button onClick={() => setRaid(undefined)} aria-label="Remove raid"><X size={12} /></button></p>}
                  </div>
                </div>
              )}
              {pickRaid && (
                <div className="mt-3 grid gap-1">
                  {open.map((r) => <button key={r.id} onClick={() => { setRaid(r.id); setPickRaid(false); }} className="flex items-center justify-between rounded-[12px] px-3 py-2 text-left text-[13px] hover:bg-raised"><span>${target(r).symbol} to {xLabel(r.target_x_bps)} <span className="text-mute">#{r.id}</span></span><span className="text-mute">{r.title.slice(0, 30)}</span></button>)}
                  {!open.length && <p className="px-3 py-2 text-[13px] text-mute">No open raids. Call one with the orange button.</p>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 border-t border-line px-2 py-1.5 text-lime">
              <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImg(await shrink(f)); e.target.value = ''; }} />
              <button onClick={() => file.current?.click()} aria-label="Add image" className="press grid h-9 w-9 place-items-center rounded-full hover:bg-raised"><ImagePlus size={19} /></button>
              {!story && <button onClick={() => setPickRaid((x) => !x)} aria-label="Attach a raid" className="press grid h-9 w-9 place-items-center rounded-full hover:bg-raised"><Crosshair size={19} /></button>}
              {story && !img && STORY_BG.map((b, i) => <button key={i} onClick={() => setBg(i)} aria-label={`Background ${i + 1}`} className={`h-6 w-6 rounded-full ${bg === i ? 'ring-2 ring-ink ring-offset-2 ring-offset-bg' : ''}`} style={{ background: b }} />)}
              <span className="ml-auto flex items-center gap-1 px-2 text-[11.5px] text-faint"><Sparkles size={12} />$TICKER shows a live price</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
