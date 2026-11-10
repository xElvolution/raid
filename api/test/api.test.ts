import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { indexLogs, type LogEntry } from '../src/indexer.js';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => { t = await setup(); });
afterEach(async () => { await t.close(); });

const ev = (event: string, data: Record<string, unknown>) => `EVENT_JSON:${JSON.stringify({ standard: 'called', version: '0.1.0', event, data: [data] })}`;

describe('auth (NEP-413)', () => {
  it('signs in with a valid signature and creates the user', async () => {
    const s = await t.signIn('alice.testnet', 'alice');
    expect(s.res.statusCode).toBe(200);
    const me = await t.app.inject({ method: 'GET', url: '/v1/me', headers: s.auth });
    expect(me.json().handle).toBe('alice');
  });
  it('rejects nonce replay', async () => {
    const s = await t.signIn('alice.testnet', 'alice');
    const again = await t.app.inject({ method: 'POST', url: '/v1/auth/signin', payload: { signed: s.signed } });
    expect(again.statusCode).toBe(401);
    expect(again.json().error).toMatch(/nonce/);
  });
  it('rejects a tampered signature', async () => {
    const s = await t.signIn('alice.testnet', 'alice');
    const { nonce } = (await t.app.inject({ method: 'POST', url: '/v1/auth/nonce' })).json();
    const r = await t.app.inject({ method: 'POST', url: '/v1/auth/signin', payload: { signed: { ...s.signed, nonce } } });
    expect(r.json().error).toBe('bad signature');
  });
  it('requires auth for writes', async () => {
    expect((await t.app.inject({ method: 'POST', url: '/v1/posts', payload: { body: 'hi' } })).statusCode).toBe(401);
  });
});

describe('social', () => {
  it('posts, follows, following feed and cursor pagination', async () => {
    const a = await t.signIn('alice.testnet', 'alice');
    const b = await t.signIn('bob.testnet', 'bob');
    for (let i = 0; i < 35; i++) await t.app.inject({ method: 'POST', url: '/v1/posts', headers: a.auth, payload: { body: `take ${i}` } });
    await t.app.inject({ method: 'POST', url: '/v1/posts', headers: b.auth, payload: { body: 'bob take', makeMarket: true } });
    expect(t.jobs.items.filter((j) => j.name === 'draft-market')).toHaveLength(1);

    expect((await t.app.inject({ method: 'POST', url: '/v1/follows/alice', headers: b.auth })).statusCode).toBe(204);
    const notes = await t.app.inject({ method: 'GET', url: '/v1/notifications', headers: a.auth });
    expect(notes.json().items[0].kind).toBe('follow');

    const p1 = (await t.app.inject({ method: 'GET', url: '/v1/feed?tab=following', headers: b.auth })).json();
    expect(p1.items).toHaveLength(30);
    expect(p1.items.every((i: { handle: string }) => i.handle === 'alice')).toBe(true);
    const p2 = (await t.app.inject({ method: 'GET', url: `/v1/feed?tab=following&cursor=${p1.next}`, headers: b.auth })).json();
    expect(p2.items).toHaveLength(5);
    expect(p2.next).toBeNull();
    const ids = new Set([...p1.items, ...p2.items].map((i: { id: string }) => i.id));
    expect(ids.size).toBe(35);

    const prof = (await t.app.inject({ method: 'GET', url: '/v1/users/alice' })).json();
    expect(prof.followers).toBe(1);
    expect(prof.streak).toBe(1);
  });

  it('validates input', async () => {
    const a = await t.signIn('alice.testnet', 'alice');
    expect((await t.app.inject({ method: 'POST', url: '/v1/posts', headers: a.auth, payload: { body: 'x'.repeat(3001) } })).statusCode).toBe(400);
    expect((await t.app.inject({ method: 'GET', url: '/v1/feed?tab=nope' })).statusCode).toBe(400);
  });
});

const logs = (): LogEntry[] => [
  { receiptId: 'r1', logIndex: 0, blockHeight: 10, blockTimeMs: 1_790_000_000_000, log: ev('market_created', { market_id: '0', creator: 'alice.testnet', question: 'Rain in Lagos?', close_ms: '1800000000000' }) },
  { receiptId: 'r2', logIndex: 0, blockHeight: 11, blockTimeMs: 1_790_000_001_000, log: ev('trade', { market_id: '0', account: 'bob.testnet', side: 'buy', outcome: 1, amount: '50000000', shares: '91000000', price_yes_ppm: '640000' }) },
  { receiptId: 'r2', logIndex: 1, blockHeight: 11, blockTimeMs: 1_790_000_001_000, log: 'EVENT_JSON:{"standard":"nep245","event":"mt_mint","data":[]}' },
];

