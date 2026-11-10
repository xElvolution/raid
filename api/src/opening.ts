/**
 * Call it opening call. The creator picks a side and stake in the studio; it waits as `pending`
 * until the market goes live from the AI draft, then is placed through the normal play trade path.
 * Failures are kept with a reason so the app can show them and retry.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Db } from './db/index.js';
import type { Bus } from './infra/bus.js';
import { executeTrade } from './play.js';

export interface OpeningCall { post_id: string; outcome: number; amount: number; status: 'pending' | 'placed' | 'failed'; error: string | null; market_id: string | null; shares: number | null; price_yes: number | null }

export async function saveOpening(db: Db, postId: string, userId: string, o: { outcome: 0 | 1; amount: number }) {
  await db.query(`INSERT INTO opening_calls (post_id, user_id, outcome, amount) VALUES ($1,$2,$3,$4)
    ON CONFLICT (post_id) DO UPDATE SET outcome=EXCLUDED.outcome, amount=EXCLUDED.amount, status='pending', error=NULL, updated_at=now()`, [postId, userId, o.outcome, o.amount.toFixed(6)]);
}

export async function getOpening(db: Db, postId: string): Promise<OpeningCall | null> {
  const [r] = await db.query<Record<string, unknown>>('SELECT post_id::text, outcome, amount, status, error, market_id::text, shares, price_yes FROM opening_calls WHERE post_id=$1', [postId]);
  return r ? { ...(r as unknown as OpeningCall), amount: Number(r.amount), shares: r.shares == null ? null : Number(r.shares), price_yes: r.price_yes == null ? null : Number(r.price_yes) } : null;
}

/** Create (once) the play market for a ready draft and link it to the post. Returns the market id. */
export async function marketFromDraft(db: Db, postId: string): Promise<string | null> {
  const [d] = await db.query<{ id: string; draft: { question: string; closeMs: number; rules?: string } | null; status: string }>('SELECT id, draft, status FROM market_drafts WHERE post_id=$1', [postId]);
  if (!d || d.status !== 'ready' || !d.draft) return null;
  await db.query(`INSERT INTO markets (venue, external_id, question, rules, close_ts, price_yes) VALUES ('called',$1,$2,$3,to_timestamp($4::bigint/1000.0),0.5)
    ON CONFLICT (venue, external_id) DO NOTHING`, [`draft:${d.id}`, d.draft.question, d.draft.rules ?? '', String(d.draft.closeMs)]);
  const [m] = await db.query<{ id: string }>("SELECT id::text FROM markets WHERE venue='called' AND external_id=$1", [`draft:${d.id}`]);
  if (m) await db.query('UPDATE posts SET market_id=$2 WHERE id=$1 AND market_id IS NULL', [postId, m.id]);
  return m?.id ?? null;
}

/** Place the pending opening call on the post's market. Idempotent: a placed call is never placed twice. */
export async function placeOpening(db: Db, bus: Bus, postId: string, marketId?: string | null): Promise<OpeningCall | null> {
  const o = await getOpening(db, postId);
  if (!o || o.status === 'placed') return o;
  const mid = marketId ?? (await db.query<{ market_id: string | null }>('SELECT market_id::text FROM posts WHERE id=$1', [postId]))[0]?.market_id ?? null;
  if (!mid) return o; // still waiting for the market
  // Claim the row so concurrent callers can't double-place.
  const claim = await db.query("UPDATE opening_calls SET status='placed', market_id=$2, updated_at=now() WHERE post_id=$1 AND status<>'placed' RETURNING post_id", [postId, mid]);
  if (!claim.length) return getOpening(db, postId);
  const [u] = await db.query<{ user_id: string }>('SELECT user_id::text FROM opening_calls WHERE post_id=$1', [postId]);
  const r = await executeTrade(db, bus, u!.user_id, { marketId: mid, outcome: o.outcome as 0 | 1, side: 'buy', amount: o.amount }).catch((e: Error) => ({ code: 500, error: e.message || 'trade_failed' }));
  if ('ok' in r) await db.query('UPDATE opening_calls SET shares=$2, price_yes=$3, error=NULL, updated_at=now() WHERE post_id=$1', [postId, r.ok.shares.toFixed(6), r.ok.priceYes.toFixed(6)]);
  else await db.query("UPDATE opening_calls SET status='failed', error=$2, updated_at=now() WHERE post_id=$1", [postId, r.error]);
  return getOpening(db, postId);
}


export function registerOpening(app: FastifyInstance, deps: { db: Db; bus: Bus; requireUser: (req: FastifyRequest, reply: FastifyReply) => Promise<unknown> }) {
  const { db, bus, requireUser } = deps;
  const owned = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    if (!/^\d{1,19}$/.test(req.params.id)) { void reply.code(400).send({ error: 'bad_id' }); return false; }
    const [r] = await db.query<{ user_id: string }>('SELECT user_id::text FROM opening_calls WHERE post_id=$1', [req.params.id]);
    if (!r) { void reply.code(404).send({ error: 'not_found' }); return false; }
    if (r.user_id !== String(req.userId)) { void reply.code(403).send({ error: 'forbidden' }); return false; }
    return true;
  };
  app.get<{ Params: { id: string } }>('/v1/posts/:id/opening', { preHandler: requireUser }, async (req, reply) => {
    if (!(await owned(req, reply))) return;
    return getOpening(db, req.params.id);
  });
  /** Retry a failed opening call (e.g. after topping up), or place it now if the market is already live. */
  app.post<{ Params: { id: string } }>('/v1/posts/:id/opening/retry', { preHandler: requireUser }, async (req, reply) => {
    if (!(await owned(req, reply))) return;
    await db.query("UPDATE opening_calls SET status='pending', error=NULL, updated_at=now() WHERE post_id=$1 AND status='failed'", [req.params.id]);
    const mid = await marketFromDraft(db, req.params.id);
    const o = await placeOpening(db, bus, req.params.id, mid);
    return reply.code(o?.status === 'failed' ? 409 : 200).send(o);
  });
}
