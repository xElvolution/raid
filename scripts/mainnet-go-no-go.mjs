// RAID go/no-go on NEAR MAINNET. Spends real money. Nothing runs without --i-confirm-mainnet.
//
// Stage A (no contract, ~$1): the test account deposits ~$1 of wNEAR (or USDC) into intents.near, takes a
//   signed 1Click quote (depositType INTENTS -> recipient INTENTS = itself), checks 1Click's signature and the
//   price, then mt_transfers the input to the quote's deposit account. PEPE should land in its intents balance.
// Stage B (contract): deploys the RAID chest to the same account, creates a backer account, backs a raid,
//   and lets the CONTRACT execute the buy from a signed 1Click quote (execute_buy -> mt_transfer), then settle().
//
// Usage:
//   node mainnet-go-no-go.mjs check                       # read-only: balances, salt, a dry quote
//   node mainnet-go-no-go.mjs A --i-confirm-mainnet [--base=wnear|usdc] [--usd=1]
//   node mainnet-go-no-go.mjs B --i-confirm-mainnet [--base=wnear|usdc] [--usd=1]
import { Account, JsonRpcProvider, KeyPair, keyToImplicitAddress, teraToGas, nearToYocto, yoctoToNear } from "near-api-js";
import { verifyQuoteSignature } from "@defuse-protocol/one-click-sdk-typescript";
import stringify from "json-stable-stringify";
import fs from "node:fs";

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || "").split("=")[1] || d;
const stage = process.argv[2] || "check";
const CONFIRMED = process.argv.includes("--i-confirm-mainnet");
const BASE = arg("base", "wnear");
const USD = Number(arg("usd", "1"));
if (USD > 2) throw new Error("cap: this go/no-go never spends more than $2 per swap");

const SECRETS = new URL("../secrets/", import.meta.url).pathname;
const S = JSON.parse(fs.readFileSync(SECRETS + "mainnet-test.json"));
const provider = new JsonRpcProvider({ url: "https://rpc.mainnet.fastnear.com" });
const me = new Account(S.account_id, provider, S.private_key);
const INTENTS = "intents.near";
const ASSETS = {
  wnear: { contract: "wrap.near", id: "nep141:wrap.near", decimals: 24 },
  usdc: { contract: "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1", id: "nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1", decimals: 6 },
};
const PEPE = "nep141:eth-0x6982508145454ce325ddbe47a25d4ec3d2311933.omft.near";
const base = ASSETS[BASE];
const report = { stage, base: BASE, account: S.account_id, at: new Date().toISOString(), steps: [] };
const note = (k, v = {}) => { report.steps.push({ step: k, ...v }); console.log(`- ${k}`, JSON.stringify(v)); };
const save = () => fs.writeFileSync(`go-no-go-${stage}-${Date.now()}.json`, JSON.stringify(report, null, 2));
const txid = o => o?.transaction_outcome?.id;
const view = (c, m, a = {}) => provider.callFunction({ contractId: c, method: m, args: a });

