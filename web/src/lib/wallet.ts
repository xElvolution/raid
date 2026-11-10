'use client';
/**
 * NEAR wallet sign-in with NEP-413 signMessage. Wallets either return the signature
 * inline (Meteor) or redirect back with it in the URL hash (MyNearWallet).
 */
import type { CalledClient, SignedMessage } from '@called/sdk';
import { Buffer } from 'buffer';
import { config } from './config';

const PENDING = 'called.pendingSignIn';

async function selector() {
  const [{ setupWalletSelector }, { setupModal }, { setupMyNearWallet }, { setupMeteorWallet }] = await Promise.all([
    import('@near-wallet-selector/core'),
    import('@near-wallet-selector/modal-ui'),
    import('@near-wallet-selector/my-near-wallet'),
    import('@near-wallet-selector/meteor-wallet'),
  ]);
  const sel = await setupWalletSelector({ network: config.networkId, modules: [setupMeteorWallet(), setupMyNearWallet()] });
  return { sel, setupModal };
}

export async function startSignIn(api: CalledClient, onSigned: (s: SignedMessage) => Promise<void>): Promise<void> {
  const { nonce, recipient, message } = await api.nonce();
  window.sessionStorage.setItem(PENDING, JSON.stringify({ nonce, recipient, message }));
  const { sel, setupModal } = await selector();
  const modal = setupModal(sel, { contractId: config.contractId || recipient });
  const sub = sel.on('signedIn', async () => {
    sub.remove();
    modal.hide();
    const wallet = await sel.wallet();
    const callbackUrl = `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/signin`;
    const r = await wallet.signMessage?.({ message, recipient, nonce: Buffer.from(nonce, 'base64'), callbackUrl });
    if (r) await onSigned({ accountId: r.accountId, publicKey: r.publicKey, signature: r.signature, message, nonce, recipient });
  });
  modal.show();
}

/** Complete a redirect-based signMessage (hash: accountId, publicKey, signature). */
export function readRedirectSignIn(): SignedMessage | null {
  const raw = window.sessionStorage.getItem(PENDING);
  const h = new URLSearchParams(window.location.hash.slice(1));
  const accountId = h.get('accountId'), publicKey = h.get('publicKey'), signature = h.get('signature');
  if (!raw || !accountId || !publicKey || !signature) return null;
  window.sessionStorage.removeItem(PENDING);
  const p = JSON.parse(raw) as { nonce: string; recipient: string; message: string };
  return { accountId, publicKey, signature, ...p };
}

/** Sign and send a wallet-ready transaction built by @called/sdk CalledContract. */
export async function sendTx(tx: import('@called/sdk').Tx): Promise<void> {
  const { sel, setupModal } = await selector();
  if (!sel.isSignedIn()) {
    setupModal(sel, { contractId: config.contractId }).show();
    throw new Error('connect_wallet');
  }
  const wallet = await sel.wallet();
  const { actionCreators } = await import('@near-wallet-selector/core');
  await wallet.signAndSendTransaction({
    receiverId: tx.receiverId,
    actions: tx.actions.map((a) => actionCreators.functionCall(a.params.methodName, a.params.args, BigInt(a.params.gas), BigInt(a.params.deposit))),
  });
}
