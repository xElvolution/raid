// Testnet run of the RAID chest. NEAR Intents has no testnet (HACKATHON.md Q-007), so this covers:
//  1. deploy chest + test USDC, 2. call + back a raid, 3. verify a REAL 1Click quote signature on-chain,
//  4. Chain Signatures: derive the chest's MPC EdDSA key and have MPC sign a raw_ed25519 token_diff intent the contract built,
//     then verify that signature off-chain exactly as intents.near would (ed25519 over the payload bytes).
import { Account, JsonRpcProvider, teraToGas, nearToYocto } from "near-api-js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import fs from "node:fs";
const S = JSON.parse(fs.readFileSync(new URL("../secrets/testnet.json", import.meta.url)));
const provider = new JsonRpcProvider({ url: "https://rpc.testnet.fastnear.com" });
const me = new Account(S.account_id, provider, S.private_key);
const usdcId = `tusdc.${S.account_id}`;
const usdc = new Account(usdcId, provider, S.private_key);
const log = [];
const note = (k, v) => { log.push({ step: k, ...v }); console.log(k, JSON.stringify(v)); };
const tx = (o) => o?.transaction_outcome?.id || o?.transaction?.hash;
const view = (contractId, method, args = {}) => provider.callFunction({ contractId, method, args });
const step = process.argv[2] || "all";

if (step === "all" || step === "deploy") {
  const sub = await me.createSubAccount({ accountOrPrefix: "tusdc", publicKey: S.public_key, nearToTransfer: nearToYocto("2") }).catch(e => ({ err: e.message }));
  note("create tusdc", { tx: tx(sub), err: sub.err });
  note("deploy tusdc", { tx: tx(await usdc.deployContract(fs.readFileSync("../contracts/target/near/test_usdc/test_usdc.wasm"))) });
  note("init tusdc", { tx: tx(await usdc.callFunctionRaw({ contractId: usdcId, methodName: "new", args: { owner: S.account_id } })) });
  note("deploy chest", { tx: tx(await me.deployContract(fs.readFileSync("../contracts/target/near/raid_chest/raid_chest.wasm"))) });
  note("init chest", { tx: tx(await me.callFunctionRaw({ contractId: S.account_id, methodName: "new", args: { cfg: {
    intents: `intents-not-on-testnet.${S.account_id}`, usdc: usdcId, mpc: "v1.signer-prod.testnet",
    oneclick_key: "ed25519:reYaWhvwu8Jzo3WUM3zhn6VrhuMEF4eADL17qtRVifc", caller_fee_bps: 500, buyback_bps: 2000, min_back: "100000" } } })) });
}
if (step === "all" || step === "raid") {
  const backerId = `backer.${S.account_id}`;
  const backer = new Account(backerId, provider, S.private_key);
  if (!(await provider.viewAccount?.({ accountId: backerId }).catch(() => null))) {
    const c = await me.createSubAccount({ accountOrPrefix: "backer", publicKey: S.public_key, nearToTransfer: nearToYocto("0.5") }).catch(e => ({ err: e.message }));
    note("create backer", { tx: tx(c), err: c.err });
  }
  if (!(await view(S.account_id, "get_raid", { id: 0 }))) note("call_raid", { tx: tx(await me.callFunctionRaw({ contractId: S.account_id, methodName: "call_raid", args: { title: "Raid PEPE on Ethereum", target: "nep141:eth-0x6982508145454ce325ddbe47a25d4ec3d2311933.omft.near", target_x_bps: 15000, open_minutes: 60, retreat_hours: 24 } })) });
  note("faucet (backer)", { tx: tx(await backer.callFunctionRaw({ contractId: usdcId, methodName: "faucet", args: {} })) });
  note("backer backs raid 0 with 5 tUSDC", { tx: tx(await backer.callFunctionRaw({ contractId: usdcId, methodName: "ft_transfer_call", args: { receiver_id: S.account_id, amount: "5000000", msg: JSON.stringify({ back: 0 }) }, deposit: 1n, gas: teraToGas("150") })) });
  note("raid 0", await view(S.account_id, "get_raid", { id: 0 }));
}
if (step === "all" || step === "quote") {
  const f = JSON.parse(fs.readFileSync("../contracts/raid-chest/tests/fixtures/quote-dry.json"));
  note("on-chain verify of real 1Click signature", { result: await view(S.account_id, "verify_oneclick_signature", { signed_json: f.signed_json, signature: f.signature }) });
  note("tampered quote rejected", { result: await view(S.account_id, "verify_oneclick_signature", { signed_json: f.signed_json.replace('"amount":"1000000"', '"amount":"9000000"'), signature: f.signature }) });
}
if (step === "all" || step === "mpc") {
  const b = await me.callFunctionRaw({ contractId: S.account_id, methodName: "mpc_bootstrap", args: {}, gas: teraToGas("100") });
  note("mpc_bootstrap", { tx: tx(b) });
  const direct = await view("v1.signer-prod.testnet", "derived_public_key", { path: "raid-chest", predecessor: S.account_id, domain_id: 1 });
  note("derived key (direct view)", { key: direct });
  const s = await me.callFunctionRaw({ contractId: S.account_id, methodName: "mpc_sign_buy", args: { id: 0, min_out: "900000000000000000000000" }, gas: teraToGas("300") });
  note("mpc_sign_buy", { tx: tx(s) });
  const m = await view(S.account_id, "get_mpc");
  note("chest mpc state", m);
  const si = m.last_signed;
  const ok = si && nacl.sign.detached.verify(new TextEncoder().encode(si.payload), bs58.decode(si.signature.slice(8)), bs58.decode(si.public_key.slice(8)));
  note("raw_ed25519 signature valid for payload (intents.near rule)", { ok, key_matches_direct_view: si?.public_key === direct });
}
fs.writeFileSync(`testnet-run-${step}.json`, JSON.stringify(log, null, 2));
