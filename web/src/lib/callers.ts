import type { Raid } from './raid';
import { usdcOf } from './raid';
import { crewName } from './crews';

export interface CallerStats { account: string; called: number; hits: number; settled: number; rallied: number; live: number; best: number | null; profit: number }

/** Aggregate the chest's raids by caller. Everything here is derived from on-chain raid records. */
export function callerStats(raids: Raid[]): CallerStats[] {
  const m = new Map<string, CallerStats>();
  for (const r of raids) {
    const s = m.get(r.caller) ?? { account: r.caller, called: 0, hits: 0, settled: 0, rallied: 0, live: 0, best: null, profit: 0 };
    s.called++; s.rallied += usdcOf(r.pot);
    if (r.status === 'Closed') { s.settled++; s.profit += raidProfit(r); if (r.hit) { s.hits++; const x = Number(r.proceeds) / Math.max(1, Number(r.entry_cost)); s.best = Math.max(s.best ?? 0, x); } } else s.live++;
    m.set(r.caller, s);
  }
  return [...m.values()].sort((a, b) => b.hits - a.hits || b.rallied - a.rallied || b.called - a.called);
}

/** Realised profit of a settled raid in tUSDC: what the sell returned minus what the buy cost, both read from the chest. */
export const raidProfit = (r: Raid) => (r.status === 'Closed' && Number(r.entry_cost) > 0 ? usdcOf(r.proceeds) - usdcOf(r.entry_cost) : 0);

/** Seasons are calendar months, keyed by when a raid's join window closed. */
export const seasonOf = (ms: number) => { const d = new Date(ms); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
export const seasonLabel = (k: string) => new Date(`${k}-01T00:00:00Z`).toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export interface SeasonRow { key: string; name: string; isCrew: boolean; settled: number; hits: number; profit: number; rallied: number }
export function seasonBoard(raids: Raid[], season: string, by: 'callers' | 'crews'): SeasonRow[] {
  const m = new Map<string, SeasonRow>();
  for (const r of raids) {
    if (seasonOf(r.opens_until_ms) !== season) continue;
    const crew = crewName(r.caller);
    if (by === 'crews' && !crew) continue;
    const key = by === 'crews' ? crew! : r.caller;
    const s = m.get(key) ?? { key: r.caller, name: by === 'crews' ? crew! : r.caller, isCrew: !!crew, settled: 0, hits: 0, profit: 0, rallied: 0 };
    s.rallied += usdcOf(r.pot);
    if (r.status === 'Closed') { s.settled++; s.profit += raidProfit(r); if (r.hit) s.hits++; }
    m.set(key, s);
  }
  return [...m.values()].sort((a, b) => b.profit - a.profit || b.hits - a.hits || b.rallied - a.rallied);
}

/** Verified caller rule, checked against on-chain raids only: 2 or more raids that hit, and at least half of settled raids hit. */
export const VERIFY = { hits: 2, rate: 0.5 };
export function verifyProgress(s: CallerStats | undefined) {
  const hits = s?.hits ?? 0, settled = s?.settled ?? 0, rate = settled ? hits / settled : 0;
  return { hits, settled, rate, verified: hits >= VERIFY.hits && rate >= VERIFY.rate };
}
