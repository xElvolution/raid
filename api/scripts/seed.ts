/**
 * DEV/PREVIEW ONLY. Seeds demo users, follows, posts and a few Called markets by replaying
 * synthetic contract events through the real indexer. Refuses to run with NODE_ENV=production.
 *
 *   DATABASE_URL=... REDIS_URL=... JWT_SECRET=... tsx scripts/seed.ts [--token-for=ada]
 */
import { Redis } from 'ioredis';
import { Tokens } from '../src/auth.js';
import { pgDatabase } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { RedisBus, RedisKv } from '../src/infra/bus.js';
import { indexLogs, type LogEntry } from '../src/indexer.js';

if (process.env.NODE_ENV === 'production') throw new Error('seed is dev/preview only');
const { DATABASE_URL, REDIS_URL, JWT_SECRET } = process.env;
if (!DATABASE_URL || !REDIS_URL || !JWT_SECRET) throw new Error('DATABASE_URL, REDIS_URL, JWT_SECRET required');

const db = pgDatabase(DATABASE_URL);
const redis = new Redis(REDIS_URL);
await migrate(db.primary);

const people = [
  ['ada', 'Ada Okafor', 'ada.testnet'], ['tunde', 'Tunde B.', 'tunde.testnet'], ['zara', 'Zara Mensah', 'zara.testnet'],
  ['kemi', 'Kemi', 'kemi.testnet'], ['leo', 'Leo Park', 'leo.testnet'], ['nia', 'Nia W.', 'nia.testnet'],
] as const;
const ids: Record<string, string> = {};
for (const [handle, name, acct] of people) {
  const [u] = await db.primary.query<{ id: string }>(
    `INSERT INTO users (handle, near_account, display_name) VALUES ($1,$2,$3)
     ON CONFLICT (near_account) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id`, [handle, acct, name]);
  ids[handle] = String(u?.id);
}
const follow = async (a: string, b: string) => db.primary.query('INSERT INTO follows (follower_id, followee_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [ids[a], ids[b]]);
for (const b of ['tunde', 'zara', 'kemi', 'leo']) await follow('ada', b);
for (const a of ['tunde', 'zara', 'kemi', 'nia']) await follow(a, 'ada');

const now = Date.now();
const day = 86_400_000;
const markets = [
  { q: 'Will Super Eagles qualify for the 2026 AFCON knockout stage?', by: 'tunde', close: now + 20 * day },
  { q: 'Will Burna Boy announce a new album before 31 Dec 2026?', by: 'zara', close: now + 70 * day },
  { q: 'Will NEAR trade above $5 on 30 Nov 2026?', by: 'leo', close: now + 40 * day },
  { q: 'Will Lagos record rainfall on 1 Nov 2026?', by: 'kemi', close: now + 11 * day },
];
const ev = (event: string, data: Record<string, unknown>) => `EVENT_JSON:${JSON.stringify({ standard: 'called', version: '0.1.0', event, data: [data] })}`;
const logs: LogEntry[] = [];
let h = 1_000;
markets.forEach((m, i) => {
  logs.push({ receiptId: `seed-m${i}`, logIndex: 0, blockHeight: h++, blockTimeMs: now - (10 - i) * 3_600_000, log: ev('market_created', { market_id: String(i), creator: `${m.by}.testnet`, question: m.q, close_ms: String(m.close) }) });
});
const traders = ['ada', 'tunde', 'zara', 'kemi', 'leo', 'nia'];
let price = [0.5, 0.5, 0.5, 0.5];
for (let k = 0; k < 40; k++) {
  const mi = k % markets.length, outcome = (k * 7) % 3 === 0 ? 0 : 1, amt = 1 + ((k * 13) % 25);
  const p = Math.min(0.95, Math.max(0.05, (price[mi] ?? 0.5) + (outcome ? 0.02 : -0.025) * (amt / 10)));
  price[mi] = p;
  logs.push({ receiptId: `seed-t${k}`, logIndex: 0, blockHeight: h++, blockTimeMs: now - (40 - k) * 600_000,
    log: ev('trade', { market_id: String(mi), account: `${traders[k % traders.length]}.testnet`, side: 'buy', outcome, amount: String(amt * 1e6), shares: String(Math.round((amt / (outcome ? p : 1 - p)) * 1e6)), price_yes_ppm: String(Math.round(p * 1e6)) }) });
}
const bus = new RedisBus(redis);
await indexLogs(db.primary, bus, new RedisKv(redis), logs);
bus.close();

const mid = async (i: number) => (await db.primary.query<{ id: string }>("SELECT id FROM markets WHERE venue='called' AND external_id=$1", [String(i)]))[0]?.id;
const posts: [string, string, number | null, number][] = [
  ['tunde', 'Calling it now: Eagles go through. The midfield is finally sorted.', 0, 9],
  ['zara', "Burna drops before Christmas. The teasers aren't subtle.", 1, 8],
  ['leo', 'NEAR above $5 by end of November. Chain abstraction season.', 2, 6],
  ['kemi', 'Rain on Nov 1 in Lagos, bet.', 3, 5],
  ['ada', 'First week on Called and my streak is already at 4 days', null, 3],
  ['nia', 'Who else is watching the Polymarket NBA odds swing tonight?', null, 2],
  ['ada', 'Hot take: Afrobeats gets a Grammy sweep next year.', null, 1],
];
const existing = await db.primary.query<{ n: string }>('SELECT count(*)::text AS n FROM posts');
if (existing[0]?.n === '0') {
  for (const [who, body, m, hoursAgo] of posts) {
    await db.primary.query('INSERT INTO posts (author_id, body, market_id, created_at) VALUES ($1,$2,$3, now() - make_interval(hours => $4))', [ids[who], body, m === null ? null : await mid(m), hoursAgo]);
  }
  for (const [who, xp] of [['ada', 145], ['tunde', 420], ['zara', 260], ['kemi', 90], ['leo', 700], ['nia', 40]] as const) {
    await db.primary.query("INSERT INTO xp_events (user_id, kind, xp) VALUES ($1,'seed',$2)", [ids[who], xp]);
    await db.primary.query("INSERT INTO xp_events (user_id, kind, xp) VALUES ($1,'post',15)", [ids[who]]);
  }
  for (const [who, cur] of [['ada', 4], ['tunde', 12], ['zara', 7], ['leo', 21]] as const)
    await db.primary.query('INSERT INTO streaks (user_id, current, longest, last_day) VALUES ($1,$2,$2,CURRENT_DATE) ON CONFLICT (user_id) DO NOTHING', [ids[who], cur]);
  await db.primary.query("INSERT INTO notifications (user_id, kind, payload) VALUES ($1,'follow','{}'), ($1,'draft_ready',$2)", [ids.ada, JSON.stringify({ question: 'Will Afrobeats win 3+ Grammys in Feb 2027?' })]);
}

const tokenFor = process.argv.find((a) => a.startsWith('--token-for='))?.split('=')[1];
if (tokenFor && ids[tokenFor]) console.log(await new Tokens(JWT_SECRET).issue(ids[tokenFor]));
await db.close();
redis.disconnect();
