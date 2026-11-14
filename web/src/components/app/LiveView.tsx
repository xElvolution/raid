'use client';
/** Live stream viewer (full screen) and the shared live overlays: chat, hearts, viewer count, pinned coin. */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, Heart, Loader2, Send, Volume2, VolumeX } from 'lucide-react';
import { Avatar } from './Avatar';
import { CoinCard } from './CoinCard';
import { liveChat, liveEvents, liveHeart, watch, type LiveMsg, type LiveStream } from '@/lib/livecam';
import { useSession } from '@/lib/social';
import { signInSheet, toast } from '@/lib/bus';

export function useLiveEvents(id: string | null, viewer?: string) {
  const [msgs, setMsgs] = useState<LiveMsg[]>([]);
  const [info, setInfo] = useState<LiveStream | null>(null);
  const [ended, setEnded] = useState(false);
  useEffect(() => {
    if (!id) return; let after = 0, stop = false;
    const tick = async () => {
      try { const r = await liveEvents(id, after, viewer); setInfo(r); if (r.msgs.length) { after = r.msgs[r.msgs.length - 1]!.id; setMsgs((m) => [...m, ...r.msgs].slice(-40)); } }
      catch (e) { if ((e as Error).message === 'not_live') setEnded(true); }
      if (!stop) setTimeout(tick, 1500);
    };
    void tick(); return () => { stop = true; };
  }, [id, viewer]);
  return { msgs, info, ended };
}

export function Hearts({ n }: { n: number }) {
  const [list, setList] = useState<number[]>([]);
  const prev = useRef(n);
  useEffect(() => { if (n > prev.current) { const add = Math.min(5, n - prev.current); const t = setTimeout(() => setList((l) => [...l, ...Array.from({ length: add }, () => Date.now() + Math.random())].slice(-20)), 0); prev.current = n; return () => clearTimeout(t); } prev.current = n; }, [n]);
  return (
    <div className="pointer-events-none absolute bottom-40 right-3 h-64 w-14">
      <AnimatePresence>{list.map((k) => (
        <motion.span key={k} className="absolute bottom-0 left-1/2" initial={{ y: 0, x: '-50%', opacity: 1, scale: 0.6 }} animate={{ y: -230, x: `${-50 + (k % 7) * 12 - 36}%`, opacity: 0, scale: 1.2 }} transition={{ duration: 2.2, ease: 'easeOut' }} onAnimationComplete={() => setList((l) => l.filter((x) => x !== k))}>
          <Heart size={26} className="fill-[#ff3b5c] text-[#ff3b5c]" />
        </motion.span>
      ))}</AnimatePresence>
    </div>
  );
}

export function ChatOverlay({ id, msgs }: { id: string; msgs: LiveMsg[] }) {
  const sess = useSession();
  const [text, setText] = useState('');
  const send = async () => { const b = text.trim(); if (!b) return; setText(''); try { await liveChat(id, b); } catch (e) { toast({ title: 'Message not sent', body: (e as Error).message, tone: 'down' }); } };
  return (
    <div className="w-full">
      <ul className="mb-2 flex max-h-44 flex-col justify-end gap-1 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_30%)]">
        {msgs.slice(-7).map((m) => <li key={m.id} className="w-fit max-w-[85%] rounded-[14px] bg-black/35 px-2.5 py-1 text-[13px] leading-snug backdrop-blur"><b className="font-semibold text-white/80">@{m.handle}</b> {m.body}</li>)}
      </ul>
      {sess ? (
        <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="glass-dark flex h-11 items-center gap-2 rounded-full pl-4 pr-1.5">
          <input value={text} onChange={(e) => setText(e.target.value.slice(0, 200))} placeholder="Say something…" aria-label="Chat" className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/50" />
          <button aria-label="Send" className="grid h-8 w-8 place-items-center rounded-full bg-white/15"><Send size={15} /></button>
        </form>
      ) : <button onClick={() => signInSheet.emit()} className="glass-dark h-11 w-full rounded-full text-[13.5px] font-semibold">Sign in to chat</button>}
    </div>
  );
}

