/** Crews are Sputnik DAO v2 contracts on NEAR testnet (factory sputnikv2.testnet). A passed proposal makes the DAO
 *  itself call `call_raid` on the chest, so the raid's on-chain caller is the crew DAO. Raid War scores come from
 *  the chest's raid records only. */
import { useQuery } from '@tanstack/react-query';
import { type Raid, CHEST_ID, usdcOf, view } from './raid';

export const DAO_FACTORY = process.env.NEXT_PUBLIC_RAID_DAO_FACTORY ?? 'sputnikv2.testnet';
export interface Crew { key: string; name: string; dao: string; tag: string; color: string; ink: string }
export const CREWS: Crew[] = [
  { key: 'frogs', name: 'Frog Legion', dao: `raid-frog-legion.${DAO_FACTORY}`, tag: 'FRG', color: '#c6ff3d', ink: '#0a1a00' },
  { key: 'dogs', name: 'Doge Pack', dao: `raid-doge-pack.${DAO_FACTORY}`, tag: 'DGP', color: '#3355ff', ink: '#ffffff' },
];
export const crewByDao = (dao: string) => CREWS.find((c) => c.dao === dao);

/** War #1: Frog Legion vs Doge Pack, 24 h from the crews' first proposals (2026-11-11 17:28 UTC = 18:28 WAT). */
export const WAR = { id: 1, start: 1794418080000, end: 1794418080000 + 24 * 3600_000, crews: ['frogs', 'dogs'] as const };

export type Vote = 'Approve' | 'Reject' | 'Remove';
export interface Proposal {
  id: number; proposer: string; description: string; status: 'InProgress' | 'Approved' | 'Rejected' | 'Removed' | 'Expired' | 'Moved' | 'Failed';
  kind: Record<string, unknown>; vote_counts: Record<string, [number, number, number]>; votes: Record<string, Vote>; submission_time: string;
}
export interface Policy { roles: { name: string; kind: { Group?: string[] } | string; permissions: string[] }[]; default_vote_policy: { threshold: [number, number] | string }; proposal_bond: string; proposal_period: string }

export const daoApi = {
  policy: (dao: string) => view<Policy>('get_policy', {}, dao),
  proposals: (dao: string) => view<Proposal[]>('get_proposals', { from_index: 0, limit: 50 }, dao),
};
export const members = (p?: Policy) => [...new Set((p?.roles ?? []).flatMap((r) => (typeof r.kind === 'object' && r.kind.Group) || []))];
/** Votes needed under a RoleWeight ratio policy: floor(n * num / den) + 1, capped at n (sputnikdao2 policy.rs to_weight). */
export function votesNeeded(p: Policy | undefined, n: number) {
  const t = p?.default_vote_policy.threshold;
  if (!Array.isArray(t) || !n) return n || 1;
  return Math.min(Math.floor((n * t[0]) / t[1]) + 1, n);
}

/** Decoded call_raid action from a FunctionCall proposal (null for any other proposal kind). */
export function raidCall(p: Proposal): { title: string; target: string; target_x_bps: number; open_minutes: number; retreat_hours: number } | null {
  const fc = p.kind.FunctionCall as { receiver_id: string; actions: { method_name: string; args: string }[] } | undefined;
  const a = fc?.receiver_id === CHEST_ID ? fc.actions.find((x) => x.method_name === 'call_raid') : undefined;
  if (!a) return null;
  try { return JSON.parse(typeof atob === 'function' ? atob(a.args) : Buffer.from(a.args, 'base64').toString()); } catch { return null; }
}
export const proposalTitle = (p: Proposal) => p.description.split('$$$$')[0] ?? p.description;

/** Raid War score for one crew, from chest records only.
 *  Firepower = USDC backed on raids the crew DAO called during the war window, times the realised multiple once a raid
 *  closes (proceeds / entry cost; a miss below 1x lowers it). Hits = closed raids that reached their line. */
export interface WarScore { crew: Crew; raids: Raid[]; firepower: number; backed: number; hits: number; settled: number; live: number }
export function warScore(crew: Crew, raids: Raid[], inWindow: (r: Raid) => boolean = () => true): WarScore {
  const mine = raids.filter((r) => r.caller === crew.dao && inWindow(r));
  let firepower = 0, backed = 0, hits = 0, settled = 0, live = 0;
  for (const r of mine) {
    const pot = usdcOf(r.pot);
    backed += pot;
    if (r.status === 'Closed') {
      settled++; if (r.hit) hits++;
      const x = Number(r.entry_cost) > 0 ? Number(r.proceeds) / Number(r.entry_cost) : 1;
      firepower += pot * x;
    } else { live++; firepower += pot; }
  }
  return { crew, raids: mine, firepower, backed, hits, settled, live };
}
/** War raids: called by a crew DAO with a crew window that closes within the war (+ the 24 h max crew window). */
export const inWar = (r: Raid) => r.opens_until_ms >= WAR.start && r.opens_until_ms <= WAR.end + 24 * 3600_000;
export function warLeader(a: WarScore, b: WarScore) {
  if (a.hits !== b.hits) return a.hits > b.hits ? a : b;
  if (a.firepower !== b.firepower) return a.firepower > b.firepower ? a : b;
  return null;
}

export const useDao = (dao: string) => useQuery({ queryKey: ['dao', dao], queryFn: async () => ({ policy: await daoApi.policy(dao), proposals: await daoApi.proposals(dao) }), refetchInterval: 15_000 });

/** Wallet-ready DAO calls. Proposals carry the DAO's bond (0.1 NEAR on RAID crews); voting needs no deposit. */
export const daoTx = {
  vote: (dao: string, p: Proposal, action: 'VoteApprove' | 'VoteReject') => ({ receiverId: dao, method: 'act_proposal', args: { id: p.id, action, proposal: p.kind }, deposit: '0', gas: '200000000000000' }),
  proposeRaid: (dao: string, bond: string, a: { title: string; target: string; target_x_bps: number }) => ({
    receiverId: dao, method: 'add_proposal', deposit: bond, gas: '100000000000000',
    args: { proposal: { description: `${a.title}$$$$RAID call from the app`, kind: { FunctionCall: { receiver_id: CHEST_ID, actions: [{ method_name: 'call_raid', args: btoa(JSON.stringify({ ...a, open_minutes: 600, retreat_hours: 72 })), deposit: '0', gas: '30000000000000' }] } } } },
  }),
};
