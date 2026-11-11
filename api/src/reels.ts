/**
 * RAID reels: a vertical swipe feed of short videos (mp4 up to 60 s, stored on local disk) or X / Instagram / TikTok links,
 * each tied to a coin, a chest raid or a launchpad coin.
 *
 * Reel attribution is OFF-CHAIN and labelled demo: when someone backs a raid from a reel, the app reports the back tx here.
 * The API checks the tx on NEAR RPC (a `raid_backed` event from the chest for that backer) before counting it. If the raid
 * hits, the reel's creator is credited 20% of the caller's 2.5% fee (0.5% of profit; the caller would keep 2.0%) pro rata to
 * the stake that came through the reel. The chest contract does not pay this; it is shown as "off-chain attribution, demo".
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { Db } from './db/index.js';
import type { Kv } from './infra/bus.js';
import { must } from './must.js';

type Guard = (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
export interface RaidInfo { status: string; hit: boolean; pot: string; caller_cut: string }
export interface ReelChain {
  /** The verified back in a tx: chest emitted raid_backed for `backer`. Null if the tx is not such a back. */
  backTx(tx: string, backer: string): Promise<{ raidId: number; amount: string } | null>;
  raid(id: number): Promise<RaidInfo | null>;
}
export interface ReelsDeps { db: { primary: Db; replica: Db }; kv: Kv; requireUser: Guard; dir: string; chain: ReelChain }

export const REEL_SHARE_OF_CALLER_FEE = 0.2; // 0.5% of the caller's 2.5%
export const MAX_REEL_SECONDS = 60;
export const MAX_REEL_BYTES = 40 * 1024 * 1024;
const Coin = z.string().regex(/^[A-Z0-9]{2,12}$/);
const Meta = z.object({
  caption: z.string().trim().max(220).default(''),
  coin: Coin.optional(),
  raidId: z.coerce.number().int().min(0).optional(),
  launchId: z.coerce.number().int().min(0).optional(),
});
const PROVIDERS: [RegExp, string][] = [[/^(www\.)?(x|twitter)\.com$/, 'x'], [/^(www\.)?instagram\.com$/, 'instagram'], [/^(www\.|vm\.|m\.)?tiktok\.com$/, 'tiktok']];
export function embedProvider(url: string): string | null {
  try { const u = new URL(url); if (u.protocol !== 'https:') return null; return PROVIDERS.find(([re]) => re.test(u.hostname))?.[1] ?? null; } catch { return null; }
}

/** Duration of an MP4 from its `mvhd` box (seconds), or null if it isn't a readable MP4. */
export function mp4Duration(buf: Buffer): number | null {
  if (buf.length < 16 || buf.toString('latin1', 4, 8) !== 'ftyp') return null;
  const i = buf.indexOf('mvhd', 0, 'latin1');
  if (i < 4 || i + 32 > buf.length) return null;
  const v = buf[i + 4];
  const scale = v === 1 ? buf.readUInt32BE(i + 24) : buf.readUInt32BE(i + 16);
  const dur = v === 1 ? Number(buf.readBigUInt64BE(i + 28)) : buf.readUInt32BE(i + 20);
  return scale ? dur / scale : null;
}

const SELECT = `
  SELECT r.id::text, r.kind, r.embed_url, r.provider, r.caption, r.coin, r.raid_id::int AS raid_id, r.launch_id::int AS launch_id,
    r.duration_s, r.demo, r.created_at, u.handle, u.display_name, u.near_account, u.demo AS author_demo,
    (SELECT count(*) FROM reel_backs b WHERE b.reel_id = r.id)::int AS backs,
    (SELECT COALESCE(sum(b.amount), 0) FROM reel_backs b WHERE b.reel_id = r.id)::text AS backed_raw
  FROM reels r JOIN users u ON u.id = r.author_id`;