/** One live stream, full screen. Connects over WebRTC only while it is the active page. */
export function LiveView({ s, active }: { s: LiveStream; active: boolean }) {
  const v = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<'idle' | 'connecting' | 'playing' | 'error'>('idle');
  const [err, setErr] = useState('');
  const [viewer, setViewer] = useState<string | undefined>();
  const [muted, setMuted] = useState(true);
  const [myHearts, setMyHearts] = useState(0);
  const ev = useLiveEvents(active ? s.id : null, viewer);
  const info = ev.info ?? s;
  useEffect(() => {
    if (!active) return;
    const sig = { cancelled: false }; let pc: RTCPeerConnection | null = null;
    const t = setTimeout(() => setState('connecting'), 0);
    watch(s.id, (ms) => { if (v.current) { v.current.srcObject = ms; void v.current.play().catch(() => {}); setState('playing'); } }, sig)
      .then((r) => { pc = r.pc; setViewer(r.viewer); r.pc.onconnectionstatechange = () => { if (r.pc.connectionState === 'failed') { setState('error'); setErr('Couldn’t connect to this stream from your network.'); } }; })
      .catch((e) => { setState('error'); setErr((e as Error).message); });
    return () => { clearTimeout(t); sig.cancelled = true; pc?.close(); setViewer(undefined); setState('idle'); };
  }, [active, s.id]);
  const heart = () => { setMyHearts((n) => n + 1); void liveHeart(s.id).catch(() => {}); };
  return (
    <article className="relative h-full w-full overflow-hidden bg-black text-white">
      <video ref={v} autoPlay playsInline muted={muted} className="absolute inset-0 h-full w-full object-cover" onClick={() => setMuted((m) => !m)} />
      {state !== 'playing' && <div className="absolute inset-0 grid place-items-center text-center text-white/70">{state === 'error' || ev.ended ? <p className="max-w-[16rem] text-[14px]">{ev.ended ? 'This live has ended.' : err}</p> : <Loader2 className="animate-spin" />}</div>}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/75 to-transparent" />
      <div className="absolute inset-x-3 top-14 flex items-center gap-2">
        <Link href={`/u/${s.handle}`} className="glass-dark flex min-w-0 items-center gap-2 rounded-full py-1 pl-1 pr-3"><Avatar id={s.near_account} handle={s.handle} size={30} /><span className="min-w-0"><span className="block truncate text-[13px] font-semibold leading-tight">{s.display_name}</span><span className="block text-[11px] text-white/60">@{s.handle}</span></span></Link>
        <span className="rounded-[6px] bg-[#ff2d55] px-1.5 py-0.5 text-[11px] font-bold tracking-[.05em]">LIVE</span>
        <span className="glass-dark flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px]"><Eye size={13} />{info.viewers}</span>
        <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'} className="glass-dark ml-auto grid h-8 w-8 place-items-center rounded-full">{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
      </div>
      {s.title && <p className="absolute inset-x-4 top-[6.6rem] text-[14px] font-medium text-white/90">{s.title}</p>}
      <Hearts n={info.hearts + myHearts} />
      <div className="absolute bottom-40 right-3 flex flex-col items-center gap-1">
        <motion.button whileTap={{ scale: 0.8 }} onClick={heart} aria-label="Send a heart" className="glass-dark grid h-12 w-12 place-items-center rounded-full"><Heart size={22} className="fill-[#ff3b5c] text-[#ff3b5c]" /></motion.button>
        <span className="text-[11.5px] font-semibold">{info.hearts}</span>
      </div>
      <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2">
        <ChatOverlay id={s.id} msgs={ev.msgs} />
        {info.coin && <CoinCard symbol={info.coin} raidId={info.raid_id} dark />}
      </div>
    </article>
  );
}
