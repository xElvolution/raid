'use client';
/**
 * Step-by-step bottom sheets for every money action: one step per screen, plain words,
 * an explicit Approve step before any transaction, then a clear success state.
 */
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Droplets, Loader2, ShieldCheck, Wallet, X } from 'lucide-react';
import { bus, toast } from '@/lib/bus';
import { useChestConfig, useNow, useRaid } from '@/lib/hooks';
import { NET } from '@/lib/net';
import { payoutAtLine, target, tx, usdcOf, xLabel } from '@/lib/raid';
import { claimTestFunds, connect, send, useAccount } from '@/lib/wallet';
import { attributeReel } from '@/lib/reels';
import { AnyChainBack } from '@/components/AnyChainBack';
import { useBalances } from './Funds';

export const joinSheet = bus<{ id: number }>();
export const claimSheet = bus<void>();
export const openJoin = (id: number) => joinSheet.emit({ id });
export const openClaim = () => claimSheet.emit();

export function StepSheet({ open, onClose, label, step, total, onBack, children }: { open: boolean; onClose: () => void; label: string; step: number; total: number; onBack?: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>{open && (
      <motion.div className="fixed inset-0 z-[78] flex items-end justify-center bg-black/45 md:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div role="dialog" aria-label={label} onClick={(e) => e.stopPropagation()} initial={{ y: 60 }} animate={{ y: 0 }} exit={{ y: 60 }} transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          className="max-h-[88dvh] w-full max-w-[440px] overflow-y-auto rounded-t-[22px] bg-bg px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] md:rounded-[22px]">
          <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-line md:hidden" />
          <div className="flex items-center gap-1">
            {onBack ? <button onClick={onBack} aria-label="Back" className="press -ml-1.5 grid h-8 w-8 place-items-center rounded-full hover:bg-raised"><ArrowLeft size={17} /></button> : <span className="w-1" />}
            <span className="text-[12px] text-mute">{label}{total > 1 && step < total ? ` · step ${step + 1} of ${total}` : ''}</span>
            <button onClick={onClose} aria-label="Close" className="ml-auto grid h-8 w-8 place-items-center rounded-full hover:bg-raised"><X size={17} /></button>
          </div>
          {total > 1 && <div className="mt-1.5 flex gap-1">{Array.from({ length: total }, (_, i) => <span key={i} className={`h-[3px] flex-1 rounded-full transition-colors ${i <= step ? 'bg-signal' : 'bg-line'}`} />)}</div>}
          <AnimatePresence mode="wait"><motion.div key={step} initial={{ x: 24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} transition={{ duration: 0.18 }}>{children}</motion.div></AnimatePresence>
        </motion.div>
      </motion.div>
    )}</AnimatePresence>
  );
}
export const H = ({ children }: { children: ReactNode }) => <h2 className="mt-3 text-[19px] font-semibold leading-tight tracking-[-0.02em]">{children}</h2>;
export const P = ({ children }: { children: ReactNode }) => <p className="mt-1.5 text-[13.5px] leading-relaxed text-mute">{children}</p>;
export function Primary({ children, onClick, disabled, busy }: { children: ReactNode; onClick: () => void; disabled?: boolean; busy?: boolean }) {
  return <button disabled={disabled || busy} onClick={onClick} className="press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full btn-signal text-[14.5px] font-semibold disabled:opacity-50">{busy && <Loader2 size={17} className="animate-spin" />}{children}</button>;
}
function Done({ title, body, children }: { title: string; body: ReactNode; children?: ReactNode }) {
  return (
    <div className="pt-4 text-center">
      <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 14 }} className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-up/15 text-up"><Check size={28} strokeWidth={2.6} /></motion.span>
      <h2 className="mt-3 text-[19px] font-semibold">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-[22rem] text-[13.5px] leading-relaxed text-mute">{body}</p>
      {children}
    </div>
  );
}
function Line({ k, v }: { k: string; v: ReactNode }) { return <div className="flex justify-between gap-3 py-2 text-[13.5px]"><span className="text-mute">{k}</span><span className="text-right font-semibold">{v}</span></div>; }

