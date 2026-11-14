'use client';
/**
 * RAID's object language: liquid-chrome pieces drawn in SVG/CSS (no image files), so they stay sharp, theme-aware
 * and animatable. The chest is the hero object; pucks carry the lifecycle icons; the line is the signal.
 */
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useId, useRef, type ReactNode } from 'react';

export const ease = [0.2, 0.7, 0.2, 1] as const;

/** The war chest. `open` swings the lid back and lets the flare out; `fill` (0..1) is the pot level in the window. */
export function ChromeChest({ size = 220, open = false, fill = 0.5, className = '', idle = true }: { size?: number; open?: boolean; fill?: number; className?: string; idle?: boolean }) {
  const id = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const f = Math.max(0.06, Math.min(1, fill));
  return (
    <motion.svg viewBox="0 0 240 220" width={size} height={size * 220 / 240} className={className} aria-hidden
      animate={idle && !reduce ? { y: [0, -6, 0] } : undefined} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
      <defs>
        <linearGradient id={`m${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".2" stopColor="#dedcd6" /><stop offset=".45" stopColor="#8f8e89" />
          <stop offset=".58" stopColor="#f7f6f2" /><stop offset=".8" stopColor="#adaca6" /><stop offset="1" stopColor="#e9e8e3" />
        </linearGradient>
        <linearGradient id={`d${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9c8c2" /><stop offset=".5" stopColor="#7d7c77" /><stop offset="1" stopColor="#4a4945" />
        </linearGradient>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb08a" /><stop offset=".45" stopColor="#ff5a1f" /><stop offset="1" stopColor="#c43a08" />
        </linearGradient>
        <radialGradient id={`glow${id}`} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#ff6a2c" stopOpacity=".85" /><stop offset="1" stopColor="#ff6a2c" stopOpacity="0" /></radialGradient>
        <linearGradient id={`sh${id}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".85" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id={`c${id}`}><rect x="34" y="92" width="172" height="104" rx="18" /></clipPath>
        <clipPath id={`w${id}`}><rect x="58" y="126" width="124" height="46" rx="12" /></clipPath>
      </defs>
      {/* floor shadow */}
      <ellipse cx="120" cy="206" rx="92" ry="9" fill="#15161a" opacity=".16" />
      {/* glow when open */}
      <AnimatePresence>{open && <motion.ellipse cx="120" cy="88" rx="110" ry="70" fill={`url(#glow${id})`} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease }} />}</AnimatePresence>
      {/* body */}
      <rect x="34" y="92" width="172" height="104" rx="18" fill={`url(#m${id})`} />
      <rect x="34" y="92" width="172" height="104" rx="18" fill="none" stroke="#ffffff" strokeOpacity=".7" strokeWidth="1.5" />
      <g clipPath={`url(#c${id})`}>
        <rect x="34" y="108" width="172" height="6" fill={`url(#d${id})`} opacity=".55" />
        <motion.rect y="92" width="60" height="104" fill={`url(#sh${id})`} opacity=".55" initial={{ x: -40 }} animate={reduce ? undefined : { x: [-60, 260] }} transition={{ duration: 3.8, repeat: Infinity, repeatDelay: 1.6, ease }} style={{ skewX: -18 }} />
      </g>
      {/* pot window */}
      <rect x="58" y="126" width="124" height="46" rx="12" fill="#15161a" />
      <g clipPath={`url(#w${id})`}>
        <motion.rect x="58" width="124" fill={`url(#g${id})`} initial={{ y: 172, height: 0 }} animate={{ y: 172 - 46 * f, height: 46 * f }} transition={{ duration: 1.4, ease }} />
        <motion.path d="M58 0 q15 -4 31 0 t31 0 t31 0 t31 0 v6 h-124z" fill="#ffb08a" opacity=".55" initial={false} animate={{ y: 172 - 46 * f, x: reduce ? 0 : [0, -31, 0] }} transition={{ y: { duration: 1.4, ease }, x: { duration: 3, repeat: Infinity, ease: 'linear' } }} />
      </g>
      <rect x="58" y="126" width="124" height="46" rx="12" fill="none" stroke="#000" strokeOpacity=".35" />
      {/* the line across the window */}
      <line x1="62" x2="178" y1="136" y2="136" stroke="#ff5a1f" strokeWidth="1.6" className="line-dash" />
      {/* lid, hinged at the back */}
      <motion.g style={{ transformBox: 'fill-box', originX: 0.06, originY: 0.9 }} animate={{ rotate: open ? -24 : 0, y: open ? -10 : 0, x: open ? -4 : 0 }} transition={{ type: 'spring', stiffness: 140, damping: 13 }}>
        <path d="M30 96 Q30 44 120 40 Q210 44 210 96 Z" fill={`url(#m${id})`} />
        <path d="M30 96 Q30 44 120 40 Q210 44 210 96" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="1.5" />
        <path d="M44 92 Q46 58 120 54 Q194 58 196 92" fill="none" stroke="#8f8e89" strokeOpacity=".5" strokeWidth="1.2" />
        <rect x="26" y="88" width="188" height="12" rx="6" fill={`url(#d${id})`} />
        {/* lock plate */}
        <rect x="104" y="80" width="32" height="30" rx="9" fill="#15161a" />
        <motion.rect x="114" y="88" width="12" height="14" rx="3" fill="#ff5a1f" animate={reduce ? undefined : { opacity: [1, 0.55, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
      </motion.g>
    </motion.svg>
  );
}

/** A chrome puck carrying an icon, with a soft emboss. Tilts toward the pointer. */
export function ChromePuck({ children, size = 72, className = '', signal = false }: { children: ReactNode; size?: number; className?: string; signal?: boolean }) {
  return (
    <Tilt className={className}>
      <span className="relative grid place-items-center rounded-[30%]" style={{
        width: size, height: size,
        background: signal ? 'linear-gradient(145deg,#ffc0a0 0%,#ff6a2c 35%,#c43a08 70%,#ff8a55 100%)' : 'var(--chrome)',
        boxShadow: '0 1px 0 rgb(255 255 255 / .9) inset, 0 -2px 6px rgb(0 0 0 / .18) inset, 0 18px 28px -14px rgb(21 22 26 / .45), 0 2px 4px rgb(21 22 26 / .12)',
      }}>
        <span className="absolute inset-[9%] rounded-[26%]" style={{ background: signal ? 'linear-gradient(160deg,#ff8a55,#e04a12)' : 'linear-gradient(160deg,#fbfaf7 0%,#cfcec8 55%,#efeee9 100%)', boxShadow: '0 1px 2px rgb(0 0 0 / .25) inset, 0 -1px 0 rgb(255 255 255 / .8) inset' }} />
        <span className={`relative ${signal ? 'text-[#1c0900]' : 'text-[#3b3b38]'} [filter:drop-shadow(0_1px_0_rgb(255_255_255/.85))]`}>{children}</span>
      </span>
    </Tilt>
  );
}

/** Pointer-follow 3D tilt (desktop); static on touch and with reduced motion. */
export function Tilt({ children, className = '', max = 12 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [max, -max]), { stiffness: 220, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-max, max]), { stiffness: 220, damping: 18 });
  return (
    <motion.div ref={ref} className={`inline-block [perspective:700px] ${className}`}
      onPointerMove={(e) => { if (reduce || e.pointerType !== 'mouse' || !ref.current) return; const b = ref.current.getBoundingClientRect(); mx.set((e.clientX - b.left) / b.width - 0.5); my.set((e.clientY - b.top) / b.height - 0.5); }}
      onPointerLeave={() => { mx.set(0); my.set(0); }}>
      <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}>{children}</motion.div>
    </motion.div>
  );
}

/** Split-flap style countdown: each digit rolls when it changes. */
export function FlipClock({ ms, className = '', dark = false }: { ms: number; className?: string; dark?: boolean }) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const parts = h > 0 ? [String(h).padStart(2, '0'), String(m).padStart(2, '0'), String(sec).padStart(2, '0')] : [String(m).padStart(2, '0'), String(sec).padStart(2, '0')];
  return (
    <span className={`inline-flex items-center gap-1 mono font-semibold ${className}`} aria-label={parts.join(':')}>
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="opacity-40">:</span>}
          {p.split('').map((d, j) => (
            <span key={j} className={`relative inline-grid h-[1.35em] w-[0.86em] place-items-center overflow-hidden rounded-[0.2em] ${dark ? 'bg-white/10' : 'bg-raised'} shadow-[inset_0_-1px_0_rgb(0_0_0/.08)]`}>
              <AnimatePresence initial={false} mode="popLayout">
                <motion.span key={d} initial={{ y: '-100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ duration: 0.35, ease }}>{d}</motion.span>
              </AnimatePresence>
              <span className={`pointer-events-none absolute inset-x-0 top-1/2 h-px ${dark ? 'bg-black/40' : 'bg-black/[.06]'}`} />
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

/** Two-tone headline: first part in ink, second in the soft tone. */
export function TwoTone({ a, b, className = '' }: { a: ReactNode; b?: ReactNode; className?: string }) {
  return <span className={className}><span className="block">{a}</span>{b && <span className="tone2 block">{b}</span>}</span>;
}
