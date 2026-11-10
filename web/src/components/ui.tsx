'use client';
import { AnimatePresence, animate, motion, useInView, type HTMLMotionProps } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, X } from 'lucide-react';

type Tone = 'brand' | 'lime' | 'ghost' | 'ink' | 'danger';
const TONES: Record<Tone, string> = {
  brand: 'bg-brand text-white hover:brightness-110',
  lime: 'bg-lime text-[#0a1a00] hover:brightness-105',
  ghost: 'text-ink hairline hover:bg-raised',
  ink: 'bg-ink text-bg hover:opacity-90',
  danger: 'bg-down text-white',
};
const SIZES = { sm: 'h-9 px-3.5 text-[13px] rounded-[9px]', md: 'h-11 px-5 text-[14.5px] rounded-[11px]', lg: 'h-[52px] px-6 text-[15.5px] rounded-[13px]' };

export function Button({ tone = 'brand', size = 'md', className = '', children, ...rest }: HTMLMotionProps<'button'> & { tone?: Tone; size?: keyof typeof SIZES }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} className={`inline-flex items-center justify-center gap-2 font-semibold transition-[filter,background-color,opacity] disabled:opacity-45 disabled:pointer-events-none ${TONES[tone]} ${SIZES[size]} ${className}`} {...rest}>
      {children}
    </motion.button>
  );
}
export function LinkButton({ href, tone = 'brand', size = 'md', className = '', children }: { href: string; tone?: Tone; size?: keyof typeof SIZES; className?: string; children: ReactNode }) {
  return <Link href={href} className={`press inline-flex items-center justify-center gap-2 font-semibold ${TONES[tone]} ${SIZES[size]} ${className}`}>{children}</Link>;
}

export function Chip({ tone = 'ghost', live, children, className = '' }: { tone?: 'lime' | 'ghost' | 'brand' | 'up' | 'down'; live?: boolean; children: ReactNode; className?: string }) {
  return <span className={`chip chip-${tone} ${className}`}>{live && <span className="live-dot" />}{children}</span>;
}

export function Skeleton({ className = '' }: { className?: string }) { return <div aria-hidden className={`shimmer ${className}`} />; }

export function Empty({ title, body, action, art }: { title: string; body?: ReactNode; action?: ReactNode; art?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-12">
      <div className="mb-5">{art ?? <PixelFlag />}</div>
      <h3 className="wide text-[19px]">{title}</h3>
      {body && <p className="mt-2 max-w-[34ch] text-[14px] text-mute leading-relaxed">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export function ErrorState({ title = 'Can’t reach the source', body, retry }: { title?: string; body?: ReactNode; retry?: () => void }) {
  return (
    <div role="alert" className="panel flex items-start gap-3 p-4">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-down" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold">{title}</p>
        {body && <p className="mt-0.5 text-[13px] text-mute">{body}</p>}
      </div>
      {retry && <button onClick={retry} className="press shrink-0 text-[13px] font-semibold text-brand">Retry</button>}
    </div>
  );
}

/** Pixel flag on a pole, the empty-state art. */
export function PixelFlag({ size = 64 }: { size?: number }) {
  const cells = [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2]];
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <rect x="3" y="2" width="1" height="13" fill="var(--color-faint)" />
      {cells.map(([x, y], i) => <motion.rect key={i} x={4 + x!} y={2 + y!} width="1" height="1" fill={i % 4 === 3 ? '#c6ff3d' : 'var(--color-brand)'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} />)}
      <rect x="1" y="15" width="6" height="1" fill="var(--color-faint)" />
    </svg>
  );
}

/** Deterministic 5x5 pixel avatar from any account id. */
export function Identicon({ seed, size = 36, className = '' }: { seed: string; size?: number; className?: string }) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const hues = ['#3355ff', '#c6ff3d', '#ff5c7a', '#ffc23d', '#7ae0ff', '#b48cff'];
  const fg = hues[Math.abs(h) % hues.length]!;
  const cells: [number, number][] = [];
  for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) if ((h >>> (y * 3 + x)) & 1) { cells.push([x, y]); if (x < 2) cells.push([4 - x, y]); }
  return (
    <svg width={size} height={size} viewBox="-1 -1 7 7" className={`shrink-0 rounded-[9px] bg-raised ${className}`} aria-hidden>
      {cells.map(([x, y], i) => <rect key={i} x={x} y={y} width="1.02" height="1.02" fill={fg} />)}
    </svg>
  );
}

export function CoinAvatar({ symbol, image, size = 36, className = '' }: { symbol: string; image?: string | null; size?: number; className?: string }) {
  const [bad, setBad] = useState(false);
  if (image && !bad) return <img src={image} alt="" width={size} height={size} onError={() => setBad(true)} className={`shrink-0 rounded-full object-cover bg-raised ${className}`} style={{ width: size, height: size }} />;
  return <span className={`grid shrink-0 place-items-center rounded-full bg-raised mono font-bold text-ink ${className}`} style={{ width: size, height: size, fontSize: size * 0.34 }}>{symbol.slice(0, 2)}</span>;
}

