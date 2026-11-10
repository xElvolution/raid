import { PGlite } from '@electric-sql/pglite';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { buildApp } from '../src/app.js';
import { nep413Hash } from '../src/auth.js';
import type { Database, Db } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { MemoryBus, MemoryKv } from '../src/infra/bus.js';
import { MemoryJobs } from '../src/infra/queue.js';

export async function setup(extra: { router?: import('../src/external.js').VenueRouter | null } = {}) {
  const pg = new PGlite();
  const db: Db = { query: async (sql, params) => (await pg.query(sql, params as unknown[])).rows as never };
  await migrate(db);
  const database: Database = { primary: db, replica: db, close: () => pg.close() };
  const bus = new MemoryBus();
  const kv = new MemoryKv();
  const jobs = new MemoryJobs();
  const keys = new Map<string, string>();
  const app = buildApp({
    db: database,
    bus,
    kv,
    jobs,
    checkKey: async (acct, pk) => keys.get(acct) === pk,
    router: extra.router ?? null,
    config: { jwtSecret: 's'.repeat(40), signInRecipient: 'called.testnet', blockedCountries: ['US'], corsOrigins: ['http://localhost:3000'] },
  });
  await app.ready();

  async function signIn(accountId: string, handle?: string) {
    const kp = nacl.sign.keyPair();
    const publicKey = `ed25519:${bs58.encode(kp.publicKey)}`;
    keys.set(accountId, publicKey);
    const { nonce, recipient, message } = (await app.inject({ method: 'POST', url: '/v1/auth/nonce' })).json<{ nonce: string; recipient: string; message: string }>();
    const sig = nacl.sign.detached(nep413Hash(message, Buffer.from(nonce, 'base64'), recipient), kp.secretKey);
    const signed = { accountId, publicKey, signature: Buffer.from(sig).toString('base64'), message, nonce, recipient };
    const r = await app.inject({ method: 'POST', url: '/v1/auth/signin', payload: { signed, handle } });
    return { res: r, signed, token: r.json<{ token: string }>().token, auth: { authorization: `Bearer ${r.json<{ token: string }>().token}` } };
  }

  return { app, db, bus, kv, jobs, signIn, close: async () => { await app.close(); await pg.close(); } };
}
