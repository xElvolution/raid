/**
 * Demo content for previews and screenshots. Every account is flagged users.demo = true, its display name says
 * "(demo)", and it has no NEAR account, so the app labels it and it can never be mistaken for a real person.
 * Raid ids refer to the testnet chest (raid-chest-mwab3vnk.testnet).
 */
import type { Db } from './db/index.js';

const USERS = [
  ['demo_frogwatch', 'Frog Watch (demo)'],
  ['demo_linecaller', 'Line Caller (demo)'],
  ['demo_dogdays', 'Dog Days (demo)'],
] as const;
const POSTS: [string, string, number | null, string | null][] = [
  ['demo_linecaller', 'Called $PEPE to 1.5x. Crew window is 24h, then a 10 minute public countdown before the chest buys. Backers net +45% if it sells at the line.', 0, 'PEPE'],
  ['demo_frogwatch', 'In with 25 tUSDC. Testnet only, just checking the flow end to end.', 0, 'PEPE'],
  ['demo_dogdays', '$DOGE at 2x is a long ride. Retreat is 7 days, so worst case the chest sells at market and we eat it.', 1, 'DOGE'],
  ['demo_frogwatch', 'Launched $RFROG on the RAID curve. No presale, I bought on the curve like everyone else.', null, 'RFROG'],
];

export async function seedRaidDemo(db: Db): Promise<string> {
  const [have] = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM users WHERE demo');
  if ((have?.n ?? 0) > 0) return 'already seeded';
  const ids = new Map<string, string>();
  for (const [handle, name] of USERS) {
    const [u] = await db.query<{ id: string }>('INSERT INTO users (handle, display_name, demo, bio) VALUES ($1, $2, true, $3) RETURNING id::text', [handle, name, 'Demo account for previews. Not a real person.']);
    ids.set(handle, u!.id);
  }
  let t = Date.now() - 50 * 60_000;
  const postIds: string[] = [];
  for (const [h, body, raid, coin] of POSTS) {
    t += 9 * 60_000;
    const [p] = await db.query<{ id: string }>('INSERT INTO posts (author_id, body, raid_id, coin, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id::text', [ids.get(h), body, raid, coin, new Date(t).toISOString()]);
    postIds.push(p!.id);
  }
  await db.query('INSERT INTO posts (author_id, body, raid_id, coin, reply_to, created_at) VALUES ($1, $2, 0, $3, $4, $5)', [ids.get('demo_dogdays'), 'What happens if the bridge lands after the window closes?', 'PEPE', postIds[0], new Date(Date.now() - 20 * 60_000).toISOString()]);
  await db.query('INSERT INTO posts (author_id, body, raid_id, coin, reply_to, created_at) VALUES ($1, $2, 0, $3, $4, $5)', [ids.get('demo_linecaller'), 'It stays claimable for you. The chest parks it instead of losing it.', 'PEPE', postIds[0], new Date(Date.now() - 15 * 60_000).toISOString()]);
  await db.query('INSERT INTO post_likes (user_id, post_id) VALUES ($1, $3), ($2, $3), ($1, $4)', [ids.get('demo_frogwatch'), ids.get('demo_dogdays'), postIds[0], postIds[2]]);
  await db.query('INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2), ($3, $2)', [ids.get('demo_frogwatch'), ids.get('demo_linecaller'), ids.get('demo_dogdays')]);
  return `seeded ${USERS.length} demo accounts, ${POSTS.length + 2} posts`;
}