async function prices() {
  const t = await (await fetch("https://1click.chaindefuser.com/v0/tokens")).json();
  return Object.fromEntries(t.map(x => [x.assetId, x]));
}
async function quote({ dry, origin, dest, amount, who }) {
  const body = { dry, swapType: "EXACT_INPUT", slippageTolerance: 100, originAsset: origin, depositType: "INTENTS", destinationAsset: dest,
    amount, refundTo: who, refundType: "INTENTS", recipient: who, recipientType: "INTENTS", deadline: new Date(Date.now() + 10 * 60e3).toISOString() };
  const r = await fetch("https://1click.chaindefuser.com/v0/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const q = await r.json();
  if (!r.ok) throw new Error(`quote ${r.status}: ${JSON.stringify(q)}`);
  if (!verifyQuoteSignature(q)) throw new Error("1Click quote signature did not verify; aborting");
  return q;
}
// exact string 1Click signed (see contracts/raid-chest/src/rules.rs)
function signedString(q) {
  const pick = (o, ks) => Object.fromEntries(ks.map(k => [k, o[k] || undefined]));
  const req = pick(q.quoteRequest, ["swapType","originAsset","depositType","destinationAsset","amount","refundTo","refundType","recipient","recipientType","deadline","quoteWaitingTimeMs","referral","virtualChainRecipient","virtualChainRefundRecipient","customRecipientMsg"]);
  req.dry = q.quoteRequest.dry; req.slippageTolerance = q.quoteRequest.slippageTolerance;
  const qk = ["amountIn","amountInFormatted","amountInUsd","minAmountIn","amountOut","amountOutFormatted","amountOutUsd","minAmountOut","depositAddress","depositMemo","deadline","timeWhenInactive","timeEstimate","refundFee","withdrawFee"];
  return stringify({ ...req, ...pick(q.quote, qk), timestamp: q.timestamp });
}
async function waitStatus(depositAddress) {
  for (let i = 0; i < 40; i++) {
    const s = await (await fetch(`https://1click.chaindefuser.com/v0/status?depositAddress=${depositAddress}`)).json();
    note("status", { status: s.status });
    if (["SUCCESS", "REFUNDED", "FAILED"].includes(s.status)) return s;
    await new Promise(r => setTimeout(r, 15000));
  }
  return { status: "TIMEOUT" };
}
async function amountForUsd() {
  const p = await prices();
  const price = p[base.id].price;
  const units = BigInt(Math.floor((USD / price) * 10 ** Math.min(base.decimals, 12))) * 10n ** BigInt(Math.max(base.decimals - 12, 0));
  return units.toString();
}
async function fundIntents(acct, amount) {
  if (BASE === "wnear") {
    const reg = await view("wrap.near", "storage_balance_of", { account_id: acct.accountId });
    if (!reg) note("wrap storage_deposit", { tx: txid(await acct.callFunctionRaw({ contractId: "wrap.near", methodName: "storage_deposit", args: { account_id: acct.accountId }, deposit: nearToYocto("0.00125") })) });
    note("wrap NEAR", { tx: txid(await acct.callFunctionRaw({ contractId: "wrap.near", methodName: "near_deposit", args: {}, deposit: BigInt(amount) })) });
  }
}

if (stage === "check") {
  const st = await provider.viewAccount?.({ accountId: S.account_id }).catch(() => null) ?? await me.getState().catch(() => null);
  note("account", { id: S.account_id, state: st ? { amount_near: yoctoToNear(st.amount ?? st.balance?.total ?? 0) } : "does not exist yet (send NEAR to create it)" });
  note("intents salt", { salt: await view(INTENTS, "current_salt") });
  const amt = await amountForUsd();
  const q = await quote({ dry: true, origin: base.id, dest: PEPE, amount: amt, who: S.account_id });
  note("dry quote", { amountIn: q.quote.amountIn, amountInUsd: q.quote.amountInUsd, amountOut: q.quote.amountOut, amountOutUsd: q.quote.amountOutUsd, minAmountOut: q.quote.minAmountOut, sig_ok: true });
  save(); process.exit(0);
}
if (!CONFIRMED) { console.log("Refusing: add --i-confirm-mainnet only after the human said yes."); process.exit(1); }

const amount = await amountForUsd();
if (stage === "A") {
  await fundIntents(me, amount);
  note("deposit to intents", { tx: txid(await me.callFunctionRaw({ contractId: base.contract, methodName: "ft_transfer_call", args: { receiver_id: INTENTS, amount, msg: "" }, deposit: 1n, gas: teraToGas("100") })) });
  const q = await quote({ dry: false, origin: base.id, dest: PEPE, amount, who: S.account_id });
  if (Number(q.quote.amountOutUsd) < 0.9 * Number(q.quote.amountInUsd)) throw new Error("price worse than 10% slippage; aborting");
  note("live quote", { depositAddress: q.quote.depositAddress, amountOut: q.quote.amountOut, minAmountOut: q.quote.minAmountOut });
  note("mt_transfer into quote", { tx: txid(await me.callFunctionRaw({ contractId: INTENTS, methodName: "mt_transfer", args: { receiver_id: q.quote.depositAddress, token_id: base.id, amount }, deposit: 1n, gas: teraToGas("50") })) });
  const s = await waitStatus(q.quote.depositAddress);
  note("PEPE in intents", { balance: await view(INTENTS, "mt_balance_of", { account_id: S.account_id, token_id: PEPE }), verdict: s.status === "SUCCESS" ? "GO" : "NO-GO" });
}
if (stage === "B") {
  if (BASE !== "wnear") throw new Error("stage B funds the backer with NEAR; run it with --base=wnear");
  // contract account = this test account; backer = fresh implicit account funded from it
  const wasm = fs.readFileSync(new URL("../contracts/target/near/raid_chest/raid_chest.wasm", import.meta.url));
  if (!fs.existsSync(SECRETS + "mainnet-backer.json")) {
    const kp = KeyPair.fromRandom("ed25519"); const pk = kp.getPublicKey().toString();
    fs.writeFileSync(SECRETS + "mainnet-backer.json", JSON.stringify({ account_id: keyToImplicitAddress(pk), public_key: pk, private_key: kp.toString() }), { mode: 0o600 });
  }
  const B = JSON.parse(fs.readFileSync(SECRETS + "mainnet-backer.json"));
  const backer = new Account(B.account_id, provider, B.private_key);
  note("fund backer", { backer: B.account_id, tx: txid(await me.transfer({ receiverId: B.account_id, amount: BigInt(amount) + nearToYocto("0.1") })) });
  note("deploy chest", { tx: txid(await me.deployContract(wasm)) });
  note("init chest", { tx: txid(await me.callFunctionRaw({ contractId: S.account_id, methodName: "new", args: { cfg: { intents: INTENTS, usdc: base.contract, mpc: "v1.signer",
    oneclick_key: "ed25519:reYaWhvwu8Jzo3WUM3zhn6VrhuMEF4eADL17qtRVifc", caller_fee_bps: 500, buyback_bps: 2000, min_back: "1" } } })) });
  note("call_raid", { tx: txid(await backer.callFunctionRaw({ contractId: S.account_id, methodName: "call_raid", args: { title: "Go/no-go: raid PEPE", target: PEPE, target_x_bps: 15000, open_minutes: 1, retreat_hours: 1 } })) });
  // chest must be registered on the base token to receive it
  if (!(await view(base.contract, "storage_balance_of", { account_id: S.account_id }))) note("chest storage", { tx: txid(await me.callFunctionRaw({ contractId: base.contract, methodName: "storage_deposit", args: { account_id: S.account_id }, deposit: nearToYocto("0.00125") })) });
  await fundIntents(backer, amount);
  note("back raid 0", { tx: txid(await backer.callFunctionRaw({ contractId: base.contract, methodName: "ft_transfer_call", args: { receiver_id: S.account_id, amount, msg: JSON.stringify({ back: 0 }) }, deposit: 1n, gas: teraToGas("150") })) });
  const q = await quote({ dry: false, origin: base.id, dest: PEPE, amount, who: S.account_id });
  const sj = signedString(q);
  note("contract check_quote", await view(S.account_id, "check_quote", { signed_json: sj, signature: q.signature, origin: base.id, destination: PEPE, amount_in: amount, min_out_floor: "1" }));
  note("execute_buy (contract moves funds, keeper only relays)", { tx: txid(await backer.callFunctionRaw({ contractId: S.account_id, methodName: "execute_buy", args: { id: 0, signed_json: sj, signature: q.signature }, gas: teraToGas("100") })) });
  const s = await waitStatus(q.quote.depositAddress);
  note("settle", { tx: txid(await backer.callFunctionRaw({ contractId: S.account_id, methodName: "settle", args: { id: 0 }, gas: teraToGas("60") })) });
  note("raid 0", { raid: await view(S.account_id, "get_raid", { id: 0 }), verdict: s.status === "SUCCESS" ? "GO" : "NO-GO" });
}
save();
