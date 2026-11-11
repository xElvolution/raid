'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { hits, type Hit } from '@/lib/bus';
import { Mark } from './Brand';
import { CountUp } from './ui';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export function burst() {
  if (reduced()) return;
  const C = ['#c6ff3d', '#ffffff', '#3355ff', '#ffc23d'];
  void confetti({ particleCount: 120, spread: 100, startVelocity: 46, origin: { y: 0.5 }, colors: C, shapes: ['square'], scalar: 1.1, ticks: 220, zIndex: 120 });
  setTimeout(() => void confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, colors: C, shapes: ['square'], zIndex: 120 }), 220);
  setTimeout(() => void confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors: C, shapes: ['square'], zIndex: 120 }), 380);
}

/** Full-screen "LINE HIT" moment when a raid you're watching settles above its line. */
export function RaidHitOverlay() {
  const [h, setH] = useState<Hit | null>(null);
  useEffect(() => hits.on((x) => { setH(x); setTimeout(burst, 350); }), []);
  return (
    <AnimatePresence>
      {h && (
        <motion.div className="cobalt-field fixed inset-0 z-[90] overflow-hidden" initial={{ clipPath: 'inset(50% 0 50% 0)' }} animate={{ clipPath: 'inset(0% 0 0% 0)' }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: [0.7, 0, 0.2, 1] }} role="status" aria-live="assertive">
          <div className="dots absolute inset-0" />
          <motion.div className="absolute left-0 right-0 top-1/2 h-[3px] bg-lime" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.35, duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
          <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
            {h.preview && <span className="chip chip-lime absolute top-6">Preview · not a real raid</span>}
            <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.2 }}><Mark size={56} /></motion.div>
            <p className="eyebrow mt-6 !text-white/70">Raid #{h.id} · ${h.symbol}</p>
            <h2 className="wide-black mt-3 text-[54px] sm:text-[72px] md:text-[120px] leading-[.86]" aria-label="Line hit">
              {['LINE', 'HIT'].map((w, wi) => (
                <span key={w} className="block whitespace-nowrap">
                  {w.split('').map((ch, i) => <motion.span key={i} className="inline-block" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 + (wi * 4 + i) * 0.04, type: 'spring', stiffness: 500, damping: 22 }}>{ch}</motion.span>)}
                </span>
              ))}
            </h2>
            <motion.p className="wide-black mt-4 text-[44px] md:text-[64px] text-lime" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>{h.multiple}</motion.p>
            {h.profitUsd !== undefined && <p className="mono mt-2 text-[18px]">+<CountUp value={h.profitUsd} format={(n) => `$${n.toFixed(2)}`} /> crew profit</p>}
            <p className="mt-4 max-w-[36ch] text-[14px] text-white/75">The chest sold at the line. Backers keep 90% of the profit. The caller’s locked fee is released.</p>
            <button onClick={() => setH(null)} className="press mt-8 h-12 rounded-[12px] bg-white px-8 font-semibold text-[#0b1fd1]">Collect</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
