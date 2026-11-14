'use client';
/**
 * Calli v2: Called's own mascot, a round grape "oracle" with a star antenna.
 * Rich SVG + motion: idle breathing, blinking, antenna sway, and mood reactions.
 */
import { motion, useReducedMotion } from 'motion/react';
import { useId } from 'react';

export type Mood = 'happy' | 'thinking' | 'cheer' | 'sad' | 'wink' | 'wow';

export function Calli({ size = 96, mood = 'happy', react = 0, className = '', idle = true }: { size?: number; mood?: Mood; react?: number; className?: string; idle?: boolean }) {
  const id = useId().replace(/:/g, '');
  const still = useReducedMotion() || !idle;
  const jump = mood === 'cheer' || mood === 'wow';
  const look = mood === 'thinking' ? { x: 3, y: -4 } : mood === 'sad' ? { x: 0, y: 3 } : { x: 0, y: 0 };
  return (
    <motion.svg viewBox="0 0 140 150" width={size} height={size * (150 / 140)} className={className} role="img" aria-label={`Calli, ${mood}`}
      key={react} initial={react ? { scale: 0.9, y: 0 } : false}
      animate={still ? undefined : jump ? { y: [0, -14, 0, -6, 0] } : { y: 0, scale: 1 }}
      transition={jump ? { duration: 0.9, repeat: Infinity, repeatDelay: 0.6, ease: 'easeOut' } : { type: 'spring', stiffness: 400, damping: 12 }}>
      <defs>
        <radialGradient id={`b${id}`} cx="40%" cy="30%" r="75%"><stop offset="0" stopColor="#a585ff" /><stop offset=".6" stopColor="#7c4dff" /><stop offset="1" stopColor="#5b2ed9" /></radialGradient>
        <radialGradient id={`s${id}`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff6c9" /><stop offset="1" stopColor="#ffc83d" /></radialGradient>
      </defs>
      <ellipse cx="70" cy="144" rx="34" ry="5" fill="#2b2340" opacity=".1" />
      {/* antenna */}
      <motion.g style={{ originX: '70px', originY: '40px' }} animate={still ? undefined : { rotate: mood === 'sad' ? [8, 12, 8] : [-8, 8, -8] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
        <path d="M70 42 C70 30 74 22 80 16" stroke="#5b2ed9" strokeWidth="5" fill="none" strokeLinecap="round" />
        <motion.path d="M81 2 l4 9 10 1-7.5 6.5 2.5 10-9-5.5-9 5.5 2.5-10-7.5-6.5 10-1z" fill={`url(#s${id})`} stroke="#e5a500" strokeWidth="1.5" strokeLinejoin="round"
          animate={still ? undefined : { scale: [1, 1.15, 1], rotate: [0, 12, 0] }} transition={{ duration: 1.8, repeat: Infinity }} style={{ originX: '81px', originY: '15px' }} />
      </motion.g>
      {/* arms */}
      <motion.path d="M24 88 q-16 -6 -14 -22" stroke="#5b2ed9" strokeWidth="9" fill="none" strokeLinecap="round"
        animate={{ d: jump ? 'M26 80 q-18 -14 -8 -34' : mood === 'sad' ? 'M24 92 q-10 10 -6 22' : 'M24 92 q-14 6 -10 22' }} />
      <motion.path d="M116 88 q16 -6 14 -22" stroke="#5b2ed9" strokeWidth="9" fill="none" strokeLinecap="round"
        animate={{ d: jump ? 'M114 80 q18 -14 8 -34' : mood === 'thinking' ? 'M114 92 q-4 -8 -20 -2' : mood === 'sad' ? 'M116 92 q10 10 6 22' : 'M116 92 q14 6 10 22' }} />
      {/* body with breathing */}
      <motion.g style={{ originX: '70px', originY: '140px' }} animate={still ? undefined : { scaleY: [1, 1.035, 1], scaleX: [1, 0.985, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
        <path d="M70 38 C104 38 124 62 124 94 C124 124 102 140 70 140 C38 140 16 124 16 94 C16 62 36 38 70 38Z" fill={`url(#b${id})`} />
        <ellipse cx="70" cy="110" rx="34" ry="24" fill="#fff" opacity=".18" />
        <ellipse cx="50" cy="56" rx="14" ry="7" fill="#fff" opacity=".25" transform="rotate(-25 50 56)" />
        {/* cheeks */}
        <circle cx="38" cy="100" r="7" fill="#ff5c6c" opacity=".35" />
        <circle cx="102" cy="100" r="7" fill="#ff5c6c" opacity=".35" />
        {/* eyes */}
        {[50, 90].map((cx, i) => (
          <g key={cx}>
            <ellipse cx={cx} cy="82" rx="14" ry="16" fill="#fff" />
            {mood === 'wink' && i === 1 ? (
              <path d="M78 84 q12 -10 24 0" stroke="#2b2340" strokeWidth="5" fill="none" strokeLinecap="round" />
            ) : (
              <motion.g animate={look} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
                <circle cx={cx + 1} cy="84" r={mood === 'wow' ? 6 : 8} fill="#2b2340" />
                <circle cx={cx + 4} cy="80" r="3" fill="#fff" />
              </motion.g>
            )}
            {/* blinking lid */}
            {!(mood === 'wink' && i === 1) && (
              <motion.rect x={cx - 15} y="65" width="30" height="34" rx="14" fill="#7c4dff" style={{ originY: '65px' }}
                initial={{ scaleY: 0 }} animate={still ? { scaleY: 0 } : { scaleY: [0, 0, 1, 0] }}
                transition={{ duration: 0.22, times: [0, 0.1, 0.5, 1], repeat: Infinity, repeatDelay: 3.2 + i * 0.05 }} />
            )}
            {mood === 'sad' && <path d={i ? 'M80 62 l18 6' : 'M60 62 l-18 6'} stroke="#2b2340" strokeWidth="4" strokeLinecap="round" />}
          </g>
        ))}
        {/* mouth */}
        <motion.path fill={mood === 'cheer' || mood === 'wow' ? '#2b2340' : 'none'} stroke="#2b2340" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
          animate={{ d: mood === 'cheer' ? 'M56 106 Q70 126 84 106 Z' : mood === 'wow' ? 'M64 110 Q70 122 76 110 Q70 100 64 110 Z' : mood === 'sad' ? 'M58 116 Q70 106 82 116' : mood === 'thinking' ? 'M60 112 Q68 110 80 114' : 'M58 108 Q70 120 82 108' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }} />
      </motion.g>
      {mood === 'thinking' && !still && [0, 1, 2].map((k) => (
        <motion.circle key={k} cx={112 + k * 9} cy={40 - k * 7} r={3 + k} fill="#3da9ff" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: k * 0.2 }} />
      ))}
    </motion.svg>
  );
}
