'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Film, Heart, Link2, MessageCircle, Send, Upload, UserPlus, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';
import { openJoin } from './app/Flow';
import { openComposer } from './app/Composer';
import { CoinAvatar, Delta, Modal, Segmented } from './ui';
import { PhaseChip } from './RaidCard';
import { type Reel, reelsApi, videoUrl, rememberReel } from '@/lib/reels';
import { useNow, useRaids } from '@/lib/hooks';
import { useQuote, fmtPrice } from '@/lib/market';
import { COINS } from '@/lib/coins';
import { target, xLabel } from '@/lib/raid';
import { signInSocial, social, useSession } from '@/lib/social';
import { signInSheet, toast } from '@/lib/bus';
import { Avatar } from './app/Avatar';
import { CoinCard } from './app/CoinCard';
import { VerifiedBadge } from './app/Verified';
import { useQueryClient } from '@tanstack/react-query';

const PROVIDER = { x: 'X', instagram: 'Instagram', tiktok: 'TikTok' } as const;

/** One full-height reel: the video (or a link card), the coin, the live raid and a Back / Buy button. */
export function ReelView({ r, active }: { r: Reel; active: boolean }) {
  const v = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const raids = useRaids();
  const now = useNow();
  const linked = r.raid_id !== null ? raids.data?.find((x) => x.id === r.raid_id) : undefined;
  // Only treat the raid as this reel's raid when it targets the same coin (tPEPE on testnet counts as PEPE).
  const raid = linked && (!r.coin || target(linked).symbol.replace(/^t(?=[A-Z])/, '') === r.coin) ? linked : undefined;
  const sym = r.coin ?? (raid ? target(raid).symbol : null);
  const q = useQuote(sym ?? undefined);
  useEffect(() => { const el = v.current; if (!el) return; if (active) void el.play().catch(() => {}); else el.pause(); }, [active]);
  return (
    <article className="relative h-full w-full snap-start snap-always overflow-hidden bg-[#0b0b0d] text-white md:rounded-[18px]">
      {r.kind === 'video' ? (
        <video ref={v} src={videoUrl(r)} muted={muted} loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" onClick={() => setMuted((m) => !m)} aria-label={r.caption || `Reel by ${r.display_name}`} />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,#24252b_0,#0b0b0d_70%)] p-6">
          <a href={r.embed_url ?? '#'} target="_blank" rel="noreferrer" className="w-full max-w-[18rem] rounded-[18px] bg-white/10 p-4 backdrop-blur hover:bg-white/15">
            <p className="eyebrow !text-white/70">{PROVIDER[r.provider ?? 'x']} reel</p>
            <p className="mt-2 text-[14px] font-semibold leading-snug line-clamp-4">{r.caption || r.embed_url}</p>
            <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-bold text-lime">Watch on {PROVIDER[r.provider ?? 'x']}<ExternalLink size={13} /></p>
            <p className="mt-2 truncate mono text-[10px] text-white/50">{r.embed_url}</p>
          </a>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#0b0b0d] via-[#0b0b0d]/70 to-transparent" />
      <div className="absolute left-2.5 right-2.5 top-14 flex items-center gap-1.5">
        {r.kind === 'video' && <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'} className="pointer-events-auto ml-auto grid h-9 w-9 place-items-center rounded-full glass-dark">{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>}
      </div>
      <ReelRail r={r} />
      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
        <div className="mr-14 flex items-center gap-2">
          <Link href={`/u/${r.handle}`} className="flex min-w-0 items-center gap-2"><Avatar id={r.near_account} handle={r.handle} size={36} /><span className="truncate text-[15px] font-semibold">{r.display_name || r.handle}</span><VerifiedBadge account={r.near_account} /></Link>
          <FollowBtn handle={r.handle} />
        </div>
        <p className="mr-14 mt-1.5 text-[14px] leading-snug text-white/90 line-clamp-2">{sym ? <>@{r.handle} is shilling <b className="text-white">${sym}</b>{r.caption ? <span className="text-white/70"> · {r.caption}</span> : null}</> : r.caption}</p>
        {sym && <div className="mt-2.5" onClickCapture={() => raid && rememberReel(raid.id, r.id)}><CoinCard symbol={sym} raidId={raid?.id} dark /></div>}
      </div>
    </article>
  );
}

function FollowBtn({ handle }: { handle: string }) {
  const sess = useSession();
  const [on, setOn] = useState(false);
  if (sess?.handle === handle) return null;
  const go = async () => {
    if (!sess) return signInSheet.emit();
    const n = !on; setOn(n);
    try { await social.follow(handle, n); } catch { setOn(!n); toast({ title: 'Couldn’t follow', tone: 'down' }); }
  };
  return <button onClick={go} className={`press h-8 shrink-0 rounded-full px-3.5 text-[12.5px] font-bold ${on ? 'glass-dark text-white' : 'bg-white text-black'}`}>{on ? 'Following' : 'Follow'}</button>;
}

function RailBtn({ onClick, href, label, children, count }: { onClick?: () => void; href?: string; label: string; children: React.ReactNode; count?: string }) {
    const inner = <><span className="grid h-12 w-12 place-items-center rounded-full glass-dark">{children}</span>{count !== undefined && <span className="mt-0.5 text-[11px] font-semibold">{count}</span>}</>;
    return href ? <Link href={href} aria-label={label} className="flex flex-col items-center">{inner}</Link> : <button onClick={onClick} aria-label={label} className="press flex flex-col items-center">{inner}</button>;
}

/** Like, comment, share and follow, on the right edge like any reels app. */
function ReelRail({ r }: { r: Reel }) {
  const sess = useSession();
  const [liked, setLiked] = useState(false);
  const [n, setN] = useState(r.likes ?? 0);
  const like = async () => {
    if (!sess) return toast({ title: 'Sign in to like', body: 'Open Settings or tap Sign in at the top.', tone: 'brand' });
    const on = !liked; setLiked(on); setN((x) => x + (on ? 1 : -1));
    try { const res = await reelsApi.like(r.id, on); setLiked(res.on); setN(res.count); } catch { setLiked(!on); setN((x) => x + (on ? -1 : 1)); }
  };
  const share = async () => {
    const url = `${location.origin}/reels?r=${r.id}`;
    try { if (navigator.share) await navigator.share({ title: r.caption || 'RAID reel', url }); else { await navigator.clipboard.writeText(url); toast({ title: 'Link copied', tone: 'lime' }); } } catch { /* closed */ }
  };
  return (
    <div className="absolute bottom-[8.5rem] right-2 flex flex-col items-center gap-4 text-white">
      <RailBtn onClick={like} label="Like" count={String(n)}><motion.span animate={liked ? { scale: [1, 1.35, 1] } : { scale: 1 }}><Heart size={21} className={liked ? 'fill-[#ff3b5c] text-[#ff3b5c]' : ''} /></motion.span></RailBtn>
      <RailBtn onClick={() => openComposer({ text: `${r.coin ? `$${r.coin} ` : ''}`, raidId: r.raid_id ?? undefined })} label="Comment"><MessageCircle size={20} /></RailBtn>
      <RailBtn onClick={share} label="Share"><Send size={19} /></RailBtn>
    </div>
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
  const field = 'h-10 w-full rounded-[13px] bg-raised px-3 text-[13px] hairline outline-none';
  return (
    <Modal open={open} onClose={onClose} label="Post a reel">
      <div className="p-3.5 md:p-5">
        <p className="wide text-[1rem] md:text-[19px]">Post a reel</p>
        <p className="mt-1 text-[12px] text-mute">Market a coin or a raid. If a raid you link hits, you’re credited 0.5% of its profit (20% of the caller’s fee): <b>tracked by RAID, paid off-chain</b>.</p>
        <Segmented id="reel-mode" className="mt-3 w-full [&>button]:flex-1" value={mode} onChange={setMode} options={[{ value: 'upload', label: 'Upload mp4' }, { value: 'link', label: 'Paste link' }]} />
        <div className="mt-2.5 grid gap-2">
          {mode === 'upload' ? (
            <label className="flex h-[4.5rem] cursor-pointer items-center justify-center gap-2 rounded-[16px] border border-dashed border-line text-[13px] text-mute hover:bg-raised">
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
            <button disabled={busy || tooLong || (mode === 'upload' ? !file : !url)} onClick={() => void submit()} className="press h-10 rounded-[13px] bg-lime text-[13.5px] font-bold text-[#1c0900] disabled:opacity-45"><Film size={15} className="mr-1.5 inline" />{busy ? 'Posting…' : 'Post reel'}</button>
          ) : (
            <button onClick={() => void signInSocial().catch((e: Error) => e.message !== 'connect_wallet' && toast({ title: 'Sign-in failed', body: e.message, tone: 'down' }))} className="press h-10 rounded-[13px] bg-brand text-[13.5px] font-bold text-white">Sign in to post (no gas)</button>
          )}
        </div>
      </div>
    </Modal>
  );
}
