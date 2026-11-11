'use client';
import Link from 'next/link';
import { use, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Flame, Gauge, Lock, ShieldCheck, Timer, TimerReset } from 'lucide-react';
import { Shell } from '@/components/Shell';
import { ChartPanel } from '@/components/ChartPanel';
import { PhaseChip } from '@/components/RaidCard';
import { Button, CoinAvatar, Delta, Empty, ErrorState, Flash, Identicon, Segmented, Skeleton } from '@/components/ui';
import { PayoutBox, RiskNote } from '@/components/Payout';
import { AnyChainBack } from '@/components/AnyChainBack';
import { useChestConfig, useNow, useRaid, useRaids } from '@/lib/hooks';
import { useQuote, fmtPrice, fmtUsd, countdown, shortAddr } from '@/lib/market';
import { CHAINS, coinByAsset, explorerAccount } from '@/lib/coins';
import { CHEST_ID, NETWORK, STEPS, raidApi, stepIndex, target, tx, usdcOf, xLabel, liveMultiple } from '@/lib/raid';
import { send, useAccount, connect } from '@/lib/wallet';
import { toast } from '@/lib/bus';
import type { ChartLine } from '@/components/chart/CoinChart';

export default function RaidPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const raid = useRaid(Number(id));
  const all = useRaids();
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

  if (raid.isLoading) return <Shell title="Raid" back="/raids"><Skeleton className="h-28" /><Skeleton className="mt-4 h-[360px]" /></Shell>;
  if (raid.error) return <Shell title="Raid" back="/raids"><ErrorState title="Can’t reach the war chest" body="The NEAR RPC didn’t answer." retry={() => raid.refetch()} /></Shell>;
  if (!r || !t) return <Shell title="Raid" back="/raids"><Empty title={`No raid #${id}`} body="This raid doesn’t exist on the chest contract." action={<Link href="/raids" className="text-brand font-semibold">See all raids</Link>} /></Shell>;

  const step = stepIndex(r, now);
  const open = r.status === 'Open' && now > 0 && now < r.opens_until_ms;
  const mult = liveMultiple(r, q.data?.priceUsd, coin?.decimals);
  const inCountdown = r.status === 'Open' && !open && !!r.buy_after_ms && now > 0 && now < r.buy_after_ms;
  const callerRaids = (all.data ?? []).filter((x) => x.caller === r.caller);

  return (
    <Shell title={`Raid #${r.id}`} back="/raids">
      <section className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <CoinAvatar symbol={t.symbol} image={q.data?.image} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="wide-black text-[34px] md:text-[44px] leading-none">${t.symbol}</h2><PhaseChip r={r} now={now} /></div>
          <p className="mt-1.5 text-[13px] text-mute truncate">{r.title}</p>
        </div>
        <div className="text-right">
          <Flash value={q.data?.priceUsd}><p className="mono text-[22px] font-bold">{fmtPrice(q.data?.priceUsd)}</p></Flash>
          <Delta pct={q.data?.change24h} className="text-[12px]" />
        </div>
      </section>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Big k="Sell line" v={xLabel(r.target_x_bps)} lime />
        <Big k="Crew pot" v={usdcOf(r.pot).toFixed(2)} unit="USDC" />
        <Big k={mult ? 'Now at' : open ? 'Crew closes' : inCountdown ? 'Chest buys in' : 'Retreat in'} v={mult ? `${mult.toFixed(2)}x` : open ? countdown(r.opens_until_ms - now) : inCountdown ? countdown(r.buy_after_ms! - now) : now ? countdown(r.retreat_at_ms - now) : '—'} />
      </div>

      <div className="mt-4"><ChartPanel symbol={t.symbol} lines={lines} /></div>
      {!entryPrice && <p className="mt-2 px-1 text-[11.5px] text-faint">Not bought yet, so the lime line shows where {xLabel(r.target_x_bps)} would sit at today’s price. Once the chest buys, it moves to the real entry × {xLabel(r.target_x_bps)}.</p>}

      <section className="panel mt-4 p-4">
        <p className="eyebrow">Raid progress</p>
        <ol className="mt-3 grid grid-cols-5 gap-1.5">
          {STEPS.map((s, i) => (
            <li key={s} className="min-w-0">
              <motion.div className={`h-1.5 rounded-full ${i <= step ? (i === step ? 'bg-lime' : 'bg-ink') : 'bg-raised'}`} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0 }} transition={{ delay: 0.1 + i * 0.08 }} />
              <p className={`mt-2 truncate text-[11px] font-semibold ${i === step ? 'text-ink' : 'text-faint'}`}>{s}</p>
            </li>
          ))}
        </ol>
        {open && r.buy_after_ms && <p className="mt-3 text-[12.5px] text-mute">Crew window closes in <b className="mono text-ink">{countdown(r.opens_until_ms - now)}</b>. Then a public countdown runs until <b className="mono text-ink">{new Date(r.buy_after_ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</b> before the chest may buy.</p>}
        {inCountdown && <p className="mt-3 text-[12.5px] text-mute">Public countdown: the chest can’t buy for another <b className="mono text-ink">{countdown(r.buy_after_ms! - now)}</b>. Everyone sees the target and the time. No surprise buys.</p>}
        {r.status === 'Open' && !open && !inCountdown && <p className="mt-3 text-[12.5px] text-mute">Countdown over. Next, a keeper hands the chest a signed 1Click quote, and the chest checks it before buying.</p>}
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-[1.25fr_1fr]">
        <BackPanel id={r.id} open={open} bps={r.target_x_bps} pot={usdcOf(r.pot)} />
        <section className="panel p-4">
          <p className="eyebrow">Caller</p>
          <Link href={`/u/${r.caller}`} className="mt-3 flex items-center gap-3 group">
            <Identicon seed={r.caller} size={46} />
            <div className="min-w-0"><p className="font-semibold truncate group-hover:underline">{shortAddr(r.caller)}</p><p className="text-[12px] text-mute">{callerRaids.length} raid{callerRaids.length === 1 ? '' : 's'} called · {callerRaids.filter((x) => x.hit).length} hit</p></div>
          </Link>
          <div className="mt-4 rounded-[12px] bg-raised p-3 text-[12.5px] text-mute"><Lock size={14} className="mb-1 text-lime" />The caller’s fee is locked until this raid hits {xLabel(r.target_x_bps)}. If it retreats, the fee is gone.</div>
        </section>
      </div>

      <section className="panel mt-4 p-4">
        <p className="eyebrow">Rules the chest enforces</p>
        <ul className="mt-3 grid gap-3 md:grid-cols-2 text-[13px]">
          <Rule icon={<ShieldCheck size={15} />} t="Keyless buys and sells">The chest only moves funds against a 1Click quote whose signature and min-out it checks on-chain.</Rule>
          <Rule icon={<Lock size={15} />} t="Anti-dump caller fee">{cfg.data ? `${cfg.data.caller_fee_bps / 100}%` : 'A small share'} of profit, paid only on a hit.</Rule>
          <Rule icon={<Timer size={15} />} t="Public countdown">After the crew window, the chest waits {cfg.data?.buy_delay_minutes ?? 10} minutes before it may buy, so the buy time is known to everyone.</Rule>
          <Rule icon={<Gauge size={15} />} t="Size caps">{cfg.data?.max_pot ? `${usdcOf(cfg.data.max_pot).toLocaleString()} per raid, ${usdcOf(cfg.data.max_back ?? '0').toLocaleString()} per backer.` : 'Per raid and per backer.'} Over the cap is refunded.</Rule>
          <Rule icon={<TimerReset size={15} />} t="Retreat">If the line isn’t reached by {now ? new Date(r.retreat_at_ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '…'}, the chest sells at market and returns the pot.</Rule>
          <Rule icon={<Flame size={15} />} t="Buyback reserve">{cfg.data ? `${cfg.data.buyback_bps / 100}%` : 'A share'} of a winning raid’s profit. The chest has no withdraw method for it.</Rule>
        </ul>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-line pt-3 mono text-[11px]">
          <dt className="text-faint">Chest</dt><dd className="truncate text-right"><a className="hover:text-ink text-mute inline-flex items-center gap-0.5" href={explorerAccount(CHEST_ID, NETWORK)} target="_blank" rel="noreferrer">{shortAddr(CHEST_ID)}<ArrowUpRight size={11} /></a></dd>
          <dt className="text-faint">Target asset</dt><dd className="truncate text-right text-mute">{r.target}</dd>
          <dt className="text-faint">Buy quote</dt><dd className="truncate text-right text-mute">{r.buy_quote_hash ?? 'not yet'}</dd>
          <dt className="text-faint">Sell quote</dt><dd className="truncate text-right text-mute">{r.sell_quote_hash ?? 'not yet'}</dd>
        </dl>
      </section>
    </Shell>
  );
}

function Big({ k, v, unit, lime }: { k: string; v: string; unit?: string; lime?: boolean }) {
  return (
    <div className={`min-w-0 rounded-[14px] p-3 md:p-4 ${lime ? 'bg-lime text-[#0a1a00]' : 'panel'}`}>
      <p className={`eyebrow ${lime ? '!text-[#0a1a00]/60' : ''}`}>{k}</p>
      <p className="mt-2 truncate mono text-[17px] md:text-[22px] font-bold leading-none">{v}{unit && <span className="ml-1 text-[10.5px] font-medium opacity-60">{unit}</span>}</p>
    </div>
  );
}
function Rule({ icon, t, children }: { icon: React.ReactNode; t: string; children: React.ReactNode }) {
  return <li className="flex gap-2.5"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-raised text-lime">{icon}</span><span><span className="block font-semibold">{t}</span><span className="text-mute leading-snug">{children}</span></span></li>;
}

function BackPanel({ id, open, bps, pot }: { id: number; open: boolean; bps: number; pot: number }) {
  const [amt, setAmt] = useState('5');
  const [busy, setBusy] = useState(false);
  const [via, setVia] = useState<'near' | 'any'>('near');
  const acct = useAccount();
  const cfg = useChestConfig();
  const stake = useQuery({ queryKey: ['stake', id, acct], enabled: !!acct, queryFn: () => raidApi.stake(id, acct!) });
  const unit = NETWORK === 'testnet' ? 'tUSDC' : 'USDC';
  const min = cfg.data ? usdcOf(cfg.data.min_back) : 0.1;
  const maxBack = cfg.data?.max_back ? usdcOf(cfg.data.max_back) : Infinity;
  const maxPot = cfg.data?.max_pot ? usdcOf(cfg.data.max_pot) : Infinity;
  const mine = stake.data ? usdcOf(stake.data) : 0;
  const room = Math.max(0, Math.min(maxPot - pot, maxBack - mine));
  const n = Number(amt);
  const valid = n >= min && isFinite(n);
  const fits = Math.min(n || 0, room);
  async function back() {
    if (!acct) return void connect();
    if (!cfg.data) return;
    setBusy(true);
    try { await send(tx.back(cfg.data.usdc, id, String(Math.round(n * 1e6)))); toast({ title: `You’re in the crew`, body: `Backed raid #${id} with ${fits} ${unit}${n > fits ? `; ${(n - fits).toFixed(2)} over the cap is refunded` : ''}.`, tone: 'lime' }); }
    catch (e) { if ((e as Error).message !== 'connect_wallet') toast({ title: 'Wallet didn’t sign', body: (e as Error).message.slice(0, 120), tone: 'down' }); }
    finally { setBusy(false); }
  }
  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between gap-2"><p className="eyebrow">Back this raid</p>{acct && <span className="mono text-[11px] text-mute">your stake {mine.toFixed(2)}</span>}</div>
      <Segmented id={`via-${id}`} className="mt-3 w-full [&>button]:flex-1" value={via} onChange={setVia} options={[{ value: 'near', label: 'NEAR wallet' }, { value: 'any', label: 'Solana / EVM' }]} />
      {via === 'any' ? <AnyChainBack raidId={id} bps={bps} open={open} /> : (
        <>
          <label className={`mt-3 flex h-14 items-center gap-2 rounded-[12px] bg-raised px-4 ${open ? 'focus-within:shadow-[inset_0_0_0_1.5px_var(--color-brand)]' : 'opacity-60'}`}>
            <input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ''))} disabled={!open} aria-label={`Amount in ${unit}`} className="w-full bg-transparent mono text-[24px] font-bold outline-none" />
            <span className="mono text-[12px] text-mute">{unit}</span>
          </label>
          <div className="mt-2 grid grid-cols-4 gap-1.5">{['1', '5', '25', '100'].map((v) => <button key={v} disabled={!open} onClick={() => setAmt(v)} className={`press h-9 rounded-[9px] mono text-[12px] font-bold ${amt === v ? 'bg-ink text-bg' : 'hairline text-mute'} disabled:opacity-50`}>{v}</button>)}</div>
          {open && isFinite(room) && <p className="mt-2 mono text-[11px] text-mute">Room for you: {room.toFixed(2)} {unit} (cap {maxBack} per backer, {maxPot} per raid){n > room ? ` · ${(n - room).toFixed(2)} would be refunded` : ''}</p>}
          <PayoutBox stake={fits || 0} bps={bps} cfg={cfg.data} unit={unit} className="mt-3" />
          <RiskNote className="mt-3" />
          <Button tone={open ? 'lime' : 'ghost'} size="lg" className="mt-3 w-full" disabled={!open || !valid || busy || room <= 0} onClick={back}>{!open ? 'Crew window closed' : room <= 0 ? 'Raid is full' : busy ? 'Waiting for wallet…' : acct ? `Back with ${fits || 0} ${unit}` : 'Connect wallet to back'}</Button>
          <p className="mt-2 text-[11.5px] text-faint">Min {min} · {NETWORK === 'testnet' ? 'testnet tokens, no real money' : 'mainnet'}</p>
        </>
      )}
    </section>
  );
}
