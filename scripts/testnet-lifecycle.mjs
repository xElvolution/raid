// RAID full lifecycle on NEAR testnet: Open -> Buying -> Held -> Selling -> Closed -> claimed.
// NEAR Intents and 1Click run on mainnet only, so this run deploys a fresh chest whose `intents` account is
// `contracts/intents-sim` (the same method names the chest calls on intents.near) and whose 1Click key is a
// testnet quote signer held by a solver account. The solver plays the 1Click market maker and sets the
// prices itself, so the fills are simulated. Everything else (chest rules, quote checks, DAO call, fees,
// claims) is the real contract code. Testnet only. Keys are read from $RAID_SECRETS and never printed.
import { Account, JsonRpcProvider, teraToGas, nearToYocto } from "near-api-js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import stringify from "json-stable-stringify";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";

const DIR = process.env.RAID_SECRETS || "../../raid-secrets";
const load = (n) => JSON.parse(fs.readFileSync(`${DIR}/${n}.json`));
const K = Object.fromEntries(["chest", "usdc", "pepe", "venue", "solver", "caller", "backer1", "backer2"].map((n) => [n, load(n)]));
for (const k of Object.values(K)) if (!k.account_id.endsWith(".testnet")) throw new Error("testnet only");
const QS = load("quotesigner");
const provider = new JsonRpcProvider({ url: "https://rpc.testnet.fastnear.com" });
const A = Object.fromEntries(Object.entries(K).map(([n, k]) => [n, new Account(k.account_id, provider, k.private_key)]));
const ID = Object.fromEntries(Object.entries(K).map(([n, k]) => [n, k.account_id]));
const CHEST = ID.chest, USDC = ID.usdc, PEPE = ID.pepe, VENUE = ID.venue, SOLVER = ID.solver;
const USDC_ASSET = `nep141:${USDC}`, PEPE_ASSET = `nep141:${PEPE}`;
const FACTORY = "sputnikv2.testnet";
const DAO_NAME = `raid-crew-${ID.caller.split("-")[1].split(".")[0]}`;
const DAO = `${DAO_NAME}.${FACTORY}`;

