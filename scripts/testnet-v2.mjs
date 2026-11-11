// RAID v2 testnet run: redeploy the chest with the honest fee split, public countdown and size caps,
// deploy the lean launchpad, then sign the same call/back/create/buy/sell transactions the web app builds.
// Testnet only. Secrets are read from ../secrets/testnet.json and never printed.
import { Account, JsonRpcProvider, KeyPair, teraToGas, nearToYocto } from "near-api-js";
import { createHash } from "node:crypto";
import fs from "node:fs";
const S = JSON.parse(fs.readFileSync(new URL("../secrets/testnet.json", import.meta.url)));
if (S.network !== "testnet" || !S.account_id.endsWith(".testnet")) throw new Error("testnet only");
const provider = new JsonRpcProvider({ url: "https://rpc.testnet.fastnear.com" });
const CHEST = S.account_id;
const USDC = `tusdc.${S.account_id}`;
const LAUNCH = `launch.${S.account_id}`;
const BACKER = `backer.${S.account_id}`;
const me = new Account(CHEST, provider, S.private_key);
const launch = new Account(LAUNCH, provider, S.private_key);
const backer = new Account(BACKER, provider, S.private_key);
const out = fs.existsSync("testnet-v2-run.json") ? JSON.parse(fs.readFileSync("testnet-v2-run.json")) : [];
const note = (step, v) => { out.push({ step, at: new Date().toISOString(), ...v }); console.log(step, JSON.stringify(v)); fs.writeFileSync("testnet-v2-run.json", JSON.stringify(out, null, 2)); };
const txh = (o) => o?.transaction_outcome?.id || o?.transaction?.hash;
const view = (contractId, method, args = {}) => provider.callFunction({ contractId, method, args });
const call = async (acct, contractId, methodName, args, opts = {}) => {
  const r = await acct.callFunctionRaw({ contractId, methodName, args, gas: opts.gas ?? teraToGas("100"), deposit: opts.deposit ?? 0n });
  const fail = JSON.stringify(r?.status ?? {}).includes("Failure") || (r?.receipts_outcome ?? []).some((x) => JSON.stringify(x.outcome.status).includes("Failure"));
  return { tx: txh(r), ok: !fail, logs: (r?.receipts_outcome ?? []).flatMap((x) => x.outcome.logs).filter((l) => l.startsWith("EVENT_JSON")).map((l) => JSON.parse(l.slice(11)).event) };
};
const CFG = {
  intents: `intents-not-on-testnet.${CHEST}`, usdc: USDC, mpc: "v1.signer-prod.testnet",
  oneclick_key: "ed25519:reYaWhvwu8Jzo3WUM3zhn6VrhuMEF4eADL17qtRVifc",
  caller_fee_bps: 250, buyback_bps: 750, min_back: "100000", max_back: "250000000", max_pot: "1000000000",
  min_open_minutes: 10, buy_delay_minutes: 10,
};
const step = process.argv[2] || "all";

