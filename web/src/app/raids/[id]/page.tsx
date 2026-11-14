'use client';
import Link from 'next/link';
import { Fragment, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Flame, Gauge, Lock, ShieldCheck, Timer, TimerReset } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { ChromeChest, FlipClock } from '@/components/Chrome';
import { ChartPanel } from '@/components/ChartPanel';
import { Avatar, TestnetChip } from '@/components/app/Avatar';
import { Loop } from '@/components/app/RaidEmbed';
import { Tabs } from '@/components/app/Tabs';
import { displayName, personByAccount, profileHref } from '@/lib/people';
import { Button, CoinAvatar, Empty, ErrorState, Segmented, Skeleton } from '@/components/ui';
import { PayoutBox, RiskNote } from '@/components/Payout';
import { AnyChainBack } from '@/components/AnyChainBack';
import { Composer, Feed } from '@/components/Social';
import { useBackers, useChestConfig, useNow, useRaid, useRaids } from '@/lib/hooks';
import { useQuote, fmtPrice, countdown, shortAddr } from '@/lib/market';
import { coinByAsset, explorerAccount, explorerTx } from '@/lib/coins';
import { LifecycleReceipts, raidReceipt } from '@/components/Proof';
import { crewName } from '@/lib/crews';
import { attributeReel, rememberReel } from '@/lib/reels';
import { CHEST_ID, NETWORK, raidApi, target, tx, usdcOf, xLabel, liveMultiple } from '@/lib/raid';
import { send, useAccount, connect } from '@/lib/wallet';
import { toast } from '@/lib/bus';
import { openJoin } from '@/components/app/Flow';
import type { ChartLine } from '@/components/chart/CoinChart';

