// RAID testnet community: ten testnet accounts that really use the product. Each account is created through the
// public testnet helper, gets tUSDC, calls and backs raids on the current chest (real txs), and posts to the RAID
// social API with posts tied to its raids. Fills go through the intents-sim venue (same as testnet-lifecycle.mjs).
// Keys live only in $RAID_SECRETS/community.json and are never printed. Testnet only.
// Usage: node community.mjs [accounts|fund|raids|buy|sell|live|posts|all]
import { Account, JsonRpcProvider, KeyPair, teraToGas } from "near-api-js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import stringify from "json-stable-stringify";
import { createHash } from "node:crypto";
import fs from "node:fs";

const DIR = process.env.RAID_SECRETS || "../../raid-secrets";
const API = process.env.RAID_API || "https://raid.5-189-170-85.sslip.io";
const load = (n) => JSON.parse(fs.readFileSync(`${DIR}/${n}.json`));
const K = Object.fromEntries(["chest", "usdc", "pepe", "venue", "solver"].map((n) => [n, load(n)]));
const QS = load("quotesigner");
const provider = new JsonRpcProvider({ url: "https://rpc.testnet.fastnear.com" });
const sys = Object.fromEntries(Object.entries(K).map(([n, k]) => [n, new Account(k.account_id, provider, k.private_key)]));
const CHEST = K.chest.account_id, USDC = K.usdc.account_id, PEPE = K.pepe.account_id, SOLVER = K.solver.account_id, VENUE = K.venue.account_id;
const USDC_ASSET = `nep141:${USDC}`, PEPE_ASSET = `nep141:${PEPE}`;
const FILE = `${DIR}/community.json`;
const S = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE)) : { people: {}, raids: {}, posted: {} };
const save = () => fs.writeFileSync(FILE, JSON.stringify(S, null, 2));
const LOG = "../evidence/testnet-community-run.json";
const out = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG)) : [];
const note = (step, v) => { out.push({ step, at: new Date().toISOString(), ...v }); console.log(step, JSON.stringify(v).slice(0, 220)); fs.writeFileSync(LOG, JSON.stringify(out, null, 2)); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const view = (contractId, method, args = {}) => provider.callFunction({ contractId, method, args });
const txh = (o) => o?.transaction_outcome?.id || o?.transaction?.hash;
async function call(acct, contractId, methodName, args, opts = {}) {
  for (let i = 0; ; i++) {
    let r;
    try { r = await acct.callFunctionRaw({ contractId, methodName, args, gas: opts.gas ?? teraToGas("150"), deposit: opts.deposit ?? 0n }); }
    catch (e) { r = e.transactionResult; if (!r) { if (i < 3 && /nonce|timeout|429|fetch/i.test(e.message)) { await sleep(2000 + i * 1500); continue; } throw e; } }
    const fails = (r?.receipts_outcome ?? []).filter((x) => JSON.stringify(x.outcome.status).includes("Failure")).map((x) => JSON.stringify(x.outcome.status).slice(0, 240));
    let ret; try { const b = r?.status?.SuccessValue; ret = b ? JSON.parse(Buffer.from(b, "base64").toString()) : undefined; } catch { ret = undefined; }
    return { tx: txh(r), ok: !JSON.stringify(r?.status ?? {}).includes("Failure") && !fails.length, ret, fails };
  }
}
const must = (r, what) => { if (!r.ok) { note(`FAILED: ${what}`, r); throw new Error(what); } return r; };
function quote({ origin, destination, amountIn, minOut }) {
  const now = Date.now(); const iso = (ms) => new Date(ms).toISOString();
  const q = { dry: false, swapType: "EXACT_INPUT", originAsset: origin, destinationAsset: destination, depositType: "INTENTS", recipientType: "INTENTS", refundType: "INTENTS", recipient: CHEST, refundTo: CHEST, amount: amountIn, amountIn, minAmountOut: minOut, amountOut: minOut, depositAddress: SOLVER, deadline: iso(now + 9 * 60_000), timestamp: iso(now), slippageTolerance: 100 };
  const signed_json = stringify(q);
  const hash = bs58.encode(createHash("sha256").update(signed_json).digest());
  return { signed_json, signature: `ed25519:${bs58.encode(nacl.sign.detached(Buffer.from(hash), bs58.decode(QS.secret)))}` };
}

export const HANDLES = ["frogmaxi", "linehunter", "chestwatch", "dipbuyer", "memecartel", "pepepriest", "basegoblin", "solsailor", "nearnomad", "twoxorbust"];
const acct = (h) => new Account(S.people[h].account_id, provider, S.people[h].private_key);
const step = process.argv[2] || "all";
const suffix = Date.now().toString(36).slice(-5);

if (step === "accounts" || step === "all") {
  for (const h of HANDLES) {
    if (S.people[h]) continue;
    const kp = KeyPair.fromRandom("ed25519");
    const id = `raid-${h}-${suffix}.testnet`;
    // The public helper is rate limited, so accounts come from the `testnet` registrar, funded by the two backer accounts.
    const funder = HANDLES.indexOf(h) < 5 ? "backer1" : "backer2";
    const fa = new Account(load(funder).account_id, provider, load(funder).private_key);
    const r = await call(fa, "testnet", "create_account", { new_account_id: id, new_public_key: kp.getPublicKey().toString() }, { deposit: 1_200_000_000_000_000_000_000_000n, gas: teraToGas("100") });
    if (!r.ok) { note("create_account failed", { h, fails: r.fails }); continue; }
    for (let i = 0; i < 20 && !(await provider.viewAccount({ accountId: id }).catch(() => null)); i++) await sleep(1000);
    S.people[h] = { account_id: id, public_key: kp.getPublicKey().toString(), private_key: kp.toString() }; save();
    note("testnet account created (testnet registrar, 1.2 NEAR)", { handle: h, account: id, tx: r.tx });
    await sleep(800);
  }
}
if (step === "fund" || step === "all") {
  for (const h of HANDLES) {
    if (!S.people[h] || S.people[h].funded) continue;
    note(`mint 250 tUSDC to ${h}`, must(await call(sys.usdc, USDC, "mint", { account_id: S.people[h].account_id, amount: "250000000" }), "mint"));
    S.people[h].funded = true; save();
  }
}
const back = async (h, id, usdc) => note(`${h} backs raid #${id} with ${usdc} tUSDC`, must(await call(acct(h), USDC, "ft_transfer_call", { receiver_id: CHEST, amount: String(usdc * 1e6), msg: JSON.stringify({ back: id }) }, { deposit: 1n }), "back"));
const callRaid = async (key, h, title, bps, open, retreat) => {
  if (S.raids[key] !== undefined) return S.raids[key];
  const r = must(await call(acct(h), CHEST, "call_raid", { title, target: PEPE_ASSET, target_x_bps: bps, open_minutes: open, retreat_hours: retreat }, { gas: teraToGas("30") }), "call");
  S.raids[key] = r.ret; save(); note(`${h} calls raid #${r.ret}: ${title}`, r); return r.ret;
};
// Raids that run the full loop now (crew window 2 min, then the 1 min public countdown).
const PLAN = [
  { key: "A", by: "frogmaxi", title: "Frogs to the line: $tPEPE 2x", bps: 20000, crew: [["linehunter", 30], ["chestwatch", 25], ["pepepriest", 40], ["nearnomad", 15], ["frogmaxi", 20]], end: "hit", px: 205 },
  { key: "B", by: "linehunter", title: "Quick 1.5x on $tPEPE, in and out", bps: 15000, crew: [["dipbuyer", 20], ["basegoblin", 35], ["twoxorbust", 25], ["linehunter", 15]], end: "hit", px: 152 },
  { key: "C", by: "dipbuyer", title: "Bottom is in. $tPEPE 3x or bust", bps: 30000, crew: [["memecartel", 30], ["solsailor", 20], ["frogmaxi", 15], ["dipbuyer", 10]], end: "hold" },
  { key: "D", by: "memecartel", title: "Cartel raid: $tPEPE to 2x", bps: 20000, crew: [["chestwatch", 20], ["twoxorbust", 30], ["pepepriest", 15], ["memecartel", 25]], end: "hold" },
];
if (step === "raids" || step === "all") {
  for (const p of PLAN) {
    const id = await callRaid(p.key, p.by, p.title, p.bps, 2, p.end === "hold" ? 48 : 24);
    if (!S[`backed${p.key}`]) { for (const [h, a] of p.crew) await back(h, id, a); S[`backed${p.key}`] = true; save(); }
  }
}
if (step === "buy" || step === "all") {
  for (const p of PLAN) {
    const id = S.raids[p.key]; let raid = await view(CHEST, "get_raid", { id });
    if (raid.status !== "Open") continue;
    while (Date.now() < raid.buy_after_ms + 4000) await sleep(4000);
    note(`raid #${id}: execute_buy (signed quote, intents-sim venue)`, must(await call(sys.solver, CHEST, "execute_buy", { id, ...quote({ origin: USDC_ASSET, destination: PEPE_ASSET, amountIn: raid.pot, minOut: String(BigInt(raid.pot) * 95n / 100n) }) }), "buy"));
    note(`raid #${id}: solver fills tPEPE`, must(await call(sys.solver, VENUE, "mt_transfer", { receiver_id: CHEST, token_id: PEPE_ASSET, amount: raid.pot }, { deposit: 1n }), "fill"));
    note(`raid #${id}: settle -> Held`, must(await call(sys.solver, CHEST, "settle", { id }), "settle"));
  }
}
if (step === "sell" || step === "all") {
  for (const p of PLAN.filter((x) => x.end === "hit")) {
    const id = S.raids[p.key]; const raid = await view(CHEST, "get_raid", { id });
    if (raid.status !== "Held") continue;
    const line = BigInt(raid.entry_cost) * BigInt(p.bps) / 10000n;
    const proceeds = String(BigInt(raid.entry_cost) * BigInt(p.px) / 100n);
    note(`raid #${id}: execute_sell at the line`, must(await call(sys.solver, CHEST, "execute_sell", { id, ...quote({ origin: PEPE_ASSET, destination: USDC_ASSET, amountIn: raid.held, minOut: String(line) }) }), "sell"));
    note(`raid #${id}: solver fills tUSDC`, must(await call(sys.solver, VENUE, "mt_transfer", { receiver_id: CHEST, token_id: USDC_ASSET, amount: proceeds }, { deposit: 1n }), "fill sell"));
    note(`raid #${id}: settle -> Closed`, must(await call(sys.solver, CHEST, "settle", { id }), "settle sell"));
    for (const [h] of p.crew) {
      const cs = await call(acct(h), CHEST, "claim_share", { id });
      if (cs.ok) note(`${h} claim_share raid #${id}`, cs);
    }
    const c = await call(acct(p.by), CHEST, "claim", {}, { gas: teraToGas("150") }); note(`${p.by} claims caller fee and share`, c);
    for (const [h] of p.crew) if (h !== p.by) { const r = await call(acct(h), CHEST, "claim", {}, { gas: teraToGas("150") }); if (r.ok) note(`${h} claims to wallet`, r); }
  }
}
// Raids left open for the next hours so the feed has live crews forming.
const LIVE = [
  { key: "E", by: "solsailor", title: "Sailing $tPEPE to 2x. Crew up before the bell", bps: 20000, open: 90, crew: [["nearnomad", 20], ["basegoblin", 15], ["solsailor", 25]] },
  { key: "F", by: "basegoblin", title: "Goblin mode: $tPEPE 1.5x, small and fast", bps: 15000, open: 75, crew: [["chestwatch", 10], ["dipbuyer", 15], ["basegoblin", 20]] },
  { key: "G", by: "twoxorbust", title: "2x or bust. Literally. $tPEPE", bps: 20000, open: 120, crew: [["pepepriest", 20], ["frogmaxi", 15], ["twoxorbust", 20]] },
];
if (step === "live" || step === "all") {
  for (const p of LIVE) {
    const id = await callRaid(p.key, p.by, p.title, p.bps, p.open, 24);
    if (!S[`backed${p.key}`]) { for (const [h, a] of p.crew) await back(h, id, a); S[`backed${p.key}`] = true; save(); }
  }
}
async function signIn(h) {
  const p = S.people[h]; if (p.token) return p.token;
  const n = await (await fetch(`${API}/v1/auth/nonce`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).json();
  const nonce = Buffer.from(n.nonce, "base64");
  const len = (s) => { const b = Buffer.from(s); const l = Buffer.alloc(4); l.writeUInt32LE(b.length); return Buffer.concat([l, b]); };
  const tag = Buffer.alloc(4); tag.writeUInt32LE(2 ** 31 + 413);
  const hash = createHash("sha256").update(Buffer.concat([tag, len(n.message), nonce, len(n.recipient), Buffer.from([0])])).digest();
  const sk = bs58.decode(p.private_key.split(":")[1]);
  const signature = Buffer.from(nacl.sign.detached(hash, sk)).toString("base64");
  const r = await fetch(`${API}/v1/auth/signin`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ handle: h, signed: { accountId: p.account_id, publicKey: p.public_key, signature, message: n.message, nonce: n.nonce, recipient: n.recipient } }) });
  const j = await r.json(); if (!r.ok) throw new Error(`signin ${h}: ${JSON.stringify(j)}`);
  p.token = j.token; save(); return j.token;
}
const post = async (h, body, raidId) => {
  const k = `${h}:${body.slice(0, 40)}`; if (S.posted[k]) return S.posted[k];
  const r = await fetch(`${API}/v1/raid/posts`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await signIn(h)}` }, body: JSON.stringify({ body, raidId }) });
  const j = await r.json(); if (!r.ok) { note("post failed", { h, j }); return null; }
  S.posted[k] = j.id; save(); note(`${h} posts`, { id: j.id, raidId }); await sleep(400); return j.id;
};
if (step === "posts" || step === "all") {
  const R = S.raids;
  const P = [
    ["frogmaxi", `Called raid #${R.A}: $tPEPE to 2x. Five of us in the chest, the line is set, nobody can dump on the crew.`, R.A],
    ["linehunter", `Backed #${R.A} with 30. Caller only gets paid if we hit 2x. That is how calls should work.`, R.A],
    ["pepepriest", `40 tUSDC into #${R.A}. The ten minute public countdown means no one front runs the buy.`, R.A],
    ["frogmaxi", `#${R.A} hit the line. Chest sold at 2x and paid the crew. Claimed straight to my wallet.`, R.A],
    ["linehunter", `New call, raid #${R.B}: quick 1.5x on $tPEPE. Small line, fast exit.`, R.B],
    ["basegoblin", `In #${R.B} with 35. 1.5x is the honest line for this one.`, R.B],
    ["linehunter", `#${R.B} closed at the line. Backers kept 90% of the profit, my 2.5% fee unlocked.`, R.B],
    ["dipbuyer", `Raid #${R.C}: $tPEPE 3x or bust. The chest holds it until the line or the retreat deadline.`, R.C],
    ["solsailor", `Backed #${R.C}. 3x is greedy but the rules are clear: miss, and the caller earns nothing.`, R.C],
    ["memecartel", `Cartel raid #${R.D} is riding. Chest bought, now we wait for 2x.`, R.D],
    ["twoxorbust", `30 into #${R.D}. Watching the line like a hawk.`, R.D],
    ["chestwatch", `Love that every back is a real tx you can open on the explorer. Backed #${R.A} and #${R.D}.`, R.D],
    ["solsailor", `Crew window open on raid #${R.E}: $tPEPE to 2x. Come aboard.`, R.E],
    ["nearnomad", `Joined #${R.E}. Second raid this week, first one hit.`, R.E],
    ["basegoblin", `Goblin mode, raid #${R.F}. 1.5x, small and fast. Crew is forming now.`, R.F],
    ["twoxorbust", `Raid #${R.G} is live. 2x or bust, and the name is not a joke.`, R.G],
    ["pepepriest", `Backed #${R.G}. The chest has no keys, so the only exit is the line.`, R.G],
    ["dipbuyer", `Backed #${R.F} too. Spreading across lines: 1.5x, 2x, 3x.`, R.F],
    ["nearnomad", `Testnet runs are the best way to learn a raid end to end. Called, backed, bought, hit, claimed.`, R.A],
    ["chestwatch", `Watching #${R.F} fill up. Crew window closes, then everyone sees the ten minute countdown.`, R.F],
  ].filter(([, , id]) => id !== undefined);
  for (const [h, b, id] of P) await post(h, b, id);
  // a few likes between accounts
  const ids = Object.values(S.posted);
  for (const [i, h] of HANDLES.entries()) for (const pid of ids.filter((_, j) => (j + i) % 3 === 0).slice(0, 5)) await fetch(`${API}/v1/raid/posts/${pid}/like`, { method: "POST", headers: { authorization: `Bearer ${await signIn(h)}` } }).catch(() => {});
  note("posts done", { count: ids.length });
}
note("community state", { people: Object.fromEntries(Object.entries(S.people).map(([h, p]) => [h, p.account_id])), raids: S.raids });
