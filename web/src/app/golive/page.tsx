'use client';
/** Go live: camera preview, pin a coin, then stream to viewers over WebRTC. Chat, hearts and viewers show on top. */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Camera, Eye, Heart, Loader2, Radio, RefreshCcw, X } from 'lucide-react';
import { useSocialAuth } from '@/components/Social';
import { Broadcast, type LiveStream } from '@/lib/livecam';
import { ChatOverlay, Hearts, useLiveEvents } from '@/components/app/LiveView';
import { COINS } from '@/lib/coins';
import { toast } from '@/lib/bus';

export default function GoLivePage() {
  const { sess, ensure, busy: signing } = useSocialAuth();
  const v = useRef<HTMLVideoElement>(null);
  const [media, setMedia] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [title, setTitle] = useState('');
  const [coin, setCoin] = useState<string | null>('PEPE');
  const [phase, setPhase] = useState<'intro' | 'preview' | 'starting' | 'live' | 'ended'>('intro');
  const [err, setErr] = useState('');
  const bc = useRef<Broadcast | null>(null);
  const [info, setInfo] = useState<LiveStream | null>(null);
  const ev = useLiveEvents(phase === 'live' ? info?.id ?? null : null);
  const [secs, setSecs] = useState(0);

  async function camera(f = facing) {
    setErr('');
    try {
      media?.getTracks().forEach((t) => t.stop());
      const m = await navigator.mediaDevices.getUserMedia({ video: { facingMode: f, width: { ideal: 720 }, height: { ideal: 1280 } }, audio: true });
      setMedia(m); setPhase((p) => (p === 'intro' ? 'preview' : p));
      if (bc.current) { /* swap tracks on live peers */ const vt = m.getVideoTracks()[0]!; bc.current.peers.forEach((pc) => pc.getSenders().find((s) => s.track?.kind === 'video')?.replaceTrack(vt)); bc.current.media = m; }
    } catch (e) { setErr((e as Error).name === 'NotAllowedError' ? 'Camera access was blocked. Allow it in your browser settings and try again.' : 'No camera found on this device.'); }
  }
  useEffect(() => { if (v.current && media) { v.current.srcObject = media; void v.current.play().catch(() => {}); } }, [media, phase]);
  useEffect(() => () => { void bc.current?.stop(); }, []);
  useEffect(() => { if (phase !== 'live') return; const t0 = Date.now(); const i = setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 1000); return () => clearInterval(i); }, [phase]);

  async function goLive() {
    if (!media) return;
    if (!sess && !(await ensure())) return;
    setPhase('starting');
    try { const b = new Broadcast(media, { title: title.trim(), coin }, setInfo); bc.current = b; await b.start(); setPhase('live'); }
    catch (e) { setPhase('preview'); toast({ title: 'Couldn’t go live', body: (e as Error).message, tone: 'down' }); }
  }
  async function end() { await bc.current?.stop(); bc.current = null; setMedia(null); setPhase('ended'); }
  const pin = (c: string | null) => { setCoin(c); if (bc.current) bc.current.coin = c; };
  const mm = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      {media && <video ref={v} muted playsInline autoPlay className={`absolute inset-0 h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`} />}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
      <div className="absolute inset-x-3 top-[max(12px,env(safe-area-inset-top))] flex items-center gap-2">
        {phase === 'live' ? <>
          <span className="rounded-[6px] bg-[#ff2d55] px-1.5 py-0.5 text-[11px] font-bold tracking-[.05em]">LIVE</span>
          <span className="glass-dark rounded-full px-2 py-0.5 mono text-[12px]">{mm}</span>
          <span className="glass-dark flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px]"><Eye size={13} />{info?.viewers ?? 0}</span>
          <span className="glass-dark flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px]"><Heart size={13} className="fill-[#ff3b5c] text-[#ff3b5c]" />{ev.info?.hearts ?? 0}</span>
          <button onClick={() => void end()} className="press ml-auto h-9 rounded-full bg-white px-4 text-[13.5px] font-bold text-black">End</button>
        </> : <>
          <Link href="/reels?tab=live" aria-label="Close" className="glass-dark grid h-9 w-9 place-items-center rounded-full"><X size={18} /></Link>
          {media && <button onClick={() => { const f = facing === 'user' ? 'environment' : 'user'; setFacing(f); void camera(f); }} aria-label="Flip camera" className="glass-dark ml-auto grid h-9 w-9 place-items-center rounded-full"><RefreshCcw size={17} /></button>}
        </>}
      </div>
      {phase === 'live' && <button onClick={() => { const f = facing === 'user' ? 'environment' : 'user'; setFacing(f); void camera(f); }} aria-label="Flip camera" className="glass-dark absolute right-3 top-16 grid h-9 w-9 place-items-center rounded-full"><RefreshCcw size={17} /></button>}

      {phase === 'intro' && (
        <div className="absolute inset-x-0 bottom-0 p-5 pb-[max(24px,env(safe-area-inset-bottom))]">
          <span className="grid h-14 w-14 place-items-center rounded-[18px] bg-gradient-to-br from-[#e0353f] to-[#ff8a8f]"><Radio size={26} /></span>
          <h1 className="mt-4 text-[24px] font-semibold tracking-[-0.03em]">Go live</h1>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">Stream your camera to RAID. People can watch, chat and send hearts. Pin a coin so they can buy or join a raid.</p>
          {err && <p className="mt-3 rounded-[14px] bg-[#ff2d55]/20 px-3 py-2 text-[13px]">{err}</p>}
          <button onClick={() => void camera()} className="press mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full btn-signal text-[15px] font-semibold"><Camera size={18} />Turn on camera</button>
        </div>
      )}
      {(phase === 'preview' || phase === 'starting') && (
        <div className="absolute inset-x-0 bottom-0 p-4 pb-[max(20px,env(safe-area-inset-bottom))]">
          <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 100))} placeholder="Add a title" className="glass-dark h-12 w-full rounded-full px-4 text-[15px] text-white outline-none placeholder:text-white/50" />
          <p className="mt-3 text-[12.5px] text-white/65">Pin a coin</p>
          <div className="-mx-4 mt-1.5 flex gap-1.5 overflow-x-auto px-4 no-scrollbar">
            <button onClick={() => pin(null)} className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold ${coin === null ? 'bg-white text-black' : 'glass-dark'}`}>None</button>
            {COINS.map((c) => <button key={c.symbol} onClick={() => pin(c.symbol)} className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold ${coin === c.symbol ? 'bg-white text-black' : 'glass-dark'}`}>${c.symbol}</button>)}
          </div>
          <button disabled={phase === 'starting' || signing} onClick={() => void goLive()} className="press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ff2d55] text-[15px] font-bold disabled:opacity-60">{phase === 'starting' || signing ? <Loader2 size={18} className="animate-spin" /> : <Radio size={18} />}{!sess ? 'Sign in and go live' : phase === 'starting' ? 'Starting…' : 'Go live'}</button>
        </div>
      )}
      {phase === 'live' && info && (
        <>
          <Hearts n={ev.info?.hearts ?? 0} />
          <div className="absolute inset-x-3 bottom-[max(14px,env(safe-area-inset-bottom))] flex flex-col gap-2">
            <ChatOverlay id={info.id} msgs={ev.msgs} />
            <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 no-scrollbar">
              <span className="shrink-0 self-center text-[12px] text-white/60">Pinned:</span>
              {[null, ...COINS.map((c) => c.symbol)].map((s) => <button key={s ?? 'none'} onClick={() => pin(s)} className={`h-8 shrink-0 rounded-full px-3 text-[12.5px] font-semibold ${coin === s ? 'bg-white text-black' : 'glass-dark'}`}>{s ? `$${s}` : 'None'}</button>)}
            </div>
          </div>
        </>
      )}
      {phase === 'ended' && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div><p className="text-[22px] font-semibold">Live ended</p><p className="mt-1.5 text-[14px] text-white/65">{ev.info?.hearts ?? info?.hearts ?? 0} hearts · {mm} on air</p>
            <div className="mt-5 flex gap-2"><Link href="/reels?tab=live" className="press flex h-11 flex-1 items-center justify-center rounded-full bg-white px-5 text-[14px] font-semibold text-black">Done</Link><button onClick={() => { setPhase('intro'); setInfo(null); }} className="press h-11 flex-1 rounded-full glass-dark px-5 text-[14px] font-semibold">Go live again</button></div></div>
        </div>
      )}
    </div>
  );
}
