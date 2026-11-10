'use client';
import { ctaFor } from '@/lib/battle-words';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import { haptic, tapBurst } from '@/lib/fx';
import { money, usePlayAccount, usePlayTrade } from '@/lib/play';
import { useSession } from '@/lib/session';

const CHIPS = [5, 25, 100];

/** Trade ticket. Preview trades a play balance against the market maker; prices move with every fill. */
export function TradePanel({ marketId, p, open, question, category, outcome: ctl, onOutcome, onFreeCall, freeCalled }: { category?: string | null; marketId: string; p: number; open: boolean; question?: string; outcome?: 0 | 1; onOutcome?: (o: 0 | 1) => void; onFreeCall?: (o: 0 | 1, e: React.MouseEvent) => void; freeCalled?: boolean }) {
  const { me } = useSession();
  const acct = usePlayAccount();
  const trade = usePlayTrade();
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [own, setOwn] = useState<0 | 1>(1);
  const outcome = ctl ?? own;
  const setOutcome = (o: 0 | 1) => { setOwn(o); onOutcome?.(o); };
  const [amount, setAmount] = useState('25');
  const [err, setErr] = useState<string | null>(null);
  const pos = acct.data?.open.find((x) => x.market_id === marketId && x.outcome === outcome);
  const price = outcome ? p : 1 - p;
  const v = Number(amount) || 0;
  const shares = side === 'buy' ? v / Math.max(price, 0.01) : Math.min(v, pos?.shares ?? 0);
  const payout = side === 'buy' ? shares : shares * price;
  const bal = acct.data?.balance ?? 0;
  const can = open && v > 0 && (side === 'buy' ? v <= bal : !!pos && v <= pos.shares + 1e-9);

  if (!me) return (
    <div className="cuts bg-panel p-5 text-center">
      <div className="cd text-[26px]">Trade this market</div>
      <p className="mt-1 text-[14px] text-mute">Sign in or try the demo to trade with a play balance.</p>
      <div className="mt-4 flex gap-2 justify-center">
        <Link href="/signin" className="cuts cd h-11 px-5 bg-grape text-white text-[20px] grid place-items-center">Sign in</Link>
        <Link href="/signin?demo=1" className="cut-tr cd h-11 px-5 bg-snow text-[20px] grid place-items-center">Try demo</Link>
      </div>
    </div>
  );

  const submit = (e: React.MouseEvent) => {
    setErr(null);
    haptic('heavy'); tapBurst(e.clientX, e.clientY);
    const origin = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    trade.mutate(side === 'buy' ? { marketId, outcome, side, amount: v, origin, question } : { marketId, outcome, side, shares: shares, origin, question }, {
      onError: (x) => { haptic('error'); setErr(x instanceof Error && /insufficient/i.test(x.message) ? 'Not enough balance.' : 'Trade failed. Try again.'); },
    });
  };

  return (
    <div className="cuts bg-panel p-3">
      <div className="grid grid-cols-2 gap-1.5">
        {([1, 0] as const).map((o) => {
          const on = outcome === o;
          const c = Math.round((o ? p : 1 - p) * 100);
          return (
            <motion.button key={o} whileTap={{ scale: 0.96 }} onClick={(e) => { setOutcome(o); haptic('select'); tapBurst(e.clientX, e.clientY, o ? '#22d3a6' : '#ff5a6e'); }} aria-pressed={on}
              className={`cd h-12 text-[22px] ${o ? 'cuts' : 'cut-tr'} ${on ? (o ? 'bg-mint text-[#000]' : 'bg-coral text-[#000]') : o ? 'bg-bg text-mint' : 'bg-bg text-coral'}`}>
              {o ? 'Yes' : 'No'} {c}¢
            </motion.button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-3">
        {(['buy', 'sell'] as const).map((s) => (
          <button key={s} onClick={() => { setSide(s); setAmount(s === 'buy' ? '25' : String(Math.floor((pos?.shares ?? 0) * 100) / 100)); haptic('tap'); }}
            className={`mn relative text-[11px] font-bold uppercase tracking-[.1em] ${side === s ? 'text-ink' : 'text-mute'}`}>
            {s}{side === s && <motion.span layoutId="tp-side" className="absolute -bottom-1 inset-x-0 h-[2px] bg-grape" />}
          </button>
        ))}
        <span className="mn ml-auto text-[11px] text-mute">CASH <span className="text-ink">{money(bal)}</span></span>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <div className="mn text-[10px] text-mute">{side === 'buy' ? 'STAKE' : 'SHARES'}</div>
          <div className="cd flex items-baseline text-[58px] leading-[.9]">
            {side === 'buy' && <span>$</span>}
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} aria-label="Amount" className="w-[4.2ch] bg-transparent outline-none" />
          </div>
        </div>
        <div className="text-right">
          <div className="mn text-[10px] text-mute">{side === 'buy' ? 'TO WIN' : 'YOU GET'}</div>
          <div className="cd text-[38px] leading-none text-mint">{money(payout)}</div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1">
        {(side === 'buy' ? CHIPS.map((c) => [`+$${c}`, () => setAmount(String(v + c))] as const) : [0.25, 0.5, 1].map((f) => [f === 1 ? 'Max' : `${f * 100}%`, () => setAmount(String(Math.floor((pos?.shares ?? 0) * f * 100) / 100))] as const)).map(([l, fn]) => (
          <button key={l} onClick={() => { fn(); haptic('tap'); }} className="press mn h-9 bg-snow text-[12px] font-bold">{l}</button>
        ))}
      </div>
      <div className="mn mt-3 space-y-1 text-[11px] uppercase text-mute">
        <div className="flex justify-between"><span>Avg price</span><span className="text-ink">{Math.round(price * 100)}¢ · {shares.toFixed(2)} sh</span></div>
        {pos && <div className="flex justify-between"><span>Your position</span><span className="text-ink">{pos.shares.toFixed(2)} {outcome ? 'YES' : 'NO'} @ {Math.round(pos.avg * 100)}¢</span></div>}
      </div>
      {err && <p className="mt-2 text-[13px] text-coral">{err}</p>}
      <motion.button whileTap={{ scale: 0.97, y: 1 }} disabled={!can || trade.isPending} onClick={submit}
        className="cuts cd mt-3 h-14 w-full bg-grape text-[26px] text-white disabled:opacity-40">
        {!open ? 'Trading closed' : trade.isPending ? 'Filling…' : `${side === 'buy' ? ctaFor(category, question, outcome) : `Sell ${outcome ? 'Yes' : 'No'}`} ▶`}
      </motion.button>
      {onFreeCall && open && (
        <button disabled={freeCalled} onClick={(e) => onFreeCall(outcome, e)} className="mn mt-2 h-9 w-full text-[11px] font-bold uppercase tracking-[.08em] text-mute hover:text-ink disabled:opacity-60">
          {freeCalled ? 'Free call made' : `Or free call ${outcome ? 'Yes' : 'No'} · +XP`}
        </button>
      )}
    </div>
  );
}
