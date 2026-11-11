import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { draftMarket, isExcludedMarket, notificationText, notify, type WorkerDeps } from '../src/workers.js';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => { t = await setup(); });
afterEach(async () => { await t.close(); });

function fakeFetch(routes: Record<string, (body: unknown) => { status?: number; json: unknown }>) {
  const calls: { url: string; body: unknown }[] = [];
  const f = (async (u: URL | string, init: RequestInit = {}) => {
    const url = String(u);
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, body });
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) return new Response('nf', { status: 404 });
    const r = routes[key]?.(body);
    return new Response(JSON.stringify(r?.json), { status: r?.status ?? 200 });
  }) as typeof fetch;
  return { f, calls };
}

const draft = { question: 'Will Lagos see rain on 1 Nov 2026?', outcomes: ['NO', 'YES'], closeMs: 1_793_000_000_000, rules: 'Resolves YES if NiMet reports rain.', sources: ['https://nimet.gov.ng'], clarity: 0.9 };

describe('draft-market worker', () => {
  it('rejects political posts and political drafts with a friendly policy message', async () => {
    const a = await t.signIn('pol.testnet', 'pol');
    const [me] = await t.db.query<{ id: string }>("SELECT id FROM users WHERE handle='pol'");
    const live: string[] = [];
    await t.bus.subscribe(`notifications:${me?.id}`, (m) => live.push(m));
    const ff = fakeFetch({ '/draft': () => ({ json: { mode: 'stub', draft: { ...draft, question: 'Will the ruling party win the 2027 election?' } } }) });
    const deps: WorkerDeps = { db: t.db, bus: t.bus, fetch: ff.f, resolverUrl: 'http://resolver' };
    const p1 = (await t.app.inject({ method: 'POST', url: '/v1/posts', headers: a.auth, payload: { body: 'Trump wins the Senate vote, calling it', makeMarket: true } })).json();
    expect(await draftMarket(deps, { postId: String(p1.id) })).toBe('rejected');
    expect(ff.calls.filter((c) => c.url.includes('/draft'))).toHaveLength(0); // never sent to the AI
    const p2 = (await t.app.inject({ method: 'POST', url: '/v1/posts', headers: a.auth, payload: { body: 'Big news coming next year', makeMarket: true } })).json();
    expect(await draftMarket(deps, { postId: String(p2.id) })).toBe('rejected'); // AI produced a political question
    const drafts = (await t.app.inject({ method: 'GET', url: '/v1/drafts', headers: a.auth })).json();
    expect(drafts.items.map((d: { status: string; mode: string }) => [d.status, d.mode])).toEqual([['rejected', 'policy'], ['rejected', 'policy']]);
    const ev = JSON.parse(live[0] ?? '{}');
    expect(ev.data).toMatchObject({ kind: 'draft_rejected', payload: { reason: 'policy' } });
    expect(notificationText('draft_rejected', { reason: 'policy' })).toMatch(/politics, elections or world conflicts/);
    expect(notificationText('draft_rejected', {})).toBe("We couldn't turn that post into a fair market");
  });


  it('drafts via the resolver, stores once, notifies the author live', async () => {
    const a = await t.signIn('alice.testnet', 'alice');
    const { id } = (await t.app.inject({ method: 'POST', url: '/v1/posts', headers: a.auth, payload: { body: 'It will rain in Lagos on Nov 1', makeMarket: true } })).json();
    const ff = fakeFetch({ '/draft': () => ({ json: { mode: 'stub', draft } }) });
    const deps: WorkerDeps = { db: t.db, bus: t.bus, fetch: ff.f, resolverUrl: 'http://resolver', resolverToken: 'tok' };
    const live: string[] = [];
    const [me] = await t.db.query<{ id: string }>("SELECT id FROM users WHERE handle='alice'");
    await t.bus.subscribe(`notifications:${me?.id}`, (m) => live.push(m));
    expect(await draftMarket(deps, { postId: String(id) })).toBe('ready');
    expect(await draftMarket(deps, { postId: String(id) })).toBe('skipped');
    expect(ff.calls.filter((c) => c.url.includes('/draft'))).toHaveLength(1);
    const drafts = (await t.app.inject({ method: 'GET', url: '/v1/drafts', headers: a.auth })).json();
    expect(drafts.items[0].draft.question).toBe(draft.question);
    expect(drafts.items[0].mode).toBe('stub');
    expect(JSON.parse(live[0] ?? '{}').data.kind).toBe('draft_ready');
  });
  it('records rejections and throws on resolver errors so the queue retries', async () => {
    const a = await t.signIn('alice.testnet', 'alice');
    const p1 = (await t.app.inject({ method: 'POST', url: '/v1/posts', headers: a.auth, payload: { body: 'gm' } })).json();
    const p2 = (await t.app.inject({ method: 'POST', url: '/v1/posts', headers: a.auth, payload: { body: 'gm2' } })).json();
    const ok = fakeFetch({ '/draft': () => ({ json: { mode: 'nearai', draft: null } }) });
    expect(await draftMarket({ db: t.db, bus: t.bus, fetch: ok.f, resolverUrl: 'http://r' }, { postId: String(p1.id) })).toBe('rejected');
    const bad = fakeFetch({ '/draft': () => ({ status: 503, json: {} }) });
    await expect(draftMarket({ db: t.db, bus: t.bus, fetch: bad.f, resolverUrl: 'http://r' }, { postId: String(p2.id) })).rejects.toThrow(/503/);
  });
});

