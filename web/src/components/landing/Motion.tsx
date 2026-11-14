'use client';
import {
  motion,
  useInView,
  useReducedMotion,
  useSpring,
} from 'motion/react';
import { useRef, type ReactNode } from 'react';

/** Same curve COUPON used (GSAP power4.out). */
export const easeOut = [0.16, 1, 0.3, 1] as const;
export const easeCubic = [0.215, 0.61, 0.355, 1] as const;

/** Headline line: CSS mask-reveal so it plays on first paint. */
export function MaskLine({
  children,
  delay = 0,
  className = '',
  inView = false,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** If true, wait until the line is on screen before sliding up. */
  inView?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: '0px 0px -12% 0px', amount: 0.2 });
  // Hero (inView=false) plays on first paint. Scroll lines start visible so they
  // can never get stuck hidden if intersection misses; they reveal when seen.
  const play = !inView || seen;
  return (
    <span ref={ref} className={`block overflow-hidden pb-[0.06em] ${className}`}>
      <span
        className={`block ${play ? 'raid-mask-up' : ''}`}
        style={play ? { animationDelay: `${delay}s` } : undefined}
      >
        {children}
      </span>
    </span>
  );
}

/** Mount rise — CSS, so it plays on first paint and never sticks invisible. */
export function Rise({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div className={`raid-rise ${className}`} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

/** Scroll entrance, same idea as COUPON's Reveal: a short rise, no opacity trap. */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ y: 0 }}
      whileInView={reduce ? undefined : { y: [28, 0] }}
      viewport={{ once: true, margin: '0px 0px -15% 0px' }}
      transition={{ duration: 0.8, delay, ease: easeCubic }}
    >
      {children}
    </motion.div>
  );
}

/** Button leans toward the cursor, then springs home — COUPON's MagneticLink. */
export function Magnetic({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 220, damping: 16, mass: 0.6 });
  const y = useSpring(0, { stiffness: 220, damping: 16, mass: 0.6 });
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      style={{ x, y }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(((e.clientX - r.left) / r.width - 0.5) * 14);
        y.set(((e.clientY - r.top) / r.height - 0.5) * 12);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}
