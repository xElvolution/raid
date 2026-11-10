'use client';
import Link from 'next/link';
import { motion } from 'motion/react';
import { type Raid, type TokenInfo, tokenLabel, xLabel, fmtUnits, STATUS_COPY } from '@/lib/raid';

/** Fomo-style raid call card: who called it, the target, the crew's pot and how close the raid is to its line. */
export function RaidCard({ r, tokens, baseDecimals = 6 }: { r: Raid; tokens: Record<string, TokenInfo>; baseDecimals?: number }) {
  const t = tokenLabel(r.target, tokens);
  const now = Date.now();
  const open = r.status === 'Open' && now < r.opens_until_ms;
  const mins = Math.max(0, Math.round((r.opens_until_ms - now) / 60000));
  const progress = r.status === 'Closed' ? 1 : r.status === 'Held' || r.status === 'Selling' ? 0.5 : r.status === 'Buying' ? 0.25 : 0.1;
  return (
    <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="border-b border-line px-4 py-4 hover:bg-ink/[.02]">
      <Link href={`/raids/${r.id}`} className="block">
        <div className="flex items-center gap-2 text-[13px] text-mute">
          <span className="font-semibold text-ink truncate min-w-0">@{r.caller}</span>
          <span className="shrink-0 whitespace-nowrap">called a raid</span>
          <span className="ml-auto shrink-0 rounded-full bg-grape/10 text-grape px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">{STATUS_COPY[r.status]}</span>
        </div>
        <h3 className="mt-2 text-[18px] font-semibold leading-snug">{r.title}</h3>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat k="Target" v={`$${t.symbol}`} sub={t.chain} />
          <Stat k="Sell line" v={xLabel(r.target_x_bps)} sub="auto-sell" />
          <Stat k="Crew pot" v={fmtUnits(r.pot, baseDecimals)} sub={open ? `${mins} min left` : 'closed to new crew'} />
        </div>
        <div className="mt-3 h-2 w-full bg-snow overflow-hidden" aria-label="Raid progress">
          <motion.div className="h-full bg-grape" initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }} />
        </div>
        {r.status === 'Closed' && <p className={`mt-2 text-[13px] font-semibold ${r.hit ? 'text-mint' : 'text-mute'}`}>{r.hit ? `Line hit: the caller's locked fee is paid and RAID gets bought back and burned.` : 'Retreated below the line: caller fee forfeited.'}</p>}
      </Link>
    </motion.article>
  );
}

function Stat({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="bg-panel border border-line px-2 py-2">
      <div className="text-[10px] uppercase tracking-[.1em] text-mute font-bold">{k}</div>
      <div className="text-[17px] font-semibold tabular-nums truncate">{v}</div>
      <div className="text-[11px] text-mute truncate">{sub}</div>
    </div>
  );
}
