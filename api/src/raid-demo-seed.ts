/**
 * Demo content for previews and screenshots. Every account is flagged users.demo = true, its display name says
 * "(demo)", and it has no NEAR account, so the app labels it and it can never be mistaken for a real person.
 * Raid ids refer to the testnet chest (raid-chest-mwab3vnk.testnet).
 */
import type { Db } from './db/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { mp4Duration } from './reels.js';
import { must } from './must.js';

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
    ids.set(handle, must(u, 'demo user').id);
  }
  let t = Date.now() - 50 * 60_000;
  const postIds: string[] = [];
  for (const [h, body, raid, coin] of POSTS) {
    t += 9 * 60_000;
    const [p] = await db.query<{ id: string }>('INSERT INTO posts (author_id, body, raid_id, coin, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id::text', [ids.get(h), body, raid, coin, new Date(t).toISOString()]);
    postIds.push(must(p, 'demo post').id);
  }
  await db.query('INSERT INTO posts (author_id, body, raid_id, coin, reply_to, created_at) VALUES ($1, $2, 0, $3, $4, $5)', [ids.get('demo_dogdays'), 'What happens if the bridge lands after the window closes?', 'PEPE', postIds[0], new Date(Date.now() - 20 * 60_000).toISOString()]);
  await db.query('INSERT INTO posts (author_id, body, raid_id, coin, reply_to, created_at) VALUES ($1, $2, 0, $3, $4, $5)', [ids.get('demo_linecaller'), 'It stays claimable for you. The chest parks it instead of losing it.', 'PEPE', postIds[0], new Date(Date.now() - 15 * 60_000).toISOString()]);
  await db.query('INSERT INTO post_likes (user_id, post_id) VALUES ($1, $3), ($2, $3), ($1, $4)', [ids.get('demo_frogwatch'), ids.get('demo_dogdays'), postIds[0], postIds[2]]);
  await db.query('INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2), ($3, $2)', [ids.get('demo_frogwatch'), ids.get('demo_linecaller'), ids.get('demo_dogdays')]);
  return `seeded ${USERS.length} demo accounts, ${POSTS.length + 2} posts`;
}

/** Demo reels: animated price cards rendered locally from real 1h candles (scripts/reels/make-demo-reels.py), posted by the
 *  demo accounts above. Each is flagged reels.demo = true and the video itself says DEMO REEL. No people appear in them. */
const REELS: [string, string, string, number][] = [
  ['demo_frogwatch', 'PEPE', 'Frog Legion called $PEPE to 2x by DAO vote. Crew window is open.', 3],
  ['demo_dogdays', 'DOGE', 'Doge Pack wants 3x on $DOGE. Long ride, 72 h retreat.', 4],
  ['demo_linecaller', 'BRETT', '$BRETT on Base, 2x line. Backed from testnet tUSDC.', 2],
];
export async function seedReelsDemo(db: Db, dir: string, src = new URL('../demo-reels/', import.meta.url).pathname): Promise<string> {
  const [have] = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM reels WHERE demo');
  if ((have?.n ?? 0) > 0) return 'already seeded';
  fs.mkdirSync(dir, { recursive: true });
  let n = 0;
  for (const [handle, coin, caption, raid] of REELS) {
    const file = path.join(src, `${coin}.mp4`);
    if (!fs.existsSync(file)) continue;
    const [u] = await db.query<{ id: string }>('SELECT id::text FROM users WHERE handle = $1', [handle]);
    if (!u) continue;
    const buf = fs.readFileSync(file);
    const [r] = await db.query<{ id: string }>("INSERT INTO reels (author_id, kind, caption, coin, raid_id, duration_s, demo) VALUES ($1,'video',$2,$3,$4,$5,true) RETURNING id::text", [u.id, caption, coin, raid, mp4Duration(buf)]);
    const id = must(r, 'demo reel').id;
    fs.writeFileSync(path.join(dir, `${id}.mp4`), buf);
    await db.query('UPDATE reels SET video_file = $1 WHERE id = $2', [`${id}.mp4`, id]);
    n++;
  }
  return `seeded ${n} demo reels`;
}
