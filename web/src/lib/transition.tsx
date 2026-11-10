'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MotionConfig } from 'motion/react';
import { useEffect, type ComponentProps, type MouseEvent, type ReactNode } from 'react';

/**
 * Shared-element page transitions via the View Transitions API. Elements carrying the same
 * `view-transition-name` on both pages (e.g. `battle-<id>`) morph between them; everything else crossfades.
 * Falls back to a normal navigation where the API is missing or reduced motion is on.
 */
let pending: (() => void) | null = null;

export function TransitionWatcher() {
  const path = usePathname();
  useEffect(() => { const r = pending; pending = null; if (r) requestAnimationFrame(() => r()); }, [path]);
  return null;
}

export function TLink({ href, onClick, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  const router = useRouter();
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const doc = document as Document & { startViewTransition?: (cb: () => Promise<void>) => unknown };
    if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault();
    doc.startViewTransition(() => new Promise<void>((res) => {
      pending = res;
      router.push(href);
      setTimeout(() => { if (pending === res) { pending = null; res(); } }, 1200);
    }));
  };
  return <Link href={href} onClick={go} {...rest} />;
}

/** App-wide motion defaults: honour the OS reduced-motion setting (transforms off, opacity kept) and one shared spring feel. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 520, damping: 34, mass: 0.8 }}>{children}</MotionConfig>;
}
