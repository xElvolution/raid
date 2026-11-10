/**
 * Demo social + trading history so every profile tab is full: settled won/lost positions, open positions,
 * portfolio value history, replies, likes, recasts, media posts, channels and DMs. Idempotent and preview-only
 * (seed-demo.ts refuses production). Values are deterministic per handle so reseeding is stable.
 */
import type { Db } from '../src/db/index.js';

const USERS = ['ada', 'tunde', 'zara', 'kemi', 'leo', 'nia', 'demo'];
const SKILL: Record<string, number> = { ada: 0.72, tunde: 0.58, zara: 0.64, kemi: 0.5, leo: 0.68, nia: 0.45, demo: 0.6 };
const ASSET = process.env.ASSET_BASE ?? '/app';

function rng(seed: string) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }

export async function seedSocial(db: Db) {
  const ids = Object.fromEntries((await db.query<{ id: string; handle: string }>('SELECT id::text, handle FROM users WHERE handle = ANY($1)', [USERS])).map((u) => [u.handle, u.id]));
  const finals = await db.query<{ id: string; outcome: string }>("SELECT id::text, outcome FROM markets WHERE venue='called' AND outcome IN ('YES','NO') ORDER BY close_ts DESC");
  const open = await db.query<{ id: string; price_yes: number }>("SELECT id::text, price_yes::float8 FROM markets WHERE venue='called' AND status='open' ORDER BY volume DESC LIMIT 12");

  for (const h of USERS) {
    const uid = ids[h]; if (!uid) continue;
    const r = rng(h);
    await db.query('INSERT INTO play_accounts (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [uid]);
    // Settled: one position per finished market, won at the caller's skill rate.
    for (const m of finals) {
      if (r() < 0.12) continue;
      const won = r() < (SKILL[h] ?? 0.55);
      const outcome = (m.outcome === 'YES') === won ? 1 : 0;
      const price = won ? 0.58 + r() * 0.27 : 0.3 + r() * 0.22, cost = Math.round(10 + r() * 90), shares = cost / price;
      await db.query(`INSERT INTO play_positions (user_id, market_id, outcome, shares, cost, redeemed) VALUES ($1,$2,$3,$4,$5,true) ON CONFLICT (user_id, market_id, outcome) DO UPDATE SET shares=EXCLUDED.shares, cost=EXCLUDED.cost`, [uid, m.id, outcome, shares.toFixed(6), cost]);
      await trade(db, uid, m.id, outcome, shares, cost, outcome ? price : 1 - price);
    }
    // Open positions with live P&L.
    for (const m of open) {
      if (r() < 0.55) continue;
      const outcome = r() < 0.6 ? 1 : 0, px = outcome ? m.price_yes : 1 - m.price_yes;
      const entry = Math.min(0.95, Math.max(0.05, px + (r() - 0.55) * 0.2)), cost = Math.round(15 + r() * 120);
      await db.query(`INSERT INTO play_positions (user_id, market_id, outcome, shares, cost) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`, [uid, m.id, outcome, (cost / entry).toFixed(6), cost]);
      await trade(db, uid, m.id, outcome, cost / entry, cost, outcome ? entry : 1 - entry);
    }
    // Portfolio value history: 90 days at 6h steps, a random walk that lands on today's real value.
    const [now] = await db.query<{ v: number; d: number }>(
      `SELECT (a.balance + COALESCE((SELECT sum(pp.shares * CASE WHEN pp.outcome=1 THEN m.price_yes ELSE 1-m.price_yes END) FROM play_positions pp JOIN markets m ON m.id=pp.market_id WHERE pp.user_id=a.user_id AND m.status='open'),0))::float8 AS v, a.deposited::float8 AS d FROM play_accounts a WHERE a.user_id=$1`, [uid]);
    const target = (now?.v ?? 1000), steps = 360;
    const drift = (SKILL[h]! - 0.5) * 3;
    const walk: number[] = [0]; for (let i = 1; i < steps; i++) walk.push(walk[i - 1]! + drift + (r() - 0.5) * 16);
    const off = target - (now?.d ?? 1000) - walk[steps - 1]!;
    await db.query('DELETE FROM play_value_history WHERE user_id=$1', [uid]);
    const vals: string[] = [], params: unknown[] = [uid];
    for (let i = 0; i < steps; i++) {
      const v = (now?.d ?? 1000) + walk[i]! + off * (i / (steps - 1));
      params.push(new Date(Date.now() - (steps - 1 - i) * 6 * 3600_000).toISOString(), v.toFixed(2));
      vals.push(`($1,$${params.length - 1},$${params.length})`);
    }
    await db.query(`INSERT INTO play_value_history (user_id, ts, value) VALUES ${vals.join(',')} ON CONFLICT DO NOTHING`, params);
  }

  // Channels.
  const CH: [string, string, string, string][] = [
    ['football', 'Football', 'Matchday calls, transfer rumours and derby day battles.', 'stadium'],
    ['crypto', 'Crypto', 'Bulls vs bears. Price calls on BTC, ETH, SOL.', 'coin'],
    ['gaming', 'Gaming', 'Release dates, trailers and sales calls.', 'controller'],
    ['music', 'Music', 'Drops, tours and chart calls.', 'stage'],
    ['movies', 'Movies', 'Box office and awards season.', 'cinema'],
    ['space', 'Space', 'Launch windows and landings.', 'rocket'],
  ];
  for (const [slug, name, desc, img] of CH) {
    await db.query('INSERT INTO channels (slug, name, description, image_url, theme) VALUES ($1,$2,$3,$4,$1) ON CONFLICT (slug) DO UPDATE SET image_url=EXCLUDED.image_url, description=EXCLUDED.description', [slug, name, desc, `${ASSET}/markets/${img}.jpg`]);
  }
  const JOIN: Record<string, string[]> = { ada: ['football', 'crypto', 'space'], tunde: ['crypto', 'football'], zara: ['music', 'crypto'], kemi: ['movies', 'football', 'music'], leo: ['gaming', 'space'], nia: ['space', 'crypto'], demo: ['football', 'crypto', 'gaming'] };
  for (const [h, cs] of Object.entries(JOIN)) for (const c of cs) if (ids[h]) await db.query('INSERT INTO channel_members (slug, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [c, ids[h]]);

  // Posts: channel posts with media, then replies to existing posts.
  const POSTS: [string, string, string | null, string | null, number][] = [
    ['ada', 'Matchday at the Emirates. Calling Arsenal again, the press is relentless.', 'football', 'stadium', 300],
    ['tunde', 'Weekly chart. Bulls still holding the range. $BTC', 'crypto', 'coin', 260],
    ['leo', 'Pad in hand, trailer on loop. GTA VI date call is the biggest market on the board.', 'gaming', 'controller', 220],
    ['zara', 'Soundcheck. Tour announcement odds feel cheap.', 'music', 'stage', 200],
    ['kemi', 'Opening night queue goes round the block. Box office call: YES.', 'movies', 'cinema', 180],
    ['nia', 'Launch window opens Thursday. Weather is the real opponent.', 'space', 'rocket', 160],
    ['ada', 'Ring walk energy. KO markets are underpriced all season.', null, 'ring', 140],
    ['leo', 'Track day. F1 title decider market is mispriced at 36%.', null, 'track', 120],
    ['demo', 'First week on Called. Copying @ada calls and learning the ropes.', 'football', null, 100],
    ['zara', 'Calibration matters more than hit rate. Price your calls honestly.', null, null, 90],
  ];
  for (const [h, body, ch, img, mins] of POSTS) {
    if (!ids[h]) continue;
    await db.query(`INSERT INTO posts (author_id, body, channel, media_url, created_at) SELECT $1,$2,$3,$4, now() - ($5 || ' minutes')::interval WHERE NOT EXISTS (SELECT 1 FROM posts WHERE body=$2)`,
      [ids[h], body, ch, img ? `${ASSET}/markets/${img}.jpg` : null, String(mins)]);
  }
  const roots = await db.query<{ id: string; author: string }>("SELECT p.id::text, u.handle AS author FROM posts p JOIN users u ON u.id=p.author_id WHERE p.reply_to IS NULL ORDER BY p.created_at DESC LIMIT 18");
  const REPLIES = ['Fading this. Odds already price it in.', 'Agree. Took YES at 41.', 'Bold. I am on the other side.', 'This aged well.', 'Calibration check: what odds would you sell at?', 'Copying this one.', 'Big if true. Watching the book.', 'Settle it on Called 👀'];
  let k = 0;
  for (const p of roots) {
    const r = rng(`reply${p.id}`);
    const n = 1 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const h = USERS.filter((u) => u !== p.author)[Math.floor(r() * (USERS.length - 1))]!;
      const body = `@${p.author} ${REPLIES[(k++) % REPLIES.length]}`;
      if (!ids[h]) continue;
      await db.query(`INSERT INTO posts (author_id, body, reply_to, created_at) SELECT $1,$2,$3, now() - ($4 || ' minutes')::interval WHERE NOT EXISTS (SELECT 1 FROM posts WHERE reply_to=$3 AND author_id=$1)`, [ids[h], body, p.id, String(10 + i * 7)]);
    }
    // Likes and recasts.
    for (const h of USERS) {
      if (!ids[h] || h === p.author) continue;
      if (r() < 0.55) await db.query('INSERT INTO post_likes (user_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [ids[h], p.id]);
      if (r() < 0.18) await db.query('INSERT INTO post_recasts (user_id, post_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [ids[h], p.id]);
    }
  }
  // Pin a call on ada's card.
  await db.query("UPDATE users SET pinned_post_id=(SELECT p.id FROM posts p WHERE p.author_id=users.id AND p.market_id IS NOT NULL AND p.reply_to IS NULL ORDER BY p.created_at DESC LIMIT 1) WHERE handle='ada' AND pinned_post_id IS NULL");

  // DMs.
  const DMS: [string, string, string[]][] = [
    ['ada', 'kemi', ['You really fading Arsenal top 4?', 'At 62% yes. Their run-in is brutal.', 'Fair. I will take the other side then 😄', 'Loser buys suya.']],
    ['ada', 'tunde', ['Saw you copied my AJ call', 'Free money at those odds', 'Mirror cap at $25 each, keeping it sane']],
    ['ada', 'leo', ['GTA VI date. In or out?', 'Out. Rockstar always slips.']],
    ['demo', 'ada', ['Hey! New here, any tips?', 'Start with free calls, watch your calibration, then size up.']],
    ['zara', 'nia', ['Starship catch this year?', 'Fading it, weather and FAA both']],
  ];
  for (const [a, b, msgs] of DMS) {
    if (!ids[a] || !ids[b]) continue;
    const [x, y] = [ids[a], ids[b]].sort((p, q) => Number(p) - Number(q));
    const [t] = await db.query<{ id: string }>('INSERT INTO dm_threads (user_a, user_b, last_at) VALUES ($1,$2, now()) ON CONFLICT (user_a, user_b) DO UPDATE SET last_at=dm_threads.last_at RETURNING id::text', [x, y]);
    const [{ n } = { n: 0 }] = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM dm_messages WHERE thread_id=$1', [t!.id]);
    if (n > 0) continue;
    for (let i = 0; i < msgs.length; i++) {
      await db.query(`INSERT INTO dm_messages (thread_id, sender_id, body, created_at, read_at) VALUES ($1,$2,$3, now() - ($4 || ' minutes')::interval, CASE WHEN $5 THEN now() END)`,
        [t!.id, ids[i % 2 ? b : a], msgs[i], String((msgs.length - i) * 9), i < msgs.length - 1]);
    }
    await db.query("UPDATE dm_threads SET last_at=now() - interval '9 minutes' WHERE id=$1", [t!.id]);
  }
}

async function trade(db: Db, uid: string, mid: string, outcome: number, shares: number, cost: number, py: number) {
  await db.query(`INSERT INTO play_trades (user_id, market_id, outcome, side, shares, amount, price_yes, created_at)
    SELECT $1,$2,$3,'buy',$4,$5,$6, now() - interval '3 days' WHERE NOT EXISTS (SELECT 1 FROM play_trades WHERE user_id=$1 AND market_id=$2 AND outcome=$3)`,
    [uid, mid, outcome, shares.toFixed(6), cost, Math.min(0.99, Math.max(0.01, py)).toFixed(6)]);
}

/** Extra demo callers so the leaderboard has a realistic field (sizes $40–$4k per trade, varied skill and leagues). */
export async function seedCallers(db: Db) {
  const NAMES = ['Chidi Eze', 'Amara Nwosu', 'Kwame Asante', 'Lerato Dube', 'Yusuf Bello', 'Ifeoma Obi', 'Sipho Ndlovu', 'Halima Musa', 'Ola Adeyemi', 'Thandi Khumalo', 'Femi Bakare', 'Esi Mensah',
    'Bayo Ogun', 'Wanjiru Kamau', 'Tobi Alade', 'Nnamdi Okeke', 'Akua Boateng', 'Segun Ade', 'Zainab Lawal', 'Kofi Owusu', 'Adaeze Uche', 'Musa Danjuma', 'Rhoda Achieng', 'Emeka Ibe'];
  const finals = await db.query<{ id: string; outcome: string }>("SELECT id::text, outcome FROM markets WHERE venue='called' AND outcome IN ('YES','NO')");
  const XP = [60, 140, 260, 420, 700, 900, 1300, 1700, 2400, 3000, 3900, 5200, 7000, 9500, 12000, 21000];
  for (const [i, name] of NAMES.entries()) {
    const handle = name.toLowerCase().replace(/[^a-z]+/g, '_').slice(0, 20);
    const r = rng(`caller-${handle}`);
    const [u] = await db.query<{ id: string }>(`INSERT INTO users (handle, near_account, display_name) VALUES ($1, $2, $3)
      ON CONFLICT (handle) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id::text`, [handle, `${handle}.testnet`, name]);
    const uid = u!.id;
    const skill = 0.38 + r() * 0.42, size = Math.exp(3.7 + r() * 4.6); // ~$40 to ~$4,000 per trade
    await db.query('INSERT INTO play_accounts (user_id, balance, deposited) VALUES ($1, $2, $2) ON CONFLICT DO NOTHING', [uid, Math.round(size * 25)]);
    const xp = XP[i % XP.length]! + Math.floor(r() * 120);
    const [{ n } = { n: 0 }] = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM xp_events WHERE user_id=$1 AND kind='seed'", [uid]);
    if (!n) await db.query("INSERT INTO xp_events (user_id, kind, xp, created_at) VALUES ($1,'seed',$2, now() - interval '20 days')", [uid, xp]);
    const streak = Math.floor(r() * 18);
    await db.query('INSERT INTO streaks (user_id, current, longest, last_day) VALUES ($1,$2,$3, current_date) ON CONFLICT (user_id) DO UPDATE SET current=EXCLUDED.current, longest=GREATEST(streaks.longest, EXCLUDED.longest)', [uid, streak, streak + Math.floor(r() * 10)]);
    let pnl = 0;
    for (const m of finals) {
      if (r() < 0.35) continue;
      const won = r() < skill, outcome = (m.outcome === 'YES') === won ? 1 : 0;
      const price = won ? 0.5 + r() * 0.3 : 0.3 + r() * 0.3, cost = Math.round(size * (0.4 + r())), shares = cost / price;
      pnl += won ? shares - cost : -cost;
      await db.query('INSERT INTO play_positions (user_id, market_id, outcome, shares, cost, redeemed) VALUES ($1,$2,$3,$4,$5,true) ON CONFLICT DO NOTHING', [uid, m.id, outcome, shares.toFixed(6), cost]);
      await db.query(`INSERT INTO play_trades (user_id, market_id, outcome, side, shares, amount, price_yes, created_at)
        SELECT $1,$2,$3,'buy',$4,$5,$6, now() - ($7 || ' hours')::interval WHERE NOT EXISTS (SELECT 1 FROM play_trades WHERE user_id=$1 AND market_id=$2)`,
        [uid, m.id, outcome, shares.toFixed(6), cost, (outcome ? price : 1 - price).toFixed(6), String(Math.floor(r() * 700))]);
    }
    // Value history: 90 days, 6h steps, ending at deposit + realised P&L.
    const [a] = await db.query<{ d: number }>('SELECT deposited::float8 AS d FROM play_accounts WHERE user_id=$1', [uid]);
    const dep = a!.d, steps = 360, walk: number[] = [0];
    for (let k = 1; k < steps; k++) walk.push(walk[k - 1]! + (r() - 0.5) * size * 0.35);
    const off = pnl - walk[steps - 1]!;
    await db.query('DELETE FROM play_value_history WHERE user_id=$1', [uid]);
    const vals: string[] = [], params: unknown[] = [uid];
    for (let k = 0; k < steps; k++) { params.push(new Date(Date.now() - (steps - 1 - k) * 6 * 3600_000).toISOString(), (dep + walk[k]! + off * (k / (steps - 1))).toFixed(2)); vals.push(`($1,$${params.length - 1},$${params.length})`); }
    await db.query(`INSERT INTO play_value_history (user_id, ts, value) VALUES ${vals.join(',')} ON CONFLICT DO NOTHING`, params);
    await db.query('UPDATE play_accounts SET balance=deposited + $2 WHERE user_id=$1', [uid, pnl.toFixed(2)]);
    // A few follow edges so Friends has people.
    if (r() < 0.4) await db.query("INSERT INTO follows (follower_id, followee_id) SELECT u.id, $1 FROM users u WHERE u.handle IN ('demo','ada') ON CONFLICT DO NOTHING", [uid]);
  }
}

export async function seedLeagues(db: Db) {
  const L: [string, string, string, string[]][] = [
    ['LAGOS7', 'Lagos Callers', 'demo', ['ada', 'kemi', 'tunde', 'femi_bakare', 'tobi_alade', 'bayo_ogun', 'zainab_lawal']],
    ['OFFICE', 'Office Sweepstake', 'ada', ['demo', 'leo', 'nia', 'chidi_eze', 'esi_mensah']],
  ];
  for (const [code, name, owner, members] of L) {
    const [l] = await db.query<{ id: string }>(`INSERT INTO private_leagues (code, name, owner_id) SELECT $1,$2,id FROM users WHERE handle=$3
      ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name RETURNING id::text`, [code, name, owner]);
    if (!l) continue;
    await db.query('INSERT INTO private_league_members (league_id, user_id) SELECT $1, id FROM users WHERE handle = ANY($2) ON CONFLICT DO NOTHING', [l.id, [owner, ...members]]);
  }
}
