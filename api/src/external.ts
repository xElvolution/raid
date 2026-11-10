/**
 * External venues (Polymarket). Two parts:
 *  - Read: the live CLOB order book for a mirrored market, proxied with a short cache and a timeout.
 *  - Write: real-money order routing. Only active when a router is configured from env keys; otherwise
 *    the endpoint answers 503 venue_not_configured. Region gate runs before any order is built, and
 *    every attempt is written to external_orders for audit.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Db as Database } from './db/index.js';

export interface ExternalOrder { tokenId: string; side: 'buy' | 'sell'; type: 'market' | 'limit'; amount: number; limitPrice?: number }
export interface OrderResult { ok: boolean; orderId?: string; status: string; error?: string }
/** Places orders on a venue. Implemented by PolymarketRouter when keys are configured. */
export interface VenueRouter { readonly venue: 'polymarket'; place(o: ExternalOrder): Promise<OrderResult> }

type Guard = (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
export interface ExternalDeps {
  db: Database; requireUser: Guard; requireRealMoneyRegion: Guard;
  router?: VenueRouter | null;
  clobUrl?: string;
  fetch?: typeof fetch;
  kvHit: (key: string, ttlSec: number) => Promise<number>;
}

interface Level { price: number; size: number }
export interface NormalBook { asks: Level[]; bids: Level[]; spread: number | null; mid: number | null; source: 'polymarket'; ts: number }

/** CLOB returns strings, asks high→low and bids low→high; we normalise to best-first numbers. */
export function normaliseClobBook(raw: unknown, depth = 10): NormalBook {
  const L = z.array(z.object({ price: z.string(), size: z.string() }));
  const b = z.object({ asks: L.default([]), bids: L.default([]) }).parse(raw);
  const n = (l: { price: string; size: string }) => ({ price: Number(l.price), size: Number(l.size) });
  const asks = b.asks.map(n).filter((l) => l.size > 0).sort((x, y) => x.price - y.price).slice(0, depth);
  const bids = b.bids.map(n).filter((l) => l.size > 0).sort((x, y) => y.price - x.price).slice(0, depth);
  const spread = asks[0] && bids[0] ? +(asks[0].price - bids[0].price).toFixed(4) : null;
  const mid = asks[0] && bids[0] ? +((asks[0].price + bids[0].price) / 2).toFixed(4) : null;
  return { asks, bids, spread, mid, source: 'polymarket', ts: Date.now() };
}

/** Walks the book for a market buy of `usd`: shares received, average price, and worst level touched. */
export function fillEstimate(asks: Level[], usd: number): { shares: number; avg: number; worst: number; filled: number } {
  let left = usd, shares = 0, worst = 0;
  for (const l of asks) {
    if (left <= 0) break;
    const cost = Math.min(left, l.price * l.size);
    shares += cost / l.price; left -= cost; worst = l.price;
  }
  const filled = usd - left;
  return { shares, avg: shares ? filled / shares : 0, worst, filled };
}

const Order = z.object({
  outcome: z.union([z.literal(0), z.literal(1)]),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit']),
  amount: z.number().positive().max(10_000),
  limitPrice: z.number().gt(0).lt(1).optional(),
}).refine((o) => o.type === 'market' || o.limitPrice !== undefined, { message: 'limitPrice required for limit orders' });

export function registerExternal(app: FastifyInstance, deps: ExternalDeps) {
  const f = deps.fetch ?? fetch;
  const clob = deps.clobUrl ?? 'https://clob.polymarket.com';
  const cache = new Map<string, { at: number; book: NormalBook }>();

  const tokensFor = async (id: string) => {
    const [m] = await deps.db.query<{ venue: string; clob_token_ids: string[] | null; status: string }>('SELECT venue, clob_token_ids, status FROM markets WHERE id=$1', [id]);
    return m;
  };

  app.get('/v1/external/status', async () => ({
    polymarket: deps.router ? { routing: 'enabled' } : { routing: 'disabled', reason: 'venue_not_configured' },
  }));

  app.get<{ Params: { id: string }; Querystring: { outcome?: string } }>('/v1/external/:id/book', async (req, reply) => {
    if (!/^\d+$/.test(req.params.id)) return reply.code(400).send({ error: 'bad_id' });
    const m = await tokensFor(req.params.id);
    if (!m) return reply.code(404).send({ error: 'not_found' });
    if (m.venue !== 'polymarket') return reply.code(400).send({ error: 'not_external' });
    const outcome = req.query.outcome === '0' ? 1 : 0; // token index: [yes, no]
    const token = m.clob_token_ids?.[outcome];
    if (!token) return reply.code(409).send({ error: 'book_unavailable', detail: 'Token ids not synced yet' });
    const hit = cache.get(token);
    if (hit && Date.now() - hit.at < 3_000) return hit.book;
    try {
      const res = await f(`${clob}/book?token_id=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(4_000) });
      if (!res.ok) throw new Error(`clob ${res.status}`);
      const book = normaliseClobBook(await res.json());
      cache.set(token, { at: Date.now(), book });
      if (cache.size > 500) cache.delete(cache.keys().next().value!);
      return book;
    } catch (e) {
      req.log.warn({ err: e, marketId: req.params.id }, 'polymarket book fetch failed');
      if (hit) return { ...hit.book, stale: true };
      return reply.code(502).send({ error: 'upstream_unavailable' });
    }
  });

  app.post<{ Params: { id: string } }>('/v1/external/:id/order', { preHandler: [deps.requireUser, deps.requireRealMoneyRegion] }, async (req, reply) => {
    if (!/^\d+$/.test(req.params.id)) return reply.code(400).send({ error: 'bad_id' });
    const n = await deps.kvHit(`rl:ext:${req.userId}:${Math.floor(Date.now() / 60_000)}`, 60);
    if (n > 10) return reply.code(429).send({ error: 'rate_limited' });
    const parsed = Order.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_order', issues: parsed.error.issues.map((i) => i.message) });
    const o = parsed.data;
    const m = await tokensFor(req.params.id);
    if (!m || m.venue !== 'polymarket') return reply.code(404).send({ error: 'not_found' });
    if (m.status !== 'open') return reply.code(409).send({ error: 'market_closed' });
    const record = (status: string, extra: { venue_order_id?: string; error?: string } = {}) => deps.db.query(
      `INSERT INTO external_orders (user_id, market_id, venue, outcome, side, order_type, amount, limit_price, status, venue_order_id, error)
       VALUES ($1,$2,'polymarket',$3,$4,$5,$6,$7,$8,$9,$10)`,
      [req.userId, req.params.id, o.outcome, o.side, o.type, o.amount, o.limitPrice ?? null, status, extra.venue_order_id ?? null, extra.error ?? null]);
    if (!deps.router) {
      await record('rejected_not_configured');
      return reply.code(503).send({ error: 'venue_not_configured', detail: 'Real-money routing is not enabled on this deployment.' });
    }
    const token = m.clob_token_ids?.[o.outcome === 1 ? 0 : 1];
    if (!token) return reply.code(409).send({ error: 'book_unavailable' });
    try {
      const r = await deps.router.place({ tokenId: token, side: o.side, type: o.type, amount: o.amount, limitPrice: o.limitPrice });
      await record(r.ok ? r.status : 'failed', { venue_order_id: r.orderId, error: r.error });
      req.log.info({ userId: req.userId, marketId: req.params.id, status: r.status }, 'external order');
      return r.ok ? { ok: true, orderId: r.orderId, status: r.status } : reply.code(422).send({ error: 'order_rejected', detail: r.error });
    } catch (e) {
      req.log.error({ err: e, marketId: req.params.id }, 'external order failed');
      await record('error', { error: e instanceof Error ? e.message.slice(0, 500) : 'unknown' });
      return reply.code(502).send({ error: 'venue_error' });
    }
  });
}
