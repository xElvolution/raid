// Creates (1) a mainnet implicit account key (no tx needed) and (2) a testnet named account via the public faucet helper.
// Private keys are written ONLY to ../secrets/*.json (chmod 600). Nothing secret is printed.
import { KeyPair, keyToImplicitAddress } from "near-api-js";
import fs from "node:fs";
const dir = new URL("../secrets/", import.meta.url).pathname;
function save(name, obj) { const p = dir + name; fs.writeFileSync(p, JSON.stringify(obj, null, 2), { mode: 0o600 }); fs.chmodSync(p, 0o600); }
if (!fs.existsSync(dir + "mainnet-test.json")) {
  const kp = KeyPair.fromRandom("ed25519");
  const pk = kp.getPublicKey().toString();
  const id = keyToImplicitAddress(pk);
  save("mainnet-test.json", { network: "mainnet", account_id: id, public_key: pk, private_key: kp.toString() });
}
if (!fs.existsSync(dir + "testnet.json")) {
  const kp = KeyPair.fromRandom("ed25519");
  const pk = kp.getPublicKey().toString();
  const id = `raid-chest-${Date.now().toString(36)}.testnet`;
  const r = await fetch("https://helper.testnet.near.org/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newAccountId: id, newAccountPublicKey: pk }) });
  console.log("faucet status", r.status, (await r.text()).slice(0, 200));
  if (r.ok) save("testnet.json", { network: "testnet", account_id: id, public_key: pk, private_key: kp.toString() });
}
for (const f of ["mainnet-test.json", "testnet.json"]) if (fs.existsSync(dir + f)) { const j = JSON.parse(fs.readFileSync(dir + f)); console.log(j.network, j.account_id, j.public_key); }
