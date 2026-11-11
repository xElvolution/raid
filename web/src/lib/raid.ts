/** RAID war chest client: reads the chest contract over NEAR JSON-RPC (no backend in between). */
import { coinByAsset } from './coins';

export const NETWORK = (process.env.NEXT_PUBLIC_NEAR_NETWORK ?? 'testnet') as 'testnet' | 'mainnet';
export const CHEST_ID = process.env.NEXT_PUBLIC_RAID_CHEST ?? 'raid-chest-mwab3vnk.testnet';
const RPC = process.env.NEXT_PUBLIC_RAID_RPC ?? (NETWORK === 'mainnet' ? 'https://rpc.mainnet.fastnear.com' : 'https://rpc.testnet.fastnear.com');

export type RaidStatus = 'Open' | 'Buying' | 'Held' | 'Selling' | 'Closed';
export interface Raid {
  id: number; caller: string; title: string; target: string; target_x_bps: number;
  opens_until_ms: number; buy_after_ms?: number; retreat_at_ms: number; pot: string; entry_cost: string; held: string; proceeds: string;
  pending_min_out: string; pending_deadline_ms: number; status: RaidStatus; hit: boolean;
  buy_quote_hash: string | null; sell_quote_hash: string | null;
  caller_cut?: string; buyback?: string; for_backers?: string;
}
export interface ChestConfig {
  usdc: string; intents: string; mpc: string; caller_fee_bps: number; buyback_bps: number; min_back: string;
  max_back?: string; max_pot?: string; min_open_minutes?: number; buy_delay_minutes?: number;
}

/**
 * What a backer gets back if the chest sells exactly at the line, after the caller fee and the buyback
 * (both are shares of PROFIT, taken only on a hit). Mirrors `payout_at_line` in contracts/raid-chest/src/rules.rs.
 */