const LOG = "../evidence/testnet-lifecycle-run.json";
const out = fs.existsSync(LOG) ? JSON.parse(fs.readFileSync(LOG)) : [];
const note = (step, v) => { out.push({ step, at: new Date().toISOString(), ...v }); console.log(step, JSON.stringify(v)); fs.writeFileSync(LOG, JSON.stringify(out, null, 2)); };
const txh = (o) => o?.transaction_outcome?.id || o?.transaction?.hash;
const view = (contractId, method, args = {}) => provider.callFunction({ contractId, method, args });
const call = async (acct, contractId, methodName, args, opts = {}) => {
  let r;
  try { r = await acct.callFunctionRaw({ contractId, methodName, args, gas: opts.gas ?? teraToGas("150"), deposit: opts.deposit ?? 0n }); }
  catch (e) { r = e.transactionResult; if (!r) throw e; }
  const fails = (r?.receipts_outcome ?? []).filter((x) => JSON.stringify(x.outcome.status).includes("Failure")).map((x) => JSON.stringify(x.outcome.status).slice(0, 300));
  const top = JSON.stringify(r?.status ?? {});
  const logs = (r?.receipts_outcome ?? []).flatMap((x) => x.outcome.logs);
  let ret; try { const b = r?.status?.SuccessValue; ret = b ? JSON.parse(Buffer.from(b, "base64").toString()) : undefined; } catch { ret = undefined; }
  return { tx: txh(r), url: `https://testnet.nearblocks.io/txns/${txh(r)}`, ok: !top.includes("Failure") && fails.length === 0, ret, events: logs.filter((l) => l.startsWith("EVENT_JSON")).map((l) => JSON.parse(l.slice(11)).event), sim: logs.filter((l) => l.startsWith("sim_")), fails };
};
const must = (r, what) => { if (!r.ok) { note(`FAILED: ${what}`, r); process.exit(1); } return r; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const iso = (ms) => new Date(ms).toISOString();

// A 1Click-shaped quote, signed the way the chest verifies it: ed25519 over base58(sha256(stable json)).
function quote({ origin, destination, amountIn, minOut }) {
  const now = Date.now();
  const q = { dry: false, swapType: "EXACT_INPUT", originAsset: origin, destinationAsset: destination, depositType: "INTENTS", recipientType: "INTENTS", refundType: "INTENTS", recipient: CHEST, refundTo: CHEST, amount: amountIn, amountIn, minAmountOut: minOut, amountOut: minOut, depositAddress: SOLVER, deadline: iso(now + 9 * 60_000), timestamp: iso(now), slippageTolerance: 100 };
  const signed_json = stringify(q);
  const hash = bs58.encode(createHash("sha256").update(signed_json).digest());
  const sig = nacl.sign.detached(Buffer.from(hash), bs58.decode(QS.secret));
  return { signed_json, signature: `ed25519:${bs58.encode(sig)}` };
}

const CFG = { intents: VENUE, usdc: USDC, mpc: "v1.signer-prod.testnet", oneclick_key: QS.public_key, caller_fee_bps: 250, buyback_bps: 750, min_back: "100000", max_back: "250000000", max_pot: "1000000000", min_open_minutes: 1, buy_delay_minutes: 1 };
const step = process.argv[2] || "all";
const wasm = (n) => fs.readFileSync(`../contracts/target/near/${n}/${n}.wasm`);
const state = () => (fs.existsSync(`${DIR}/lifecycle-state.json`) ? JSON.parse(fs.readFileSync(`${DIR}/lifecycle-state.json`)) : {});
const save = (s) => fs.writeFileSync(`${DIR}/lifecycle-state.json`, JSON.stringify(s));

if (step === "all" || step === "setup") {
  note("deploy tUSDC (test-usdc)", { tx: txh(await A.usdc.deployContract(wasm("test_usdc"))) });
  note("init tUSDC", must(await call(A.usdc, USDC, "new", { owner: USDC, name: "RAID Test USD", symbol: "tUSDC" }), "init usdc"));
  note("deploy tPEPE stand-in target coin (test-usdc)", { tx: txh(await A.pepe.deployContract(wasm("test_usdc"))) });
  note("init tPEPE", must(await call(A.pepe, PEPE, "new", { owner: PEPE, name: "RAID Test PEPE", symbol: "tPEPE" }), "init pepe"));
  note("deploy intents-sim venue", { tx: txh(await A.venue.deployContract(wasm("intents_sim"))) });
  note("init intents-sim", must(await call(A.venue, VENUE, "new", {}), "init venue"));
  note("deploy RAID chest", { tx: txh(await A.chest.deployContract(wasm("raid_chest"))) });
  note("init chest (intents = intents-sim, 1Click key = testnet quote signer)", must(await call(A.chest, CHEST, "new", { cfg: CFG }), "init chest"));
  // Solver inventory inside the venue: tPEPE to sell to the chest, tUSDC to buy the trophy back.
  must(await call(A.pepe, PEPE, "mint", { account_id: SOLVER, amount: "100000000000" }), "mint pepe");
  must(await call(A.usdc, USDC, "mint", { account_id: SOLVER, amount: "100000000000" }), "mint usdc");
  note("solver deposits 100k tPEPE into the venue", must(await call(A.solver, PEPE, "ft_transfer_call", { receiver_id: VENUE, amount: "100000000000", msg: "" }, { deposit: 1n }), "solver pepe"));
  note("solver deposits 100k tUSDC into the venue", must(await call(A.solver, USDC, "ft_transfer_call", { receiver_id: VENUE, amount: "100000000000", msg: "" }, { deposit: 1n }), "solver usdc"));
}

if (step === "all" || step === "call") {
  if (!(await provider.viewAccount({ accountId: DAO }).catch(() => null))) {
    const policy = {
      roles: [
        { name: "crew", kind: { Group: [ID.caller, ID.backer1] }, permissions: ["*:*"], vote_policy: {} },
        { name: "all", kind: "Everyone", permissions: ["*:AddProposal"], vote_policy: {} },
      ],
      default_vote_policy: { weight_kind: "RoleWeight", quorum: "0", threshold: [1, 2] },
      proposal_bond: nearToYocto("0.1").toString(), proposal_period: String(24n * 3600n * 1_000_000_000n),
      bounty_bond: nearToYocto("0.1").toString(), bounty_forgiveness_period: String(24n * 3600n * 1_000_000_000n),
    };
    const args = Buffer.from(JSON.stringify({ config: { name: DAO_NAME, purpose: "RAID crew (testnet)", metadata: "" }, policy })).toString("base64");
    note("create crew DAO on sputnikv2.testnet", { dao: DAO, ...must(await call(A.caller, FACTORY, "create", { name: DAO_NAME, args }, { deposit: nearToYocto("6"), gas: teraToGas("300") }), "dao create") });
  }
  const callArgs = { title: "Raid $tPEPE to 2x", target: PEPE_ASSET, target_x_bps: 20000, open_minutes: 5, retreat_hours: 24 };
  const proposal = { description: "Raid $tPEPE to 2x$$$$RAID call: 2x line, 5 min crew window, 24 h retreat", kind: { FunctionCall: { receiver_id: CHEST, actions: [{ method_name: "call_raid", args: Buffer.from(JSON.stringify(callArgs)).toString("base64"), deposit: "0", gas: "30000000000000" }] } } };
  const p = must(await call(A.caller, DAO, "add_proposal", { proposal }, { deposit: nearToYocto("0.1") }), "add_proposal");
  note("crew DAO proposes call_raid", { dao: DAO, proposal_id: p.ret, ...p });
  const props = await view(DAO, "get_proposals", { from_index: 0, limit: 50 });
  const prop = props.find((x) => x.id === p.ret);
  note("vote 1/2 (crew captain)", must(await call(A.caller, DAO, "act_proposal", { id: p.ret, action: "VoteApprove", proposal: prop.kind }, { gas: teraToGas("200") }), "vote1"));
  const v2 = must(await call(A.backer1, DAO, "act_proposal", { id: p.ret, action: "VoteApprove", proposal: prop.kind }, { gas: teraToGas("200") }), "vote2");
  note("vote 2/2 passes: the DAO calls call_raid on the chest", v2);
  const raids = await view(CHEST, "list_raids", { from: 0, limit: 100 });
  const raid = raids.filter((r) => r.caller === DAO).pop();
  if (!raid) { note("FAILED: DAO raid not found", { raids }); process.exit(1); }
  note("raid called by the DAO", { id: raid.id, caller: raid.caller, status: raid.status, buy_after: iso(raid.buy_after_ms), retreat_at: iso(raid.retreat_at_ms) });
  const s = state(); s.raidA = raid.id; save(s);
}

if (step === "all" || step === "back") {
  const id = state().raidA;
  for (const [n, amt] of [["backer1", "40000000"], ["backer2", "60000000"]]) {
    must(await call(A.usdc, USDC, "mint", { account_id: ID[n], amount: "500000000" }), "mint backer");
    note(`back from a NEAR wallet: ${n} ${Number(amt) / 1e6} tUSDC`, must(await call(A[n], USDC, "ft_transfer_call", { receiver_id: CHEST, amount: amt, msg: JSON.stringify({ back: id }) }, { deposit: 1n, gas: teraToGas("150") }), "back"));
  }
  // Any-chain backs. On mainnet 1Click delivers bridged USDC with customRecipientMsg {"back", "for"}.
  // Here the solver plays that bridge. The stake belongs to the wallet's own account id, not to the bridge.
  must(await call(A.usdc, USDC, "mint", { account_id: SOLVER, amount: "1000000000" }), "mint bridge");
  const evm = "0x" + randomBytes(20).toString("hex");
  const sol = Buffer.from(nacl.sign.keyPair().publicKey).toString("hex");
  const s = state(); s.evm = evm; s.sol = sol; save(s);
  note("any-chain back for an EVM wallet account (0x..), 12 tUSDC via the bridge stand-in", { for: evm, ...must(await call(A.solver, USDC, "ft_transfer_call", { receiver_id: CHEST, amount: "12000000", msg: JSON.stringify({ back: id, for: evm }) }, { deposit: 1n }), "evm back") });
  note("any-chain back for a Solana-style ed25519 account (64 hex), 8 tUSDC via the bridge stand-in", { for: sol, ...must(await call(A.solver, USDC, "ft_transfer_call", { receiver_id: CHEST, amount: "8000000", msg: JSON.stringify({ back: id, for: sol }) }, { deposit: 1n }), "sol back") });
  note("backers on chain", { backers: await view(CHEST, "get_backers", { id }), raid: await view(CHEST, "get_raid", { id }) });
  note("chest balance inside the venue after backing", { usdc: await view(VENUE, "mt_balance_of", { account_id: CHEST, token_id: USDC_ASSET }) });
}

if (step === "all" || step === "buy") {
  const id = state().raidA;
  let raid = await view(CHEST, "get_raid", { id });
  const early = await call(A.backer1, CHEST, "execute_buy", { id, ...quote({ origin: USDC_ASSET, destination: PEPE_ASSET, amountIn: raid.pot, minOut: "1" }) });
  note("execute_buy during the public countdown is refused", { ok_means_refused: !early.ok, tx: early.tx, url: early.url, error: (early.fails[0] || "").slice(0, 200) });
  while (Date.now() < raid.buy_after_ms + 5000) { await sleep(5000); }
  note("Chain Signatures: chest derives its own key (mpc_bootstrap)", await call(A.backer1, CHEST, "mpc_bootstrap", {}, { gas: teraToGas("60") }));
  note("Chain Signatures: register the MPC key on the venue (mpc_register)", await call(A.backer1, CHEST, "mpc_register", {}, { gas: teraToGas("80") }));
  note("Chain Signatures: MPC signs the chest's own buy intent for the whole pot (mpc_sign_buy)", await call(A.backer1, CHEST, "mpc_sign_buy", { id, min_out: "95000000" }, { gas: teraToGas("300") }));
  // Buy through the signed-quote path. Entry price set by the solver: 1 tPEPE = 1 tUSDC.
  const pot = raid.pot;
  const bad = await call(A.backer1, CHEST, "execute_buy", { id, ...quote({ origin: USDC_ASSET, destination: PEPE_ASSET, amountIn: pot, minOut: "1" }), signature: quote({ origin: USDC_ASSET, destination: PEPE_ASSET, amountIn: "1", minOut: "1" }).signature });
  note("execute_buy with a quote whose signature does not match is refused", { ok_means_refused: !bad.ok, url: bad.url, error: (bad.fails[0] || "").slice(0, 200) });
  note("execute_buy: chest checks the signed quote and sends the pot to the solver deposit account", must(await call(A.backer1, CHEST, "execute_buy", { id, ...quote({ origin: USDC_ASSET, destination: PEPE_ASSET, amountIn: pot, minOut: String(BigInt(pot) * 95n / 100n) }) }), "execute_buy"));
  note("solver fills: pays tPEPE to the chest inside the venue", must(await call(A.solver, VENUE, "mt_transfer", { receiver_id: CHEST, token_id: PEPE_ASSET, amount: pot }, { deposit: 1n }), "fill buy"));
  note("settle (anyone): Buying -> Held", must(await call(A.backer2, CHEST, "settle", { id }), "settle buy"));
  raid = await view(CHEST, "get_raid", { id });
  note("raid after buy", { status: raid.status, entry_cost: raid.entry_cost, held: raid.held });
}

if (step === "all" || step === "sell") {
  const id = state().raidA;
  let raid = await view(CHEST, "get_raid", { id });
  const below = await call(A.backer1, CHEST, "execute_sell", { id, ...quote({ origin: PEPE_ASSET, destination: USDC_ASSET, amountIn: raid.held, minOut: String(BigInt(raid.entry_cost) * 15n / 10n) }) });
  note("execute_sell below the 2x line before retreat is refused", { ok_means_refused: !below.ok, url: below.url, error: (below.fails[0] || "").slice(0, 200) });
  // The solver now pays 2.05 tUSDC per tPEPE (simulated price move): 205 tUSDC for a 100 tUSDC entry.
  const proceeds = String(BigInt(raid.entry_cost) * 205n / 100n);
  note("execute_sell at the line: quote minAmountOut >= entry x 2", must(await call(A.backer1, CHEST, "execute_sell", { id, ...quote({ origin: PEPE_ASSET, destination: USDC_ASSET, amountIn: raid.held, minOut: String(BigInt(raid.entry_cost) * 2n) }) }), "execute_sell"));
  note("solver fills: pays tUSDC to the chest inside the venue", must(await call(A.solver, VENUE, "mt_transfer", { receiver_id: CHEST, token_id: USDC_ASSET, amount: proceeds }, { deposit: 1n }), "fill sell"));
  note("settle (anyone): Selling -> Closed, fee split", must(await call(A.backer2, CHEST, "settle", { id }), "settle sell"));
  raid = await view(CHEST, "get_raid", { id });
  note("raid closed", { status: raid.status, hit: raid.hit, entry_cost: raid.entry_cost, proceeds: raid.proceeds, caller: raid.caller, caller_cut: raid.caller_cut, buyback: raid.buyback, for_backers: raid.for_backers });
}

if (step === "all" || step === "claim") {
  const s = state(); const id = s.raidA;
  for (const n of ["backer1", "backer2"]) {
    const before = await view(USDC, "ft_balance_of", { account_id: ID[n] });
    note(`claim_share: ${n}`, must(await call(A[n], CHEST, "claim_share", { id }), "claim_share"));
    note(`claim: ${n} withdraws tUSDC to the wallet`, must(await call(A[n], CHEST, "claim", {}, { gas: teraToGas("150") }), "claim"));
    const after = await view(USDC, "ft_balance_of", { account_id: ID[n] });
    note(`${n} wallet tUSDC`, { before, after, received: String(BigInt(after) - BigInt(before)) });
  }
  for (const who of [s.evm, s.sol]) {
    note("claim_share_for an any-chain backer (anyone can push it, only to the owner)", must(await call(A.backer2, CHEST, "claim_share_for", { id, account_id: who }), "claim_share_for"));
    note("claim_into_intents: the share lands in the venue under the wallet's own account", must(await call(A.backer2, CHEST, "claim_into_intents", { account_id: who }), "claim_into_intents"));
    note("any-chain backer balance in the venue", { account: who, usdc: await view(VENUE, "mt_balance_of", { account_id: who, token_id: USDC_ASSET }) });
  }
  // Caller fee: the DAO is the caller, so the crew claims it by proposal.
  const proposal = { description: "Claim our caller fee from the RAID chest", kind: { FunctionCall: { receiver_id: CHEST, actions: [{ method_name: "claim", args: Buffer.from("{}").toString("base64"), deposit: "0", gas: "150000000000000" }] } } };
  const p = must(await call(A.caller, DAO, "add_proposal", { proposal }, { deposit: nearToYocto("0.1") }), "claim proposal");
  note("crew DAO proposes to claim the caller fee", p);
  const prop = (await view(DAO, "get_proposals", { from_index: 0, limit: 50 })).find((x) => x.id === p.ret);
  must(await call(A.caller, DAO, "act_proposal", { id: p.ret, action: "VoteApprove", proposal: prop.kind }, { gas: teraToGas("250") }), "cvote1");
  note("vote passes: the DAO claims its caller fee into the crew treasury", must(await call(A.backer1, DAO, "act_proposal", { id: p.ret, action: "VoteApprove", proposal: prop.kind }, { gas: teraToGas("300") }), "cvote2"));
  note("crew DAO treasury tUSDC", { dao: DAO, usdc: await view(USDC, "ft_balance_of", { account_id: DAO }) });
  note("buyback reserve", { buyback: await view(CHEST, "get_buyback_bucket", {}) });
  note("chest balance left in the venue", { usdc: await view(VENUE, "mt_balance_of", { account_id: CHEST, token_id: USDC_ASSET }), pepe: await view(VENUE, "mt_balance_of", { account_id: CHEST, token_id: PEPE_ASSET }) });
}

// A second raid that misses: bought, then sold at market after the retreat deadline (1 h). Run "retreat-a" now, "retreat-b" after the deadline.
if (step === "retreat-a") {
  const r = must(await call(A.caller, CHEST, "call_raid", { title: "Raid $tPEPE to 3x (retreat test)", target: PEPE_ASSET, target_x_bps: 30000, open_minutes: 1, retreat_hours: 1 }, { gas: teraToGas("30") }), "call B");
  const id = r.ret; const s = state(); s.raidB = id; save(s);
  note("raid B called directly by a NEAR account (3x line, 1 h retreat)", { id, ...r });
  must(await call(A.usdc, USDC, "mint", { account_id: ID.backer2, amount: "100000000" }), "mint");
  note("raid B: backer2 backs 20 tUSDC", must(await call(A.backer2, USDC, "ft_transfer_call", { receiver_id: CHEST, amount: "20000000", msg: JSON.stringify({ back: id }) }, { deposit: 1n }), "back B"));
  let raid = await view(CHEST, "get_raid", { id });
  while (Date.now() < raid.buy_after_ms + 5000) { await sleep(5000); }
  note("raid B: execute_buy", must(await call(A.backer1, CHEST, "execute_buy", { id, ...quote({ origin: USDC_ASSET, destination: PEPE_ASSET, amountIn: raid.pot, minOut: String(BigInt(raid.pot) * 9n / 10n) }) }), "buy B"));
  note("raid B: solver fills", must(await call(A.solver, VENUE, "mt_transfer", { receiver_id: CHEST, token_id: PEPE_ASSET, amount: raid.pot }, { deposit: 1n }), "fill B"));
  note("raid B: settle -> Held", must(await call(A.backer2, CHEST, "settle", { id }), "settle B"));
  raid = await view(CHEST, "get_raid", { id });
  note("raid B held; retreat deadline", { status: raid.status, retreat_at: iso(raid.retreat_at_ms) });
}
if (step === "retreat-b") {
  const id = state().raidB;
  let raid = await view(CHEST, "get_raid", { id });
  if (Date.now() < raid.retreat_at_ms) { note("retreat not reached yet", { retreat_at: iso(raid.retreat_at_ms) }); process.exit(0); }
  const proceeds = String(BigInt(raid.entry_cost) * 70n / 100n);
  note("raid B: after retreat the chest may sell at market (0.7x, a loss)", must(await call(A.backer1, CHEST, "execute_sell", { id, ...quote({ origin: PEPE_ASSET, destination: USDC_ASSET, amountIn: raid.held, minOut: proceeds }) }), "sell B"));
  note("raid B: solver fills", must(await call(A.solver, VENUE, "mt_transfer", { receiver_id: CHEST, token_id: USDC_ASSET, amount: proceeds }, { deposit: 1n }), "fill sell B"));
  note("raid B: settle -> Closed (miss)", must(await call(A.backer2, CHEST, "settle", { id }), "settle sell B"));
  raid = await view(CHEST, "get_raid", { id });
  note("raid B closed: a miss pays no fees", { status: raid.status, hit: raid.hit, proceeds: raid.proceeds, caller_cut: raid.caller_cut, buyback: raid.buyback, for_backers: raid.for_backers });
  note("raid B: backer2 claim_share", must(await call(A.backer2, CHEST, "claim_share", { id }), "cs B"));
  note("raid B: backer2 claim", must(await call(A.backer2, CHEST, "claim", {}), "claim B"));
}
