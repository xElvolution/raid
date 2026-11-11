// RAID crews as Sputnik DAO v2 (NEAR testnet factory sputnikv2.testnet) + judge accounts.
// Testnet only. New keys go to ../secrets/{crews,judges}.json (chmod 600, gitignored). Nothing secret is printed.
// Steps: accounts | daos | proposals | vote | back | status
import { Account, JsonRpcProvider, KeyPair, teraToGas, nearToYocto } from "near-api-js";
import fs from "node:fs";
const SEC = new URL("../secrets/", import.meta.url).pathname;
const S = JSON.parse(fs.readFileSync(SEC + "testnet.json"));
if (S.network !== "testnet") throw new Error("testnet only");
const provider = new JsonRpcProvider({ url: "https://rpc.testnet.fastnear.com" });
const FACTORY = "sputnikv2.testnet";
const CHEST = S.account_id, USDC = `tusdc.${S.account_id}`;
const owner = new Account(CHEST, provider, S.private_key);
const LOG = new URL("./crews-run.json", import.meta.url).pathname;
const out = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG)) : [];
const note = (step, v) => { out.push({ step, at: new Date().toISOString(), ...v }); console.log(step, JSON.stringify(v)); fs.writeFileSync(LOG, JSON.stringify(out, null, 2)); };
const txh = (o) => o?.transaction_outcome?.id || o?.transaction?.hash;
const view = (contractId, method, args = {}) => provider.callFunction({ contractId, method, args });
const call = async (acct, contractId, methodName, args, opts = {}) => {
  try {
    const r = await acct.callFunctionRaw({ contractId, methodName, args, gas: opts.gas ?? teraToGas("100"), deposit: opts.deposit ?? 0n });
    const fails = (r?.receipts_outcome ?? []).filter((x) => JSON.stringify(x.outcome.status).includes("Failure")).map((x) => JSON.stringify(x.outcome.status).slice(0, 240));
    const top = JSON.stringify(r?.status ?? {}).includes("Failure");
    return { tx: txh(r), ok: !top && !fails.length, fails: fails.length ? fails : undefined, value: r?.status?.SuccessValue ? Buffer.from(r.status.SuccessValue, "base64").toString() : undefined };
  } catch (e) { return { ok: false, err: String(e.message).slice(0, 300) }; }
};
const save = (name, obj) => { const p = SEC + name; fs.writeFileSync(p, JSON.stringify(obj, null, 2), { mode: 0o600 }); fs.chmodSync(p, 0o600); };
const load = (name) => (fs.existsSync(SEC + name) ? JSON.parse(fs.readFileSync(SEC + name)) : null);
const acct = (a) => new Account(a.account_id, provider, a.private_key);
const step = process.argv[2] || "status";

// Two crews. Names are labels for testnet demo crews (not real teams).
const CREWS = [
  { key: "frogs", name: "Frog Legion", dao: "raid-frog-legion", purpose: "RAID testnet crew. Members vote on raids; a passed proposal calls the raid on the RAID chest." },
  { key: "dogs", name: "Doge Pack", dao: "raid-doge-pack", purpose: "RAID testnet crew. Members vote on raids; a passed proposal calls the raid on the RAID chest." },
];

