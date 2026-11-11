/**
 * RAID social: Fomo-style posts on raids and coins. Post, reply, like, follow callers.
 * Everything is keyset-paginated. Seeded demo accounts carry `demo = true` and the API returns that flag so the
 * app labels them; nothing here invents activity.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { decodeCursor, encodeCursor } from './cursor.js';
import type { Db } from './db/index.js';
import type { Bus, Kv } from './infra/bus.js';
import { must } from './must.js';

type Guard = (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
export interface RaidSocialDeps {
  db: { primary: Db; replica: Db }; kv: Kv; bus: Bus; requireUser: Guard;
  notify: (userId: string, kind: string, payload: Record<string, unknown>) => Promise<void>;
}

const PAGE = 30;
const Id = z.string().regex(/^\d+$/);
const Coin = z.string().regex(/^[A-Z0-9]{2,12}$/);

const NewPost = z.object({
  body: z.string().trim().min(1).max(500),
  raidId: z.number().int().min(0).optional(),
  coin: Coin.optional(),
  replyTo: Id.optional(),
});
const FeedQ = z.object({
  tab: z.enum(['all', 'following']).default('all'),
  raid: z.coerce.number().int().min(0).optional(),
  coin: Coin.optional(),
  author: z.string().regex(/^[a-z0-9_]{3,20}$/).optional(),
  cursor: z.string().optional(),
});

/** Post projection. $1 = viewer id (or null). */
const SELECT = `
  SELECT p.id::text, p.body, p.created_at, p.raid_id::int AS raid_id, p.coin, p.reply_to::text AS reply_to,
    u.handle, u.display_name, u.near_account, u.demo,
    (SELECT count(*) FROM post_likes l WHERE l.post_id = p.id)::int AS likes,
    (SELECT count(*) FROM posts r WHERE r.reply_to = p.id)::int AS replies,
    EXISTS (SELECT 1 FROM post_likes l WHERE l.post_id = p.id AND l.user_id = $1::bigint) AS liked,
    EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1::bigint AND f.followee_id = u.id) AS following
  FROM posts p JOIN users u ON u.id = p.author_id`;

