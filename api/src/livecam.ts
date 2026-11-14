/**
 * RAID Live: real camera livestreams over WebRTC, one broadcaster to many viewers (mesh: the broadcaster's browser
 * holds one peer connection per viewer). Signaling is plain HTTP polling held in memory here, so it works through the
 * existing /v1 proxy with no websocket upgrade. SDP is exchanged non-trickle (ICE gathered before posting). STUN only.
 * Chat, hearts and viewer counts ride the same polling. Streams end when the broadcaster stops or misses heartbeats.
 */
import { randomBytes } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Database } from './db/index.js';
import type { Kv } from './infra/bus.js';

export interface LiveDeps { db: Database; kv: Kv; requireUser: (req: FastifyRequest, reply: FastifyReply) => Promise<void> }
interface Msg { id: number; kind: 'chat' | 'join'; handle: string; body: string; at: number }
interface Stream {
  id: string; key: string; userId: string; handle: string; display_name: string; near_account: string | null; avatar_url: string | null;
  title: string; coin: string | null; raidId: number | null; started: number; beat: number;
  offers: Map<string, { sdp: string; at: number; answered: boolean }>; answers: Map<string, string>;
  viewers: Map<string, number>; hearts: number; msgs: Msg[]; seq: number;
}
const streams = new Map<string, Stream>();
const BEAT_MS = 20_000, VIEWER_MS = 12_000;
const rid = () => randomBytes(8).toString('hex');
const alive = (s: Stream) => Date.now() - s.beat < BEAT_MS;
setInterval(() => { for (const [k, s] of streams) if (!alive(s)) streams.delete(k); }, 10_000).unref();
const pub = (s: Stream) => ({
  id: s.id, handle: s.handle, display_name: s.display_name, near_account: s.near_account, avatar_url: s.avatar_url,
  title: s.title, coin: s.coin, raid_id: s.raidId, started_at: s.started, hearts: s.hearts,
  viewers: [...s.viewers.values()].filter((t) => Date.now() - t < VIEWER_MS).length,
});
const Sdp = z.string().min(20).max(20_000);
const Coin = z.string().regex(/^[A-Z0-9]{2,12}$/).nullable().optional();

