// Builds web/src/lib/receipts.json and evidence/testnet-txs.json from the run logs: every logged testnet tx is
// looked up on the RPC; raid_called / raid_backed events give raid ids; the block height comes from the receipt's block.
// Read-only. node receipts.mjs
import fs from "node:fs";
const RPC = "https://archival-rpc.testnet.fastnear.com";
const CHEST = "raid-chest-mwab3vnk.testnet";
const logs = ["testnet-run-mpc.json", "testnet-v2-run.json", "crews-run.json", "keyless/keyless-run.json", "judge-run.json", "testnet-e2e-run.json"].filter((f) => fs.existsSync(f));
// Logs are arrays of steps, or { steps: [...] } (the E2E rehearsal). A step may carry a tx and a mint_tx.
const entries = (f) => { const j = JSON.parse(fs.readFileSync(f)); const a = Array.isArray(j) ? j : j.steps ?? []; return a.flatMap((e) => [e.tx && { ...e, step: e.title ?? e.step }, e.mint_tx && { step: `${e.title ?? e.step} (mint tUSDC first)`, tx: e.mint_tx }].filter(Boolean)); };
const rpc = async (method, params) => { for (let i = 0; i < 4; i++) { const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }).then((r) => r.json()).catch(() => null); if (r?.result) return r.result; await new Promise((s) => setTimeout(s, 800)); } return null; };
const rpc1 = async (method, params) => (await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }).then((r) => r.json()).catch(() => null))?.result ?? null;
const all = logs.flatMap((f) => { const j = JSON.parse(fs.readFileSync(f)); return Array.isArray(j) ? j : j.steps ?? []; });
const SENDERS = [CHEST, `backer.${CHEST}`, `launch.${CHEST}`, `tusdc.${CHEST}`, ...new Set(all.flatMap((x) => [x.account, x.voter, x.backer, x.to, x.creator, x.signer]).filter((a) => typeof a === "string" && a.endsWith(".testnet")))];
const heights = new Map();
const height = async (hash) => { if (!heights.has(hash)) heights.set(hash, (await rpc("block", { block_id: hash }))?.header?.height ?? null); return heights.get(hash); };
const raids = {}; const txs = [];
for (const f of logs) for (const e of entries(f)) {
  if (!e.tx) continue;
  let st = null;
  for (const sender of SENDERS) { st = await rpc1("EXPERIMENTAL_tx_status", { tx_hash: e.tx, sender_account_id: sender, wait_until: "FINAL" }); if (st) break; }
  if (!st) { txs.push({ step: e.step, tx: e.tx, source: f, resolved: false }); continue; }
  const signer = st.transaction.signer_id, receiver = st.transaction.receiver_id;
  const block = await height(st.transaction_outcome.block_hash);
  const failed = st.receipts_outcome.filter((r) => JSON.stringify(r.outcome.status).includes("Failure")).map((r) => r.outcome.executor_id);
  txs.push({ step: e.step, tx: e.tx, signer, receiver, block, failed_receipts_on: failed.length ? [...new Set(failed)] : undefined, source: f });
  for (const r of st.receipts_outcome) for (const l of r.outcome.logs) {
    if (!l.startsWith("EVENT_JSON:") || r.outcome.executor_id !== CHEST) continue;
    const ev = JSON.parse(l.slice(11));
    const d = (Array.isArray(ev.data) ? ev.data[0] : ev.data) ?? {};
    if (ev.event === "raid_called") raids[d.id] = { ...(raids[d.id] ?? {}), call: { tx: e.tx, block: await height(r.block_hash), caller: d.caller, signer } };
    if (ev.event === "raid_backed") { const x = raids[d.id] ?? {}; (x.backs ??= []).push({ tx: e.tx, block: await height(r.block_hash), backer: d.backer, amount: d.amount }); raids[d.id] = x; }
  }
}
fs.writeFileSync("../web/src/lib/receipts.json", JSON.stringify({ chest: CHEST, network: "testnet", generated: new Date().toISOString(), raids }, null, 1));
fs.mkdirSync("../evidence", { recursive: true });
fs.writeFileSync("../evidence/testnet-txs.json", JSON.stringify(txs, null, 1));
console.log("raids with receipts:", Object.keys(raids).join(","), "| txs:", txs.length, "| unresolved:", txs.filter((t) => t.resolved === false).length);
