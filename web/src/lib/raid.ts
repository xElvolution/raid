/** RAID chest client: reads the war-chest contract over NEAR JSON-RPC and token info from the 1Click token list. */
import { config } from './config';

export const CHEST_ID = process.env.NEXT_PUBLIC_RAID_CHEST ?? 'raid-chest-mwab3vnk.testnet';
const RPC = process.env.NEXT_PUBLIC_RAID_RPC ?? (config.networkId === 'mainnet' ? 'https://rpc.mainnet.fastnear.com' : 'https://rpc.testnet.fastnear.com');

export type RaidStatus = 'Open' | 'Buying' | 'Held' | 'Selling' | 'Closed';
export interface Raid {
  id: number; caller: string; title: string; target: string; target_x_bps: number;
  opens_until_ms: number; retreat_at_ms: number; pot: string; entry_cost: string; held: string; proceeds: string;
  pending_min_out: string; pending_deadline_ms: number; status: RaidStatus; hit: boolean;
  buy_quote_hash: string | null; sell_quote_hash: string | null;
}
export interface TokenInfo { assetId: string; symbol: string; blockchain: string; decimals: number; price: number }

async function view<T>(method: string, args: object = {}, contract = CHEST_ID): Promise<T> {
  const r = await fetch(RPC, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'raid', method: 'query', params: { request_type: 'call_function', finality: 'optimistic', account_id: contract, method_name: method, args_base64: btoa(JSON.stringify(args)) } }),
  });
  const j = await r.json();
  if (j.error || j.result?.error) throw new Error(j.error?.message ?? j.result.error);
  return JSON.parse(new TextDecoder().decode(new Uint8Array(j.result.result))) as T;
}

export const raidApi = {
  list: (from = 0, limit = 50) => view<Raid[]>('list_raids', { from, limit }),
  get: (id: number) => view<Raid | null>('get_raid', { id }),
  config: () => view<{ usdc: string; intents: string; caller_fee_bps: number; buyback_bps: number }>('get_config'),
  mpc: () => view<{ public_key: string | null; registered: boolean }>('get_mpc'),
};

/** Built-in fallback so cards render even if the token list is unreachable. Prices come only from the live list. */
const KNOWN: Record<string, { symbol: string; blockchain: string; decimals: number }> = {
  'nep141:eth-0x6982508145454ce325ddbe47a25d4ec3d2311933.omft.near': { symbol: 'PEPE', blockchain: 'eth', decimals: 18 },
  'nep141:doge.omft.near': { symbol: 'DOGE', blockchain: 'doge', decimals: 8 },
  'nep141:sol-c58e6539c2f2e097c251f8edf11f9c03e581f8d4.omft.near': { symbol: 'TRUMP', blockchain: 'sol', decimals: 6 },
  'nep141:blackdragon.tkn.near': { symbol: 'BLACKDRAGON', blockchain: 'near', decimals: 24 },
  'nep141:token.0xshitzu.near': { symbol: 'SHITZU', blockchain: 'near', decimals: 18 },
};

let tokenCache: Promise<Record<string, TokenInfo>> | null = null;
export function tokens(): Promise<Record<string, TokenInfo>> {
  tokenCache ??= fetch('https://1click.chaindefuser.com/v0/tokens')
    .then((r) => r.json())
    .then((list: TokenInfo[]) => Object.fromEntries(list.map((t) => [t.assetId, t])))
    .catch(() => ({}));
  return tokenCache;
}
export function tokenLabel(assetId: string, list: Record<string, TokenInfo> = {}) {
  const t = list[assetId] ?? KNOWN[assetId];
  return t ? { symbol: t.symbol, chain: t.blockchain, decimals: t.decimals, price: 'price' in t ? (t as TokenInfo).price : undefined } : { symbol: assetId.replace(/^nep\d+:/, '').slice(0, 10), chain: '?', decimals: 0, price: undefined };
}

export const xLabel = (bps: number) => `${bps / 10000}x`;
export const fmtUnits = (raw: string, decimals: number, dp = 2) => {
  if (!decimals) return raw;
  const n = Number(raw) / 10 ** decimals;
  return n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : n.toFixed(dp);
};
export const STATUS_COPY: Record<RaidStatus, string> = {
  Open: 'Crew forming', Buying: 'Boarding', Held: 'Trophy on the wall', Selling: 'Cashing out', Closed: 'Raid over',
};
