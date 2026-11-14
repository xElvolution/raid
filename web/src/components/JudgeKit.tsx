'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Gavel } from 'lucide-react';
import { Segmented } from './ui';
import { payoutAtLine, fmtPct, xLabel, CHEST_ID, NETWORK } from '@/lib/raid';
import { explorerAccount, explorerTx } from '@/lib/coins';
import { fmtUsd } from '@/lib/market';
import { useChestConfig } from '@/lib/hooks';
import receipts from '@/lib/receipts.json';

type Rcpt = { tx: string; block: number | null };
const R = receipts as unknown as { raids: Record<string, { call?: Rcpt & { caller: string; signer: string }; backs?: (Rcpt & { backer: string; amount: string })[] }> };
export const raidReceipt = (id: number) => R.raids[String(id)];
const blockUrl = (h: number) => `https://${NETWORK === 'testnet' ? 'testnet.' : ''}nearblocks.io/blocks/${h}`;

/** Receipt strip: the contract, the tx that called the raid, and its block, each linked to the testnet explorer. */
export function Receipt({ id, className = '' }: { id: number; className?: string }) {
  const r = raidReceipt(id)?.call;
  const a = 'inline-flex items-center gap-1 hover:text-ink underline-offset-2 hover:underline';
  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 mono text-[10px] md:text-[10.5px] text-faint ${className}`}>
      <span className="eyebrow !text-[9px]">Receipt</span>
      <a className={a} href={explorerAccount(CHEST_ID, NETWORK)} target="_blank" rel="noreferrer">contract {CHEST_ID.split('.')[0]!.slice(0, 12)}…</a>
      {r ? <a className={a} href={explorerTx(r.tx, NETWORK)} target="_blank" rel="noreferrer">tx {r.tx.slice(0, 6)}…</a> : <a className={a} href={explorerAccount(CHEST_ID, NETWORK)} target="_blank" rel="noreferrer">tx in contract history</a>}
      {r?.block && <a className={a} href={blockUrl(r.block)} target="_blank" rel="noreferrer">block {r.block.toLocaleString('en-US')}</a>}
    </div>
  );
}

/** "Judges: try a raid in 2 minutes" box. */
export function JudgeBox({ className = '' }: { className?: string }) {
  return (
    <section className={`min-w-0 overflow-hidden rounded-[14px] border border-lime/40 bg-lime/[.06] ${className}`}>
      <div className="flex items-center gap-2 px-3 pt-2.5 md:px-4 md:pt-3.5">
        <Gavel size={15} className="text-lime" />
        <p className="wide text-[0.875rem] md:text-[16px]">Judges: try a raid in 2 minutes</p>
        <span className="ml-auto chip chip-ghost">Testnet · free</span>
      </div>
      <ol className="mt-2 grid gap-1.5 px-3 pb-2.5 text-[12.5px] md:text-[13px] leading-snug md:px-4 md:pb-3.5">
        <li><b>1.</b> Open <Link href="/judges" className="font-semibold text-lime underline">/judges</Link> and paste one of the 3 prefunded judge keys from the submission notes.</li>
        <li><b>2.</b> Back Frog Legion’s live raid (#3) with tUSDC, or vote on a crew’s open DAO proposal.</li>
        <li><b>3.</b> Check the receipt: every raid card links its contract, tx and block on the explorer.</li>
      </ol>
    </section>
  );
}

/** Drag a stake, pick a line: what a backer nets on a hit, and the miss case. Uses the chest's live fee config. */
export function PayoutSlider({ className = '' }: { className?: string }) {
  const cfg = useChestConfig();
  const [stake, setStake] = useState(100);
  const [bps, setBps] = useState<'15000' | '20000' | '30000'>('20000');
  const [exit, setExit] = useState(60);
  const fee = cfg.data ?? { caller_fee_bps: 250, buyback_bps: 750 };
  const p = payoutAtLine(stake, Number(bps), fee.caller_fee_bps, fee.buyback_bps);
  const missBack = (stake * exit) / 100;
  const f = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <section className={`panel p-3 md:p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">What you’d get</p>
        <Segmented id="pay-line" value={bps} onChange={setBps} options={[{ value: '15000', label: '1.5x' }, { value: '20000', label: '2x' }, { value: '30000', label: '3x' }]} />
      </div>
      <label className="mt-3 block">
        <span className="flex justify-between text-[12.5px]"><span className="text-mute">Back</span><b className="mono">{stake} USDC</b></span>
        <input type="range" min={1} max={250} value={stake} onChange={(e) => setStake(Number(e.target.value))} className="mt-1.5 w-full accent-[#c6ff3d]" aria-label="Stake" />
      </label>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="rounded-[10px] p-2.5 hairline">
          <p className="eyebrow">Hits {xLabel(Number(bps))}</p>
          <p className="mono mt-1 text-[1.0625rem] md:text-[20px] font-bold text-up">{f(p.payout)}</p>
          <p className="mono mt-0.5 text-[11px] text-up">{fmtPct(p.gainPct)} net</p>
          <p className="mt-1.5 text-[10.5px] text-mute leading-snug">Caller {f(p.callerFee)} · reserve {f(p.buyback)}, from profit only</p>
        </div>
        <div className="rounded-[10px] p-2.5 hairline">
          <p className="eyebrow">Miss · sells {(exit / 100).toFixed(2)}x</p>
          <p className="mono mt-1 text-[1.0625rem] md:text-[20px] font-bold text-down">{f(missBack)}</p>
          <p className="mono mt-0.5 text-[11px] text-down">{fmtPct(exit - 100)} · no fees</p>
          <input type="range" min={0} max={100} value={exit} onChange={(e) => setExit(Number(e.target.value))} className="mt-1.5 w-full accent-[#ff5c7a]" aria-label="Retreat price" />
        </div>
      </div>
      <p className="mt-2 text-[10.5px] leading-snug md:text-[11px] text-faint">{fee.caller_fee_bps / 100}% caller fee and {fee.buyback_bps / 100}% buyback, taken from profit only if the raid hits. Max 250 USDC per backer, 1,000 per raid.</p>
    </section>
  );
}

