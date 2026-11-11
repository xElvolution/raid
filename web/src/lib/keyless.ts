/**
 * Back a raid from Phantom or MetaMask, with no NEAR account.
 *
 * NEAR Intents (intents.near) accepts intents signed by non-NEAR wallets (docs: integration/verifier-contract/signing-intents):
 *  - MetaMask signs ERC-191 (`personal_sign`); the intents account is the lowercase 0x address.
 *  - Phantom signs raw Ed25519 (`signMessage`); the intents account is the hex of the 32-byte Solana address.
 * The backer's stake on the chest is credited to that intents account (`{"back": id, "for": account}`), so the same
 * wallet key that funds the back also owns the stake and, later, the payout (chest `claim_share_for` +
 * `claim_into_intents` move it into intents.near under that account, where only that key can spend it).
 *
 * Two ways in (both mainnet only, NEAR Intents has no testnet):
 *  1. Deposit: a 1Click quote deposits SOL/ETH/USDC from the wallet's own chain and calls the chest with
 *     customRecipientMsg {"back", "for": <intents account>} (see anychain.ts, /api/anychain/quote).
 *  2. Signed intent: USDC the wallet already holds inside NEAR Intents moves to the chest with one `ft_withdraw`
 *     intent (msg = {"back", "for"}), signed in the wallet. A relayer submits it with `execute_intents`.
 * On testnet we generate and verify the signature for real (locally and with intents.near `simulate_intents` on
 * mainnet, a read-only view), but nothing is submitted.
 */
import { MAINNET_USDC } from './anychain';

export type KeylessKind = 'metamask' | 'phantom';
export interface KeylessWallet { kind: KeylessKind; address: string; account: string; publicKey?: string }

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const [Z, B8, B58N, FF] = [BigInt(0), BigInt(8), BigInt(58), BigInt(255)];
export function b58encode(bytes: Uint8Array): string {
  let n = Z; for (const b of bytes) n = (n << B8) | BigInt(b);
  let s = ''; while (n > Z) { s = B58[Number(n % B58N)] + s; n /= B58N; }
  for (const b of bytes) { if (b !== 0) break; s = '1' + s; }
  return s;
}
export function b58decode(s: string): Uint8Array {
  let n = Z; for (const c of s) { const i = B58.indexOf(c); if (i < 0) throw new Error('bad base58'); n = n * B58N + BigInt(i); }
  const out: number[] = []; while (n > Z) { out.unshift(Number(n & FF)); n >>= B8; }
  for (const c of s) { if (c !== '1') break; out.unshift(0); }
  return new Uint8Array(out);
}
export const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
export const fromHex = (h: string) => new Uint8Array((h.replace(/^0x/, '').match(/../g) ?? []).map((x) => parseInt(x, 16)));

/** The NEAR Intents account a wallet controls: lowercase 0x address (EVM) or hex of the 32-byte Solana address. */
export function intentsAccount(kind: KeylessKind, address: string): string {
  if (kind === 'metamask') { if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error('bad EVM address'); return address.toLowerCase(); }
  const pk = b58decode(address); if (pk.length !== 32) throw new Error('bad Solana address'); return toHex(pk);
}

/** 32-byte nonce: 4-byte verifier salt (intents.near `current_salt`) + 28 random bytes, base64. */
export function saltedNonce(saltHex: string, rnd: Uint8Array = crypto.getRandomValues(new Uint8Array(28))): string {
  const n = new Uint8Array(32); n.set(fromHex(saltHex.padStart(8, '0')).slice(0, 4), 0); n.set(rnd.slice(0, 28), 4);
  let s = ''; for (const b of n) s += String.fromCharCode(b); return btoa(s);
}

export interface BackIntentArgs { signer: string; chest: string; raidId: number; amountRaw: string; saltHex: string; deadlineMs?: number; nonce?: string }
/** The exact JSON string the wallet signs: one ft_withdraw of USDC from the signer's intents balance into the chest. */
export function backIntentPayload(a: BackIntentArgs): string {
  const usdc = MAINNET_USDC.replace(/^nep141:/, '');
  return JSON.stringify({
    signer_id: a.signer,
    verifying_contract: 'intents.near',
    deadline: new Date(a.deadlineMs ?? Date.now() + 10 * 60_000).toISOString(),
    nonce: a.nonce ?? saltedNonce(a.saltHex),
    intents: [{ intent: 'ft_withdraw', token: usdc, receiver_id: a.chest, amount: a.amountRaw, msg: JSON.stringify({ back: a.raidId, for: a.signer }) }],
  });
}

