/**
 * DEV/PREVIEW ONLY. Seeds Called mock markets (AI-style drafts across sports, culture, crypto, tech,
 * music and weather; never politics) with odds history, and a fully populated demo account that
 * uses play money. Idempotent. Refuses to run with NODE_ENV=production.
 */
import { createHash } from 'node:crypto';
import { Wallet } from 'ethers';
import { pgDatabase } from '../src/db/index.js';
import { migrate } from '../src/db/migrate.js';
import { isExcludedMarket } from '../src/workers.js';

if (process.env.NODE_ENV === 'production') throw new Error('seed is dev/preview only');
const { DATABASE_URL } = process.env;
if (!DATABASE_URL) throw new Error('DATABASE_URL required');
const db = pgDatabase(DATABASE_URL).primary;
await migrate(db);

let s = 42;
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const day = 86_400_000, now = Date.now();

type M = { k: string; q: string; cat: string; p: number; vol: number; days: number; by: string; rules: string; final?: 'YES' | 'NO' };
const MARKETS: M[] = [
  { k: 'afcon-eagles-semis', q: 'Will the Super Eagles reach the AFCON 2027 semi-finals?', cat: 'sports', p: 0.41, vol: 182_400, days: 220, by: 'tunde', rules: 'Resolves YES if Nigeria plays in an AFCON 2027 semi-final.' },
  { k: 'osimhen-25-goals', q: 'Will Victor Osimhen score 25+ league goals this season?', cat: 'sports', p: 0.33, vol: 96_200, days: 210, by: 'tunde', rules: 'Official league stats at season end.' },
  { k: 'arsenal-top-4', q: 'Will Arsenal finish in the Premier League top 4?', cat: 'sports', p: 0.78, vol: 241_800, days: 205, by: 'leo', rules: 'Final Premier League table.' },
  { k: 'lakers-playoffs', q: 'Will the Lakers make the 2027 NBA playoffs?', cat: 'sports', p: 0.58, vol: 133_900, days: 180, by: 'nia', rules: 'Includes play-in qualification to the first round.' },
  { k: 'f1-title-decider', q: 'Will the F1 drivers’ title be decided at the final race?', cat: 'sports', p: 0.36, vol: 74_300, days: 45, by: 'leo', rules: 'YES if the champion is confirmed only after the last Grand Prix.' },
  { k: 'tems-grammy', q: 'Will Tems win a Grammy at the 2027 ceremony?', cat: 'music', p: 0.52, vol: 118_600, days: 110, by: 'zara', rules: 'Any category, per the Recording Academy.' },
  { k: 'burna-album-2026', q: 'Will Burna Boy release a new studio album before 31 Dec 2026?', cat: 'music', p: 0.47, vol: 88_100, days: 70, by: 'zara', rules: 'Full-length studio album on major streaming services.' },
  { k: 'wizkid-stadium', q: 'Will Wizkid announce a 2027 stadium tour by January?', cat: 'music', p: 0.29, vol: 41_700, days: 95, by: 'kemi', rules: 'Official announcement of 5+ stadium dates.' },
  { k: 'afrobeats-spotify', q: 'Will an Afrobeats track top Spotify Global this year?', cat: 'music', p: 0.18, vol: 37_900, days: 71, by: 'nia', rules: 'Spotify Global Top 50 daily #1 before 31 Dec.' },
  { k: 'avengers-boxoffice', q: 'Will Avengers: Doomsday gross $1.5B worldwide?', cat: 'culture', p: 0.62, vol: 156_300, days: 160, by: 'leo', rules: 'Box Office Mojo worldwide total.' },
  { k: 'nollywood-netflix', q: 'Will a Nollywood film hit Netflix Global Top 10 in Q4?', cat: 'culture', p: 0.44, vol: 52_800, days: 70, by: 'kemi', rules: 'Netflix Top 10 global film list, any week in Q4.' },
  { k: 'gta6-date', q: 'Will GTA VI launch on its announced date?', cat: 'tech', p: 0.71, vol: 204_500, days: 200, by: 'leo', rules: 'Launch on the date announced as of 1 Nov 2026.' },
  { k: 'iphone-fold', q: 'Will Apple announce a foldable iPhone before Sept 2027?', cat: 'tech', p: 0.24, vol: 99_400, days: 320, by: 'nia', rules: 'Official Apple announcement.' },
  { k: 'ai-flagship', q: 'Will a major AI lab ship a new flagship model before 2027?', cat: 'tech', p: 0.66, vol: 143_200, days: 71, by: 'leo', rules: 'General availability of a new top-tier model from a leading lab.' },
  { k: 'starlink-ng', q: 'Will Starlink cut its Nigeria monthly price by year end?', cat: 'tech', p: 0.21, vol: 33_600, days: 71, by: 'kemi', rules: 'Published residential plan price lower than on 1 Nov 2026.' },
  { k: 'aj-ko', q: 'Will Anthony Joshua win his next fight by knockout?', cat: 'sports', p: 0.58, vol: 142_300, days: 64, by: 'tunde', rules: 'Resolves Yes if Joshua wins his next sanctioned bout by KO or TKO.' },
  { k: 'ufc-usman', q: 'Will Kamaru Usman fight in the UFC before July 2027?', cat: 'sports', p: 0.47, vol: 66_900, days: 250, by: 'kemi', rules: 'Any official UFC bout featuring Usman before 1 July 2027.' },
  { k: 'starship-orbit', q: 'Will Starship complete a full orbit and booster catch in 2026?', cat: 'tech', p: 0.36, vol: 118_400, days: 71, by: 'nia', rules: 'Resolves Yes on an orbital flight plus a successful booster catch, per SpaceX.' },
  { k: 'btc-150k', q: 'Will Bitcoin trade above $150K before 2027?', cat: 'crypto', p: 0.19, vol: 311_700, days: 71, by: 'leo', rules: 'Any Coinbase BTC-USD 1-minute close above $150,000.' },
  { k: 'near-5', q: 'Will NEAR trade above $5 on 30 Nov 2026?', cat: 'crypto', p: 0.27, vol: 88_900, days: 40, by: 'leo', rules: 'Binance NEAR/USDT daily close on 30 Nov.' },
  { k: 'sol-vs-eth', q: 'Will SOL outperform ETH in November?', cat: 'crypto', p: 0.48, vol: 64_200, days: 40, by: 'nia', rules: 'Percent change 1–30 Nov, CoinGecko.' },
  { k: 'stablecoin-cap', q: 'Will total stablecoin supply pass $400B this year?', cat: 'crypto', p: 0.38, vol: 47_300, days: 71, by: 'tunde', rules: 'DefiLlama stablecoin market cap.' },
  { k: 'lagos-rain-nov1', q: 'Will Lagos record rainfall on 1 Nov 2026?', cat: 'weather', p: 0.62, vol: 21_400, days: 11, by: 'kemi', rules: 'NiMet daily report for Ikeja.' },
  { k: 'harmattan-early', q: 'Will Harmattan haze reach Abuja before 1 Dec?', cat: 'weather', p: 0.55, vol: 18_900, days: 41, by: 'tunde', rules: 'NiMet dust haze advisory covering Abuja.' },
  { k: 'london-snow-xmas', q: 'Will London get snow on Christmas Day?', cat: 'weather', p: 0.09, vol: 58_100, days: 65, by: 'nia', rules: 'Met Office official white Christmas definition.' },
  { k: 'derby-draw', q: 'Did the North London derby end in a draw?', cat: 'sports', p: 0.5, vol: 72_000, days: -3, by: 'leo', rules: 'Full-time result.', final: 'NO' },
  { k: 'davido-single', q: 'Did Davido drop a single in October?', cat: 'music', p: 0.5, vol: 31_000, days: -2, by: 'zara', rules: 'Official release on streaming services.', final: 'YES' },
  { k: 'btc-120k-sep', q: 'Did Bitcoin close above $120K on 30 Sep?', cat: 'crypto', p: 0.5, vol: 88_000, days: -21, by: 'tunde', rules: 'Coinbase daily close.', final: 'NO' },
  { k: 'arsenal-city', q: 'Did Arsenal beat Man City at the Emirates?', cat: 'sports', p: 0.5, vol: 64_000, days: -18, by: 'ada', rules: 'Full-time result.', final: 'YES' },
  { k: 'wizkid-tour', q: 'Did Wizkid announce a 2027 world tour in September?', cat: 'music', p: 0.5, vol: 22_000, days: -25, by: 'zara', rules: 'Official announcement.', final: 'YES' },
  { k: 'iphone-17-air', q: 'Did Apple ship an iPhone Air in September?', cat: 'tech', p: 0.5, vol: 41_000, days: -35, by: 'leo', rules: 'Retail availability.', final: 'YES' },
  { k: 'starship-flight-11', q: 'Did Starship flight 11 land the booster on the tower?', cat: 'science', p: 0.5, vol: 37_000, days: -14, by: 'nia', rules: 'SpaceX confirmation.', final: 'NO' },
  { k: 'lagos-rain-oct', q: 'Did Lagos get over 100mm of rain in the first week of October?', cat: 'weather', p: 0.5, vol: 9_000, days: -12, by: 'nia', rules: 'NiMet station data.', final: 'YES' },
  { k: 'joshua-ko-sep', q: 'Did the September heavyweight bout end by knockout?', cat: 'sports', p: 0.5, vol: 52_000, days: -28, by: 'ada', rules: 'Official result.', final: 'YES' },
  { k: 'monza-pole', q: 'Did a Ferrari take pole at Monza?', cat: 'sports', p: 0.5, vol: 33_000, days: -45, by: 'tunde', rules: 'Official qualifying.', final: 'NO' },
  { k: 'sol-300', q: 'Did SOL trade above $300 in September?', cat: 'crypto', p: 0.5, vol: 47_000, days: -22, by: 'tunde', rules: 'Coinbase price.', final: 'NO' },
  { k: 'boxoffice-sep', q: 'Did the top September film open above $100M?', cat: 'entertainment', p: 0.5, vol: 18_000, days: -30, by: 'kemi', rules: 'Box Office Mojo domestic opening.', final: 'YES' },
  { k: 'gta-trailer-3', q: 'Did Rockstar release a GTA VI trailer in September?', cat: 'tech', p: 0.5, vol: 76_000, days: -40, by: 'leo', rules: 'Official channel.', final: 'NO' },
  { k: 'eagles-qualify', q: 'Did the Super Eagles win their October qualifier?', cat: 'sports', p: 0.5, vol: 58_000, days: -9, by: 'kemi', rules: 'Full-time result.', final: 'YES' },
  { k: 'eth-4k-oct', q: 'Did ETH close above $4,000 on 15 Oct?', cat: 'crypto', p: 0.5, vol: 54_000, days: -6, by: 'leo', rules: 'Coinbase daily close.', final: 'YES' },
];

