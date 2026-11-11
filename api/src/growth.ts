/**
 * Growth loops: private leagues with friends (invite code), daily challenges with XP claims,
 * and NEAR testnet funding (verified on-chain deposits credit play USDC; withdrawals are queued for the treasury signer).
 */
import { randomInt } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Db } from './db/index.js';
import { must } from './must.js';

export interface GrowthDeps {
  db: Db;
  requireUser: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
  awardXp: (userId: string, kind: string, xp: number) => Promise<unknown>;
  /** Returns the yocto transferred from `from` to `to` in a successful tx, or 0n. */
  nearTransfer?: (hash: string, from: string, to: string) => Promise<bigint>;
  treasury?: string;
  /** Play dollars credited per 1 NEAR. */
  rate: number;
  demo: boolean;
}

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = () => Array.from({ length: 6 }, () => ALPHA[randomInt(ALPHA.length)]).join('');

export const CHALLENGES = [
  { id: 'call3', label: 'Make 3 calls', detail: 'Free calls or trades on any market', xp: 30, goal: 3 },
  { id: 'trade50', label: 'Trade $50', detail: 'Total play volume today', xp: 40, goal: 50 },
  { id: 'post1', label: 'Post a take', detail: 'A post or a reply', xp: 20, goal: 1 },
  { id: 'streak', label: 'Keep the streak', detail: 'Check in today', xp: 15, goal: 1 },
] as const;

