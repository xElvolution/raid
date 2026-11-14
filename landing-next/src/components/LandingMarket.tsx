'use client';
/* eslint-disable @next/next/no-img-element -- remote market art */
import type { Market } from '@called/sdk';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { compactUsd } from '@/lib/markets';

/** Real market card: odds count up on mount and flash when a live update arrives. */
export function LandingMarket({ m, p, compact = false }: { m: Market; p: number; compact?: boolean }) {
  const prev = useRef(p);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    if (p !== prev.current) { setFlash(p > prev.current ? 'up' : 'down'); prev.current = p; const t = setTimeout(() => setFlash(null), 900); return () => clearTimeout(t); }
  }, [p]);
  const labels = m.outcomes ?? ['Yes', 'No'];
  return (
    <div className={`card3d ${compact ? 'p-3' : 'p-4'} text-left bg-[#0e0f13]/90 backdrop-blur-xl shadow-[0_30px_60px_-20px_rgba(0,0,0,.8),0_0_0_1px_rgba(255,255,255,.04)]`}>
      <div className="flex items-center gap-2 mb-2">
        {m.image_url ? <img src={m.image_url} alt="" className="h-8 w-8 rounded-lg object-cover" /> : <span className="h-8 w-8 rounded-lg bg-grape-light" />}
        <span className="text-xs font-semibold text-mute">{m.venue === 'called' ? 'Called' : 'Polymarket'} · {compactUsd(m.volume_24h ?? m.volume)} 24h</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-mint-dark"><span className="h-1.5 w-1.5 rounded-full bg-mint animate-ping" />LIVE</span>
      </div>
      <p className={`font-semibold leading-snug ${compact ? 'text-sm line-clamp-2' : 'text-base line-clamp-2'} mb-2`}>{m.question}</p>
      {(['mint', 'coral'] as const).map((tone, i) => {
        const v = i ? 1 - p : p;
        return (
          <div key={tone} className={`relative ${compact ? 'h-7' : 'h-8'} rounded-md overflow-hidden mb-1.5 bg-snow`}>
            <motion.div className={`absolute inset-y-0 left-0 ${tone === 'mint' ? 'bg-mint-light shadow-[inset_2px_0_0_var(--color-mint)]' : 'bg-coral-light shadow-[inset_2px_0_0_var(--color-coral)]'}`} initial={{ width: 0 }} whileInView={{ width: `${v * 100}%` }} viewport={{ once: true }} animate={{ width: `${v * 100}%` }} transition={{ type: 'spring', stiffness: 70, damping: 15 }} />
            <div className="relative h-full flex items-center justify-between px-2.5 text-xs font-semibold">
              <span className="text-ink truncate max-w-[65%]">{labels[i]}</span>
              <motion.span key={Math.round(v * 1000)} initial={flash ? { scale: 1.5 } : false} animate={{ scale: 1 }} className={`tabular-nums ${tone === 'mint' ? 'text-mint' : 'text-coral'}`}>{Math.round(v * 100)}%</motion.span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