const people = ['ada', 'tunde', 'zara', 'kemi', 'leo', 'nia'];
const uid = async (h: string) => (await db.query<{ id: string }>('SELECT id FROM users WHERE handle=$1', [h]))[0]?.id;
const ids: Record<string, string> = {};
for (const m of MARKETS) {
  if (isExcludedMarket({ question: m.q })) throw new Error(`policy: ${m.q}`);
  const by = await uid(m.by);
  const close = new Date(now + m.days * day).toISOString();
  const [r] = await db.query<{ id: string }>(
    `INSERT INTO markets (venue, external_id, question, rules, close_ts, price_yes, volume, volume_24h, category, creator_id, status, outcome, created_at)
     VALUES ('called',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now() - interval '9 days')
     ON CONFLICT (venue, external_id) DO UPDATE SET category=EXCLUDED.category, rules=EXCLUDED.rules RETURNING id`,
    [`mock-${m.k}`, m.q, m.rules, close, m.final ? (m.final === 'YES' ? 0.99 : 0.01) : m.p, Math.round(m.vol * 1e6).toString(), Math.round(m.vol * 0.12 * 1e6).toString(), m.cat, by ?? null,
      m.final ? 'final' : 'open', m.final ?? null],
  );
  ids[m.k] = String(r?.id);
  const [cnt] = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM market_prices WHERE market_id=$1', [r?.id]);
  if ((cnt?.n ?? 0) < 10) {
    const pts = 84, end = m.final ? (m.final === 'YES' ? 0.97 : 0.04) : m.p;
    let x = Math.min(0.9, Math.max(0.1, end + (rnd() - 0.5) * 0.3));
    for (let i = 0; i < pts; i++) {
      const k = i / (pts - 1);
      x = Math.min(0.97, Math.max(0.03, x + (end - x) * 0.06 + (rnd() - 0.5) * 0.035 * (1 - k * 0.6)));
      const v = i === pts - 1 ? end : x;
      const mins = Math.round((1 - k) * 7 * 24 * 60) + (m.final ? -m.days * 1440 : 0);
      await db.query('INSERT INTO market_prices (market_id, ts, price_yes) VALUES ($1, now() - make_interval(mins => $2), $3) ON CONFLICT DO NOTHING', [r?.id, mins, v.toFixed(6)]);
    }
  }
}

