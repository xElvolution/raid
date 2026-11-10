'use client';
import { motion } from 'motion/react';
import type { Division } from '@/lib/gamification';

/** Shield-shaped league badge, tier-colored, with a shine sweep when active. */
export function LeagueBadge({ d, size = 64, active = false, locked = false }: { d: Division; size?: number; active?: boolean; locked?: boolean }) {
  const tier = ['Bronze', 'Silver', 'Gold', 'Sapphire', 'Ruby', 'Diamond'].indexOf(d.name);
  return (
    <motion.svg width={size} height={size * 1.12} viewBox="0 0 64 72" aria-label={`${d.name} league`} role="img"
      animate={active ? { y: [0, -4, 0] } : undefined} transition={{ duration: 2, repeat: Infinity }} style={{ filter: locked ? 'grayscale(1) opacity(.45)' : undefined }}>
      <defs><clipPath id={`clip-${d.name}`}><path d="M32 3 58 12v22c0 17-11 29-26 35C17 63 6 51 6 34V12z" /></clipPath></defs>
      <path d="M32 7 58 16v22c0 17-11 29-26 35C17 67 6 55 6 38V16z" fill={d.edge} />
      <path d="M32 3 58 12v22c0 17-11 29-26 35C17 63 6 51 6 34V12z" fill={d.color} />
      <path d="M32 11 50 17v16c0 12-8 21-18 25-10-4-18-13-18-25V17z" fill="#fff" opacity=".22" />
      {Array.from({ length: Math.min(3, tier + 1) }).map((_, i) => (
        <path key={i} transform={`translate(${(i - (Math.min(3, tier + 1) - 1) / 2) * 13} 0)`} d="M32 26l3 6.5 7 .8-5.2 4.8 1.4 7-6.2-3.6-6.2 3.6 1.4-7-5.2-4.8 7-.8z" fill="#fff" />
      ))}
      {tier >= 3 && <path d="M20 52h24" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".8" />}
      {active && (
        <g clipPath={`url(#clip-${d.name})`}>
          <motion.rect y="-10" width="14" height="100" fill="#fff" opacity=".45" transform="rotate(20)" initial={{ x: -40 }} animate={{ x: 90 }} transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.6 }} />
        </g>
      )}
    </motion.svg>
  );
}
