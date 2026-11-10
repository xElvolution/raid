'use client';
import { BRAND } from '@/lib/brand';

/** Signature colour. One solid purple, no gradients. */
export const ACCENT = '#7C5CFF';

/** The mark: a check that keeps rising. Works from 16px favicon to app icon. */
export function Mark({ size = 28, mono = false, className = '' }: { size?: number; mono?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill={mono ? 'currentColor' : ACCENT} />
      <path d="M7.5 17.2l5 5L24.2 9.8" fill="none" stroke={mono ? 'var(--color-bg)' : '#fff'} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.6 9.4h5.9v5.9" fill="none" stroke={mono ? 'var(--color-bg)' : '#fff'} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark size={size} />
      <span className="font-semibold tracking-[-0.03em]" style={{ fontSize: size * 0.68 }}>{BRAND.name}</span>
    </span>
  );
}
