'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, Copy, Check, Info } from 'lucide-react';
import { ORIGINS, isEvmAddr, isNearAccount, isSolAddr, type AnyQuote } from '@/lib/anychain';
import { useAccount } from '@/lib/wallet';
import { useChestConfig } from '@/lib/hooks';
import { PayoutBox, RiskNote } from './Payout';
import { Skeleton } from './ui';

function useDebounced<T>(v: T, ms = 450) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

/** Back a raid from Solana / Base / Ethereum / Arbitrum through a NEAR Intents 1Click deposit address. */
export function AnyChainBack({ raidId, bps, open }: { raidId: number; bps: number; open: boolean }) {
  const acct = useAccount();
  const cfg = useChestConfig();
  const [origin, setOrigin] = useState('sol-SOL');
  const [amt, setAmt] = useState('0.1');
  const [who, setWho] = useState('');
  const [refund, setRefund] = useState('');
  const [copied, setCopied] = useState(false);
  const o = ORIGINS.find((x) => x.key === origin)!;
  const beneficiary = (who || acct || '').trim().toLowerCase();
  const refundBad = !!refund && !(o.addr === 'sol' ? isSolAddr(refund) : isEvmAddr(refund));
  const whoBad = !!who && !isNearAccount(who.trim().toLowerCase());
  const args = useDebounced({ origin, amount: amt, raidId, beneficiary: whoBad ? '' : beneficiary, refundTo: refundBad ? '' : refund });
  const q = useQuery({
    queryKey: ['anyquote', args], enabled: Number(args.amount) > 0, staleTime: 20_000, refetchInterval: 30_000, retry: 1,
    queryFn: async (): Promise<AnyQuote> => {
      const r = await fetch('/api/anychain/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail ?? j.error ?? 'quote failed');
      return j;
    },
  });
  const usdc = q.data ? Number(q.data.usdcOut) : 0;
  const stepOn = q.data ? (q.data.depositAddress ? 2 : 1) : 0;

  return (
    <div>
      <div className="mt-3 flex gap-1.5 overflow-x-auto no-scrollbar" role="radiogroup" aria-label="Pay with">
        {ORIGINS.map((x) => (
          <button key={x.key} role="radio" aria-checked={origin === x.key} onClick={() => { setOrigin(x.key); setRefund(''); setAmt(x.symbol === 'USDC' ? '10' : x.symbol === 'ETH' ? '0.005' : '0.1'); }}
            className={`press h-9 shrink-0 rounded-full px-3 text-[12px] font-semibold ${origin === x.key ? 'bg-ink text-bg' : 'hairline text-mute hover:text-ink'}`}>
            {x.symbol} <span className={origin === x.key ? 'opacity-60' : 'text-faint'}>· {x.chainLabel}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-[14px] bg-raised p-3.5">
        <p className="eyebrow">You send on {o.chainLabel}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ''))} disabled={!open} aria-label={`Amount in ${o.symbol}`} className="w-full bg-transparent mono text-[24px] font-bold outline-none disabled:opacity-50" />
          <span className="mono text-[13px] font-bold">{o.symbol}</span>
        </div>
        <p className="mono text-[11.5px] text-mute">{q.data?.amountInUsd ? `≈ $${Number(q.data.amountInUsd).toFixed(2)}` : ' '}</p>
      </div>
      <div className="relative z-10 -my-2.5 flex justify-center"><span className="grid h-8 w-8 place-items-center rounded-full border-4 border-panel bg-brand text-white"><ArrowDown size={15} /></span></div>
      <div className="rounded-[14px] hairline p-3.5">
        <p className="eyebrow">Chest receives (USDC on NEAR)</p>
        {q.isLoading ? <Skeleton className="mt-2 h-7 w-40" /> : q.error ? <p className="mt-1.5 text-[13px] text-down">1Click didn’t quote: {(q.error as Error).message}</p> : (
          <>
            <p className="mt-1.5 mono text-[24px] font-bold leading-none">{q.data ? Number(q.data.usdcOut).toFixed(2) : '—'}</p>
            <p className="mt-1 mono text-[11.5px] text-mute">{q.data ? `min ${Number(q.data.minUsdcOut).toFixed(2)} · ~${q.data.etaSec ?? '?'}s · 1Click quote ${q.data.mode}` : ''}</p>
          </>
        )}
      </div>

      <div className="mt-3 grid gap-2">
        <label className="block">
          <span className="eyebrow">Your RAID account (gets the stake)</span>
          <input value={who} onChange={(e) => setWho(e.target.value)} placeholder={acct ?? 'name.near or 0x… (ETH address works as a NEAR account)'} aria-invalid={whoBad} className={`mt-1 h-10 w-full rounded-[10px] bg-raised px-3 mono text-[12.5px] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-brand)] ${whoBad ? 'shadow-[inset_0_0_0_1.5px_var(--color-down)]' : ''}`} />
        </label>
        <label className="block">
          <span className="eyebrow">Refund address on {o.chainLabel} (if the swap fails)</span>
          <input value={refund} onChange={(e) => setRefund(e.target.value.trim())} placeholder={o.addr === 'sol' ? 'Solana address' : '0x… address'} aria-invalid={refundBad} className={`mt-1 h-10 w-full rounded-[10px] bg-raised px-3 mono text-[12.5px] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-brand)] ${refundBad ? 'shadow-[inset_0_0_0_1.5px_var(--color-down)]' : ''}`} />
        </label>
      </div>

      <ol className="mt-4 grid grid-cols-3 gap-1.5" aria-label="Any-chain backing steps">
        {['Quote', 'Deposit address', 'Credited to chest'].map((s, i) => (
          <li key={s} className="min-w-0">
            <div className={`h-1.5 rounded-full ${i < stepOn ? 'bg-ink' : i === stepOn ? 'bg-lime' : 'bg-raised'}`} />
            <p className={`mt-1.5 truncate text-[11px] font-semibold ${i === stepOn ? 'text-ink' : 'text-faint'}`}>{s}</p>
          </li>
        ))}
      </ol>

      {q.data?.depositAddress ? (
        <div className="mt-3 rounded-[14px] bg-lime p-3.5 text-[#0a1a00]">
          <p className="eyebrow !text-[#0a1a00]/60">Send exactly {q.data.amountIn} {o.symbol} on {o.chainLabel} to</p>
          <div className="mt-1.5 flex items-center gap-2">
            <p className="min-w-0 flex-1 break-all mono text-[13px] font-bold">{q.data.depositAddress}</p>
            <button onClick={() => { void navigator.clipboard.writeText(q.data!.depositAddress!); setCopied(true); setTimeout(() => setCopied(false), 1500); }} aria-label="Copy deposit address" className="press grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#0a1a00] text-lime">{copied ? <Check size={16} /> : <Copy size={16} />}</button>
          </div>
          <p className="mt-1.5 text-[11.5px] opacity-70">Valid until {q.data.deadline ? new Date(q.data.deadline).toLocaleString('en-GB') : 'the quote deadline'}.</p>
        </div>
      ) : (
        <div className="mt-3 flex gap-2.5 rounded-[14px] border border-dashed border-line p-3.5 text-[12.5px] text-mute">
          <Info size={16} className="mt-0.5 shrink-0 text-brand" />
          <span>{q.data?.reason ?? 'The deposit address appears here once the quote is live.'} When live, 1Click swaps your {o.symbol} to USDC on NEAR and hands it to the chest with <code className="mono text-[11px] text-ink">{q.data?.msg ?? '{"back":…}'}</code>, so the stake is yours, not the bridge’s. Anything that lands after the crew window or over the cap is kept claimable for you.</span>
        </div>
      )}

      {usdc > 0 && <PayoutBox stake={usdc} bps={bps} cfg={cfg.data} unit="USDC" className="mt-3" />}
      <RiskNote className="mt-3" />
    </div>
  );
}
