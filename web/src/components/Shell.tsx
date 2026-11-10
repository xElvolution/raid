'use client';
/* eslint-disable @next/next/no-img-element -- remote venue art */
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeToggle } from './bc';
import { Bell, ChevronLeft, CircleUser, Flame, MessageSquare, Plus, Radio, Rows3, Search, Trophy } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { DAILY_GOAL_XP, divisionFor } from '@/lib/gamification';
import { usd } from '@/lib/format';
import { useLiveStatus } from '@/lib/live-hooks';
import { useSession } from '@/lib/session';
import { IconBell, IconCards, IconGlobe, IconHome, IconMarkets, IconTrophy, IconUser } from './icons';
import { Sparkline } from './market-bits';
import { StreakFlame } from './Streak';
import { Avatar, LinkButton, Progress } from './ui';
import { Mark, Wordmark } from './Brand';
import { IconSearch as IconSearchL, IconUsers } from './icons';

type Ico = ComponentType<{ size?: number; filled?: boolean }>;
const IconWallet: Ico = ({ size = 24, filled }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
    <rect x="3.5" y="6" width="17" height="13" rx="2.5" fill={filled ? 'currentColor' : 'none'} /><path d="M16 12.5h2" stroke={filled ? 'var(--color-bg)' : 'currentColor'} strokeLinecap="round" /><path d="M6 6l9-2.5V6" />
  </svg>
);

const IconSearch = IconSearchL as Ico;
const IconPeople = IconUsers as Ico;

const NAV: { href: string; label: string; Icon: Ico; tab?: boolean }[] = [
  { href: '/', label: 'Home', Icon: IconHome, tab: true },
  { href: '/explore', label: 'Explore', Icon: IconGlobe, tab: true },
  { href: '/social', label: 'Social', Icon: IconPeople as Ico },
  { href: '/raids', label: 'Raids', Icon: IconMarkets },
  { href: '/portfolio', label: 'Portfolio', Icon: IconWallet, tab: true },
  { href: '/leaderboard', label: 'Leaderboard', Icon: IconTrophy, tab: true },
  { href: '/notifications', label: 'Notifications', Icon: IconBell },
];

export function Logo({ size = 28 }: { size?: number }) {
  return <Mark size={size} />;
}

export function useMyProfile() {
  const { api, me } = useSession();
  return useQuery({ queryKey: ['profile', me?.handle], queryFn: () => api.user(me?.handle ?? ''), enabled: !!me?.handle, refetchInterval: 30_000 });
}

function LiveDot() {
  const status = useLiveStatus();
  return (
    <span className="relative flex h-2 w-2" title={`Realtime ${status}`} aria-label={`Realtime ${status}`}>
      {status === 'open' && <span className="absolute inline-flex h-full w-full rounded-full bg-mint opacity-50 animate-ping" />}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${status === 'open' ? 'bg-mint' : status === 'connecting' ? 'bg-sun' : 'bg-line'}`} />
    </span>
  );
}

function RailCard({ title, href, children }: { title: string; href?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel">
      <header className="flex items-center justify-between px-4 pt-4 pb-2"><h2 className="text-[15px] font-semibold">{title}</h2>{href && <Link href={href} className="text-[13px] text-mute hover:text-ink">See all</Link>}</header>
      {children}
    </section>
  );
}

function Trending() {
  const { api } = useSession();
  const q = useQuery({ queryKey: ['rail-trending'], queryFn: () => api.markets({ venue: 'called', sort: 'volume' }), refetchInterval: 30_000 });
  return (
    <RailCard title="Trending calls" href="/raids">
      <ul className="pb-2">
        {(q.data?.items ?? []).slice(0, 5).map((m) => {
          const p = Number(m.price_yes);
          return (
            <li key={m.id}>
              <Link href={`/markets/${m.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-ink/[.03] transition-colors">
                {m.image_url ? <img src={m.image_url} alt="" className="h-8 w-8 rounded-md object-cover shrink-0" /> : <span className="h-8 w-8 rounded-md bg-snow shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug line-clamp-2">{m.question}</p>
                  <p className="text-[12px] text-mute mt-0.5 tabular-nums">{usd(m.volume_24h ?? m.volume)} vol</p>
                </div>
                <div className="w-14 shrink-0 text-right">
                  <div className="text-[15px] font-semibold tabular-nums">{Math.round(p * 100)}%</div>
                  {m.spark && m.spark.length > 2 && <div className="h-4 mt-0.5"><Sparkline data={m.spark} width={56} height={16} thin /></div>}
                </div>
              </Link>
            </li>
          );
        })}
        {q.isLoading && [0, 1, 2, 3].map((i) => <li key={i} className="mx-4 my-2 h-10 rounded-lg shimmer" />)}
      </ul>
    </RailCard>
  );
}

