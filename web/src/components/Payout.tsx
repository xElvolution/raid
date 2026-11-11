'use client';
import { AlertTriangle } from 'lucide-react';
import { payoutAtLine, fmtPct, xLabel, type ChestConfig } from '@/lib/raid';

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "You get X if the line hits / you can lose it", from the chest's real fee config. */
export function PayoutBox({ stake, bps, cfg, unit, className = '' }: { stake: number; bps: number; cfg?: ChestConfig; unit: string; className?: string }) {
  if (!cfg) return <div className={`shimmer h-[7.375rem] rounded-[14px] ${className}`} aria-hidden />;
  const p = payoutAtLine(stake, bps, cfg.caller_fee_bps, cfg.buyback_bps);
  return (
    <div className={`overflow-hidden rounded-[14px] hairline ${className}`}>
      <div className="grid grid-cols-2">
        <div className="min-w-0 p-2.5 md:p-3.5">
          <p className="eyebrow truncate">Line hits · {xLabel(bps)}</p>
          <p className="mt-1.5 whitespace-nowrap mono text-[1.125rem] md:text-[22px] font-bold leading-none text-up">{fmt(p.payout)}<span className="ml-1 text-[11px] font-medium text-mute">{unit}</span></p>
          <p className="mt-1 mono text-[12px] text-up">{fmtPct(p.gainPct)} net</p>
        </div>
        <div className="min-w-0 border-l border-line p-2.5 md:p-3.5">
          <p className="eyebrow truncate">Retreats</p>
          <p className="mt-1.5 whitespace-nowrap mono text-[1.125rem] md:text-[22px] font-bold leading-none text-down">0–{fmt(stake)}<span className="ml-1 text-[11px] font-medium text-mute">{unit}</span></p>
          <p className="mt-1 text-[12px] text-mute">sold at market price</p>
        </div>
      </div>
      <p className="border-t border-line bg-raised/60 px-2.5 md:px-3.5 py-2 text-[11px] md:text-[11.5px] text-mute leading-snug">
        Net of the {cfg.caller_fee_bps / 100}% caller fee and {cfg.buyback_bps / 100}% buyback, both taken from profit and only on a hit. A miss pays no fees. If it sells above the line, you get more.
      </p>
    </div>
  );
}

/** The plain risk line, shown wherever money goes in. */
export function RiskNote({ className = '' }: { className?: string }) {
  return (
    <p role="note" className={`flex gap-2 rounded-[10px] md:rounded-[12px] bg-down/10 px-2.5 md:px-3 py-2 md:py-2.5 text-[11.5px] md:text-[12px] leading-snug text-ink ${className}`}>
      <AlertTriangle size={15} className="mt-[1px] shrink-0 text-down" />
      <span><b>You can lose the whole pot.</b> Memecoins can drop fast. If the line isn’t hit before retreat, the chest sells at whatever the market pays. This is a game, not an investment.</span>
    </p>
  );
}

export const netLabel = (bps: number, cfg?: ChestConfig) => cfg ? fmtPct(payoutAtLine(100, bps, cfg.caller_fee_bps, cfg.buyback_bps).gainPct) : '…';
