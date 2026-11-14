import { NextResponse } from 'next/server';

/**
 * Judge faucet (NEAR testnet only).
 * The browser makes a fresh ed25519 key and sends only the PUBLIC key here. This route opens a sub-account
 * (judge-xxxx.<parent>) of a funded testnet account RAID controls, with a little testnet NEAR for gas, then sends it test tokens:
 * 500 tUSDC for raids (owner mint on the testnet tUSDC) and, when configured, 1,000 launchpad tUSDC.
 * The private key never leaves the browser. Server keys come from env and only control testnet accounts and tokens.
 * No dependency on NEAR's public (rate-limited) account helper.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NETWORK = process.env.NEXT_PUBLIC_NEAR_NETWORK ?? 'testnet';
const RPC = process.env.NEXT_PUBLIC_RAID_RPC ?? 'https://rpc.testnet.fastnear.com';
const JUDGE_NEAR = BigInt(process.env.RAID_JUDGE_NEAR_YOCTO ?? '500000000000000000000000'); // 0.5 testnet NEAR for gas
const hits = new Map<string, number[]>();
const LIMIT = 5;
const WINDOW_MS = 60 * 60_000;

function limited(ip: string) {
  const now = Date.now();
  const v = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (v.length >= LIMIT) return true;
  v.push(now);
  hits.set(ip, v);
  return false;
}

async function accountExists(id: string) {
  const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'query', params: { request_type: 'view_account', finality: 'final', account_id: id } }) }).then((x) => x.json());
  return !r.error && !r.result?.error;
}

export async function POST(req: Request) {
  if (NETWORK !== 'testnet') return NextResponse.json({ error: 'The judge faucet runs on testnet only' }, { status: 403 });
  const signer = process.env.RAID_FAUCET_ACCOUNT;
  const signerKey = process.env.RAID_FAUCET_KEY;
  const usdc = process.env.RAID_FAUCET_USDC;
  if (!signer || !signerKey || !usdc) return NextResponse.json({ error: 'Judge faucet is not configured on this host' }, { status: 503 });
  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0]!.trim();
  if (limited(ip)) return NextResponse.json({ error: 'Too many accounts from this address. Try again in an hour.' }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { publicKey?: string };
  const pk = body.publicKey ?? '';
  if (!/^ed25519:[1-9A-HJ-NP-Za-km-z]{40,50}$/.test(pk)) return NextResponse.json({ error: 'Send an ed25519 public key' }, { status: 400 });

  const parent = process.env.RAID_JUDGE_PARENT ?? signer;
  const parentKey = process.env.RAID_JUDGE_PARENT_KEY ?? signerKey;
  const accountId = `judge-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${parent}`;

  const [{ Account }, { JsonRpcProvider }, { KeyPairSigner }] = await Promise.all([import('@near-js/accounts'), import('@near-js/providers'), import('@near-js/signers')]);
  const txs: Record<string, string | undefined> = {};
  const hash = (o: unknown) => (o as { transaction_outcome?: { id: string } })?.transaction_outcome?.id;
  // createAccount on the parent: CreateAccount + Transfer + AddKey(full access, the browser's public key) in one tx.
  for (let i = 0; ; i++) {
    try {
      const p = new Account(parent, new JsonRpcProvider({ url: RPC }), KeyPairSigner.fromSecretKey(parentKey as `ed25519:${string}`));
      txs.create = hash(await p.createAccount(accountId, pk, JUDGE_NEAR));
      break;
    } catch (e) {
      if (i < 3 && /nonce/i.test((e as Error).message)) { await new Promise((r) => setTimeout(r, 1500 + i * 1000)); continue; }
      if (await accountExists(accountId)) break;
      return NextResponse.json({ error: `Could not open the testnet account: ${(e as Error).message.slice(0, 160)}` }, { status: 502 });
    }
  }
  for (let i = 0; i < 10 && !(await accountExists(accountId)); i++) await new Promise((r) => setTimeout(r, 1000));
  // A fresh Account per call and a short retry: several judges can share this signer, so nonces can collide.
  const send = async (contractId: string, methodName: string, args: Record<string, unknown>) => {
    for (let i = 0; ; i++) {
      try {
        const acct = new Account(signer, new JsonRpcProvider({ url: RPC }), KeyPairSigner.fromSecretKey(signerKey as `ed25519:${string}`));
        return hash(await acct.callFunctionRaw({ contractId, methodName, args, gas: BigInt(30e12), deposit: BigInt(0) }));
      } catch (e) {
        if (i >= 3 || !/nonce/i.test((e as Error).message)) throw e;
        await new Promise((r) => setTimeout(r, 1500 + i * 1000));
      }
    }
  };
  try {
    txs.usdc = await send(usdc, 'mint', { account_id: accountId, amount: '500000000' });
    const launchUsdc = process.env.RAID_FAUCET_LAUNCH_USDC;
    if (launchUsdc) txs.launchUsdc = await send(launchUsdc, 'faucet', { account_id: accountId });
  } catch (e) {
    return NextResponse.json({ accountId, warning: `Account made, token top-up failed: ${(e as Error).message.slice(0, 160)}`, txs });
  }
  return NextResponse.json({ accountId, txs });
}