export function payoutAtLine(stake: number, targetXBps: number, callerFeeBps: number, buybackBps: number) {
  const gross = stake * targetXBps / 1e4;
  const profit = Math.max(0, gross - stake);
  const fees = profit * (callerFeeBps + buybackBps) / 1e4;
  const payout = gross - fees;
  return { payout, gain: payout - stake, gainPct: stake ? ((payout - stake) / stake) * 100 : 0, callerFee: profit * callerFeeBps / 1e4, buyback: profit * buybackBps / 1e4 };
}
export const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(n % 1 === 0 ? 0 : 1)}%`;

export async function view<T>(method: string, args: object = {}, contract = CHEST_ID): Promise<T> {
  const r = await fetch(RPC, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'raid', method: 'query', params: { request_type: 'call_function', finality: 'optimistic', account_id: contract, method_name: method, args_base64: btoa(JSON.stringify(args)) } }),
  });
  const j = await r.json();
  if (j.error || j.result?.error) throw new Error(j.error?.message ?? j.result.error);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(j.result.result))) as T;
}

export const raidApi = {
  list: (from = 0, limit = 100) => view<Raid[]>('list_raids', { from, limit }),
  get: (id: number) => view<Raid | null>('get_raid', { id }),
  config: () => view<ChestConfig>('get_config'),
  mpc: () => view<{ public_key: string | null; registered: boolean }>('get_mpc'),
  stake: (id: number, account_id: string) => view<string>('get_stake', { id, account_id }),
  buyback: () => view<string>('get_buyback_bucket'),
};

export const USDC_DECIMALS = 6;
export const usdcOf = (raw: string | number) => Number(raw) / 10 ** USDC_DECIMALS;
export const xLabel = (bps: number) => `${(bps / 10000).toFixed(bps % 10000 === 0 ? 0 : 1)}x`;

export function target(r: Pick<Raid, 'target'>) {
  const c = coinByAsset(r.target);
  return c ? { symbol: c.symbol, chain: c.chain, name: c.name, known: true } : { symbol: r.target.replace(/^nep\d+:/, '').split(/[.-]/)[0]!.slice(0, 8).toUpperCase(), chain: 'near' as const, name: r.target, known: false };
}

/** Where a raid is in its life, in product words. */
export function phase(r: Raid, now = Date.now()) {
  if (r.status === 'Open' && now < r.opens_until_ms) return { key: 'crew', label: 'Crew forming', live: true, tone: 'lime' as const };
  if (r.status === 'Open' && r.buy_after_ms && now < r.buy_after_ms) return { key: 'countdown', label: 'Public countdown', live: true, tone: 'brand' as const };
  if (r.status === 'Open') return { key: 'boarding', label: 'Awaiting buy', live: false, tone: 'brand' as const };
  if (r.status === 'Buying') return { key: 'buying', label: 'Boarding', live: true, tone: 'brand' as const };
  if (r.status === 'Held') return { key: 'held', label: 'Riding to the line', live: true, tone: 'brand' as const };
  if (r.status === 'Selling') return { key: 'selling', label: 'Cashing out', live: true, tone: 'lime' as const };
  return r.hit ? { key: 'hit', label: 'Line hit', live: false, tone: 'lime' as const } : { key: 'retreat', label: 'Retreated', live: false, tone: 'ghost' as const };
}

/** The 5 steps every raid walks through; index of the current one. */
export const STEPS = ['Called', 'Crew', 'Bought', 'At the line', 'Settled'] as const;
export function stepIndex(r: Raid) {
  if (r.status === 'Closed') return 4;
  if (r.status === 'Selling') return 3;
  if (r.status === 'Held') return 2;
  if (r.status === 'Buying') return 2;
  return 1;
}

/** Live multiple of a held trophy = held amount x live price / entry cost (needs the coin's decimals). */
export function liveMultiple(r: Raid, priceUsd: number | undefined, decimals: number | undefined) {
  if (!priceUsd || !decimals || r.status !== 'Held' || Number(r.entry_cost) === 0) return null;
  return (Number(r.held) / 10 ** decimals) * priceUsd / usdcOf(r.entry_cost);
}

/** Wallet-ready calls. Amounts in raw units. */
export const tx = {
  callRaid: (a: { title: string; target: string; target_x_bps: number; open_minutes: number; retreat_hours: number }) => ({ receiverId: CHEST_ID, method: 'call_raid', args: a, deposit: '0', gas: '30000000000000' }),
  back: (usdc: string, id: number, amountRaw: string) => ({ receiverId: usdc, method: 'ft_transfer_call', args: { receiver_id: CHEST_ID, amount: amountRaw, msg: JSON.stringify({ back: id }) }, deposit: '1', gas: '150000000000000' }),
};
/** Launchpad (bonding-curve coins, testnet). */
export const LAUNCHPAD_ID = process.env.NEXT_PUBLIC_RAID_LAUNCHPAD ?? 'launch.raid-chest-mwab3vnk.testnet';
export interface LaunchCoin {
  id: number; creator: string; name: string; ticker: string; description: string; image: string | null; created_ms: number;
  v_usdc: string; v_tokens: string; raised: string; sold: string; trades: number; graduated: boolean;
}
export const CURVE_SUPPLY = 800_000_000;
export const launchApi = {
  list: () => view<LaunchCoin[]>('list_coins', { from: 0, limit: 100 }, LAUNCHPAD_ID),
  get: (id: number) => view<LaunchCoin | null>('get_coin', { id }, LAUNCHPAD_ID),
  quoteBuy: (id: number, usdcRaw: string) => view<string>('quote_buy', { id, usdc_in: usdcRaw }, LAUNCHPAD_ID),
  balance: (id: number, account_id: string) => view<string>('balance_of', { id, account_id }, LAUNCHPAD_ID),
};
/** Spot price in USDC per whole token (both reserves have 6 decimals). */
export const coinPrice = (c: Pick<LaunchCoin, 'v_usdc' | 'v_tokens'>) => Number(c.v_usdc) / Number(c.v_tokens);
export const coinMcap = (c: LaunchCoin) => coinPrice(c) * 1_000_000_000;
export const curveProgress = (c: LaunchCoin) => Number(c.sold) / 1e6 / CURVE_SUPPLY;
export const launchTx = {
  create: (a: { name: string; ticker: string; description: string; image: string | null }) => ({ receiverId: LAUNCHPAD_ID, method: 'create_coin', args: a, deposit: '50000000000000000000000', gas: '30000000000000' }),
  buy: (usdc: string, id: number, amountRaw: string, minOut: string) => ({ receiverId: usdc, method: 'ft_transfer_call', args: { receiver_id: LAUNCHPAD_ID, amount: amountRaw, msg: JSON.stringify({ buy: id, min_out: minOut }) }, deposit: '1', gas: '100000000000000' }),
};

export interface WalletCall { receiverId: string; method: string; args: object; deposit: string; gas: string }