describe('notify worker', () => {
  it('sends to registered devices and prunes dead tokens', async () => {
    const a = await t.signIn('alice.testnet', 'alice');
    for (const token of ['ExponentPushToken[aaa]', 'ExponentPushToken[bbb]'])
      expect((await t.app.inject({ method: 'POST', url: '/v1/push-tokens', headers: a.auth, payload: { token, platform: 'android' } })).statusCode).toBe(204);
    expect((await t.app.inject({ method: 'POST', url: '/v1/push-tokens', headers: a.auth, payload: { token: 'nope', platform: 'ios' } })).statusCode).toBe(400);
    const [me] = await t.db.query<{ id: string }>("SELECT id FROM users WHERE handle='alice'");
    const ff = fakeFetch({ 'exp.host': () => ({ json: { data: [{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }] } }) });
    expect(await notify({ db: t.db, bus: t.bus, fetch: ff.f }, { userId: String(me?.id), kind: 'follow', payload: {} })).toBe(2);
    expect((ff.calls[0]?.body as { body: string }[])[0]?.body).toBe('You have a new follower');
    expect(await t.db.query('SELECT token FROM push_tokens')).toEqual([{ token: 'ExponentPushToken[aaa]' }]);
  });
});

describe('content policy', () => {
  it('blocks politics, elections and central-bank markets by tag or keyword, keeps sports', () => {
    for (const q of ['Who will win the 2028 presidential election?', 'Will Trump sign the bill?', 'Democratic Party wins the governor race in Ohio?', 'Fed rate cut in December?', 'Will Congress pass the budget?', 'Balance of power after midterms', 'US x Iran ceasefire continues through October 22?', 'US announces end of Iranian blockade?']) expect(isExcludedMarket({ question: q })).toBe(true);
    expect(isExcludedMarket({ question: 'Neutral?', tags: [{ label: 'Politics' }] })).toBe(true);
    for (const q of ['Thunder vs. Spurs', 'Will FC Bayern München win on 2026-10-21?', 'Will GTA VI release in 2026?', 'Will NEAR trade above $5?']) expect(isExcludedMarket({ question: q })).toBe(false);
  });
});

