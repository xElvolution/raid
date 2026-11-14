'use client';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/** Route enter: a short rise-and-fade. Skipped when the user prefers reduced motion. */
export default function Template({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return children;
  return <motion.div initial={{ y: 8 }} animate={{ y: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.9, 0.2, 1] }}>{children}</motion.div>;
}
