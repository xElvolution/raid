/**
 * Seeds the RAID social feed with the 10 testnet community accounts: varied posts, images, replies,
 * quotes, likes, reposts, follows, stories and reels. Idempotent via a local state file.
 * Run from scripts/: node seed-social.mjs  (needs ../../raid-secrets/community.json, ../../xoox/seed/*)
 */
import nacl from "tweetnacl";
import bs58 from "bs58";
import { createHash } from "node:crypto";
import fs from "node:fs";

const DIR = process.env.RAID_SECRETS || "../../raid-secrets";
const MEDIA = process.env.RAID_SEED_MEDIA || "../../xoox/seed";
const API = process.env.RAID_API || "https://app.raid.5-189-170-85.sslip.io";
const STATE = process.env.RAID_SEED_STATE || "../../xoox/seed/state.json";
const S = JSON.parse(fs.readFileSync(`${DIR}/community.json`, "utf8"));
const st = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : { posts: {}, done: {} };
const save = () => fs.writeFileSync(STATE, JSON.stringify(st, null, 1));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tokens = {};
async function signIn(h) {
  if (tokens[h]) return tokens[h];
  const p = S.people[h];
  const n = await (await fetch(`${API}/v1/auth/nonce`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).json();
  const nonce = Buffer.from(n.nonce, "base64");
  const len = (s) => { const b = Buffer.from(s); const l = Buffer.alloc(4); l.writeUInt32LE(b.length); return Buffer.concat([l, b]); };
  const tag = Buffer.alloc(4); tag.writeUInt32LE(2 ** 31 + 413);
  const hash = createHash("sha256").update(Buffer.concat([tag, len(n.message), nonce, len(n.recipient), Buffer.from([0])])).digest();
  const signature = Buffer.from(nacl.sign.detached(hash, bs58.decode(p.private_key.split(":")[1]))).toString("base64");
  const r = await fetch(`${API}/v1/auth/signin`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle: h, signed: { accountId: p.account_id, publicKey: p.public_key, signature, message: n.message, nonce: n.nonce, recipient: n.recipient } }) });
  const j = await r.json(); if (!r.ok) throw new Error(`signin ${h}: ${JSON.stringify(j)}`);
  return (tokens[h] = j.token);
}
async function api(h, method, path, body, raw) {
  const headers = { authorization: `Bearer ${await signIn(h)}` };
  if (!raw) headers["content-type"] = "application/json"; else headers["content-type"] = "video/mp4";
  const r = await fetch(API + path, { method, headers, body: raw ?? JSON.stringify(body ?? {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.log("FAIL", method, path, r.status, JSON.stringify(j).slice(0, 200)); return null; }
  return j;
}
const media = {};
async function upload(h, file) {
  if (st.done[`media:${file}`]) return st.done[`media:${file}`];
  const data = `data:image/png;base64,${fs.readFileSync(`${MEDIA}/${file}`).toString("base64")}`;
  const j = await api(h, "POST", "/v1/media", { data }); if (!j) return null;
  st.done[`media:${file}`] = API + j.url; save(); return API + j.url;
}
async function post(key, h, body, o = {}) {
  if (st.posts[key]) return st.posts[key];
  const b = { body };
  if (o.img) b.mediaUrl = media[o.img] ?? (media[o.img] = await upload(h, o.img));
  if (o.reply) b.replyTo = st.posts[o.reply];
  if (o.quote) b.quoteOf = st.posts[o.quote];
  if (o.raid) b.raidId = o.raid;
  const j = await api(h, "POST", "/v1/posts", b); if (!j) return null;
  st.posts[key] = String(j.id ?? j.post?.id); save(); console.log(h, key, st.posts[key]); await sleep(250); return st.posts[key];
}

const P = [
  ["t1", "frogmaxi", "Most memecoin losses aren’t bad entries. They’re no exit plan. Pick the sell price before you buy, then let it go."],
  ["t2", "linehunter", "$PEPE keeps respecting the same level on the 4h. Not calling anything yet, just watching how it reacts there.", { img: "m_pepe_line.png" }],
  ["t3", "memecartel", "me after saying I’d only check $DOGE once a day", { img: "m_doge_dump.png" }],
  ["t4", "basegoblin", "Base memes feel alive again. $BRETT holding up better than most of the majors this week.", { img: "m_brett_send.png" }],
  ["t5", "pepepriest", "gm. Reminder that the pot in a raid can’t be withdrawn by anyone, including the person who started it. Read the rules tab before you join anything.", { img: "m_gm.png" }],
  ["t6", "solsailor", "Joining from Phantom worked first try. No NEAR account, just paid with Solana USDC and it showed up in the crew list."],
  ["t7", "nearnomad", "$SHITZU is the one NEAR native meme I keep coming back to. Small, weird, loyal community."],
  ["t8", "twoxorbust", "2x or bust is a lifestyle, not a strategy. Still doing it.", { img: "m_patience.png" }],
  ["t9", "chestwatch", "Things I check before joining a raid: who started it, their past hits, the target, and how long until retreat. Takes 20 seconds."],
  ["t10", "dipbuyer", "Everyone is euphoric on $TRUMP again. I’m waiting for the boring red day.", {}],
  ["t11", "memecartel", "Rules I actually follow:", { img: "m_rules.png" }],
  ["t12", "linehunter", "Small targets get hit. 1.5x is not exciting but it pays more often than 3x."],
  ["t13", "frogmaxi", "Thinking about a $MOG raid this weekend. Would you join at 1.8x or wait for a lower entry?"],
  ["t14", "basegoblin", "$PENGU chart is ugly but the memes are elite. Watching, not buying."],
  ["t15", "nearnomad", "Testnet tip: Settings has a free test funds button. Grab some and try joining a raid before you ever put real money in."],
  ["t16", "solsailor", "$SPX holders are the most patient people in crypto and I respect it."],
  ["t17", "pepepriest", "$PEPE community energy right now is the best since spring. Not price advice, just vibes."],
  ["t18", "twoxorbust", "Hot take: the caller only earning on a hit is the best rule in this app. No more paid shills dumping on followers."],
  ["t19", "dipbuyer", "$SHIB volume is waking up. Usually means nothing. Sometimes means everything."],
  ["t20", "chestwatch", "If you started a raid and it retreated, post about it. Honest misses build more trust than cherry picked wins."],
  // reply conversations
  ["r1", "dipbuyer", "Same. I set the line first now. If it doesn’t hit, it doesn’t hit.", { reply: "t1" }],
  ["r2", "twoxorbust", "Counterpoint: the exit plan is always ‘one more pump’.", { reply: "t1" }],
  ["r3", "frogmaxi", "And that’s how bags are made.", { reply: "r2" }],
  ["r4", "chestwatch", "Which level? The one from last week’s wick?", { reply: "t2" }],
  ["r5", "linehunter", "Yes, that one. It held three times already.", { reply: "r4" }],
  ["r6", "basegoblin", "I would join at 1.8x. Lower entries never come when you want them.", { reply: "t13" }],
  ["r7", "solsailor", "Wait for a red day. MOG always gives one.", { reply: "t13" }],
  ["r8", "memecartel", "Did it ask for a NEAR wallet at all?", { reply: "t6" }],
  ["r9", "solsailor", "No. Phantom signs, it swaps in the background, done.", { reply: "r8" }],
  ["r10", "pepepriest", "This is the way. Practise on testnet first.", { reply: "t15" }],
  ["r11", "nearnomad", "The boring red day never comes for TRUMP holders.", { reply: "t10" }],
  // quotes
  ["q1", "nearnomad", "Saving this for every new person who asks how to start.", { quote: "t9" }],
  ["q2", "frogmaxi", "This. Post your misses too.", { quote: "t20" }],
];

await signIn("frogmaxi");
for (const [k, h, b, o] of P) await post(k, h, b, o ?? {});

// follows: everyone follows 4 to 7 others
const H = Object.keys(S.people);
if (!st.done.follows) {
  for (const h of H) for (const x of H.filter((y) => y !== h).sort(() => Math.random() - 0.5).slice(0, 4 + Math.floor(Math.random() * 4))) await api(h, "POST", `/v1/follows/${x}`);
  st.done.follows = 1; save(); console.log("follows done");
}
// likes and reposts
if (!st.done.likes) {
  const ids = Object.values(st.posts);
  for (const id of ids) {
    const n = 2 + Math.floor(Math.random() * 7);
    for (const h of [...H].sort(() => Math.random() - 0.5).slice(0, n)) await api(h, "POST", `/v1/posts/${id}/like`);
  }
  for (const [k, h] of [["t5", "chestwatch"], ["t9", "dipbuyer"], ["t18", "linehunter"], ["t1", "solsailor"], ["t15", "frogmaxi"]]) await api(h, "POST", `/v1/posts/${st.posts[k]}/recast`);
  for (const id of Object.values(st.posts).slice(20, 28)) await api("chestwatch", "POST", `/v1/posts/${id}/like`);
  st.done.likes = 1; save(); console.log("likes done");
}
// stories
const STORIES = [
  ["frogmaxi", { body: "Watching $PEPE into the weekend. Line set, coffee ready.", coin: "PEPE", bg: 0 }],
  ["basegoblin", { img: "m_brett_send.png", body: "Base memes are awake", coin: "BRETT", bg: 1 }],
  ["solsailor", { body: "Joined a raid from Phantom today. Zero NEAR needed.", bg: 3 }],
  ["memecartel", { img: "m_patience.png", bg: 1 }],
  ["nearnomad", { body: "$SHITZU community call tonight", coin: "SHITZU", bg: 2 }],
  ["pepepriest", { img: "m_gm.png", bg: 2 }],
];
if (!st.done.stories) {
  for (const [h, s] of STORIES) {
    const b = { body: s.body ?? "", bg: s.bg }; if (s.coin) b.coin = s.coin;
    if (s.img) b.mediaUrl = (await upload(h, s.img)).replace(API, "");
    await api(h, "POST", "/v1/stories", b); await sleep(200);
  }
  st.done.stories = 1; save(); console.log("stories done");
}
// reels
const REELS = [
  ["frogmaxi", "r_pepe.mp4", "PEPE is moving again. Raid it to the line with me.", "PEPE", 10],
  ["memecartel", "r_doge.mp4", "DOGE range play, small target.", "DOGE", 9],
  ["basegoblin", "r_brett.mp4", "Base season reel. BRETT group buy, one exit price.", "BRETT", 8],
  ["nearnomad", "r_shitzu.mp4", "SHITZU on NEAR. Nobody can withdraw the pot.", "SHITZU", 7],
  ["solsailor", "r_trump.mp4", "TRUMP from Phantom. Tap Join, approve once.", "TRUMP", 6],
  ["twoxorbust", "r_mog.mp4", "MOG higher lows. I set the line, you set the size.", "MOG", 5],
];
for (const [h, f, caption, coin, raidId] of REELS) {
  if (st.done[`reel:${f}`]) continue;
  const q = new URLSearchParams({ caption, coin, raidId: String(raidId) });
  const j = await api(h, "POST", `/v1/raid/reels/upload?${q}`, null, fs.readFileSync(`${MEDIA}/${f}`));
  if (j) { st.done[`reel:${f}`] = j.id; save(); console.log("reel", h, j.id); }
}
// reel likes
if (!st.done.reelLikes) {
  for (const f of REELS.map((r) => r[1])) { const id = st.done[`reel:${f}`]; if (!id) continue; for (const h of [...H].sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 6))) await api(h, "POST", `/v1/raid/reels/${id}/like`); }
  st.done.reelLikes = 1; save();
}
console.log("seed done");