describe('Call it opening call', () => {
  const ready = () => fakeFetch({ '/draft': () => ({ json: { mode: 'stub', draft: { ...draft, closeMs: Date.now() + 7 * 864e5 } } }) });
  it('places the creator’s opening trade once the market goes live from the draft', async () => {
    const a = await t.signIn('maker.testnet', 'maker');
    const { id } = (await t.app.inject({ method: 'POST', url: '/v1/posts', headers: a.auth, payload: { body: 'It will rain in Lagos next week', makeMarket: true, opening: { outcome: 1, amount: 25 } } })).json();
    const pending = (await t.app.inject({ method: 'GET', url: `/v1/posts/${id}/opening`, headers: a.auth })).json();
    expect(pending).toMatchObject({ status: 'pending', outcome: 1, amount: 25, market_id: null });
    const ff = ready();
    expect(await draftMarket({ db: t.db, bus: t.bus, fetch: ff.f, resolverUrl: 'http://r' }, { postId: String(id) })).toBe('ready');
    const o = (await t.app.inject({ method: 'GET', url: `/v1/posts/${id}/opening`, headers: a.auth })).json();
    expect(o.status).toBe('placed');
    expect(o.market_id).toBeTruthy();
    expect(o.shares).toBeGreaterThan(25);
    expect(o.price_yes).toBeGreaterThan(0.5);
    const acct = (await t.app.inject({ method: 'GET', url: '/v1/play/account', headers: a.auth })).json();
    expect(acct.balance).toBeCloseTo(975, 6);
    expect(acct.open[0]).toMatchObject({ market_id: o.market_id, outcome: 1 });
    const post = (await t.app.inject({ method: 'GET', url: `/v1/posts/${id}` })).json();
    expect(String(post.post.market_id)).toBe(o.market_id);
    // Retrying a placed call never trades twice.
    expect((await t.app.inject({ method: 'POST', url: `/v1/posts/${id}/opening/retry`, headers: a.auth })).statusCode).toBe(200);
    expect((await t.app.inject({ method: 'GET', url: '/v1/play/account', headers: a.auth })).json().balance).toBeCloseTo(975, 6);
    const drafts = (await t.app.inject({ method: 'GET', url: '/v1/drafts', headers: a.auth })).json();
    expect(drafts.items[0].opening).toMatchObject({ status: 'placed', outcome: 1, amount: 25 });
  });

  it('records a failed opening with a reason, notifies, and can be retried', async () => {
    const a = await t.signIn('broke.testnet', 'broke');
    const [me] = await t.db.query<{ id: string }>("SELECT id FROM users WHERE handle='broke'");
    await t.db.query('INSERT INTO play_accounts (user_id, balance) VALUES ($1, 10) ON CONFLICT (user_id) DO UPDATE SET balance=10', [me?.id]);
    const { id } = (await t.app.inject({ method: 'POST', url: '/v1/posts', headers: a.auth, payload: { body: 'It will rain in Lagos next week', makeMarket: true, opening: { outcome: 0, amount: 50 } } })).json();
    expect(await draftMarket({ db: t.db, bus: t.bus, fetch: ready().f, resolverUrl: 'http://r' }, { postId: String(id) })).toBe('ready');
    const o = (await t.app.inject({ method: 'GET', url: `/v1/posts/${id}/opening`, headers: a.auth })).json();
    expect(o).toMatchObject({ status: 'failed', error: 'insufficient_balance' });
    const n = await t.db.query<{ kind: string }>('SELECT kind FROM notifications WHERE user_id=$1', [me?.id]);
    expect(n.map((x) => x.kind)).toContain('opening_failed');
    expect(notificationText('opening_failed', { error: 'insufficient_balance' })).toMatch(/not enough play balance/);
    // Others can't see or retry it.
    const b = await t.signIn('nosy.testnet', 'nosy');
    expect((await t.app.inject({ method: 'POST', url: `/v1/posts/${id}/opening/retry`, headers: b.auth })).statusCode).toBe(403);
    // Top up, retry, and it goes through.
    await t.db.query('UPDATE play_accounts SET balance=100 WHERE user_id=$1', [me?.id]);
    const r = await t.app.inject({ method: 'POST', url: `/v1/posts/${id}/opening/retry`, headers: a.auth });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ status: 'placed', outcome: 0, error: null });
  });

  it('rejects an opening without makeMarket', async () => {
    const a = await t.signIn('xavier.testnet', 'xavier');
    expect((await t.app.inject({ method: 'POST', url: '/v1/posts', headers: a.auth, payload: { body: 'hello there', opening: { outcome: 1, amount: 5 } } })).statusCode).toBe(400);
  });
});
