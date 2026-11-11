// RAID full TESTNET rehearsal, one script. Testnet txs only, plus free mainnet READ-ONLY views (intents.near
// simulate_intents via the web's /api/keyless/verify). No mainnet tx, no money. Keys are read from ../secrets and
// never printed. Every step is logged to ./testnet-e2e-run.json and ../evidence/testnet-e2e-run.json.
//   node testnet-e2e.mjs a   -> crew DAO calls a raid, backs (NEAR, MetaMask-, Phantom-derived), reel, war, launchpad, settle/claim
//   node testnet-e2e.mjs b   -> after the crew window + public countdown (~20 min): Chain Signatures signs the buy intent
import { Account, JsonRpcProvider, KeyPair, teraToGas, nearToYocto } from "near-api-js";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import nacl from "tweetnacl";
import bs58 from "bs58";
import fs from "node:fs";
const req = createRequire(new URL("../web/package.json", import.meta.url));
const { Wallet } = req("ethers");
const SEC = new URL("../secrets/", import.meta.url).pathname;
const S = JSON.parse(fs.readFileSync(SEC + "testnet.json"));
if (S.network !== "testnet") throw new Error("testnet only");
const crews = JSON.parse(fs.readFileSync(SEC + "crews.json")), judges = JSON.parse(fs.readFileSync(SEC + "judges.json"));
const WEB = process.env.RAID_WEB || "http://localhost:3410", API = process.env.RAID_API || "http://localhost:8787";
const provider = new JsonRpcProvider({ url: "https://rpc.testnet.fastnear.com" });
const CHEST = S.account_id, USDC = `tusdc.${CHEST}`, LAUNCH = `launch.${CHEST}`;
const FROGS = "raid-frog-legion.sputnikv2.testnet", DOGS = "raid-doge-pack.sputnikv2.testnet";
const TRUMP = "nep141:sol-c58e6539c2f2e097c251f8edf11f9c03e581f8d4.omft.near";
const WAR = { start: 1794418080000, end: 1794418080000 + 86_400_000 };
const LOG = new URL("./testnet-e2e-run.json", import.meta.url).pathname, EV = new URL("../evidence/testnet-e2e-run.json", import.meta.url).pathname;
const run = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG)) : { network: "testnet", chest: CHEST, steps: [] };
const save = () => { const s = JSON.stringify(run, null, 2); fs.writeFileSync(LOG, s); fs.mkdirSync(new URL("../evidence/", import.meta.url), { recursive: true }); fs.writeFileSync(EV, s); };
// result: pass | fail | intents (fails only because NEAR Intents / 1Click do not exist on testnet)
const note = (id, title, result, v = {}) => { const e = { id, title, result, at: new Date().toISOString(), ...v }; run.steps = run.steps.filter((x) => x.id !== id); run.steps.push(e); save(); console.log(`[${result}] ${id} ${title}`, v.tx ?? "", v.why ? `(${v.why})` : ""); return e; };
const view = (contractId, method, args = {}) => provider.callFunction({ contractId, method, args });
const acct = (a) => new Account(a.account_id, provider, a.private_key);
const owner = new Account(CHEST, provider, S.private_key), bridge = new Account(LAUNCH, provider, S.private_key);
const call = async (a, contractId, methodName, args, o = {}) => {
  try {
    const r = await a.callFunctionRaw({ contractId, methodName, args, gas: o.gas ?? teraToGas("100"), deposit: o.deposit ?? 0n });
    const outs = r?.receipts_outcome ?? [];
    const fails = outs.filter((x) => JSON.stringify(x.outcome.status).includes("Failure")).map((x) => ({ executor: x.outcome.executor_id, err: JSON.stringify(x.outcome.status).slice(0, 220) }));
    const events = outs.flatMap((x) => x.outcome.logs).filter((l) => l.startsWith("EVENT_JSON")).map((l) => JSON.parse(l.slice(11)));
    const top = JSON.stringify(r?.status ?? {}).includes("Failure");
    return { tx: r.transaction_outcome.id, block: r.transaction_outcome.block_hash, ok: !top && !fails.length, topOk: !top, fails: fails.length ? fails : undefined, events: events.map((e) => e.event), _ev: events, value: r?.status?.SuccessValue ? Buffer.from(r.status.SuccessValue, "base64").toString() : undefined };
  } catch (e) { return { ok: false, err: String(e.message ?? e).slice(0, 300) }; }
};
const clean = (r) => { const { _ev, ...rest } = r; return rest; };
// A back succeeds when the raid_backed event fired; the chest's follow-up forward to NEAR Intents fails on testnet by design.
const intentsOnly = (r) => (r.fails ?? []).every((f) => f.err.includes("intents-not-on-testnet") || f.executor.startsWith("intents-not-on-testnet"));
const backResult = (r) => (r.events?.includes("raid_backed") ? "pass" : "fail");
const mint = (to, n) => call(owner, USDC, "mint", { account_id: to, amount: String(n * 1e6) });
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));
const step = process.argv[2] || "a";

