'use client';
import { motion } from 'motion/react';
import { useId } from 'react';

/** Odds sparkline. Real price history only; renders flat when there is not enough data yet. */
export function Sparkline({ data: input, width = 300, height = 72, thin, color }: { data: number[]; width?: number; height?: number; thin?: boolean; color?: string }) {
  const gid = useId();
  const data = input.length < 2 ? [input[0] ?? 0.5, input[0] ?? 0.5] : input;
  const lo = Math.min(...data), hi = Math.max(...data), pad = Math.max(0.02, (hi - lo) * 0.15);
  const min = lo - pad, max = hi + pad;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - ((v - min) / (max - min || 1)) * height] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const up = (data[data.length - 1] ?? 0) >= (data[0] ?? 0);
  const c = color ?? (up ? 'var(--color-mint)' : 'var(--color-coral)');
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" className="overflow-visible" preserveAspectRatio="none" aria-hidden>
      <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={c} stopOpacity=".08" /><stop offset="1" stopColor={c} stopOpacity="0" /></linearGradient></defs>
      {!thin && <motion.path d={`${d}L${width},${height}L0,${height}Z`} fill={`url(#${gid})`} initial={{ opacity: 0 }} animate={{ opacity: 1, d: `${d}L${width},${height}L0,${height}Z` }} transition={{ duration: 0.6 }} />}
      <motion.path d={d} stroke={c} strokeWidth={thin ? 1.25 : 1.75} fill="none" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1, d }} transition={{ duration: 0.9, ease: 'easeOut' }} />
      {!thin && last && <circle cx={last[0]} cy={last[1]} r="3" fill={c} vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
