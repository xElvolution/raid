'use client';
/**
 * Broadcast kit (design direction C): scoreboard bug, LIVE / countdown tags, cut buttons, section titles
 * and the theme toggle. Display type (`.cd`) is reserved for hero numbers and titles; body text stays Inter.
 */
import { Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { haptic } from '@/lib/fx';
import { useTheme } from '@/lib/theme';

/** TV scoreboard: [YES LABEL | 64% | 36% | NO LABEL]. Widths follow the odds; numbers tick on change. */
export function Scoreboard({ p, yes = 'Yes', no = 'No', size = 'md', className = '' }: { p: number; yes?: string; no?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const y = Math.round(Math.min(0.99, Math.max(0.01, p)) * 100);
  const h = { sm: 'h-10', md: 'h-14', lg: 'h-[68px]' }[size];
  const num = { sm: 'text-[28px]', md: 'text-[46px]', lg: 'text-[50px]' }[size];
  const lab = { sm: 'text-[11px] px-1.5', md: 'text-[14px] px-2', lg: 'text-[16px] px-2.5' }[size];
  return (
    <div className={`flex items-stretch ${h} ${className}`} role="img" aria-label={`${yes} ${y} percent, ${no} ${100 - y} percent`}>
      <div className={`cd flex items-center bg-mint text-[#000] ${lab}`}>{yes}</div>
      <motion.div layout className="relative flex min-w-0 items-center bg-panel px-2.5" style={{ flex: Math.min(78, Math.max(22, y)), minWidth: size === "sm" ? 62 : 120 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
        <Num v={y} className={`cd text-mint ${num}`} />
        <i className="absolute inset-x-0 bottom-0 h-[5px] bg-mint" />
      </motion.div>
      <motion.div layout className="relative flex min-w-0 items-center justify-end border-l-2 border-bg bg-panel px-2.5" style={{ flex: Math.min(78, Math.max(22, 100 - y)), minWidth: size === "sm" ? 62 : 120 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
        <Num v={100 - y} className={`cd text-coral ${num}`} />
        <i className="absolute inset-x-0 bottom-0 h-[5px] bg-coral" />
      </motion.div>
      <div className={`cd flex items-center bg-coral text-[#000] ${lab}`}>{no}</div>
    </div>
  );
}

function Num({ v, className }: { v: number; className: string }) {
  return (
    <span className={`relative overflow-hidden leading-none ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={v} className="inline-block" initial={{ y: '60%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-60%', opacity: 0 }} transition={{ type: 'spring', stiffness: 520, damping: 34 }}>{v}%</motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Bug({ children, tone = 'grape', className = '', ...rest }: { children: ReactNode; tone?: 'grape' | 'black' | 'mint' | 'coral' | 'snow' } & ComponentProps<'span'>) {
  const t = { grape: 'bg-grape text-white', black: 'bg-[#000] text-white', mint: 'bg-mint text-[#000]', coral: 'bg-coral text-[#000]', snow: 'bg-snow text-ink' }[tone];
  return <span className={`bug ${t} ${className}`} {...rest}>{children}</span>;
}

export function LiveBug({ label = 'Live' }: { label?: string }) {
  return <Bug><span className="live-dot" />{label}</Bug>;
}

/** Countdown tag, e.g. "31D 04:12:09". Ticks every second; shows FINAL after close. */
export function Countdown({ to, className = '' }: { to: string | number | Date; className?: string }) {
  const end = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  if (now === null) return <span className={`mn bg-[#000] text-white px-1.5 py-1 text-[11px] font-bold ${className}`}>--:--:--</span>;
  let s = Math.max(0, Math.floor((end - now) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const hh = String(Math.floor(s / 3600)).padStart(2, '0'), mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0'), ss = String(s % 60).padStart(2, '0');
  return <span className={`mn bg-[#000] text-white px-1.5 py-1 text-[11px] font-bold ${className}`}>{end <= now ? 'FINAL' : `${d ? `${d}D ` : ''}${hh}:${mm}:${ss}`}</span>;
}

export function CutButton({ tone = 'grape', size = 'md', className = '', children, ...rest }: { tone?: 'grape' | 'mint' | 'coral' | 'ink' | 'snow' | 'black'; size?: 'sm' | 'md' | 'lg' } & ComponentProps<typeof motion.button>) {
  const t = { grape: 'bg-grape text-white', mint: 'bg-mint text-[#000]', coral: 'bg-coral text-[#000]', ink: 'bg-ink text-bg', snow: 'bg-snow text-ink', black: 'bg-[#000] text-white' }[tone];
  const s = { sm: 'h-10 text-[18px] px-3', md: 'h-12 text-[22px] px-4', lg: 'h-[58px] text-[24px] px-5' }[size];
  const { onClick, ...btn } = rest;
  return <motion.button whileTap={{ scale: 0.96, y: 1 }} whileHover={{ y: -1 }} transition={{ type: 'spring', stiffness: 700, damping: 24 }}
    onClick={(e) => { haptic('tap'); onClick?.(e); }} className={`cuts cd inline-flex items-center justify-center gap-2 tracking-[.04em] disabled:opacity-40 ${t} ${s} ${className}`} {...btn}>{children}</motion.button>;
}

export function SectionTitle({ children, aside, className = '' }: { children: ReactNode; aside?: ReactNode; className?: string }) {
  return <div className={`flex items-end justify-between px-4 pt-6 pb-2 ${className}`}><h2 className="cd text-[22px]">{children}</h2>{aside && <span className="mn text-[11px] text-mute">{aside}</span>}</div>;
}

export function Chip({ on, children, className = '', ...rest }: { on?: boolean } & ComponentProps<'button'>) {
  return <button className={`press h-[30px] shrink-0 px-3 text-[12px] font-bold tracking-[.08em] uppercase ${on ? 'bg-ink text-bg' : 'bg-snow text-ink'} ${className}`} {...rest}>{children}</button>;
}

/** Header quick toggle: circular reveal from the button. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} className="press grid h-8 w-8 place-items-center"
      onClick={(e) => { haptic('tap'); const r = e.currentTarget.getBoundingClientRect(); toggle({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} initial={{ rotate: -90, scale: 0.5, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 90, scale: 0.5, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 26 }}>
          {theme === 'dark' ? <Sun size={21} strokeWidth={1.9} /> : <Moon size={21} strokeWidth={1.9} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
