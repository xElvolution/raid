/**
 * Social layer: rich posts (threads, quotes, recasts, likes, bookmarks, tips), the Caller Card profile
 * with stats, channels, DMs, search, trending and copy calls. All reads are keyset-paginated or capped.
 */
import { themeFor, type BattleTheme } from '@called/sdk';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { saveOpening } from './opening.js';
import { decodeCursor, encodeCursor } from './cursor.js';
import type { Db } from './db/index.js';
import type { Bus, Kv } from './infra/bus.js';
import type { Jobs } from './infra/queue.js';
import { must } from './must.js';

type Guard = (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
export interface SocialDeps {
  db: { primary: Db; replica: Db }; bus: Bus; kv: Kv; jobs: Jobs; requireUser: Guard;
  notify: (userId: string, kind: string, payload: Record<string, unknown>) => Promise<void>;
  awardXp: (userId: string, kind: string, xp: number) => Promise<void>;
  /** Verifies a NEAR transfer tx: returns true when `hash` sent >= yocto from `from` to `to`. */
  verifyTip?: (hash: string, from: string, to: string, yocto: bigint) => Promise<boolean>;
  demo?: boolean;
}

const PAGE = 30;
const Id = z.string().regex(/^\d+$/);
const Handle = z.string().regex(/^[a-z0-9_]{3,20}$/);
const MENTION = /@([a-z0-9_]{3,20})/g;
const TAG = /#([A-Za-z0-9_]{2,30})/g;

/** Post projection with counts, quoted post and viewer flags. `$v` is the viewer id param index. */
const postSelect = (v: number) => `
  SELECT p.id, p.body, p.created_at, p.position, p.reply_to, p.quote_of, p.media_url, p.channel, p.raid_id, p.coin,
    u.handle, u.display_name, u.avatar_url, u.verified, u.near_account,
    m.id AS market_id, m.question, m.price_yes, m.status, m.venue, m.close_ts, m.image_url AS market_image, m.category AS market_category, m.volume AS market_volume,
    (SELECT count(*) FROM post_likes l WHERE l.post_id=p.id)::int AS likes,
    (SELECT count(*) FROM post_recasts r WHERE r.post_id=p.id)::int AS recasts,
    (SELECT count(*) FROM posts c WHERE c.reply_to=p.id)::int AS replies,
    (SELECT count(*) FROM posts q WHERE q.quote_of=p.id)::int AS quotes,
    (SELECT COALESCE(sum(t.amount_yocto),0)::text FROM tips t WHERE t.post_id=p.id AND t.status IN ('verified','demo')) AS tips_yocto,
    (SELECT pu.handle FROM posts pp JOIN users pu ON pu.id=pp.author_id WHERE pp.id=p.reply_to) AS reply_to_handle,
    (SELECT json_build_object('id', q.id::text, 'body', q.body, 'created_at', q.created_at, 'handle', qu.handle, 'display_name', qu.display_name, 'avatar_url', qu.avatar_url, 'media_url', q.media_url, 'raid_id', q.raid_id, 'near_account', qu.near_account)
       FROM posts q JOIN users qu ON qu.id=q.author_id WHERE q.id=p.quote_of) AS quoted,
    COALESCE(EXISTS(SELECT 1 FROM post_likes l WHERE l.post_id=p.id AND l.user_id=$${v}), false) AS liked,
    COALESCE(EXISTS(SELECT 1 FROM post_recasts r WHERE r.post_id=p.id AND r.user_id=$${v}), false) AS recasted,
    COALESCE(EXISTS(SELECT 1 FROM bookmarks b WHERE b.post_id=p.id AND b.user_id=$${v}), false) AS bookmarked,
    (SELECT pp.outcome FROM play_positions pp WHERE pp.user_id=p.author_id AND pp.market_id=p.market_id AND pp.shares > 0.0001 ORDER BY pp.shares DESC LIMIT 1) AS holds
  FROM posts p JOIN users u ON u.id=p.author_id LEFT JOIN markets m ON m.id=p.market_id`;

type Row = { id: string; created_at: Date | string } & Record<string, unknown>;
const page = (rows: Row[], key: 'created_at' = 'created_at') => {
  const items = rows.slice(0, PAGE), last = items[items.length - 1];
  return { items, next: rows.length > PAGE && last ? encodeCursor({ t: new Date(last[key] as string).toISOString(), id: String(last.id) }) : null };
};

/** Brier-based calibration on settled play positions: 100 = perfect, 0 = coin-flip, clamped. */
export function calibrationScore(rows: { p: number; won: boolean }[]): number | null {
  if (rows.length < 3) return null;
  const brier = rows.reduce((s, r) => s + (r.p - (r.won ? 1 : 0)) ** 2, 0) / rows.length;
  return Math.max(0, Math.min(100, Math.round((1 - brier / 0.25) * 100)));
}

export function registerSocial(app: FastifyInstance, deps: SocialDeps) {
  const { db, bus, kv, requireUser, notify } = deps;
  const viewer = (req: FastifyRequest) => (req.userId ? String(req.userId) : null);
  const userId = async (handle: string) => (await db.replica.query<{ id: string }>('SELECT id FROM users WHERE handle=$1', [handle]))[0]?.id;
  const limit = async (req: FastifyRequest, reply: FastifyReply, key: string, max: number) => {
    const n = await kv.hit(`rl:${key}:${req.userId}:${Math.floor(Date.now() / 60_000)}`, 60);
    if (n > max) { void reply.code(429).send({ error: 'rate_limited' }); return false; }
    return true;
  };
  const listPosts = async (where: string, params: unknown[], v: string | null, cursor?: string, order = 'p.created_at DESC, p.id DESC') => {
    const c = decodeCursor(cursor);
    const ps = [...params, c?.t ?? null, c?.id ?? null, PAGE + 1, v];
    const n = params.length;
    const rows = await db.replica.query<Row>(
      `${postSelect(n + 4)} WHERE ${where} AND ($${n + 1}::timestamptz IS NULL OR (p.created_at, p.id) < ($${n + 1}::timestamptz, $${n + 2}::bigint)) ORDER BY ${order} LIMIT $${n + 3}`, ps);
    return page(rows);
  };

  // ---------- posts ----------
  const NewPost = z.object({
    body: z.string().trim().min(1).max(3000),
    marketId: Id.optional(), makeMarket: z.boolean().default(false),
    replyTo: Id.optional(), quoteOf: Id.optional(),
    mediaUrl: z.string().url().max(500).refine((u) => /^https:\/\//.test(u) || u.startsWith('/'), 'https only').optional(),
    channel: z.string().regex(/^[a-z0-9-]{2,24}$/).optional(),
    /** RAID: the raid this post is about, and the token it tags. */
    raidId: z.number().int().min(0).optional(),
    coin: z.string().regex(/^[A-Z0-9]{2,12}$/).optional(),
    /** Call it: creator's opening play-money call, placed when the market goes live. */
    opening: z.object({ outcome: z.union([z.literal(0), z.literal(1)]), amount: z.number().positive().max(1000) }).optional(),
  }).refine((d) => !d.opening || d.makeMarket, 'opening needs makeMarket');
  app.post('/v1/posts', { preHandler: requireUser }, async (req, reply) => {
    if (!(await limit(req, reply, 'post', 60))) return;
    const b = NewPost.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'bad_request', issues: b.error.issues.map((i) => i.message) });
    const d = b.data, me = String(req.userId);
    if (d.channel && !(await db.replica.query('SELECT 1 FROM channels WHERE slug=$1', [d.channel])).length) return reply.code(404).send({ error: 'channel_not_found' });
    const [p] = await db.primary.query<{ id: string; created_at: string }>(
      'INSERT INTO posts (author_id, body, market_id, reply_to, quote_of, media_url, channel, raid_id, coin) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, created_at',
      [me, d.body, d.marketId ?? null, d.replyTo ?? null, d.quoteOf ?? null, d.mediaUrl ?? null, d.channel ?? null, d.raidId ?? null, d.coin ?? (d.body.match(/\$([A-Z][A-Z0-9]{1,11})\b/)?.[1] ?? null)]);
    if (!p) return reply.code(500).send({ error: 'insert_failed' });
    await deps.awardXp(me, d.replyTo ? 'reply' : 'post', d.replyTo ? 2 : 5);
    if (d.opening) await saveOpening(db.primary, p.id, me, d.opening);
    if (d.makeMarket) await deps.jobs.enqueue('draft-market', { postId: p.id }, { jobId: `post-${p.id}` });
    // Notifications: reply / quote to the parent author, mentions to each handle (once, never self).
    const told = new Set<string>([me]);
    const parentOf = async (id?: string) => id ? (await db.replica.query<{ author_id: string }>('SELECT author_id FROM posts WHERE id=$1', [id]))[0]?.author_id : undefined;
    const rp = await parentOf(d.replyTo), qp = await parentOf(d.quoteOf);
    if (rp && !told.has(String(rp))) { told.add(String(rp)); await notify(String(rp), 'reply', { from: me, postId: p.id, body: d.body.slice(0, 140) }); }
    if (qp && !told.has(String(qp))) { told.add(String(qp)); await notify(String(qp), 'quote', { from: me, postId: p.id, body: d.body.slice(0, 140) }); }
    for (const [, h] of d.body.matchAll(MENTION)) {
      const id = await userId(must(h, 'mention')); if (id && !told.has(String(id))) { told.add(String(id)); await notify(String(id), 'mention', { from: me, postId: p.id, body: d.body.slice(0, 140) }); }
    }
    const msg = JSON.stringify({ type: 'post', data: { id: p.id, authorId: me }, ts: Date.now() });
    await bus.publish('feed:global', msg);
    await bus.publish(`feed:user:${me}`, msg);
    return reply.code(201).send({ id: p.id, createdAt: p.created_at });
  });

  const FeedQ = z.object({ tab: z.enum(['foryou', 'following', 'tokens']).default('foryou'), cursor: z.string().optional(), author: Handle.optional(), channel: z.string().regex(/^[a-z0-9-]{2,24}$/).optional() });
  app.get('/v1/feed', async (req, reply) => {
    const q = FeedQ.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'bad_request' });
    if (q.data.tab === 'following' && !req.userId) return reply.code(401).send({ error: 'auth_required' });
    const params: unknown[] = []; let where = 'p.reply_to IS NULL';
    if (q.data.tab === 'following') { params.push(req.userId); where += ` AND p.author_id IN (SELECT followee_id FROM follows WHERE follower_id=$${params.length})`; }
    if (q.data.tab === 'tokens') where += ` AND p.coin IS NOT NULL`;
    if (q.data.author) { params.push(q.data.author); where += ` AND u.handle=$${params.length}`; }
    if (q.data.channel) { params.push(q.data.channel); where += ` AND p.channel=$${params.length}`; }
    return listPosts(where, params, viewer(req), q.data.cursor);
  });

  app.get<{ Params: { id: string } }>('/v1/posts/:id', async (req, reply) => {
    if (!Id.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad_id' });
    const v = viewer(req);
    const [post] = await db.replica.query<Row>(`${postSelect(2)} WHERE p.id=$1`, [req.params.id, v]);
    if (!post) return reply.code(404).send({ error: 'not_found' });
    const ancestors = await db.replica.query<Row>(
      `WITH RECURSIVE up AS (SELECT reply_to AS id, 1 AS depth FROM posts WHERE id=$1 UNION ALL SELECT p.reply_to, up.depth+1 FROM posts p JOIN up ON p.id=up.id WHERE up.depth < 20)
       ${postSelect(2)} JOIN up ON up.id=p.id ORDER BY up.depth DESC`, [req.params.id, v]);
    const replies = await db.replica.query<Row>(`${postSelect(2)} WHERE p.reply_to=$1 ORDER BY (SELECT count(*) FROM post_likes l WHERE l.post_id=p.id) DESC, p.created_at ASC LIMIT 100`, [req.params.id, v]);
    return { post, ancestors, replies };
  });

  // Reactions: like / recast / bookmark share one shape. Recasts and likes notify the author.
  const REACT = { like: ['post_likes', 'like'], recast: ['post_recasts', 'recast'], bookmark: ['bookmarks', null] } as const;
  for (const [kind, [table, note]] of Object.entries(REACT)) {
    app.post<{ Params: { id: string } }>(`/v1/posts/:id/${kind}`, { preHandler: requireUser }, async (req, reply) => {
      if (!Id.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad_id' });
      if (!(await limit(req, reply, 'react', 120))) return;
      const ins = await db.primary.query<{ author_id: string }>(
        `WITH ins AS (INSERT INTO ${table} (user_id, post_id) SELECT $1, id FROM posts WHERE id=$2 ON CONFLICT DO NOTHING RETURNING post_id)
         SELECT p.author_id FROM ins JOIN posts p ON p.id=ins.post_id`, [req.userId, req.params.id]);
      const author = ins[0]?.author_id;
      if (note && author && String(author) !== String(req.userId)) await notify(String(author), note, { from: String(req.userId), postId: req.params.id });
      const [c] = await db.primary.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table} WHERE post_id=$1`, [req.params.id]);
      return { on: true, count: c?.n ?? 0 };
    });
    app.delete<{ Params: { id: string } }>(`/v1/posts/:id/${kind}`, { preHandler: requireUser }, async (req, reply) => {
      if (!Id.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad_id' });
      await db.primary.query(`DELETE FROM ${table} WHERE user_id=$1 AND post_id=$2`, [req.userId, req.params.id]);
      const [c] = await db.primary.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table} WHERE post_id=$1`, [req.params.id]);
      return { on: false, count: c?.n ?? 0 };
    });
  }
  app.get('/v1/bookmarks', { preHandler: requireUser }, async (req) =>
    listPosts('p.id IN (SELECT post_id FROM bookmarks WHERE user_id=$1)', [req.userId], viewer(req), (req.query as { cursor?: string }).cursor));

  // Tips: NEAR transfer to the author. Verified on-chain when a tx hash is given; demo mode records unsigned demo tips.
  const TipBody = z.object({ amountNear: z.string().regex(/^\d+(\.\d{1,6})?$/), txHash: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{43,44}$/).optional() });
  app.post<{ Params: { id: string } }>('/v1/posts/:id/tips', { preHandler: requireUser }, async (req, reply) => {
    if (!(await limit(req, reply, 'tip', 10))) return;
    const b = TipBody.safeParse(req.body);
    if (!b.success || !Id.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad_request' });
    const [whole, frac = ''] = b.data.amountNear.split('.');
    const yocto = BigInt(whole || '0') * 10n ** 24n + BigInt((frac + '000000').slice(0, 6)) * 10n ** 18n;
    if (yocto <= 0n || yocto > 1000n * 10n ** 24n) return reply.code(400).send({ error: 'bad_amount' });
    const [p] = await db.replica.query<{ author_id: string; to_acct: string; from_acct: string }>(
      'SELECT p.author_id, a.near_account AS to_acct, (SELECT near_account FROM users WHERE id=$2) AS from_acct FROM posts p JOIN users a ON a.id=p.author_id WHERE p.id=$1', [req.params.id, req.userId]);
    if (!p) return reply.code(404).send({ error: 'not_found' });
    if (String(p.author_id) === String(req.userId)) return reply.code(400).send({ error: 'self_tip' });
    let status: 'verified' | 'demo' | 'pending';
    if (b.data.txHash) {
      if (!deps.verifyTip) return reply.code(503).send({ error: 'tips_unavailable' });
      const ok = await deps.verifyTip(b.data.txHash, p.from_acct, p.to_acct, yocto).catch((e) => { req.log.warn({ err: e }, 'tip verify failed'); return false; });
      if (!ok) return reply.code(422).send({ error: 'tip_not_verified' });
      status = 'verified';
    } else if (deps.demo) status = 'demo';
    else return reply.code(400).send({ error: 'tx_required' });
    try {
      await db.primary.query('INSERT INTO tips (post_id, from_id, to_id, amount_yocto, tx_hash, status) VALUES ($1,$2,$3,$4,$5,$6)', [req.params.id, req.userId, p.author_id, yocto.toString(), b.data.txHash ?? null, status]);
    } catch { return reply.code(409).send({ error: 'tip_already_recorded' }); }
    await notify(String(p.author_id), 'tip', { from: String(req.userId), postId: req.params.id, amountNear: b.data.amountNear, demo: status === 'demo' });
    return reply.code(201).send({ status });
  });

  // ---------- profile ----------
  app.get<{ Params: { handle: string } }>('/v1/users/:handle/profile', async (req, reply) => {
    if (!Handle.safeParse(req.params.handle).success) return reply.code(400).send({ error: 'bad_handle' });
    const v = viewer(req);
    const [u] = await db.replica.query<Record<string, unknown> & { id: string }>(
      `SELECT u.id, u.handle, u.display_name, u.avatar_url, u.cover_url, u.bio, u.links, u.location, u.verified, u.near_account, u.created_at, u.pinned_post_id,
        (SELECT count(*) FROM follows f WHERE f.followee_id=u.id)::int AS followers,
        (SELECT count(*) FROM follows f WHERE f.follower_id=u.id)::int AS following,
        (SELECT count(*) FROM posts p WHERE p.author_id=u.id AND p.reply_to IS NULL)::int AS posts,
        COALESCE(s.current,0) AS streak, COALESCE(s.longest,0) AS longest_streak,
        (SELECT COALESCE(sum(xp),0) FROM xp_events x WHERE x.user_id=u.id)::int AS xp,
        COALESCE(EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=$2 AND f.followee_id=u.id), false) AS am_following,
        COALESCE(EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=u.id AND f.followee_id=$2), false) AS follows_me,
        COALESCE(EXISTS(SELECT 1 FROM copy_subscriptions c WHERE c.follower_id=$2 AND c.leader_id=u.id), false) AS am_copying,
        (SELECT count(*) FROM copy_subscriptions c WHERE c.leader_id=u.id)::int AS copiers
       FROM users u LEFT JOIN streaks s ON s.user_id=u.id WHERE u.handle=$1`, [req.params.handle, v]);
    if (!u) return reply.code(404).send({ error: 'not_found' });
    const uid = u.id;
    const mutuals = v ? await db.replica.query(
      `SELECT x.handle, x.display_name, x.avatar_url FROM follows a JOIN follows b ON b.follower_id=a.followee_id AND b.followee_id=$2 JOIN users x ON x.id=a.followee_id
       WHERE a.follower_id=$1 AND a.followee_id<>$2 LIMIT 3`, [v, uid]) : [];
    // Settled calls: play positions (priced) unioned with free calls, one per market, newest first.
    const settled = await db.replica.query<{ market_id: string; question: string; category: string | null; image_url: string | null; outcome: number; won: boolean; p: number | null; cost: number | null; payout: number | null; settled_at: string; kind: string }>(
      `SELECT * FROM (
         SELECT DISTINCT ON (m.id) m.id::text AS market_id, m.question, m.category, m.image_url, pp.outcome, ((m.outcome='YES') = (pp.outcome=1)) AS won,
           CASE WHEN pp.shares > 0 THEN (pp.cost/pp.shares)::float8 END AS p, pp.cost::float8 AS cost, CASE WHEN (m.outcome='YES') = (pp.outcome=1) THEN pp.shares::float8 ELSE 0 END AS payout,
           m.close_ts AS settled_at, 'trade' AS kind
         FROM play_positions pp JOIN markets m ON m.id=pp.market_id WHERE pp.user_id=$1 AND m.outcome IN ('YES','NO') AND (pp.shares > 0 OR pp.cost > 0)
         ORDER BY m.id, pp.cost DESC
       ) t
       UNION ALL
       SELECT m.id::text, m.question, m.category, m.image_url, pr.outcome, ((m.outcome='YES') = (pr.outcome=1)), CASE WHEN pr.outcome=1 THEN pr.price_yes::float8 ELSE 1 - pr.price_yes::float8 END, NULL, NULL, m.close_ts, 'call'
       FROM predictions pr JOIN markets m ON m.id=pr.market_id WHERE pr.user_id=$1 AND m.outcome IN ('YES','NO')
         AND NOT EXISTS (SELECT 1 FROM play_positions pp WHERE pp.user_id=$1 AND pp.market_id=m.id)
       ORDER BY settled_at DESC LIMIT 200`, [uid]);
    const won = settled.filter((s) => s.won).length;
    const calib = calibrationScore(settled.flatMap((s) => (s.p === null ? [] : [{ p: s.p, won: s.won }])));
    const [vol] = await db.replica.query<{ v: number; n: number }>('SELECT COALESCE(sum(amount),0)::float8 AS v, count(*)::int AS n FROM play_trades WHERE user_id=$1', [uid]);
    const [acct] = await db.replica.query<{ balance: number; deposited: number }>('SELECT balance::float8 AS balance, deposited::float8 AS deposited FROM play_accounts WHERE user_id=$1', [uid]);
    const open = await db.replica.query<{ shares: number; outcome: number; price_yes: number }>(
      "SELECT pp.shares::float8 AS shares, pp.outcome, m.price_yes::float8 AS price_yes FROM play_positions pp JOIN markets m ON m.id=pp.market_id WHERE pp.user_id=$1 AND pp.shares > 0.0001 AND m.status='open'", [uid]);
    const posValue = open.reduce((s, o) => s + o.shares * (o.outcome ? o.price_yes : 1 - o.price_yes), 0);
    const pnl = acct ? acct.balance + posValue - acct.deposited : 0;
    const [rank] = await db.replica.query<{ r: number; of: number }>(
      `WITH v AS (SELECT a.user_id, a.balance + COALESCE((SELECT sum(pp.shares * CASE WHEN pp.outcome=1 THEN m.price_yes ELSE 1-m.price_yes END) FROM play_positions pp JOIN markets m ON m.id=pp.market_id WHERE pp.user_id=a.user_id AND m.status='open'),0) - a.deposited AS pnl FROM play_accounts a)
       SELECT (SELECT count(*) FROM v WHERE pnl > (SELECT pnl FROM v WHERE user_id=$1))::int + 1 AS r, (SELECT count(*) FROM v)::int AS of`, [uid]);
    // Battle record: every market this caller took a side on, grouped by battle theme.
    const sides = await db.replica.query<{ question: string; category: string | null; outcome: number; result: string | null }>(
      `SELECT m.question, m.category, x.outcome, m.outcome AS result FROM (
         SELECT market_id, outcome FROM play_positions WHERE user_id=$1 UNION SELECT market_id, outcome FROM predictions WHERE user_id=$1) x JOIN markets m ON m.id=x.market_id`, [uid]);
    const battle = new Map<BattleTheme, { theme: BattleTheme; fought: number; yes: number; no: number; won: number; settled: number }>();
    for (const s of sides) {
      const t = themeFor(s.category, s.question);
      const b = battle.get(t) ?? { theme: t, fought: 0, yes: 0, no: 0, won: 0, settled: 0 };
      b.fought++; if (s.outcome) b.yes++; else b.no++;
      if (s.result === 'YES' || s.result === 'NO') { b.settled++; if ((s.result === 'YES') === (s.outcome === 1)) b.won++; }
      battle.set(t, b);
    }
    const channels = await db.replica.query('SELECT c.slug, c.name, c.theme FROM channel_members cm JOIN channels c ON c.slug=cm.slug WHERE cm.user_id=$1 ORDER BY cm.created_at', [uid]);
    const [created] = await db.replica.query<{ n: number }>('SELECT count(*)::int AS n FROM markets WHERE creator_id=$1', [uid]);
    const [tipsIn] = await db.replica.query<{ y: string }>("SELECT COALESCE(sum(amount_yocto),0)::text AS y FROM tips WHERE to_id=$1 AND status IN ('verified','demo')", [uid]);
    const pinned = u.pinned_post_id ? (await db.replica.query<Row>(`${postSelect(2)} WHERE p.id=$1`, [u.pinned_post_id, v]))[0] ?? null : null;
    // Best streak of consecutive wins in settled order (oldest → newest).
    let run = 0, bestRun = 0; for (const s of [...settled].reverse()) { run = s.won ? run + 1 : 0; bestRun = Math.max(bestRun, run); }
    const stats = {
      called: won, settled: settled.length, winRate: settled.length ? won / settled.length : null, calibration: calib,
      pnl, volume: vol?.v ?? 0, trades: vol?.n ?? 0, rank: rank?.r ?? null, rankOf: rank?.of ?? null, bestWinRun: bestRun, created: created?.n ?? 0, tipsYocto: tipsIn?.y ?? '0',
    };
    const badges = [
      won >= 1 && { id: 'first-call', label: 'First call', detail: 'Won a settled call' },
      won >= 10 && { id: 'ten-called', label: 'Ten called', detail: '10 winning calls' },
      bestRun >= 3 && { id: 'hot-hand', label: 'Hot hand', detail: `${bestRun} wins in a row` },
      calib !== null && calib >= 60 && { id: 'sharp', label: 'Sharp', detail: `Calibration ${calib}` },
      Number(u.longest_streak) >= 7 && { id: 'week-streak', label: 'Seven-day streak', detail: `Longest ${u.longest_streak} days` },
      battle.size >= 4 && { id: 'all-rounder', label: 'All-rounder', detail: `${battle.size} battle themes` },
      (created?.n ?? 0) >= 1 && { id: 'market-maker', label: 'Market maker', detail: `${created?.n} markets created` },
      (stats.rank ?? 99) <= 3 && { id: 'podium', label: 'Podium', detail: `Rank #${stats.rank}` },
      Number(u.copiers) >= 1 && { id: 'copied', label: 'Copied', detail: `${u.copiers} copying` },
    ].filter(Boolean);
    return {
      user: u, mutuals, stats, badges, pinned, channels,
      record: settled.slice(0, 30).map((s) => ({ marketId: s.market_id, question: s.question, category: s.category, theme: themeFor(s.category, s.question), won: s.won, outcome: s.outcome, settledAt: s.settled_at, pnl: s.cost !== null ? Math.round(((s.payout ?? 0) - s.cost) * 100) / 100 : null })),
      battle: [...battle.values()].sort((a, b) => b.fought - a.fought),
    };
  });

  const Range = z.enum(['1h', '1d', '1w', '1m', 'all']).default('1w');
  app.get<{ Params: { handle: string }; Querystring: { range?: string } }>('/v1/users/:handle/equity', async (req, reply) => {
    const r = Range.safeParse(req.query.range); const id = await userId(req.params.handle);
    if (!r.success || !id) return reply.code(id ? 400 : 404).send({ error: id ? 'bad_range' : 'not_found' });
    const since = { '1h': "now() - interval '1 hour'", '1d': "now() - interval '1 day'", '1w': "now() - interval '7 days'", '1m': "now() - interval '30 days'", all: "'-infinity'::timestamptz" }[r.data];
    const pts = await db.replica.query<{ ts: string; value: number }>(`SELECT ts, value::float8 AS value FROM play_value_history WHERE user_id=$1 AND ts >= ${since} ORDER BY ts`, [id]);
    const [a] = await db.replica.query<{ deposited: number }>('SELECT deposited::float8 AS deposited FROM play_accounts WHERE user_id=$1', [id]);
    return { range: r.data, baseline: a?.deposited ?? 1000, points: pts.map((p) => ({ t: new Date(p.ts).getTime(), v: p.value })) };
  });

  const Tab = z.enum(['posts', 'replies', 'media', 'likes']).default('posts');
  app.get<{ Params: { handle: string }; Querystring: { tab?: string; cursor?: string } }>('/v1/users/:handle/posts', async (req, reply) => {
    const t = Tab.safeParse(req.query.tab); const id = await userId(req.params.handle);
    if (!t.success || !id) return reply.code(id ? 400 : 404).send({ error: id ? 'bad_tab' : 'not_found' });
    const where = { posts: 'p.author_id=$1 AND p.reply_to IS NULL', replies: 'p.author_id=$1 AND p.reply_to IS NOT NULL', media: 'p.author_id=$1 AND p.media_url IS NOT NULL', likes: 'p.id IN (SELECT post_id FROM post_likes WHERE user_id=$1)' }[t.data];
    return listPosts(where, [id], viewer(req), req.query.cursor);
  });

  app.get<{ Params: { handle: string } }>('/v1/users/:handle/calls', async (req, reply) => {
    const id = await userId(req.params.handle); if (!id) return reply.code(404).send({ error: 'not_found' });
    const rows = await db.replica.query<{ market_id: string; question: string; image_url: string | null; category: string | null; outcome: number; shares: number; cost: number; price_yes: number; close_ts: string }>(
      `SELECT m.id::text AS market_id, m.question, m.image_url, m.category, pp.outcome, pp.shares::float8 AS shares, pp.cost::float8 AS cost, m.price_yes::float8 AS price_yes, m.close_ts
       FROM play_positions pp JOIN markets m ON m.id=pp.market_id WHERE pp.user_id=$1 AND pp.shares > 0.0001 AND m.status='open' ORDER BY pp.cost DESC LIMIT 100`, [id]);
    return { items: rows.map((r) => { const px = r.outcome ? r.price_yes : 1 - r.price_yes, value = r.shares * px; return { ...r, avg: r.cost / r.shares, price: px, value, pnl: value - r.cost, pnlPct: r.cost ? (value - r.cost) / r.cost : 0 }; }) };
  });

  app.get<{ Params: { handle: string } }>('/v1/users/:handle/history', async (req, reply) => {
    const id = await userId(req.params.handle); if (!id) return reply.code(404).send({ error: 'not_found' });
    const rows = await db.replica.query<{ market_id: string; question: string; image_url: string | null; category: string | null; outcome: number; result: string; shares: number; cost: number; close_ts: string; kind: string }>(
      `SELECT m.id::text AS market_id, m.question, m.image_url, m.category, pp.outcome, m.outcome AS result, pp.shares::float8 AS shares, pp.cost::float8 AS cost, m.close_ts, 'trade' AS kind
       FROM play_positions pp JOIN markets m ON m.id=pp.market_id WHERE pp.user_id=$1 AND m.outcome IN ('YES','NO')
       UNION ALL
       SELECT m.id::text, m.question, m.image_url, m.category, pr.outcome, m.outcome, 0, 0, m.close_ts, 'call'
       FROM predictions pr JOIN markets m ON m.id=pr.market_id WHERE pr.user_id=$1 AND m.outcome IN ('YES','NO') AND NOT EXISTS (SELECT 1 FROM play_positions pp WHERE pp.user_id=$1 AND pp.market_id=m.id)
       ORDER BY close_ts DESC LIMIT 200`, [id]);
    return { items: rows.map((r) => { const won = (r.result === 'YES') === (r.outcome === 1); const payout = won ? r.shares : 0; return { ...r, won, payout, pnl: payout - r.cost }; }) };
  });

  app.get<{ Params: { handle: string } }>('/v1/users/:handle/created', async (req, reply) => {
    const id = await userId(req.params.handle); if (!id) return reply.code(404).send({ error: 'not_found' });
    return { items: await db.replica.query("SELECT id::text, question, image_url, category, price_yes, volume, status, outcome, close_ts, venue FROM markets WHERE creator_id=$1 ORDER BY created_at DESC LIMIT 100", [id]) };
  });

  app.get<{ Params: { handle: string }; Querystring: { list?: string } }>('/v1/users/:handle/connections', async (req, reply) => {
    const id = await userId(req.params.handle); if (!id) return reply.code(404).send({ error: 'not_found' });
    const followers = req.query.list !== 'following';
    return { items: await db.replica.query(
      `SELECT u.handle, u.display_name, u.avatar_url, u.bio, u.verified, COALESCE(EXISTS(SELECT 1 FROM follows f2 WHERE f2.follower_id=$2 AND f2.followee_id=u.id), false) AS am_following
       FROM follows f JOIN users u ON u.id=${followers ? 'f.follower_id' : 'f.followee_id'} WHERE ${followers ? 'f.followee_id' : 'f.follower_id'}=$1 ORDER BY f.created_at DESC LIMIT 200`, [id, viewer(req)]) };
  });

  const ProfilePatch = z.object({
    display_name: z.string().trim().min(1).max(50).optional(),
    bio: z.string().trim().max(280).optional(),
    location: z.string().trim().max(60).optional(),
    links: z.array(z.string().url().refine((u) => /^https:\/\//.test(u), 'https only')).max(4).optional(),
    avatar_url: z.string().url().max(500).optional(), cover_url: z.string().url().max(500).optional(),
    pinned_post_id: Id.nullable().optional(),
  }).strict();
  app.patch('/v1/me/profile', { preHandler: requireUser }, async (req, reply) => {
    const b = ProfilePatch.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'bad_request', issues: b.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) });
    if (b.data.pinned_post_id && !(await db.replica.query('SELECT 1 FROM posts WHERE id=$1 AND author_id=$2', [b.data.pinned_post_id, req.userId])).length) return reply.code(400).send({ error: 'not_your_post' });
    const keys = Object.keys(b.data) as (keyof typeof b.data)[];
    if (!keys.length) return reply.code(400).send({ error: 'empty_patch' });
    const sets = keys.map((k, i) => `${k}=$${i + 2}${k === 'links' ? '::jsonb' : ''}`);
    await db.primary.query(`UPDATE users SET ${sets.join(', ')} WHERE id=$1`, [req.userId, ...keys.map((k) => k === 'links' ? JSON.stringify(b.data.links) : b.data[k])]);
    return reply.code(204).send();
  });

  // Copy calls
  const CopyBody = z.object({ maxPerTrade: z.number().positive().max(1000).default(10) });
  app.post<{ Params: { handle: string } }>('/v1/users/:handle/copy', { preHandler: requireUser }, async (req, reply) => {
    const b = CopyBody.safeParse(req.body ?? {}); const id = await userId(req.params.handle);
    if (!b.success) return reply.code(400).send({ error: 'bad_request' });
    if (!id) return reply.code(404).send({ error: 'not_found' });
    if (String(id) === String(req.userId)) return reply.code(400).send({ error: 'self_copy' });
    await db.primary.query(`INSERT INTO copy_subscriptions (follower_id, leader_id, max_per_trade) VALUES ($1,$2,$3)
      ON CONFLICT (follower_id, leader_id) DO UPDATE SET max_per_trade=EXCLUDED.max_per_trade`, [req.userId, id, b.data.maxPerTrade]);
    await db.primary.query('INSERT INTO follows (follower_id, followee_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.userId, id]);
    await notify(String(id), 'copy', { from: String(req.userId) });
    return { copying: true, maxPerTrade: b.data.maxPerTrade };
  });
  app.delete<{ Params: { handle: string } }>('/v1/users/:handle/copy', { preHandler: requireUser }, async (req) => {
    await db.primary.query('DELETE FROM copy_subscriptions WHERE follower_id=$1 AND leader_id=(SELECT id FROM users WHERE handle=$2)', [req.userId, req.params.handle]);
    return { copying: false };
  });

  // ---------- channels ----------
  app.get('/v1/channels', async (req) => ({
    items: await db.replica.query(
      `SELECT c.slug, c.name, c.description, c.image_url, c.theme, (SELECT count(*) FROM channel_members m WHERE m.slug=c.slug)::int AS members,
         (SELECT count(*) FROM posts p WHERE p.channel=c.slug AND p.created_at > now() - interval '7 days')::int AS posts_week,
         COALESCE(EXISTS(SELECT 1 FROM channel_members m WHERE m.slug=c.slug AND m.user_id=$1), false) AS joined
       FROM channels c ORDER BY members DESC, c.slug`, [viewer(req)]),
  }));
  app.get<{ Params: { slug: string } }>('/v1/channels/:slug', async (req, reply) => {
    const [c] = await db.replica.query(
      `SELECT c.*, (SELECT count(*) FROM channel_members m WHERE m.slug=c.slug)::int AS members,
         COALESCE(EXISTS(SELECT 1 FROM channel_members m WHERE m.slug=c.slug AND m.user_id=$2), false) AS joined
       FROM channels c WHERE c.slug=$1`, [req.params.slug, viewer(req)]);
    if (!c) return reply.code(404).send({ error: 'not_found' });
    const faces = await db.replica.query('SELECT u.handle, u.avatar_url FROM channel_members m JOIN users u ON u.id=m.user_id WHERE m.slug=$1 ORDER BY m.created_at LIMIT 5', [req.params.slug]);
    return { channel: c, faces };
  });
  app.post<{ Params: { slug: string } }>('/v1/channels/:slug/join', { preHandler: requireUser }, async (req, reply) => {
    const r = await db.primary.query('INSERT INTO channel_members (slug, user_id) SELECT slug, $2 FROM channels WHERE slug=$1 ON CONFLICT DO NOTHING RETURNING slug', [req.params.slug, req.userId]);
    if (!r.length && !(await db.replica.query('SELECT 1 FROM channels WHERE slug=$1', [req.params.slug])).length) return reply.code(404).send({ error: 'not_found' });
    return { joined: true };
  });
  app.delete<{ Params: { slug: string } }>('/v1/channels/:slug/join', { preHandler: requireUser }, async (req) => {
    await db.primary.query('DELETE FROM channel_members WHERE slug=$1 AND user_id=$2', [req.params.slug, req.userId]);
    return { joined: false };
  });

  // ---------- DMs ----------
  const pair = (a: string, b: string) => (BigInt(a) < BigInt(b) ? [a, b] : [b, a]) as [string, string];
  app.get('/v1/dms', { preHandler: requireUser }, async (req) => ({
    items: await db.replica.query(
      `SELECT t.id::text, t.last_at, o.handle, o.display_name, o.avatar_url, o.verified,
         (SELECT body FROM dm_messages m WHERE m.thread_id=t.id ORDER BY created_at DESC LIMIT 1) AS last_body,
         (SELECT sender_id::text FROM dm_messages m WHERE m.thread_id=t.id ORDER BY created_at DESC LIMIT 1) = $1::text AS last_from_me,
         (SELECT count(*) FROM dm_messages m WHERE m.thread_id=t.id AND m.sender_id<>$1 AND m.read_at IS NULL)::int AS unread
       FROM dm_threads t JOIN users o ON o.id = CASE WHEN t.user_a=$1 THEN t.user_b ELSE t.user_a END
       WHERE t.user_a=$1 OR t.user_b=$1 ORDER BY t.last_at DESC LIMIT 100`, [req.userId]),
  }));
  app.get<{ Params: { handle: string }; Querystring: { cursor?: string } }>('/v1/dms/:handle', { preHandler: requireUser }, async (req, reply) => {
    const other = await userId(req.params.handle); if (!other) return reply.code(404).send({ error: 'not_found' });
    const [a, b] = pair(String(req.userId), String(other));
    const [t] = await db.replica.query<{ id: string }>('SELECT id FROM dm_threads WHERE user_a=$1 AND user_b=$2', [a, b]);
    const [o] = await db.replica.query('SELECT handle, display_name, avatar_url, verified FROM users WHERE id=$1', [other]);
    if (!t) return { with: o, items: [], next: null };
    await db.primary.query('UPDATE dm_messages SET read_at=now() WHERE thread_id=$1 AND sender_id<>$2 AND read_at IS NULL', [t.id, req.userId]);
    const c = decodeCursor(req.query.cursor);
    const rows = await db.replica.query<Row>(
      `SELECT m.id::text, m.body, m.created_at, m.read_at, (m.sender_id=$2) AS mine, m.market_id::text, mk.question, mk.price_yes
       FROM dm_messages m LEFT JOIN markets mk ON mk.id=m.market_id
       WHERE m.thread_id=$1 AND ($3::timestamptz IS NULL OR (m.created_at, m.id) < ($3::timestamptz, $4::bigint)) ORDER BY m.created_at DESC, m.id DESC LIMIT $5`,
      [t.id, req.userId, c?.t ?? null, c?.id ?? null, PAGE + 1]);
    return { with: o, ...page(rows) };
  });
  const DmBody = z.object({ body: z.string().trim().min(1).max(2000), marketId: Id.optional() });
  app.post<{ Params: { handle: string } }>('/v1/dms/:handle', { preHandler: requireUser }, async (req, reply) => {
    if (!(await limit(req, reply, 'dm', 30))) return;
    const b = DmBody.safeParse(req.body); const other = await userId(req.params.handle);
    if (!b.success) return reply.code(400).send({ error: 'bad_request' });
    if (!other) return reply.code(404).send({ error: 'not_found' });
    if (String(other) === String(req.userId)) return reply.code(400).send({ error: 'self_dm' });
    const [a, c] = pair(String(req.userId), String(other));
    const [t] = await db.primary.query<{ id: string }>(
      'INSERT INTO dm_threads (user_a, user_b) VALUES ($1,$2) ON CONFLICT (user_a, user_b) DO UPDATE SET last_at=now() RETURNING id', [a, c]);
    const [m] = await db.primary.query<{ id: string; created_at: string }>('INSERT INTO dm_messages (thread_id, sender_id, body, market_id) VALUES ($1,$2,$3,$4) RETURNING id, created_at', [must(t, 'dm thread').id, req.userId, b.data.body, b.data.marketId ?? null]);
    const msg = must(m, 'dm message');
    await bus.publish(`dm:${other}`, JSON.stringify({ type: 'dm', data: { id: msg.id, from: String(req.userId), body: b.data.body }, ts: Date.now() }));
    await notify(String(other), 'dm', { from: String(req.userId), body: b.data.body.slice(0, 140) });
    return reply.code(201).send({ id: msg.id, createdAt: msg.created_at });
  });

  // ---------- notifications (enriched with the actor) ----------
  app.get('/v1/notifications', { preHandler: requireUser }, async (req) => ({
    items: await db.replica.query(
      `SELECT n.id::text, n.kind, n.payload, n.read, n.created_at, a.handle AS actor_handle, a.display_name AS actor_name, a.avatar_url AS actor_avatar,
         (SELECT body FROM posts WHERE id = NULLIF(n.payload->>'postId','')::bigint) AS post_body
       FROM notifications n LEFT JOIN users a ON a.id = NULLIF(n.payload->>'from','')::bigint
       WHERE n.user_id=$1 ORDER BY n.created_at DESC LIMIT 100`, [req.userId]),
    unread: (await db.replica.query<{ n: number }>('SELECT count(*)::int AS n FROM notifications WHERE user_id=$1 AND NOT read', [req.userId]))[0]?.n ?? 0,
  }));
  app.post('/v1/notifications/read', { preHandler: requireUser }, async (req, reply) => {
    await db.primary.query('UPDATE notifications SET read=true WHERE user_id=$1 AND NOT read', [req.userId]);
    return reply.code(204).send();
  });

  // ---------- discovery ----------
  const SearchQ = z.object({ q: z.string().trim().min(1).max(80) });
  app.get('/v1/search', async (req, reply) => {
    const s = SearchQ.safeParse(req.query); if (!s.success) return reply.code(400).send({ error: 'bad_query' });
    const like = `%${s.data.q.replace(/[%_\\]/g, (c) => `\\${c}`).replace(/^[@#/]/, '')}%`;
    const [people, markets, channels, posts] = await Promise.all([
      db.replica.query('SELECT handle, display_name, avatar_url, bio, verified, (SELECT count(*) FROM follows f WHERE f.followee_id=u.id)::int AS followers FROM users u WHERE handle ILIKE $1 OR display_name ILIKE $1 ORDER BY followers DESC LIMIT 8', [like]),
      db.replica.query("SELECT id::text, question, image_url, category, price_yes, volume, venue, status FROM markets WHERE question ILIKE $1 AND status='open' ORDER BY volume DESC LIMIT 8", [like]),
      db.replica.query('SELECT slug, name, description, image_url, theme, (SELECT count(*) FROM channel_members m WHERE m.slug=c.slug)::int AS members FROM channels c WHERE slug ILIKE $1 OR name ILIKE $1 LIMIT 6', [like]),
      listPosts('p.body ILIKE $1', [like], viewer(req)).then((r) => r.items.slice(0, 10)),
    ]);
    return { people, markets, channels, posts };
  });

  app.get('/v1/trending', async (req) => {
    const recent = await db.replica.query<{ body: string }>("SELECT body FROM posts WHERE created_at > now() - interval '14 days' ORDER BY created_at DESC LIMIT 2000");
    const counts = new Map<string, number>();
    for (const r of recent) for (const [, t] of r.body.matchAll(TAG)) { const k = (t ?? '').toLowerCase(); if (!k) continue; counts.set(k, (counts.get(k) ?? 0) + 1); }
    const topics = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag, posts]) => ({ tag, posts }));
    const v = viewer(req);
    const whoToFollow = await db.replica.query(
      `SELECT u.handle, u.display_name, u.avatar_url, u.bio, u.verified, (SELECT count(*) FROM follows f WHERE f.followee_id=u.id)::int AS followers
       FROM users u WHERE u.handle <> 'demo' AND ($1::bigint IS NULL OR (u.id <> $1 AND NOT EXISTS (SELECT 1 FROM follows f WHERE f.follower_id=$1 AND f.followee_id=u.id)))
       ORDER BY followers DESC LIMIT 5`, [v]);
    const markets = await db.replica.query("SELECT id::text, question, image_url, category, price_yes, volume_24h, venue FROM markets WHERE status='open' AND venue='called' ORDER BY volume_24h DESC NULLS LAST LIMIT 5");
    return { topics, whoToFollow, markets };
  });
}
