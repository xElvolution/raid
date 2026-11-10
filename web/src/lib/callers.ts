import type { Raid } from './raid';
import { usdcOf } from './raid';

export interface CallerStats { account: string; called: number; hits: number; settled: number; rallied: number; live: number; best: number | null }

/** Aggregate the chest's raids by caller. Everything here is derived from on-chain raid records. */
export function callerStats(raids: Raid[]): CallerStats[] {
  const m = new Map<string, CallerStats>();
  for (const r of raids) {
    const s = m.get(r.caller) ?? { account: r.caller, called: 0, hits: 0, settled: 0, rallied: 0, live: 0, best: null };
    s.called++; s.rallied += usdcOf(r.pot);
    if (r.status === 'Closed') { s.settled++; if (r.hit) { s.hits++; const x = Number(r.proceeds) / Math.max(1, Number(r.entry_cost)); s.best = Math.max(s.best ?? 0, x); } } else s.live++;
    m.set(r.caller, s);
  }
  return [...m.values()].sort((a, b) => b.hits - a.hits || b.rallied - a.rallied || b.called - a.called);
}
