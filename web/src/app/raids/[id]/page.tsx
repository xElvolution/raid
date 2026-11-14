'use client';
import Link from 'next/link';
import { Fragment, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VerifiedBadge } from '@/components/app/Verified';
import { FollowCaller } from '@/components/app/AutoJoin';
import { ArrowUpRight, Flame, Gauge, Lock, Share2, ShieldCheck, Timer, TimerReset, TrendingUp, UserPlus, Users } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { ChartPanel } from '@/components/ChartPanel';
import { Avatar } from '@/components/app/Avatar';
import { Tabs } from '@/components/app/Tabs';
import { displayName, personByAccount, profileHref } from '@/lib/people';
import { CoinAvatar, Delta, Empty, ErrorState, Skeleton } from '@/components/ui';
import { Composer, Feed } from '@/components/Social';
import { useBackers, useChestConfig, useNow, useRaid, useRaids } from '@/lib/hooks';
import { useQuote, fmtPrice, countdown, shortAddr } from '@/lib/market';
import { coinByAsset, explorerAccount, explorerTx } from '@/lib/coins';
import { LifecycleReceipts, raidReceipt } from '@/components/Proof';
import { crewName } from '@/lib/crews';
import { rememberReel } from '@/lib/reels';
import { CHEST_ID, NETWORK, payoutAtLine, target, usdcOf, xLabel } from '@/lib/raid';

import { toast } from '@/lib/bus';
import { openJoin } from '@/components/app/Flow';
import type { ChartLine } from '@/components/chart/CoinChart';