const [pc] = await db.query<{ c: number }>("SELECT count(*)::int AS c FROM posts WHERE market_id IN (SELECT id FROM markets WHERE external_id LIKE 'mock-%')");
if ((pc?.c ?? 0) === 0) {
  const posts: [string, string, string, number][] = [
    ['leo', 'GTA VI ships on time. Rockstar is not slipping twice. Calling it.', 'gta6-date', 2],
    ['zara', 'Tems takes a Grammy home in February. The run has been unreal.', 'tems-grammy', 5],
    ['tunde', 'Eagles to the AFCON semis. New coach, new energy.', 'afcon-eagles-semis', 7],
    ['nia', 'Lakers sneak into the playoffs again, play-in or not.', 'lakers-playoffs', 10],
    ['kemi', 'Harmattan in Abuja before December. Feels early this year.', 'harmattan-early', 12],
  ];
  for (const [who, body, k, h] of posts) await db.query('INSERT INTO posts (author_id, body, market_id, created_at) VALUES ($1,$2,$3, now() - make_interval(hours => $4))', [await uid(who), body, ids[k], h]);
}

const [demo] = await db.query<{ id: string }>(
  `INSERT INTO users (handle, near_account, display_name) VALUES ('demo','demo.preview','Demo Trader')
   ON CONFLICT (near_account) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id`);
