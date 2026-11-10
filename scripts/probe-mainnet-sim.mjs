// Redeploys the chest code on testnet, has MPC sign a probe intent for the MAINNET verifier,
// then runs intents.near `simulate_intents` (a free view call, no transaction, no funds) on mainnet.
import { Account, JsonRpcProvider, teraToGas } from "near-api-js";
import fs from "node:fs";
const S = JSON.parse(fs.readFileSync(new URL("../secrets/testnet.json", import.meta.url)));
const t = new JsonRpcProvider({ url: "https://rpc.testnet.fastnear.com" });
const m = new JsonRpcProvider({ url: "https://rpc.mainnet.fastnear.com" });
const me = new Account(S.account_id, t, S.private_key);
const out = {};
out.redeploy = (await me.deployContract(fs.readFileSync("../contracts/target/near/raid_chest/raid_chest.wasm"))).transaction_outcome.id;
const salt = await m.callFunction({ contractId: "intents.near", method: "current_salt", args: {} });
out.salt = salt;
out.probe_tx = (await me.callFunctionRaw({ contractId: S.account_id, methodName: "mpc_sign_probe", args: { verifying_contract: "intents.near", salt_hex: salt }, gas: teraToGas("300") })).transaction_outcome.id;
const st = await t.callFunction({ contractId: S.account_id, method: "get_mpc", args: {} });
const signed = { standard: "raw_ed25519", payload: st.last_signed.payload, public_key: st.last_signed.public_key, signature: st.last_signed.signature };
out.signed = signed;
try {
  out.simulate = await m.callFunction({ contractId: "intents.near", method: "simulate_intents", args: { signed: [signed] } });
} catch (e) { out.simulate_error = String(e.message || e).slice(0, 600); }
// control: same payload, signature flipped -> must fail on signature
const bad = { ...signed, signature: "ed25519:" + "1".repeat(20) + signed.signature.slice(28) };
try { out.control_bad_sig = await m.callFunction({ contractId: "intents.near", method: "simulate_intents", args: { signed: [bad] } }); }
catch (e) { out.control_bad_sig_error = String(e.message || e).slice(0, 400); }
fs.writeFileSync("probe-mainnet-sim.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
