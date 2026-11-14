'use client';
/**
 * The RAID app frame. Built around the raid loop, not a sidebar of sections:
 *   Feed (what crews are doing) · Raids (the board) · Call (+) · Crews (DAOs at war) · You (your card).
 * Phones get a quiet top bar and a thumb-reach bottom bar. Desktop gets one top bar and a single reading column
 * with a live "Raid radar" on the right.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, Crosshair, Flag, Home, Moon, Plus, Sun, Wallet } from 'lucide-react';
import { Mark, Wordmark } from './Brand';
import { Avatar } from './app/Avatar';
import { RadarRail } from './app/Radar';
import { useTheme } from '@/lib/theme';
import { connect, useAccount } from '@/lib/wallet';
import { hits, openCall, toast, toasts, type Toast } from '@/lib/bus';
import { useRaids } from '@/lib/hooks';
import { shortAddr } from '@/lib/market';
import { target, xLabel, usdcOf } from '@/lib/raid';

const TABS = [
  { href: '/feed', label: 'Feed', Icon: Home },
  { href: '/raids', label: 'Raids', Icon: Crosshair },
  { href: '/war', label: 'Crews', Icon: Flag },
] as const;

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={(e) => toggle({ x: e.clientX, y: e.clientY })} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} className="press grid h-10 w-10 place-items-center rounded-full text-mute hover:bg-raised hover:text-ink">
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export function WalletButton({ compact }: { compact?: boolean }) {
  const acct = useAccount();
  if (acct) return (
    <Link href={`/u/${acct}`} aria-label="Your profile" className="press flex h-10 items-center gap-2 rounded-full pl-1 pr-1 md:pr-3 hover:bg-raised">
      <Avatar id={acct} size={32} /><span className="hidden max-w-[140px] truncate text-[13.5px] font-medium md:inline">{shortAddr(acct)}</span>
    </Link>
  );
  return (
    <button onClick={() => void connect()} className={`press flex h-9 items-center gap-1.5 rounded-full bg-ink text-bg px-4 text-[13.5px] font-semibold ${compact ? '!px-3' : ''}`} aria-label="Connect NEAR wallet">
      <Wallet size={16} />{compact ? 'Sign in' : 'Connect'}
    </button>
  );
}

function useNewRaidToasts() {
  const raids = useRaids();
  const seen = useRef<number | null>(null);
  const status = useRef<Map<number, string>>(new Map());
  useEffect(() => {
    const list = raids.data; if (!list) return;
    for (const r of list) {
      const was = status.current.get(r.id);
      if (was && was !== 'Closed' && r.status === 'Closed' && r.hit) hits.emit({ id: r.id, symbol: target(r).symbol, multiple: `${(Number(r.proceeds) / Math.max(1, Number(r.entry_cost))).toFixed(2)}x`, profitUsd: usdcOf(r.proceeds) - usdcOf(r.entry_cost) });
      status.current.set(r.id, r.status);
    }
    const top = list.length ? Math.max(...list.map((r) => r.id)) : -1;
    if (seen.current !== null && top > seen.current) {
      const r = list.find((x) => x.id === top)!;
      toast({ title: `New raid: $${target(r).symbol} to ${xLabel(r.target_x_bps)}`, body: `Called by ${shortAddr(r.caller)}. Crew is forming.`, tone: 'lime', href: `/raids/${r.id}` });
    }
    seen.current = top;
  }, [raids.data]);
}

/** Shell props kept stable for every page: `title` (string or node), `back`, `actions`, `rail` (desktop radar), `flush`, `tabs` (sub tabs under the bar). */
export function Shell({ children, title, back, actions, rail = true, flush, tabs }: { children: ReactNode; title?: ReactNode; back?: string; actions?: ReactNode; rail?: boolean; flush?: boolean; tabs?: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const acct = useAccount();
  useNewRaidToasts();
  const on = (href: string) => path === href || path.startsWith(`${href}/`);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const f = () => setScrolled(scrollY > 8); f(); addEventListener('scroll', f, { passive: true }); return () => removeEventListener('scroll', f); }, []);
  return (
    <div className="min-h-dvh bg-bg">
      {/* Top bar */}
      <header className={`sticky top-0 z-40 bg-bg/80 backdrop-blur-xl backdrop-saturate-150 transition-shadow ${scrolled ? 'shadow-[0_1px_0_var(--color-line)]' : ''}`}>
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-2 px-4 md:h-16 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {back ? <button onClick={() => (history.length > 1 ? router.back() : router.push(back))} aria-label="Back" className="press -ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-raised"><ChevronLeft size={22} /></button>
              : <Link href="/" aria-label="RAID home" className="shrink-0"><span className="md:hidden"><Mark size={26} /></span><span className="hidden md:inline"><Wordmark size={26} /></span></Link>}
            {back && (typeof title === 'string' ? <h1 className="truncate text-[17px] font-semibold tracking-[-0.03em] md:text-[19px]">{title}</h1> : title)}
          </div>
          {!back && (
            <nav aria-label="Main" className="hidden items-center gap-1 rounded-full bg-raised/70 p-1 md:flex">
              {TABS.map(({ href, label }) => (
                <Link key={href} href={href} aria-current={on(href) ? 'page' : undefined} className={`relative rounded-full px-4 py-2 text-[14px] font-medium transition-colors ${on(href) ? 'text-bg' : 'text-mute hover:text-ink'}`}>
                  {on(href) && <motion.span layoutId="top-on" className="absolute inset-0 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className="relative">{label}</span>
                </Link>
              ))}
              <Link href="/judges" className={`rounded-full px-4 py-2 text-[14px] font-medium ${on('/judges') ? 'bg-ink text-bg' : 'text-mute hover:text-ink'}`}>Judges</Link>
            </nav>
          )}
          {!back && typeof title === 'string' && <h1 className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold tracking-[-0.03em] md:hidden">{title}</h1>}
          <div className="flex flex-1 items-center justify-end gap-1">
            {actions}
            <span className="hidden md:block"><ThemeToggle /></span>
            <button onClick={() => openCall()} className="press hidden h-10 items-center gap-1.5 rounded-full btn-signal px-4 text-[14px] font-semibold md:flex"><Plus size={17} strokeWidth={2.6} />Call a raid</button>
            <WalletButton compact />
          </div>
        </div>
        {tabs && <div className="mx-auto max-w-[1180px] md:px-6">{tabs}</div>}
      </header>

      <div className="mx-auto flex max-w-[1180px] justify-center gap-8 md:px-6">
        <main className={`min-w-0 flex-1 ${rail ? 'max-w-[640px]' : 'max-w-[1000px]'} ${flush ? '' : 'px-4 md:px-0'} pb-32 pt-2 md:pb-16 md:pt-6`}>{children}</main>
        {rail && <RadarRail />}
      </div>

      {/* Phone bottom bar: thumb reach */}
      <nav aria-label="Tabs" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="grid h-16 grid-cols-5 items-center">
          {[TABS[0], TABS[1], null, TABS[2], 'you' as const].map((n) => n === null ? (
            <button key="call" onClick={() => openCall()} aria-label="Call a raid" className="grid place-items-center">
              <motion.span whileTap={{ scale: 0.88 }} className="grid h-12 w-12 place-items-center rounded-full btn-signal"><Plus size={24} strokeWidth={2.6} /></motion.span>
            </button>
          ) : n === 'you' ? (
            <Link key="you" href={acct ? `/u/${acct}` : '/u/me'} aria-current={on('/u') ? 'page' : undefined} className={`flex flex-col items-center gap-1 text-[11px] font-medium ${on('/u') ? 'text-ink' : 'text-faint'}`}>
              {acct ? <Avatar id={acct} size={26} ring={on('/u')} /> : <span className={`grid h-[26px] w-[26px] place-items-center rounded-full border-2 ${on('/u') ? 'border-ink' : 'border-faint'}`}><span className="h-2 w-2 rounded-full bg-current" /></span>}You
            </Link>
          ) : (
            <Link key={n.href} href={n.href} aria-current={on(n.href) ? 'page' : undefined} className={`flex flex-col items-center gap-1 text-[11px] font-medium ${on(n.href) ? 'text-ink' : 'text-faint'}`}>
              <n.Icon size={25} strokeWidth={on(n.href) ? 2.3 : 1.7} />{n.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function Toaster() {
  const [list, setList] = useState<Toast[]>([]);
  useEffect(() => toasts.on((t) => { setList((l) => [...l.slice(-2), t]); setTimeout(() => setList((l) => l.filter((x) => x.id !== t.id)), 5200); }), []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[80] flex flex-col items-center gap-2 px-3 md:items-end md:right-6 md:left-auto md:top-6" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div key={t.id} layout initial={{ opacity: 0, y: -16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }} transition={{ type: 'spring', stiffness: 460, damping: 34 }}
            className="pointer-events-auto w-full max-w-[380px] overflow-hidden rounded-[20px] panel">
            <Link href={t.href ?? '#'} className="flex gap-3 p-4">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${t.tone === 'down' ? 'bg-down' : t.tone === 'brand' ? 'bg-ink' : 'bg-signal'}`} />
              <span className="min-w-0"><span className="block text-[15px] font-semibold">{t.title}</span>{t.body && <span className="mt-0.5 block text-[13.5px] text-mute">{t.body}</span>}</span>
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
