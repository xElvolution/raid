'use client';
import type { Market, PlayTopTrader } from '@called/sdk';
import { AnimatePresence, motion, useSpring, useTransform } from 'motion/react';
import Link from 'next/link';
import { TLink } from '@/lib/transition';
import { useEffect, useState } from 'react';
import { useLiveOdds } from '@/lib/live-hooks';
import { usd } from '@/lib/format';
import { money } from '@/lib/play';
import { MarketTile } from './CategoryIcon';
import { Avatar } from './ui';

export const marketHref = (m: { id: string; venue?: string }) => `/markets/${m.id}`;

/** Smoothly counts to a dollar value. Cents render dimmer, like a brokerage balance. */
export function BigMoney({ value, className = '' }: { value: number; className?: string }) {
  const s = useSpring(value, { stiffness: 90, damping: 22 });
  useEffect(() => { s.set(value); }, [s, value]);
  const txt = useTransform(s, (v) => money(v));
  const [t, setT] = useState(money(value));
  useEffect(() => txt.on('change', setT), [txt]);
  const [whole, cents] = t.split('.');
  return <span className={`tabular-nums ${className}`}>{whole}<span className="text-mute">.{cents}</span></span>;
}

/** Area chart of account value. */
export function ValueChart({ points, up, height = 72 }: { points: number[]; up: boolean; height?: number }) {
  if (points.length < 2) return <div style={{ height }} />;
  const w = 400, h = height, min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const xy = points.map((v, i) => [(i / (points.length - 1)) * w, h - 6 - ((v - min) / span) * (h - 12)] as const);
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const c = up ? '#22d3a6' : '#ff5c6c';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden>
      <defs><linearGradient id="vc" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={c} stopOpacity=".10" /><stop offset="1" stopColor={c} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="url(#vc)" />
      <motion.path d={line} fill="none" stroke={c} strokeWidth="2" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeOut' }} />
      <motion.circle cx={xy[xy.length - 1]![0]} cy={xy[xy.length - 1]![1]} r="4" fill={c} animate={{ r: [4, 7, 4], opacity: [1, 0.5, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
    </svg>
  );
}

/** Notched card for the weekly top traders strip. */
export function TopCallCard({ t, rank }: { t: PlayTopTrader; rank: number }) {
  const up = t.pnl >= 0;
  return (
    <Link href={`/u/${t.handle}`} className="block shrink-0 snap-start">
      <motion.div whileTap={{ scale: 0.96 }} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: rank * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-[168px] h-[148px] rounded-[20px] bg-panel border border-line p-3.5 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2">
          <Avatar handle={t.handle} url={t.avatar_url} size={28} />
          <span className="min-w-0 truncate text-[13px] font-medium">{t.display_name}</span>
          <span className="ml-auto text-[11px] text-mute tabular-nums">#{rank}</span>
        </div>
        {t.market && <div className="mt-3 flex items-center gap-2 min-w-0"><MarketTile category={t.market.category} image={t.market.image_url} size={22} className="!rounded-md" /><span className="truncate text-[12px] text-mute">{t.market.question}</span></div>}
        <div className={`mt-auto text-[24px] font-semibold tracking-tight tabular-nums ${up ? 'text-mint' : 'text-coral'}`}>{money(t.pnl, true)}</div>
        <div className="text-[12px] text-mute tabular-nums">{up ? '+' : ''}{(t.pnlPct * 100).toFixed(1)}% this week</div>
      </motion.div>
    </Link>
  );
}

/** Dense market row: tile, question, volume, live odds with a change pill. Flashes on every live tick. */
export function MarketRow({ m, i = 0 }: { m: Market; i?: number }) {
  const { p, dir } = useLiveOdds(m.id, Number(m.price_yes));
  const spark = m.spark ?? [];
  const first = spark.length ? spark[0]! : p;
  const chg = (p - first) * 100;
  const multi = m.outcomes && m.outcomes[1]?.toLowerCase() !== 'yes' ? m.outcomes[1] : null;
  return (
    <TLink href={marketHref(m)} className="block">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }} whileTap={{ scale: 0.985 }}
        className="flex items-center gap-3 px-4 py-3 hover:bg-ink/[.025] transition-colors">
        <MarketTile category={m.category} image={m.image_url} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] leading-[1.3] font-medium line-clamp-2" style={{ viewTransitionName: `q-${m.id}` }}>{m.question}</div>
          <div className="mt-1 flex items-center gap-2 text-[12px] text-mute">
            <span>{usd(m.volume)} vol</span>
            {m.category && <><span className="h-0.5 w-0.5 rounded-full bg-mute" /><span className="capitalize">{m.category}</span></>}
            {multi && <><span className="h-0.5 w-0.5 rounded-full bg-mute" /><span className="truncate">{multi}</span></>}
          </div>
        </div>
        <div className="text-right shrink-0 w-[64px]">
          <div className="relative cd text-[26px] tabular-nums">
            <AnimatePresence>{dir && <motion.span key={p} className={`absolute -inset-x-1 -inset-y-0.5 rounded-md ${dir === 'up' ? 'bg-mint/20' : 'bg-coral/20'}`} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.2 }} />}</AnimatePresence>
            <span className="relative" style={{ color: p >= 0.5 ? 'var(--color-mint)' : 'var(--color-coral)' }}>{Math.round(p * 100)}%</span>
          </div>
          <div className={`mt-0.5 inline-flex items-center gap-0.5 text-[12px] font-medium tabular-nums ${chg >= 0 ? 'text-mint' : 'text-coral'}`}>
            <svg width="8" height="8" viewBox="0 0 8 8" className={chg >= 0 ? '' : 'rotate-180'}><path d="M4 1 7.5 6.5h-7Z" fill="currentColor" /></svg>
            {Math.abs(chg).toFixed(1)}
          </div>
        </div>
      </motion.div>
    </TLink>
  );
}

export function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="h-11 w-11 rounded-xl shimmer" />
      <div className="flex-1 space-y-2"><div className="h-3.5 w-4/5 rounded shimmer" /><div className="h-3 w-1/3 rounded shimmer" /></div>
      <span className="h-5 w-10 rounded shimmer" />
    </div>
  );
}
