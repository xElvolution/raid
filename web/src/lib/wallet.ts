'use client';
/** NEAR wallet (Meteor, MyNearWallet) via wallet-selector. Used to call and back raids on the chest contract. */
import { useSyncExternalStore } from 'react';
import { CHEST_ID, NETWORK, RPC, type WalletCall } from './raid';

type Sel = Awaited<ReturnType<typeof import('@near-wallet-selector/core').setupWalletSelector>>;
let selP: Promise<Sel> | null = null;
let account: string | null = null;
let walletAccount: string | null = null;

/** Judge mode (testnet only): a testnet account signs in-browser. `createJudgeAccount` makes a fresh key in this
 *  browser and asks /api/judge-faucet to open a funded testnet account for its public key. The private key lives
 *  only in this browser's localStorage; it is never in the app bundle or sent to any server. */
const JUDGE_KEY = 'raid.judge';
type Judge = { accountId: string; key: string };
function judge(): Judge | null {
  if (typeof localStorage === 'undefined' || NETWORK !== 'testnet') return null;
  try { const j = JSON.parse(localStorage.getItem(JUDGE_KEY) ?? 'null') as Judge | null; return j?.accountId && j.key?.startsWith('ed25519:') ? j : null; } catch { return null; }
}
const syncAccount = () => { account = judge()?.accountId ?? walletAccount; emit(); };
export async function enterJudgeMode(accountId: string, key: string): Promise<void> {
  if (NETWORK !== 'testnet') throw new Error('Judge mode is testnet only');
  const k = key.trim();
  if (!/^ed25519:[1-9A-HJ-NP-Za-km-z]{60,100}$/.test(k)) throw new Error('That is not an ed25519 key');
  const { KeyPairSigner } = await import('@near-js/signers');
  const pub = (await KeyPairSigner.fromSecretKey(k as `ed25519:${string}`).getPublicKey()).toString();
  const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'query', params: { request_type: 'view_access_key', finality: 'final', account_id: accountId, public_key: pub } }) }).then((x) => x.json());
  if (r.error || r.result?.error) throw new Error('This key does not belong to that judge account');
  localStorage.setItem(JUDGE_KEY, JSON.stringify({ accountId, key: k }));
  syncAccount();
}
/** One click: new key in this browser, new funded testnet account from the judge faucet, judge mode on. */
export async function createJudgeAccount(): Promise<{ accountId: string; warning?: string }> {
  if (NETWORK !== 'testnet') throw new Error('Judge mode is testnet only');
  const { KeyPair } = await import('@near-js/crypto');
  const kp = KeyPair.fromRandom('ed25519');
  const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/api/judge-faucet`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ publicKey: kp.getPublicKey().toString() }) });
  const j = (await r.json().catch(() => ({}))) as { accountId?: string; error?: string; warning?: string };
  if (!r.ok || !j.accountId) throw new Error(j.error ?? `Faucet answered ${r.status}`);
  localStorage.setItem(JUDGE_KEY, JSON.stringify({ accountId: j.accountId, key: kp.toString() }));
  syncAccount();
  return { accountId: j.accountId, warning: j.warning };
}
export function leaveJudgeMode() { localStorage.removeItem(JUDGE_KEY); syncAccount(); }
export const isJudgeMode = () => !!judge();
async function judgeSend(j: Judge, call: WalletCall) {
  const [{ Account }, { JsonRpcProvider }, { KeyPairSigner }] = await Promise.all([import('@near-js/accounts'), import('@near-js/providers'), import('@near-js/signers')]);
  const acct = new Account(j.accountId, new JsonRpcProvider({ url: RPC }), KeyPairSigner.fromSecretKey(j.key as `ed25519:${string}`));
  return acct.callFunctionRaw({ contractId: call.receiverId, methodName: call.method, args: call.args, gas: BigInt(call.gas), deposit: BigInt(call.deposit) });
}
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function selector(): Promise<Sel> {
  selP ??= (async () => {
    const [{ setupWalletSelector }, { setupMyNearWallet }, { setupMeteorWallet }] = await Promise.all([
      import('@near-wallet-selector/core'), import('@near-wallet-selector/my-near-wallet'), import('@near-wallet-selector/meteor-wallet'),
    ]);
    const sel = await setupWalletSelector({ network: NETWORK, modules: [setupMeteorWallet(), setupMyNearWallet()] });
    const sync = () => { walletAccount = sel.store.getState().accounts.find((a) => a.active)?.accountId ?? null; syncAccount(); };
    sel.store.observable.subscribe(sync); sync();
    return sel;
  })();
  return selP;
}

export function useAccount(): string | null {
  return useSyncExternalStore((f) => { subs.add(f); void selector().catch(() => {}); return () => subs.delete(f); }, () => judge()?.accountId ?? account, () => null);
}

export async function connect(): Promise<void> {
  const sel = await selector();
  const { setupModal } = await import('@near-wallet-selector/modal-ui');
  setupModal(sel, { contractId: CHEST_ID }).show();
}

export async function disconnect(): Promise<void> {
  if (judge()) { leaveJudgeMode(); return; } const sel = await selector(); if (sel.isSignedIn()) await (await sel.wallet()).signOut(); }

/** Signs and sends; resolves with the tx hash when the wallet reports one (judge mode always does). */
export async function send(call: WalletCall): Promise<string | undefined> {
  const j = judge();
  if (j) { const o = await judgeSend(j, call) as { transaction_outcome?: { id: string }; transaction?: { hash: string } }; return o?.transaction_outcome?.id ?? o?.transaction?.hash; }
  const sel = await selector();
  if (!sel.isSignedIn()) { await connect(); throw new Error('connect_wallet'); }
  const wallet = await sel.wallet();
  const { actionCreators } = await import('@near-wallet-selector/core');
  const o = await wallet.signAndSendTransaction({ receiverId: call.receiverId, actions: [actionCreators.functionCall(call.method, call.args, BigInt(call.gas), BigInt(call.deposit))] }) as { transaction_outcome?: { id: string }; transaction?: { hash: string } } | void;
  return o ? (o.transaction_outcome?.id ?? o.transaction?.hash) : undefined;
}

/** NEP-413 signed message (used to sign in to the RAID social API; no transaction, no gas). */
export async function signMessage(p: { message: string; recipient: string; nonceB64: string }) {
  const j = judge();
  const { Buffer } = await import('buffer');
  if (j) {
    const { KeyPairSigner } = await import('@near-js/signers');
    const m = await KeyPairSigner.fromSecretKey(j.key as `ed25519:${string}`).signNep413Message(p.message, j.accountId, p.recipient, Buffer.from(p.nonceB64, 'base64'));
    return { accountId: j.accountId, publicKey: m.publicKey.toString(), signature: Buffer.from(m.signature).toString('base64') };
  }
  const sel = await selector();
  if (!sel.isSignedIn()) { await connect(); throw new Error('connect_wallet'); }
  const wallet = await sel.wallet();
  const r = await wallet.signMessage({ message: p.message, recipient: p.recipient, nonce: Buffer.from(p.nonceB64, 'base64') });
  if (!r) throw new Error('wallet_redirect');
  return r;
}