interface Why { items: { id: string; name: string; marketCap: number; volume24h: number | null; change24h: number | null; url: string; updatedAt: string | null }[]; sourceUrl: string; at: number }
/** "Why now": live memecoin category numbers from CoinGecko, each linked to its source page. */
export function WhyNow({ className = '' }: { className?: string }) {
  const q = useQuery({ queryKey: ['whynow'], queryFn: () => fetch('/api/market/whynow').then((r) => r.json() as Promise<Why>), staleTime: 5 * 60_000 });
  const items = q.data?.items ?? [];
  if (!items.length) return null;
  return (
    <section className={`min-w-0 ${className}`}>
      <div className="flex items-baseline justify-between"><p className="eyebrow">Why now · memecoin market, live</p><a href={q.data?.sourceUrl ?? 'https://www.coingecko.com/en/categories'} target="_blank" rel="noreferrer" className="mono text-[10px] text-faint hover:text-ink">src · CoinGecko</a></div>
      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar md:mx-0 md:grid md:grid-cols-4 md:px-0">
        {(q.data?.items ?? []).map((c) => (
          <a key={c.id} href={c.url} target="_blank" rel="noreferrer" className="lift panel block w-[9.5rem] shrink-0 p-2.5 md:w-auto md:p-3">
            <p className="truncate text-[11.5px] font-semibold text-mute">{c.name}</p>
            <p className="mono mt-1 text-[1rem] md:text-[18px] font-bold">{fmtUsd(c.marketCap)}</p>
            <p className="mono mt-0.5 text-[10.5px] text-mute">24h vol {fmtUsd(c.volume24h)} <span className={(c.change24h ?? 0) >= 0 ? 'text-up' : 'text-down'}>{fmtPct(c.change24h ?? 0)}</span></p>
            <p className="mt-1 flex items-center gap-1 text-[9.5px] text-faint">market cap · CoinGecko<ExternalLink size={9} /></p>
          </a>
        ))}
        {q.isLoading && [0, 1, 2, 3].map((i) => <div key={i} className="shimmer h-[5.5rem] w-[9.5rem] shrink-0 md:w-auto" />)}
      </div>
      {q.error && <p className="mt-1 text-[11.5px] text-mute">CoinGecko didn’t answer; numbers hidden rather than guessed.</p>}
    </section>
  );
}

export function HonestNotes({ className = '' }: { className?: string }) {
  return (
    <ul className={`grid gap-1 text-[11.5px] md:text-[12px] text-mute leading-snug ${className}`}>
      <li>• <b className="text-ink">Testnet.</b> Raids, backs, crew DAOs and votes are real NEAR testnet transactions. tUSDC is a testnet faucet token with no value.</li>
      <li>• <b className="text-ink">No swaps on testnet.</b> NEAR Intents only runs on mainnet, so testnet backs show a failed forward to Intents; the stake is still recorded.</li>
      <li>• <b className="text-ink">Not audited.</b> The chest has unit tests, not an audit. Tiny amounts only if it ever goes to mainnet.</li>
    </ul>
  );
}
