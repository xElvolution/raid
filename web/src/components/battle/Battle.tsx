'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Bug, Countdown, LiveBug, Scoreboard } from '../bc';
import { useLive } from '@/lib/live-hooks';
import { Arena, SCORE_WORD, themeFor, type Theme } from './engine';

const SOUND_KEY = 'called.battle.sound';
const LABEL: Record<Theme, [string, string]> = {
  football: ['Yes XI', 'No XI'], crypto: ['Bulls', 'Bears'], gta: ['Yes crew', 'No crew'], f1: ['Yes grid', 'No grid'], boxing: ['Yes corner', 'No corner'], movies: ['Yes crew', 'Critics'], space: ['Rockets', 'Saucers'], music: ['Yes fans', 'No fans'], tech: ['Yes bots', 'No bots'], weather: ['Sun', 'Storm'], arena: ['Yes', 'No'],
};
const CONTEXT: Record<Theme, string> = {
  football: 'Matchday', crypto: 'Market open', gta: 'Street race', f1: 'Race', boxing: 'Round 1', movies: 'Opening night', space: 'Launch window', music: 'Stage battle', tech: 'Bot battle', weather: 'Forecast', arena: 'Arena',
};

/**
 * Live battle over a market. Territory follows the odds, trades fire attacks, big trades hit hard.
 * `simulate` adds a demo order flow weighted by the odds so the arena is never idle on preview.
 */
export function Battle({ marketId, p, category, question, mini, simulate = true, avatars = [], image, className = '', closeTs, tag, scoreboard = true, height }: {
  marketId: string; p: number; category?: string | null; question?: string; mini?: boolean; simulate?: boolean;
  avatars?: { side: 0 | 1; url: string }[]; image?: string | null; className?: string;
  /** Shows a countdown tag top-right. */ closeTs?: string | null;
  /** Overlay tag top-left on mini cards, e.g. "KEMI YES · $20". */ tag?: ReactNode;
  scoreboard?: boolean; height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const arena = useRef<Arena | null>(null);
  const visible = useRef(false);
  const soundOn = useRef(false);
  const theme = themeFor(category, question);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [burst, setBurst] = useState<{ id: number; side: 0 | 1 } | null>(null);
  const [sound, setSound] = useState(false);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    soundOn.current = !mini && localStorage.getItem(SOUND_KEY) === '1';
    queueMicrotask(() => setSound(soundOn.current));
    const a = new Arena(c, {
      theme, mini, backdrop: !!image, sound: () => soundOn.current && visible.current,
      onScore: (s, side) => { setScore(s); setBurst({ id: Date.now(), side }); }
    });
    arena.current = a;
    a.resize(); a.setOdds(p);
    const ro = new ResizeObserver(() => a.resize()); ro.observe(c);
    const io = new IntersectionObserver(([e]) => { visible.current = !!e?.isIntersecting; if (visible.current) a.start(); else a.stop(); }, { threshold: 0.2 });
    io.observe(c);
    return () => { ro.disconnect(); io.disconnect(); a.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, mini, image]);

  useEffect(() => { arena.current?.setOdds(p); }, [p]);
  useEffect(() => { if (avatars.length) arena.current?.setAvatars(avatars); }, [avatars]);

  useLive(`market:${marketId}`, (e) => {
    if (e.type !== 'trade') return;
    arena.current?.attack(e.data.outcome ? 1 : 0, Number(e.data.amount) / 1e6);
  });

  // Demo order flow: volume leans to the favourite, sizes are long-tailed so big hits are rare.
  useEffect(() => {
    if (!simulate) return;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (visible.current) {
        const side = (Math.random() < (arena.current ? p : 0.5) ? 1 : 0) as 0 | 1;
        const amt = Math.exp(Math.random() * 4.6);
        arena.current?.attack(side, amt);
      }
      t = setTimeout(tick, (mini ? 1600 : 1100) + Math.random() * 2200);
    };
    t = setTimeout(tick, 600 + Math.random() * 900);
    return () => clearTimeout(t);
  }, [simulate, mini, p]);

  const [yes, no] = LABEL[theme];
  const h = height ?? (mini ? 124 : 270);
  return (
    <div className={`relative overflow-hidden bg-panel ${className}`} style={{ viewTransitionName: `battle-${marketId}` }}>
      <div className="relative" style={{ height: h }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-label={`Live battle: ${yes} versus ${no}`} role="img" />
        <div className={`pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between ${mini ? 'p-2' : 'p-2.5'}`}>
          <div className="flex gap-1">
            {tag ?? (<><LiveBug />{!mini && <Bug tone="black">{CONTEXT[theme]}</Bug>}</>)}
          </div>
          {closeTs && !mini && <Countdown to={closeTs} />}
        </div>
        <AnimatePresence>
          {burst && !mini && (
            <motion.div key={burst.id} className="pointer-events-none absolute inset-0 grid place-items-center"
              initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 1.05, times: [0, 0.08, 0.7, 1] }} onAnimationComplete={() => setBurst(null)}>
              <motion.span initial={{ scale: 2.2, rotate: -10, x: burst.side ? -30 : 30 }} animate={{ scale: 1, rotate: -6, x: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 20 }}
                className={`cd px-3 pt-1 text-[54px] ${burst.side ? 'bg-mint' : 'bg-coral'} text-[#000]`}>{SCORE_WORD[theme]}{theme === 'football' ? '!' : ''}</motion.span>
            </motion.div>
          )}
        </AnimatePresence>
        {!mini && (
          <button onClick={() => { soundOn.current = !soundOn.current; setSound(soundOn.current); localStorage.setItem(SOUND_KEY, soundOn.current ? '1' : '0'); }}
            aria-label={sound ? 'Mute battle' : 'Unmute battle'} className="press absolute right-2.5 bottom-2.5 grid h-8 w-8 place-items-center bg-[#000] text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4z" />{sound ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m22 9-6 6M16 9l6 6" />}</svg>
          </button>
        )}
      </div>
      {scoreboard && <Scoreboard p={p} yes={yes} no={no} size={mini ? 'sm' : 'lg'} />}
    </div>
  );
}