export type SignedIntent =
  | { standard: 'erc191'; payload: string; signature: string }
  | { standard: 'raw_ed25519'; payload: string; public_key: string; signature: string };

/** 65-byte r||s||v from personal_sign with v normalised to {0,1}, as intents.near expects. */
export function erc191Signature(hexSig: string): string {
  const b = fromHex(hexSig); if (b.length !== 65) throw new Error('bad signature length');
  if (b[64]! >= 27) b[64] = b[64]! - 27;
  return `secp256k1:${b58encode(b)}`;
}

/** What a payload asks for, decoded for display and for server-side checks. */
export function readBackIntent(payload: string) {
  const p = JSON.parse(payload) as { signer_id: string; verifying_contract: string; deadline: string; nonce: string; intents: { intent: string; token?: string; receiver_id?: string; amount?: string; msg?: string }[] };
  const i = p.intents?.[0];
  const msg = i?.msg ? JSON.parse(i.msg) as { back?: number; for?: string } : {};
  return { signer: p.signer_id, verifier: p.verifying_contract, deadline: p.deadline, nonce: p.nonce, intent: i?.intent, token: i?.token, chest: i?.receiver_id, amountRaw: i?.amount, raidId: msg.back, for: msg.for, count: p.intents?.length ?? 0 };
}

// ---------- browser wallets ----------
interface Eip1193 { request(a: { method: string; params?: unknown[] }): Promise<unknown>; isMetaMask?: boolean }
interface PhantomSol { isPhantom?: boolean; connect(): Promise<{ publicKey: { toString(): string } }>; signMessage(m: Uint8Array, enc?: string): Promise<{ signature: Uint8Array; publicKey?: { toString(): string } }>; disconnect?(): Promise<void> }
type W = Window & { ethereum?: Eip1193; phantom?: { solana?: PhantomSol }; solana?: PhantomSol };
export const hasWallet = (k: KeylessKind) => typeof window !== 'undefined' && (k === 'metamask' ? !!(window as W).ethereum : !!((window as W).phantom?.solana ?? (window as W).solana));
export const walletInstallUrl = (k: KeylessKind) => (k === 'metamask' ? 'https://metamask.io/download/' : 'https://phantom.com/download');

export async function connectKeyless(kind: KeylessKind): Promise<KeylessWallet> {
  const w = window as W;
  if (kind === 'metamask') {
    if (!w.ethereum) throw new Error('MetaMask not found in this browser');
    const [address] = (await w.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
    if (!address) throw new Error('No account shared');
    return { kind, address, account: intentsAccount(kind, address) };
  }
  const sol = w.phantom?.solana ?? w.solana;
  if (!sol) throw new Error('Phantom not found in this browser');
  const r = await sol.connect();
  const address = r.publicKey.toString();
  return { kind, address, account: intentsAccount(kind, address), publicKey: `ed25519:${address}` };
}

export async function signBackIntent(wallet: KeylessWallet, payload: string): Promise<SignedIntent> {
  const w = window as W;
  if (wallet.kind === 'metamask') {
    const hex = '0x' + toHex(new TextEncoder().encode(payload));
    const sig = (await w.ethereum!.request({ method: 'personal_sign', params: [hex, wallet.address] })) as string;
    return { standard: 'erc191', payload, signature: erc191Signature(sig) };
  }
  const sol = (w.phantom?.solana ?? w.solana)!;
  const r = await sol.signMessage(new TextEncoder().encode(payload), 'utf8');
  return { standard: 'raw_ed25519', payload, public_key: `ed25519:${wallet.address}`, signature: `ed25519:${b58encode(r.signature)}` };
}

export interface VerifyResult {
  local: { ok: boolean; detail: string };
  verifier: { status: 'signature_ok_no_balance' | 'executes' | 'invalid_signature' | 'rejected' | 'unreachable'; detail: string; network: 'mainnet'; method: 'simulate_intents' };
  intent: ReturnType<typeof readBackIntent>;
  live: boolean; reason: string | null;
}
