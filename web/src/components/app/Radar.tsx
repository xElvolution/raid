'use client';
/** Raid radar: every live raid as a ring that fills as the raid walks its loop (called, crew, bought, line, settled). */
import Link from 'next/link';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { CoinAvatar } from '../ui';
import { ChromeChest } from '../Chrome';
import { useNow, useRaids, useBuyback } from '@/lib/hooks';
import { countdown } from '@/lib/market';
import { phase, stepIndex, target, usdcOf, xLabel, type Raid } from '@/lib/raid';
import { openCall } from '@/lib/bus';

export function raidClock(r: Raid, now: number) {
  if (!now) return '';
  if (r.status === 'Open' && now < r.opens_until_ms) return countdown(r.opens_until_ms - now);
  if (r.status === 'Open' && r.buy_after_ms && now < r.buy_after_ms) return countdown(r.buy_after_ms - now);
  if (r.status === 'Held') return 'riding';
  if (r.status === 'Closed') return r.hit ? 'hit' : 'retreated';
  return phase(r, now).label.toLowerCase();
}

export function Ring({ r, size = 64, now }: { r: Raid; size?: number; now: number }) {
  const p = (stepIndex(r) + (r.status === 'Closed' ? 1 : 0.5)) / 5;
  const live = now ? phase(r, now).live : false;
  const sw = 3, rad = size / 2 - sw;
  const c = 2 * Math.PI * rad;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={rad} fill="none" stroke="var(--color-line)" strokeWidth={sw} />
        <motion.circle cx={size / 2} cy={size / 2} r={rad} fill="none" stroke={r.status === 'Closed' && !r.hit ? 'var(--color-faint)' : 'var(--color-signal)'} strokeWidth={sw} strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - p) }} transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }} />
      </svg>
      {live && <span className="absolute right-0.5 top-0.5 z-10 h-3 w-3 rounded-full border-2 border-bg bg-signal" />}
      <CoinAvatar symbol={target(r).symbol} size={size - 14} />
    </span>
  );
}

/** Horizontal radar for phones: top of the feed and raids board. */
export function RaidRadar({ className = '' }: { className?: string }) {
  const raids = useRaids();
  const now = useNow();
  const list = [...(raids.data ?? [])].reverse().sort((a, b) => Number(b.status !== 'Closed') - Number(a.status !== 'Closed'));
  return (
    <div className={`-mx-4 flex gap-4 overflow-x-auto px-4 py-3 no-scrollbar md:mx-0 md:px-0 ${className}`}>
      <button onClick={() => openCall()} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
        <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-faint text-mute"><Plus size={24} /></span>
        <span className="text-[12px] font-medium text-mute">Call</span>
      </button>
      {raids.isLoading && [0, 1, 2, 3].map((i) => <span key={i} className="shimmer h-16 w-16 shrink-0 !rounded-full" />)}
      {list.map((r) => (
        <Link key={r.id} href={`/raids/${r.id}`} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
          <Ring r={r} now={now} />
          <span className="w-full truncate text-center text-[12px] font-semibold leading-none">{xLabel(r.target_x_bps)} <span className="font-normal text-mute">#{r.id}</span></span>
          <span className={`w-full truncate text-center mono text-[10.5px] leading-none ${r.status === 'Closed' ? 'text-faint' : 'text-lime'}`}>{raidClock(r, now)}</span>
        </Link>
      ))}
    </div>
  );
}

/** Desktop right column: the chest and the live raids. */
export function RadarRail() {
  const raids = useRaids();
  const bb = useBuyback();
  const now = useNow();
  const list = raids.data ?? [];
  const pot = list.reduce((s, r) => s + usdcOf(r.pot), 0);
  const live = [...list].reverse().filter((r) => r.status !== 'Closed').slice(0, 6);
  return (
    <aside className="sticky top-[88px] hidden w-[300px] shrink-0 self-start pt-6 xl:block">
      <section className="obsidian relative overflow-hidden rounded-[28px] p-5">
        <div className="pointer-events-none absolute -right-5 -top-3"><ChromeChest size={120} fill={Math.min(1, pot / 1500)} /></div>
        <p className="eyebrow">War chest</p>
        <p className="mt-2 text-[34px] font-semibold leading-none tracking-[-0.05em]">{pot.toFixed(0)}<span className="ml-1.5 text-[13px] font-normal text-white/50">tUSDC</span></p>
        <div className="mt-4 flex gap-6 text-[12.5px] text-white/55"><span><b className="mono text-white">{list.length}</b> raids</span><span><b className="mono text-white">{list.filter((r) => r.hit).length}</b> hit</span><span><b className="mono text-white">{bb.data !== undefined ? usdcOf(bb.data).toFixed(1) : '–'}</b> buyback</span></div>
      </section>
      <p className="eyebrow mt-6 px-1">Raid radar</p>
      <ul className="mt-2">
        {live.map((r) => (
          <li key={r.id}><Link href={`/raids/${r.id}`} className="flex items-center gap-3 rounded-[18px] px-1 py-2.5 hover:bg-raised/60">
            <Ring r={r} now={now} size={46} />
            <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold">${target(r).symbol} to {xLabel(r.target_x_bps)}</span><span className="block truncate text-[12.5px] text-mute">{now ? phase(r, now).label : 'Live'} · {usdcOf(r.pot).toFixed(0)} pot</span></span>
            <span className="mono text-[12px] text-lime">{raidClock(r, now)}</span>
          </Link></li>
        ))}
      </ul>
      <p className="mt-6 px-1 text-[12px] leading-relaxed text-faint">RAID runs on the NEAR testnet chest. Raids can lose money. Nothing here is investment advice.</p>
    </aside>
  );
}
