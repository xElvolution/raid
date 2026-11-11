import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setup } from './helpers.js';

let t: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => { t = await setup(); });
afterEach(async () => { await t.close(); });

describe('raid social', () => {
  it('posts on a raid, replies, likes, follows and the following tab', async () => {
    const a = await t.signIn('alice.testnet', 'alice');
    const b = await t.signIn('bob.testnet', 'bob');
    expect((await t.app.inject({ method: 'POST', url: '/v1/raid/posts', payload: { body: 'x' } })).statusCode).toBe(401);
    const p = await t.app.inject({ method: 'POST', url: '/v1/raid/posts', headers: a.auth, payload: { body: 'Crew forming on $PEPE, 1.5x line', raidId: 0, coin: 'PEPE' } });
    expect(p.statusCode).toBe(201);
    const id = p.json().id as string;
    expect(p.json()).toMatchObject({ handle: 'alice', raid_id: 0, coin: 'PEPE', demo: false });
    const r = await t.app.inject({ method: 'POST', url: '/v1/raid/posts', headers: b.auth, payload: { body: 'in with 25', replyTo: id } });
    expect(r.json()).toMatchObject({ reply_to: id, coin: 'PEPE' });
    expect((await t.app.inject({ method: 'POST', url: `/v1/raid/posts/${id}/like`, headers: b.auth })).json()).toEqual({ liked: true, likes: 1 });
    expect((await t.app.inject({ method: 'POST', url: `/v1/raid/posts/${id}/like`, headers: b.auth })).json().likes).toBe(1); // idempotent

    const feed = (await t.app.inject({ method: 'GET', url: '/v1/raid/feed', headers: b.auth })).json();
    expect(feed.items).toHaveLength(1); // replies stay in the thread
    expect(feed.items[0]).toMatchObject({ id, likes: 1, replies: 1, liked: true, following: false });
    expect((await t.app.inject({ method: 'GET', url: '/v1/raid/feed?raid=0' })).json().items).toHaveLength(1);
    expect((await t.app.inject({ method: 'GET', url: '/v1/raid/feed?coin=DOGE' })).json().items).toHaveLength(0);

    expect((await t.app.inject({ method: 'GET', url: '/v1/raid/feed?tab=following', headers: b.auth })).json().items).toHaveLength(0);
    await t.app.inject({ method: 'POST', url: '/v1/follows/alice', headers: b.auth });
    const fol = (await t.app.inject({ method: 'GET', url: '/v1/raid/feed?tab=following', headers: b.auth })).json();
    expect(fol.items[0]).toMatchObject({ handle: 'alice', following: true });

    const thread = (await t.app.inject({ method: 'GET', url: `/v1/raid/posts/${id}` })).json();
    expect(thread.replies.map((x: { handle: string }) => x.handle)).toEqual(['bob']);
    const callers = (await t.app.inject({ method: 'GET', url: '/v1/raid/callers', headers: b.auth })).json();
    expect(callers.items[0]).toMatchObject({ handle: 'alice', followers: 1, following: true });
    expect((await t.app.inject({ method: 'DELETE', url: `/v1/raid/posts/${id}/like`, headers: b.auth })).json()).toEqual({ liked: false, likes: 0 });
  });

  it('validates input', async () => {
    const a = await t.signIn('alice.testnet', 'alice');
    expect((await t.app.inject({ method: 'POST', url: '/v1/raid/posts', headers: a.auth, payload: { body: '' } })).statusCode).toBe(400);
    expect((await t.app.inject({ method: 'POST', url: '/v1/raid/posts', headers: a.auth, payload: { body: 'x', coin: 'pepe!' } })).statusCode).toBe(400);
    expect((await t.app.inject({ method: 'POST', url: '/v1/raid/posts', headers: a.auth, payload: { body: 'x', replyTo: '999' } })).statusCode).toBe(404);
    expect((await t.app.inject({ method: 'GET', url: '/v1/raid/feed?tab=following' })).statusCode).toBe(401);
  });
});
