import { registerLeaderboard } from './leaderboard.js';
import { registerGrowth } from './growth.js';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { z } from 'zod';
import { verifySignIn, Tokens, type KeyChecker, type PrivyVerifier } from './auth.js';
import { decodeCursor, encodeCursor } from './cursor.js';
import type { Database } from './db/index.js';
import type { Bus, Kv } from './infra/bus.js';
import type { Jobs } from './infra/queue.js';
import { LiveHub } from './live.js';
import { registerPlay, setChain } from './play.js';
import type { Chain } from './chain.js';
import { courtResolve } from './resolution.js';
import { registerOpening } from './opening.js';
import { registerExternal, type VenueRouter } from './external.js';
import { registerSocial } from './social.js';
import { DraftResponse, isExcludedMarket, POLICY_MESSAGE } from './workers.js';

export interface Deps {
  db: Database;
  bus: Bus;
  kv: Kv;
  jobs: Jobs;
  checkKey: KeyChecker;
  /** AI market drafter (resolver service). Unset: preview answers 503 drafter_unavailable. */
  drafter?: { url: string; token?: string; fetch?: typeof fetch } | null;
  /** On-chain verification for NEAR tips (see near-tips.ts). */
  verifyTip?: (hash: string, from: string, to: string, yocto: bigint) => Promise<boolean>;
  nearTransfer?: (hash: string, from: string, to: string) => Promise<bigint>;
  nearTreasury?: string;
  nearPlayRate?: number;
  /** Real-money venue router; null/undefined keeps routing disabled (503). */
  router?: VenueRouter | null;
  /** Privy access-token verifier; null/undefined disables /v1/auth/privy (503). */
  privy?: PrivyVerifier | null;
  /** On-chain execution (NEAR). When set, play routes run against the contract. */
  chain?: Chain | null;
  /** Bearer token for /v1/admin/* (court resolution). Unset disables admin routes. */
  adminToken?: string;
  config: {
    jwtSecret: string;
    signInRecipient: string;
    blockedCountries: string[];
    corsOrigins: string[];
    /** Preview/demo only: enables one-tap demo sign-in. Play-money routes are always available. */
    demo?: boolean;
    /** Play-money routes (points mode). Default on; set PLAY_MONEY=0 in production to disable. */
    playMoney?: boolean;
    /** Disable NEAR wallet sign-in (NEP-413) when Privy is the only login. */
    nearSignIn?: boolean;
  };
}

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

const Handle = z.string().regex(/^[a-z0-9_]{3,20}$/);
const PAGE = 30;

