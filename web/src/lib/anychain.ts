/**
 * Any-chain backing through NEAR Intents 1Click: a backer on Solana or an EVM chain sends a native coin or USDC
 * to a 1Click deposit address; 1Click swaps it to USDC on NEAR and calls ft_transfer_call on the chest with
 * msg {"back": raidId, "for": beneficiary}, so the stake lands on the backer's account (contract: ft_on_transfer).
 *
 * 1Click runs on mainnet only (no testnet). Until a mainnet chest exists the app asks for DRY quotes:
 * real prices and fees, no deposit address, nothing can be sent. Set RAID_ANYCHAIN_LIVE=1 and
 * NEXT_PUBLIC_RAID_MAINNET_CHEST to issue live deposit addresses.
 */
export const MAINNET_USDC = 'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1';
export interface Origin { key: string; chain: 'sol' | 'eth' | 'base' | 'arb'; chainLabel: string; symbol: string; assetId: string; decimals: number; addr: 'sol' | 'evm' }
export const ORIGINS: Origin[] = [
  { key: 'sol-SOL', chain: 'sol', chainLabel: 'Solana', symbol: 'SOL', assetId: 'nep141:sol.omft.near', decimals: 9, addr: 'sol' },
  { key: 'sol-USDC', chain: 'sol', chainLabel: 'Solana', symbol: 'USDC', assetId: 'nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near', decimals: 6, addr: 'sol' },
  { key: 'base-ETH', chain: 'base', chainLabel: 'Base', symbol: 'ETH', assetId: 'nep141:base.omft.near', decimals: 18, addr: 'evm' },
  { key: 'base-USDC', chain: 'base', chainLabel: 'Base', symbol: 'USDC', assetId: 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near', decimals: 6, addr: 'evm' },
  { key: 'eth-ETH', chain: 'eth', chainLabel: 'Ethereum', symbol: 'ETH', assetId: 'nep141:eth.omft.near', decimals: 18, addr: 'evm' },
  { key: 'eth-USDC', chain: 'eth', chainLabel: 'Ethereum', symbol: 'USDC', assetId: 'nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near', decimals: 6, addr: 'evm' },
  { key: 'arb-USDC', chain: 'arb', chainLabel: 'Arbitrum', symbol: 'USDC', assetId: 'nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near', decimals: 6, addr: 'evm' },
];
export const isSolAddr = (a: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
export const isEvmAddr = (a: string) => /^0x[0-9a-fA-F]{40}$/.test(a);
export const isNearAccount = (a: string) => /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/.test(a) && a.length >= 2 && a.length <= 64;

export interface AnyQuote {
  mode: 'dry' | 'live'; origin: string; amountIn: string; amountInUsd: string | null; usdcOut: string; minUsdcOut: string;
  etaSec: number | null; depositAddress: string | null; deadline: string | null; signature: string | null; timestamp: string | null;
  msg: string; recipient: string; reason: string | null;
}
