/**
 * Memecoins RAID can trade today: every entry is on the NEAR Intents (1Click) token list, so the war chest can
 * actually buy it. `dex` is the DexScreener chain id, `gecko` the GeckoTerminal network id.
 */
export type ChainKey = 'eth' | 'sol' | 'base' | 'near' | 'doge';
export interface Coin { symbol: string; decimals: number; name: string; chain: ChainKey; address: string; assetId: string; coingecko?: string }

export const CHAINS: Record<ChainKey, { label: string; dex?: string; gecko?: string; color: string }> = {
  eth: { label: 'Ethereum', dex: 'ethereum', gecko: 'eth', color: '#8ea2ff' },
  sol: { label: 'Solana', dex: 'solana', gecko: 'solana', color: '#14f195' },
  base: { label: 'Base', dex: 'base', gecko: 'base', color: '#3a7bff' },
  near: { label: 'NEAR', dex: 'near', gecko: 'near', color: '#ffffff' },
  doge: { label: 'Dogecoin', color: '#e1b303' },
};

export const COINS: Coin[] = [
  { symbol: 'PEPE', decimals: 18, name: 'Pepe', chain: 'eth', address: '0x6982508145454ce325ddbe47a25d4ec3d2311933', assetId: 'nep141:eth-0x6982508145454ce325ddbe47a25d4ec3d2311933.omft.near' },
  { symbol: 'DOGE', decimals: 8, name: 'Dogecoin', chain: 'doge', address: 'doge', assetId: 'nep141:doge.omft.near', coingecko: 'dogecoin' },
  { symbol: 'TRUMP', decimals: 6, name: 'Official Trump', chain: 'sol', address: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN', assetId: 'nep141:sol-c58e6539c2f2e097c251f8edf11f9c03e581f8d4.omft.near' },
  { symbol: 'BRETT', decimals: 18, name: 'Brett', chain: 'base', address: '0x532f27101965dd16442e59d40670faf5ebb142e4', assetId: 'nep141:base-0x532f27101965dd16442e59d40670faf5ebb142e4.omft.near' },
  { symbol: 'SHITZU', decimals: 18, name: 'Shitzu', chain: 'near', address: 'token.0xshitzu.near', assetId: 'nep141:token.0xshitzu.near' },
  { symbol: 'BLACKDRAGON', decimals: 24, name: 'Black Dragon', chain: 'near', address: 'blackdragon.tkn.near', assetId: 'nep141:blackdragon.tkn.near' },
  { symbol: 'PENGU', decimals: 6, name: 'Pudgy Penguins', chain: 'sol', address: '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv', assetId: 'nep141:sol-0xaad74c68eecfc9f8c5bdcea614f6167048c795ef.omdep.near' },
  { symbol: 'SHIB', decimals: 18, name: 'Shiba Inu', chain: 'eth', address: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', assetId: 'nep141:eth-0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce.omft.near' },
  { symbol: 'SPX', decimals: 8, name: 'SPX6900', chain: 'eth', address: '0xe0f63a424a4439cbe457d80e4f4b51ad25b2c56c', assetId: 'nep141:eth-0xe0f63a424a4439cbe457d80e4f4b51ad25b2c56c.omft.near' },
  { symbol: 'MOG', decimals: 18, name: 'Mog Coin', chain: 'eth', address: '0xaaee1a9723aadb7afa2810263653a34ba2c21c7a', assetId: 'nep141:eth-0xaaee1a9723aadb7afa2810263653a34ba2c21c7a.omft.near' },
  { symbol: 'TURBO', decimals: 18, name: 'Turbo', chain: 'eth', address: '0xa35923162c49cf95e6bf26623385eb431ad920d3', assetId: 'nep141:eth-0xa35923162c49cf95e6bf26623385eb431ad920d3.omft.near' },
];

export const coinByAsset = (assetId: string) => COINS.find((c) => c.assetId === assetId);
export const coinBySymbol = (s: string) => COINS.find((c) => c.symbol.toLowerCase() === s.toLowerCase());

/** Live market snapshot for one coin, merged from DexScreener (DEX coins) or CoinGecko (DOGE). */
export interface Quote {
  symbol: string; chain: ChainKey; priceUsd: number; change24h: number | null; change1h: number | null; volume24h: number | null; liquidityUsd: number | null;
  marketCap: number | null; image: string | null; pool: string | null; dexId: string | null; url: string | null; source: 'dexscreener' | 'coingecko';
}
export interface Candle { t: number; o: number; h: number; l: number; c: number; v: number }
export interface Trade { id: string; t: number; kind: 'buy' | 'sell'; usd: number; amount: number; from: string; tx: string; symbol: string; chain: ChainKey }
export interface Launch { id: number; name: string; symbol: string; owner: string; image: string | null; description: string | null; raised: number; softCap: number; hardCap: number; endsAt: number; createdAt: number; stakers: number; finalized: boolean; url: string }
export interface ChestTx { hash: string; t: number; method: string; signer: string; receiver: string; ok: boolean }

export const explorerTx = (hash: string, net: 'testnet' | 'mainnet' = 'testnet') => `https://${net === 'testnet' ? 'testnet.' : ''}nearblocks.io/txns/${hash}`;
export const explorerAccount = (a: string, net: 'testnet' | 'mainnet' = 'testnet') => `https://${net === 'testnet' ? 'testnet.' : ''}nearblocks.io/address/${a}`;
