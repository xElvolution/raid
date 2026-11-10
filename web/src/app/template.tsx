'use client';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

/** Route enter: a short rise-and-fade. Reduced motion is handled by MotionConfig. */
export default function Template({ children }: { children: ReactNode }) {
  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.9, 0.2, 1] }}>{children}</motion.div>;
}
