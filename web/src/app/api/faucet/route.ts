import { NextResponse } from 'next/server';

/**
 * Test funds faucet (NEAR testnet only). Two modes:
 *  - { publicKey }: open a new testnet account `u-xxxx.<parent>` for a key made in the browser (the private key
 *    never leaves it), with test NEAR for gas, then send 500 test USDC.
 *  - { accountId }: top up an existing testnet account with test NEAR and 500 test USDC, once a day.
 * Server keys come from env and only control testnet accounts and tokens.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NETWORK = process.env.NEXT_PUBLIC_NEAR_NETWORK ?? 'testnet';
const RPC = process.env.NEXT_PUBLIC_RAID_RPC ?? 'https://rpc.testnet.fastnear.com';
const NEAR_NEW = BigInt(process.env.RAID_FAUCET_NEAR_YOCTO ?? '500000000000000000000000'); // 0.5 test NEAR
const NEAR_TOPUP = BigInt(process.env.RAID_FAUCET_TOPUP_YOCTO ?? '300000000000000000000000'); // 0.3 test NEAR
const USDC_AMOUNT = '500000000';
const DAY = 24 * 3600_000;
const hits = new Map<string, number[]>();
const claims = new Map<string, number>();

function limited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const v = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (v.length >= max) return true;
  v.push(now); hits.set(key, v); return false;
}
async function rpc(params: object) {
  return fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'query', params }) }).then((x) => x.json());
}
async function accountExists(id: string) { const r = await rpc({ request_type: 'view_account', finality: 'final', account_id: id }); return !r.error && !r.result?.error; }
async function usdcBalance(usdc: string, id: string) {
  const r = await rpc({ request_type: 'call_function', finality: 'final', account_id: usdc, method_name: 'ft_balance_of', args_base64: Buffer.from(JSON.stringify({ account_id: id })).toString('base64') });
  return r.result?.result ? Number(JSON.parse(Buffer.from(r.result.result).toString())) / 1e6 : 0;
}

export async function POST(req: Request) {
  if (NETWORK !== 'testnet') return NextResponse.json({ error: 'Test funds are only on testnet' }, { status: 403 });
  const signer = process.env.RAID_FAUCET_ACCOUNT, signerKey = process.env.RAID_FAUCET_KEY, usdc = process.env.RAID_FAUCET_USDC;
  const parent = process.env.RAID_FAUCET_PARENT ?? process.env.RAID_JUDGE_PARENT ?? signer;
  const parentKey = process.env.RAID_FAUCET_PARENT_KEY ?? process.env.RAID_JUDGE_PARENT_KEY ?? signerKey;
  if (!signer || !signerKey || !usdc || !parent || !parentKey) return NextResponse.json({ error: 'The faucet is not set up on this server' }, { status: 503 });
  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0]!.trim();
  const body = (await req.json().catch(() => ({}))) as { publicKey?: string; accountId?: string };

  const [{ Account }, { JsonRpcProvider }, { KeyPairSigner }] = await Promise.all([import('@near-js/accounts'), import('@near-js/providers'), import('@near-js/signers')]);
  const hash = (o: unknown) => (o as { transaction_outcome?: { id: string } })?.transaction_outcome?.id;
  const as = (id: string, key: string) => new Account(id, new JsonRpcProvider({ url: RPC }), KeyPairSigner.fromSecretKey(key as `ed25519:${string}`));
  const retry = async <T,>(f: () => Promise<T>): Promise<T> => {
    for (let i = 0; ; i++) {
      try { return await f(); } catch (e) { if (i >= 3 || !/nonce/i.test((e as Error).message)) throw e; await new Promise((r) => setTimeout(r, 1500 + i * 1000)); }
    }
  };
  const mint = (to: string) => retry(async () => hash(await as(signer, signerKey).callFunctionRaw({ contractId: usdc, methodName: 'mint', args: { account_id: to, amount: USDC_AMOUNT }, gas: BigInt(30e12), deposit: BigInt(0) })));
  const txs: Record<string, string | undefined> = {};

  if (body.accountId !== undefined) {
    const id = body.accountId.trim();
    if (!/^[a-z0-9._-]{2,64}\.testnet$|^[0-9a-f]{64}$/.test(id)) return NextResponse.json({ error: 'Send a testnet account id' }, { status: 400 });
    const last = claims.get(id);
    if (last && Date.now() - last < DAY) return NextResponse.json({ error: 'Already claimed today. Come back tomorrow.', next_at: last + DAY }, { status: 429 });
    if (limited(`claim:${ip}`, 5, DAY)) return NextResponse.json({ error: 'Too many claims from this address today.' }, { status: 429 });
    if (!(await accountExists(id))) return NextResponse.json({ error: 'That account does not exist on testnet' }, { status: 404 });
    const have = await usdcBalance(usdc, id);
    try {
      txs.near = await retry(async () => hash(await as(parent, parentKey).transfer({ receiverId: id, amount: NEAR_TOPUP })));
      if (have < 100) txs.usdc = await mint(id);
    } catch (e) { return NextResponse.json({ error: `Faucet send failed: ${(e as Error).message.slice(0, 160)}`, txs }, { status: 502 }); }
    claims.set(id, Date.now());
    return NextResponse.json({ accountId: id, near: (Number(NEAR_TOPUP) / 1e24).toString(), usdc: txs.usdc ? '500' : '0', note: txs.usdc ? undefined : `You already hold ${have.toFixed(0)} test USDC, so only test NEAR was sent.`, txs, next_at: Date.now() + DAY });
  }

  if (limited(`new:${ip}`, 5, 3600_000)) return NextResponse.json({ error: 'Too many new accounts from this address. Try again in an hour.' }, { status: 429 });
  const pk = body.publicKey ?? '';
  if (!/^ed25519:[1-9A-HJ-NP-Za-km-z]{40,50}$/.test(pk)) return NextResponse.json({ error: 'Send an ed25519 public key' }, { status: 400 });
  const accountId = `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${parent}`;
  try { txs.create = await retry(async () => hash(await as(parent, parentKey).createAccount(accountId, pk, NEAR_NEW))); }
  catch (e) { if (!(await accountExists(accountId))) return NextResponse.json({ error: `Could not open the testnet account: ${(e as Error).message.slice(0, 160)}` }, { status: 502 }); }
  for (let i = 0; i < 10 && !(await accountExists(accountId)); i++) await new Promise((r) => setTimeout(r, 1000));
  try { txs.usdc = await mint(accountId); } catch (e) { return NextResponse.json({ accountId, warning: `Account opened, test USDC failed: ${(e as Error).message.slice(0, 160)}`, txs }); }
  claims.set(accountId, Date.now());
  return NextResponse.json({ accountId, txs });
}
