'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, Clapperboard, Flag, Moon, Plus, Radio, Rocket, Sun, Swords, Trophy, Wallet, UserRound, MessagesSquare } from 'lucide-react';
import { Mark, Wordmark } from './Brand';
import { TickerTape } from './Ticker';
import { Identicon } from './ui';
import { RightRail } from './RightRail';
import { useTheme } from '@/lib/theme';
import { connect, useAccount } from '@/lib/wallet';
import { hits, openCall, toast, toasts, type Toast } from '@/lib/bus';
import { useRaids } from '@/lib/hooks';
import { shortAddr } from '@/lib/market';
import { target, xLabel, NETWORK, usdcOf } from '@/lib/raid';

const NAV = [
  { href: '/feed', label: 'Feed', Icon: MessagesSquare },
  { href: '/live', label: 'Live', Icon: Radio },
  { href: '/raids', label: 'Raids', Icon: Swords },
  { href: '/war', label: 'War', Icon: Flag },
  { href: '/reels', label: 'Reels', Icon: Clapperboard },
  { href: '/launch', label: 'Launch', Icon: Rocket },
  { href: '/leaderboard', label: 'Ranks', Icon: Trophy },
] as const;

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={(e) => toggle({ x: e.clientX, y: e.clientY })} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} className="press grid h-9 w-9 place-items-center rounded-full text-mute hover:text-ink btn-pearl">
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

export function WalletButton({ compact }: { compact?: boolean }) {
  const acct = useAccount();
  if (acct) return (
    <Link href={`/u/${acct}`} className="press flex h-9 items-center gap-2 rounded-full pl-1 pr-3 btn-pearl max-w-[180px]">
      <Identicon seed={acct} size={28} className="!rounded-full" /><span className="truncate mono text-[12px]">{shortAddr(acct)}</span>
    </Link>
  );
  return (
    <button onClick={() => void connect()} className={`press flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-semibold btn-ink ${compact ? 'w-9 justify-center !px-0' : ''}`} aria-label="Connect NEAR wallet">
      <Wallet size={15} />{!compact && 'Connect'}
    </button>
  );
}

/** Pops a toast when a new raid lands on the chest while you're watching. */
function useNewRaidToasts() {
  const raids = useRaids();
  const seen = useRef<number | null>(null);
  const status = useRef<Map<number, string>>(new Map());
  useEffect(() => { // design preview of the win moment: ?preview=hit (clearly labelled as a preview)
    if (new URLSearchParams(location.search).get('preview') === 'hit') setTimeout(() => hits.emit({ id: 0, symbol: 'PEPE', multiple: '1.5x', preview: true }), 600);
  }, []);
  useEffect(() => {
    const list = raids.data; if (!list) return;
    for (const r of list) { // a raid we were watching just settled above its line
      const was = status.current.get(r.id);
      if (was && was !== 'Closed' && r.status === 'Closed' && r.hit) hits.emit({ id: r.id, symbol: target(r).symbol, multiple: `${(Number(r.proceeds) / Math.max(1, Number(r.entry_cost))).toFixed(2)}x`, profitUsd: usdcOf(r.proceeds) - usdcOf(r.entry_cost) });
      status.current.set(r.id, r.status);
    }
    const top = list.length ? Math.max(...list.map((r) => r.id)) : -1;
    if (seen.current !== null && top > seen.current) {
      const r = list.find((x) => x.id === top)!;
      toast({ title: `New raid: $${target(r).symbol} → ${xLabel(r.target_x_bps)}`, body: `Called by ${shortAddr(r.caller)}. Crew is forming.`, tone: 'lime', href: `/raids/${r.id}` });
    }
    seen.current = top;
  }, [raids.data]);
}

