'use client';
/* eslint-disable @next/next/no-img-element -- remote market art */
import type { Trade } from '@called/sdk';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ago, shortAccount, timeLeft, usd } from '@/lib/format';
import { haptic } from '@/lib/fx';
import { useLive, useLiveOdds } from '@/lib/live-hooks';
import { useMyCalls, usePredict } from '@/lib/predict';
import { useSession } from '@/lib/session';
import { MarketTile } from './CategoryIcon';
import { IconCheck, IconExternal, IconShield } from './icons';
import { Sparkline } from './market-bits';
import { Shell } from './Shell';
import { TradePanel } from './TradePanel';
import { MarketChart } from './chart/MarketChart';
import { Battle } from './battle/Battle';
import { assetUrl, Avatar, Empty, Segmented, Skeleton } from './ui';

type Tab = 'comments' | 'activity' | 'holders' | 'book';

function Book({ id }: { id: string }) {
  const { api } = useSession();
  const q = useQuery({ queryKey: ['book', id], queryFn: () => api.book(id), refetchInterval: 5_000 });
  if (!q.data) return <div className="p-4 space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-7" />)}</div>;
  const max = Math.max(...q.data.asks.map((l) => l.shares), ...q.data.bids.map((l) => l.shares), 1);
  const Row = ({ price, shares, total, side }: { price: number; shares: number; total: number; side: 'ask' | 'bid' }) => (
    <div className="relative grid grid-cols-3 h-8 items-center px-4 text-[13px] tabular-nums">
      <motion.span className={`absolute inset-y-0.5 right-0 ${side === 'ask' ? 'bg-coral-light' : 'bg-mint-light'}`} initial={{ width: 0 }} animate={{ width: `${(shares / max) * 100}%` }} />
      <span className={`relative ${side === 'ask' ? 'text-coral' : 'text-mint'}`}>{Math.round(price * 100)}¢</span>
      <span className="relative text-right">{shares.toFixed(0)}</span>
      <span className="relative text-right text-mute">${total.toFixed(0)}</span>
    </div>
  );
  return (
    <div className="py-2">
      <div className="grid grid-cols-3 px-4 h-8 items-center text-[12px] text-mute"><span>Price (Yes)</span><span className="text-right">Shares</span><span className="text-right">Total</span></div>
      {[...q.data.asks].reverse().map((l) => <Row key={`a${l.price}`} {...l} side="ask" />)}
      <div className="flex justify-between px-4 h-9 items-center border-y border-line text-[13px]"><span className="font-semibold tabular-nums">Last {Math.round(q.data.priceYes * 100)}¢</span><span className="text-mute tabular-nums">Spread {Math.round(q.data.spread * 100)}¢</span></div>
      {q.data.bids.map((l) => <Row key={`b${l.price}`} {...l} side="bid" />)}
      <p className="px-4 pt-3 text-[12px] text-mute">Liquidity from the automated market maker. Every level is fillable now.</p>
    </div>
  );
}

