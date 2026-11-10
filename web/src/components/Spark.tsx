'use client';
import { motion } from 'motion/react';
import { useId } from 'react';

/** Animated sparkline (draws itself in). */
export function Spark({ values, width = 120, height = 36, className = '', stroke }: { values: number[]; width?: number; height?: number; className?: string; stroke?: string }) {
  const id = useId();
  if (values.length < 2) return <div style={{ width, height }} className={className} />;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 2 - ((v - min) / span) * (height - 4)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const up = values[values.length - 1]! >= values[0]!;
  const c = stroke ?? (up ? 'var(--color-up)' : 'var(--color-down)');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden preserveAspectRatio="none">
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={c} stopOpacity=".28" /><stop offset="1" stopColor={c} stopOpacity="0" /></linearGradient></defs>
      <motion.path d={`${d}L${width},${height}L0,${height}Z`} fill={`url(#${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }} />
      <motion.path d={d} fill="none" stroke={c} strokeWidth="1.6" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
      <motion.circle cx={pts[pts.length - 1]![0]} cy={pts[pts.length - 1]![1]} r="2.6" fill={c} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.95 }} />
    </svg>
  );
}
