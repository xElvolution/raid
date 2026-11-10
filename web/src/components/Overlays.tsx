'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { calledIt, onCelebration, onWin, onXp, type Celebration, type Win } from '@/lib/fx';
import { Mark } from './Brand';
import { Button, Ticker } from './ui';

/** Floating "+10 XP" pop-ups and full-screen celebrations (league promotion, streaks, Daily 5). */
export function Overlays() {
  const [pops, setPops] = useState<{ id: number; amount: number; label?: string }[]>([]);
  const [cel, setCel] = useState<Celebration | null>(null);
  useEffect(() => onXp((amount, label) => {
    const id = Date.now() + Math.random();
    setPops((p) => [...p, { id, amount, label }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 1600);
  }), []);
  useEffect(() => onCelebration(setCel), []);
  const [win, setWin] = useState<(Win & { id: number }) | null>(null);
  useEffect(() => onWin((w) => {
    const id = Date.now();
    setWin({ ...w, id });
    setTimeout(() => setWin((cur) => (cur?.id === id ? null : cur)), 9000);
  }), []);
  useEffect(() => { // demo hook: /app/...?calledit=1 shows the win screen
    if (new URLSearchParams(location.search).get('calledit') === '1') setTimeout(() => calledIt({ amount: 42.5, question: 'Will Arsenal finish in the Premier League top 4?' }), 400);
  }, []);
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex flex-col items-center gap-2" aria-live="polite">
        <AnimatePresence>
          {pops.map((p) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 30, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: [0.6, 1.15, 1] }} exit={{ opacity: 0, y: -40 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="cuts flex items-center gap-2 bg-grape px-4 h-10 text-white">
              <span className="cd text-[22px]">+{p.amount} XP</span> {p.label && <span className="text-[13px] text-white/75">{p.label}</span>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {win && (
          <motion.div key={win.id} className="fixed inset-0 z-[80] overflow-hidden bg-grape text-white"
            initial={{ clipPath: 'polygon(0 0, 0 0, -30% 100%, -30% 100%)' }} animate={{ clipPath: 'polygon(0 0, 130% 0, 100% 100%, -30% 100%)' }} exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.7, 0, 0.2, 1] }} role="status" aria-live="assertive">
            {/* The wall: repeating display type, alternate rows drift in opposite directions. */}
            <div aria-hidden className="absolute inset-[-10%] flex -rotate-[8deg] flex-col justify-center gap-0">
              {Array.from({ length: 11 }, (_, r) => (
                <motion.div key={r} className="cd flex whitespace-nowrap text-[86px] leading-[.86]"
                  initial={{ x: r % 2 ? '-30%' : '0%', opacity: 0 }} animate={{ x: r % 2 ? '0%' : '-30%', opacity: 1 }}
                  transition={{ x: { duration: 14, ease: 'linear' }, opacity: { delay: 0.12 + r * 0.04, duration: 0.2 } }}>
                  {Array.from({ length: 6 }, (_, k) => (
                    <span key={k} className="pr-5" style={(r + k) % 2 ? { color: 'transparent', WebkitTextStroke: '2px rgba(255,255,255,.55)' } : { color: r === 5 ? '#fff' : 'rgba(255,255,255,.92)' }}>CALLED IT</span>
                  ))}
                </motion.div>
              ))}
            </div>
            <div className="relative flex h-full items-center justify-center px-5">
              <motion.div initial={{ y: 60, scale: 0.9, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.55 }}
                className="cuts w-full max-w-[350px] bg-bg text-ink">
                <div className="flex items-center justify-between bg-[#000] px-3 h-9 text-white">
                  <span className="cd text-[18px] tracking-[.1em]">Full time</span>
                  <span className="mn text-[11px] font-bold text-mint">● SETTLED</span>
                </div>
                <div className="p-4">
                  {(win.label || win.question) && <p className="text-[15px] font-semibold leading-snug">{win.label ?? win.question}</p>}
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="mn text-[11px] text-mute">YOU CALLED IT</div>
                      <h2 className="cd mt-0.5 flex text-[56px] leading-[.85] text-grape" aria-label="Called it">
                        {'CALLED IT'.split('').map((ch, k) => (
                          <motion.span key={k} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 22, delay: 0.75 + k * 0.04 }} className={ch === ' ' ? 'w-3' : ''}>{ch}</motion.span>
                        ))}
                      </h2>
                    </div>
                    <motion.svg initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.9 }} viewBox="0 0 24 24" className="h-12 w-12 bg-mint p-2" fill="none" stroke="#000" strokeWidth={3.2} strokeLinecap="square"><path d="M4 12.5l5 5L20 6.5" /></motion.svg>
                  </div>
                  {win.amount !== undefined && (
                    <div className="mt-4 flex items-baseline justify-between border-t-2 border-line pt-3">
                      <span className="mn text-[11px] text-mute">PAYOUT</span>
                      <span className="cd text-[52px] leading-none text-mint">+<Ticker value={win.amount} from={0} prefix="$" decimals={2} /></span>
                    </div>
                  )}
                  <div className="mt-4 grid grid-cols-2 gap-1.5">
                    <button onClick={() => { void navigator.share?.({ title: 'I called it', text: `I called it on ${win.question ?? 'Called'}` }).catch(() => {}); }}
                      className="press cuts cd h-12 bg-grape text-[22px] text-white">Share</button>
                    <button onClick={() => setWin(null)} className="press cut-tr cd h-12 bg-snow text-[22px] text-ink">Continue</button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {cel && (
          <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#07080b]/95 backdrop-blur-xl px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="relative flex flex-col items-center text-center text-white gap-4 max-w-sm" initial={{ scale: 0.6, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
              <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 420, damping: 15 }}><Mark size={96} /></motion.div>
              <h2 className="text-3xl font-bold tracking-tight">{cel.title}</h2>
              <p className="text-mute text-base">{cel.body}</p>
              <Button tone="white" size="lg" className="w-64 mt-2 !bg-[#fff] !text-black !border-0" onClick={() => setCel(null)}>Continue</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