export default function RaidPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const raid = useRaid(Number(id));
  useEffect(() => { const ref = new URLSearchParams(location.search).get('reel'); if (ref && /^\d+$/.test(ref)) rememberReel(Number(id), ref); }, [id]);
  const all = useRaids();
  const [tab, setTab] = useState<'room' | 'crew' | 'chart' | 'rules'>('room');
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

  const entryPrice = r && coin && Number(r.held) > 0 ? usdcOf(r.entry_cost) / (Number(r.held) / 10 ** coin.decimals) : null;
  const lines = useMemo<ChartLine[]>(() => {
    if (!r) return [];
    const x = r.target_x_bps / 1e4;
    if (entryPrice) return [{ price: entryPrice, label: 'ENTRY', tone: 'brand' }, { price: entryPrice * x, label: `SELL ${xLabel(r.target_x_bps)}`, tone: 'lime' }];
    return q.data ? [{ price: q.data.priceUsd * x, label: `${xLabel(r.target_x_bps)} IF BOUGHT NOW`, tone: 'lime' }] : [];
  }, [r, entryPrice, q.data]);

  if (raid.isLoading) return <Shell title="Raid" back="/raids"><Skeleton className="h-28" /><Skeleton className="mt-4 h-[22.5rem]" /></Shell>;
  if (raid.error) return <Shell title="Raid" back="/raids"><ErrorState title="Can’t reach the war chest" body="The NEAR RPC didn’t answer." retry={() => raid.refetch()} /></Shell>;
  if (!r || !t) return <Shell title="Raid" back="/raids"><Empty title={`No raid #${id}`} body="This raid doesn’t exist on the chest contract." action={<Link href="/raids" className="text-brand font-semibold">See all raids</Link>} /></Shell>;

  const open = r.status === 'Open' && now > 0 && now < r.opens_until_ms;
  const mult = liveMultiple(r, q.data?.priceUsd, coin?.decimals);
  const inCountdown = r.status === 'Open' && !open && !!r.buy_after_ms && now > 0 && now < r.buy_after_ms;
  const callerRaids = (all.data ?? []).filter((x) => x.caller === r.caller);
  const rc = raidReceipt(r.id);
  const crewLabel = crewName(r.caller);
  const crew = crewLabel ? { name: crewLabel } : null;

  const tabs = [{ key: 'room', label: 'Room' }, { key: 'crew', label: 'Who’s in' }, { key: 'chart', label: 'Chart' }, { key: 'rules', label: 'Receipts' }] as const;
  return (
    <Shell title={`Raid #${r.id}`} back="/raids">
      <header className="pt-3">
        <Link href={profileHref(r.caller)} className="flex items-center gap-2.5">
          <Avatar id={r.caller} size={36} />
          <span className="min-w-0"><span className="block truncate text-[14px] font-semibold leading-tight">{crew ? crew.name : displayName(r.caller)}</span><span className="block text-[12.5px] text-mute">{crew ? 'Crew: a group that raids together' : `${callerRaids.length} called · ${callerRaids.filter((x) => x.hit).length} hit`}</span></span>
          {personByAccount(r.caller) && <TestnetChip className="ml-auto" />}
        </Link>
        <div className="mt-5 flex items-center gap-3">
          <CoinAvatar symbol={t.symbol} image={q.data?.image} size={48} />
          <h2 className="text-[26px] font-semibold leading-none tracking-[-0.05em] md:text-[48px]">${t.symbol} <span className="text-signal">{xLabel(r.target_x_bps)}</span></h2>
          <ChromeChest size={72} open={r.hit} fill={cfg.data?.max_pot ? usdcOf(r.pot) / usdcOf(cfg.data.max_pot) : 0.4} className="pointer-events-none -my-4 ml-auto" />
        </div>
        <p className="mt-3 text-[15px] leading-snug">{r.title}</p>
      </header>

      <section className="panel relative mt-5 overflow-hidden rounded-[22px] p-3.5">
        <p className="eyebrow">{mult ? 'Now at' : open ? 'Crew closes in' : inCountdown ? 'Chest may buy in' : r.status === 'Closed' ? 'Settled' : r.status === 'Open' ? 'Waiting for the buy' : 'Retreat in'}</p>
        <div className="mt-3 text-[30px] leading-none">
          {mult ? <span className="mono font-semibold">{mult.toFixed(2)}x</span>
            : r.status === 'Closed' ? <span className={`font-semibold tracking-[-0.04em] ${r.hit ? 'text-lime' : ''}`}>{r.hit ? 'Line hit' : 'Retreated'}</span>
            : r.status === 'Open' && !open && !inCountdown ? <span className="font-semibold tracking-[-0.04em]">Ready</span>
            : now ? <FlipClock ms={open ? r.opens_until_ms - now : inCountdown ? r.buy_after_ms! - now : r.retreat_at_ms - now} />
            : <span className="mono">--:--</span>}
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat k="Pot" v={usdcOf(r.pot).toFixed(0)} u="tUSDC" />
          <Stat k="Entry" v={Number(r.entry_cost) ? usdcOf(r.entry_cost).toFixed(0) : '–'} u={Number(r.entry_cost) ? 'tUSDC' : 'not bought'} />
          <Stat k={r.status === 'Closed' ? 'To crew' : 'Price'} v={r.status === 'Closed' ? usdcOf(r.for_backers ?? '0').toFixed(0) : fmtPrice(q.data?.priceUsd)} u={r.status === 'Closed' ? 'tUSDC' : ''} />
        </div>
        <Loop r={r} className="mt-6" />
        {open && r.buy_after_ms && <p className="mt-4 text-[13px] leading-relaxed text-mute">Then a public countdown runs until <b className="mono text-ink">{new Date(r.buy_after_ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</b> before the chest may buy.</p>}
        {inCountdown && <p className="mt-4 text-[13px] leading-relaxed text-mute">Everyone sees the target and the buy time. No surprise buys.</p>}
        {r.status === 'Open' && !open && !inCountdown && <p className="mt-4 text-[13px] leading-relaxed text-mute">Countdown over. A keeper hands the chest a signed 1Click quote, and the chest checks it before buying.</p>}
      </section>

      {open && <button ref={backRef} onClick={() => openJoin(r.id)} className="press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full btn-signal text-[14.5px] font-semibold">Join this raid<span className="mono text-[12.5px] opacity-70">{countdown(r.opens_until_ms - now)} left</span></button>}

      <div className="sticky top-12 z-30 -mx-4 mt-6 bg-bg/85 px-4 backdrop-blur-xl md:top-16 md:mx-0 md:px-0">
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
      {tab === 'chart' && (
        <section className="pt-4">
          <ChartPanel symbol={t.symbol} lines={lines} />
          {!entryPrice && <p className="mt-3 text-[12.5px] leading-relaxed text-faint">Not bought yet, so the line shows where {xLabel(r.target_x_bps)} would sit at today’s price. Once the chest buys, it moves to the real entry × {xLabel(r.target_x_bps)}.</p>}
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

      {open && !backSeen && (
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-4 pb-3 md:hidden">
          <button onClick={() => openJoin(r.id)} className="press flex h-12 w-full items-center justify-center gap-2 rounded-full btn-signal text-[14.5px] font-semibold shadow-[0_18px_40px_-12px_rgb(255_90_31/.6)]">Join this raid <span className="mono text-[12.5px] opacity-70">{countdown(r.opens_until_ms - now)}</span></button>
        </div>
      )}
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
