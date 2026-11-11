'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, Flag, Moon, Plus, Radio, Rocket, Sun, Swords, Trophy, Wallet, UserRound, MessagesSquare } from 'lucide-react';
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
  { href: '/launch', label: 'Launch', Icon: Rocket },
  { href: '/leaderboard', label: 'Ranks', Icon: Trophy },
] as const;

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button onClick={(e) => toggle({ x: e.clientX, y: e.clientY })} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} className="press grid h-9 w-9 place-items-center rounded-[10px] text-mute hover:text-ink hover:bg-raised">
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

export function WalletButton({ compact }: { compact?: boolean }) {
  const acct = useAccount();
  if (acct) return (
    <Link href={`/u/${acct}`} className="press flex h-9 items-center gap-2 rounded-[10px] pl-1 pr-3 hairline hover:bg-raised max-w-[180px]">
      <Identicon seed={acct} size={26} className="!rounded-[7px]" /><span className="truncate mono text-[12px]">{shortAddr(acct)}</span>
    </Link>
  );
  return (
    <button onClick={() => void connect()} className={`press flex h-9 items-center gap-2 rounded-[10px] px-3 text-[13px] font-semibold hairline hover:bg-raised ${compact ? 'w-9 justify-center !px-0' : ''}`} aria-label="Connect NEAR wallet">
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
        <nav aria-label="Main" className="hidden md:flex sticky top-0 h-dvh w-[5.25rem] xl:w-[244px] shrink-0 flex-col border-r border-line px-3 py-5">
          <Link href="/" className="mb-6 flex h-10 items-center px-2.5" aria-label="RAID home"><span className="xl:hidden"><Mark size={26} /></span><span className="hidden xl:inline"><Wordmark size={24} /></span></Link>
          <div className="flex flex-col gap-1">
            {NAV.map(({ href, label, Icon }) => (
              <Link key={href} href={href} aria-current={on(href) ? 'page' : undefined} className={`group relative flex h-11 items-center gap-3.5 rounded-[11px] px-3 text-[14.5px] font-semibold transition-colors ${on(href) ? 'text-ink bg-raised' : 'text-mute hover:text-ink hover:bg-raised/60'}`}>
                {on(href) && <motion.span layoutId="nav-on" className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-lime" />}
                <Icon size={20} strokeWidth={on(href) ? 2.4 : 1.9} /><span className="hidden xl:inline">{label}</span>
              </Link>
            ))}
            <Link href={acct ? `/u/${acct}` : '/u/me'} className={`flex h-11 items-center gap-3.5 rounded-[11px] px-3 text-[14.5px] font-semibold ${on('/u') ? 'text-ink bg-raised' : 'text-mute hover:text-ink hover:bg-raised/60'}`}><UserRound size={20} /><span className="hidden xl:inline">Caller card</span></Link>
          </div>
          <button onClick={() => openCall()} className="press mt-5 flex h-12 items-center justify-center gap-2 rounded-[12px] bg-lime text-[#0a1a00] font-bold" aria-label="Call a raid">
            <Plus size={20} strokeWidth={3} /><span className="hidden xl:inline wide text-[14px]">Call a raid</span>
          </button>
          <div className="mt-auto hidden xl:block rounded-[12px] p-3 hairline">
            <p className="eyebrow">War chest</p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px]"><span className="live-dot text-lime" />Keyless · {NETWORK === 'testnet' ? 'NEAR testnet' : 'NEAR mainnet'}</p>
            <p className="mt-1 text-[11.5px] text-mute leading-snug">Trades route through NEAR Intents. No one holds a key that can move funds.</p>
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-30 bg-bg/85 backdrop-blur-xl">
            <header className="flex h-[3.5rem] md:h-[60px] items-center justify-between gap-2 md:gap-3 px-3.5 md:px-6 border-b border-line">
              <div className="flex min-w-0 items-center gap-2.5">
                {back ? <button onClick={() => (history.length > 1 ? router.back() : router.push(back))} aria-label="Back" className="press -ml-1.5 grid h-9 w-9 place-items-center rounded-[10px] hover:bg-raised"><ChevronLeft size={20} /></button>
                  : <Link href="/" className="md:hidden" aria-label="RAID home"><Mark size={22} /></Link>}
                {typeof title === 'string' ? <h1 className="wide text-[1.125rem] md:text-[22px] truncate">{title}</h1> : title}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">{actions}<ThemeToggle /><span className="md:hidden"><WalletButton compact /></span><span className="hidden md:block"><WalletButton /></span></div>
            </header>
            <TickerTape />
          </div>
          <div className="flex justify-center gap-6 px-0 md:px-6">
            <main className={`min-w-0 flex-1 ${rail ? 'max-w-[760px]' : 'max-w-[1100px]'} ${flush ? '' : 'px-4 md:px-0'} pt-3 md:pt-4 pb-24 md:pb-12`}>{children}</main>
            {rail && <RightRail />}
          </div>
        </div>
      </div>

      {/* Phone tabs */}
      <nav aria-label="Tabs" className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/92 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
        <div className="grid h-[3.625rem] grid-cols-5 px-1">
          {[NAV[0], NAV[2], null, NAV[3], NAV[4]].map((n) => n === null ? (
            <button key="call" onClick={() => openCall()} aria-label="Call a raid" className="grid place-items-center">
              <motion.span whileTap={{ scale: 0.9 }} className="grid h-[2.625rem] w-[3.25rem] place-items-center rounded-[12px] bg-lime text-[#0a1a00] shadow-[0_6px_24px_-6px_rgb(198_255_61/.6)]"><Plus size={22} strokeWidth={3} /></motion.span>
            </button>
          ) : (
            <Link key={n.href} href={n.href} aria-current={on(n.href) ? 'page' : undefined} className={`relative flex flex-col items-center justify-center gap-[3px] text-[9.5px] font-bold uppercase tracking-[.08em] ${on(n.href) ? 'text-ink' : 'text-faint'}`}>
              {on(n.href) && <motion.span layoutId="tab-on" className="absolute top-0 h-[3px] w-8 rounded-b-full bg-lime" />}
              <n.Icon size={20} strokeWidth={on(n.href) ? 2.4 : 1.8} />{n.label}
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
            className="pointer-events-auto w-full max-w-[360px] overflow-hidden rounded-[14px] border border-line bg-panel shadow-[0_18px_50px_-12px_rgb(0_0_0/.6)]">
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