export function registerLive(app: FastifyInstance, { db, kv, requireUser }: LiveDeps) {
  const get = (id: string, reply: FastifyReply) => { const s = streams.get(id); if (!s || !alive(s)) { reply.code(404).send({ error: 'not_live' }); return null; } return s; };
  const owner = (s: Stream, req: FastifyRequest, reply: FastifyReply) => { if ((req.headers['x-live-key'] as string) !== s.key) { reply.code(403).send({ error: 'forbidden' }); return false; } return true; };
  const limit = async (req: FastifyRequest, k: string, max: number) => (await kv.hit(`rl:stream:${k}:${req.userId ?? req.ip}:${Math.floor(Date.now() / 60_000)}`, 60)) <= max;

  app.get('/v1/streams', async () => ({ items: [...streams.values()].filter(alive).sort((a, b) => b.started - a.started).map(pub) }));
  app.get<{ Params: { id: string } }>('/v1/streams/:id', async (req, reply) => { const s = get(req.params.id, reply); return s ? pub(s) : undefined; });

  /** Go live. Returns the stream id and a secret key the broadcaster uses for signaling. */
  app.post('/v1/streams', { preHandler: requireUser }, async (req, reply) => {
    const b = z.object({ title: z.string().max(100).default(''), coin: Coin, raidId: z.number().int().min(0).nullable().optional() }).safeParse(req.body ?? {});
    if (!b.success) return reply.code(400).send({ error: 'bad_request' });
    if (!(await limit(req, 'start', 6))) return reply.code(429).send({ error: 'rate_limited' });
    for (const [k, s] of streams) if (s.userId === String(req.userId)) streams.delete(k); // one stream per user
    const [u] = await db.primary.query<{ handle: string; display_name: string; near_account: string | null; avatar_url: string | null }>('SELECT handle, display_name, near_account, avatar_url FROM users WHERE id=$1', [req.userId]);
    if (!u) return reply.code(401).send({ error: 'auth_required' });
    const s: Stream = { id: rid(), key: rid() + rid(), userId: String(req.userId), ...u, title: b.data.title, coin: b.data.coin ?? null, raidId: b.data.raidId ?? null,
      started: Date.now(), beat: Date.now(), offers: new Map(), answers: new Map(), viewers: new Map(), hearts: 0, msgs: [], seq: 0 };
    streams.set(s.id, s);
    return reply.code(201).send({ id: s.id, key: s.key });
  });
  /** Broadcaster heartbeat + pending viewer offers. Also updates the pinned coin. */
  app.post<{ Params: { id: string } }>('/v1/streams/:id/beat', async (req, reply) => {
    const s = get(req.params.id, reply); if (!s || !owner(s, req, reply)) return;
    const b = z.object({ coin: Coin, title: z.string().max(100).optional(), raidId: z.number().int().min(0).nullable().optional() }).safeParse(req.body ?? {});
    if (b.success) { if (b.data.coin !== undefined) s.coin = b.data.coin; if (b.data.title !== undefined) s.title = b.data.title; if (b.data.raidId !== undefined) s.raidId = b.data.raidId; }
    s.beat = Date.now();
    const pending = [...s.offers].filter(([, o]) => !o.answered && Date.now() - o.at < 30_000).map(([viewer, o]) => ({ viewer, sdp: o.sdp }));
    return { pending, ...pub(s) };
  });
  app.post<{ Params: { id: string } }>('/v1/streams/:id/answer', async (req, reply) => {
    const s = get(req.params.id, reply); if (!s || !owner(s, req, reply)) return;
    const b = z.object({ viewer: z.string().max(40), sdp: Sdp }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'bad_request' });
    const o = s.offers.get(b.data.viewer); if (o) o.answered = true;
    s.answers.set(b.data.viewer, b.data.sdp);
    return { ok: true };
  });
  app.delete<{ Params: { id: string } }>('/v1/streams/:id', async (req, reply) => {
    const s = get(req.params.id, reply); if (!s || !owner(s, req, reply)) return;
    streams.delete(s.id); return { ok: true };
  });

  /** Viewer: post a recvonly offer, then poll for the broadcaster's answer. */
  app.post<{ Params: { id: string } }>('/v1/streams/:id/offer', async (req, reply) => {
    const s = get(req.params.id, reply); if (!s) return;
    if (!(await limit(req, 'offer', 30))) return reply.code(429).send({ error: 'rate_limited' });
    const b = z.object({ sdp: Sdp }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'bad_request' });
    if (s.offers.size > 200) return reply.code(503).send({ error: 'room_full' });
    const viewer = rid(); s.offers.set(viewer, { sdp: b.data.sdp, at: Date.now(), answered: false }); s.viewers.set(viewer, Date.now());
    return reply.code(201).send({ viewer });
  });
  app.get<{ Params: { id: string; viewer: string } }>('/v1/streams/:id/answer/:viewer', async (req, reply) => {
    const s = get(req.params.id, reply); if (!s) return;
    return { sdp: s.answers.get(req.params.viewer) ?? null };
  });

  /** Everyone: poll chat + counts. Viewers pass ?viewer= to count as watching. */
  app.get<{ Params: { id: string }; Querystring: { after?: string; viewer?: string } }>('/v1/streams/:id/events', async (req, reply) => {
    const s = get(req.params.id, reply); if (!s) return;
    const v = req.query.viewer; if (v && s.viewers.has(v)) s.viewers.set(v, Date.now());
    const after = Number(req.query.after ?? 0) || 0;
    return { msgs: s.msgs.filter((m) => m.id > after).slice(-50), ...pub(s) };
  });
  app.post<{ Params: { id: string } }>('/v1/streams/:id/chat', { preHandler: requireUser }, async (req, reply) => {
    const s = get(req.params.id, reply); if (!s) return;
    if (!(await limit(req, 'chat', 20))) return reply.code(429).send({ error: 'rate_limited' });
    const b = z.object({ body: z.string().trim().min(1).max(200) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'bad_request' });
    const [u] = await db.primary.query<{ handle: string }>('SELECT handle FROM users WHERE id=$1', [req.userId]);
    s.msgs.push({ id: ++s.seq, kind: 'chat', handle: u?.handle ?? 'someone', body: b.data.body, at: Date.now() });
    if (s.msgs.length > 300) s.msgs.splice(0, s.msgs.length - 300);
    return { ok: true };
  });
  app.post<{ Params: { id: string } }>('/v1/streams/:id/heart', async (req, reply) => {
    const s = get(req.params.id, reply); if (!s) return;
    if (!(await limit(req, 'heart', 120))) return reply.code(429).send({ error: 'rate_limited' });
    s.hearts += 1; return { hearts: s.hearts };
  });
}