export function registerReels(app: FastifyInstance, d: ReelsDeps) {
  const { db, kv, requireUser, chain } = d;
  fs.mkdirSync(d.dir, { recursive: true });
  app.addContentTypeParser(['video/mp4', 'application/octet-stream'], { parseAs: 'buffer', bodyLimit: MAX_REEL_BYTES }, (_req, body, done) => done(null, body));

  const rate = async (req: FastifyRequest) => (await kv.hit(`rl:reel:${req.userId}:${Math.floor(Date.now() / 3_600_000)}`, 3600)) > 20;
  const out = async (id: string) => (await db.primary.query(`${SELECT} WHERE r.id = $1`, [id]))[0];

  app.get('/v1/raid/reels', async (req, reply) => {
    const q = z.object({ coin: Coin.optional(), raid: z.coerce.number().int().min(0).optional(), before: z.string().regex(/^\d+$/).optional() }).safeParse(req.query);
    if (!q.success) return reply.code(400).send({ error: 'bad_request' });
    const items = await db.replica.query(`${SELECT} WHERE ($1::text IS NULL OR r.coin = $1) AND ($2::bigint IS NULL OR r.raid_id = $2) AND ($3::bigint IS NULL OR r.id < $3)
      ORDER BY r.id DESC LIMIT 20`, [q.data.coin ?? null, q.data.raid ?? null, q.data.before ?? null]);
    return { items, attribution: 'off-chain attribution, demo' };
  });

  /** Paste an X / Instagram / TikTok link. */
  app.post('/v1/raid/reels', { preHandler: requireUser }, async (req, reply) => {
    const b = Meta.extend({ embedUrl: z.string().url().max(400) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: 'bad_request' });
    const provider = embedProvider(b.data.embedUrl);
    if (!provider) return reply.code(400).send({ error: 'unsupported_link', message: 'Use an https link from x.com, instagram.com or tiktok.com' });
    if (await rate(req)) return reply.code(429).send({ error: 'rate_limited' });
    const [r] = await db.primary.query<{ id: string }>('INSERT INTO reels (author_id, kind, embed_url, provider, caption, coin, raid_id, launch_id) VALUES ($1,\'embed\',$2,$3,$4,$5,$6,$7) RETURNING id::text',
      [req.userId, b.data.embedUrl, provider, b.data.caption, b.data.coin ?? null, b.data.raidId ?? null, b.data.launchId ?? null]);
    return reply.code(201).send(await out(must(r, 'reel').id));
  });

  /** Upload an mp4 (raw body, Content-Type video/mp4). Meta in the query string. */
  app.post('/v1/raid/reels/upload', { preHandler: requireUser, bodyLimit: MAX_REEL_BYTES }, async (req, reply) => {
    const m = Meta.safeParse(req.query);
    if (!m.success) return reply.code(400).send({ error: 'bad_request' });
    const buf = req.body as Buffer;
    if (!Buffer.isBuffer(buf) || !buf.length) return reply.code(400).send({ error: 'video_required' });
    const dur = mp4Duration(buf);
    if (dur === null) return reply.code(400).send({ error: 'not_mp4' });
    if (dur > MAX_REEL_SECONDS + 0.5) return reply.code(400).send({ error: 'too_long', message: `Reels are up to ${MAX_REEL_SECONDS} s` });
    if (await rate(req)) return reply.code(429).send({ error: 'rate_limited' });
    const [r] = await db.primary.query<{ id: string }>('INSERT INTO reels (author_id, kind, caption, coin, raid_id, launch_id, duration_s) VALUES ($1,\'video\',$2,$3,$4,$5,$6) RETURNING id::text',
      [req.userId, m.data.caption, m.data.coin ?? null, m.data.raidId ?? null, m.data.launchId ?? null, dur]);
    const id = must(r, 'reel').id;
    const file = `${id}.mp4`;
    await fs.promises.writeFile(path.join(d.dir, file), buf);
    await db.primary.query('UPDATE reels SET video_file = $1 WHERE id = $2', [file, id]);
    return reply.code(201).send(await out(id));
  });

  /** Video bytes with HTTP Range support (needed for mobile Safari). */
  app.get<{ Params: { id: string } }>('/v1/raid/reels/:id/video', async (req, reply) => {
    if (!/^\d+$/.test(req.params.id)) return reply.code(400).send({ error: 'bad_id' });
    const [r] = await db.replica.query<{ video_file: string | null }>('SELECT video_file FROM reels WHERE id = $1', [req.params.id]);
    if (!r?.video_file) return reply.code(404).send({ error: 'not_found' });
    const p = path.join(d.dir, path.basename(r.video_file));
    const size = (await fs.promises.stat(p).catch(() => null))?.size;
    if (!size) return reply.code(404).send({ error: 'not_found' });
    reply.header('content-type', 'video/mp4').header('accept-ranges', 'bytes').header('cache-control', 'public, max-age=86400');
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
    if (!m) return reply.header('content-length', size).send(fs.createReadStream(p));
    const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start >= size || start > end) return reply.code(416).header('content-range', `bytes */${size}`).send();
    return reply.code(206).header('content-range', `bytes ${start}-${end}/${size}`).header('content-length', end - start + 1).send(fs.createReadStream(p, { start, end }));
  });

  /** Record a back that came through a reel. The tx must be a real chest back by this backer (checked on NEAR RPC). */
  app.post<{ Params: { id: string } }>('/v1/raid/reels/:id/backs', async (req, reply) => {
    const b = z.object({ tx: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{43,44}$/), backer: z.string().min(2).max(64) }).safeParse(req.body);
    if (!b.success || !/^\d+$/.test(req.params.id)) return reply.code(400).send({ error: 'bad_request' });
    const [reel] = await db.primary.query<{ raid_id: string | null }>('SELECT raid_id::text FROM reels WHERE id = $1', [req.params.id]);
    if (!reel) return reply.code(404).send({ error: 'not_found' });
    const v = await chain.backTx(b.data.tx, b.data.backer).catch(() => null);
    if (!v) return reply.code(422).send({ error: 'not_a_back', message: 'That tx is not a RAID back by this account' });
    if (reel.raid_id !== null && Number(reel.raid_id) !== v.raidId) return reply.code(422).send({ error: 'wrong_raid' });
    await db.primary.query('INSERT INTO reel_backs (tx, reel_id, raid_id, backer, amount) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (tx) DO NOTHING', [b.data.tx, req.params.id, v.raidId, b.data.backer, v.amount]);
    return reply.code(201).send({ ok: true, raidId: v.raidId, amount: v.amount, attribution: 'off-chain attribution, demo' });
  });

  /** Top reel creators by hits (raids that hit with stake that came through their reels). */
  app.get('/v1/raid/reels/leaderboard', async () => {
    const rows = await db.replica.query<{ handle: string; display_name: string; author_demo: boolean; reels: number; raid_id: string | null; backed: string | null; backs: number }>(
      `SELECT u.handle, u.display_name, u.demo AS author_demo, (SELECT count(*) FROM reels x WHERE x.author_id = u.id)::int AS reels,
         b.raid_id::text, sum(b.amount)::text AS backed, count(b.tx)::int AS backs
       FROM users u JOIN reels r ON r.author_id = u.id LEFT JOIN reel_backs b ON b.reel_id = r.id
       GROUP BY u.id, b.raid_id`);
    const raids = new Map<string, RaidInfo | null>();
    for (const id of new Set(rows.map((r) => r.raid_id).filter((x): x is string => !!x))) raids.set(id, await chain.raid(Number(id)).catch(() => null));
    const by = new Map<string, { handle: string; display_name: string; demo: boolean; reels: number; backs: number; backed_raw: number; hits: number; earned_raw: number }>();
    for (const r of rows) {
      const e = by.get(r.handle) ?? { handle: r.handle, display_name: r.display_name, demo: r.author_demo, reels: r.reels, backs: 0, backed_raw: 0, hits: 0, earned_raw: 0 };
      if (r.raid_id) {
        const amt = Number(r.backed ?? 0); e.backs += r.backs; e.backed_raw += amt;
        const info = raids.get(r.raid_id);
        if (info?.status === 'Closed' && info.hit) { e.hits++; if (Number(info.pot) > 0) e.earned_raw += Number(info.caller_cut) * REEL_SHARE_OF_CALLER_FEE * (amt / Number(info.pot)); }
      }
      by.set(r.handle, e);
    }
    const items = [...by.values()].sort((a, b) => b.hits - a.hits || b.backed_raw - a.backed_raw || b.reels - a.reels);
    return { items, attribution: 'off-chain attribution, demo', share: 'reel creator: 20% of the caller fee (0.5% of profit) on a hit' };
  });
}