describe('indexer', () => {
  it('is idempotent and updates markets, positions, leaderboards', async () => {
    const b = await t.signIn('bob.testnet', 'bob');
    expect(await indexLogs(t.db, t.bus, t.kv, logs())).toBe(2);
    expect(await indexLogs(t.db, t.bus, t.kv, logs())).toBe(1); // market upsert counted, trade deduped
    const [m] = await t.db.query<{ price_yes: string; volume: string }>("SELECT price_yes, volume FROM markets WHERE venue='called' AND external_id='0'");
    expect(Number(m?.price_yes)).toBeCloseTo(0.64);
    expect(m?.volume).toBe('50000000');
    const [p] = await t.db.query<{ shares: string }>('SELECT shares FROM positions');
    expect(p?.shares).toBe('91000000');
    const lb = (await t.app.inject({ method: 'GET', url: '/v1/leaderboards?window=24h' })).json();
    expect(lb.items[0].handle).toBe('bob');
    void b;
    const [cp] = await t.db.query<{ block_height: string }>("SELECT block_height FROM indexer_checkpoint WHERE name='called'");
    expect(Number(cp?.block_height)).toBe(11);
  });

  it('records verifiable resolutions', async () => {
    await indexLogs(t.db, t.bus, t.kv, logs());
    await indexLogs(t.db, t.bus, t.kv, [{ receiptId: 'r3', logIndex: 0, blockHeight: 12, blockTimeMs: 1_800_000_100_000, log: ev('resolution_proposed', { market_id: '0', outcome: 'YES', signer: 'ab'.repeat(32), signed_text: 'x:y' }) }]);
    const [m] = await t.db.query<{ id: string }>("SELECT id FROM markets WHERE external_id='0'");
    const r = (await t.app.inject({ method: 'GET', url: `/v1/markets/${m?.id}` })).json();
    expect(r.market.status).toBe('proposed');
    expect(r.resolution.signer).toBe('ab'.repeat(32));
  });
});

describe('compliance', () => {
  it('rate limits per user', async () => {
    const a = await t.signIn('alice.testnet', 'alice');
    let last = 0;
    for (let i = 0; i < 62; i++) last = (await t.app.inject({ method: 'GET', url: '/v1/me', headers: a.auth })).statusCode;
    expect(last).toBe(429);
  });
});

describe('realtime', () => {
  it('fans out trades and coalesced odds over websockets', async () => {
    await t.app.listen({ port: 0, host: '127.0.0.1' });
    const addr = t.app.server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    await indexLogs(t.db, t.bus, t.kv, logs().slice(0, 1));
    const [m] = await t.db.query<{ id: string }>("SELECT id FROM markets WHERE external_id='0'");
    const ws = new WebSocket(`ws://127.0.0.1:${port}/v1/live`);
    const got: { type: string; channel?: string }[] = [];
    ws.on('message', (d) => got.push(JSON.parse(d.toString())));
    await new Promise((r) => ws.on('open', r));
    ws.send(JSON.stringify({ op: 'sub', channel: `market:${m?.id}` }));
    ws.send(JSON.stringify({ op: 'sub', channel: 'notifications:999' }));
    await new Promise((r) => setTimeout(r, 50));
    await indexLogs(t.db, t.bus, t.kv, logs().slice(1));
    await new Promise((r) => setTimeout(r, 400));
    expect(got.find((g) => g.type === 'subscribed')?.channel).toBe(`market:${m?.id}`);
    expect(got.some((g) => g.type === 'denied')).toBe(true);
    expect(got.some((g) => g.type === 'trade')).toBe(true);
    expect(got.some((g) => g.type === 'odds')).toBe(true);
    ws.close();
    await new Promise((r) => setTimeout(r, 50));
    expect(t.bus.channelCount()).toBe(0);
  });
});

describe('free predictions (points mode)', () => {
  it('records one call per market, awards XP and serves the daily deck', async () => {
    const a = await t.signIn('alice.testnet', 'alice');
    await indexLogs(t.db, t.bus, t.kv, [{ receiptId: 'p1', logIndex: 0, blockHeight: 1, blockTimeMs: Date.now(), log: ev('market_created', { market_id: '0', creator: 'alice.testnet', question: 'Will it rain?', close_ms: String(Date.now() + 86_400_000) }) }]);
    const daily = (await t.app.inject({ method: 'GET', url: '/v1/daily', headers: a.auth })).json();
    expect(daily.items).toHaveLength(1);
    const id = String(daily.items[0].id);
    const r = await t.app.inject({ method: 'POST', url: '/v1/predictions', headers: a.auth, payload: { marketId: id, outcome: 1 } });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ xpGained: 10, streak: 1, xp: 10, crowd: { yes: 1, total: 1 } });
    expect((await t.app.inject({ method: 'POST', url: '/v1/predictions', headers: a.auth, payload: { marketId: id, outcome: 0 } })).json().error).toBe('already_called');
    expect((await t.app.inject({ method: 'GET', url: '/v1/daily', headers: a.auth })).json().items).toHaveLength(0);
    expect((await t.app.inject({ method: 'POST', url: '/v1/predictions', headers: a.auth, payload: { marketId: '999', outcome: 1 } })).statusCode).toBe(409);
  });
});
