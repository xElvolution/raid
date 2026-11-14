'use client';
/** Small crafted product fragments for the landing page (instead of full screenshots). */
import { motion } from 'motion/react';
import { Check, Flame, Lock } from 'lucide-react';
import { Identicon, CoinAvatar } from '../ui';
import { fmtPrice } from '@/lib/market';
import type { Quote } from '@/lib/coins';

const pop = { initial: { opacity: 0, y: 14, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { type: 'spring' as const, stiffness: 380, damping: 26 } };

export function CallVisual({ q }: { q?: Quote }) {
  return (
    <motion.div {...pop} className="w-[16.875rem] rounded-[20px] bg-[#0b0b0d] p-3 md:p-4 text-white shadow-[0_30px_60px_-20px_rgb(0_0_0/.6)]">
      <div className="flex items-center gap-2.5"><CoinAvatar symbol="PEPE" image={q?.image} size={32} /><div><p className="wide text-[0.9375rem]">$PEPE</p><p className="mono text-[10.5px] text-white/60">{fmtPrice(q?.priceUsd)}</p></div><span className="chip chip-lime ml-auto"><span className="live-dot" />Crew</span></div>
      <div className="mt-4 grid grid-cols-3 gap-1.5">{['1.5x', '2x', '3x'].map((x, i) => <span key={x} className={`grid h-11 place-items-center rounded-[13px] wide-black text-[1.0625rem] ${i === 0 ? 'bg-lime text-[#1c0900]' : 'bg-white/8 text-white/70'}`}>{x}</span>)}</div>
      <div className="mt-3 flex h-10 items-center justify-center rounded-[13px] bg-[#24252b] text-[13px] font-semibold">Call this raid</div>
    </motion.div>
  );
}
export function CrewVisual() {
  const seeds = ['ada.near', 'kemi.near', 'tunde.near', 'zara.near', 'leo.near'];
  return (
    <motion.div {...pop} className="w-[16.875rem] rounded-[20px] bg-[#0b0b0d] p-3 md:p-4 text-white shadow-[0_30px_60px_-20px_rgb(0_0_0/.6)]">
      <div className="flex -space-x-2">{seeds.map((s, i) => <motion.span key={s} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 + i * 0.08 }}><Identicon seed={s} size={34} className="ring-2 ring-[#0b0b0d]" /></motion.span>)}</div>
      <p className="eyebrow mt-4 !text-white/60">Crew pot</p>
      <div className="mt-1 flex items-end gap-1.5"><span className="wide-black text-[2.0rem] leading-none md:text-[40px]">250</span><span className="wide text-[12px] pb-1">USDC</span></div>
      <div className="mt-3 flex gap-[3px]">{Array.from({ length: 10 }, (_, i) => <motion.span key={i} className={`h-2.5 flex-1 rounded-[2px] ${i < 7 ? 'bg-white' : 'shadow-[inset_0_0_0_1px_rgb(255_255_255/.3)]'}`} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.3 + i * 0.04 }} />)}</div>
      <p className="mono mt-2 text-[10px] text-white/50">illustration</p>
    </motion.div>
  );
}
export function KeylessVisual() {
  const rows = ['1Click signature', 'Recipient = chest', 'Min-out ≥ line', 'Quote fresh < 10 min'];
  return (
    <motion.div {...pop} className="w-[16.875rem] rounded-[20px] bg-[#0b0b0d] p-3 md:p-4 text-white shadow-[0_30px_60px_-20px_rgb(0_0_0/.6)]">
      <div className="flex items-center gap-2"><Lock size={15} className="text-lime" /><p className="wide text-[13px]">Chest checks</p></div>
      <ul className="mt-3 space-y-2">{rows.map((r, i) => (
        <motion.li key={r} className="flex items-center gap-2.5 text-[12.5px]" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12 }}>
          <motion.span className="grid h-5 w-5 place-items-center rounded-full bg-lime text-[#1c0900]" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.12, type: 'spring', stiffness: 500 }}><Check size={12} strokeWidth={3.5} /></motion.span>{r}
        </motion.li>
      ))}</ul>
      <p className="mono mt-3 text-[10px] text-white/50">ed25519 · NEAR Intents · Chain Signatures</p>
    </motion.div>
  );
}
export function HitVisual() {
  return (
    <motion.div {...pop} className="relative w-[16.875rem] overflow-hidden rounded-[20px] bg-[#0b0b0d] p-3 md:p-4 text-white shadow-[0_30px_60px_-20px_rgb(0_0_0/.6)]">
      <svg viewBox="0 0 240 80" className="h-20 w-full"><motion.path d="M0,70 L30,64 L60,66 L90,52 L120,55 L150,38 L180,30 L210,18 L240,8" fill="none" stroke="#fff" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1 }} /><line x1="0" x2="240" y1="20" y2="20" stroke="#ff5a1f" strokeDasharray="5 4" strokeWidth="1.5" /></svg>
      <motion.p className="wide-black text-[2.0rem] leading-none text-lime md:text-[34px]" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.9, type: 'spring', stiffness: 400, damping: 14 }}>LINE HIT</motion.p>
      <div className="mt-3 flex items-center gap-2 text-[12px] text-white/70"><Flame size={14} className="text-[#ffc23d]" />Backers net +45% at a 1.5x line</div>
    </motion.div>
  );
}