export function registerGrowth(app: FastifyInstance, d: GrowthDeps) {
  const { db, requireUser } = d;
  const uid = (req: FastifyRequest) => String(req.userId);

  // ---------- private leagues ----------
  app.get('/v1/leagues', { preHandler: requireUser }, async (req) => ({
    items: await db.query(`SELECT l.id::text, l.code, l.name, l.owner_id = $1::bigint AS mine, (SELECT count(*) FROM private_league_members m WHERE m.league_id=l.id)::int AS members,
        (SELECT json_agg(x) FROM (SELECT u.handle, u.avatar_url FROM private_league_members m JOIN users u ON u.id=m.user_id WHERE m.league_id=l.id ORDER BY m.joined_at LIMIT 5) x) AS faces
      FROM private_leagues l JOIN private_league_members me ON me.league_id=l.id AND me.user_id=$1::bigint ORDER BY l.created_at DESC`, [uid(req)]),
  }));
  const Create = z.object({ name: z.string().trim().min(2).max(40) });
  app.post('/v1/leagues', { preHandler: requireUser }, async (req, reply) => {
    const b = Create.safeParse(req.body); if (!b.success) return reply.code(400).send({ error: 'bad_name' });
    const [{ n } = { n: 0 }] = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM private_leagues WHERE owner_id=$1', [uid(req)]);
    if (n >= 10) return reply.code(429).send({ error: 'league_limit' });
    for (let i = 0; i < 5; i++) {
      const c = code();
      const [l] = await db.query<{ id: string }>('INSERT INTO private_leagues (code, name, owner_id) VALUES ($1,$2,$3) ON CONFLICT (code) DO NOTHING RETURNING id::text', [c, b.data.name, uid(req)]);
      if (l) { await db.query('INSERT INTO private_league_members (league_id, user_id) VALUES ($1,$2)', [l.id, uid(req)]); return { code: c, name: b.data.name }; }
    }
    return reply.code(500).send({ error: 'code_collision' });
  });
  app.post<{ Params: { code: string } }>('/v1/leagues/:code/join', { preHandler: requireUser }, async (req, reply) => {
    const c = req.params.code.toUpperCase();
    const [l] = await db.query<{ id: string; name: string }>('SELECT id::text, name FROM private_leagues WHERE code=$1', [c]);
    if (!l) return reply.code(404).send({ error: 'not_found' });
    const [{ n } = { n: 0 }] = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM private_league_members WHERE league_id=$1', [l.id]);
    if (n >= 50) return reply.code(409).send({ error: 'league_full' });
    await db.query('INSERT INTO private_league_members (league_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [l.id, uid(req)]);
    return { code: c, name: l.name, joined: true };
  });
  app.delete<{ Params: { code: string } }>('/v1/leagues/:code/join', { preHandler: requireUser }, async (req) => {
    await db.query('DELETE FROM private_league_members WHERE user_id=$2 AND league_id=(SELECT id FROM private_leagues WHERE code=$1)', [req.params.code.toUpperCase(), uid(req)]);
    return { joined: false };
  });

  // ---------- daily challenges ----------
  const progress = async (u: string) => {
    const [r] = await db.query<{ calls: number; vol: number; posts: number; streak: boolean }>(
      `SELECT (SELECT count(*) FROM predictions WHERE user_id=$1 AND created_at >= date_trunc('day', now()))::int
            + (SELECT count(DISTINCT market_id) FROM play_trades WHERE user_id=$1 AND created_at >= date_trunc('day', now()))::int AS calls,
         (SELECT COALESCE(sum(amount),0) FROM play_trades WHERE user_id=$1 AND created_at >= date_trunc('day', now()))::float8 AS vol,
         (SELECT count(*) FROM posts WHERE author_id=$1 AND created_at >= date_trunc('day', now()))::int AS posts,
         COALESCE((SELECT last_day = current_date FROM streaks WHERE user_id=$1), false) AS streak`, [u]);
    const claimed = new Set((await db.query<{ challenge: string }>('SELECT challenge FROM challenge_claims WHERE user_id=$1 AND day=current_date', [u])).map((x) => x.challenge));
    const val: Record<string, number> = { call3: r?.calls ?? 0, trade50: r?.vol ?? 0, post1: r?.posts ?? 0, streak: r?.streak ? 1 : 0 };
    return CHALLENGES.map((c) => ({ ...c, progress: Math.min(c.goal, val[c.id] ?? 0), done: (val[c.id] ?? 0) >= c.goal, claimed: claimed.has(c.id) }));
  };
  app.get('/v1/challenges', { preHandler: requireUser }, async (req) => {
    const end = new Date(); end.setUTCHours(24, 0, 0, 0);
    return { items: await progress(uid(req)), resetsAt: end.toISOString() };
  });
  app.post<{ Params: { id: string } }>('/v1/challenges/:id/claim', { preHandler: requireUser }, async (req, reply) => {
    const c = (await progress(uid(req))).find((x) => x.id === req.params.id);
    if (!c) return reply.code(404).send({ error: 'not_found' });
    if (!c.done) return reply.code(409).send({ error: 'not_done' });
    const ins = await db.query('INSERT INTO challenge_claims (user_id, day, challenge, xp) VALUES ($1, current_date, $2, $3) ON CONFLICT DO NOTHING RETURNING challenge', [uid(req), c.id, c.xp]);
    if (!ins.length) return reply.code(409).send({ error: 'already_claimed' });
    await d.awardXp(uid(req), `challenge:${c.id}`, c.xp);
    return { claimed: true, xp: c.xp };
  });

  // ---------- NEAR testnet funding ----------
  app.get('/v1/funds/config', async () => ({ network: 'testnet', treasury: d.treasury ?? null, rate: d.rate, deposits: !!(d.treasury && d.nearTransfer) || d.demo, demo: d.demo, withdrawals: 'queued' }));
  const Dep = z.object({ txHash: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{43,44}$|^demo-[a-z0-9]{6,32}$/) });
  app.post('/v1/funds/near/deposit', { preHandler: requireUser }, async (req, reply) => {
    const b = Dep.safeParse(req.body); if (!b.success) return reply.code(400).send({ error: 'bad_tx' });
    const [me] = await db.query<{ near_account: string }>('SELECT near_account FROM users WHERE id=$1', [uid(req)]);
    let yocto: bigint, demo = false;
    if (b.data.txHash.startsWith('demo-')) {
      if (!d.demo) return reply.code(400).send({ error: 'bad_tx' });
      yocto = 10n ** 24n * 10n; demo = true; // demo deposit: 10 testnet NEAR, clearly flagged
    } else {
      if (!d.treasury || !d.nearTransfer) return reply.code(503).send({ error: 'deposits_not_configured' });
      try { yocto = await d.nearTransfer(b.data.txHash, must(me, 'user').near_account, d.treasury); } catch { return reply.code(502).send({ error: 'rpc_unavailable' }); }
      if (yocto <= 0n) return reply.code(422).send({ error: 'tx_not_verified' });
    }
    const credited = Math.round((Number(yocto / 10n ** 18n) / 1e6) * d.rate * 100) / 100;
    const ins = await db.query('INSERT INTO near_deposits (tx_hash, user_id, yocto, credited, demo) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING tx_hash', [b.data.txHash, uid(req), yocto.toString(), credited, demo]);
    if (!ins.length) return reply.code(409).send({ error: 'already_credited' });
    await db.query('INSERT INTO play_accounts (user_id, balance, deposited) VALUES ($1,0,0) ON CONFLICT DO NOTHING', [uid(req)]);
    await db.query('UPDATE play_accounts SET balance=balance+$2, deposited=deposited+$2 WHERE user_id=$1', [uid(req), credited]);
    req.log.info({ user: uid(req), credited, demo }, 'near deposit credited');
    return { credited, near: Number(yocto / 10n ** 18n) / 1e6, demo };
  });
  const Wd = z.object({ amount: z.number().positive().max(100_000) });
  app.post('/v1/funds/near/withdraw', { preHandler: requireUser }, async (req, reply) => {
    const b = Wd.safeParse(req.body); if (!b.success) return reply.code(400).send({ error: 'bad_amount' });
    const [me] = await db.query<{ near_account: string }>('SELECT near_account FROM users WHERE id=$1', [uid(req)]);
    const r = await db.query('UPDATE play_accounts SET balance=balance-$2, deposited=deposited-$2 WHERE user_id=$1 AND balance >= $2 RETURNING user_id', [uid(req), b.data.amount.toFixed(6)]);
    if (!r.length) return reply.code(409).send({ error: 'insufficient_balance' });
    const [w] = await db.query<{ id: string }>('INSERT INTO near_withdrawals (user_id, to_account, amount) VALUES ($1,$2,$3) RETURNING id::text', [uid(req), must(me, 'user').near_account, b.data.amount]);
    const wid = must(w, 'withdrawal').id;
    req.log.info({ user: uid(req), amount: b.data.amount, id: wid }, 'near withdrawal queued');
    return { id: wid, status: 'queued', to: must(me, 'user').near_account, near: Math.round((b.data.amount / d.rate) * 1e4) / 1e4 };
  });
  app.get('/v1/funds/history', { preHandler: requireUser }, async (req) => ({
    deposits: await db.query('SELECT tx_hash, credited::float8, demo, created_at FROM near_deposits WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20', [uid(req)]),
    withdrawals: await db.query('SELECT id::text, to_account, amount::float8, status, tx_hash, created_at FROM near_withdrawals WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20', [uid(req)]),
  }));
}
