import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fillEstimate, normaliseClobBook, type ExternalOrder, type VenueRouter } from '../src/external.js';
import { setup } from './helpers.js';

const placed: ExternalOrder[] = [];
const router: VenueRouter = { venue: 'polymarket', place: async (o) => { placed.push(o); return { ok: true, orderId: 'ord-1', status: 'matched' }; } };
let t: Awaited<ReturnType<typeof setup>>, off: Awaited<ReturnType<typeof setup>>;
beforeAll(async () => { t = await setup({ router }); off = await setup(); });
afterAll(async () => { await t.close(); await off.close(); });

const poly = async (db: typeof t.db) => (await db.query<{ id: string }>(
  `INSERT INTO markets (venue, external_id, question, close_ts, price_yes, clob_token_ids) VALUES ('polymarket', 'p1', 'Will X?', now() + interval '3 days', 0.4, '["111","222"]') RETURNING id`))[0]!.id;
const UK = { 'cf-ipcountry': 'GB' };

describe('CLOB book helpers', () => {
  it('normalises the raw book best-first and computes spread and mid', () => {
    const b = normaliseClobBook({ asks: [{ price: '0.45', size: '10' }, { price: '0.42', size: '100' }], bids: [{ price: '0.38', size: '50' }, { price: '0.40', size: '20' }] });
    expect(b.asks[0]!.price).toBe(0.42);
    expect(b.bids[0]!.price).toBe(0.4);
    expect(b.spread).toBe(0.02);
    expect(b.mid).toBe(0.41);
  });
  it('walks asks for a market buy', () => {
    const e = fillEstimate([{ price: 0.4, size: 100 }, { price: 0.5, size: 100 }], 60);
    expect(e.filled).toBe(60);
    expect(e.worst).toBe(0.5);
    expect(e.shares).toBeCloseTo(100 + 20 / 0.5, 6);
  });
});

describe('external order routing', () => {
  it('returns 503 when no router is configured, and records the attempt', async () => {
    const a = await off.signIn('ext.testnet', 'extuser');
    const id = await poly(off.db);
    const r = await off.app.inject({ method: 'POST', url: `/v1/external/${id}/order`, headers: { ...a.auth, ...UK }, payload: { outcome: 1, side: 'buy', type: 'market', amount: 10 } });
    expect(r.statusCode).toBe(503);
    expect(r.json().error).toBe('venue_not_configured');
    const [row] = await off.db.query<{ status: string }>('SELECT status FROM external_orders');
    expect(row!.status).toBe('rejected_not_configured');
  });
  it('blocks restricted regions before building an order', async () => {
    const a = await t.signIn('us.testnet', 'ususer');
    const id = await poly(t.db);
    const r = await t.app.inject({ method: 'POST', url: `/v1/external/${id}/order`, headers: { ...a.auth, 'cf-ipcountry': 'US' }, payload: { outcome: 1, side: 'buy', type: 'market', amount: 10 } });
    expect(r.statusCode).toBe(451);
    expect(placed).toHaveLength(0);
  });
  it('validates and routes to the YES token', async () => {
    const a = await t.signIn('uk.testnet', 'ukuser');
    const [{ id }] = await t.db.query<{ id: string }>("SELECT id FROM markets WHERE external_id='p1'") as [{ id: string }];
    const bad = await t.app.inject({ method: 'POST', url: `/v1/external/${id}/order`, headers: { ...a.auth, ...UK }, payload: { outcome: 1, side: 'buy', type: 'limit', amount: 10 } });
    expect(bad.statusCode).toBe(400);
    const ok = await t.app.inject({ method: 'POST', url: `/v1/external/${id}/order`, headers: { ...a.auth, ...UK }, payload: { outcome: 1, side: 'buy', type: 'market', amount: 10 } });
    expect(ok.statusCode).toBe(200);
    expect(placed[0]).toMatchObject({ tokenId: '111', amount: 10, type: 'market' });
  });
  it('requires auth', async () => {
    const r = await t.app.inject({ method: 'POST', url: '/v1/external/1/order', payload: {} });
    expect(r.statusCode).toBe(401);
  });
});