const d = String(demo?.id);
for (const h of ['ada', 'tunde', 'leo', 'zara']) await db.query('INSERT INTO follows (follower_id, followee_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [d, await uid(h)]);
for (const h of people) await db.query('INSERT INTO follows (follower_id, followee_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [await uid(h), d]);
const [ps] = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM play_accounts WHERE user_id=$1', [d]);
if (!ps?.n) {
  await db.query("INSERT INTO xp_events (user_id, kind, xp, created_at) SELECT $1, 'seed', 120, now() - make_interval(days => g) FROM generate_series(1, 14) g", [d]);
  await db.query("INSERT INTO xp_events (user_id, kind, xp) VALUES ($1, 'call', 30)", [d]);
  await db.query('INSERT INTO streaks (user_id, current, longest, last_day) VALUES ($1, 9, 16, CURRENT_DATE) ON CONFLICT (user_id) DO UPDATE SET current=9, longest=16, last_day=CURRENT_DATE', [d]);
  const pos: [string, 0 | 1, number, number][] = [
    ['gta6-date', 1, 120, 0.63], ['tems-grammy', 1, 80, 0.44], ['btc-150k', 0, 150, 0.84], ['arsenal-top-4', 1, 90, 0.71], ['lagos-rain-nov1', 1, 40, 0.55], ['avengers-boxoffice', 0, 60, 0.42],
    ['derby-draw', 0, 70, 0.56], ['davido-single', 1, 50, 0.61], ['eth-4k-oct', 0, 45, 0.48],
  ];
  let spent = 0;
  for (const [k, o, cost, avg] of pos) {
    await db.query('INSERT INTO play_positions (user_id, market_id, outcome, shares, cost, updated_at) VALUES ($1,$2,$3,$4,$5, now() - make_interval(hours => $6)) ON CONFLICT DO NOTHING', [d, ids[k], o, (cost / avg).toFixed(6), cost.toFixed(6), Math.round(rnd() * 120)]);
    await db.query("INSERT INTO play_trades (user_id, market_id, outcome, side, shares, amount, price_yes, created_at) VALUES ($1,$2,$3,'buy',$4,$5,$6, now() - make_interval(hours => $7))", [d, ids[k], o, (cost / avg).toFixed(6), cost.toFixed(6), (o ? avg : 1 - avg).toFixed(6), 1 + Math.round(rnd() * 140)]);
    spent += cost;
  }
  await db.query("INSERT INTO play_accounts (user_id, balance, deposited, created_at) VALUES ($1,$2,1500, now() - interval '14 days')", [d, (1500 - spent).toFixed(6)]);
  let v = 1500;
  for (let i = 14 * 6; i >= 1; i--) {
    v = v * (1 + (rnd() - 0.46) * 0.012);
    await db.query('INSERT INTO play_value_history (user_id, ts, value) VALUES ($1, now() - make_interval(hours => $2), $3) ON CONFLICT DO NOTHING', [d, i * 4, v.toFixed(6)]);
  }
  for (const [k, o] of [['derby-draw', 0], ['davido-single', 1], ['eth-4k-oct', 1], ['near-5', 1], ['harmattan-early', 1], ['lakers-playoffs', 1]] as const)
    await db.query('INSERT INTO predictions (user_id, market_id, outcome, price_yes) VALUES ($1,$2,$3,0.5) ON CONFLICT DO NOTHING', [d, ids[k], o]);
  await db.query(`INSERT INTO posts (author_id, body, market_id, created_at) VALUES
    ($1, 'Loaded up on GTA VI shipping on time. Rockstar has been quiet in the best way.', $2, now() - interval '3 hours'),
    ($1, 'Bitcoin is not seeing $150K this year. Took the No side.', $3, now() - interval '20 hours')`, [d, ids['gta6-date'], ids['btc-150k']]);
  const notes: [string, Record<string, unknown>][] = [
    ['follow', {}], ['follow', {}],
    ['resolved', { question: 'Did the North London derby end in a draw?', outcome: 'NO', won: true }],
    ['resolved', { question: 'Did Davido drop a single in October?', outcome: 'YES', won: true }],
    ['draft_ready', { question: 'Will Tems win a Grammy at the 2027 ceremony?' }],
  ];
  for (const [i, [k, p]] of notes.entries()) await db.query('INSERT INTO notifications (user_id, kind, payload, created_at) VALUES ($1,$2,$3, now() - make_interval(hours => $4))', [d, k, JSON.stringify(p), i * 5 + 1]);
  const top: [string, string, number][] = [['leo', 'btc-150k', 0.31], ['zara', 'tems-grammy', 0.18], ['tunde', 'afcon-eagles-semis', 0.12], ['nia', 'lakers-playoffs', 0.07], ['ada', 'avengers-boxoffice', 0.22], ['kemi', 'lagos-rain-nov1', -0.04]];
  for (const [h, k, pnl] of top) {
    const u = await uid(h);
    await db.query('INSERT INTO play_accounts (user_id, balance, deposited) VALUES ($1,$2,1000) ON CONFLICT DO NOTHING', [u, (1000 * (1 + pnl)).toFixed(6)]);
    await db.query("INSERT INTO play_trades (user_id, market_id, outcome, side, shares, amount, price_yes, created_at) VALUES ($1,$2,1,'buy',10,5,0.5, now() - interval '2 days')", [u, ids[k]]);
  }
}
// Generated portrait avatars and market art shipped with the web app (public/). Synthetic, no likeness rights involved.
const ASSET_BASE = process.env.ASSET_BASE ?? '/app';
const MARKET_ART: [string, string][] = [
  ['Arsenal', 'stadium'], ['Super Eagles', 'stadium'], ['Osimhen', 'stadium'], ['North London derby', 'stadium'],
  ['Bitcoin', 'coin'], ['NEAR trade', 'coin'], ['SOL outperform', 'coin'], ['stablecoin', 'coin'], ['ETH close', 'coin'],
   ['Tems', 'stage'], ['Burna Boy', 'stage'], ['Wizkid', 'stage'], ['Afrobeats', 'stage'], ['Davido', 'stage'],
  ['Lagos record rainfall', 'rain'], ['Harmattan', 'rain'], ['London get snow', 'rain'], ['AI lab', 'chip'], ['Starlink', 'chip'], ['Lakers', 'arena'], ['F1', 'track'], ['GTA VI', 'city'], ['Avengers', 'cinema'], ['Nollywood', 'cinema'], ['Joshua', 'ring'], ['Usman', 'ring'], ['Starship', 'rocket'], ['foldable iPhone', 'foldable'],
];
for (const h of ['ada', 'tunde', 'zara', 'kemi', 'leo', 'nia', 'demo']) await db.query('UPDATE users SET avatar_url=$2 WHERE handle=$1', [h, `${ASSET_BASE}/avatars/${h}.jpg`]);
const COVERS: Record<string, string> = { ada: 'stadium', tunde: 'coin', zara: 'stage', kemi: 'cinema', leo: 'foldable', nia: 'rocket', demo: 'arena' };
for (const [h, c] of Object.entries(COVERS)) await db.query('UPDATE users SET cover_url=COALESCE(cover_url,$2) WHERE handle=$1', [h, `${ASSET_BASE}/markets/${c}.jpg`]);
const BIOS: Record<string, [string, string, string]> = { ada: ['Calling football and macro since 2019. Fade me at your own risk. #EPL', 'Lagos', 'https://called.app/ada'], tunde: ['Bull until proven bear. $BTC $ETH', 'Abuja', 'https://called.app/tunde'], zara: ['Charts, chants and chart toppers.', 'London', 'https://called.app/zara'], kemi: ['Box office nerd. Opening weekend is my sport.', 'Accra', 'https://called.app/kemi'], leo: ['Hardware rumours, launch dates, supply chains.', 'Seoul', 'https://called.app/leo'], nia: ['Launch windows and weather calls.', 'Nairobi', 'https://called.app/nia'] };
for (const [h, [b, l, k]] of Object.entries(BIOS)) await db.query("UPDATE users SET bio=COALESCE(NULLIF(bio,''),$2), location=COALESCE(NULLIF(location,''),$3), links=CASE WHEN links='[]'::jsonb THEN $4::jsonb ELSE links END WHERE handle=$1", [h, b, l, JSON.stringify([k])]);
for (const [needle, img] of MARKET_ART) await db.query("UPDATE markets SET image_url=$2 WHERE venue='called' AND question ILIKE $1", [`%${needle}%`, `${ASSET_BASE}/markets/${img}.jpg`]);
// Demo attestations for settled markets (DEMO_MODE only). A fixed preview-only key signs the real
// `${model}:${sha256(request)}:${sha256(response)}` text, so the proof page can verify it end to end.
// Rows are marked demo=true; production rows come from the NEAR AI TEE resolver.
const attestor = new Wallet('0x' + createHash('sha256').update('called-preview-demo-attestor').digest('hex'));
const VERDICT: Record<string, { reasoning: string; sources: string[] }> = {
  'derby-draw': { reasoning: 'The official full-time result shows a home win, so the match did not end in a draw.', sources: ['https://www.premierleague.com/results'] },
  'davido-single': { reasoning: 'A new Davido single was released on major streaming services within October.', sources: ['https://open.spotify.com/artist/0Y3agQaa6g2r0YmHPOO9rh'] },
  'eth-4k-oct': { reasoning: 'The Coinbase ETH-USD daily candle for 15 Oct closed above $4,000.', sources: ['https://www.coinbase.com/price/ethereum'] },
};
const judgeModel = 'deepseek-ai/DeepSeek-V3.1';
const sha = (x: string) => createHash('sha256').update(x).digest('hex');
for (const m of MARKETS.filter((x) => x.final)) {
  const [row] = await db.query<{ id: string }>("SELECT id FROM markets WHERE venue='called' AND question=$1", [m.q]);
  if (!row) continue;
  const v = VERDICT[m.k] ?? { reasoning: `Public sources confirm ${m.final}.`, sources: [] };
  const request = JSON.stringify({ model: judgeModel, messages: [{ role: 'system', content: 'You are the Called resolution judge. Answer YES or NO with reasoning and sources.' }, { role: 'user', content: `Question: ${m.q}\nRules: ${m.rules}` }] });
  const response = JSON.stringify({ outcome: m.final, confidence: 0.97, reasoning: v.reasoning, sources: v.sources });
  const text = `${judgeModel}:${sha(request)}:${sha(response)}`;
  const signature = await attestor.signMessage(text);
  await db.query(
    `INSERT INTO resolutions (market_id, outcome, signer, signed_text, receipt_id, signature, signing_algo, model, request_json, response_json, demo, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,'ecdsa',$7,$8,$9,true, now() - ($10 || ' days')::interval)
     ON CONFLICT (market_id) DO UPDATE SET outcome=EXCLUDED.outcome, signer=EXCLUDED.signer, signed_text=EXCLUDED.signed_text, signature=EXCLUDED.signature,
       signing_algo='ecdsa', model=EXCLUDED.model, request_json=EXCLUDED.request_json, response_json=EXCLUDED.response_json, receipt_id=EXCLUDED.receipt_id, demo=true`,
    [row.id, m.final, attestor.address, text, `demo-${sha(text).slice(0, 16)}`, signature, judgeModel, request, response, String(-m.days)]);
}

const richPosts: [string, string, string][] = [
  ['kemi', 'Arsenal top 4 is the safest call on the board. @ada you still fading it? #EPL', 'Arsenal'],
  ['leo', 'Rockstar trailer 3 breakdown is wild, read this before you trade: https://www.rockstargames.com/VI', 'GTA VI'],
  ['tunde', 'Title going to the last race again. Calling it now. #F1', 'F1 drivers'],
  ['ada', 'AJ by knockout feels like free money at these odds. @kemi disagree?', 'Joshua'],
  ['nia', 'Starship catch + orbit in one year is a big ask. Fading it.', 'Starship'],
  ['kemi', 'Doomsday at $1.5B is the movie call of the year. #Marvel', 'Avengers'],
  ['leo', 'Foldable iPhone before Sept 2027? Supply chain says yes.', 'foldable iPhone'],
  ['zara', '$BTC at 150K needs ETF inflows to hold. @tunde thinks otherwise. We settle this on Called.', 'Bitcoin'],
];
for (const [h, body, needle] of richPosts) {
  await db.query(
    `INSERT INTO posts (author_id, body, market_id, created_at)
     SELECT u.id, $2, (SELECT id FROM markets WHERE venue='called' AND question ILIKE $3 LIMIT 1), now() - interval '40 minutes'
     FROM users u WHERE u.handle=$1 AND NOT EXISTS (SELECT 1 FROM posts WHERE body=$2)`, [h, body, `%${needle}%`]);
}
{ const s = await import('./seed-social.js'); await s.seedSocial(db); await s.seedCallers(db); await s.seedLeagues(db); }
console.log(`seeded ${MARKETS.length} Called markets and the demo account`);
process.exit(0);