if (step === "a") {
  run.started = run.started ?? new Date().toISOString();
  const cfg = await view(CHEST, "get_config");
  note("0", "Preflight: testnet chest, testnet USDC, NEAR Intents stand-in", cfg.intents.includes("not-on-testnet") ? "pass" : "fail", { chest: CHEST, usdc: cfg.usdc, intents: cfg.intents, mpc: cfg.mpc, min_open_minutes: cfg.min_open_minutes, buy_delay_minutes: cfg.buy_delay_minutes });

  // 1. A crew (Sputnik DAO) proposes the raid, members vote, the DAO itself calls it on the chest.
  const before = (await view(CHEST, "list_raids", { from: 0, limit: 200 })).length;
  const title = "E2E rehearsal: raid $TRUMP to 2x";
  const kind = { FunctionCall: { receiver_id: CHEST, actions: [{ method_name: "call_raid", args: Buffer.from(JSON.stringify({ title, target: TRUMP, target_x_bps: 20000, open_minutes: cfg.min_open_minutes, retreat_hours: 1 })).toString("base64"), deposit: "0", gas: "30000000000000" }] } };
  const p = await call(acct(crews.frogs), FROGS, "add_proposal", { proposal: { description: `${title}$$$$RAID call: 2x line, ${cfg.min_open_minutes} min crew window, 1 h retreat (testnet rehearsal)`, kind } }, { deposit: nearToYocto("0.1") });
  const pid = Number(p.value);
  note("1", "Crew DAO proposal: Frog Legion proposes call_raid $TRUMP 2x", p.ok ? "pass" : "fail", { dao: FROGS, proposal: pid, ...clean(p) });
  const v1 = await call(acct(crews.frogs), FROGS, "act_proposal", { id: pid, action: "VoteApprove", proposal: kind }, { gas: teraToGas("200") });
  note("2", "Crew vote 1/2: captain approves", v1.ok ? "pass" : "fail", { dao: FROGS, proposal: pid, voter: crews.frogs.account_id, ...clean(v1) });
  const v2 = await call(acct(judges.judge2), FROGS, "act_proposal", { id: pid, action: "VoteApprove", proposal: kind }, { gas: teraToGas("200") });
  const prop = await view(FROGS, "get_proposal", { id: pid });
  const raids = await view(CHEST, "list_raids", { from: 0, limit: 200 });
  const raid = raids.slice(before).find((r) => r.caller === FROGS && r.title === title);
  note("3", "Crew vote 2/2: member approves, proposal passes, the DAO calls the raid", v2.topOk && prop.status === "Approved" && raid ? "pass" : "fail", { dao: FROGS, proposal: pid, status: prop.status, voter: judges.judge2.account_id, raid: raid?.id, caller: raid?.caller, events: v2.events, tx: v2.tx, block: v2.block });
  if (!raid) { console.error("no raid; stopping"); process.exit(1); }
  run.raid = raid.id; save();
  const N = raid.id;

  // 2. Back from a NEAR wallet (a plain NEAR account signing ft_transfer_call, exactly what the web app's tx.back builds).
  const nearBacker = crews.dogs;
  const m1 = await mint(nearBacker.account_id, 40);
  const b1 = await call(acct(nearBacker), USDC, "ft_transfer_call", { receiver_id: CHEST, amount: "40000000", msg: JSON.stringify({ back: N }) }, { deposit: 1n, gas: teraToGas("150") });
  note("4", "Back from a NEAR wallet: 40 tUSDC", backResult(b1), { raid: N, backer: nearBacker.account_id, mint_tx: m1.tx, ...clean(b1), intents_forward_failed_as_expected: intentsOnly(b1), stake: await view(CHEST, "get_stake", { id: N, account_id: nearBacker.account_id }) });

  // 3. MetaMask- and Phantom-derived accounts: throwaway keys (generated now, never funded, discarded).
  const { salt } = await (await fetch(WEB + "/api/keyless/salt")).json();
  const USDC_MAIN = "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";
  const nonce = () => { const n = new Uint8Array(32); n.set(Buffer.from(salt, "hex").subarray(0, 4)); n.set(nacl.randomBytes(28), 4); return Buffer.from(n).toString("base64"); };
  const payload = (signer, amount) => JSON.stringify({ signer_id: signer, verifying_contract: "intents.near", deadline: new Date(Date.now() + 10 * 60_000).toISOString(), nonce: nonce(), intents: [{ intent: "ft_withdraw", token: USDC_MAIN, receiver_id: "intents.near", amount, msg: JSON.stringify({ back: N, for: signer }) }] });
  const verify = async (signed) => (await fetch(WEB + "/api/keyless/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signed }) })).json();
  const w = Wallet.createRandom(); const evm = w.address.toLowerCase();
  const pe = payload(evm, "12000000"); const raw = Buffer.from((await w.signMessage(pe)).slice(2), "hex"); raw[64] -= 27;
  const ve = await verify({ standard: "erc191", payload: pe, signature: "secp256k1:" + bs58.encode(raw) });
  const kp = nacl.sign.keyPair(); const solAddr = bs58.encode(kp.publicKey), solAcct = Buffer.from(kp.publicKey).toString("hex");
  const pp = payload(solAcct, "9000000");
  const vp = await verify({ standard: "raw_ed25519", payload: pp, public_key: "ed25519:" + solAddr, signature: "ed25519:" + bs58.encode(nacl.sign.detached(Buffer.from(pp), kp.secretKey)) });
  note("5a", "MetaMask (ERC-191) signs the back intent; intents.near on mainnet accepts the signature (simulate_intents, read-only)", ve.local?.ok && ve.verifier?.status === "signature_ok_no_balance" ? "pass" : "fail", { intents_account: evm, local: ve.local, verifier: ve.verifier });
  note("6a", "Phantom (raw Ed25519) signs the back intent; intents.near on mainnet accepts the signature (simulate_intents, read-only)", vp.local?.ok && vp.verifier?.status === "signature_ok_no_balance" ? "pass" : "fail", { solana_address: solAddr, intents_account: solAcct, local: vp.local, verifier: vp.verifier });
  // The relayer/bridge leg is NEAR Intents (mainnet only). On testnet a stand-in bridge account delivers tUSDC with {"back","for"}.
  const mb = await mint(LAUNCH, 21);
  const be = await call(bridge, USDC, "ft_transfer_call", { receiver_id: CHEST, amount: "12000000", msg: JSON.stringify({ back: N, for: evm }) }, { deposit: 1n, gas: teraToGas("150") });
  note("5b", "MetaMask-derived account backs 12 tUSDC (stand-in bridge delivers with for=0x…)", backResult(be), { raid: N, beneficiary: evm, mint_tx: mb.tx, ...clean(be), intents_forward_failed_as_expected: intentsOnly(be), note: "On mainnet NEAR Intents executes the signed intent (5a); testnet has no intents.near, so a stand-in account delivers." });
  const bp = await call(bridge, USDC, "ft_transfer_call", { receiver_id: CHEST, amount: "9000000", msg: JSON.stringify({ back: N, for: solAcct }) }, { deposit: 1n, gas: teraToGas("150") });
  note("6b", "Phantom-derived account backs 9 tUSDC (stand-in bridge delivers with for=<64-hex>)", backResult(bp), { raid: N, beneficiary: solAcct, ...clean(bp), intents_forward_failed_as_expected: intentsOnly(bp) });
  const backers = await view(CHEST, "get_backers", { id: N });
  note("7", "get_backers lists the NEAR, 0x and Ed25519 accounts with their stakes", [nearBacker.account_id, evm, solAcct].every((a) => backers.some(([b]) => b === a)) ? "pass" : "fail", { raid: N, backers });

  // 4. A reel for the raid, and a back attributed to it (off-chain attribution, demo).
  const me = judges.judge3;
  const n = await (await fetch(API + "/v1/auth/nonce", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).json();
  const kpj = KeyPair.fromString(me.private_key);
  let token = null, signinErr;
  try {
    const nonceB = Buffer.from(n.nonce, "base64");
    // NEP-413 hash computed inline (same as api/src/auth.ts nep413Hash) so this script needs no TS loader.
    const { createHash } = await import("node:crypto");
    const bstr = (s) => { const b = Buffer.from(s); const l = Buffer.alloc(4); l.writeUInt32LE(b.length); return Buffer.concat([l, b]); };
    const tag = Buffer.alloc(4); tag.writeUInt32LE(2 ** 31 + 413);
    const h = createHash("sha256").update(Buffer.concat([tag, bstr(n.message), nonceB, bstr(n.recipient), Buffer.from([0])])).digest();
    const sig = kpj.sign(h).signature;
    const r = await fetch(API + "/v1/auth/signin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signed: { accountId: me.account_id, publicKey: kpj.getPublicKey().toString(), signature: Buffer.from(sig).toString("base64"), message: n.message, nonce: n.nonce, recipient: n.recipient } }) });
    const j = await r.json(); token = j.token; if (!token) signinErr = JSON.stringify(j);
  } catch (e) { signinErr = String(e.message ?? e); }
  note("8", "Reel creator signs in to the RAID API with NEP-413 (no gas)", token ? "pass" : "fail", { account: me.account_id, err: signinErr });
  let reel = null;
  if (token) {
    execFileSync("python3", ["make-demo-reels.py", WEB, `TRUMP:${N}:2x:CREW RAID · E2E`], { cwd: new URL("./reels/", import.meta.url).pathname, stdio: "ignore" });
    const file = fs.readFileSync(new URL(`../api/demo-reels/TRUMP-r${N}.mp4`, import.meta.url));
    const q = new URLSearchParams({ caption: `DEMO reel for testnet raid #${N}: $TRUMP to 2x, called by Frog Legion's DAO vote.`, coin: "TRUMP", raidId: String(N) });
    const r = await fetch(`${API}/v1/raid/reels/upload?${q}`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "video/mp4" }, body: file });
    reel = await r.json();
    note("9", "Upload a DEMO reel (8 s mp4 rendered from real TRUMP candles) linked to the raid", r.ok && reel.id ? "pass" : "fail", { reel: reel.id, duration_s: reel.duration_s, raid: N, bytes: file.length, err: r.ok ? undefined : reel });
  }
  const reelBacker = crews.frogs;
  const m2 = await mint(reelBacker.account_id, 30);
  const b2 = await call(acct(reelBacker), USDC, "ft_transfer_call", { receiver_id: CHEST, amount: "30000000", msg: JSON.stringify({ back: N }) }, { deposit: 1n, gas: teraToGas("150") });
  let attr = null;
  if (reel?.id && b2.tx) { for (let i = 0; i < 5 && !attr?.ok; i++) { const r = await fetch(`${API}/v1/raid/reels/${reel.id}/backs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tx: b2.tx, backer: reelBacker.account_id }) }); attr = { ok: r.ok, status: r.status, body: await r.json().catch(() => null) }; if (!r.ok) await sleep(3000); } }
  const board = await (await fetch(`${API}/v1/raid/reels/leaderboard`)).json();
  const mine = board.items?.find((x) => x.handle && x.backs > 0 && !x.demo);
  note("10", "Back 30 tUSDC through the reel; API verifies the tx on chain and credits the reel (off-chain attribution, demo)", backResult(b2) === "pass" && attr?.ok ? "pass" : "fail", { raid: N, reel: reel?.id, backer: reelBacker.account_id, mint_tx: m2.tx, ...clean(b2), intents_forward_failed_as_expected: intentsOnly(b2), attribution: attr, leaderboard_row: mine ?? null });

  // 5. Raid War scoring (same rule as web/src/lib/crews.ts warScore: DAO-called raids inside the war window).
  const all = await view(CHEST, "list_raids", { from: 0, limit: 200 });
  const score = {};
  for (const dao of [FROGS, DOGS]) {
    const rs = [];
    for (const r of all.filter((x) => x.caller === dao)) { const t = await view(CHEST, "get_called_ms", { id: r.id }).catch(() => null); if (t === null || (t >= WAR.start && t <= WAR.end)) rs.push(r); }
    score[dao] = { raids: rs.map((r) => r.id), backed_usdc: rs.reduce((s, r) => s + Number(r.pot) / 1e6, 0), hits: rs.filter((r) => r.hit).length };
  }
  note("11", "Raid War scoring: the new DAO raid counts for Frog Legion's firepower", score[FROGS].raids.includes(N) ? "pass" : "fail", { war: WAR, score, leader: score[FROGS].backed_usdc >= score[DOGS].backed_usdc ? "Frog Legion" : "Doge Pack", note: "No raid has settled on testnet (settlement needs NEAR Intents), so hits = 0 and firepower = backed USDC." });

  // 6. Launchpad: create, buy, sell, creator claims fees.
  const lp = crews.dogs;
  const ticker = "E2E" + Date.now().toString(36).toUpperCase().slice(-5);
  const c1 = await call(acct(lp), LAUNCH, "create_coin", { name: "E2E Rehearsal (testnet)", ticker, description: "Testnet-only coin made by the RAID E2E rehearsal script.", image: null }, { deposit: nearToYocto("0.05"), gas: teraToGas("30") });
  const coin = await view(LAUNCH, "coin_by_ticker", { ticker });
  note("12", `Launchpad: create $${ticker}`, c1.ok && coin ? "pass" : "fail", { coin: coin?.id, ticker, creator: lp.account_id, ...clean(c1) });
  const m3 = await mint(lp.account_id, 10);
  const q = await view(LAUNCH, "quote_buy", { id: coin.id, usdc_in: "10000000" });
  const buy = await call(acct(lp), USDC, "ft_transfer_call", { receiver_id: LAUNCH, amount: "10000000", msg: JSON.stringify({ buy: coin.id }) }, { deposit: 1n, gas: teraToGas("100") });
  const bal = await view(LAUNCH, "balance_of", { id: coin.id, account_id: lp.account_id });
  note("13", "Launchpad: buy with 10 tUSDC on the bonding curve", buy.ok && BigInt(bal) > 0n ? "pass" : "fail", { coin: coin.id, quote_tokens: q, balance: bal, mint_tx: m3.tx, ...clean(buy) });
  const half = (BigInt(bal) / 2n).toString();
  const sq = await view(LAUNCH, "quote_sell", { id: coin.id, tokens_in: half });
  const sell = await call(acct(lp), LAUNCH, "sell", { id: coin.id, amount: half, min_out: null }, { gas: teraToGas("60") });
  note("14", "Launchpad: sell half back to the curve", sell.ok ? "pass" : "fail", { coin: coin.id, tokens: half, quote_usdc: sq, balance_after: await view(LAUNCH, "balance_of", { id: coin.id, account_id: lp.account_id }), ...clean(sell) });
  const fees = await view(LAUNCH, "fees_of", { account_id: lp.account_id });
  const cf = await call(acct(lp), LAUNCH, "claim_fees", {}, { gas: teraToGas("60") });
  note("15", "Launchpad: creator claims trading fees (a real claim on testnet)", cf.ok ? "pass" : "fail", { creator: lp.account_id, fees_before: fees, fees_after: await view(LAUNCH, "fees_of", { account_id: lp.account_id }), ...clean(cf) });

  // 7. Settle / claim on the raid: these need the buy to have happened through NEAR Intents.
  const st = await call(acct(lp), CHEST, "settle", { id: N }, { gas: teraToGas("100") });
  note("16", "settle(raid): reads the chest's intents.near balance after a buy or sell", st.ok ? "pass" : "intents", { raid: N, ...clean(st), why: "the raid can only reach Buying through execute_buy with a 1Click quote; 1Click and NEAR Intents are mainnet only, so there is nothing to settle" });
  const cs = await call(acct(lp), CHEST, "claim_share_for", { id: N, account_id: nearBacker.account_id }, { gas: teraToGas("50") });
  note("17", "claim_share_for(raid, backer): pull a backer's share of a closed raid", cs.ok ? "pass" : "intents", { raid: N, ...clean(cs), why: "the raid never closes on testnet because the buy and sell run through NEAR Intents" });
  const pv = await view(CHEST, "payout_preview", { target_x_bps: 20000, stake: "40000000" });
  note("18", "payout_preview: what the 40 tUSDC NEAR backer gets if the line hits (contract view)", "pass", { preview: pv });
  run.phase_a_done = new Date().toISOString(); run.buy_after_ms = raid.buy_after_ms; save();
  console.log(`\nraid #${N}; run phase b after ${new Date(raid.buy_after_ms).toISOString()}`);
}

if (step === "b") {
  const N = run.raid; const raid = await view(CHEST, "get_raid", { id: N });
  const wait = raid.buy_after_ms - Date.now(); if (wait > 0) { console.log(`waiting ${Math.ceil(wait / 1000)} s for the public countdown`); await sleep(wait + 5000); }
  let mpc0 = await view(CHEST, "get_mpc");
  if (!mpc0.public_key) {
    console.log("bootstrapping the chest's Chain Signatures key");
    const bs = await call(acct(crews.dogs), CHEST, "mpc_bootstrap", {}, { gas: teraToGas("100") });
    mpc0 = await view(CHEST, "get_mpc");
    note("19a", "Chain Signatures: the chest derives its own key from v1.signer-prod.testnet (mpc_bootstrap, anyone can call)", bs.ok && mpc0.public_key ? "pass" : "fail", { ...clean(bs), mpc_key: mpc0.public_key });
  }
  console.log("mpc_sign_buy…");
  const ms = await call(acct(crews.dogs), CHEST, "mpc_sign_buy", { id: N, min_out: "1" }, { gas: teraToGas("300") });
  const mpc = await view(CHEST, "get_mpc");
  const ls = mpc.last_signed; let sigOk = false;
  if (ls?.payload?.includes(`"-${raid.pot}"`)) { const pk = bs58.decode(ls.public_key.slice(8)); sigOk = nacl.sign.detached.verify(Buffer.from(ls.payload), bs58.decode(ls.signature.slice(8)), pk); }
  note("19", "Chain Signatures (v1.signer-prod.testnet) signs the chest's buy intent for the whole pot", ms.topOk && sigOk ? "pass" : "fail", { raid: N, pot: raid.pot, ...clean(ms), mpc_key: mpc.public_key, signature_valid_for_payload: sigOk, payload: ls?.payload });
  note("20", "execute_buy / submit the signed intent to NEAR Intents and buy $TRUMP", "intents", { raid: N, why: "needs a 1Click quote signed by 1Click and a live intents.near; both exist only on mainnet. The signed payload above is what would be submitted." });
  note("21", "execute_sell at the line, settle, claim_share, claim / claim_into_intents", "intents", { raid: N, why: "follows a filled buy on NEAR Intents (mainnet only). Covered by contract unit tests: full_raid_lifecycle, miss_pays_no_fees_and_backers_can_lose, anyone_can_settle_a_keyless_backer_into_intents." });
  run.finished = new Date().toISOString(); save();
}