export function registerRaidSocial(app: FastifyInstance, d: RaidSocialDeps) {
  const { db, kv, requireUser } = d;
  const viewer = (req: FastifyRequest) => (req.userId ? String(req.userId) : null);

  app.get('/v1/raid/feed', async (req, reply) => {
    const q = FeedQ.safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'bad_request' });
    if (q.data.tab === 'following' && !req.userId) return reply.code(401).send({ error: 'auth_required' });
    const c = decodeCursor(q.data.cursor);
    const rows = await db.replica.query<{ id: string; created_at: Date | string }>(
      `${SELECT}
       WHERE p.reply_to IS NULL AND p.market_id IS NULL
         AND ($2::text <> 'following' OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1::bigint AND f.followee_id = p.author_id) OR p.author_id = $1::bigint)
         AND ($3::bigint IS NULL OR p.raid_id = $3::bigint)
         AND ($4::text IS NULL OR p.coin = $4::text)
         AND ($5::text IS NULL OR u.handle = $5::text)
         AND ($6::timestamptz IS NULL OR (p.created_at, p.id) < ($6::timestamptz, $7::bigint))
       ORDER BY p.created_at DESC, p.id DESC LIMIT $8`,
      [viewer(req), q.data.tab, q.data.raid ?? null, q.data.coin ?? null, q.data.author ?? null, c?.t ?? null, c?.id ?? null, PAGE + 1],
    );
    const page = rows.slice(0, PAGE);
    const last = page[page.length - 1];
    return { items: page, next: rows.length > PAGE && last ? encodeCursor({ t: new Date(last.created_at).toISOString(), id: last.id }) : null };
  });

  app.get<{ Params: { id: string } }>('/v1/raid/posts/:id', async (req, reply) => {
    if (!Id.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad_id' });
    const [post] = await db.replica.query(`${SELECT} WHERE p.id = $2`, [viewer(req), req.params.id]);
    if (!post) return reply.code(404).send({ error: 'not_found' });
    const replies = await db.replica.query(`${SELECT} WHERE p.reply_to = $2 ORDER BY p.created_at ASC, p.id ASC LIMIT 200`, [viewer(req), req.params.id]);
    return { post, replies };
  });

  app.post('/v1/raid/posts', { preHandler: requireUser }, async (req, reply) => {
    const b = NewPost.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'bad_request' });
    const n = await kv.hit(`rl:raidpost:${req.userId}:${Math.floor(Date.now() / 60_000)}`, 60);
    if (n > 10) return reply.code(429).send({ error: 'rate_limited' });
    let raidId = b.data.raidId ?? null, coin = b.data.coin ?? null;
    let parentAuthor: string | null = null;
    if (b.data.replyTo) {
      const [parent] = await db.primary.query<{ author_id: string; raid_id: string | null; coin: string | null }>('SELECT author_id::text, raid_id, coin FROM posts WHERE id = $1', [b.data.replyTo]);
      if (!parent) return reply.code(404).send({ error: 'parent_not_found' });
      parentAuthor = parent.author_id; raidId = parent.raid_id === null ? null : Number(parent.raid_id); coin = parent.coin;
    }
    const [row] = await db.primary.query<{ id: string }>(
      'INSERT INTO posts (author_id, body, raid_id, coin, reply_to) VALUES ($1, $2, $3, $4, $5) RETURNING id::text',
      [req.userId, b.data.body, raidId, coin, b.data.replyTo ?? null],
    );
    const postId = must(row, 'post').id;
    if (parentAuthor && parentAuthor !== String(req.userId)) await d.notify(parentAuthor, 'reply', { post: postId, from: req.userId });
    const [post] = await db.primary.query(`${SELECT} WHERE p.id = $2`, [String(req.userId), postId]);
    await d.bus.publish('feed:raid', JSON.stringify({ type: 'post', post })).catch(() => {});
    return reply.code(201).send(post);
  });

  app.post<{ Params: { id: string } }>('/v1/raid/posts/:id/like', { preHandler: requireUser }, async (req, reply) => {
    if (!Id.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad_id' });
    const ins = await db.primary.query<{ author_id: string }>(
      `INSERT INTO post_likes (user_id, post_id) SELECT $1, id FROM posts WHERE id = $2 ON CONFLICT DO NOTHING
       RETURNING (SELECT author_id::text FROM posts WHERE id = $2) AS author_id`, [req.userId, req.params.id]);
    if (ins[0] && ins[0].author_id !== String(req.userId)) await d.notify(ins[0].author_id, 'like', { post: req.params.id, from: req.userId });
    const [c] = await db.primary.query<{ likes: number }>('SELECT count(*)::int AS likes FROM post_likes WHERE post_id = $1', [req.params.id]);
    return { liked: true, likes: c?.likes ?? 0 };
  });

  app.delete<{ Params: { id: string } }>('/v1/raid/posts/:id/like', { preHandler: requireUser }, async (req, reply) => {
    if (!Id.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad_id' });
    await db.primary.query('DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2', [req.userId, req.params.id]);
    const [c] = await db.primary.query<{ likes: number }>('SELECT count(*)::int AS likes FROM post_likes WHERE post_id = $1', [req.params.id]);
    return { liked: false, likes: c?.likes ?? 0 };
  });

  /** Callers people can follow: most-followed first, then most active. */
  app.get('/v1/raid/callers', async (req) => ({
    items: await db.replica.query(
      `SELECT u.handle, u.display_name, u.near_account, u.demo,
         (SELECT count(*) FROM follows f WHERE f.followee_id = u.id)::int AS followers,
         (SELECT count(*) FROM posts p WHERE p.author_id = u.id AND p.market_id IS NULL)::int AS posts,
         EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = $1::bigint AND f.followee_id = u.id) AS following
       FROM users u WHERE u.id <> COALESCE($1::bigint, 0) AND EXISTS (SELECT 1 FROM posts p WHERE p.author_id = u.id AND p.market_id IS NULL)
       ORDER BY followers DESC, posts DESC, u.id ASC LIMIT 12`, [viewer(req)]),
  }));
}