if (step === "all" || step === "deploy") {
  note("deploy chest v2", { tx: txh(await me.deployContract(fs.readFileSync("../contracts/target/near/raid_chest/raid_chest.wasm"))) });
  note("migrate_v2 (fresh state, new rules)", await call(me, CHEST, "migrate_v2", { cfg: CFG }));
  if (!(await provider.viewAccount({ accountId: LAUNCH }).catch(() => null))) {
    const c = await me.createSubAccount({ accountOrPrefix: "launch", publicKey: S.public_key, nearToTransfer: nearToYocto("2.4") }).catch((e) => ({ err: e.message }));
    note("create launch account", { tx: txh(c), err: c.err });
  }
  note("deploy launchpad", { tx: txh(await launch.deployContract(fs.readFileSync("../contracts/target/near/raid_launchpad/raid_launchpad.wasm"))) });
  note("init launchpad", await call(launch, LAUNCH, "new", { usdc: USDC, virtual_usdc: "300000000" }));
  note("deploy tusdc fix", { tx: txh(await new Account(USDC, provider, S.private_key).deployContract(fs.readFileSync("../contracts/target/near/test_usdc/test_usdc.wasm"))) });
}
if (step === "all" || step === "flows") {
  // Exactly the payloads web/src/lib/raid.ts tx.callRaid / tx.back build.
  const target = "nep141:eth-0x6982508145454ce325ddbe47a25d4ec3d2311933.omft.near";
  const id = (await view(CHEST, "list_raids", { from: 0, limit: 100 })).length;
  note("call_raid (web tx.callRaid)", { id, ...(await call(me, CHEST, "call_raid", { title: "Raid $PEPE to 1.5x", target, target_x_bps: 15000, open_minutes: 1440, retreat_hours: 72 }, { gas: teraToGas("30") })) });
  note("mint 300 tUSDC to backer (owner mint, testnet)", await call(me, USDC, "mint", { account_id: BACKER, amount: "300000000" }));
  note("back 5 tUSDC (web tx.back)", await call(backer, USDC, "ft_transfer_call", { receiver_id: CHEST, amount: "5000000", msg: JSON.stringify({ back: id }) }, { deposit: 1n, gas: teraToGas("150") }));
  note("back 260 tUSDC: per-backer cap 250 -> 15 refunded", await call(backer, USDC, "ft_transfer_call", { receiver_id: CHEST, amount: "260000000", msg: JSON.stringify({ back: id }) }, { deposit: 1n, gas: teraToGas("150") }));
  note("stake after caps", { stake: await view(CHEST, "get_stake", { id, account_id: BACKER }), raid: await view(CHEST, "get_raid", { id }) });
  note("payout_preview 1.5x / 100 tUSDC", { v: await view(CHEST, "payout_preview", { target_x_bps: 15000, stake: "100000000" }) });
  // a second raid on DOGE at 2x so the feed has more than one
  note("call_raid DOGE 2x", await call(me, CHEST, "call_raid", { title: "Raid $DOGE to 2x", target: "nep141:doge.omft.near", target_x_bps: 20000, open_minutes: 720, retreat_hours: 168 }, { gas: teraToGas("30") }));
}
if (step === "all" || step === "launch") {
  const n = (await view(LAUNCH, "list_coins", {})).length;
  const ticker = n === 0 ? "RFROG" : `RFROG${n}`;
  note("create_coin (web Launchpad)", await call(backer, LAUNCH, "create_coin", { name: "Raid Frog (testnet)", ticker, description: "Testnet demo coin made by the RAID test run.", image: null }, { deposit: nearToYocto("0.05"), gas: teraToGas("30") }));
  const c = await view(LAUNCH, "coin_by_ticker", { ticker });
  const q = await view(LAUNCH, "quote_buy", { id: c.id, usdc_in: "20000000" });
  note("buy 20 tUSDC on the curve", { quote: q, ...(await call(backer, USDC, "ft_transfer_call", { receiver_id: LAUNCH, amount: "20000000", msg: JSON.stringify({ buy: c.id, min_out: String(BigInt(q) * 99n / 100n) }) }, { deposit: 1n, gas: teraToGas("100") })) });
  const bal = await view(LAUNCH, "balance_of", { id: c.id, account_id: BACKER });
  const half = String(BigInt(bal) / 2n);
  note("sell half back", { quote: await view(LAUNCH, "quote_sell", { id: c.id, tokens_in: half }), ...(await call(backer, LAUNCH, "sell", { id: c.id, amount: half, min_out: null }, { gas: teraToGas("60") })) });
  note("coin state", { coin: await view(LAUNCH, "get_coin", { id: c.id }), creator_fees: await view(LAUNCH, "fees_of", { account_id: BACKER }) });
}
if (step === "upgrade") {
  // code-only upgrade (state layout unchanged)
  note("upgrade chest code: bridged backing", { tx: txh(await me.deployContract(fs.readFileSync("../contracts/target/near/raid_chest/raid_chest.wasm"))) });
}
if (step === "bridged") {
  // Simulates what 1Click does on mainnet: an outside account delivers USDC with customRecipientMsg {"back": id, "for": beneficiary}.
  note("mint 20 tUSDC to a stand-in bridge account", await call(me, USDC, "mint", { account_id: LAUNCH, amount: "20000000" }));
  note("bridged back 20 tUSDC for backer on raid 1", await call(launch, USDC, "ft_transfer_call", { receiver_id: CHEST, amount: "20000000", msg: JSON.stringify({ back: 1, for: BACKER }) }, { deposit: 1n, gas: teraToGas("150") }));
  note("beneficiary stake on raid 1", { stake: await view(CHEST, "get_stake", { id: 1, account_id: BACKER }), bridge_stake: await view(CHEST, "get_stake", { id: 1, account_id: LAUNCH }) });
}