export default function RaidPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const raid = useRaid(Number(id));
  useEffect(() => { const ref = new URLSearchParams(location.search).get('reel'); if (ref && /^\d+$/.test(ref)) rememberReel(Number(id), ref); }, [id]);
  const all = useRaids();
  const [tab, setTab] = useState<'room' | 'crew' | 'rules'>('room');
  const [backSeen, setBackSeen] = useState(false);
  const io = useRef<IntersectionObserver | null>(null);
  const backRef = useCallback((el: HTMLElement | null) => {
    io.current?.disconnect();
    if (!el) return;
    io.current = new IntersectionObserver(([e]) => setBackSeen(!!e?.isIntersecting), { rootMargin: '0px 0px -120px 0px' });
    io.current.observe(el);
  }, []);
  const cfg = useChestConfig();
  const now = useNow();
  const r = raid.data;
  const t = r ? target(r) : null;
  const coin = r ? coinByAsset(r.target) : undefined;
  const q = useQuote(t?.symbol);
  const base = t ? t.symbol.replace(/^t(?=[A-Z])/, '') : '';
  const bq = useQuote(base);
  const backers = useBackers(Number(id));
  const people = backers.data ?? [];

  const entryPrice = r && coin && Number(r.held) > 0 ? usdcOf(r.entry_cost) / (Number(r.held) / 10 ** coin.decimals) : null;
  const lines = useMemo<ChartLine[]>(() => {
    if (!r) return [];
    const x = r.target_x_bps / 1e4;
    if (entryPrice) return [{ price: entryPrice, label: 'ENTRY', tone: 'brand' }, { price: entryPrice * x, label: `SELL ${xLabel(r.target_x_bps)}`, tone: 'lime' }];
    const qq = q.data ?? bq.data;
    return qq ? [{ price: qq.priceUsd * x, label: `GOAL ${xLabel(r.target_x_bps)} FROM NOW`, tone: 'lime' }] : [];
  }, [r, entryPrice, q.data, bq.data]);

  if (raid.isLoading) return <Shell title="Raid" back="/raids"><Skeleton className="h-28" /><Skeleton className="mt-4 h-[22.5rem]" /></Shell>;
  if (raid.error) return <Shell title="Raid" back="/raids"><ErrorState title="Can’t reach the war chest" body="The NEAR RPC didn’t answer." retry={() => raid.refetch()} /></Shell>;
  if (!r || !t) return <Shell title="Raid" back="/raids"><Empty title={`No raid #${id}`} body="This raid doesn’t exist on the chest contract." action={<Link href="/raids" className="text-brand font-semibold">See all raids</Link>} /></Shell>;

  const open = r.status === 'Open' && now > 0 && now < r.opens_until_ms;
  const inCountdown = r.status === 'Open' && !open && !!r.buy_after_ms && now > 0 && now < r.buy_after_ms;
  const callerRaids = (all.data ?? []).filter((x) => x.caller === r.caller);
  const rc = raidReceipt(r.id);
  const crewLabel = crewName(r.caller);
  const crew = crewLabel ? { name: crewLabel } : null;

  const tabs = [{ key: 'room', label: 'Chat' }, { key: 'crew', label: 'Who’s in' }, { key: 'rules', label: 'Activity' }] as const;
  const maxPot = cfg.data?.max_pot ? usdcOf(cfg.data.max_pot) : 0;
  const pot = usdcOf(r.pot);
  const step = r.status === 'Closed' ? 3 : r.status === 'Held' ? 2 : open || inCountdown ? 0 : 1;
  const pay = cfg.data ? payoutAtLine(10, r.target_x_bps, cfg.data.caller_fee_bps, cfg.data.buyback_bps) : null;
  const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(`I’m in a $${base} raid to ${xLabel(r.target_x_bps)} on RAID. Pool with us before the timer ends:`)}&url=${encodeURIComponent(`https://app.raid.5-189-170-85.sslip.io/raids/${r.id}`)}`;
  return (
    <Shell title={`Raid #${r.id}`} back="/raids">
      <header className="pt-3">
        <div className="flex items-center gap-3">
          <CoinAvatar symbol={base} image={bq.data?.image} size={60} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[24px] font-semibold leading-none tracking-[-0.04em]">${t.symbol}</h2>
            <p className="mt-1.5 flex items-center gap-2 text-[13px] text-mute"><span className="mono text-ink">{fmtPrice(bq.data?.priceUsd)}</span><Delta pct={bq.data?.change24h} className="text-[12px]" />{t.symbol !== base && <span className="text-faint">{base} price</span>}</p>
          </div>
          <span className="glass rounded-[16px] px-3 py-2 text-center"><span className="block text-[10.5px] font-medium uppercase tracking-[.08em] text-mute">Goal</span><span className="block text-[22px] font-bold leading-none text-lime">{xLabel(r.target_x_bps)}</span></span>
        </div>
        {r.title && <p className="mt-3 text-[14px] leading-snug">{r.title}</p>}
        <div className="mt-3 flex items-center gap-2.5">
        <Link href={profileHref(r.caller)} className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar id={r.caller} size={34} />
          <span className="min-w-0 flex-1"><span className="flex items-center gap-1"><span className="truncate text-[13.5px] font-semibold leading-tight">{crew ? crew.name : displayName(r.caller)}</span><VerifiedBadge account={r.caller} /></span><span className="block text-[12px] text-mute">{crew ? 'Crew: a group that raids together' : `Started ${callerRaids.length} · hit ${callerRaids.filter((x) => x.hit).length}`}</span></span>
        </Link>
        <FollowCaller account={r.caller} />
        </div>
      </header>

      <div className="mt-4"><ChartPanel symbol={base} lines={lines} height={300} /></div>
      {t.symbol !== base && <p className="mt-1.5 text-[11.5px] text-faint">Testnet raid on {t.symbol}. The chart shows real {base} so you can see the market.</p>}

      <section className="glass mt-4 rounded-[20px] p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[14px] font-semibold">{people.length} {people.length === 1 ? 'person' : 'people'} in</p>
          <p className="text-[13px] text-mute">{open ? <>Closes in <b className="mono text-ink">{countdown(r.opens_until_ms - now)}</b></> : inCountdown ? <>Buys in <b className="mono text-ink">{countdown(r.buy_after_ms! - now)}</b></> : r.status === 'Closed' ? (r.hit ? 'Goal hit' : 'Sold early') : r.status === 'Held' ? 'Bought, waiting for the goal' : 'Waiting to buy'}</p>
        </div>
        <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-raised"><div className="h-full rounded-full bg-gradient-to-r from-[#ff7a1a] to-[#ff3d0a]" style={{ width: `${maxPot ? Math.min(100, (pot / maxPot) * 100) : 100}%` }} /></div>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="flex -space-x-2">{people.slice(0, 5).map(([a]) => <span key={a} className="rounded-full ring-2 ring-bg"><Avatar id={a} size={24} /></span>)}</span>
          <span className="mono text-[13px]"><b>{pot.toFixed(0)}</b>{maxPot ? <span className="text-mute"> / {maxPot.toFixed(0)}</span> : null} <span className="text-mute">tUSDC</span></span>
        </div>
      </section>

      <section className="mt-3 grid grid-cols-3 gap-2">
        {[{ I: UserPlus, t: 'Join' }, { I: Users, t: 'Buys together' }, { I: TrendingUp, t: `Sells at ${xLabel(r.target_x_bps)}` }].map((x, i) => (
          <div key={x.t} className={`flex flex-col items-center gap-1.5 rounded-[16px] py-3 text-center ${i === Math.min(step, 2) ? 'glass' : ''}`}>
            <span className={`grid h-10 w-10 place-items-center rounded-full ${i < step || (i === 2 && r.hit) ? 'bg-up/15 text-up' : i === Math.min(step, 2) ? 'bg-signal text-white' : 'bg-raised text-faint'}`}><x.I size={18} /></span>
            <span className={`text-[12.5px] font-medium ${i === Math.min(step, 2) ? 'text-ink' : 'text-mute'}`}>{x.t}</span>
          </div>
        ))}
      </section>

      {pay && cfg.data && (
        <section className="mt-3 rounded-[20px] bg-raised/70 p-3.5 text-[13.5px] leading-relaxed">
          <p>Put in <b>10</b> → about <b className="text-up">{pay.payout.toFixed(1)} back</b> if ${t.symbol} hits {xLabel(r.target_x_bps)}, after the {cfg.data.caller_fee_bps / 100}% caller fee and {cfg.data.buyback_bps / 100}% buyback.</p>
          <p className="mt-1 text-mute">If it doesn’t hit by {now ? new Date(r.retreat_at_ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '…'}, it sells at market and you get back what’s left, which can be less than you put in.</p>
        </section>
      )}

      <div ref={backRef} className="h-px" />
      <div className="sticky top-12 z-20 -mx-4 mt-6 glass-bar px-4 md:top-16 md:mx-0 md:px-0">
        <Tabs id="room" value={tab} onChange={setTab} items={tabs.map((x) => ({ ...x }))} />
      </div>

      {tab === 'room' && (
        <section>
          <div className="border-b border-line"><Composer raidId={r.id} coin={t.symbol} placeholder={`Talk to the $${t.symbol} crew…`} /></div>
          <Feed raidId={r.id} embed={false} emptyTitle="No crew chatter yet" emptyBody="Say why you’re in, or why you’re not." />
        </section>
      )}
      {tab === 'crew' && (
        <section id="crew" className="pt-2">
          <CrewList id={r.id} />
          <div className="mt-4 flex gap-3 rounded-[20px] bg-raised/70 p-4 text-[13px] leading-relaxed text-mute"><Lock size={16} className="mt-0.5 shrink-0 text-lime" />The caller’s fee is locked until this raid hits {xLabel(r.target_x_bps)}. If it retreats, the fee is gone.</div>
        </section>
      )}
      {tab === 'rules' && (
        <section className="pt-4">
          <ul className="grid gap-4 text-[13.5px]">
          <Rule icon={<ShieldCheck size={15} />} t="Keyless buys and sells">The chest only moves funds against a 1Click quote whose signature and min-out it checks on-chain.</Rule>
          <Rule icon={<Lock size={15} />} t="Anti-dump caller fee">{cfg.data ? `${cfg.data.caller_fee_bps / 100}%` : 'A small share'} of profit, paid only on a hit.</Rule>
          <Rule icon={<Timer size={15} />} t="Public countdown">After the crew window, the chest waits {cfg.data?.buy_delay_minutes ?? 10} minutes before it may buy, so the buy time is known to everyone.</Rule>
          <Rule icon={<Gauge size={15} />} t="Size caps">{cfg.data?.max_pot ? `${usdcOf(cfg.data.max_pot).toLocaleString()} per raid, ${usdcOf(cfg.data.max_back ?? '0').toLocaleString()} per backer.` : 'Per raid and per backer.'} Over the cap is refunded.</Rule>
          <Rule icon={<TimerReset size={15} />} t="Retreat">If the line isn’t reached by {now ? new Date(r.retreat_at_ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '…'}, the chest sells at market and returns the pot.</Rule>
          <Rule icon={<Flame size={15} />} t="Buyback reserve">{cfg.data ? `${cfg.data.buyback_bps / 100}%` : 'A share'} of a winning raid’s profit. The chest has no withdraw method for it.</Rule>
          </ul>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-line pt-4 mono text-[12px]">
          <dt className="text-faint">Chest</dt><dd className="truncate text-right"><a className="hover:text-ink text-mute inline-flex items-center gap-0.5" href={explorerAccount(CHEST_ID, NETWORK)} target="_blank" rel="noreferrer">{shortAddr(CHEST_ID)}<ArrowUpRight size={11} /></a></dd>
          {rc?.call?.tx && <><dt className="text-faint">Called in</dt><dd className="truncate text-right"><a className="hover:text-ink text-mute" href={explorerTx(rc.call.tx, NETWORK)} target="_blank" rel="noreferrer">{rc.call.tx.slice(0, 10)}…{rc.call.block ? ` · block ${rc.call.block.toLocaleString('en-US')}` : ''}</a></dd></>}
          {rc?.backs?.map((b) => <Fragment key={b.tx}><dt className="text-faint">Back {usdcOf(b.amount).toFixed(0)}</dt><dd className="truncate text-right"><a className="hover:text-ink text-mute" href={explorerTx(b.tx, NETWORK)} target="_blank" rel="noreferrer">{shortAddr(b.backer)} · {b.tx.slice(0, 8)}…</a></dd></Fragment>)}
          <dt className="text-faint">Target asset</dt><dd className="truncate text-right text-mute">{r.target}</dd>
          <dt className="text-faint">Buy quote</dt><dd className="truncate text-right text-mute">{r.buy_quote_hash ?? 'not yet'}</dd>
          <dt className="text-faint">Sell quote</dt><dd className="truncate text-right text-mute">{r.sell_quote_hash ?? 'not yet'}</dd>
          </dl>
          <LifecycleReceipts id={r.id} className="mt-6" />
        </section>
      )}

      <div className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 md:static md:mt-6">
        <div className="glass-strong flex gap-2 rounded-full p-1.5">
          {open ? <button onClick={() => openJoin(r.id)} className="press flex h-11 flex-1 items-center justify-center rounded-full btn-signal text-[14.5px] font-semibold">Join raid</button>
            : <Link href="/raids" className="press flex h-11 flex-1 items-center justify-center rounded-full bg-ink text-[14px] font-semibold text-bg">See open raids</Link>}
          <a href={shareUrl} target="_blank" rel="noreferrer" className="press flex h-11 items-center justify-center gap-1.5 rounded-full px-4 text-[13.5px] font-semibold hairline"><Share2 size={15} />Share to X</a>
        </div>
      </div>
    </Shell>
  );
}

function Stat({ k, v, u }: { k: string; v: string; u: string }) {
  return <div className="min-w-0"><p className="text-[12.5px] text-mute">{k}</p><p className="mono mt-1 truncate text-[17px] font-semibold tracking-[-0.03em]">{v}</p><p className="truncate text-[11.5px] text-faint">{u}</p></div>;
}

function Rule({ icon, t, children }: { icon: React.ReactNode; t: string; children: React.ReactNode }) {
  return <li className="flex gap-2.5"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-raised text-lime">{icon}</span><span><span className="block font-semibold">{t}</span><span className="text-mute leading-snug">{children}</span></span></li>;
}

/** Who is in: get_backers on the chest. NEAR accounts, plus MetaMask (0x…) and Phantom (64-hex Ed25519) intents accounts. */
function CrewList({ id }: { id: number }) {
  const b = useBackers(id);
  const rows = b.data ?? [];
  if (!rows.length) return <p className="py-6 text-[14px] text-mute">No one has backed this raid yet.</p>;
  const kind = (a: string) => (/^0x[0-9a-f]{40}$/.test(a) ? 'MetaMask · no NEAR account' : /^[0-9a-f]{64}$/.test(a) ? 'Phantom · no NEAR account' : 'NEAR wallet');
  return (
    <div>
      <p className="eyebrow">Crew · {rows.length} backer{rows.length === 1 ? '' : 's'}</p>
      <ul className="mt-2 divide-y divide-line">
        {rows.map(([a, s]) => (
          <li key={a}><Link href={profileHref(a)} className="flex items-center gap-3 py-3">
            <Avatar id={a} size={40} />
            <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold">{/^(0x[0-9a-f]{40}|[0-9a-f]{64})$/.test(a) ? `${a.slice(0, 10)}…${a.slice(-6)}` : displayName(a)}</span><span className="block text-[12.5px] text-mute">{personByAccount(a) ? 'testnet account' : kind(a)}</span></span>
            <span className="mono text-[14px] font-semibold">{usdcOf(s).toFixed(2)}</span>
          </Link></li>
        ))}
      </ul>
    </div>
  );
}
