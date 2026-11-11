/** Server-side checks for wallet-signed back intents. Read-only: mainnet calls are free `view` queries, never transactions. */
import { createPublicKey, verify as edVerify } from 'node:crypto';
import { verifyMessage } from 'ethers';
import { MAINNET_USDC } from './anychain';
import { b58decode, readBackIntent, toHex, type SignedIntent, type VerifyResult } from './keyless';

const MAINNET_RPC = process.env.RAID_MAINNET_RPC ?? 'https://rpc.mainnet.fastnear.com';

export async function mainnetView<T>(contract: string, method: string, args: object): Promise<T> {
  const r = await fetch(MAINNET_RPC, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({ jsonrpc: '2.0', id: 'raid', method: 'query', params: { request_type: 'call_function', finality: 'final', account_id: contract, method_name: method, args_base64: Buffer.from(JSON.stringify(args)).toString('base64') } }),
  });
  const j = await r.json();
  const err = j.error?.data ?? j.error?.message ?? j.result?.error;
  if (err) throw new Error(typeof err === 'string' ? err : JSON.stringify(err));
  return JSON.parse(Buffer.from(j.result.result).toString()) as T;
}

let saltCache: { v: string; t: number } | null = null;
export async function currentSalt(): Promise<string> {
  if (saltCache && Date.now() - saltCache.t < 60_000) return saltCache.v;
  const v = await mainnetView<string>('intents.near', 'current_salt', {});
  saltCache = { v, t: Date.now() };
  return v;
}

/** Recompute who signed, without trusting the client. */
export function localVerify(s: SignedIntent): { ok: boolean; detail: string; signer?: string } {
  try {
    if (s.standard === 'erc191') {
      const b = b58decode(s.signature.replace(/^secp256k1:/, ''));
      if (b.length !== 65) return { ok: false, detail: 'signature must be 65 bytes' };
      const v = b[64]! < 27 ? b[64]! + 27 : b[64]!;
      const sig = '0x' + toHex(b.slice(0, 64)) + v.toString(16).padStart(2, '0');
      const addr = verifyMessage(s.payload, sig).toLowerCase();
      return { ok: true, detail: `ERC-191 signature recovers ${addr}`, signer: addr };
    }
    const pk = b58decode(s.public_key.replace(/^ed25519:/, ''));
    const sig = b58decode(s.signature.replace(/^ed25519:/, ''));
    if (pk.length !== 32 || sig.length !== 64) return { ok: false, detail: 'bad key or signature length' };
    const key = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(pk).toString('base64url') }, format: 'jwk' });
    const ok = edVerify(null, Buffer.from(s.payload, 'utf8'), key, Buffer.from(sig));
    return { ok, detail: ok ? `Ed25519 signature valid for ${toHex(pk)}` : 'Ed25519 signature does not match the payload', signer: toHex(pk) };
  } catch (e) { return { ok: false, detail: (e as Error).message.slice(0, 160) }; }
}

/** Full check of a signed back intent: shape, local signature, and the real verifier on mainnet (simulate_intents, a view). */
export async function verifyBackIntent(s: SignedIntent, expectChest?: string): Promise<VerifyResult> {
  const intent = readBackIntent(s.payload);
  const mainnetChest = process.env.NEXT_PUBLIC_RAID_MAINNET_CHEST ?? '';
  const live = process.env.RAID_ANYCHAIN_LIVE === '1' && !!mainnetChest;
  const reason = live ? null : 'No mainnet chest yet: NEAR Intents has no testnet, so the signed intent is verified but never submitted.';
  const shape = [
    intent.verifier === 'intents.near' || 'verifying_contract must be intents.near',
    intent.count === 1 && intent.intent === 'ft_withdraw' || 'exactly one ft_withdraw intent',
    intent.token === MAINNET_USDC.replace(/^nep141:/, '') || 'token must be USDC',
    intent.for === intent.signer || 'stake must be credited to the signer',
    !expectChest || intent.chest === expectChest || 'receiver must be the chest',
    Date.parse(intent.deadline) > Date.now() || 'deadline passed',
  ].find((x) => x !== true);
  const local = localVerify(s);
  const localRes = { ok: local.ok && local.signer === intent.signer && !shape, detail: shape ? String(shape) : local.ok && local.signer !== intent.signer ? `signed by ${local.signer}, payload says ${intent.signer}` : local.detail };
  let verifier: VerifyResult['verifier'];
  try {
    await mainnetView('intents.near', 'simulate_intents', { signed: [s] });
    verifier = { status: 'executes', detail: 'intents.near accepted the signature and the balance covers it.', network: 'mainnet', method: 'simulate_intents' };
  } catch (e) {
    const m = (e as Error).message;
    verifier = /insufficient balance/i.test(m) ? { status: 'signature_ok_no_balance', detail: 'intents.near verified the signature for this account; it holds no USDC in NEAR Intents yet (expected in the demo).', network: 'mainnet', method: 'simulate_intents' }
      : /invalid signature/i.test(m) ? { status: 'invalid_signature', detail: 'intents.near rejected the signature.', network: 'mainnet', method: 'simulate_intents' }
      : /public key .* doesn't exist for account/i.test(m) ? { status: 'invalid_signature', detail: 'The signature recovers a different key than the signer account (payload changed after signing).', network: 'mainnet', method: 'simulate_intents' }
      : /fetch failed|abort|timeout/i.test(m) ? { status: 'unreachable', detail: m.slice(0, 160), network: 'mainnet', method: 'simulate_intents' }
      : { status: 'rejected', detail: (m.match(/panic_msg: \\?"([^"\\]+)/)?.[1] ?? m).slice(0, 200), network: 'mainnet', method: 'simulate_intents' };
  }
  return { local: localRes, verifier, intent, live, reason };
}