async function helperAccount(prefix) {
  const kp = KeyPair.fromRandom("ed25519");
  const pk = kp.getPublicKey().toString();
  const id = `${prefix}-${Date.now().toString(36)}.testnet`;
  const r = await fetch("https://helper.testnet.near.org/account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newAccountId: id, newAccountPublicKey: pk }) });
  const ok = r.ok; await r.text();
  if (!ok) throw new Error(`helper ${r.status} for ${prefix}`);
  await new Promise((s) => setTimeout(s, 2500));
  return { network: "testnet", account_id: id, public_key: pk, private_key: kp.toString() };
}

if (step === "accounts") {
  const crews = load("crews.json") ?? {}; const judges = load("judges.json") ?? {};
  for (const c of CREWS) if (!crews[c.key]) { crews[c.key] = await helperAccount(`raid-capt-${c.key}`); save("crews.json", crews); note("captain account (testnet helper)", { crew: c.key, account: crews[c.key].account_id }); }
  for (const j of ["judge1", "judge2", "judge3"]) if (!judges[j]) { judges[j] = await helperAccount(`raid-${j}`); save("judges.json", judges); note("judge account (testnet helper)", { judge: j, account: judges[j].account_id }); }
}
const crews = load("crews.json"), judges = load("judges.json");
const members = (key) => key === "frogs" ? [crews.frogs.account_id, judges.judge1.account_id, judges.judge2.account_id] : [crews.dogs.account_id, judges.judge3.account_id, `backer.${CHEST}`];
const daoId = (c) => `${c.dao}.${FACTORY}`;

if (step === "daos") {
  for (const c of CREWS) {
    if (await provider.viewAccount({ accountId: daoId(c) }).catch(() => null)) { note("dao exists", { dao: daoId(c) }); continue; }
    const policy = {
      roles: [
        { name: "crew", kind: { Group: members(c.key) }, permissions: ["*:*"], vote_policy: {} },
        { name: "all", kind: "Everyone", permissions: ["*:AddProposal"], vote_policy: {} },
      ],
      default_vote_policy: { weight_kind: "RoleWeight", quorum: "0", threshold: [1, 2] },
      proposal_bond: nearToYocto("0.1").toString(),
      proposal_period: String(24n * 3600n * 1_000_000_000n),
      bounty_bond: nearToYocto("0.1").toString(),
      bounty_forgiveness_period: String(24n * 3600n * 1_000_000_000n),
    };
    const args = Buffer.from(JSON.stringify({ config: { name: c.dao, purpose: c.purpose, metadata: "" }, policy })).toString("base64");
    note("create crew DAO on sputnikv2.testnet", { dao: daoId(c), members: members(c.key), ...(await call(acct(crews[c.key]), FACTORY, "create", { name: c.dao, args }, { deposit: nearToYocto("6"), gas: teraToGas("300") })) });
  }
}

const raidProposal = (title, target, x) => ({
  description: `${title}$$$$RAID call: ${x / 10000}x line, 10 h crew window, 72 h retreat`,
  kind: { FunctionCall: { receiver_id: CHEST, actions: [{ method_name: "call_raid", args: Buffer.from(JSON.stringify({ title, target, target_x_bps: x, open_minutes: 600, retreat_hours: 72 })).toString("base64"), deposit: "0", gas: "30000000000000" }] } },
});
const PEPE = "nep141:eth-0x6982508145454ce325ddbe47a25d4ec3d2311933.omft.near";
const DOGE = "nep141:doge.omft.near";
const PROPS = {
  frogs: [raidProposal("Raid $PEPE to 2x", PEPE, 20000), raidProposal("Raid $DOGE to 1.5x", DOGE, 15000)],
  dogs: [raidProposal("Raid $DOGE to 3x", DOGE, 30000), raidProposal("Raid $PEPE to 1.5x", PEPE, 15000)],
};
if (step === "proposals") {
  for (const c of CREWS) for (const p of PROPS[c.key]) note("add_proposal (crew raid)", { dao: daoId(c), title: p.description.split("$$$$")[0], ...(await call(acct(crews[c.key]), daoId(c), "add_proposal", { proposal: p }, { deposit: nearToYocto("0.1"), gas: teraToGas("100") })) });
}
if (step === "vote") {
  // First proposal of each crew: captain + one member approve (2 of 3) -> the DAO executes call_raid on the chest.
  // Second proposal: captain approves only, so it stays open for judges to cast the deciding vote.
  for (const c of CREWS) {
    const dao = daoId(c);
    const props = await view(dao, "get_proposals", { from_index: 0, limit: 10 });
    const voters = c.key === "frogs" ? [crews.frogs, judges.judge1] : [crews.dogs, judges.judge3];
    for (const p of props) {
      if (p.status !== "InProgress") continue;
      const who = p.id === props[0].id ? voters : voters.slice(0, 1);
      for (const v of who) note("act_proposal VoteApprove", { dao, proposal: p.id, voter: v.account_id, ...(await call(acct(v), dao, "act_proposal", { id: p.id, action: "VoteApprove", proposal: p.kind }, { gas: teraToGas("200") })) });
    }
  }
}
if (step === "back") {
  // Crew members back their crew's DAO-called raids with testnet USDC (owner mint, testnet faucet token).
  const raids = await view(CHEST, "list_raids", { from: 0, limit: 100 });
  const plan = { frogs: [[crews.frogs, 120], [judges.judge1, 60]], dogs: [[crews.dogs, 90], [judges.judge3, 40]] };
  for (const c of CREWS) {
    const r = raids.filter((x) => x.caller === daoId(c)).at(-1);
    if (!r) { note("no DAO raid yet", { dao: daoId(c) }); continue; }
    for (const [m, amt] of plan[c.key]) {
      note("mint tUSDC (testnet faucet token)", { to: m.account_id, ...(await call(owner, USDC, "mint", { account_id: m.account_id, amount: String(amt * 1e6) })) });
      note("back crew raid", { crew: c.key, raid: r.id, backer: m.account_id, amount: amt, ...(await call(acct(m), USDC, "ft_transfer_call", { receiver_id: CHEST, amount: String(amt * 1e6), msg: JSON.stringify({ back: r.id }) }, { deposit: 1n, gas: teraToGas("150") })) });
    }
  }
}
if (step === "judgefund") {
  for (const j of Object.values(judges)) note("mint 500 tUSDC to judge", { to: j.account_id, ...(await call(owner, USDC, "mint", { account_id: j.account_id, amount: "500000000" })) });
}
if (step === "status") {
  for (const c of CREWS) {
    const dao = daoId(c);
    const ex = await provider.viewAccount({ accountId: dao }).catch(() => null);
    console.log(dao, ex ? "exists" : "missing");
    if (ex) { const ps = await view(dao, "get_proposals", { from_index: 0, limit: 10 }); for (const p of ps) console.log(" ", p.id, p.status, p.description.split("$$$$")[0], JSON.stringify(p.vote_counts)); }
  }
}
