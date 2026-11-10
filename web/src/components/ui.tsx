'use client';
/* eslint-disable @next/next/no-img-element -- remote avatars/market art served as-is */
import { AnimatePresence, motion, type HTMLMotionProps } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { haptic } from '@/lib/fx';
import { Mark } from './Brand';
import type { LucideIcon } from 'lucide-react';

type Tone = 'grape' | 'mint' | 'coral' | 'sun' | 'sky' | 'white' | 'ghost';
const tones: Record<Tone, { cls: string; edge: string }> = {
  grape: { cls: 'bg-ink text-bg hover:bg-[#e6e6e6]', edge: 'var(--color-grape-dark)' },
  mint: { cls: 'bg-mint text-white', edge: 'var(--color-mint-dark)' },
  coral: { cls: 'bg-coral text-white', edge: 'var(--color-coral-dark)' },
  sun: { cls: 'bg-sun text-ink', edge: 'var(--color-sun-dark)' },
  sky: { cls: 'bg-sky text-white', edge: 'var(--color-sky-dark)' },
  white: { cls: 'bg-snow text-ink border border-line', edge: 'var(--color-line)' },
  ghost: { cls: 'bg-transparent text-grape', edge: 'transparent' },
};
const spring = { type: 'spring' as const, stiffness: 600, damping: 22 };

export function Button({ tone = 'grape', size = 'md', className = '', children, onClick, disabled, ...rest }: HTMLMotionProps<'button'> & { tone?: Tone; size?: 'sm' | 'md' | 'lg' }) {
  const t = tones[tone];
  const sz = size === 'sm' ? 'h-9 px-4 text-sm rounded-full' : size === 'lg' ? 'h-12 px-6 text-[15px] rounded-full' : 'h-11 px-5 text-sm rounded-full';
  return (
    <motion.button {...rest} disabled={disabled}
      onClick={(e) => { haptic('tap'); onClick?.(e); }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={spring}
      className={`relative inline-flex items-center justify-center gap-2 font-semibold select-none edge ${disabled ? 'bg-line! text-[#4b4f5a]! cursor-not-allowed' : t.cls} ${sz} ${className}`}
      style={{ ['--edge' as string]: disabled ? '#23252c' : t.edge }}>
      {children}
    </motion.button>
  );
}

export function LinkButton({ href, tone = 'grape', className = '', children }: { href: string; tone?: Tone; className?: string; children: ReactNode }) {
  const t = tones[tone];
  return (
    <motion.div whileTap={{ scale: 0.97 }} transition={spring} className="inline-flex">
      <Link href={href} onClick={() => haptic('tap')} className={`inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-sm font-semibold w-full ${t.cls} ${className}`} style={{ ['--edge' as string]: t.edge }}>{children}</Link>
    </motion.div>
  );
}

export function Card({ children, className = '', onClick, delay = 0 }: { children: ReactNode; className?: string; onClick?: () => void; delay?: number }) {
  return (
    <motion.div onClick={onClick} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, stiffness: 300, delay }}
      whileTap={onClick ? { scale: 0.98 } : undefined} className={`card3d ${onClick ? 'cursor-pointer' : ''} ${className}`}>
      {children}
    </motion.div>
  );
}