/** Join a raid: amount, review and approve, done. */
export function JoinSheet() {
  const [id, setId] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [amt, setAmt] = useState('10');
  const [busy, setBusy] = useState(false);
  const [other, setOther] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const acct = useAccount();
  const cfg = useChestConfig();
  const raid = useRaid(id ?? -1);
  const bal = useBalances(acct);
  const qc = useQueryClient();
  useEffect(() => joinSheet.on(({ id }) => { setId(id); setStep(0); setOther(false); setHash(null); }), []);
  const close = () => setId(null);
  const r = raid.data;
  const unit = NET.net === 'testnet' ? 'test USDC' : 'USDC';
  const n = Number(amt) || 0;
  const min = cfg.data ? usdcOf(cfg.data.min_back) : 0.1;
  const p = cfg.data && r ? payoutAtLine(n, r.target_x_bps, cfg.data.caller_fee_bps, cfg.data.buyback_bps) : null;
  const sym = r ? target(r).symbol : '';
  const short = bal.data && bal.data.usdc < n;
  async function approve() {
    if (!cfg.data || !r) return;
    setBusy(true);
    try {
      const h = await send(tx.back(cfg.data.usdc, r.id, String(Math.round(n * 1e6))));
      if (acct) void attributeReel(h, acct);
      setHash(typeof h === 'string' ? h : null); setStep(2);
      void qc.invalidateQueries({ queryKey: ['raid'] }); void qc.invalidateQueries({ queryKey: ['raids'] }); void qc.invalidateQueries({ queryKey: ['balances'] });
    } catch (e) { if ((e as Error).message !== 'connect_wallet') toast({ title: 'Not approved', body: (e as Error).message.slice(0, 140), tone: 'down' }); }
    finally { setBusy(false); }
  }
  const now = useNow();
  const open = !!r && r.status === 'Open' && (now === 0 || now < r.opens_until_ms);
  return (
    <StepSheet open={id !== null} onClose={close} label={r ? `Join $${sym} raid` : 'Join raid'} step={step} total={3} onBack={step === 1 && !busy ? () => setStep(0) : other ? () => setOther(false) : undefined}>
      {!r ? <div className="grid h-40 place-items-center"><Loader2 className="animate-spin text-mute" /></div>
      : !open && step < 2 ? <><H>This raid isn’t taking money right now</H><P>The join window has closed. Look for another open raid, or start your own.</P><Link href="/raids" onClick={close} className="press mt-4 flex h-12 items-center justify-center rounded-full btn-signal text-[14.5px] font-semibold">See open raids</Link></>
      : other ? <><H>Pay from Phantom or MetaMask</H><P>Send USDC from Solana or an EVM chain. It’s swapped and added to this raid for you.</P><div className="mt-3"><AnyChainBack raidId={r.id} bps={r.target_x_bps} open={open} /></div></>
      : step === 0 ? (
        <>
          <H>How much do you want to put in?</H>
          <P>Your money joins everyone else’s. When the timer ends it all buys ${sym} together.</P>
          <label className="mt-3 flex h-14 items-center gap-2 rounded-[16px] bg-raised px-4 focus-within:shadow-[inset_0_0_0_1.5px_var(--color-brand)]">
            <input autoFocus inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ''))} aria-label="Amount" className="w-full bg-transparent mono text-[24px] font-bold outline-none" />
            <span className="text-[12.5px] text-mute">{unit}</span>
          </label>
          <div className="mt-2 grid grid-cols-4 gap-1.5">{['5', '10', '25', '100'].map((v) => <button key={v} onClick={() => setAmt(v)} className={`press h-9 rounded-[12px] mono text-[12.5px] font-bold ${amt === v ? 'bg-ink text-bg' : 'hairline text-mute'}`}>{v}</button>)}</div>
          {bal.data && <p className="mt-2 text-[12px] text-mute">You have {bal.data.usdc.toFixed(2)} {unit}.{short && NET.net === 'testnet' && <> <button onClick={() => { close(); openClaim(); }} className="font-semibold text-lime">Get free test funds</button></>}</p>}
          <Primary disabled={n < min} onClick={() => (acct ? setStep(1) : void connect())}>{acct ? 'Continue' : 'Sign in to join'}</Primary>
          <button onClick={() => setOther(true)} className="mt-2 h-10 w-full text-[13px] font-medium text-mute">Pay from Phantom or MetaMask instead</button>
        </>
      ) : step === 1 ? (
        <>
          <H>Review and approve</H>
          <div className="mt-2 divide-y divide-line">
            <Line k="You put in" v={`${n} ${unit}`} />
            <Line k={`If $${sym} hits ${xLabel(r.target_x_bps)}`} v={<span className="text-up">about {p ? p.payout.toFixed(2) : '…'} back</span>} />
            <Line k="If it doesn’t" v="Sold at market, could be less" />
            <Line k="Buys at" v={r.buy_after_ms ? new Date(r.buy_after_ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'when the timer ends'} />
          </div>
          <p className="mt-3 flex gap-2 rounded-[14px] bg-raised px-3 py-2.5 text-[12.5px] leading-relaxed text-mute"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-lime" />Your wallet will ask you to approve one transfer to the raid contract. Nobody can withdraw it, not even the person who started the raid.</p>
          <Primary busy={busy} onClick={() => void approve()}><Wallet size={17} />{busy ? 'Waiting for approval…' : `Approve ${n} ${unit}`}</Primary>
        </>
      ) : (
        <Done title="You’re in the raid" body={<>You put {n} {unit} into the ${sym} raid. We’ll buy together when the timer ends and sell at {xLabel(r.target_x_bps)}.</>}>
          {hash && <a href={`${NET.explorer}/txns/${hash}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[12.5px] text-mute underline">See the transaction</a>}
          <button onClick={close} className="press mt-4 h-12 w-full rounded-full bg-ink text-[14.5px] font-semibold text-bg">Done</button>
        </Done>
      )}
    </StepSheet>
  );
}

const CLAIM = 'raid.faucet-claim';
export function readClaim(acct: string | null): { at: number; next_at: number; msg: string } | null { try { return acct ? JSON.parse(localStorage.getItem(`${CLAIM}:${acct}`) ?? 'null') : null; } catch { return null; } }
/** Claim test funds: explain, confirm, done. */
export function ClaimSheet() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const acct = useAccount();
  const qc = useQueryClient();
  useEffect(() => claimSheet.on(() => { setStep(0); setOpen(true); }), []);
  async function go() {
    if (!acct) return;
    setBusy(true);
    try {
      const r = await claimTestFunds(acct);
      const m = `${r.near ?? '0'} test NEAR${r.usdc && r.usdc !== '0' ? ` and ${r.usdc} test USDC` : ''}`;
      localStorage.setItem(`${CLAIM}:${acct}`, JSON.stringify({ at: Date.now(), next_at: r.next_at ?? Date.now() + 864e5, msg: `Sent ${m}.` }));
      setMsg(m); setStep(2); setTimeout(() => void qc.invalidateQueries({ queryKey: ['balances'] }), 2500);
    } catch (e) {
      const n = (e as { next_at?: number }).next_at;
      if (n) localStorage.setItem(`${CLAIM}:${acct}`, JSON.stringify({ at: Date.now(), next_at: n, msg: 'Already claimed today.' }));
      toast({ title: 'Couldn’t send test funds', body: (e as Error).message, tone: 'down' });
    } finally { setBusy(false); }
  }
  return (
    <StepSheet open={open} onClose={() => setOpen(false)} label="Get test funds" step={step} total={3} onBack={step === 1 && !busy ? () => setStep(0) : undefined}>
      {step === 0 ? (
        <>
          <span className="mt-3 grid h-12 w-12 place-items-center rounded-full bg-signal/15 text-lime"><Droplets size={22} /></span>
          <H>Free money to practise with</H>
          <P>RAID runs on the NEAR testnet. You get test NEAR to pay fees and 500 test USDC to join raids, once a day. Test tokens have no real value.</P>
          <Primary onClick={() => (acct ? setStep(1) : void connect())}>{acct ? 'Continue' : 'Sign in first'}</Primary>
        </>
      ) : step === 1 ? (
        <>
          <H>Send test funds to your account?</H>
          <div className="mt-2 divide-y divide-line"><Line k="To" v={<span className="mono text-[12px]">{acct}</span>} /><Line k="You get" v="0.3 test NEAR + up to 500 test USDC" /><Line k="Cost" v="Free, no signature needed" /></div>
          <Primary busy={busy} onClick={() => void go()}>{busy ? 'Sending…' : 'Confirm'}</Primary>
        </>
      ) : (
        <Done title="Test funds sent" body={<>We sent {msg} to your account. It shows up in a few seconds.</>}>
          <Link href="/raids" onClick={() => setOpen(false)} className="press mt-4 flex h-12 items-center justify-center rounded-full btn-signal text-[14.5px] font-semibold">Find a raid to join</Link>
        </Done>
      )}
    </StepSheet>
  );
}
