'use client';
/* eslint-disable @next/next/no-img-element -- market art */
import type { MarketCategory } from '@called/sdk';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import { Mark } from '@/components/Brand';
import { Battle } from '@/components/battle/Battle';
import { Chip, CutButton, SectionTitle, ThemeToggle } from '@/components/bc';
import { usd, timeLeft } from '@/lib/format';
import { useLiveOdds } from '@/lib/live-hooks';
import { usePredict } from '@/lib/predict';
import { useRouter } from 'next/navigation';
import { FundsSheet } from '@/components/FundsSheet';
import { BigMoney, MarketRow, RowSkeleton, TopCallCard, ValueChart } from '@/components/home-bits';
import { Shell } from '@/components/Shell';
import { BRAND } from '@/lib/brand';
import { haptic } from '@/lib/fx';
import { money, usePlayAccount } from '@/lib/play';
import { useSession } from '@/lib/session';

const CATS: { v: MarketCategory | 'all'; l: string }[] = [
  { v: 'all', l: 'All' }, { v: 'sports', l: 'Sports' }, { v: 'crypto', l: 'Crypto' }, { v: 'culture', l: 'Culture' },
  { v: 'tech', l: 'Tech' }, { v: 'music', l: 'Music' }, { v: 'weather', l: 'Weather' },
];
type Tab = 'watch' | 'called' | 'poly';


