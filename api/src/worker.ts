import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { z } from 'zod';
import { pgDatabase } from './db/index.js';
import { RedisBus } from './infra/bus.js';
import { chainFromEnv } from './chain.js';
import { resolveDue } from './resolution.js';
import { draftMarket, notify, syncPolymarket, type WorkerDeps } from './workers.js';

const env = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  RESOLVER_URL: z.string().url().optional(),
  RESOLVER_TOKEN: z.string().optional(),
  EXPO_ACCESS_TOKEN: z.string().optional(),
  POLYMARKET_SYNC_MS: z.coerce.number().default(30_000),
  RESOLUTION_POLL_MS: z.coerce.number().default(60_000),
}).parse(process.env);
const chain = chainFromEnv(process.env);

const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const db = pgDatabase(env.DATABASE_URL);
const deps: WorkerDeps = { db: db.primary, bus: new RedisBus(connection), fetch, resolverUrl: env.RESOLVER_URL, resolverToken: env.RESOLVER_TOKEN, expoAccessToken: env.EXPO_ACCESS_TOKEN };

const workers = [
  new Worker('draft-market', async (j) => draftMarket(deps, j.data as { postId: string }), { connection, concurrency: 16 }),
  new Worker('notify', async (j) => notify(deps, j.data as { userId: string; kind: string; payload: Record<string, unknown> }), { connection, concurrency: 32 }),
  new Worker('external-sync', async () => syncPolymarket(deps), { connection, concurrency: 1 }),
  ...(chain ? [new Worker('resolution', async () => resolveDue({ db: db.primary, bus: deps.bus, chain, resolverUrl: env.RESOLVER_URL, resolverToken: env.RESOLVER_TOKEN, log: { info: (o, m) => console.log(m, o), warn: (o, m) => console.warn(m, o) } }), { connection, concurrency: 1 })] : []),
];
if (chain) await new Queue('resolution', { connection }).upsertJobScheduler('resolve-due', { every: env.RESOLUTION_POLL_MS }, { name: 'resolve-due' });
// Repeatable job: BullMQ guarantees one scheduled instance across all worker replicas.
await new Queue('external-sync', { connection }).upsertJobScheduler('polymarket', { every: env.POLYMARKET_SYNC_MS }, { name: 'polymarket' });

for (const w of workers) w.on('failed', (j, e) => console.error(`[${w.name}] job ${j?.id ?? '?'} failed: ${e.message}`));
const stop = async () => { await Promise.all(workers.map((w) => w.close())); await db.close(); connection.disconnect(); process.exit(0); };
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
console.log('workers running: draft-market, notify, external-sync');
