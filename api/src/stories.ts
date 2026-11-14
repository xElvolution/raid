/**
 * RAID stories (24 h, text or image, optional token tag) and image uploads for posts and stories.
 * Images are sent as base64 JSON (max 3 MB), checked by magic bytes, stored on disk and served from /v1/media/:name.
 */
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Database } from './db/index.js';
import type { Kv } from './infra/bus.js';

export interface StoryDeps { db: Database; kv: Kv; requireUser: (req: FastifyRequest, reply: FastifyReply) => Promise<void>; mediaDir: string }

const MAX = 3 * 1024 * 1024;
const kind = (b: Buffer) =>
  b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? 'png'
  : b[0] === 0xff && b[1] === 0xd8 ? 'jpg'
  : b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' ? 'webp'
  : b.subarray(0, 3).toString() === 'GIF' ? 'gif' : null;
const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };

export function registerStories(app: FastifyInstance, deps: StoryDeps) {
  const { db, kv, requireUser, mediaDir } = deps;
  fs.mkdirSync(mediaDir, { recursive: true });
  const limit = async (req: FastifyRequest, reply: FastifyReply, key: string, max: number) => {
    const n = await kv.hit(`rl:${key}:${req.userId}:${Math.floor(Date.now() / 60_000)}`, 60);
    if (n > max) { void reply.code(429).send({ error: 'rate_limited' }); return false; }
    return true;
  };

  app.post('/v1/media', { preHandler: requireUser, bodyLimit: Math.ceil(MAX * 1.4) + 1024 }, async (req, reply) => {
    if (!(await limit(req, reply, 'media', 20))) return;
    const b = z.object({ data: z.string().min(16) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'bad_request' });
    const buf = Buffer.from(b.data.data.replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (buf.length > MAX) return reply.code(413).send({ error: 'too_large' });
    const k = kind(buf);
    if (!k) return reply.code(415).send({ error: 'png_jpg_webp_gif_only' });
    const name = `${Date.now().toString(36)}${randomBytes(6).toString('hex')}.${k}`;
    fs.writeFileSync(path.join(mediaDir, name), buf);
    return reply.code(201).send({ url: `/v1/media/${name}` });
  });

  app.get<{ Params: { name: string } }>('/v1/media/:name', async (req, reply) => {
    const m = req.params.name.match(/^[a-z0-9]{10,40}\.(png|jpg|webp|gif)$/);
    if (!m) return reply.code(404).send({ error: 'not_found' });
    const f = path.join(mediaDir, req.params.name);
    if (!fs.existsSync(f)) return reply.code(404).send({ error: 'not_found' });
    return reply.header('content-type', MIME[m[1]!]!).header('cache-control', 'public, max-age=31536000, immutable').send(fs.readFileSync(f));
  });

  const NewStory = z.object({
    body: z.string().trim().max(280).default(''),
    mediaUrl: z.string().max(500).refine((u) => u.startsWith('/v1/media/') || /^https:\/\//.test(u), 'https or uploaded media').optional(),
    coin: z.string().regex(/^[A-Z0-9]{2,12}$/).optional(),
    bg: z.number().int().min(0).max(7).default(0),
  }).refine((d) => d.body || d.mediaUrl, 'text or image');
  app.post('/v1/stories', { preHandler: requireUser }, async (req, reply) => {
    if (!(await limit(req, reply, 'story', 10))) return;
    const b = NewStory.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'bad_request' });
    const [s] = await db.primary.query<{ id: string }>('INSERT INTO stories (author_id, body, media_url, coin, bg) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [req.userId, b.data.body, b.data.mediaUrl ?? null, b.data.coin ?? null, b.data.bg]);
    return reply.code(201).send({ id: s?.id });
  });

  /** Live stories (last 24 h), grouped by author, newest author first. */
  app.get('/v1/stories', async () => {
    const rows = await db.replica.query<{ id: string; body: string; media_url: string | null; coin: string | null; bg: number; created_at: string; handle: string; display_name: string; avatar_url: string | null; near_account: string }>(
      `SELECT s.id::text, s.body, s.media_url, s.coin, s.bg, s.created_at, u.handle, u.display_name, u.avatar_url, u.near_account
       FROM stories s JOIN users u ON u.id=s.author_id WHERE s.created_at > now() - interval '24 hours' ORDER BY s.created_at ASC LIMIT 300`);
    const by = new Map<string, { handle: string; display_name: string; avatar_url: string | null; near_account: string; latest: string; items: unknown[] }>();
    for (const r of rows) {
      const g = by.get(r.handle) ?? { handle: r.handle, display_name: r.display_name, avatar_url: r.avatar_url, near_account: r.near_account, latest: r.created_at, items: [] };
      g.items.push({ id: r.id, body: r.body, media_url: r.media_url, coin: r.coin, bg: r.bg, created_at: r.created_at }); g.latest = r.created_at; by.set(r.handle, g);
    }
    return { items: [...by.values()].sort((a, b) => +new Date(b.latest) - +new Date(a.latest)) };
  });
}
