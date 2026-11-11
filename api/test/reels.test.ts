import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { buildApp } from '../src/app.js';
import { nep413Hash } from '../src/auth.js';
import type { Db } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { MemoryBus, MemoryKv } from '../src/infra/bus.js';
import { MemoryJobs } from '../src/infra/queue.js';
import { embedProvider, mp4Duration, type RaidInfo } from '../src/reels.js';
import { seedRaidDemo, seedReelsDemo } from '../src/raid-demo-seed.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reels-'));
const mp4 = fs.readFileSync(new URL('../demo-reels/PEPE.mp4', import.meta.url));
const TX = '3bqaP3UiJCqrZL3g6Ui2ehtziwBZmDsjXGYmoN3xuCu6';
const raids = new Map<number, RaidInfo>([[3, { status: 'Closed', hit: true, pot: '200000000', caller_cut: '5000000' }]]);

async function setup() {
  const pg = new PGlite();
  const db: Db = { query: async (sql, params) => (await pg.query(sql, params as unknown[])).rows as never };
  await migrate(db);
  const keys = new Map<string, string>();
  const app = buildApp({
    db: { primary: db, replica: db, close: () => pg.close() }, bus: new MemoryBus(), kv: new MemoryKv(), jobs: new MemoryJobs(),
    checkKey: async (a, pk) => keys.get(a) === pk,
    reels: { dir, chain: { backTx: async (tx, backer) => (tx === TX && backer === 'bob.testnet' ? { raidId: 3, amount: '50000000' } : null), raid: async (id) => raids.get(id) ?? null } },
    config: { jwtSecret: 's'.repeat(40), signInRecipient: 'called.testnet', blockedCountries: [], corsOrigins: [] },
  });
  await app.ready();
  const kp = nacl.sign.keyPair(); const pk = `ed25519:${bs58.encode(kp.publicKey)}`; keys.set('alice.testnet', pk);
  const { nonce, recipient, message } = (await app.inject({ method: 'POST', url: '/v1/auth/nonce' })).json<{ nonce: string; recipient: string; message: string }>();
  const sig = nacl.sign.detached(nep413Hash(message, Buffer.from(nonce, 'base64'), recipient), kp.secretKey);
  const r = await app.inject({ method: 'POST', url: '/v1/auth/signin', payload: { signed: { accountId: 'alice.testnet', publicKey: pk, signature: Buffer.from(sig).toString('base64'), message, nonce, recipient }, handle: 'alice' } });
  return { app, db, pg, auth: { authorization: `Bearer ${r.json<{ token: string }>().token}` } };
}
const t = await setup();
afterAll(async () => { await t.app.close(); await t.pg.close(); });

describe('reels', () => {
  it('reads mp4 duration and accepts only X / Instagram / TikTok links', () => {
    expect(mp4Duration(mp4)).toBeCloseTo(8, 0);
    expect(mp4Duration(Buffer.from('not a video at all'))).toBeNull();
    expect(embedProvider('https://x.com/near/status/1')).toBe('x');
    expect(embedProvider('https://www.tiktok.com/@a/video/1')).toBe('tiktok');
    expect(embedProvider('https://instagram.com/reel/abc')).toBe('instagram');
    expect(embedProvider('http://x.com/a')).toBeNull();
    expect(embedProvider('https://evil.com/x.com')).toBeNull();
  });
  it('uploads an mp4, streams it with Range, posts a link, attributes a verified back and ranks the creator', async () => {
    expect((await t.app.inject({ method: 'POST', url: '/v1/raid/reels/upload?coin=PEPE&raidId=3', headers: { 'content-type': 'video/mp4' }, payload: mp4 })).statusCode).toBe(401);
    const up = await t.app.inject({ method: 'POST', url: '/v1/raid/reels/upload?coin=PEPE&raidId=3&caption=ape', headers: { ...t.auth, 'content-type': 'video/mp4' }, payload: mp4 });
    expect(up.statusCode).toBe(201);
    const reel = up.json<{ id: string; kind: string; duration_s: number }>();
    expect(reel.kind).toBe('video');
    const bad = await t.app.inject({ method: 'POST', url: '/v1/raid/reels/upload', headers: { ...t.auth, 'content-type': 'video/mp4' }, payload: Buffer.from('nope') });
    expect(bad.json()).toMatchObject({ error: 'not_mp4' });
    const part = await t.app.inject({ method: 'GET', url: `/v1/raid/reels/${reel.id}/video`, headers: { range: 'bytes=0-99' } });
    expect(part.statusCode).toBe(206); expect(part.rawPayload.length).toBe(100);
    const link = await t.app.inject({ method: 'POST', url: '/v1/raid/reels', headers: t.auth, payload: { embedUrl: 'https://x.com/near/status/123', coin: 'DOGE', caption: 'clip' } });
    expect(link.statusCode).toBe(201); expect(link.json()).toMatchObject({ kind: 'embed', provider: 'x' });
    expect((await t.app.inject({ method: 'POST', url: '/v1/raid/reels', headers: t.auth, payload: { embedUrl: 'https://youtube.com/watch?v=1' } })).statusCode).toBe(400);
    // attribution: forged tx refused, real (mocked RPC) back counted once
    expect((await t.app.inject({ method: 'POST', url: `/v1/raid/reels/${reel.id}/backs`, payload: { tx: TX, backer: 'eve.testnet' } })).statusCode).toBe(422);
    expect((await t.app.inject({ method: 'POST', url: `/v1/raid/reels/${reel.id}/backs`, payload: { tx: TX, backer: 'bob.testnet' } })).statusCode).toBe(201);
    await t.app.inject({ method: 'POST', url: `/v1/raid/reels/${reel.id}/backs`, payload: { tx: TX, backer: 'bob.testnet' } });
    const list = (await t.app.inject({ method: 'GET', url: '/v1/raid/reels' })).json<{ items: { id: string; backs: number }[] }>();
    expect(list.items.find((x) => x.id === reel.id)?.backs).toBe(1);
    const lb = (await t.app.inject({ method: 'GET', url: '/v1/raid/reels/leaderboard' })).json<{ items: { handle: string; hits: number; earned_raw: number; backed_raw: number }[] }>();
    // raid 3 hit: caller cut 5 USDC x 20% x (50 / 200 of the pot) = 0.25 USDC
    expect(lb.items[0]).toMatchObject({ handle: 'alice', hits: 1, backed_raw: 50000000, earned_raw: 250000 });
  });
  it('seeds labelled demo reels from the local demo videos', async () => {
    await seedRaidDemo(t.db);
    expect(await seedReelsDemo(t.db, dir)).toBe('seeded 3 demo reels');
    const [r] = await t.db.query<{ n: number }>('SELECT count(*)::int AS n FROM reels WHERE demo');
    expect(r?.n).toBe(3);
  });
});