function Balance({ onFunds }: { onFunds: (m: 'deposit' | 'withdraw') => void }) {
  const a = usePlayAccount();
  const [range, setRange] = useState<'1D' | '1W' | 'ALL'>('1W');
  if (!a.data) return <div className="px-4 pt-2 pb-6"><div className="h-4 w-24 rounded shimmer" /><div className="mt-3 h-11 w-52 rounded-lg shimmer" /><div className="mt-6 h-[72px] rounded-xl shimmer" /></div>;
  const d = a.data;
  const hist = d.history.map((h) => h.value).concat(d.value);
  const cut = range === '1D' ? Math.max(0, hist.length - 6) : range === '1W' ? Math.max(0, hist.length - 30) : 0;
  const pts = hist.slice(cut);
  const delta = range === '1D' ? d.pnlToday : pts.length ? d.value - pts[0]! : 0;
  const base = d.value - delta || 1;
  const up = delta >= 0;
  return (
    <section className="px-4 pt-2 pb-5">
      <div className="flex items-start justify-between gap-3">
        <Link href="/portfolio" className="min-w-0">
          <div className="text-[13px] text-mute">Portfolio value</div>
          <BigMoney value={d.value} className="mt-1 block text-[40px] leading-none font-semibold tracking-[-0.035em]" />
          <div className={`mt-2 text-[14px] font-medium tabular-nums ${up ? 'text-mint' : 'text-coral'}`}>
            {money(delta, true)} ({up ? '+' : ''}{((delta / base) * 100).toFixed(2)}%) <span className="text-mute font-normal">{range === '1D' ? 'today' : range === '1W' ? 'past week' : 'all time'}</span>
          </div>
        </Link>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => { haptic('tap'); onFunds('deposit'); }}
          className="shrink-0 h-11 pl-4 pr-5 rounded-full text-[15px] font-semibold text-white bg-grape hover:brightness-110 flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>Deposit
        </motion.button>
      </div>
      <div className="mt-4 -mx-1"><ValueChart points={pts} up={up} /></div>
      <div className="mt-2 flex items-center gap-1">
        {(['1D', '1W', 'ALL'] as const).map((r) => (
          <button key={r} onClick={() => { setRange(r); haptic('tap'); }} className={`relative h-7 px-3 text-[12px] font-semibold rounded-full ${range === r ? 'text-ink' : 'text-mute'}`}>
            {range === r && <motion.span layoutId="range" className="absolute inset-0 rounded-full bg-ink/[.08]" />}<span className="relative">{r}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-4 text-[13px]">
          <span className="text-mute">Cash <span className="text-ink tabular-nums">{money(d.balance)}</span></span>
          <button onClick={() => onFunds('withdraw')} className="text-mute hover:text-ink font-medium">Withdraw</button>
        </div>
      </div>
    </section>
  );
}

function GuestHero() {
  return (
    <section className="mx-4 mt-2 mb-5 relative overflow-hidden rounded-[24px] border border-line bg-panel p-5">
      <Mark size={36} />
      <h1 className="mt-4 text-[26px] leading-[1.1] font-semibold tracking-[-0.03em]">Call it before<br />everyone else.</h1>
      <p className="mt-2 text-[14px] text-mute max-w-[300px]">Trade on sports, crypto and culture with friends. Every verdict is verified on-chain.</p>
      <div className="mt-5 flex gap-2">
        <Link href="/signin" className="h-11 px-5 cuts bg-grape text-white text-[15px] font-semibold grid place-items-center">Get started</Link>
        <Link href="/signin?demo=1" className="h-11 px-5 rounded-full border border-line text-[15px] font-semibold grid place-items-center">Try demo</Link>
      </div>
    </section>
  );
}

function TopStrip() {
  const { api } = useSession();
  const q = useQuery({ queryKey: ['play-top'], queryFn: () => api.playTop(), refetchInterval: 60_000 });
  const items = q.data?.items ?? [];
  return (
    <section className="pb-5">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-[17px] font-semibold tracking-tight">Top calls this week</h2>
        <Link href="/leaderboard" className="text-[13px] text-mute hover:text-ink">Leaderboard</Link>
      </div>
      <div className="flex gap-2.5 overflow-x-auto px-4 snap-x no-scrollbar">
        {q.isLoading && [0, 1, 2].map((i) => <div key={i} className="w-[168px] h-[148px] shrink-0 rounded-[20px] shimmer" />)}
        {items.slice(0, 10).map((t, i) => <TopCallCard key={t.handle} t={t} rank={i + 1} />)}
      </div>
    </section>
  );
}

function Markets() {
  const { api, me } = useSession();
  const acct = usePlayAccount();
  const [tab, setTab] = useState<Tab>(me ? 'called' : 'called');
  const [cat, setCat] = useState<MarketCategory | 'all'>('all');
  const called = useQuery({ queryKey: ['markets', 'called', cat], queryFn: () => api.markets({ venue: 'called', sort: 'volume', category: cat === 'all' ? undefined : cat }), refetchInterval: 30_000, enabled: tab === 'called' });
  const watchIds = new Set((acct.data?.open ?? []).map((p) => p.market_id));
  const watch = useQuery({ queryKey: ['markets', 'called', 'all'], queryFn: () => api.markets({ venue: 'called', sort: 'volume' }), enabled: tab === 'watch' });
  const list = tab === 'called' ? called : watch;
  const items = tab === 'watch' ? (list.data?.items ?? []).filter((m) => watchIds.has(m.id)) : list.data?.items ?? [];
  const tabs: { v: Tab; l: string; badge?: string }[] = [
    ...(me ? [{ v: 'watch' as Tab, l: 'Watchlist' }] : []), { v: 'called', l: BRAND.name },
  ];
  return (
    <section>
      <div className="sticky top-0 md:top-0 z-10 bg-bg/85 backdrop-blur-xl">
        <div className="flex items-center gap-5 px-4 h-12 border-b border-line">
          {tabs.map((t) => (
            <button key={t.v} onClick={() => { setTab(t.v); haptic('tap'); }} className={`relative h-full flex items-center gap-1.5 text-[16px] font-semibold tracking-tight ${tab === t.v ? 'text-ink' : 'text-mute'}`}>
              {t.l}{t.badge && <span className="rounded-full bg-mint-light text-mint text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wide">{t.badge}</span>}
              {tab === t.v && <motion.span layoutId="home-tab" className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-ink" />}
            </button>
          ))}
        </div>
        {tab === 'called' && (
          <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
            {CATS.map((c) => (
              <motion.button key={c.v} whileTap={{ scale: 0.94 }} onClick={() => { setCat(c.v); haptic('tap'); }}
                className={`shrink-0 h-[30px] px-3 text-[12px] font-bold uppercase tracking-[.08em] border transition-colors ${cat === c.v ? 'bg-ink text-bg border-transparent' : 'border-line text-mute hover:text-ink'}`}>{c.l}</motion.button>
            ))}
          </div>
        )}
      </div>
      <div className="divide-y divide-line/60">
        {list.isLoading && [0, 1, 2, 3, 4].map((i) => <RowSkeleton key={i} />)}
        {items.map((m, i) => <MarketRow key={m.id} m={m} i={i} />)}
        {!list.isLoading && items.length === 0 && (
          <div className="px-4 py-12 text-center text-[14px] text-mute">{tab === 'watch' ? 'Markets you trade show up here.' : 'No markets here yet.'}</div>
        )}
      </div>
    </section>
  );
}

const LIVE_CATS: [string, string][] = [['all', 'All'], ['sports', 'Football'], ['crypto', 'Crypto'], ['f1', 'F1'], ['tech', 'Gaming'], ['music', 'Music'], ['entertainment', 'Movies'], ['science', 'Space']];

/** LIVE: one hero battle (the biggest market in the category) with YES/NO, then UP NEXT. Broadcast direction C. */
function Live() {
  const { api, me } = useSession();
  const router = useRouter();
  const predict = usePredict();
  const [cat, setCat] = useState('all');
  const qcat = cat === 'f1' ? 'sports' : cat;
  const q = useQuery({ queryKey: ['markets', 'called', 'live', qcat], queryFn: () => api.markets({ venue: 'called', sort: 'volume', status: 'open', category: qcat === 'all' ? undefined : qcat as MarketCategory }), refetchInterval: 30_000 });
  const list = (q.data?.items ?? []).filter((m) => cat !== 'f1' || /\bF1\b|grand prix|formula/i.test(m.question));
  const hero = list[0];
  const odds = useLiveOdds(hero?.id ?? '0', Number(hero?.price_yes ?? 0.5));
  const call = (o: 0 | 1, e: React.MouseEvent) => {
    if (!hero) return; if (!me) return router.push('/signin');
    haptic('tap'); predict.mutate({ marketId: String(hero.id), outcome: o, origin: { x: e.clientX / innerWidth, y: e.clientY / innerHeight } });
  };
  return (
    <>
      <div className="no-scrollbar flex gap-1 overflow-x-auto px-4 pb-3">{LIVE_CATS.map(([k, l]) => <Chip key={k} on={cat === k} onClick={() => setCat(k)}>{l}</Chip>)}</div>
      {q.isLoading ? <div className="mx-4 shimmer h-[420px]" /> : !hero ? <p className="px-4 py-10 text-center text-mute">No live markets in this category.</p> : (
        <section className="mx-4 cuts overflow-hidden bg-panel">
          <Link href={`/markets/${hero.id}`}><Battle marketId={String(hero.id)} p={odds.p} category={hero.category} question={hero.question} image={hero.image_url} closeTs={hero.close_ts} height={250} /></Link>
          <div className="p-3">
            <Link href={`/markets/${hero.id}`}><h2 className="cd text-[32px] leading-[.95] uppercase">{hero.question}</h2></Link>
            <div className="mn mt-2 text-[11px] uppercase text-mute">{usd(hero.volume)} vol · ends {timeLeft(hero.close_ts)}</div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <CutButton tone="mint" size="lg" onClick={(e) => call(1, e)}>Yes {Math.round(odds.p * 100)}¢</CutButton>
              <CutButton tone="coral" size="lg" onClick={(e) => call(0, e)}>No {100 - Math.round(odds.p * 100)}¢</CutButton>
            </div>
          </div>
        </section>
      )}
      <SectionTitle aside={`${Math.max(0, list.length - 1)} LIVE`}>Up next</SectionTitle>
      <ul className="pb-6">
        {list.slice(1, 12).map((m, i) => (
          <motion.li key={m.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
            <Link href={`/markets/${m.id}`} className="flex items-center gap-3 border-b border-line px-4 py-3">
              {m.image_url ? <img src={m.image_url} alt="" className="h-9 w-9 shrink-0 object-cover" /> : <span className="h-9 w-9 shrink-0 bg-snow" />}
              <span className="line-clamp-2 flex-1 text-[15px] font-semibold leading-snug">{m.question}</span>
              <span className={`cd text-[28px] ${Number(m.price_yes) >= 0.5 ? 'text-mint' : 'text-coral'}`}>{Math.round(Number(m.price_yes) * 100)}%</span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </>
  );
}

function BalancePill() {
  const { me } = useSession();
  const acct = usePlayAccount();
  if (!me) return <Link href="/signin" className="cuts cd grid h-9 place-items-center bg-grape px-3 text-[18px] text-white">Sign in</Link>;
  return <Link href="/portfolio" className="mn grid h-9 place-items-center bg-ink px-3 text-[14px] font-bold text-bg">{acct.data ? money(acct.data.value ?? acct.data.balance) : '—'}</Link>;
}

export default function Home() {
  const { me } = useSession();
  const [funds, setFunds] = useState<'deposit' | 'withdraw' | null>(null);
  return (
    <Shell actions={<div className="flex items-center gap-2.5"><ThemeToggle /><BalancePill /></div>}>
      <Live />
      {me ? <><SectionTitle>Your bankroll</SectionTitle><Balance onFunds={setFunds} /></> : <GuestHero />}
      <TopStrip />
      <Markets />
      {funds && <FundsSheet open mode={funds} onClose={() => setFunds(null)} />}
    </Shell>
  );
}
