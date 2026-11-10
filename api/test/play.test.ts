import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { quoteBuy, quoteSell } from '../src/play.js';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeAll(async () => { t = await setup(); });
afterAll(async () => { await t.close(); });

const market = async (venue = 'called', ext = 'm1') => (await t.db.query<{ id: string }>(
  "INSERT INTO markets (venue, external_id, question, close_ts, price_yes) VALUES ($1,$2,'Will it rain?', now() + interval '3 days', 0.5) RETURNING id", [venue, ext]))[0]!.id;

describe('play-money LMSR', () => {
  it('buy then sell the same shares round-trips cost and price', () => {
    const b = quoteBuy(0.5, 1, 100);
    expect(b.priceYes).toBeGreaterThan(0.5);
    expect(b.shares).toBeGreaterThan(100); // bought below $1 a share
    const s = quoteSell(b.priceYes, 1, b.shares);
    expect(s.amount).toBeCloseTo(100, 6);
    expect(s.priceYes).toBeCloseTo(0.5, 6);
    expect(quoteBuy(0.5, 0, 100).priceYes).toBeLessThan(0.5);
  });
});

describe('play routes', () => {
  it('trades move prices, update balance and positions, and settle on resolution', async () => {
    const a = await t.signIn('trader.testnet', 'trader');
    const id = String(await market());
    const acct0 = (await t.app.inject({ method: 'GET', url: '/v1/play/account', headers: a.auth })).json();
    expect(acct0.balance).toBe(1000);
    const buy = await t.app.inject({ method: 'POST', url: '/v1/play/trade', headers: a.auth, payload: { marketId: id, outcome: 1, side: 'buy', amount: 100 } });
    expect(buy.statusCode).toBe(200);
    const r = buy.json();
    expect(r.priceYes).toBeGreaterThan(0.5);
    expect(r.account.balance).toBeCloseTo(900, 6);
    expect(r.account.open[0]).toMatchObject({ market_id: id, outcome: 1 });
    const m = (await t.app.inject({ method: 'GET', url: `/v1/markets/${id}` })).json();
    expect(Number(m.market.price_yes)).toBeCloseTo(r.priceYes, 5);
    expect(m.market.spark.length).toBeGreaterThan(0);
    const half = r.shares / 2;
    const sell = (await t.app.inject({ method: 'POST', url: '/v1/play/trade', headers: a.auth, payload: { marketId: id, outcome: 1, side: 'sell', shares: half } })).json();
    expect(sell.priceYes).toBeLessThan(r.priceYes);
    expect(sell.account.balance).toBeGreaterThan(900);
    expect((await t.app.inject({ method: 'POST', url: '/v1/play/trade', headers: a.auth, payload: { marketId: id, outcome: 1, side: 'sell', shares: r.shares } })).json().error).toBe('insufficient_shares');
    expect((await t.app.inject({ method: 'POST', url: '/v1/play/trade', headers: a.auth, payload: { marketId: id, outcome: 0, side: 'buy', amount: 5000 } })).json().error).toBe('insufficient_balance');
    // settle YES: remaining shares pay $1 each, once
    await t.db.query("UPDATE markets SET status='final', outcome='YES' WHERE id=$1", [id]);
    const before = sell.account.balance;
    const s1 = (await t.app.inject({ method: 'GET', url: '/v1/play/account', headers: a.auth })).json();
    expect(s1.balance).toBeCloseTo(before + half, 4);
    expect(s1.settled[0]).toMatchObject({ won: true });
    const s2 = (await t.app.inject({ method: 'GET', url: '/v1/play/account', headers: a.auth })).json();
    expect(s2.balance).toBeCloseTo(s1.balance, 6);
    const top = (await t.app.inject({ method: 'GET', url: '/v1/play/top' })).json();
    expect(top.items[0].handle).toBe('trader');
  });

  it('rejects external markets, guests, and keeps demo sign-in off by default', async () => {
    const a = await t.signIn('trader2.testnet', 'trader2');
    const ext = String(await market('polymarket', 'pm1'));
    expect((await t.app.inject({ method: 'POST', url: '/v1/play/trade', headers: a.auth, payload: { marketId: ext, outcome: 1, side: 'buy', amount: 5 } })).json().error).toBe('external_market');
    expect((await t.app.inject({ method: 'POST', url: '/v1/play/trade', payload: { marketId: ext, outcome: 1, side: 'buy', amount: 5 } })).statusCode).toBe(401);
    expect((await t.app.inject({ method: 'POST', url: '/v1/auth/demo' })).statusCode).toBe(404);
    const d = (await t.app.inject({ method: 'POST', url: '/v1/play/deposit', headers: a.auth, payload: { amount: 250 } })).json();
    expect(d.balance).toBe(1250);
    expect((await t.app.inject({ method: 'POST', url: '/v1/play/withdraw', headers: a.auth, payload: { amount: 5000 } })).statusCode).toBe(409);
  });
});

import { lmsrBook } from '../src/play.js';
describe('lmsrBook', () => {
  it('asks sit above and bids below the price, with growing cumulative totals', () => {
    const b = lmsrBook(0.42);
    expect(b.asks[0]!.price).toBeGreaterThan(0.42);
    expect(b.bids[0]!.price).toBeLessThan(0.42);
    expect(b.asks.every((l, i) => i === 0 || l.total > b.asks[i - 1]!.total)).toBe(true);
    expect(b.asks.every((l) => l.shares > 0)).toBe(true);
    expect(b.spread).toBeCloseTo(0.02, 5);
  });
});
