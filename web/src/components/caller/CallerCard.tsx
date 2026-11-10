'use client';
/* eslint-disable @next/next/no-img-element -- avatar art */
/**
 * CALLER CARD: the profile hero is a collectible sports card. Solid brand purple, frame tier by league,
 * a giant hit-rate number, tap to flip in 3D to the stats/badges back. Shareable as a PNG.
 */
import type { CallerProfile } from '@called/sdk';
import { motion, useReducedMotion } from 'motion/react';
import { BadgeCheck, Share2 } from 'lucide-react';
import { useState } from 'react';
import { assetUrl, initials } from '../ui';
import { divisionFor } from '@/lib/gamification';
import { haptic } from '@/lib/fx';

export const money = (v: number, sign = false) => `${sign ? (v > 0 ? '+' : v < 0 ? '−' : '') : v < 0 ? '−' : ''}$${Math.abs(v) >= 1000 ? `${(Math.abs(v) / 1000).toFixed(1)}k` : Math.abs(v).toFixed(0)}`;

export function CallerCard({ p }: { p: CallerProfile }) {
  const [flipped, setFlipped] = useState(false);
  const reduced = useReducedMotion();
  const { user: u, stats: s } = p;
  const tier = divisionFor(u.xp).current;
  const hit = s.winRate === null ? null : Math.round(s.winRate * 100);
  const no = String(Math.abs([...u.handle].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 100).padStart(2, '0');
  const flip = () => { haptic('tap'); setFlipped((f) => !f); };
  return (
    <div className="px-4 pt-4">
      <div className="relative mx-auto max-w-[360px]" style={{ perspective: 1200 }}>
        <motion.div className="relative aspect-[5/7] w-full cursor-pointer" style={{ transformStyle: 'preserve-3d' }}
          initial={reduced ? false : { rotateY: -24, rotateX: 8, y: 20, opacity: 0 }} animate={{ rotateY: flipped ? 180 : 0, rotateX: 0, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 17 }} onClick={flip} role="button" aria-pressed={flipped} aria-label={flipped ? 'Show card front' : 'Flip card for stats'}>
          {/* FRONT */}
          <div className="absolute inset-0 cuts p-[7px]" style={{ background: tier.color, backfaceVisibility: 'hidden' }}>
            <div className="cuts relative flex h-full flex-col overflow-hidden bg-grape text-white">
              <div className="halftone absolute inset-0 opacity-[.18]" />
              <div className="relative flex items-center justify-between px-3 pt-3">
                <span className="cd text-[15px] tracking-[.12em]">Called · S1</span>
                <span className="cd px-1.5 text-[14px] text-[#000]" style={{ background: tier.color }}>{tier.name}</span>
              </div>
              <div className="relative mx-3 mt-2 flex-1 overflow-hidden bg-[#000]">
                <CardPhoto url={u.avatar_url} handle={u.handle} />
                <span className="cd absolute left-2 top-1 text-[64px] leading-none text-white/90" style={{ WebkitTextStroke: '2px #000' }}>{no}</span>
                <div className="absolute inset-x-0 bottom-0 bg-[#000]/80 px-2.5 py-2">
                  <div className="cd flex items-center gap-1.5 text-[30px] leading-none uppercase">{u.display_name}{u.verified && <BadgeCheck size={20} className="text-grape" fill="white" />}</div>
                  <div className="mn mt-1 text-[11px] text-white/70">@{u.handle} · since {new Date(u.created_at).getFullYear()}</div>
                </div>
              </div>
              <div className="relative grid grid-cols-[1.3fr_1fr] items-end gap-2 px-3 pb-3 pt-2">
                <div>
                  <div className="cd text-[88px] leading-[.8]">{hit ?? '—'}<span className="text-[40px]">{hit !== null ? '%' : ''}</span></div>
                  <div className="mn mt-1 text-[11px] font-bold tracking-[.12em]">HIT RATE</div>
                </div>
                <div className="space-y-1.5 pb-0.5">
                  <Stat k="Called" v={String(s.called)} />
                  <Stat k="Calib" v={s.calibration === null ? '—' : String(s.calibration)} />
                  <Stat k="Rank" v={s.rank ? `#${s.rank}` : '—'} />
                </div>
              </div>
            </div>
          </div>
          {/* BACK */}
          <div className="absolute inset-0 cuts p-[7px]" style={{ background: tier.color, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <div className="cuts flex h-full flex-col bg-[#0b0b0d] p-3 text-white">
              <div className="flex items-center justify-between"><span className="cd text-[24px]">Career stats</span><span className="cd px-1.5 text-[14px] text-[#000]" style={{ background: tier.color }}>{tier.name}</span></div>
              <div className="mt-2 grid grid-cols-3 gap-px bg-white/10">
                {[
                  ['P&L', money(s.pnl, true), s.pnl >= 0 ? 'text-mint' : 'text-coral'], ['Volume', money(s.volume), ''], ['Trades', String(s.trades), ''],
                  ['Settled', String(s.settled), ''], ['Best run', `${s.bestWinRun}W`, ''], ['Streak', `${u.streak}D`, ''],
                  ['Created', String(s.created), ''], ['Copiers', String(u.copiers), ''], ['Followers', String(u.followers), ''],
                ].map(([k, v, c]) => <div key={k} className="bg-[#0b0b0d] px-2 py-2"><div className={`cd text-[26px] leading-none ${c}`}>{v}</div><div className="mn mt-1 text-[10px] text-white/55 uppercase">{k}</div></div>)}
              </div>
              <div className="cd mt-3 text-[18px]">Badges</div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {p.badges.length ? p.badges.map((b) => <span key={b.id} title={b.detail} className="bug bg-grape text-white">{b.label}</span>) : <span className="text-[13px] text-white/55">No badges yet. Win a call to earn the first.</span>}
              </div>
              <div className="mt-auto mn text-[10px] text-white/45">Tap to flip · Calibration = how well stated odds match outcomes (0–100)</div>
            </div>
          </div>
        </motion.div>
      </div>
      <div className="mt-2 flex justify-center gap-4 mn text-[11px] text-mute uppercase tracking-[.08em]">
        <button className="press" onClick={flip}>{flipped ? 'Front' : 'Flip card'}</button>
        <button className="press flex items-center gap-1" onClick={() => void shareCard(p)}><Share2 size={13} /> Share card</button>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return <div className="flex items-baseline justify-between border-b border-white/25 pb-1"><span className="mn text-[10px] font-bold tracking-[.1em] text-white/75 uppercase">{k}</span><span className="cd text-[26px] leading-none">{v}</span></div>;
}

/** Renders the card front to a PNG (canvas, no deps) and opens the share sheet, or downloads it. */
export async function shareCard(p: CallerProfile) {
  const W = 750, H = 1050, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const tier = divisionFor(p.user.xp).current, hit = p.stats.winRate === null ? '—' : `${Math.round(p.stats.winRate * 100)}%`;
  await document.fonts.ready;
  const bc = getComputedStyle(document.documentElement).getPropertyValue('--font-bc').trim() || 'sans-serif';
  const cut = (k: number, inset: number) => { x.beginPath(); x.moveTo(inset + k, inset); x.lineTo(W - inset, inset); x.lineTo(W - inset, H - inset - k); x.lineTo(W - inset - k, H - inset); x.lineTo(inset, H - inset); x.lineTo(inset, inset + k); x.closePath(); };
  x.fillStyle = tier.color; cut(40, 0); x.fill(); x.fillStyle = '#7c5cff'; cut(32, 14); x.fill();
  if (p.user.avatar_url) {
    try { const img = new Image(); img.crossOrigin = 'anonymous'; img.src = assetUrl(p.user.avatar_url)!; await img.decode(); const s = Math.max(670 / img.width, 600 / img.height); x.save(); x.beginPath(); x.rect(40, 110, 670, 600); x.clip(); x.drawImage(img, 375 - (img.width * s) / 2, 410 - (img.height * s) / 2, img.width * s, img.height * s); x.restore(); } catch { /* cross-origin art: card still renders */ }
  }
  x.fillStyle = 'rgba(0,0,0,.8)'; x.fillRect(40, 610, 670, 100);
  x.fillStyle = '#fff'; x.font = `900 34px ${bc}`; x.fillText('CALLED · S1', 44, 76);
  x.fillStyle = tier.color; x.fillRect(560, 46, 150, 40); x.fillStyle = '#000'; x.fillText(tier.name.toUpperCase(), 572, 78);
  x.fillStyle = '#fff'; x.font = `900 64px ${bc}`; x.fillText(p.user.display_name.toUpperCase(), 58, 680);
  x.font = `900 220px ${bc}`; x.fillText(hit, 40, 940);
  x.font = '700 24px monospace'; x.fillText('HIT RATE', 48, 990); x.fillText(`@${p.user.handle}`, 48, 1020);
  x.font = `900 52px ${bc}`; x.textAlign = 'right';
  x.fillText(`${p.stats.called} CALLED`, 700, 830); x.fillText(`CAL ${p.stats.calibration ?? '—'}`, 700, 900); x.fillText(p.stats.rank ? `RANK #${p.stats.rank}` : '', 700, 970);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
  if (!blob) return;
  const file = new File([blob], `called-${p.user.handle}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: `@${p.user.handle} on Called` }); return; } catch { /* cancelled */ } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function CardPhoto({ url, handle }: { url: string | null | undefined; handle: string }) {
  const src = assetUrl(url);
  const [bad, setBad] = useState<string | null>(null);
  // eslint-disable-next-line @next/next/no-img-element
  if (src && bad !== src) return <img src={src} alt="" onError={() => setBad(src)} className="absolute inset-0 h-full w-full object-cover" />;
  return <div className="absolute inset-0 grid place-items-center cd text-[120px] text-grape">{initials(handle)}</div>;
}
