/**
 * Testnet community: ten testnet accounts that call, back and post on RAID (scripts/community.mjs).
 * Only public facts live here (handle, account id, a self-written bio). Every number on their profiles is read
 * from the chest contract and the social API. They are labelled "testnet account" wherever they appear.
 */
import list from './people.json';
import { crewName } from './crews';
export interface Person { handle: string; account: string | null; name: string; bio: string; crew: string; hue: number }
export const PEOPLE = list as Person[];
export const personByAccount = (a?: string | null) => (a ? PEOPLE.find((p) => p.account === a) : undefined);
export const personByHandle = (h?: string | null) => (h ? PEOPLE.find((p) => p.handle === h) : undefined);
/** Resolve a URL segment (handle or account id) to an account id. */
export const resolveAccount = (seg: string) => personByHandle(seg)?.account ?? seg;
/** Our own testnet ops accounts and faucet-made browser accounts get plain names instead of raw ids. */
function opsName(a: string): string | null {
  const m = a.match(/^u-([a-z0-9]{4})[a-z0-9]*\.(raidjudgefaucet-[a-z0-9]+|raidapp)\.testnet$/); if (m) return `Trader ${m[1]!.toUpperCase()}`;
  if (/^raid[a-z0-9]*-[a-z0-9]{8}\.testnet$/.test(a) && !a.startsWith('raid-')) return 'RAID team';
  if (/judge/.test(a)) return 'RAID team';
  return null;
}
export const displayName = (a: string) => personByAccount(a)?.name ?? crewName(a) ?? opsName(a) ?? a.replace(/\.(testnet|near)$/, '').replace(/^(.{14}).+$/, '$1…');
export const profileHref = (a: string) => `/u/${personByAccount(a)?.handle ?? a}`;
