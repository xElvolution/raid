'use client';
import { useState } from 'react';
import { Check, KeyRound, Loader2, ShieldCheck, X } from 'lucide-react';
import { backIntentPayload, connectKeyless, hasWallet, signBackIntent, walletInstallUrl, type KeylessKind, type KeylessWallet, type SignedIntent, type VerifyResult } from '@/lib/keyless';
import { shortAddr } from '@/lib/market';

export const MAINNET_CHEST = process.env.NEXT_PUBLIC_RAID_MAINNET_CHEST ?? '';
const LABEL: Record<KeylessKind, string> = { phantom: 'Phantom', metamask: 'MetaMask' };

function PhantomGlyph() { return <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden><rect width="24" height="24" rx="7" fill="#ab9ff2" /><path d="M6 15.6c1.6 0 2.8-1.4 3.5-2.5-.1.3-.1.6-.1.9 0 .8.5 1.4 1.4 1.4 1.3 0 2.6-1.1 3.3-2.3 0 .2-.1.4-.1.5 0 .6.3 1 1 1 2 0 4-3.6 4-6.2C19 6.2 17 5 14.1 5 8.7 5 4 9.8 4 13.5c0 1.2.6 2.1 2 2.1Z" fill="#fff" /></svg>; }
function FoxGlyph() { return <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden><rect width="24" height="24" rx="7" fill="#f6851b" /><path d="m18 6-5 3.6.9-2.2L18 6ZM6 6l5 3.7-.9-2.3L6 6Zm10.2 8.6-1.3 2 2.8.8.8-2.8h-2.3Zm-10.7 0 .8 2.8 2.8-.8-1.3-2H5.5Zm3.4-3.4-.8 1.2 2.8.1-.1-3-1.9 1.7Zm6.2 0-2-1.7-.1 3 2.8-.1-.7-1.2Z" fill="#fff" /></svg>; }

/** Connect row: picks the wallet whose key will own the stake. */
export function KeylessConnect({ wallet, onWallet }: { wallet: KeylessWallet | null; onWallet: (w: KeylessWallet | null) => void }) {
  const [busy, setBusy] = useState<KeylessKind | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function go(k: KeylessKind) {
    setErr(null);
    if (!hasWallet(k)) { window.open(walletInstallUrl(k), '_blank', 'noopener'); setErr(`${LABEL[k]} isn’t installed in this browser.`); return; }
    setBusy(k);
    try { onWallet(await connectKeyless(k)); } catch (e) { setErr((e as Error).message.slice(0, 120)); } finally { setBusy(null); }
  }
  if (wallet) return (
    <div className="mt-3 flex items-center gap-2 rounded-[11px] bg-raised p-2 pl-2.5">
      {wallet.kind === 'phantom' ? <PhantomGlyph /> : <FoxGlyph />}
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[12px] font-semibold">{LABEL[wallet.kind]} · <span className="mono">{shortAddr(wallet.address)}</span></p>
        <p className="truncate mono text-[10.5px] text-mute">stake account {shortAddr(wallet.account)}</p>
      </div>
      <button onClick={() => onWallet(null)} aria-label="Disconnect" className="press grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-mute hover:text-ink"><X size={15} /></button>
    </div>
  );
  return (
    <div className="mt-3">
      <p className="text-[12px] text-mute leading-snug">No NEAR account needed: your wallet key owns the stake.</p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {(['phantom', 'metamask'] as const).map((k) => (
          <button key={k} onClick={() => void go(k)} disabled={!!busy} className="press flex h-10 items-center justify-center gap-2 rounded-[10px] hairline text-[12.5px] font-semibold hover:bg-raised disabled:opacity-60">
            {busy === k ? <Loader2 size={15} className="animate-spin" /> : k === 'phantom' ? <PhantomGlyph /> : <FoxGlyph />}{LABEL[k]}
          </button>
        ))}
      </div>
      {err && <p className="mt-1.5 text-[11.5px] text-down">{err}</p>}
    </div>
  );
}

