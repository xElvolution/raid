'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Film, Link2, Upload, Volume2, VolumeX } from 'lucide-react';
import { CoinAvatar, Delta, Modal, Segmented } from './ui';
import { PhaseChip } from './RaidCard';
import { type Reel, reelsApi, videoUrl } from '@/lib/reels';
import { useNow, useRaids } from '@/lib/hooks';
import { useQuote } from '@/lib/market';
import { COINS } from '@/lib/coins';
import { target, xLabel } from '@/lib/raid';
import { signInSocial, useSession } from '@/lib/social';
import { toast } from '@/lib/bus';
import { useQueryClient } from '@tanstack/react-query';

const PROVIDER = { x: 'X', instagram: 'Instagram', tiktok: 'TikTok' } as const;

/** One full-height reel: the video (or a link card), the coin, the live raid and a Back / Buy button. */
export function ReelView({ r, active }: { r: Reel; active: boolean }) {
  const v = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const raids = useRaids();
  const now = useNow();
  const raid = r.raid_id !== null ? raids.data?.find((x) => x.id === r.raid_id) : undefined;
  const sym = r.coin ?? (raid ? target(raid).symbol : null);
  const q = useQuote(sym ?? undefined);
  useEffect(() => { const el = v.current; if (!el) return; if (active) void el.play().catch(() => {}); else el.pause(); }, [active]);
  return (
    <article className="relative h-full w-full snap-start snap-always overflow-hidden bg-[#04061a] text-white md:rounded-[18px]">
      {r.kind === 'video' ? (
        <video ref={v} src={videoUrl(r)} muted={muted} loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" onClick={() => setMuted((m) => !m)} aria-label={r.caption || `Reel by ${r.display_name}`} />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,#2448ff_0,#04061a_70%)] p-6">
          <a href={r.embed_url ?? '#'} target="_blank" rel="noreferrer" className="w-full max-w-[18rem] rounded-[14px] bg-white/10 p-4 backdrop-blur hover:bg-white/15">
            <p className="eyebrow !text-white/70">{PROVIDER[r.provider ?? 'x']} reel</p>
            <p className="mt-2 text-[14px] font-semibold leading-snug line-clamp-4">{r.caption || r.embed_url}</p>
            <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-bold text-lime">Watch on {PROVIDER[r.provider ?? 'x']}<ExternalLink size={13} /></p>
            <p className="mt-2 truncate mono text-[10px] text-white/50">{r.embed_url}</p>
          </a>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#04061a] via-[#04061a]/70 to-transparent" />
      <div className="absolute left-2.5 right-2.5 top-2.5 flex items-center gap-1.5">
        {r.kind === 'video' && <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'} className="pointer-events-auto ml-auto grid h-8 w-8 place-items-center rounded-full bg-black/40">{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold">{(r.demo || r.author_demo) && <span className="rounded-[5px] bg-[#ff5c7a] px-1.5 py-px mono text-[9.5px] font-bold">DEMO</span>}@{r.handle} <span className="truncate font-normal text-white/60">{r.display_name}</span>{r.kind === 'video' && r.duration_s ? <span className="ml-auto mono text-[10px] font-normal text-white/50">{Math.round(r.duration_s)}s</span> : null}</p>
        {r.caption && <p className="mt-1 text-[13px] leading-snug text-white/90 line-clamp-2">{r.caption}</p>}
        <div className="mt-2 flex items-center gap-2 rounded-[12px] bg-white/10 p-2 backdrop-blur">
          {sym ? <CoinAvatar symbol={sym} image={q.data?.image} size={32} /> : <span className="h-8 w-8 rounded-full bg-white/10" />}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-[13px] font-bold">{sym ? `$${sym}` : 'Coin'}{raid && <span className="mono text-[10.5px] font-medium text-white/60">raid #{raid.id} · {xLabel(raid.target_x_bps)}</span>}</p>
            <div className="mt-0.5 flex items-center gap-1.5">{raid ? <PhaseChip r={raid} now={now} /> : <span className="text-[10.5px] text-white/60">no raid linked</span>}<Delta pct={q.data?.change24h} className="text-[10.5px]" /></div>
          </div>
          {raid ? <Link href={`/raids/${raid.id}?reel=${r.id}`} className="press grid h-10 shrink-0 place-items-center rounded-[10px] bg-lime px-4 text-[13px] font-bold text-[#0a1a00]">Back</Link>
            : r.launch_id !== null ? <Link href={`/launch#coin-${r.launch_id}`} className="press grid h-10 shrink-0 place-items-center rounded-[10px] bg-lime px-4 text-[13px] font-bold text-[#0a1a00]">Buy</Link>
            : sym ? <Link href={`/coin/${sym}`} className="press grid h-10 shrink-0 place-items-center rounded-[10px] bg-white px-4 text-[13px] font-bold text-[#04061a]">Raid it</Link> : null}
        </div>
        <p className="mt-1.5 mono text-[10px] text-white/50">{r.backs} back{r.backs === 1 ? '' : 's'} via this reel · {(Number(r.backed_raw) / 1e6).toFixed(0)} USDC · off-chain attribution, demo</p>
      </div>
    </article>
  );
}

/** Post a reel: upload an mp4 (up to 60 s) or paste an X / Instagram / TikTok link, tied to a coin or raid. */
export function ReelComposer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sess = useSession();
  const raids = useRaids();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'upload' | 'link'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [dur, setDur] = useState<number | null>(null);
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [coin, setCoin] = useState('PEPE');
  const [raidId, setRaidId] = useState('');
  const [busy, setBusy] = useState(false);
  const pick = (f: File | null) => {
    setFile(f); setDur(null);
    if (!f) return;
    const el = document.createElement('video'); el.preload = 'metadata'; el.onloadedmetadata = () => { setDur(el.duration); URL.revokeObjectURL(el.src); }; el.src = URL.createObjectURL(f);
  };
  const tooLong = dur !== null && dur > 60.5;
  const submit = async () => {
    setBusy(true);
    try {
      const meta = { caption, coin, raidId: raidId === '' ? undefined : Number(raidId) };
      if (mode === 'upload') { if (!file) throw new Error('Pick an mp4'); await reelsApi.upload(file, meta); } else await reelsApi.link({ embedUrl: url.trim(), ...meta });
      toast({ title: 'Reel posted', tone: 'lime' }); await qc.invalidateQueries({ queryKey: ['reels'] }); onClose();
      setFile(null); setUrl(''); setCaption('');
    } catch (e) { toast({ title: 'Couldn’t post the reel', body: (e as Error).message, tone: 'down' }); } finally { setBusy(false); }
  };
  const field = 'h-10 w-full rounded-[10px] bg-raised px-3 text-[13px] hairline outline-none';
  return (
    <Modal open={open} onClose={onClose} label="Post a reel">
      <div className="p-3.5 md:p-5">
        <p className="wide text-[1rem] md:text-[19px]">Post a reel</p>
        <p className="mt-1 text-[12px] text-mute">Market a coin or a raid. If a raid you link hits, you’re credited 0.5% of its profit (20% of the caller’s fee): <b>off-chain attribution, demo</b>.</p>
        <Segmented id="reel-mode" className="mt-3 w-full [&>button]:flex-1" value={mode} onChange={setMode} options={[{ value: 'upload', label: 'Upload mp4' }, { value: 'link', label: 'Paste link' }]} />
        <div className="mt-2.5 grid gap-2">
          {mode === 'upload' ? (
            <label className="flex h-[4.5rem] cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-dashed border-line text-[13px] text-mute hover:bg-raised">
              <Upload size={16} />{file ? `${file.name.slice(0, 26)}${dur !== null ? ` · ${dur.toFixed(0)} s` : ''}` : 'Choose an mp4, up to 60 s'}
              <input type="file" accept="video/mp4" className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
            </label>
          ) : (
            <label className="relative"><Link2 size={15} className="absolute left-3 top-3 text-mute" /><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://x.com/… · instagram.com/reel/… · tiktok.com/…" className={`${field} pl-9`} /></label>
          )}
          {tooLong && <p className="text-[12px] text-down">That video is {dur!.toFixed(0)} s. Reels are up to 60 s.</p>}
          <input value={caption} onChange={(e) => setCaption(e.target.value.slice(0, 220))} placeholder="Caption" className={field} />
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="Coin" value={coin} onChange={(e) => setCoin(e.target.value)} className={field}>{COINS.map((c) => <option key={c.symbol}>{c.symbol}</option>)}</select>
            <select aria-label="Raid" value={raidId} onChange={(e) => setRaidId(e.target.value)} className={field}><option value="">No raid</option>{(raids.data ?? []).filter((r) => r.status !== 'Closed').map((r) => <option key={r.id} value={r.id}>#{r.id} {target(r).symbol} {xLabel(r.target_x_bps)}</option>)}</select>
          </div>
          {sess ? (
            <button disabled={busy || tooLong || (mode === 'upload' ? !file : !url)} onClick={() => void submit()} className="press h-10 rounded-[10px] bg-lime text-[13.5px] font-bold text-[#0a1a00] disabled:opacity-45"><Film size={15} className="mr-1.5 inline" />{busy ? 'Posting…' : 'Post reel'}</button>
          ) : (
            <button onClick={() => void signInSocial().catch((e: Error) => e.message !== 'connect_wallet' && toast({ title: 'Sign-in failed', body: e.message, tone: 'down' }))} className="press h-10 rounded-[10px] bg-brand text-[13.5px] font-bold text-white">Sign in to post (no gas)</button>
          )}
        </div>
      </div>
    </Modal>
  );
}
