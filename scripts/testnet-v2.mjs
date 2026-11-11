// RAID v2 testnet run: redeploy the chest with the honest fee split, public countdown and size caps,
// deploy the lean launchpad, then sign the same call/back/create/buy/sell transactions the web app builds.
// Testnet only. Secrets are read from ../secrets/testnet.json and never printed.
import { Account, JsonRpcProvider, teraToGas, nearToYocto } from "near-api-js";
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
