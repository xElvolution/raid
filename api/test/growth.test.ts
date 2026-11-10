import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { nextReset, leagueFor } from '../src/leaderboard.js';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => { t = await setup(); });
afterEach(async () => { await t.close(); });

describe('leaderboard helpers', () => {
  it('resets next Monday 00:00 UTC', () => {
    expect(nextReset(new Date('2026-10-21T08:00:00Z')).toISOString()).toBe('2026-10-26T00:00:00.000Z');
    expect(nextReset(new Date('2026-10-26T00:00:01Z')).toISOString()).toBe('2026-11-02T00:00:00.000Z');
  });
  it('maps xp to leagues up to Legend', () => {
    expect(leagueFor(0)).toBe('Bronze'); expect(leagueFor(650)).toBe('Gold'); expect(leagueFor(25000)).toBe('Legend');
  });
});

describe('private leagues', () => {
  it('creates, joins by code and ranks only members', async () => {
    const a = await t.signIn('alice.testnet', 'alice');
    const b = await t.signIn('bob.testnet', 'bob');
    await t.signIn('carol.testnet', 'carol');
    const c = await t.app.inject({ method: 'POST', url: '/v1/leagues', headers: a.auth, payload: { name: 'Office' } });
    expect(c.statusCode).toBe(200);
    const code = c.json<{ code: string }>().code;
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
    expect((await t.app.inject({ method: 'POST', url: `/v1/leagues/${code}/join`, headers: b.auth })).statusCode).toBe(200);
    expect((await t.app.inject({ method: 'POST', url: '/v1/leagues/ZZZZZZ/join', headers: b.auth })).statusCode).toBe(404);
    const res = await t.app.inject({ method: 'GET', url: '/v1/leagues', headers: b.auth });
    const mine = res.json<{ items: { code: string; members: number }[] }>();
    expect(mine.items[0]).toMatchObject({ code, members: 2 });
    expect((await t.app.inject({ method: 'POST', url: '/v1/leagues', payload: { name: 'x' } })).statusCode).toBe(401);
  });
});

describe('challenges and funds', () => {
  it('lists challenges and refuses unearned claims', async () => {
    const a = await t.signIn('dora.testnet', 'dora');
    const l = (await t.app.inject({ method: 'GET', url: '/v1/challenges', headers: a.auth })).json<{ items: { id: string; done: boolean }[] }>();
    expect(l.items.map((x) => x.id)).toEqual(['call3', 'trade50', 'post1', 'streak']);
    expect((await t.app.inject({ method: 'POST', url: '/v1/challenges/trade50/claim', headers: a.auth })).statusCode).toBe(409);
  });
  it('rejects malformed and unconfigured NEAR deposits, queues withdrawals against balance', async () => {
    const a = await t.signIn('erin.testnet', 'erin');
    expect((await t.app.inject({ method: 'POST', url: '/v1/funds/near/deposit', headers: a.auth, payload: { txHash: 'nope' } })).statusCode).toBe(400);
    const real = await t.app.inject({ method: 'POST', url: '/v1/funds/near/deposit', headers: a.auth, payload: { txHash: '9'.repeat(44) } });
    expect([503, 422]).toContain(real.statusCode);
    expect((await t.app.inject({ method: 'POST', url: '/v1/funds/near/withdraw', headers: a.auth, payload: { amount: 1e9 } })).statusCode).toBe(400);
    expect((await t.app.inject({ method: 'POST', url: '/v1/funds/near/withdraw', headers: a.auth, payload: { amount: 99_999 } })).statusCode).toBe(409);
  });
});
