// Proof for "back a raid from Phantom / MetaMask with no NEAR account". TESTNET txs + MAINNET read-only views only.
// 1) Throwaway EVM and Solana-style keys (generated here, never funded, discarded) sign the exact back intent the web
//    app builds; the web route /api/keyless/verify checks them locally and with intents.near simulate_intents on mainnet.
// 2) On testnet, a stand-in bridge delivers tUSDC with {"back", "for": <intents account>} and the chest lists the
//    0x / 64-hex accounts as backers (get_backers). No secrets printed.
import { Account, JsonRpcProvider, teraToGas } from "near-api-js";
import { createRequire } from "node:module";
import nacl from "tweetnacl";
import bs58 from "bs58";
import fs from "node:fs";
const req = createRequire(new URL("../../web/package.json", import.meta.url));
const { Wallet, hexlify, toUtf8Bytes } = req("ethers");
const WEB = process.env.RAID_WEB || "http://localhost:3410";
const OUT = new URL("./keyless-run.json", import.meta.url).pathname;
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT)) : [];
const note = (step, v) => { out.push({ step, at: new Date().toISOString(), ...v }); console.log(step, JSON.stringify(v).slice(0, 300)); fs.writeFileSync(OUT, JSON.stringify(out, null, 2)); };
const step = process.argv[2] || "sign";
const USDC = "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";
const STANDIN_CHEST = "intents.near"; // no mainnet chest yet; same stand-in the dry 1Click quotes use
const nonce = (salt) => { const n = new Uint8Array(32); n.set(Buffer.from(salt, "hex").subarray(0, 4)); n.set(nacl.randomBytes(28), 4); return Buffer.from(n).toString("base64"); };
const payload = (signer, raidId, amount, salt) => JSON.stringify({ signer_id: signer, verifying_contract: "intents.near", deadline: new Date(Date.now() + 10 * 60_000).toISOString(), nonce: nonce(salt),
  intents: [{ intent: "ft_withdraw", token: USDC, receiver_id: STANDIN_CHEST, amount, msg: JSON.stringify({ back: raidId, for: signer }) }] });
const verify = async (signed) => (await fetch(WEB + "/api/keyless/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signed }) })).json();

if (step === "sign") {
  const { salt } = await (await fetch(WEB + "/api/keyless/salt")).json();
  // MetaMask path: ERC-191 personal_sign, v normalised to 0/1
  const w = Wallet.createRandom();
  const evm = w.address.toLowerCase();
  const p1 = payload(evm, 7, "5000000", salt);
  const raw = Buffer.from((await w.signMessage(p1)).slice(2), "hex"); raw[64] -= 27;
  const s1 = { standard: "erc191", payload: p1, signature: "secp256k1:" + bs58.encode(raw) };
  const v1 = await verify(s1);
  note("metamask (erc191): throwaway key signs back intent, verified", { signer: evm, salt, local: v1.local, verifier: v1.verifier });
  const t1 = { ...s1, payload: s1.payload.replace('"5000000"', '"9000000"') };
  const vt1 = await verify(t1);
  note("metamask control: amount changed after signing", { local: vt1.local, verifier: vt1.verifier });
  // Phantom path: raw Ed25519 signMessage over the payload bytes; account = hex of the 32-byte address
  const kp = nacl.sign.keyPair();
  const solAddr = bs58.encode(kp.publicKey); const solAcct = Buffer.from(kp.publicKey).toString("hex");
  const p2 = payload(solAcct, 7, "5000000", salt);
  const s2 = { standard: "raw_ed25519", payload: p2, public_key: "ed25519:" + solAddr, signature: "ed25519:" + bs58.encode(nacl.sign.detached(Buffer.from(p2), kp.secretKey)) };
  const v2 = await verify(s2);
  note("phantom (raw_ed25519): throwaway key signs back intent, verified", { solana_address: solAddr, signer: solAcct, local: v2.local, verifier: v2.verifier });
  const t2 = { ...s2, payload: s2.payload.replace(`"for\\":\\"${solAcct}`, `"for\\":\\"${"ab".repeat(32)}`) };
  const vt2 = await verify(t2);
  note("phantom control: beneficiary swapped after signing", { local: vt2.local, verifier: vt2.verifier });
  fs.writeFileSync(new URL("./keyless-accounts.json", import.meta.url), JSON.stringify({ note: "public ids of the throwaway signers (no keys kept)", evm, solana_address: solAddr, solana_intents_account: solAcct }, null, 2));
}
if (step === "testnet") {
  const S = JSON.parse(fs.readFileSync(new URL("../../secrets/testnet.json", import.meta.url)));
  if (S.network !== "testnet") throw new Error("testnet only");
  const ids = JSON.parse(fs.readFileSync(new URL("./keyless-accounts.json", import.meta.url)));
  const provider = new JsonRpcProvider({ url: "https://rpc.testnet.fastnear.com" });
  const CHEST = S.account_id, USDCT = `tusdc.${CHEST}`;
  const owner = new Account(CHEST, provider, S.private_key), bridge = new Account(`launch.${CHEST}`, provider, S.private_key), backer = new Account(`backer.${CHEST}`, provider, S.private_key);
  const call = async (a, c, m, args, o = {}) => { const r = await a.callFunctionRaw({ contractId: c, methodName: m, args, gas: o.gas ?? teraToGas("100"), deposit: o.deposit ?? 0n });
    const fails = (r?.receipts_outcome ?? []).filter((x) => JSON.stringify(x.outcome.status).includes("Failure")).map((x) => JSON.stringify(x.outcome.status).slice(0, 160));
    return { tx: r.transaction_outcome.id, ok: !fails.length, fails: fails.length ? fails : undefined, events: (r?.receipts_outcome ?? []).flatMap((x) => x.outcome.logs).filter((l) => l.startsWith("EVENT_JSON")).map((l) => JSON.parse(l.slice(11)).event) }; };
  const id = (await provider.callFunction({ contractId: CHEST, method: "list_raids", args: { from: 0, limit: 200 } })).length;
  note("keyless: call_raid $SHIB 2x by a plain NEAR account (not a crew)", { id, ...(await call(backer, CHEST, "call_raid", { title: "Raid $SHIB to 2x", target: "nep141:eth-0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce.omft.near", target_x_bps: 20000, open_minutes: 1440, retreat_hours: 72 }, { gas: teraToGas("30") })) });
  note("keyless: mint 15 tUSDC to the stand-in bridge (owner mint, testnet)", await call(owner, USDCT, "mint", { account_id: `launch.${CHEST}`, amount: "15000000" }));
  for (const [label, acct, amt] of [["MetaMask 0x account", ids.evm, "8000000"], ["Phantom 64-hex account", ids.solana_intents_account, "7000000"]])
    note(`keyless: stand-in bridge backs raid #${id} for the ${label} (msg {back, for})`, { for: acct, ...(await call(bridge, USDCT, "ft_transfer_call", { receiver_id: CHEST, amount: amt, msg: JSON.stringify({ back: id, for: acct }) }, { deposit: 1n, gas: teraToGas("150") })) });
  note(`keyless: get_backers(${id}) lists the keyless accounts`, { backers: await provider.callFunction({ contractId: CHEST, method: "get_backers", args: { id } }), called_ms: await provider.callFunction({ contractId: CHEST, method: "get_called_ms", args: { id } }) });
}