function TopCallers() {
  const { api } = useSession();
  const q = useQuery({ queryKey: ['rail-lb'], queryFn: () => api.leaderboard('7d') });
  return (
    <RailCard title="Top callers this week" href="/leaderboard">
      <ol className="pb-2">
        {(q.data?.items ?? []).slice(0, 5).map((r, i) => (
          <li key={String(r.handle)}>
            <Link href={`/u/${r.handle}`} className="flex items-center gap-3 px-4 py-2 hover:bg-ink/[.03]">
              <span className="w-4 text-[13px] text-mute tabular-nums">{i + 1}</span>
              <Avatar handle={String(r.handle)} url={r.avatar_url ?? null} size={28} />
              <span className="flex-1 truncate text-[14px]">{r.display_name ?? r.handle}</span>
              <span className="text-[13px] tabular-nums text-mint">{usd(r.score)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </RailCard>
  );
}

function RightRail() {
  const { me } = useSession();
  const { data } = useMyProfile();
  const div = divisionFor(data?.xp ?? 0);
  return (
    <aside className="hidden lg:flex flex-col gap-4 w-[340px] shrink-0 sticky top-0 self-start py-4 max-h-dvh overflow-y-auto no-scrollbar">
      {me ? (
        <section className="rounded-2xl border border-line bg-panel p-4">
          <div className="flex items-center justify-between text-[13px] text-mute"><span>Daily goal</span><span className="tabular-nums">{Math.min(data?.xp_today ?? 0, DAILY_GOAL_XP)} / {DAILY_GOAL_XP} XP</span></div>
          <Progress value={Math.min(1, (data?.xp_today ?? 0) / DAILY_GOAL_XP)} color="var(--color-grape)" className="mt-2" />
          <div className="flex items-center justify-between mt-4 text-[13px]"><span className="text-mute">{div.current.name} league</span><span className="text-mute tabular-nums">{div.next ? `${div.next.min - (data?.xp ?? 0)} XP to ${div.next.name}` : 'Top division'}</span></div>
          <Progress value={div.progress} color="var(--color-ink)" className="mt-2" />
        </section>
      ) : (
        <section className="rounded-2xl border border-line bg-panel p-4">
          <h2 className="text-[17px] font-semibold tracking-tight">New to RAID?</h2>
          <p className="text-[14px] text-mute mt-1 mb-4">Call a raid on any memecoin, rally a crew, and let the chest sell at your line.</p>
          <LinkButton href="/signin" className="w-full">Create account</LinkButton>
        </section>
      )}
      <Trending />
      <TopCallers />
      <p className="text-[12px] text-mute px-2 leading-relaxed">XP, streaks and leagues have no monetary value. Raids are a game, not investment advice.</p>
    </aside>
  );
}

/** Unread notification count for the bell (cheap poll; live events also invalidate it). */
function useUnread() {
  const { api, me } = useSession();
  return useQuery({ queryKey: ['notifications'], queryFn: () => api.notifications(), enabled: !!me, refetchInterval: 30_000, select: (d) => (d as { unread?: number }).unread ?? 0 });
}

const TABS = [
  { href: '/', label: 'Live', Icon: Radio },
  { href: '/social', label: 'Feed', Icon: Rows3 },
  { href: '/create', label: 'Call', Icon: Plus, fab: true },
  { href: '/leaderboard', label: 'Table', Icon: Trophy },
  { href: '__card', label: 'Card', Icon: CircleUser },
] as const;

export function Shell({ children, title, wide, bare, flush, back, actions, hideTabs }: { children: ReactNode; title?: ReactNode; wide?: boolean; bare?: boolean; flush?: boolean; back?: boolean | string; actions?: ReactNode; hideTabs?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const { me } = useSession();
  const prof = useMyProfile();
  const unread = useUnread();
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const profileHref = me ? `/u/${me.handle}` : '/signin';
  return (
    <div className="min-h-dvh flex justify-center bg-bg">
      <nav className="hidden md:flex flex-col w-[76px] xl:w-[248px] shrink-0 px-3 py-4 sticky top-0 h-dvh" aria-label="Main">
        <Link href="/" className="flex items-center gap-2.5 px-3 h-12 mb-2"><span className="xl:hidden"><Mark size={30} /></span><span className="hidden xl:inline cd text-[28px]">RAID<span className="text-grape">/</span>Live</span></Link>
        {[...NAV, { href: '/messages', label: 'Messages', Icon: MessageSquare as unknown as Ico }, { href: profileHref, label: me ? 'Caller card' : 'Sign in', Icon: IconUser }].map(({ href, label, Icon }) => (
          <Link key={label} href={href} className={`relative flex items-center gap-4 px-3 h-12 text-[15px] font-semibold transition-colors ${active(href) ? 'text-ink shadow-[inset_3px_0_0_#7c5cff] bg-ink/[.03]' : 'text-mute hover:text-ink hover:bg-ink/[.03]'}`}>
            <Icon size={22} filled={active(href)} /><span className="hidden xl:inline">{label}</span>
          </Link>
        ))}
        <Link href="/create" className="mt-4 hidden xl:flex h-12 cuts bg-grape text-white cd text-[22px] items-center justify-center press">Call it ▶</Link>
      </nav>

      <div className="flex-1 min-w-0 flex gap-6 justify-center max-w-[1040px]">
        <main className={`flex-1 min-w-0 ${wide ? 'max-w-[720px]' : 'max-w-[600px]'} md:border-x border-line ${hideTabs ? 'pb-6' : 'pb-24 md:pb-10'}`}>
          {!bare && <header className="sticky top-0 z-20 bg-bg/90 backdrop-blur-xl px-4 h-[58px] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {back && <button onClick={() => (typeof back === 'string' ? router.push(back) : router.back())} aria-label="Back" className="-ml-1.5 grid h-9 w-9 place-items-center press"><ChevronLeft size={26} strokeWidth={2.2} /></button>}
              {typeof title === 'string' || title === undefined ? <h1 className="cd text-[30px] truncate pt-0.5">{title ?? <>RAID<span className="text-grape">/</span>Live</>}</h1> : title}
            </div>
            <div className="flex items-center gap-3.5">
              {actions ?? (
                <>
                  {me && <span className="hidden min-[360px]:inline-flex items-center gap-1 h-8 px-2.5 bg-snow mn text-[13px]"><Flame size={14} className="text-[#ffb547]" strokeWidth={2.4} />{prof.data?.streak ?? 0}</span>}
                  <ThemeToggle />
                  <Link href="/search" aria-label="Search" className="press"><Search size={22} strokeWidth={1.9} /></Link>
                  <Link href="/notifications" aria-label="Notifications" className="relative press"><Bell size={22} strokeWidth={1.9} />
                    {!!unread.data && <span className="absolute -right-1.5 -top-1 min-w-[16px] h-4 px-1 bg-grape mn text-[10px] leading-4 text-center">{unread.data > 9 ? '9+' : unread.data}</span>}</Link>
                </>
              )}
            </div>
          </header>}
          <div className={flush || bare ? "" : "px-4 pt-3"}>{children}</div>
        </main>
        <RightRail />
      </div>

      {!hideTabs && <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-bg border-t-2 border-line pb-[env(safe-area-inset-bottom)]" aria-label="Tabs">
        <div className="h-[62px] grid grid-cols-5 px-1.5">
          {TABS.map(({ href: h, label, Icon, ...t }) => {
            const href = h === '__card' ? profileHref : h;
            const on = 'fab' in t ? false : active(href);
            if ('fab' in t) return (
              <Link key={label} href={href} aria-label="Call it" className="grid place-items-center">
                <motion.span whileTap={{ scale: 0.9 }} className="cuts grid h-10 w-[54px] place-items-center bg-grape text-white"><Icon size={24} strokeWidth={3} /></motion.span>
              </Link>
            );
            return (
              <Link key={label} href={href} aria-label={label} className={`relative flex flex-col items-center gap-1 pt-2.5 text-[10px] font-extrabold tracking-[.1em] uppercase ${on ? 'text-ink' : 'text-[#6b6b75]'}`}>
                {on && <motion.span layoutId="tab-on" className="absolute inset-x-2 top-0 h-[3px] bg-grape" transition={{ type: 'spring', stiffness: 520, damping: 40 }} />}
                <motion.span whileTap={{ scale: 0.86 }}><Icon size={22} strokeWidth={on ? 2.4 : 1.8} /></motion.span>{label}
              </Link>
            );
          })}
        </div>
      </nav>}
    </div>
  );
}
