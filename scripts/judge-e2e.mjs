// End-to-end check of judge mode in a real (headless) browser: inject Judge 2's testnet key the way /judges stores it,
// back raid #3 with 5 tUSDC through the UI, and confirm the stake on the chest. Key is read from ../secrets and never printed.
import { chromium } from "playwright-core";
import { JsonRpcProvider } from "near-api-js";
import fs from "node:fs";
const BASE = process.env.BASE || "http://localhost:3410";
const RAID = Number(process.env.RAID || 3);
const J = JSON.parse(fs.readFileSync(new URL("../secrets/judges.json", import.meta.url))).judge2;
const p = new JsonRpcProvider({ url: "https://rpc.testnet.fastnear.com" });
const stake = () => p.callFunction({ contractId: "raid-chest-mwab3vnk.testnet", method: "get_stake", args: { id: RAID, account_id: J.account_id } });
const before = await stake();
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript((j) => localStorage.setItem("raid.judge", JSON.stringify(j)), { accountId: J.account_id, key: J.private_key });
const page = await ctx.newPage();
await page.goto(`${BASE}/raids/${RAID}`, { waitUntil: "load" }); await page.waitForTimeout(4000);
await page.getByRole("button", { name: "5", exact: true }).first().click();
await page.getByRole("button", { name: /^Back with 5/ }).click();
let after = before;
for (let i = 0; i < 20 && after === before; i++) { await page.waitForTimeout(1500); after = await stake(); }
await page.screenshot({ path: "shots/prod/v4/judge-e2e-backed-390.png" });
await b.close();
const log = fs.existsSync("judge-run.json") ? JSON.parse(fs.readFileSync("judge-run.json")) : [];
const entry = { step: `judge mode e2e: ${J.account_id} backs raid #${RAID} with 5 tUSDC via the web UI`, at: new Date().toISOString(), stake_before: before, stake_after: after, ok: after !== before };
// tx hash from the explorer index (public NearBlocks API)
try { const r = await fetch(`https://api-testnet.nearblocks.io/v1/account/${J.account_id}/txns-only?per_page=5`).then((x) => x.json()); const t = (r.txns ?? []).find((x) => x.receiver_account_id?.startsWith("tusdc.")); if (t) entry.tx = t.transaction_hash; } catch {}
log.push(entry); fs.writeFileSync("judge-run.json", JSON.stringify(log, null, 2));
console.log(JSON.stringify({ ...entry }));
