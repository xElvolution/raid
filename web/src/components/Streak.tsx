'use client';
import { motion } from 'motion/react';
import { Flame, Gem } from './icons';
import { Ticker } from './ui';

export function StreakFlame({ days, size = 18 }: { days: number; size?: number }) {
  const lit = days > 0;
  return (
    <span className={`flex items-center gap-1 text-[14px] font-semibold tabular-nums ${lit ? 'text-flame' : 'text-mute'}`} title={`${days} day streak`}>
      <motion.span animate={lit ? { scale: [1, 1.12, 0.96, 1.06, 1], rotate: [0, -4, 3, -2, 0] } : undefined} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} style={{ originY: 1 }}>
        <Flame size={size} lit={lit} />
      </motion.span>
      <Ticker value={days} />
    </span>
  );
}

export function XpChip({ xp }: { xp: number }) {
  return <span className="flex items-center gap-1 font-display font-bold text-sky-dark" title="Total XP"><Gem size={22} /><Ticker value={xp} /></span>;
}
