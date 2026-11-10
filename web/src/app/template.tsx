'use client';
import { motion } from 'motion/react';
import { useSyncExternalStore, type ReactNode } from 'react';

const RM = '(prefers-reduced-motion: reduce)';
/** Reduced-motion preference that is `false` during SSR and hydration, so the first client render matches the server HTML. */
function useReducedSafe(): boolean {
  return useSyncExternalStore(
    (cb) => { const m = matchMedia(RM); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); },
    () => matchMedia(RM).matches,
    () => false,
  );
}

/**
 * Broadcast route transition: a hard diagonal purple wipe clears off the new screen like a TV cut,
 * with a thin black trailing bar, while the content settles in underneath.
 */
export default function Template({ children }: { children: ReactNode }) {
  const reduced = useReducedSafe();
  return (
    <>
      <motion.div initial={reduced ? false : { opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.32, ease: [0.2, 0.9, 0.2, 1], delay: 0.08 }}>
        {children}
      </motion.div>
      {!reduced && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
          <motion.div className="absolute inset-y-[-10%] -left-[20%] w-[140%] bg-grape" style={{ skewX: -14 }}
            initial={{ x: '0%' }} animate={{ x: '115%' }} transition={{ duration: 0.46, ease: [0.7, 0, 0.2, 1] }} />
          <motion.div className="absolute inset-y-[-10%] -left-[20%] w-[10%] bg-[#000]" style={{ skewX: -14 }}
            initial={{ x: '-120%' }} animate={{ x: '1500%' }} transition={{ duration: 0.46, ease: [0.7, 0, 0.2, 1] }} />
        </div>
      )}
    </>
  );
}