export function Pill({ children, tone = 'snow' }: { children: ReactNode; tone?: 'snow' | 'mint' | 'sky' | 'coral' | 'sun' | 'grape' }) {
  const m = { snow: 'bg-snow text-mute', mint: 'bg-mint-light text-mint-dark', sky: 'bg-sky-light text-sky-dark', coral: 'bg-coral-light text-coral-dark', sun: 'bg-sun-light text-sun-dark', grape: 'bg-grape-light text-grape-dark' }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${m}`}>{children}</span>;
}

export function Progress({ value, color = 'var(--color-grape)', className = '' }: { value: number; color?: string; className?: string }) {
  return (
    <div className={`h-2 w-full rounded-full bg-line overflow-hidden ${className}`} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className="h-full rounded-full relative" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.max(6, value * 100)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }}>
      </motion.div>
    </div>
  );
}

/**
 * Resolve a stored avatar URL for this deployment. Seeded/uploaded assets are stored as root-relative paths that may
 * already carry a base path (e.g. "/app/avatars/leo.jpg"); re-anchor them on the base path this build is served from.
 */
export function assetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const m = url.match(/\/(avatars|markets|uploads|media)\/.*/);
  const rel = m ? m[0] : url.startsWith('/') ? url : `/${url}`;
  return `${base}${rel}`;
}

const AV = ['#7c5cff', '#5a3fe0', '#9d86ff', '#6a4cf5', '#4d34c7', '#8a70ff'];
export function initials(handle: string, name?: string | null): string {
  const src = (name || handle).replace(/^@/, '').trim();
  const parts = src.split(/[\s._-]+/).filter(Boolean);
  return ((parts.length > 1 ? parts[0][0] + parts[1][0] : src.slice(0, 2)) || '?').toUpperCase();
}
/** User avatar with a branded initials fallback (purple broadcast tile, Big Shoulders caps) when there is no image or it fails to load. */
export function Avatar({ handle, url, size = 40, name }: { handle: string; url?: string | null; size?: number; name?: string | null }) {
  const src = assetUrl(url);
  const [failed, setFailed] = useState<string | null>(null);
  if (src && failed !== src) return <img src={src} alt="" width={size} height={size} onError={() => setFailed(src)} className="rounded-full object-cover shrink-0 bg-panel" style={{ width: size, height: size }} />;
  const c = AV[[...handle].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AV.length];
  return (
    <div className="cd rounded-full grid place-items-center text-white shrink-0 select-none" style={{ width: size, height: size, background: c, fontSize: size * 0.44, letterSpacing: '.02em', lineHeight: 1 }} aria-hidden data-avatar-fallback>
      {initials(handle, name)}
    </div>
  );
}

/** Empty state: a quiet tile (brand mark or a Lucide icon) on a dot grid, a title, one line, one action. */
export function Empty({ title, body, action, icon: Icon }: { title: string; body?: string; action?: ReactNode; icon?: LucideIcon }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }} className="flex flex-col items-center text-center gap-3 px-6 py-12">
      <div className="relative grid h-24 w-24 place-items-center">
        <div className="absolute inset-0 rounded-full opacity-40" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.18) 1px, transparent 1px)', backgroundSize: '10px 10px', maskImage: 'radial-gradient(circle, #000 40%, transparent 70%)' }} aria-hidden />
        <motion.div initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.05 }}
          className="relative grid h-14 w-14 place-items-center rounded-2xl border border-line bg-snow">
          {Icon ? <Icon size={26} strokeWidth={1.75} className="text-[#9d86ff]" /> : <Mark size={30} />}
        </motion.div>
      </div>
      <h3 className="text-[18px] font-semibold tracking-tight">{title}</h3>
      {body && <p className="max-w-[300px] text-[14px] leading-snug text-mute">{body}</p>}
      {action && <div className="mt-1">{action}</div>}
    </motion.div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded-2xl ${className}`} aria-hidden />;
}

export function Segmented<T extends string>({ value, options, onChange, id = 'seg' }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; id?: string }) {
  return (
    <div className="flex border-b border-line gap-1" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => { haptic('tap'); onChange(o.value); }}
          className={`relative flex-1 h-11 text-[15px] font-semibold transition-colors ${value === o.value ? 'text-ink' : 'text-mute hover:text-ink/80'}`}>
          {value === o.value && <motion.span layoutId={`${id}-pill`} className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] w-12 rounded-full bg-grape" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Animated number that springs between values and flashes mint/coral on the direction of change. Jumps under reduced motion. */
export function Ticker({ value, suffix = '', prefix = '', decimals = 0, from, className = '' }: { value: number; suffix?: string; prefix?: string; decimals?: number; from?: number; className?: string }) {
  const [shown, setShown] = useState(from ?? value);
  const [dir, setDir] = useState<0 | 1 | -1>(0);
  useEffect(() => {
    const from = shown, to = value, start = performance.now();
    if (from === to) return;
    let raf = 0;
    const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const f = 10 ** decimals;
    const flash = requestAnimationFrame(() => setDir(to > from ? 1 : -1));
    const clear = setTimeout(() => setDir(0), 700);
    if (rm) { raf = requestAnimationFrame(() => setShown(to)); }
    else {
      const step = (t: number) => {
        const k = Math.min(1, (t - start) / (decimals ? 900 : 550));
        // easeOutExpo-ish with a hair of overshoot for a "slot machine settle"
        const e = k === 1 ? 1 : 1 - 2 ** (-10 * k) + Math.sin(k * Math.PI) * 0.015;
        setShown(Math.round((from + (to - from) * e) * f) / f);
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
    return () => { cancelAnimationFrame(raf); cancelAnimationFrame(flash); clearTimeout(clear); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span data-dir={dir || undefined} className={`ticker tabular-nums ${className}`}>{prefix}{shown.toFixed(decimals)}{suffix}</span>;
}

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-bg/70" onClick={onClose} />
          <motion.div role="dialog" aria-modal className="relative w-full md:max-w-md bg-panel border border-line rounded-t-3xl md:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onAnimationStart={() => haptic('select')}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={(_, i) => { if (i.offset.y > 100) onClose(); }}>
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
