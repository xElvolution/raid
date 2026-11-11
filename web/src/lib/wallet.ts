'use client';
/** NEAR wallet (Meteor, MyNearWallet) via wallet-selector. Used to call and back raids on the chest contract. */
import { useSyncExternalStore } from 'react';
import { CHEST_ID, NETWORK, type WalletCall } from './raid';

type Sel = Awaited<ReturnType<typeof import('@near-wallet-selector/core').setupWalletSelector>>;
let selP: Promise<Sel> | null = null;
let account: string | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function selector(): Promise<Sel> {
  selP ??= (async () => {
    const [{ setupWalletSelector }, { setupMyNearWallet }, { setupMeteorWallet }] = await Promise.all([
      import('@near-wallet-selector/core'), import('@near-wallet-selector/my-near-wallet'), import('@near-wallet-selector/meteor-wallet'),
    ]);
    const sel = await setupWalletSelector({ network: NETWORK, modules: [setupMeteorWallet(), setupMyNearWallet()] });
    const sync = () => { account = sel.store.getState().accounts.find((a) => a.active)?.accountId ?? null; emit(); };
    sel.store.observable.subscribe(sync); sync();
    return sel;
  })();
  return selP;
}

export function useAccount(): string | null {
  return useSyncExternalStore((f) => { subs.add(f); void selector().catch(() => {}); return () => subs.delete(f); }, () => account, () => null);
}

export async function connect(): Promise<void> {
  const sel = await selector();
  const { setupModal } = await import('@near-wallet-selector/modal-ui');
  setupModal(sel, { contractId: CHEST_ID }).show();
}

export async function disconnect(): Promise<void> { const sel = await selector(); if (sel.isSignedIn()) await (await sel.wallet()).signOut(); }

export async function send(call: WalletCall): Promise<void> {
  const sel = await selector();
  if (!sel.isSignedIn()) { await connect(); throw new Error('connect_wallet'); }
  const wallet = await sel.wallet();
  const { actionCreators } = await import('@near-wallet-selector/core');
  await wallet.signAndSendTransaction({ receiverId: call.receiverId, actions: [actionCreators.functionCall(call.method, call.args, BigInt(call.gas), BigInt(call.deposit))] });
}

/** NEP-413 signed message (used to sign in to the RAID social API; no transaction, no gas). */
export async function signMessage(p: { message: string; recipient: string; nonceB64: string }) {
  const sel = await selector();
  if (!sel.isSignedIn()) { await connect(); throw new Error('connect_wallet'); }
  const wallet = await sel.wallet();
  const { Buffer } = await import('buffer');
  const r = await wallet.signMessage({ message: p.message, recipient: p.recipient, nonce: Buffer.from(p.nonceB64, 'base64') });
  if (!r) throw new Error('wallet_redirect');
  return r;
}