function Activity({ id, live }: { id: string; live: Trade[] }) {
  const { api } = useSession();
  const q = useQuery({ queryKey: ['activity', id], queryFn: () => api.activity(id), refetchInterval: 10_000 });
  const rows = [
    ...live.map((t) => ({ k: `l${t.created_at}${t.account}`, handle: t.account, name: shortAccount(t.account), avatar: null as string | null, side: t.side, outcome: t.outcome, amount: Number(t.amount) / 1e6, created_at: t.created_at })),
    ...(q.data?.trades ?? []).map((t, i) => ({ k: `t${i}${t.created_at}`, handle: t.handle, name: t.display_name, avatar: t.avatar_url, side: t.side, outcome: t.outcome, amount: t.amount, created_at: t.created_at })),
  ].slice(0, 40);
  if (q.isLoading) return <div className="p-4 space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>;
  if (!rows.length) return <p className="px-4 py-10 text-center text-[14px] text-mute">No trades yet. Be the first.</p>;
  return (
    <ul>
      <AnimatePresence initial={false}>
        {rows.map((t) => (
          <motion.li key={t.k} layout initial={{ opacity: 0, backgroundColor: 'rgba(124,92,255,.10)' }} animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }} transition={{ duration: 0.8 }}
            className="flex items-center gap-3 px-4 h-14 border-b border-line">
            <Link href={`/u/${t.handle}`}><Avatar handle={t.handle} url={t.avatar} size={32} /></Link>
            <div className="flex-1 min-w-0 text-[14px] truncate"><span className="font-semibold">{t.name}</span> <span className="text-mute">{t.side === 'buy' ? 'bought' : 'sold'}</span> <span className={t.outcome === 1 ? 'text-mint' : 'text-coral'}>{t.outcome === 1 ? 'Yes' : 'No'}</span></div>
            <div className="text-right"><div className="text-[14px] font-semibold tabular-nums">${t.amount.toFixed(2)}</div><div className="text-[12px] text-mute">{ago(t.created_at)}</div></div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function Holders({ id }: { id: string }) {
  const { api } = useSession();
  const q = useQuery({ queryKey: ['activity', id], queryFn: () => api.activity(id) });
  const hs = q.data?.holders ?? [];
  const col = (o: number) => hs.filter((h) => h.outcome === o);
  if (q.isLoading) return <div className="p-4"><Skeleton className="h-24" /></div>;
  if (!hs.length) return <p className="px-4 py-10 text-center text-[14px] text-mute">No holders yet.</p>;
  return (
    <div className="grid grid-cols-2 divide-x divide-line">
      {[1, 0].map((o) => (
        <div key={o}>
          <div className={`px-4 h-10 flex items-center text-[13px] font-semibold ${o ? 'text-mint' : 'text-coral'}`}>{o ? 'Yes' : 'No'} holders</div>
          {col(o).map((h) => (
            <Link key={h.handle} href={`/u/${h.handle}`} className="flex items-center gap-2.5 px-4 h-12 hover:bg-ink/[.02]">
              <Avatar handle={h.handle} url={h.avatar_url} size={28} />
              <span className="flex-1 min-w-0 truncate text-[14px]">{h.display_name}</span>
              <span className="text-[13px] text-mute tabular-nums">{h.shares.toFixed(0)}</span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

function Comments({ id }: { id: string }) {
  const { api, me } = useSession();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['comments', id], queryFn: () => api.comments(id) });
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try { await api.post({ body: body.trim(), marketId: id }); setBody(''); haptic('success'); void qc.invalidateQueries({ queryKey: ['comments', id] }); }
    catch { haptic('error'); } finally { setBusy(false); }
  };
  return (
    <div>
      {me && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
          <Avatar handle={me.handle} url={me.avatar_url} size={32} />
          <input value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && body.trim()) void send(); }} maxLength={1000} placeholder="Add a comment" aria-label="Add a comment"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-mute" />
          <button disabled={!body.trim() || busy} onClick={() => void send()} className="text-[14px] font-semibold text-grape disabled:opacity-40">Post</button>
        </div>
      )}
      {q.isLoading ? <div className="p-4 space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        : !(q.data?.items.length) ? <p className="px-4 py-10 text-center text-[14px] text-mute">No comments yet. Start the conversation.</p>
        : q.data.items.map((c) => (
          <div key={c.id} className="flex gap-3 px-4 py-3 border-b border-line">
            <Link href={`/u/${c.handle}`}><Avatar handle={c.handle} url={c.avatar_url} size={36} /></Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[14px]">
                <span className="font-semibold truncate">{c.display_name}</span>
                {c.holds !== null && <span className={`text-[12px] rounded px-1.5 py-px ${c.holds ? 'bg-mint-light text-mint' : 'bg-coral-light text-coral'}`}>{Math.round(c.holds_shares ?? 0)} {c.holds ? 'Yes' : 'No'}</span>}
                <span className="text-mute shrink-0">· {ago(c.created_at)}</span>
              </div>
              <p className="mt-0.5 text-[15px] leading-[1.4] whitespace-pre-wrap break-words">{c.body}</p>
            </div>
          </div>
        ))}
    </div>
  );
}

const TABS = ['comments', 'activity', 'holders', 'book'] as const;
const SLIDE = {
  enter: (d: number) => ({ x: d * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d * -48, opacity: 0 }),
};

export function MarketDetail({ id }: { id: string }) {
  const { api, me } = useSession();
  const router = useRouter();
  const q = useQuery({ queryKey: ['market', id], queryFn: () => api.market(id) });
  const m = q.data?.market;
  const odds = useLiveOdds(id, Number(m?.price_yes ?? 0.5));
  const calls = useMyCalls();
  const predict = usePredict();
  const mine = calls.data?.get(id);
  const [tab, setTab] = useState<Tab>('comments');
  const [pick, setPick] = useState<0 | 1>(1);
  const [dir, setDir] = useState(1);
  const act = useQuery({ queryKey: ['activity', id], queryFn: () => api.activity(id), enabled: !!q.data && q.data.market.venue === 'called' });
  const avatars = useMemo(() => (act.data?.holders ?? []).filter((h) => h.avatar_url).map((h) => ({ side: (h.outcome ? 1 : 0) as 0 | 1, url: assetUrl(h.avatar_url)! })), [act.data]);
  const [liveTrades, setLiveTrades] = useState<Trade[]>([]);
  useLive(`market:${id}`, (e) => {
    if (e.type === 'trade') setLiveTrades((t) => [{ account: e.data.account, side: e.data.side as 'buy' | 'sell', outcome: e.data.outcome, amount: e.data.amount, shares: e.data.shares, created_at: new Date(e.ts).toISOString() }, ...t].slice(0, 20));
    if (e.type === 'resolution') void q.refetch();
  });
  if (q.isLoading) return <Shell title="Market"><Skeleton className="h-24 mb-3" /><Skeleton className="h-64" /></Shell>;
  if (!m) return <Shell title="Market"><Empty title="Market not found" /></Shell>;
  const external = m.venue !== 'called';
  const hist = m.spark ?? [];
  const series = hist.length > 1 ? [...hist, odds.p] : odds.history;
  const labels: [string, string] = external && m.outcomes ? [m.outcomes[0], m.outcomes[1]] : ['Yes', 'No'];
  const r = q.data?.resolution;
  const d = hist.length > 1 ? Math.round((odds.p - hist[0]!) * 100) : 0;
  const call = (o: 0 | 1, e: React.MouseEvent) => {
    if (!me) return router.push('/signin');
    predict.mutate({ marketId: id, outcome: o, origin: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight } });
  };
  return (
    <Shell title={external ? 'Polymarket' : 'Market'} flush>
      <section className="-mx-0 pt-0"><Battle marketId={m.id} p={odds.p} category={m.category} question={m.question} avatars={avatars} image={m.image_url} closeTs={m.close_ts} /></section>
      <section className="px-4 pt-4">
        <h1 className="cd text-[34px] leading-[.95] uppercase" style={{ viewTransitionName: `q-${m.id}` }}>{m.question}</h1>
        <div className="mn mt-2 flex flex-wrap items-center gap-x-2 text-[11px] uppercase tracking-[.06em] text-mute">
          <span>{usd(m.volume)} vol</span><span>·</span>
          <span>{m.status === 'final' ? `Resolved ${m.outcome}` : m.status === 'proposed' ? 'Resolving' : `Ends ${timeLeft(m.close_ts)}`}</span>
          {d !== 0 && <><span>·</span><span className={d > 0 ? 'text-mint' : 'text-coral'}>{d > 0 ? '+' : ''}{d}% yes 1w</span></>}
          {external && <><span>·</span><span>Polymarket</span></>}
        </div>
        <div className="mt-4">{external ? <Sparkline data={series} height={96} color="#7c5cff" /> : <MarketChart id={String(m.id)} live={odds.p} />}</div>
      </section>

      <section className="px-4 mt-5">
        {external ? (
          <Link href={`/external/${m.id}/trade`} className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-grape text-white text-[15px] font-semibold">Trade on Polymarket<IconExternal size={16} /></Link>
        ) : <TradePanel marketId={m.id} p={odds.p} open={m.status === 'open'} question={m.question} category={m.category} outcome={pick} onOutcome={setPick} onFreeCall={(o, e) => call(o, e)} freeCalled={mine !== undefined} />}
      </section>

      {r && (
        <Link href={`/markets/${m.id}/proof`} className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-line p-4 hover:bg-ink/[.02]">
          <IconShield size={22} className="text-grape" />
          <div className="flex-1"><div className="text-[15px] font-semibold">Resolved {r.outcome}</div><div className="text-[13px] text-mute">Signed by the AI judge in a TEE, verified on NEAR</div></div>
          <span className="text-[13px] text-mute">Proof</span>
        </Link>
      )}

      {!external && (
        <div className="mt-6 overflow-hidden">
          <Segmented id="mtab" value={tab} onChange={(t) => { setDir(TABS.indexOf(t) > TABS.indexOf(tab) ? 1 : -1); setTab(t); }} options={[{ value: 'comments', label: 'Comments' }, { value: 'activity', label: 'Activity' }, { value: 'holders', label: 'Holders' }, { value: 'book', label: 'Book' }]} />
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div key={tab} custom={dir} variants={SLIDE} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 420, damping: 38 }}>
              {tab === 'comments' && <Comments id={id} />}
              {tab === 'activity' && <Activity id={id} live={liveTrades} />}
              {tab === 'holders' && <Holders id={id} />}
              {tab === 'book' && <Book id={id} />}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
      <section className="px-4 py-6 border-t border-line mt-2">
        <h2 className="text-[15px] font-semibold">Rules</h2>
        <p className="mt-1.5 text-[14px] leading-[1.5] text-mute whitespace-pre-wrap">{(m as { rules?: string }).rules || 'Resolved by the AI judge from public sources at close.'}</p>
      </section>
    </Shell>
  );
}
