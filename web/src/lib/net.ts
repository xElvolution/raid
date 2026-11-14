/**
 * Network config. One place that says which contracts the app talks to, per network, so the data layer can move to
 * new contract ids (for example the v2 raid-core, vault and season contracts) by config alone.
 * The user's choice is persisted in localStorage ('raid.network'); testnet is the default and the live network.
 */
export type Net = 'testnet' | 'mainnet';
export interface NetConfig {
  net: Net;
  label: string;
  rpc: string;
  /** War chest (v1). Null when not deployed on this network yet. */
  chest: string | null;
  /** v2 contracts, filled in when deployed. */
  core: string | null; vaults: string | null; seasons: string | null;
  usdc: string;
  intents: string;
  daoFactory: string;
  explorer: string;
  /** True when raids can be called and backed on this network. */
  live: boolean;
}
const env = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export const NETS: Record<Net, NetConfig> = {
  testnet: {
    net: 'testnet', label: 'Testnet',
    rpc: process.env.NEXT_PUBLIC_RAID_RPC ?? 'https://rpc.testnet.fastnear.com',
    chest: env(process.env.NEXT_PUBLIC_RAID_CHEST) ?? 'raid-chest-mwab3vnk.testnet',
    core: env(process.env.NEXT_PUBLIC_RAID_V2_CORE), vaults: env(process.env.NEXT_PUBLIC_RAID_V2_VAULTS), seasons: env(process.env.NEXT_PUBLIC_RAID_V2_SEASONS),
    usdc: env(process.env.NEXT_PUBLIC_RAID_TESTNET_USDC) ?? 'raidusdc-mwgr1iba.testnet',
    intents: 'intents-sim (testnet venue)',
    daoFactory: process.env.NEXT_PUBLIC_RAID_DAO_FACTORY ?? 'sputnikv2.testnet',
    explorer: 'https://testnet.nearblocks.io',
    live: true,
  },
  mainnet: {
    net: 'mainnet', label: 'Mainnet',
    rpc: process.env.NEXT_PUBLIC_RAID_MAINNET_RPC ?? 'https://rpc.mainnet.fastnear.com',
    chest: env(process.env.NEXT_PUBLIC_RAID_MAINNET_CHEST),
    core: env(process.env.NEXT_PUBLIC_RAID_MAINNET_V2_CORE), vaults: env(process.env.NEXT_PUBLIC_RAID_MAINNET_V2_VAULTS), seasons: env(process.env.NEXT_PUBLIC_RAID_MAINNET_V2_SEASONS),
    usdc: '17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1',
    intents: 'intents.near',
    daoFactory: 'sputnik-dao.near',
    explorer: 'https://nearblocks.io',
    live: !!env(process.env.NEXT_PUBLIC_RAID_MAINNET_CHEST),
  },
};

const KEY = 'raid.network';
const DEFAULT: Net = process.env.NEXT_PUBLIC_NEAR_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
export function activeNet(): Net {
  if (typeof window === 'undefined') return DEFAULT;
  try { const v = localStorage.getItem(KEY); return v === 'mainnet' || v === 'testnet' ? v : DEFAULT; } catch { return DEFAULT; }
}
/** Switch network: persisted, then reload so every read and the wallet reconnect on the new network. */
export function setNet(n: Net) { localStorage.setItem(KEY, n); location.reload(); }
export const NET = NETS[activeNet()];