/** Second way in: USDC already inside NEAR Intents moves to the chest with one wallet-signed ft_withdraw intent. */
export function KeylessSign({ wallet, raidId, usdc }: { wallet: KeylessWallet; raidId: number; usdc: number }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ signed: SignedIntent; v: VerifyResult } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const amount = Math.max(0.1, Math.round((usdc || 5) * 100) / 100);
  async function sign() {
    setBusy(true); setErr(null); setRes(null);
    try {
      const s = await (await fetch('/api/keyless/salt')).json();
      if (!s.salt) throw new Error('Could not read the intents.near salt');
      const payload = backIntentPayload({ signer: wallet.account, chest: MAINNET_CHEST || 'intents.near', raidId, amountRaw: String(Math.round(amount * 1e6)), saltHex: s.salt });
      const signed = await signBackIntent(wallet, payload);
      const r = await fetch('/api/keyless/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signed, chest: MAINNET_CHEST || undefined }) });
      const v = await r.json();
      if (!r.ok) throw new Error(v.detail ?? v.error);
      setRes({ signed, v });
    } catch (e) { setErr((e as Error).message.slice(0, 140)); } finally { setBusy(false); }
  }
  const ok = res?.v.verifier.status === 'signature_ok_no_balance' || res?.v.verifier.status === 'executes';
  return (
    <div className="mt-3 rounded-[12px] hairline p-2.5 md:p-3">
      <div className="flex items-start gap-2">
        <KeyRound size={15} className="mt-0.5 shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold">Already hold USDC in NEAR Intents?</p>
          <p className="mt-0.5 text-[11.5px] text-mute leading-snug">Sign one intent in {LABEL[wallet.kind]}: {amount.toFixed(2)} USDC goes to the chest for raid #{raidId}, credited to {shortAddr(wallet.account)}. No gas, no NEAR account.</p>
        </div>
      </div>
      <button onClick={() => void sign()} disabled={busy} className="press mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-ink text-[12.5px] font-semibold text-bg disabled:opacity-60">
        {busy ? <><Loader2 size={15} className="animate-spin" />Waiting for {LABEL[wallet.kind]}…</> : <>Sign back intent ({wallet.kind === 'metamask' ? 'ERC-191' : 'Ed25519'})</>}
      </button>
      {err && <p className="mt-1.5 text-[11.5px] text-down">{err}</p>}
      {res && (
        <ul className="mt-2.5 grid gap-1.5 text-[11.5px] leading-snug">
          <li className="flex gap-1.5">{res.v.local.ok ? <Check size={14} className="mt-[1px] shrink-0 text-up" /> : <X size={14} className="mt-[1px] shrink-0 text-down" />}<span className="min-w-0 [overflow-wrap:anywhere]">{res.v.local.ok ? <>Signed by <span className="mono">{shortAddr(res.v.intent.signer)}</span>, checked on our server ({res.signed.standard === 'erc191' ? 'ERC-191 recovery' : 'Ed25519'})</> : res.v.local.detail}</span></li>
          <li className="flex gap-1.5">{ok ? <ShieldCheck size={14} className="mt-[1px] shrink-0 text-up" /> : <X size={14} className="mt-[1px] shrink-0 text-down" />}<span className="min-w-0 [overflow-wrap:anywhere]"><b className="font-semibold">intents.near</b> <span className="mono text-[10.5px] text-mute">mainnet · simulate_intents</span><br />{res.v.verifier.status === 'signature_ok_no_balance' ? 'Signature accepted for this account. It holds no USDC in NEAR Intents yet, so nothing would move.' : res.v.verifier.detail}</span></li>
          <li className="flex gap-1.5 text-mute"><span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-faint" /><span className="min-w-0">{res.v.live ? 'Live: a relayer submits it with execute_intents.' : res.v.reason}</span></li>
        </ul>
      )}
    </div>
  );
}
