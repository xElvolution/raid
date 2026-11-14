'use client';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { type Raid, phase, target, xLabel, usdcOf, liveMultiple, stepIndex, STEPS } from '@/lib/raid';
import { coinByAsset } from '@/lib/coins';
import { useCandles, useQuote, fmtPrice, countdown, shortAddr } from '@/lib/market';
import { CHAINS } from '@/lib/coins';
import { useNow } from '@/lib/hooks';
import { Cells, Chip, CoinAvatar, Delta, Flash, Identicon } from './ui';
import { Spark } from './Spark';
import { Receipt } from './Proof';

export function PhaseChip({ r, now }: { r: Raid; now: number }) {
  if (!now) return <Chip tone="ghost">#{r.id}</Chip>;
  const p = phase(r, now);
  return <Chip tone={p.tone === 'ghost' ? 'ghost' : p.tone} live={p.live}>{p.label}</Chip>;
}

/** The raid card: target, the caller's line, the crew pot, and where the raid stands. */
export function RaidCard({ r, i = 0 }: { r: Raid; i?: number }) {
  const now = useNow();
  const t = target(r);
  const q = useQuote(t.symbol);
  const c = useCandles(t.known ? t.symbol : undefined, '1h');
  const closes = (c.data?.candles ?? []).slice(-48).map((x) => x.c);
  const open = r.status === 'Open' && now > 0 && now < r.opens_until_ms;
  const mult = liveMultiple(r, q.data?.priceUsd, coinByAsset(r.target)?.decimals);
  const step = stepIndex(r);
  const meter = mult ? Math.min(1, mult / (r.target_x_bps / 1e4)) : (step + 1) / STEPS.length;
  return (
    <motion.article initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.05, type: 'spring', stiffness: 380, damping: 32 }}>
      <div className="lift panel group overflow-hidden !rounded-[24px]">
      <Link href={`/raids/${r.id}`} className="block">
        <div className="flex items-center gap-2.5 md:gap-3 px-3.5 pt-3.5 md:px-5 md:pt-5">
          <CoinAvatar symbol={t.symbol} image={q.data?.image} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><span className="text-[1.125rem] md:text-[19px] font-semibold tracking-[-0.03em] truncate">${t.symbol}</span><span className="mono text-[10.5px] text-mute uppercase">{CHAINS[t.chain]?.label ?? t.chain}</span></div>
            <div className="mt-0.5 md:mt-1 flex items-center gap-2 text-[12px] md:text-[12.5px]"><Flash value={q.data?.priceUsd}><span className="mono">{fmtPrice(q.data?.priceUsd)}</span></Flash><Delta pct={q.data?.change24h} className="text-[11.5px]" /></div>
          </div>
          <PhaseChip r={r} now={now} />
        </div>

        <div className="mt-3 md:mt-5 grid grid-cols-[1fr_auto] items-end gap-3 px-3.5 md:px-5">
          <div>
            <p className="eyebrow">Sell line</p>
            <p className="mt-1.5 text-[2rem] font-semibold leading-none tracking-[-0.06em] md:text-[52px]">{xLabel(r.target_x_bps)}</p>
          </div>
          <Spark values={closes} width={132} height={44} className="opacity-90 max-md:h-[34px] max-md:w-[110px]" />
        </div>

        <div className="mx-2 mt-3 md:mx-3 md:mt-5 grid grid-cols-3 rounded-[20px] bg-raised/70">
          <Stat k="Crew pot" v={`${usdcOf(r.pot).toLocaleString('en-US', { maximumFractionDigits: 2 })}`} unit="USDC" />
          <Stat k={open ? 'Crew closes' : r.status === 'Held' ? 'Retreat in' : 'Raid'} v={open ? countdown(r.opens_until_ms - now) : r.status === 'Held' ? countdown(r.retreat_at_ms - now) : `#${r.id}`} />
          <Stat k={mult ? 'Now at' : 'Entry'} v={mult ? `${mult.toFixed(2)}x` : Number(r.entry_cost) ? `${usdcOf(r.entry_cost).toFixed(2)}` : 'Pending'} unit={!mult && Number(r.entry_cost) ? 'USDC' : undefined} />
        </div>

        <div className="px-3.5 py-3 md:px-5 md:py-4">
          <Cells value={meter} n={12} mark={11} />
          <div className="mt-2 md:mt-3 flex items-center gap-2 text-[12px] md:text-[12.5px] text-mute">
            <Identicon seed={r.caller} size={22} className="!rounded-full" />
            <span className="truncate"><span className="text-ink font-medium">{shortAddr(r.caller)}</span> called raid #{r.id}</span>
            <span className="ml-auto shrink-0 mono text-[10.5px] uppercase tracking-wider">{mult ? `${Math.round(meter * 100)}% to line` : STEPS[step]}</span>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-bg transition-transform group-hover:rotate-45"><ArrowUpRight size={14} /></span>
          </div>
        </div>
      </Link>
      <Receipt id={r.id} className="border-t border-line/70 px-3.5 py-2 md:px-5 md:py-2.5" />
      </div>
    </motion.article>
  );
}

function Stat({ k, v, unit }: { k: string; v: string; unit?: string }) {
  return (
    <div className="min-w-0 border-r border-line/80 px-3 py-2.5 md:px-4 md:py-3 last:border-r-0">
      <p className="eyebrow truncate">{k}</p>
      <p className="mt-1 md:mt-1.5 truncate mono text-[14px] md:text-[15px] font-semibold">{v}{unit && <span className="ml-1 text-[10.5px] font-medium text-mute">{unit}</span>}</p>
    </div>
  );
}

export function RaidCardSkeleton() {
  return (
    <div className="panel !rounded-[24px] p-3.5 md:p-5" aria-hidden>
      <div className="flex items-center gap-3"><div className="shimmer h-10 w-10 !rounded-full" /><div className="flex-1"><div className="shimmer h-4 w-24" /><div className="shimmer mt-2 h-3 w-32" /></div></div>
      <div className="shimmer mt-5 h-10 w-28" /><div className="shimmer mt-5 h-14 w-full" /><div className="shimmer mt-4 h-2.5 w-full" />
    </div>
  );
}