/** Number that counts up when it scrolls into view and re-animates on change. */
export function CountUp({ value, format = (n) => n.toFixed(0), className = '', duration = 1.1 }: { value: number; format?: (n: number) => string; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const prev = useRef(0);
  useEffect(() => {
    if (!inView || !ref.current) return;
    const el = ref.current;
    const c = animate(prev.current, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => { el.textContent = format(v); } });
    prev.current = value;
    return () => c.stop();
  }, [value, inView, format, duration]);
  return <span ref={ref} className={className}>{format(0)}</span>;
}

/** Price/percent that flashes green or red when it ticks. */
export function Flash({ value, children, className = '' }: { value: number | null | undefined; children: ReactNode; className?: string }) {
  const last = useRef(value);
  const [dir, setDir] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    if (value == null || last.current == null || value === last.current) { last.current = value; return; }
    const d = value > last.current ? 'up' : 'down';
    last.current = value;
    const t0 = setTimeout(() => setDir(d), 0);
    const t1 = setTimeout(() => setDir(null), 1200);
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, [value]);
  return <span className={`rounded-[4px] ${dir ? `flash-${dir}` : ''} ${className}`}>{children}</span>;
}

export function Delta({ pct, className = '' }: { pct: number | null | undefined; className?: string }) {
  if (pct == null) return <span className={`mono text-mute ${className}`}>—</span>;
  return <span className={`mono ${pct >= 0 ? 'text-up' : 'text-down'} ${className}`}>{pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%</span>;
}

/** Relay-style segmented meter: `value` 0..1 fills cells, the `mark` cell (e.g. the sell line) glows lime. */
export function Cells({ value, n = 10, mark, className = '' }: { value: number; n?: number; mark?: number; className?: string }) {
  const filled = Math.round(Math.max(0, Math.min(1, value)) * n);
  return (
    <div className={`flex gap-[3px] ${className}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      {Array.from({ length: n }, (_, i) => (
        <motion.span key={i} className={`h-[10px] flex-1 rounded-[2px] ${i < filled ? (i === filled - 1 && value >= 1 ? 'bg-lime' : 'bg-ink') : mark !== undefined && i === mark ? 'bg-lime/25 shadow-[inset_0_0_0_1px_#c6ff3d]' : 'shadow-[inset_0_0_0_1px_var(--color-line)]'}`}
          initial={{ scaleY: 0.2, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} transition={{ delay: 0.15 + i * 0.035, type: 'spring', stiffness: 500, damping: 26 }} />
      ))}
    </div>
  );
}

export function Bar({ value, className = '', tone = 'brand' }: { value: number; className?: string; tone?: 'brand' | 'lime' }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-raised ${className}`}>
      <motion.div className={`h-full rounded-full ${tone === 'lime' ? 'bg-lime' : 'bg-brand'}`} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }} />
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, id, className = '' }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; id: string; className?: string }) {
  return (
    <div role="tablist" className={`inline-flex rounded-[10px] bg-raised p-[3px] ${className}`}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)} className={`relative h-8 px-3 text-[12.5px] font-semibold rounded-[8px] transition-colors ${value === o.value ? 'text-ink' : 'text-mute hover:text-ink'}`}>
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-[8px] bg-panel shadow-[0_1px_0_rgb(0_0_0/.2),inset_0_0_0_1px_var(--color-line)]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span className="relative mono uppercase tracking-wide">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Bottom sheet on phones, centred dialog on desktop. */
export function Modal({ open, onClose, children, label, wide }: { open: boolean; onClose: () => void; children: ReactNode; label: string; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-[#02030d]/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div role="dialog" aria-modal="true" aria-label={label}
            className={`relative w-full ${wide ? 'md:max-w-[620px]' : 'md:max-w-[480px]'} max-h-[92dvh] overflow-y-auto no-scrollbar bg-panel border border-line rounded-t-[22px] md:rounded-[20px] pb-[env(safe-area-inset-bottom)]`}
            initial={{ y: 60, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 38 }}>
            <button onClick={onClose} aria-label="Close" className="press absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-raised text-mute hover:text-ink"><X size={18} /></button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SectionHead({ title, meta, action }: { title: ReactNode; meta?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div className="min-w-0"><h2 className="wide text-[15px] tracking-tight">{title}</h2>{meta && <p className="eyebrow mt-1.5">{meta}</p>}</div>
      {action}
    </div>
  );
}

/** Small source badge so every number says where it came from. */
export function Source({ children }: { children: ReactNode }) {
  return <span className="mono text-[10.5px] text-faint">src · {children}</span>;
}
