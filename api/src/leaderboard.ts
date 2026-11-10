/**
 * Leaderboard v2: P&L, hit rate, volume and streak per window, with rank change versus the previous
 * window, scope (global / friends / my league) and the weekly reset clock. Computed from play-money tables.
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Db } from './db/index.js';

type Database = { primary: Db; replica: Db };
export const LEAGUES = [
  { name: 'Bronze', min: 0 }, { name: 'Silver', min: 200 }, { name: 'Gold', min: 600 }, { name: 'Sapphire', min: 1500 },
  { name: 'Ruby', min: 3500 }, { name: 'Diamond', min: 8000 }, { name: 'Legend', min: 20000 },
];
export const leagueFor = (xp: number) => [...LEAGUES].reverse().find((l) => xp >= l.min)!.name;

const Q = z.object({
  window: z.enum(['day', 'week', 'month', 'all']).default('week'),
  sort: z.enum(['pnl', 'hit', 'volume', 'streak']).default('pnl'),
  scope: z.enum(['global', 'friends', 'league', 'private']).default('global'),
  code: z.string().regex(/^[A-Za-z0-9]{6}$/).optional(),
});
const SPAN: Record<string, string> = { day: '1 day', week: '7 days', month: '30 days', all: '100 years' };

/** Next Monday 00:00 UTC. */
export function nextReset(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + (((8 - d.getUTCDay()) % 7) || 7));
  return d;
}

export function registerLeaderboard(app: FastifyInstance, deps: { db: Database }) {
  const { db } = deps;
  app.get('/v1/leaderboard', async (req: FastifyRequest, reply) => {
    const q = Q.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'bad_request' });
    const { window, sort, scope } = q.data;
    const viewer = req.userId ? String(req.userId) : null;
    const span = SPAN[window]!;
    // Value at window start and one window earlier (for rank change), from the value history.
    const rows = await db.replica.query<{ id: string; handle: string; display_name: string; avatar_url: string | null; xp: number; streak: number; pnl: number; prev_pnl: number; volume: number; settled: number; won: number; following: boolean }>(
      `WITH a AS (SELECT a.user_id, a.deposited::float8 AS dep FROM play_accounts a),
       v AS (
         SELECT a.user_id,
           (SELECT value::float8 FROM play_value_history h WHERE h.user_id=a.user_id ORDER BY ts DESC LIMIT 1) AS now_v,
           (SELECT value::float8 FROM play_value_history h WHERE h.user_id=a.user_id AND h.ts <= now() - interval '${span}' ORDER BY ts DESC LIMIT 1) AS start_v,
           (SELECT value::float8 FROM play_value_history h WHERE h.user_id=a.user_id AND h.ts <= now() - 2 * interval '${span}' ORDER BY ts DESC LIMIT 1) AS prev_v,
           (SELECT value::float8 FROM play_value_history h WHERE h.user_id=a.user_id ORDER BY ts ASC LIMIT 1) AS first_v,
           a.dep
         FROM a)
       SELECT u.id::text, u.handle, u.display_name, u.avatar_url,
         (SELECT COALESCE(sum(xp),0) FROM xp_events x WHERE x.user_id=u.id)::int AS xp,
         COALESCE(s.current,0)::int AS streak,
         COALESCE(v.now_v,v.dep) - COALESCE(${window === 'all' ? 'v.dep' : 'v.start_v, v.first_v, v.dep'}) AS pnl,
         COALESCE(v.start_v, v.first_v, v.dep) - COALESCE(${window === 'all' ? 'v.dep' : 'v.prev_v, v.first_v, v.dep'}) AS prev_pnl,
         (SELECT COALESCE(sum(amount),0)::float8 FROM play_trades t WHERE t.user_id=u.id AND t.created_at > now() - interval '${span}') AS volume,
         (SELECT count(*)::int FROM play_positions pp JOIN markets m ON m.id=pp.market_id WHERE pp.user_id=u.id AND m.outcome IN ('YES','NO') AND m.close_ts > now() - interval '${span}') AS settled,
         (SELECT count(*)::int FROM play_positions pp JOIN markets m ON m.id=pp.market_id WHERE pp.user_id=u.id AND m.outcome IN ('YES','NO') AND m.close_ts > now() - interval '${span}' AND (m.outcome='YES')=(pp.outcome=1)) AS won,
         COALESCE(EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=$1 AND f.followee_id=u.id), false) AS following
       FROM v JOIN users u ON u.id=v.user_id LEFT JOIN streaks s ON s.user_id=u.id`, [viewer]);
    const key = (r: (typeof rows)[number]) => sort === 'pnl' ? r.pnl : sort === 'volume' ? r.volume : sort === 'streak' ? r.streak : (r.settled >= 3 ? r.won / r.settled : -1) + r.settled * 1e-6;
    const me = viewer ? rows.find((r) => r.id === viewer) : undefined;
    let pool = rows;
    if (scope === 'friends') pool = rows.filter((r) => r.following || r.id === viewer);
    let privateName: string | null = null;
    if (scope === 'private') {
      if (!q.data.code) return reply.code(400).send({ error: 'code_required' });
      const ids = await db.replica.query<{ user_id: string; name: string }>('SELECT m.user_id::text, l.name FROM private_league_members m JOIN private_leagues l ON l.id=m.league_id WHERE l.code=$1', [q.data.code.toUpperCase()]);
      if (!ids.length) return reply.code(404).send({ error: 'not_found' });
      privateName = ids[0]!.name; const set = new Set(ids.map((x) => x.user_id)); pool = rows.filter((r) => set.has(r.id));
    }
    if (scope === 'league') { const l = leagueFor(me?.xp ?? 0); pool = rows.filter((r) => leagueFor(r.xp) === l); }
    const prevOrder = sort === 'pnl' ? [...pool].sort((a, b) => b.prev_pnl - a.prev_pnl).map((r) => r.id) : null;
    const items = [...pool].sort((a, b) => key(b) - key(a)).map((r, i) => {
      const prev = prevOrder ? prevOrder.indexOf(r.id) + 1 : i + 1;
      return {
        rank: i + 1, change: Math.max(-12, Math.min(12, prev - (i + 1))), id: r.id, handle: r.handle, display_name: r.display_name, avatar_url: r.avatar_url,
        league: leagueFor(r.xp), xp: r.xp, pnl: Math.round(r.pnl * 100) / 100, volume: Math.round(r.volume), streak: r.streak,
        hitRate: r.settled ? r.won / r.settled : null, settled: r.settled, following: r.following, me: r.id === viewer,
      };
    });
    const n = items.length;
    const zones = scope === 'league' ? { promote: Math.max(1, Math.round(n * 0.2)), relegate: n > 5 ? n - Math.max(1, Math.round(n * 0.2)) + 1 : null } : null;
    return {
      window, sort, scope, items: items.slice(0, 100), me: items.find((x) => x.me) ?? null, total: n,
      league: me ? leagueFor(me.xp) : null, privateName, zones, resetsAt: nextReset().toISOString(),
      prize: { label: 'Weekly top 3', detail: 'Gold card frame + 500 XP (play money, no cash value)' },
    };
  });
}