export function buildApp(deps: Deps) {
  const { db, bus, kv, jobs } = deps;
  const tokens = new Tokens(deps.config.jwtSecret);
  const hub = new LiveHub(bus);
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' }, trustProxy: true, bodyLimit: 64 * 1024 });

  void app.register(cors, { origin: deps.config.corsOrigins, credentials: true });
  void app.register(websocket, { options: { maxPayload: 4 * 1024 } });

  // ---- cross-cutting: rate limits, auth, geofence ----
  app.addHook('onRequest', async (req, reply) => {
    const n = await kv.hit(`rl:ip:${req.ip}:${Math.floor(Date.now() / 60_000)}`, 60);
    if (n > 600) return reply.code(429).send({ error: 'rate_limited' });
    const h = req.headers.authorization;
    // Browsers cannot set headers on WebSocket upgrades, so /v1/live also accepts ?token=.
    const qt = req.url.startsWith('/v1/live') ? (req.query as { token?: string }).token : undefined;
    const tok = h?.startsWith('Bearer ') ? h.slice(7) : qt;
    if (tok) {
      try {
        req.userId = await tokens.verify(tok);
      } catch {
        return reply.code(401).send({ error: 'invalid_token' });
      }
    }
  });

  const country = (req: FastifyRequest): string => String(req.headers['cf-ipcountry'] ?? req.headers['x-country'] ?? '').toUpperCase();
  const requireUser = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.userId) return reply.code(401).send({ error: 'auth_required' });
    const n = await kv.hit(`rl:user:${req.userId}:${Math.floor(Date.now() / 60_000)}`, 60);
    if (n > 60) return reply.code(429).send({ error: 'rate_limited' });
  };
  const requireRealMoneyRegion = async (req: FastifyRequest, reply: FastifyReply) => {
    const c = country(req);
    if (!c || deps.config.blockedCountries.includes(c)) return reply.code(451).send({ error: 'region_restricted', mode: 'points' });
  };

  // ---- auth (NEP-413) ----
  const nonceKey = createHmac('sha256', deps.config.jwtSecret).update('nonce').digest();
  const makeNonce = (): string => {
    const head = Buffer.alloc(16);
    head.writeBigUInt64BE(BigInt(Date.now()));
    randomBytes(8).copy(head, 8);
    return Buffer.concat([head, createHmac('sha256', nonceKey).update(head).digest().subarray(0, 16)]).toString('base64');
  };
  const nonceFresh = async (b64: string): Promise<boolean> => {
    const b = Buffer.from(b64, 'base64');
    if (b.length !== 32) return false;
    const mac = createHmac('sha256', nonceKey).update(b.subarray(0, 16)).digest().subarray(0, 16);
    if (!timingSafeEqual(mac, b.subarray(16))) return false;
    if (Date.now() - Number(b.readBigUInt64BE(0)) > 5 * 60_000) return false;
    return (await kv.hit(`nonce:${b64}`, 600)) === 1;
  };

  app.get('/health', async () => ({ ok: true, live: hub.stats() }));

  setChain(deps.chain ?? null);
  if (deps.config.playMoney !== false || deps.chain) registerPlay(app, { db: db.primary, bus, requireUser });
  app.get('/v1/auth/methods', async () => ({ chain: deps.chain ? { network: deps.chain.cfg.network, contract: deps.chain.cfg.contractId, token: deps.chain.cfg.tokenId, faucet: deps.chain.cfg.testnetFaucet } : null, privy: !!deps.privy, near: deps.config.nearSignIn !== false, demo: !!deps.config.demo, playMoney: deps.config.playMoney !== false }));

  // ---- admin: court resolution of on-chain markets ----
  app.post<{ Params: { id: string } }>('/v1/admin/markets/:id/resolve', async (req, reply) => {
    if (!deps.adminToken || !deps.chain) return reply.code(404).send({ error: 'not_found' });
    const a = Buffer.from(String(req.headers['x-admin-token'] ?? '')), e = Buffer.from(deps.adminToken);
    if (a.length !== e.length || !timingSafeEqual(a, e)) return reply.code(401).send({ error: 'unauthorized' });
    const b = z.object({ outcome: z.enum(['YES', 'NO', 'INVALID']) }).safeParse(req.body);
    if (!b.success || !/^\d+$/.test(req.params.id)) return reply.code(400).send({ error: 'bad_request' });
    try { return { ok: true, txHash: await courtResolve({ db: db.primary, bus, chain: deps.chain, log: req.log }, req.params.id, b.data.outcome) }; }
    catch (err) { req.log.error({ err }, 'court resolve failed'); return reply.code(409).send({ error: (err as Error).message.slice(0, 120) }); }
  });

  // ---- auth (Privy) ----
  const PrivyIn = z.object({ accessToken: z.string().min(20).max(4096), handle: Handle.optional() });
  app.post('/v1/auth/privy', async (req, reply) => {
    if (!deps.privy) return reply.code(503).send({ error: 'privy_not_configured' });
    const b = PrivyIn.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'bad_request' });
    let id;
    try { id = await deps.privy(b.data.accessToken); } catch { return reply.code(401).send({ error: 'invalid_privy_token' }); }
    let rows = await db.primary.query<{ id: string; handle: string }>('SELECT id, handle FROM users WHERE privy_did=$1', [id.did]);
    if (!rows[0] && id.nearAccount) {
      rows = await db.primary.query('UPDATE users SET privy_did=$1 WHERE near_account=$2 AND privy_did IS NULL RETURNING id, handle', [id.did, id.nearAccount]);
    }
    const created = !rows[0];
    if (!rows[0]) {
      const base = (b.data.handle ?? id.email?.split('@')[0] ?? 'caller').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 14).padEnd(3, '_');
      const handle = b.data.handle ?? `${base}_${randomBytes(2).toString('hex')}`;
      try {
        rows = await db.primary.query('INSERT INTO users (handle, privy_did, near_account, email, display_name) VALUES ($1,$2,$3,$4,$1) RETURNING id, handle', [handle, id.did, id.nearAccount ?? null, id.email ?? null]);
      } catch {
        return reply.code(409).send({ error: 'handle_taken' });
      }
    } else if (id.nearAccount) {
      await db.primary.query('UPDATE users SET near_account=COALESCE(near_account,$2) WHERE id=$1', [rows[0].id, id.nearAccount]);
    }
    const u = rows[0];
    if (!u) return reply.code(500).send({ error: 'user_create_failed' });
    return { token: await tokens.issue(String(u.id)), user: u, created };
  });
  registerOpening(app, { db: db.primary, bus, requireUser });

  // One-tap demo account for previews. Disabled unless config.demo is set.
  app.post('/v1/auth/demo', async (_req, reply) => {
    if (!deps.config.demo) return reply.code(404).send({ error: 'not_found' });
    const [u] = await db.primary.query<{ id: string }>("SELECT id FROM users WHERE handle='demo'");
    if (!u) return reply.code(503).send({ error: 'demo_not_seeded' });
    const user = (await db.primary.query("SELECT id, handle, display_name, avatar_url, near_account FROM users WHERE id=$1", [u.id]))[0];
    return { token: await tokens.issue(String(u.id), '12h'), user };
  });

  app.post('/v1/auth/nonce', async () => ({ nonce: makeNonce(), recipient: deps.config.signInRecipient, message: 'Sign in to Called' }));

  const SignIn = z.object({
    signed: z.object({ accountId: z.string().min(2).max(64), publicKey: z.string(), signature: z.string(), message: z.literal('Sign in to Called'), nonce: z.string(), recipient: z.string() }),
    handle: Handle.optional(),
  });
  app.post('/v1/auth/signin', async (req, reply) => {
    if (deps.config.nearSignIn === false) return reply.code(404).send({ error: 'not_found' });
    const b = SignIn.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'bad_request' });
    try {
      await verifySignIn(b.data.signed, deps.config.signInRecipient, nonceFresh, deps.checkKey);
    } catch (e) {
      return reply.code(401).send({ error: (e as Error).message });
    }
    const acct = b.data.signed.accountId;
    let rows = await db.primary.query<{ id: string; handle: string }>('SELECT id, handle FROM users WHERE near_account=$1', [acct]);
    const created = !rows[0];
    if (!rows[0]) {
      const handle = b.data.handle ?? acct.split('.')[0]?.replace(/[^a-z0-9_]/g, '').slice(0, 20).padEnd(3, '_');
      try {
        rows = await db.primary.query('INSERT INTO users (handle, near_account, display_name) VALUES ($1,$2,$1) RETURNING id, handle', [handle, acct]);
      } catch {
        return reply.code(409).send({ error: 'handle_taken' });
      }
    }
    const u = rows[0];
    if (!u) return reply.code(500).send({ error: 'user_create_failed' });
    return { token: await tokens.issue(String(u.id)), user: u, created };
  });

  // ---- users & follows ----
  app.get('/v1/me', { preHandler: requireUser }, async (req) => {
    const [u] = await db.replica.query('SELECT id, handle, near_account, display_name, avatar_url, mode FROM users WHERE id=$1', [req.userId]);
    return u ?? null;
  });

  app.get<{ Params: { handle: string } }>('/v1/users/:handle', async (req, reply) => {
    const [u] = await db.replica.query(
      `SELECT u.id, u.handle, u.display_name, u.avatar_url, u.near_account,
        (SELECT count(*) FROM follows f WHERE f.followee_id=u.id)::int AS followers,
        (SELECT count(*) FROM follows f WHERE f.follower_id=u.id)::int AS following,
        COALESCE(s.current,0) AS streak, COALESCE(s.longest,0) AS longest_streak,
        (SELECT COALESCE(sum(xp),0) FROM xp_events x WHERE x.user_id=u.id)::int AS xp,
        (SELECT COALESCE(sum(xp),0) FROM xp_events x WHERE x.user_id=u.id AND x.created_at > now() - interval '7 days')::int AS xp_week,
        (SELECT COALESCE(sum(xp),0) FROM xp_events x WHERE x.user_id=u.id AND x.created_at >= date_trunc('day', now()))::int AS xp_today,
        (SELECT count(*) FROM posts p WHERE p.author_id=u.id)::int AS posts,
        (SELECT count(*) FROM predictions pr WHERE pr.user_id=u.id)::int AS calls,
        (SELECT count(*) FROM predictions pr JOIN markets m ON m.id=pr.market_id WHERE pr.user_id=u.id AND m.outcome IN ('YES','NO'))::int AS calls_resolved,
        (SELECT count(*) FROM predictions pr JOIN markets m ON m.id=pr.market_id WHERE pr.user_id=u.id AND ((m.outcome='YES' AND pr.outcome=1) OR (m.outcome='NO' AND pr.outcome=0)))::int AS calls_won
       FROM users u LEFT JOIN streaks s ON s.user_id=u.id WHERE u.handle=$1`,
      [req.params.handle],
    );
    return u ?? reply.code(404).send({ error: 'not_found' });
  });

  app.post<{ Params: { handle: string } }>('/v1/follows/:handle', { preHandler: requireUser }, async (req, reply) => {
    const rows = await db.primary.query<{ id: string }>(
      `INSERT INTO follows (follower_id, followee_id) SELECT $1, id FROM users WHERE handle=$2 AND id<>$1 ON CONFLICT DO NOTHING RETURNING followee_id AS id`,
      [req.userId, req.params.handle],
    );
    if (rows[0]) await notify(rows[0].id, 'follow', { from: req.userId });
    return reply.code(204).send();
  });

  app.delete<{ Params: { handle: string } }>('/v1/follows/:handle', { preHandler: requireUser }, async (req, reply) => {
    await db.primary.query('DELETE FROM follows WHERE follower_id=$1 AND followee_id=(SELECT id FROM users WHERE handle=$2)', [req.userId, req.params.handle]);
    return reply.code(204).send();
  });


  // ---- markets ----
  const MarketsQ = z.object({ status: z.enum(['open', 'proposed', 'final']).optional(), venue: z.enum(['called', 'polymarket', 'kalshi']).optional(), cursor: z.string().optional(), sort: z.enum(['new', 'volume']).default('new'), category: z.enum(['sports', 'culture', 'crypto', 'tech', 'music', 'weather']).optional() });
  app.get('/v1/markets', async (req, reply) => {
    const q = MarketsQ.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'bad_request' });
    if (q.data.sort === 'volume') {
      const items = await db.replica.query(
        `SELECT id, venue, external_id, question, price_yes, volume, volume_24h, status, outcome, close_ts, created_at, url, image_url, outcomes, category,
          (SELECT array_agg(p ORDER BY ts) FROM (SELECT price_yes::float8 AS p, ts FROM market_prices mp WHERE mp.market_id=markets.id ORDER BY ts DESC LIMIT 40) s) AS spark FROM markets
         WHERE ($1::text IS NULL OR status=$1) AND ($2::text IS NULL OR venue=$2) AND ($3::text IS NULL OR category=$3) AND close_ts > now() ORDER BY volume_24h DESC NULLS LAST, id DESC LIMIT 50`,
        [q.data.status ?? null, q.data.venue ?? null, q.data.category ?? null],
      );
      return { items, next: null };
    }
    const c = decodeCursor(q.data.cursor);
    const rows = await db.replica.query<{ id: string; created_at: Date | string }>(
      `SELECT id, venue, external_id, question, price_yes, volume, volume_24h, status, outcome, close_ts, created_at, url, image_url, outcomes, category,
          (SELECT array_agg(p ORDER BY ts) FROM (SELECT price_yes::float8 AS p, ts FROM market_prices mp WHERE mp.market_id=markets.id ORDER BY ts DESC LIMIT 40) s) AS spark FROM markets
       WHERE ($1::text IS NULL OR status=$1) AND ($2::text IS NULL OR venue=$2)
         AND ($3::timestamptz IS NULL OR (created_at, id) < ($3::timestamptz, $4::bigint))
       ORDER BY created_at DESC, id DESC LIMIT $5`,
      [q.data.status ?? null, q.data.venue ?? null, c?.t ?? null, c?.id ?? null, PAGE + 1],
    );
    const page = rows.slice(0, PAGE);
    const last = page[page.length - 1];
    return { items: page, next: rows.length > PAGE && last ? encodeCursor({ t: new Date(last.created_at).toISOString(), id: String(last.id) }) : null };
  });

  app.get<{ Params: { id: string } }>('/v1/markets/:id', async (req, reply) => {
    if (!/^\d+$/.test(req.params.id)) return reply.code(400).send({ error: 'bad_id' });
    const [m] = await db.replica.query('SELECT * FROM markets WHERE id=$1', [req.params.id]);
    if (!m) return reply.code(404).send({ error: 'not_found' });
    const trades = await db.replica.query('SELECT account, side, outcome, amount, shares, created_at FROM trades WHERE market_id=$1 ORDER BY created_at DESC LIMIT 50', [req.params.id]);
    const [resolution] = await db.replica.query('SELECT outcome, signer, signed_text, receipt_id, created_at, signature, signing_algo, model, request_json, response_json, demo FROM resolutions WHERE market_id=$1', [req.params.id]);
    const hist = await db.replica.query<{ p: number }>('SELECT price_yes::float8 AS p FROM (SELECT price_yes, ts FROM market_prices WHERE market_id=$1 ORDER BY ts DESC LIMIT 120) s ORDER BY ts', [req.params.id]);
    return { market: { ...m, spark: hist.map((h) => h.p) }, trades, resolution: resolution ?? null };
  });

  app.get<{ Params: { id: string } }>('/v1/markets/:id/comments', async (req, reply) => {
    if (!/^\d+$/.test(req.params.id)) return reply.code(400).send({ error: 'bad_id' });
    const items = await db.replica.query(
      `SELECT p.id, p.body, p.created_at, p.position, u.handle, u.display_name, u.avatar_url,
        (SELECT pp.outcome FROM play_positions pp WHERE pp.user_id=p.author_id AND pp.market_id=p.market_id AND pp.shares > 0.0001 ORDER BY pp.shares DESC LIMIT 1) AS holds,
        (SELECT pp.shares FROM play_positions pp WHERE pp.user_id=p.author_id AND pp.market_id=p.market_id AND pp.shares > 0.0001 ORDER BY pp.shares DESC LIMIT 1)::float8 AS holds_shares
       FROM posts p JOIN users u ON u.id=p.author_id WHERE p.market_id=$1 ORDER BY p.created_at DESC LIMIT 100`, [req.params.id]);
    return { items };
  });

  registerLeaderboard(app, { db });
  registerGrowth(app, { db: db.primary, requireUser, awardXp, nearTransfer: deps.nearTransfer, treasury: deps.nearTreasury, rate: deps.nearPlayRate ?? 5, demo: !!deps.config.demo });
  registerSocial(app, { db, bus, kv, jobs, requireUser, notify, awardXp, verifyTip: deps.verifyTip, demo: deps.config.demo });
  registerExternal(app, { db: db.primary, requireUser, requireRealMoneyRegion, router: deps.router ?? null, kvHit: (k, t) => kv.hit(k, t) });

  // Live AI preview for the create screen. Nothing is stored; the real draft is made when the post is published.
  const PreviewBody = z.object({ text: z.string().trim().min(8).max(1000) });
  app.post('/v1/drafts/preview', { preHandler: requireUser }, async (req, reply) => {
    const n = await kv.hit(`rl:draftpv:${req.userId}:${Math.floor(Date.now() / 60_000)}`, 60);
    if (n > 20) return reply.code(429).send({ error: 'rate_limited' });
    const b = PreviewBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'bad_text' });
    if (isExcludedMarket({ question: b.data.text })) return { status: 'policy', draft: null, message: POLICY_MESSAGE };
    const d = deps.drafter;
    if (!d) return reply.code(503).send({ error: 'drafter_unavailable' });
    try {
      const res = await (d.fetch ?? fetch)(new URL('/draft', d.url), {
        method: 'POST', headers: { 'content-type': 'application/json', ...(d.token ? { authorization: `Bearer ${d.token}` } : {}) },
        body: JSON.stringify({ post: b.data.text }), signal: AbortSignal.timeout(25_000),
      });
      if (!res.ok) throw new Error(`resolver ${res.status}`);
      const r = DraftResponse.parse(await res.json());
      if (r.draft && isExcludedMarket({ question: `${r.draft.question} ${r.draft.rules ?? ''}` })) return { status: 'policy', draft: null, message: POLICY_MESSAGE };
      return { status: r.draft ? 'ready' : 'unclear', mode: r.mode, draft: r.draft };
    } catch (e) {
      req.log.warn({ err: e }, 'draft preview failed');
      return reply.code(502).send({ error: 'drafter_error' });
    }
  });

  app.get('/v1/drafts', { preHandler: requireUser }, async (req) => ({
    items: await db.replica.query(`SELECT d.id, d.post_id, d.status, d.mode, d.draft, d.created_at, p.market_id::text AS market_id,
       (SELECT json_build_object('outcome', o.outcome, 'amount', o.amount::float, 'status', o.status, 'error', o.error) FROM opening_calls o WHERE o.post_id=d.post_id) AS opening
     FROM market_drafts d JOIN posts p ON p.id=d.post_id WHERE d.author_id=$1 ORDER BY d.created_at DESC LIMIT 20`, [req.userId]),
  }));

  const PushToken = z.object({ token: z.string().regex(/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/), platform: z.enum(['ios', 'android', 'web']) });
  app.post('/v1/push-tokens', { preHandler: requireUser }, async (req, reply) => {
    const b = PushToken.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'bad_request' });
    await db.primary.query('INSERT INTO push_tokens (token, user_id, platform) VALUES ($1,$2,$3) ON CONFLICT (token) DO UPDATE SET user_id=EXCLUDED.user_id', [b.data.token, req.userId, b.data.platform]);
    return reply.code(204).send();
  });

  // ---- free predictions (points mode) ----
  const Predict = z.object({ marketId: z.string().regex(/^\d+$/), outcome: z.union([z.literal(0), z.literal(1)]) });
  app.post('/v1/predictions', { preHandler: requireUser }, async (req, reply) => {
    const b = Predict.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'bad_request' });
    const [m] = await db.primary.query<{ price_yes: string }>("SELECT price_yes FROM markets WHERE id=$1 AND status='open' AND close_ts > now()", [b.data.marketId]);
    if (!m) return reply.code(409).send({ error: 'market_closed' });
    const ins = await db.primary.query(
      'INSERT INTO predictions (user_id, market_id, outcome, price_yes) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING 1',
      [req.userId, b.data.marketId, b.data.outcome, m.price_yes],
    );
    if (!ins.length) return reply.code(409).send({ error: 'already_called' });
    await awardXp(String(req.userId), 'call', 10);
    const [st] = await db.primary.query<{ streak: number; xp: number; xp_today: number }>(
      `SELECT COALESCE(s.current,0) AS streak,
        (SELECT COALESCE(sum(xp),0) FROM xp_events WHERE user_id=$1)::int AS xp,
        (SELECT COALESCE(sum(xp),0) FROM xp_events WHERE user_id=$1 AND created_at >= date_trunc('day', now()))::int AS xp_today
       FROM (SELECT 1) one LEFT JOIN streaks s ON s.user_id=$1`, [req.userId]);
    const [crowd] = await db.primary.query<{ yes: number; total: number }>('SELECT count(*) FILTER (WHERE outcome=1)::int AS yes, count(*)::int AS total FROM predictions WHERE market_id=$1', [b.data.marketId]);
    return reply.code(201).send({ xpGained: 10, streak: Number(st?.streak ?? 0), xp: Number(st?.xp ?? 0), xpToday: Number(st?.xp_today ?? 0), crowd });
  });

  app.get('/v1/daily', { preHandler: requireUser }, async (req) => ({
    items: await db.replica.query(
      `SELECT m.id, m.venue, m.question, m.price_yes, m.volume, m.volume_24h, m.close_ts, m.image_url, m.outcomes, m.status, m.outcome, m.created_at, m.external_id
       FROM markets m WHERE m.status='open' AND m.close_ts > now() + interval '1 hour'
         AND NOT EXISTS (SELECT 1 FROM predictions p WHERE p.user_id=$1 AND p.market_id=m.id)
         AND (m.outcomes->>0) IN ('NO','Yes','YES')
       ORDER BY (m.venue='called') DESC, m.volume_24h DESC LIMIT 5`, [req.userId]),
  }));

  app.get('/v1/predictions/mine', { preHandler: requireUser }, async (req) => ({
    items: await db.replica.query(`SELECT p.market_id, p.outcome, p.price_yes, p.created_at, m.question, m.venue, m.image_url, m.outcomes, m.status, m.outcome AS result, m.close_ts,
            m.price_yes AS price_now, m.volume_24h, m.volume
       FROM predictions p JOIN markets m ON m.id=p.market_id WHERE p.user_id=$1 ORDER BY p.created_at DESC LIMIT 200`, [req.userId]),
  }));

  // ---- leaderboards & notifications ----
  const LbQ = z.object({ window: z.enum(['24h', '7d', '30d']).default('7d') });
  app.get('/v1/leaderboards', async (req, reply) => {
    const q = LbQ.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'bad_request' });
    const top = await kv.zrevrange(`lb:${q.data.window}:volume`, 0, 49);
    if (top.length === 0) return { window: q.data.window, items: [] };
    const users = await db.replica.query<{ id: string; handle: string; display_name: string; avatar_url: string | null }>(
      'SELECT id, handle, display_name, avatar_url FROM users WHERE id = ANY($1::bigint[])',
      [top.map((t) => t.member)],
    );
    const byId = new Map(users.map((u) => [String(u.id), u]));
    return { window: q.data.window, items: top.flatMap((t, i) => { const u = byId.get(t.member); return u ? [{ rank: i + 1, score: t.score, ...u }] : []; }) };
  });


  // ---- realtime ----
  void app.register(async (scope) => {
    scope.get('/v1/live', { websocket: true }, (socket, req) => {
      socket.on('message', (raw: Buffer) => {
        let m: { op?: string; channel?: string };
        try {
          m = JSON.parse(raw.toString()) as typeof m;
        } catch {
          return;
        }
        if (typeof m.channel !== 'string') return;
        if (m.op === 'sub') void hub.subscribe(socket, m.channel, req.userId).then((ok) => socket.send(JSON.stringify({ type: ok ? 'subscribed' : 'denied', channel: m.channel })));
        else if (m.op === 'unsub') void hub.unsubscribe(socket, m.channel);
      });
      socket.on('close', () => void hub.drop(socket));
    });
  });

  app.addHook('onClose', async () => hub.close());

  // ---- helpers ----
  async function notify(userId: string, kind: string, payload: Record<string, unknown>) {
    const [n] = await db.primary.query<{ id: string }>('INSERT INTO notifications (user_id, kind, payload) VALUES ($1,$2,$3) RETURNING id', [userId, kind, JSON.stringify(payload)]);
    await bus.publish(`notifications:${userId}`, JSON.stringify({ type: 'notification', data: { id: n?.id, kind, payload }, ts: Date.now() }));
    await jobs.enqueue('notify', { userId, kind, payload });
  }

  /** XP and streaks are non-monetary by design (Apple 3.1.5(v)). */
  async function awardXp(userId: string, kind: string, xp: number) {
    await db.primary.query('INSERT INTO xp_events (user_id, kind, xp) VALUES ($1,$2,$3)', [userId, kind, xp]);
    await db.primary.query(
      `INSERT INTO streaks (user_id, current, longest, last_day) VALUES ($1,1,1,CURRENT_DATE)
       ON CONFLICT (user_id) DO UPDATE SET
         current = CASE WHEN streaks.last_day = CURRENT_DATE THEN streaks.current
                        WHEN streaks.last_day = CURRENT_DATE - 1 THEN streaks.current + 1 ELSE 1 END,
         longest = GREATEST(streaks.longest, CASE WHEN streaks.last_day = CURRENT_DATE - 1 THEN streaks.current + 1 ELSE streaks.current END),
         last_day = CURRENT_DATE`,
      [userId],
    );
    await kv.zincrby(`division:${isoWeek()}`, xp, userId);
  }

  return app;
}

function isoWeek(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${Math.ceil(((t.getTime() - y.getTime()) / 86_400_000 + 1) / 7)}`;
}
