'use client';
/**
 * The hero scene: one raid playing out on a loop. Crew fills the chest, the public countdown runs, the chest buys,
 * the price rides up to the dashed sell line, the lid opens. Pure illustration of the rules (it says so on screen);
 * the payout figure is the real contract math at a 2x line (backers keep 90% of profit).
 */
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { ChromeChest, ease } from '../Chrome';
import { payoutAtLine } from '@/lib/raid';

const PHASES = ['Crew forming', 'Public countdown', 'Chest bought', 'Riding to the line', 'Line hit'] as const;
const DUR = [2600, 2200, 1400, 2600, 3200];
// path in a 600x260 box: flat-ish, then a climb that breaks the line at y=70
const PATH = 'M0,205 C40,200 70,212 110,198 S170,190 200,196 S250,178 290,170 S340,150 370,142 S420,118 450,104 S500,84 530,66 S575,40 600,30';
const out = payoutAtLine(100, 20000, 250, 750);

export function RaidScene({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduce = useReducedMotion();
  const [p, setP] = useState(reduce ? 4 : 0);
  const [loop, setLoop] = useState(0);
  const [clock, setClock] = useState(600);
  useEffect(() => {
    if (reduce || !inView) return;
    const t = setTimeout(() => { if (p === 4) { setP(0); setClock(600); setLoop((l) => l + 1); } else setP(p + 1); }, DUR[p]);
    return () => clearTimeout(t);
  }, [p, inView, reduce]);
  useEffect(() => {
    if (p !== 1) return;
    const t = setInterval(() => setClock((c) => Math.max(0, c - 13)), 50);
    return () => clearInterval(t);
  }, [p]);
  const fill = p === 0 ? 0.62 : p >= 1 ? 0.78 : 0.2;
  const drawn = p < 2 ? 0 : p === 2 ? 0.45 : 1;
  return (
    <div ref={ref} className={`relative overflow-hidden rounded-[28px] md:rounded-[36px] panel ${className}`}>
      <div className="dots-ink absolute inset-0 opacity-60 [mask-image:radial-gradient(70%_70%_at_50%_45%,#000,transparent)]" />
      <div className="relative grid min-h-[25rem] md:min-h-[480px] md:grid-cols-[1fr_1.2fr]">
        {/* chest side */}
        <div className="relative grid place-items-center pt-10 md:pt-0">
          <ChromeChest key={loop} size={230} open={p === 4} fill={fill} className="max-md:w-[190px]" />
          <AnimatePresence>
            {p === 4 && Array.from({ length: 9 }, (_, i) => (
              <motion.span key={`${loop}-${i}`} className="absolute left-1/2 top-[38%] h-3.5 w-3.5 rounded-full chrome shadow-[0_2px_4px_rgb(0_0_0/.25)]"
                initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }} animate={{ x: (i - 4) * 26, y: [-10, -90 - (i % 3) * 30, 40], scale: 1, opacity: [0, 1, 0] }} transition={{ duration: 1.6, delay: 0.25 + i * 0.04, ease }} />
            ))}
          </AnimatePresence>
          <div className="absolute left-4 top-4 md:left-6 md:top-6">
            <p className="eyebrow">How a raid plays out</p>
            <AnimatePresence mode="wait">
              <motion.p key={p} className="mt-1.5 flex items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] md:text-[17px]" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ duration: 0.3, ease }}>
                <span className={`h-2 w-2 rounded-full ${p === 4 ? 'bg-up' : 'bg-signal signal-pulse'}`} />{PHASES[p]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        {/* chart side */}
        <div className="relative px-4 pb-5 md:px-8 md:py-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Public countdown</p>
              <p className="mono mt-1 text-[22px] font-semibold tabular-nums md:text-[28px]">{String(Math.floor(clock / 60)).padStart(2, '0')}:{String(clock % 60).padStart(2, '0')}</p>
            </div>
            <div className="text-right">
              <p className="eyebrow">Sell line</p>
              <p className="mt-1 text-[22px] font-semibold tracking-[-0.04em] text-lime md:text-[28px]">2x</p>
            </div>
          </div>
          <div className="relative mt-3 md:mt-5">
            <svg viewBox="0 0 600 260" className="h-[150px] w-full md:h-[250px]" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="scene-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--color-signal)" stopOpacity=".22" /><stop offset="1" stopColor="var(--color-signal)" stopOpacity="0" /></linearGradient>
              </defs>
              {[60, 120, 180, 240].map((y) => <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="var(--color-line)" strokeWidth="1" />)}
              <line x1="0" x2="600" y1="70" y2="70" stroke="var(--color-signal)" strokeWidth="2" className="line-dash" vectorEffect="non-scaling-stroke" />
              <line x1="0" x2="600" y1="196" y2="196" stroke="var(--color-faint)" strokeWidth="1" strokeDasharray="2 5" vectorEffect="non-scaling-stroke" />
              <motion.path key={`a${loop}`} d={`${PATH} L600,260 L0,260 Z`} fill="url(#scene-area)" initial={{ opacity: 0 }} animate={{ opacity: drawn ? 1 : 0 }} transition={{ duration: 1.2 }} />
              <motion.path key={`l${loop}`} d={PATH} fill="none" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: drawn }} transition={{ duration: p === 2 ? 1.2 : 2.4, ease }} />
            </svg>
            <span className="absolute right-0 top-[22%] -translate-y-full rounded-full btn-signal px-2.5 py-1 text-[10.5px] font-semibold mono md:top-[24%]">SELL 2x</span>
            <span className="absolute left-0 top-[71%] rounded-full bg-raised px-2 py-0.5 text-[10px] mono text-mute md:top-[73%]">ENTRY</span>
            <AnimatePresence>
              {p === 4 && (
                <motion.div className="absolute right-2 top-[30%] rounded-[16px] obsidian px-3.5 py-2.5 md:right-6" initial={{ scale: 0.6, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 18 }}>
                  <p className="eyebrow">100 in, at the 2x line</p>
                  <p className="mono mt-1 text-[20px] font-semibold text-[#ff7a40]">+{out.gain.toFixed(1)} USDC</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <ol className="mt-3 grid grid-cols-5 gap-1.5 md:mt-5">
            {PHASES.map((x, i) => (
              <li key={x} className="min-w-0">
                <div className="h-1 overflow-hidden rounded-full bg-raised">
                  <motion.div className={`h-full rounded-full ${i === 4 && p === 4 ? 'bg-signal' : 'bg-ink'}`} initial={false} animate={{ width: i < p ? '100%' : i === p ? '100%' : '0%' }} transition={{ duration: i === p ? DUR[i]! / 1000 : 0.3, ease: 'linear' }} />
                </div>
                <p className={`mt-1.5 truncate text-[10px] md:text-[11px] ${i === p ? 'text-ink font-medium' : 'text-faint'}`}>{x}</p>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[10.5px] text-faint">Illustration of the rules. Live raids read straight from the chest contract below.</p>
        </div>
      </div>
    </div>
  );
}
