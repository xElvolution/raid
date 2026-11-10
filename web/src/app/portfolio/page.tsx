'use client';
import type { PlayPosition } from '@called/sdk';
import { MarketTile } from '@/components/CategoryIcon';
import { FundsSheet } from '@/components/FundsSheet';
import { BigMoney, ValueChart, marketHref } from '@/components/home-bits';
import { money, usePlayAccount } from '@/lib/play';
/* eslint-disable @next/next/no-img-element -- remote venue art */
import type { Position } from '@called/sdk';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { calledIt } from '@/lib/fx';
import { useMyProfile, Shell } from '@/components/Shell';
import { Empty, LinkButton, Segmented, Skeleton, Ticker } from '@/components/ui';
import { timeLeft } from '@/lib/format';
import { useSession } from '@/lib/session';

/** Points the call has moved since entry, from the caller's side (cents of probability). */
function edge(p: Position): number {
  const entry = Number(p.price_yes), now = Number(p.price_now);
  return Math.round((p.outcome ? now - entry : entry - now) * 100);
}

function Row({ p, i }: { p: Position; i: number }) {
  const side = p.venue !== 'called' && p.outcomes ? p.outcomes[p.outcome ? 0 : 1] : p.outcome ? 'Yes' : 'No';
  const entry = Math.round((p.outcome ? Number(p.price_yes) : 1 - Number(p.price_yes)) * 100);
  const now = Math.round((p.outcome ? Number(p.price_now) : 1 - Number(p.price_now)) * 100);
  const d = edge(p);
  const settled = p.result === 'YES' || p.result === 'NO';
  const won = settled && ((p.result === 'YES') === (p.outcome === 1));
  return (
    <motion.li initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
      <Link href={`/markets/${p.market_id}`} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 border-b border-line last:border-0 hover:bg-ink/[.03]">
        <div className="flex gap-3 min-w-0">
          {p.image_url ? <img src={p.image_url} alt="" className="h-9 w-9 rounded-lg object-cover shrink-0" /> : <span className="h-9 w-9 rounded-lg bg-snow shrink-0" />}
          <div className="min-w-0">
            <p className="text-[14px] leading-snug line-clamp-2">{p.question}</p>
            <p className="text-[12px] text-mute mt-1 tabular-nums">
              <span className={p.outcome ? 'text-mint' : 'text-coral'}>{side}</span> · entry {entry}¢ · {settled ? 'settled' : timeLeft(p.close_ts)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[15px] font-semibold tabular-nums">{settled ? (won ? 'Won' : 'Lost') : `${now}¢`}</div>
          <div className={`text-[12px] tabular-nums ${settled ? (won ? 'text-mint' : 'text-coral') : d > 0 ? 'text-mint' : d < 0 ? 'text-coral' : 'text-mute'}`}>{settled ? '' : `${d > 0 ? '+' : ''}${d} pts`}</div>
        </div>
      </Link>
    </motion.li>
  );
}

function PlayRow({ p, i }: { p: PlayPosition; i: number }) {
  const up = p.pnl >= 0;
  return (
    <motion.li initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="border-b border-line last:border-0">
      <Link href={marketHref({ id: p.market_id, venue: p.venue })} className="flex items-center gap-3 p-4 hover:bg-ink/[.025]">
        <MarketTile category={p.category} image={p.image_url} size={40} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium line-clamp-1">{p.question}</div>
          <div className="mt-1 text-[12px] text-mute tabular-nums">
            <span className={p.outcome ? 'text-mint' : 'text-coral'}>{p.outcome ? 'Yes' : 'No'}</span> · {p.shares.toFixed(1)} sh @ {Math.round(p.avg * 100)}¢{p.settled ? '' : ` · now ${Math.round(p.price * 100)}¢`}
          </div>
        </div>
        <div className="text-right">
          {p.settled ? (
            <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wide ${p.won ? 'bg-mint-light text-mint' : 'bg-ink/5 text-mute'}`}>{p.won ? 'CALLED IT' : 'MISSED'}</span>
          ) : <div className="text-[15px] font-semibold tabular-nums">{money(p.value)}</div>}
          <div className={`mt-0.5 text-[12px] font-medium tabular-nums ${up ? 'text-mint' : 'text-coral'}`}>{money(p.pnl, true)}</div>
        </div>
      </Link>
    </motion.li>
  );
}

/** Fire the CALLED IT screen once for each newly settled winning play position. */
function useWinReveal(rows: PlayPosition[] | undefined) {
  useEffect(() => {
    if (!rows?.length) return;
    const seen = new Set<string>(JSON.parse(localStorage.getItem('called.seenWins') ?? '[]'));
    const fresh = rows.filter((r) => r.settled && r.won && !seen.has(String(r.market_id)));
    if (!fresh.length) return;
    fresh.forEach((r) => seen.add(String(r.market_id)));
    localStorage.setItem('called.seenWins', JSON.stringify([...seen]));
    const r = fresh[0]!;
    calledIt({ amount: r.pnl > 0 ? r.pnl : r.value, question: r.question });
  }, [rows]);
}

export default function Portfolio() {
  const { api, me } = useSession();
  const [tab, setTab] = useState<'open' | 'settled' | 'calls'>('open');
  const [funds, setFunds] = useState<'deposit' | 'withdraw' | null>(null);
  const acct = usePlayAccount();
  const q = useQuery({ queryKey: ['positions'], queryFn: () => api.myPredictions(), enabled: !!me, refetchInterval: 15_000 });
  const prof = useMyProfile();
  useWinReveal(acct.data?.settled);
  if (!me) return <Shell title="Portfolio"><Empty title="Your calls live here" body="Sign in to track every call, entry price and result." action={<LinkButton href="/signin">Sign in</LinkButton>} /></Shell>;
  const all = q.data?.items ?? [];
  const open = all.filter((p) => !(p.result === 'YES' || p.result === 'NO'));
  const settled = all.filter((p) => p.result === 'YES' || p.result === 'NO');
  const won = settled.filter((p) => (p.result === 'YES') === (p.outcome === 1)).length;
  const edgeSum = open.reduce((a, p) => a + edge(p), 0);
  const list = open;
  const stats = [
    { l: 'Open calls', v: <Ticker value={open.length} /> },
    { l: 'Edge since entry', v: <span className={edgeSum > 0 ? 'text-mint' : edgeSum < 0 ? 'text-coral' : ''}>{edgeSum > 0 ? '+' : ''}<Ticker value={edgeSum} /> pts</span> },
    { l: 'Win rate', v: settled.length ? `${Math.round((won / settled.length) * 100)}%` : <span className="text-mute">n/a</span> },
    { l: 'XP', v: <Ticker value={prof.data?.xp ?? 0} /> },
  ];
  return (
    <Shell title="Portfolio" flush>
      <section className="px-4 pt-4">
        <div className="text-[13px] text-mute">Portfolio value</div>
        {acct.data ? <BigMoney value={acct.data.value} className="mt-1 block text-[40px] leading-none font-semibold tracking-[-0.035em]" /> : <div className="mt-2 h-10 w-48 rounded-lg shimmer" />}
        {acct.data && <div className={`mt-2 text-[14px] font-medium tabular-nums ${acct.data.pnl >= 0 ? 'text-mint' : 'text-coral'}`}>{money(acct.data.pnl, true)} all time <span className="text-mute font-normal">· {money(acct.data.pnlToday, true)} today</span></div>}
        <div className="mt-4"><ValueChart points={(acct.data?.history ?? []).map((h) => h.value)} up={(acct.data?.pnl ?? 0) >= 0} height={96} /></div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setFunds('deposit')} className="h-11 cuts cd text-[20px] bg-grape text-white text-[15px] font-semibold">Deposit</motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setFunds('withdraw')} className="h-11 cut-tr cd text-[20px] bg-snow border border-line text-[15px] font-semibold">Withdraw</motion.button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mt-5 rounded-2xl border border-line bg-line overflow-hidden">
          {[
            { l: 'Cash', v: money(acct.data?.balance ?? 0) },
            { l: 'In positions', v: money(acct.data?.positionsValue ?? 0) },
            ...stats.slice(2),
          ].map((s) => <div key={s.l} className="bg-panel p-4"><div className="text-[12px] text-mute">{s.l}</div><div className="text-[20px] font-semibold tabular-nums tracking-tight mt-1">{s.v}</div></div>)}
        </div>
      </section>
      <div className="mt-6"><Segmented id="pf" value={tab} onChange={setTab} options={[{ value: 'open', label: `Positions · ${acct.data?.open.length ?? 0}` }, { value: 'settled', label: `Settled · ${acct.data?.settled.length ?? 0}` }, { value: 'calls', label: `Free calls · ${open.length}` }]} /></div>
      {tab !== 'calls' ? (
        acct.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          : (tab === 'open' ? acct.data?.open : acct.data?.settled)?.length
            ? <ul className="border-b border-line">{(tab === 'open' ? acct.data!.open : acct.data!.settled).map((p, i) => <PlayRow key={`${p.market_id}-${p.outcome}`} p={p} i={i} />)}</ul>
            : <Empty title={tab === 'open' ? 'No open positions' : 'Nothing settled yet'} body="Buy Yes or No on any market to build your book." action={<LinkButton href="/explore">Explore markets</LinkButton>} />
      ) : q.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        : list.length === 0 ? <Empty title="No open calls" body="Free calls earn XP and build your record." action={<LinkButton href="/raids">See live raids</LinkButton>} />
        : <ul className="border-b border-line">{list.map((p, i) => <Row key={p.market_id} p={p} i={i} />)}</ul>}
      <div className="h-8" />
      {funds && <FundsSheet open mode={funds} onClose={() => setFunds(null)} />}
    </Shell>
  );
}