/** NEAR RPC implementation (testnet by default). */
export function rpcReelChain(rpc: string, chest: string): ReelChain {
  const call = async (method: string, params: unknown) => (await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(10_000) }).then((r) => r.json()) as { result?: unknown }).result;
  const cache = new Map<number, { at: number; v: RaidInfo | null }>();
  return {
    async backTx(tx, backer) {
      const st = await call('EXPERIMENTAL_tx_status', { tx_hash: tx, sender_account_id: backer, wait_until: 'FINAL' }) as { receipts_outcome?: { outcome: { executor_id: string; logs: string[] } }[] } | undefined;
      for (const r of st?.receipts_outcome ?? []) for (const l of r.outcome.logs) {
        if (r.outcome.executor_id !== chest || !l.startsWith('EVENT_JSON:')) continue;
        const ev = JSON.parse(l.slice(11)) as { event: string; data: unknown };
        const dd = (Array.isArray(ev.data) ? ev.data[0] : ev.data) as { id: number; backer: string; amount: string };
        if (ev.event === 'raid_backed' && dd.backer === backer && Number(dd.amount) > 0) return { raidId: dd.id, amount: dd.amount };
      }
      return null;
    },
    async raid(id) {
      const c = cache.get(id); if (c && Date.now() - c.at < 30_000) return c.v;
      const res = await call('query', { request_type: 'call_function', finality: 'final', account_id: chest, method_name: 'get_raid', args_base64: Buffer.from(JSON.stringify({ id })).toString('base64') }) as { result?: number[] } | undefined;
      const v = res?.result ? JSON.parse(Buffer.from(res.result).toString()) as RaidInfo | null : null;
      cache.set(id, { at: Date.now(), v }); return v;
    },
  };
}
