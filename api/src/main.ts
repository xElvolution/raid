import { Redis } from 'ioredis';
import { z } from 'zod';
import { buildApp } from './app.js';
import { privyVerifier, rpcKeyChecker } from './auth.js';
import { chainFromEnv } from './chain.js';
import { pgDatabase } from './db/index.js';
import { RedisBus, RedisKv } from './infra/bus.js';
import { BullJobs } from './infra/queue.js';
import { PolymarketRouter } from './polymarket-router.js';
import { nearTipVerifier, nearTransferAmount } from './near-tips.js';

const Env = z.object({
  PORT: z.coerce.number().default(8787),
  DATABASE_URL: z.string().url(),
  DATABASE_REPLICA_URL: z.string().url().optional(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  NEAR_RPC_URL: z.string().url().default('https://rpc.testnet.near.org'),
  NEAR_TREASURY_ACCOUNT: z.string().optional(),
  NEAR_PLAY_RATE: z.coerce.number().positive().default(5),
  SIGNIN_RECIPIENT: z.string().default('called.testnet'),
  BLOCKED_COUNTRIES: z.string().default('US'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  DEMO_MODE: z.enum(['0', '1']).default('0'),
  PLAY_MONEY: z.enum(['0', '1']).default('1'),
  NEAR_SIGNIN: z.enum(['0', '1']).default('1'),
  ADMIN_TOKEN: z.string().min(24).optional(),
  PRIVY_APP_ID: z.string().optional(),
  PRIVY_APP_SECRET: z.string().optional(),
  PRIVY_VERIFICATION_KEY: z.string().optional(),
  RESOLVER_URL: z.string().url().optional(),
  RESOLVER_TOKEN: z.string().optional(),
  POLYMARKET_PRIVATE_KEY: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional(),
  POLYMARKET_API_KEY: z.string().optional(),
  POLYMARKET_API_SECRET: z.string().optional(),
  POLYMARKET_API_PASSPHRASE: z.string().optional(),
  POLYMARKET_FUNDER: z.string().optional(),
  POLYMARKET_SIGNATURE_TYPE: z.coerce.number().int().min(0).max(2).optional(),
});
const env = Env.parse(process.env);
const poly = env.POLYMARKET_PRIVATE_KEY && env.POLYMARKET_API_KEY && env.POLYMARKET_API_SECRET && env.POLYMARKET_API_PASSPHRASE
  ? new PolymarketRouter({ privateKey: env.POLYMARKET_PRIVATE_KEY, apiKey: env.POLYMARKET_API_KEY, secret: env.POLYMARKET_API_SECRET, passphrase: env.POLYMARKET_API_PASSPHRASE, funder: env.POLYMARKET_FUNDER, signatureType: env.POLYMARKET_SIGNATURE_TYPE })
  : null;
const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const app = buildApp({
  db: pgDatabase(env.DATABASE_URL, env.DATABASE_REPLICA_URL),
  bus: new RedisBus(redis),
  kv: new RedisKv(redis),
  jobs: new BullJobs(redis),
  checkKey: rpcKeyChecker(env.NEAR_RPC_URL),
  router: poly,
  verifyTip: nearTipVerifier(env.NEAR_RPC_URL),
  nearTransfer: nearTransferAmount(env.NEAR_RPC_URL),
  nearTreasury: env.NEAR_TREASURY_ACCOUNT,
  nearPlayRate: env.NEAR_PLAY_RATE,
  chain: chainFromEnv(process.env),
  adminToken: env.ADMIN_TOKEN,
  privy: env.PRIVY_APP_ID ? privyVerifier({ appId: env.PRIVY_APP_ID, appSecret: env.PRIVY_APP_SECRET, verificationKey: env.PRIVY_VERIFICATION_KEY }) : null,
  drafter: env.RESOLVER_URL ? { url: env.RESOLVER_URL, token: env.RESOLVER_TOKEN } : null,
  config: {
    jwtSecret: env.JWT_SECRET,
    signInRecipient: env.SIGNIN_RECIPIENT,
    blockedCountries: env.BLOCKED_COUNTRIES.split(',').map((c) => c.trim().toUpperCase()),
    corsOrigins: env.CORS_ORIGINS.split(','),
    demo: env.DEMO_MODE === '1',
    playMoney: env.PLAY_MONEY === '1',
    nearSignIn: env.NEAR_SIGNIN === '1',
  },
});
app.log.info({ polymarketRouting: !!poly }, 'external venues');
await app.listen({ port: env.PORT, host: process.env.HOST ?? '0.0.0.0' });