export function Shell({ children, title, back, actions, rail = true, flush }: { children: ReactNode; title?: ReactNode; back?: string; actions?: ReactNode; rail?: boolean; flush?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const acct = useAccount();
  useNewRaidToasts();
  const on = (href: string) => path === href || path.startsWith(`${href}/`);
  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto flex max-w-[1440px]">
        {/* Desktop rail */}
        <nav aria-label="Main" className="hidden md:flex sticky top-3 my-3 ml-3 h-[calc(100dvh-1.5rem)] w-[4.75rem] xl:w-[232px] shrink-0 flex-col rounded-[26px] panel px-2.5 py-4 xl:px-3">
          <Link href="/" className="mb-6 flex h-10 items-center px-2.5" aria-label="RAID home"><span className="xl:hidden"><Mark size={26} /></span><span className="hidden xl:inline"><Wordmark size={24} /></span></Link>
          <div className="flex flex-col gap-1">
            {NAV.map(({ href, label, Icon }) => (
              <Link key={href} href={href} aria-current={on(href) ? 'page' : undefined} className={`group relative flex h-11 items-center gap-3.5 rounded-full px-3.5 text-[14.5px] font-medium transition-colors ${on(href) ? 'text-bg' : 'text-mute hover:text-ink hover:bg-raised/70'}`}>
                {on(href) && <motion.span layoutId="nav-on" className="absolute inset-0 rounded-full bg-ink shadow-[0_10px_20px_-12px_rgb(21_22_26/.7)]" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                <Icon size={19} strokeWidth={on(href) ? 2.2 : 1.8} className="relative" /><span className="relative hidden xl:inline">{label}</span>{on(href) && <span className="relative ml-auto hidden h-1.5 w-1.5 rounded-full bg-signal xl:block" />}
              </Link>
            ))}
            <Link href={acct ? `/u/${acct}` : '/u/me'} className={`flex h-11 items-center gap-3.5 rounded-full px-3.5 text-[14.5px] font-medium ${on('/u') ? 'bg-ink text-bg' : 'text-mute hover:text-ink hover:bg-raised/70'}`}><UserRound size={19} /><span className="hidden xl:inline">Caller card</span></Link>
          </div>
          <button onClick={() => openCall()} className="press mt-5 flex h-12 items-center justify-center gap-2 rounded-full btn-signal font-semibold" aria-label="Call a raid">
            <Plus size={19} strokeWidth={2.6} /><span className="hidden xl:inline text-[14.5px] tracking-[-0.02em]">Call a raid</span>
          </button>
          <div className="mt-auto hidden xl:block rounded-[18px] obsidian p-3.5">
            <p className="eyebrow">War chest</p>
            <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium"><span className="live-dot text-signal" />Keyless · {NETWORK === 'testnet' ? 'NEAR testnet' : 'NEAR mainnet'}</p>
            <p className="mt-1 text-[11.5px] text-white/55 leading-snug">Trades route through NEAR Intents. No one holds a key that can move funds.</p>
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-30 bg-bg/75 backdrop-blur-xl backdrop-saturate-150">
            <header className="flex h-[3.5rem] md:h-[64px] items-center justify-between gap-2 md:gap-3 px-4 md:px-7">
              <div className="flex min-w-0 items-center gap-2.5">
                {back ? <button onClick={() => (history.length > 1 ? router.back() : router.push(back))} aria-label="Back" className="press -ml-1 grid h-9 w-9 place-items-center rounded-full btn-pearl"><ChevronLeft size={20} /></button>
                  : <Link href="/" className="md:hidden" aria-label="RAID home"><Mark size={22} /></Link>}
                {typeof title === 'string' ? <h1 className="wide text-[1.25rem] md:text-[26px] truncate">{title}</h1> : title}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">{actions}<ThemeToggle /><span className="md:hidden"><WalletButton compact /></span><span className="hidden md:block"><WalletButton /></span></div>
            </header>
            <TickerTape />
          </div>
          <div className="flex justify-center gap-6 px-0 md:px-6">
            <main className={`min-w-0 flex-1 ${rail ? 'max-w-[760px]' : 'max-w-[1100px]'} ${flush ? '' : 'px-4 md:px-0'} pt-3 md:pt-5 pb-28 md:pb-14`}>{children}</main>
            {rail && <RightRail />}
          </div>
        </div>
      </div>

      {/* Phone tabs */}
      <nav aria-label="Tabs" className="md:hidden fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 rounded-full glass !border-0 bg-panel/80 shadow-[0_0_0_1px_var(--color-line),0_20px_40px_-18px_rgb(21_22_26/.45)]">
        <div className="grid h-[3.875rem] grid-cols-5 px-1.5">
          {[NAV[0], NAV[2], null, NAV[4], NAV[3]].map((n) => n === null ? (
            <button key="call" onClick={() => openCall()} aria-label="Call a raid" className="grid place-items-center">
              <motion.span whileTap={{ scale: 0.88 }} className="signal-pulse -mt-5 grid h-[3.375rem] w-[3.375rem] place-items-center rounded-full btn-signal ring-4 ring-bg"><Plus size={24} strokeWidth={2.6} /></motion.span>
            </button>
          ) : (
            <Link key={n.href} href={n.href} aria-current={on(n.href) ? 'page' : undefined} className={`relative flex flex-col items-center justify-center gap-[3px] text-[10px] font-medium tracking-[-0.01em] ${on(n.href) ? 'text-ink' : 'text-faint'}`}>
              {on(n.href) && <motion.span layoutId="tab-on" className="absolute inset-x-1 inset-y-1.5 rounded-full bg-raised" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <n.Icon size={20} strokeWidth={on(n.href) ? 2.2 : 1.7} className="relative" /><span className="relative">{n.label}</span>
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
            className="pointer-events-auto w-full max-w-[360px] overflow-hidden rounded-[18px] panel">
            <Link href={t.href ?? '#'} className="flex gap-2.5 p-3 md:p-3.5">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${t.tone === 'down' ? 'bg-down' : t.tone === 'brand' ? 'bg-brand' : 'bg-lime pulse-live'}`} />
              <span className="min-w-0"><span className="block text-[13px] md:text-[14px] font-semibold">{t.title}</span>{t.body && <span className="mt-0.5 block text-[12px] md:text-[12.5px] text-mute">{t.body}</span>}</span>
            </Link>
            <motion.div className="h-[2px] bg-lime origin-left" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: 5.2, ease: 'linear' }} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
