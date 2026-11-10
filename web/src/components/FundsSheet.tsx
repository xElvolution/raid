'use client';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { coinBurst, haptic } from '@/lib/fx';
import { money, usePlayAccount } from '@/lib/play';
import { useSession } from '@/lib/session';
import { Segmented, Sheet } from './ui';

const CHIPS = [50, 100, 250, 1000];

/** Deposit / withdraw sheet. Preview runs on play money; testnet USDC uses the same flow once the contract is live. */
export function FundsSheet({ open, mode: initial, onClose }: { open: boolean; mode: 'deposit' | 'withdraw'; onClose: () => void }) {
  const { api } = useSession();
  const qc = useQueryClient();
  const acct = usePlayAccount();
  const [mode, setMode] = useState(initial);
  const [amount, setAmount] = useState('100');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [rail, setRail] = useState<'play' | 'near'>('play');
  const cfg = useQuery({ queryKey: ['funds-config'], queryFn: () => api.fundsConfig(), staleTime: 60_000 });
  const methods = useQuery({ queryKey: ['auth-methods'], queryFn: () => api.authMethods(), staleTime: 300_000 });
  const chain = methods.data?.chain ?? null;
  const [tx, setTx] = useState('');
  const v = Number(amount) || 0;
  const near = async (fn: () => Promise<string>) => {
    setBusy(true); setErr(null);
    try { const msg = await fn(); await qc.invalidateQueries({ queryKey: ['play'] }); haptic('success'); coinBurst(); setDone(msg); setTimeout(() => { setDone(null); onClose(); }, 1600); }
    catch (e) { const m = e instanceof Error ? e.message : ''; setErr(/422/.test(m) ? 'That transaction is not a transfer from your account to the treasury.' : /409/.test(m) ? (mode === 'deposit' ? 'Already credited.' : 'Not enough balance.') : /503/.test(m) ? 'NEAR deposits are not configured on this server yet.' : /502/.test(m) ? 'NEAR RPC is unavailable, try again.' : 'Something went wrong.'); haptic('error'); }
    finally { setBusy(false); }
  };
  const max = mode === 'withdraw' ? acct.data?.balance ?? 0 : 10_000;
  const go = async () => {
    setBusy(true); setErr(null);
    try {
      const a = mode === 'deposit' ? await api.playDeposit(v) : await api.playWithdraw(v);
      qc.setQueryData(['play'], a);
      haptic('success'); if (mode === 'deposit') coinBurst();
      setDone(`${mode === 'deposit' ? 'Added' : 'Withdrew'} ${money(v)}`);
      setTimeout(() => { setDone(null); onClose(); }, 1100);
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      setErr(/faucet_cooldown|429/.test(m) ? 'Faucet already used today. Come back in 24 hours.' : /no_wallet_linked/.test(m) ? 'Link a NEAR wallet to withdraw.' : /insufficient/.test(m) ? 'Not enough balance.' : /50[23]/.test(m) ? 'NEAR testnet is busy, try again.' : 'Something went wrong');
      haptic('error');
    }
    finally { setBusy(false); }
  };
  const faucetAmt = 1000;
  return (
    <Sheet open={open} onClose={onClose}>
      <div className="flex items-center justify-between">
        <h2 className="cd text-[24px]">{mode === 'deposit' ? 'Add funds' : 'Withdraw'}</h2>
        <span className="text-[13px] text-mute">Balance {money(acct.data?.balance ?? 0)}</span>
      </div>
      <div className="mt-4"><Segmented value={mode} onChange={(m) => setMode(m as 'deposit' | 'withdraw')} options={[{ value: 'deposit', label: 'Deposit' }, { value: 'withdraw', label: 'Withdraw' }]} /></div>
      {!chain && <div className="mt-2 grid grid-cols-2 gap-1">
        {(['play', 'near'] as const).map((r) => <button key={r} onClick={() => setRail(r)} className={`mn h-9 text-[11px] font-bold uppercase tracking-[.08em] ${rail === r ? 'bg-ink text-bg' : 'bg-snow text-mute'}`}>{r === 'play' ? 'Play money' : 'NEAR testnet'}</button>)}
      </div>}
      {chain ? (
        <div className="mt-5 space-y-3">
          {mode === 'deposit' ? (
            <div className="text-center"><div className="cd text-[52px] tabular-nums">{faucetAmt.toLocaleString()} <span className="text-mute text-[24px]">tUSDC</span></div>
              <p className="mt-1 text-[12px] text-mute">Testnet faucet · once every 24 hours · no real value</p></div>
          ) : (
            <label className="flex items-baseline justify-center gap-1 cd text-[52px]"><span className="text-mute">$</span>
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} aria-label="Amount" className="w-[5ch] bg-transparent text-center outline-none" /></label>
          )}
          <div className="border cut-tr border-line p-4 text-[13px] text-mute space-y-2">
            <div className="flex justify-between"><span>Network</span><span className="text-ink">NEAR {chain.network}</span></div>
            <div className="flex justify-between"><span>Token</span><span className="mn text-ink text-[11px] break-all">{chain.token}</span></div>
            <div className="flex justify-between"><span>Contract</span><span className="mn text-ink text-[11px] break-all">{chain.contract}</span></div>
          </div>
          {err && <p className="text-[13px] text-coral">{err}</p>}
          <motion.button whileTap={{ scale: 0.97 }} disabled={busy || (mode === 'withdraw' && (v <= 0 || v > max)) || (mode === 'deposit' && !chain.faucet)}
            onClick={async () => {
              setBusy(true); setErr(null);
              try {
                const a = mode === 'deposit' ? await api.playDeposit(faucetAmt) : await api.playWithdraw(v);
                qc.setQueryData(['play'], a); haptic('success'); if (mode === 'deposit') coinBurst();
                setDone(mode === 'deposit' ? `Minted ${faucetAmt.toLocaleString()} tUSDC` : `Sent ${money(v)} to your wallet`);
                setTimeout(() => { setDone(null); onClose(); }, 1400);
              } catch (e) { const m = e instanceof Error ? e.message : ''; setErr(/faucet_cooldown|429/.test(m) ? 'Faucet already used today. Come back in 24 hours.' : /no_wallet_linked/.test(m) ? 'Link a NEAR wallet to withdraw.' : /insufficient/.test(m) ? 'Not enough balance.' : 'NEAR testnet is busy, try again.'); haptic('error'); }
              finally { setBusy(false); }
            }}
            className="h-[52px] w-full cuts bg-grape text-white text-[16px] font-semibold disabled:opacity-40">
            {done ?? (busy ? 'Confirming on NEAR…' : mode === 'deposit' ? 'Get test USDC' : `Withdraw ${money(v)}`)}
          </motion.button>
        </div>
      ) : rail === 'play' ? (<>
      <label className="mt-6 flex items-baseline justify-center gap-1 text-[52px] font-semibold tracking-tight tabular-nums">
        <span className="text-mute">$</span>
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} aria-label="Amount"
          className="w-[5.5ch] bg-transparent outline-none text-center" />
      </label>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {CHIPS.map((c) => (
          <motion.button key={c} whileTap={{ scale: 0.94 }} onClick={() => { setAmount(String(c)); haptic('tap'); }}
            className={`h-10 border text-[14px] font-medium ${v === c ? 'border-ink text-ink' : 'border-line text-mute'}`}>${c}</motion.button>
        ))}
      </div>
      <div className="mt-5 border cut-tr border-line p-4 text-[13px] text-mute space-y-2">
        <div className="flex justify-between"><span>Network</span><span className="text-ink">NEAR testnet · USDC</span></div>
        <div className="flex justify-between"><span>Fee</span><span className="text-ink">$0.00</span></div>
        <div className="flex justify-between"><span>Arrives</span><span className="text-ink">Instantly</span></div>
      </div>
      <p className="mt-3 text-[12px] text-mute">Preview uses play balance so you can test every flow. No real money moves.</p>
      {err && <p className="mt-3 text-[13px] text-coral">{err}</p>}
      <motion.button whileTap={{ scale: 0.97 }} disabled={busy || v <= 0 || v > max} onClick={go}
        className="mt-5 h-[52px] w-full cuts bg-grape text-white text-[16px] font-semibold disabled:opacity-40">
        {done ?? (busy ? 'Confirming…' : `${mode === 'deposit' ? 'Deposit' : 'Withdraw'} ${money(v)}`)}
      </motion.button>
      </>) : mode === 'deposit' ? (
        <div className="mt-4 space-y-3">
          <div className="cut-tr border border-line p-3 text-[13px]">
            <div className="mn text-[10px] text-mute">1 · SEND TESTNET NEAR TO</div>
            <div className="mn mt-1 break-all text-[14px] font-bold">{cfg.data?.treasury ?? 'Treasury not configured'}</div>
            <div className="mn mt-2 text-[10px] text-mute">RATE 1 NEAR = ${cfg.data?.rate ?? 5} PLAY USDC · FROM YOUR LINKED ACCOUNT ONLY</div>
          </div>
          <label className="mn block text-[10px] text-mute">2 · PASTE THE TRANSACTION HASH</label>
          <input value={tx} onChange={(e) => setTx(e.target.value.trim())} placeholder="e.g. 9xQ…" className="mn h-12 w-full bg-bg px-3 text-[13px] outline-none focus:ring-2 focus:ring-grape" />
          {err && <p className="text-[13px] text-coral">{err}</p>}
          <motion.button whileTap={{ scale: 0.97 }} disabled={busy || tx.length < 43} onClick={() => void near(async () => { const r = await api.nearDeposit(tx); return `Credited ${money(r.credited)}`; })}
            className="cuts cd h-[52px] w-full bg-grape text-[22px] text-white disabled:opacity-40">{done ?? (busy ? 'Verifying on NEAR…' : 'Verify and credit')}</motion.button>
          {cfg.data?.demo && <button disabled={busy} onClick={() => void near(async () => { const r = await api.nearDeposit(`demo-${Math.random().toString(36).slice(2, 12)}`); return `Demo: credited ${money(r.credited)}`; })}
            className="mn h-10 w-full text-[11px] font-bold uppercase text-mute hover:text-ink">Demo mode: simulate a 10 NEAR deposit</button>}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="flex items-baseline justify-center gap-1 cd text-[64px]"><span className="text-mute">$</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} aria-label="Amount" className="w-[5ch] bg-transparent text-center outline-none" /></label>
          <p className="mn text-center text-[11px] text-mute">≈ {(v / (cfg.data?.rate ?? 5)).toFixed(2)} NEAR TO YOUR LINKED TESTNET ACCOUNT · QUEUED FOR THE TREASURY SIGNER</p>
          {err && <p className="text-[13px] text-coral">{err}</p>}
          <motion.button whileTap={{ scale: 0.97 }} disabled={busy || v <= 0 || v > (acct.data?.balance ?? 0)} onClick={() => void near(async () => { const r = await api.nearWithdraw(v); return `Queued ${r.near} NEAR to ${r.to}`; })}
            className="cuts cd h-[52px] w-full bg-grape text-[22px] text-white disabled:opacity-40">{done ?? (busy ? 'Queuing…' : `Withdraw ${money(v)}`)}</motion.button>
        </div>
      )}
    </Sheet>
  );
}
