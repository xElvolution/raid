'use client';
import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

/** App-wide motion defaults: honour reduced motion and one shared spring feel. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 520, damping: 34, mass: 0.8 }}>{children}</MotionConfig>;
}
