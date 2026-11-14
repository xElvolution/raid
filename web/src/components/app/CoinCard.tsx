'use client';
/** The coin card used on reels and lives: logo, ticker, price, 24h, market cap, sparkline, Buy and Join raid. Tap opens a token sheet. */
import Link from 'next/link';
import { useState } from 'react';
import { CoinAvatar, Delta } from '../ui';
import { Spark } from '../Spark';
import { StepSheet } from './Flow';
import { openJoin } from './Flow';
import { fmtUsd } from './TokenList';
import { useCandles, useQuote, fmtPrice } from '@/lib/market';
import { useNow, useRaids } from '@/lib/hooks';
import { target, xLabel } from '@/lib/raid';
import { openCall } from '@/lib/bus';
import { COINS } from '@/lib/coins';

export function useOpenRaidFor(symbol: string, raidId?: number | null) {
  const raids = useRaids(); const now = useNow();
  const list = (raids.data ?? []).filter((r) => r.status === 'Open' && now > 0 && now < r.opens_until_ms && target(r).symbol.replace(/^t(?=[A-Z])/, '') === symbol);
  return list.find((r) => r.id === raidId) ?? list.sort((a, b) => b.id - a.id)[0];
}

export function CoinCard({ symbol, raidId, dark = false }: { symbol: string; raidId?: number | null; dark?: boolean }) {
  const q = useQuote(symbol);
  const c = useCandles(symbol, '1h');
  const raid = useOpenRaidFor(symbol, raidId);
  const [sheet, setSheet] = useState(false);
  const closes = (c.data?.candles ?? []).slice(-24).map((x) => x.c);
  const up = (q.data?.change24h ?? 0) >= 0;
  const name = COINS.find((x) => x.symbol === symbol)?.name ?? symbol;
  return (
    <>
      <div className={`${dark ? 'glass-dark text-white' : 'glass'} flex items-center gap-2.5 rounded-[18px] p-2.5`}>
        <button onClick={() => setSheet(true)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-label={`About $${symbol}`}>
          <CoinAvatar symbol={symbol} image={q.data?.image} size={38} />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-1.5"><span className="text-[15px] font-bold">${symbol}</span><span className="mono text-[12.5px]">{fmtPrice(q.data?.priceUsd)}</span></span>
            <span className={`flex items-center gap-1.5 text-[11.5px] ${dark ? 'text-white/65' : 'text-mute'}`}><Delta pct={q.data?.change24h} className="text-[11.5px]" /><span>MC {fmtUsd(q.data?.marketCap)}</span></span>
          </span>
          {closes.length > 2 && <span className="block w-[56px] shrink-0"><Spark values={closes} width={56} height={26} stroke={up ? "var(--color-up)" : "var(--color-down)"} /></span>}
        </button>
        <Link href={`/coin/${symbol}`} className={`press grid h-10 shrink-0 place-items-center rounded-full px-4 text-[13.5px] font-bold ${dark ? 'bg-white text-black' : 'bg-ink text-bg'}`}>Buy</Link>
        {raid && <button onClick={() => openJoin(raid.id)} className="press h-10 shrink-0 rounded-full btn-signal px-3.5 text-[13.5px] font-bold">Join raid</button>}
      </div>
      <StepSheet open={sheet} onClose={() => setSheet(false)} label={`$${symbol}`} step={0} total={1}>
        <div className="flex items-center gap-3 pt-3">
          <CoinAvatar symbol={symbol} image={q.data?.image} size={48} />
          <div className="min-w-0 flex-1"><p className="text-[18px] font-semibold">{name}</p><p className="flex items-center gap-2 text-[13px] text-mute"><span className="mono text-ink">{fmtPrice(q.data?.priceUsd)}</span><Delta pct={q.data?.change24h} className="text-[12.5px]" /></p></div>
        </div>
        {closes.length > 2 && <div className="mt-3"><Spark values={closes} width={400} height={70} className="w-full" stroke={up ? 'var(--color-up)' : 'var(--color-down)'} /></div>}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[['Market cap', fmtUsd(q.data?.marketCap)], ['24h volume', fmtUsd(q.data?.volume24h)], ['Liquidity', fmtUsd(q.data?.liquidityUsd)]].map(([k, v]) => <div key={k} className="rounded-[14px] bg-raised px-2 py-2.5"><p className="text-[11px] text-mute">{k}</p><p className="mono mt-0.5 text-[14px] font-semibold">{v}</p></div>)}
        </div>
        {raid && <p className="mt-3 text-[13px] text-mute">A ${target(raid).symbol} raid to {xLabel(raid.target_x_bps)} is open right now.</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={`/coin/${symbol}`} onClick={() => setSheet(false)} className="press flex h-12 items-center justify-center rounded-full bg-ink text-[14px] font-semibold text-bg">Buy</Link>
          {raid ? <button onClick={() => { setSheet(false); openJoin(raid.id); }} className="press h-12 rounded-full btn-signal text-[14px] font-semibold">Join raid</button>
            : <button onClick={() => { setSheet(false); openCall(symbol); }} className="press h-12 rounded-full btn-signal text-[14px] font-semibold">Start a raid</button>}
        </div>
        <Link href={`/coin/${symbol}`} onClick={() => setSheet(false)} className="mt-2 block py-2 text-center text-[13px] font-medium text-mute">Open token page</Link>
      </StepSheet>
    </>
  );
}