if (step === "ui") {
  // The call and back flows as a normal (non-owner) user would sign them from the web wallet: the exact WalletCall
  // objects web/src/lib/raid.ts tx.callRaid / tx.back build with the composer defaults, then NEP-413 social sign-in.
  const id = (await view(CHEST, "list_raids", { from: 0, limit: 100 })).length;
  const callRaid = { receiverId: CHEST, method: "call_raid", args: { title: "Raid $BRETT to 2x", target: "nep141:base-0x532f27101965dd16442e59d40670faf5ebb142e4.omft.near", target_x_bps: 20000, open_minutes: 60, retreat_hours: 72 }, deposit: "0", gas: "30000000000000" };
  const back = { receiverId: USDC, method: "ft_transfer_call", args: { receiver_id: CHEST, amount: "5000000", msg: JSON.stringify({ back: id }) }, deposit: "1", gas: "150000000000000" };
  const sign = (w) => call(backer, w.receiverId, w.method, w.args, { deposit: BigInt(w.deposit), gas: BigInt(w.gas) });
  note("ui: call_raid by a non-owner caller (tx.callRaid)", { id, ...(await sign(callRaid)) });
  note("ui: back 5 tUSDC (tx.back)", await sign(back));
  note("ui: raid + stake", { raid: await view(CHEST, "get_raid", { id }), stake: await view(CHEST, "get_stake", { id, account_id: BACKER }) });
  // NEP-413 sign-in against the local social API (http://localhost:8787), same payload wallet-selector signMessage produces.
  const API = process.env.RAID_API || "http://localhost:8787";
  const n = await (await fetch(API + "/v1/auth/nonce", { method: "POST" })).json();
  const str = (x) => { const b = Buffer.from(x, "utf8"); const l = Buffer.alloc(4); l.writeUInt32LE(b.length); return Buffer.concat([l, b]); };
  const tag = Buffer.alloc(4); tag.writeUInt32LE(2147484061);
  const hash = createHash("sha256").update(Buffer.concat([tag, str(n.message), Buffer.from(n.nonce, "base64"), str(n.recipient), Buffer.from([0])])).digest();
  const kp = KeyPair.fromString(S.private_key);
  const sig = kp.sign(hash);
  const signed = { accountId: BACKER, publicKey: kp.getPublicKey().toString(), signature: Buffer.from(sig.signature).toString("base64"), message: n.message, nonce: n.nonce, recipient: n.recipient };
  const r = await fetch(API + "/v1/auth/signin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signed }) });
  const j = await r.json(); const token = j.token ?? j.jwt;
  note("ui: NEP-413 sign-in to social API", { status: r.status, handle: j.user?.handle ?? null, token: token ? "(issued, not logged)" : null });
  if (token) {
    const p = await fetch(API + "/v1/raid/posts", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ body: `Testnet check: called $BRETT to 2x and backed 5 tUSDC from the same payloads the app signs.`, raidId: id, coin: "BRETT" }) });
    note("ui: post on the new raid", { status: p.status, id: (await p.json()).id ?? null });
  }
}
