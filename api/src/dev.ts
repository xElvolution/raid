/**
 * Local / demo runner for the RAID API with no external services: embedded Postgres (PGlite, persisted under
 * api/.data), in-memory bus, kv and queue. NEP-413 sign-in checks the key against NEAR testnet RPC.
 *   npm run dev:local            # http://localhost:8787
 *   SEED_DEMO=1 npm run dev:local  # also adds clearly labelled demo accounts and posts (users.demo = true)
 * Production uses src/main.ts (Postgres + Redis).
 */
import { PGlite } from '@electric-sql/pglite';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { buildApp } from './app.js';
import { rpcKeyChecker } from './auth.js';
import type { Database, Db } from './db/index.js';
import { migrate } from './db/migrate.js';
import { MemoryBus, MemoryKv } from './infra/bus.js';
import { MemoryJobs } from './infra/queue.js';
import { seedRaidDemo, seedReelsDemo } from './raid-demo-seed.js';
import { rpcReelChain } from './reels.js';

const dir = new URL('../.data/', import.meta.url);
fs.mkdirSync(dir, { recursive: true });
const secretFile = new URL('jwt-secret', dir);
if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, randomBytes(32).toString('hex'), { mode: 0o600 });
const pg = new PGlite(new URL('pglite', dir).pathname);
const db: Db = { query: async (sql, params) => (await pg.query(sql, params as unknown[])).rows as never };
await migrate(db);
const reelDir = new URL('reels/', dir).pathname;
if (process.env.SEED_DEMO === '1') { console.log('demo seed:', await seedRaidDemo(db)); console.log('demo reels:', await seedReelsDemo(db, reelDir)); }
const database: Database = { primary: db, replica: db, close: () => pg.close() };
const app = buildApp({
  db: database, bus: new MemoryBus(), kv: new MemoryKv(), jobs: new MemoryJobs(),
  reels: { dir: reelDir, chain: rpcReelChain(process.env.NEAR_RPC_URL ?? 'https://rpc.testnet.fastnear.com', process.env.RAID_CHEST ?? 'raid-chest-mwab3vnk.testnet') },
  checkKey: rpcKeyChecker(process.env.NEAR_RPC_URL ?? 'https://rpc.testnet.fastnear.com'),
  config: {
    jwtSecret: fs.readFileSync(secretFile, 'utf8'),
    signInRecipient: process.env.SIGNIN_RECIPIENT ?? 'raid.testnet',
    blockedCountries: [],
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3410,http://localhost:3420,http://localhost:3000').split(','),
    playMoney: false,
  },
});
await app.listen({ port: Number(process.env.PORT ?? 8787), host: '127.0.0.1' });
