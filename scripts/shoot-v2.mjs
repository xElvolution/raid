// node shoot-v2.mjs [filter] -> scripts/shots/prod/v2/<name>-<w>.png ; prints overflow + page errors. BASE defaults to :3420 (prod build).
import { chromium } from "playwright-core";
import fs from "node:fs";
const BASE = process.env.BASE || "http://localhost:3420";
const OUT = "/workspace/raid/scripts/shots/prod/v2";
fs.mkdirSync(OUT, { recursive: true });
const only = process.argv[2];
const theme = process.env.THEME || "dark";
const openCall = async (p) => { await p.getByRole("button", { name: "Call a raid" }).first().click(); await p.waitForTimeout(700); await p.getByRole("dialog").getByRole("button", { name: /\$PEPE/ }).first().click(); await p.waitForTimeout(900); };
const PAGES = [
  ["landing", "/"],
  ["raid", "/raids/0"],
  ["raid-any", "/raids/0", async (p) => { await p.getByRole("tab", { name: /Solana/ }).click(); await p.waitForTimeout(3500); await p.getByRole("tab", { name: /Solana/ }).scrollIntoViewIfNeeded(); await p.waitForTimeout(400); }],
  ["call-line", "/raids", openCall],
  ["call-review", "/raids", async (p) => { await openCall(p); await p.getByRole("button", { name: "Review raid" }).click(); await p.waitForTimeout(1000); }],
  ["call-review-scroll", "/raids", async (p) => { await openCall(p); await p.getByRole("button", { name: "Review raid" }).click(); await p.waitForTimeout(800); await p.getByRole("dialog").evaluate((d) => d.scrollTo(0, 520)); await p.waitForTimeout(500); }],
  ["launch", "/launch"],
  ["launch-buy", "/launch", async (p) => { await p.getByRole("button", { name: "Buy", exact: true }).first().click(); await p.waitForTimeout(1500); }],
  ["live", "/live"],
  ["start", "/start", async (p) => { await p.waitForTimeout(300); }],
  ["feed", "/feed"],
  ["feed-thread", "/feed", async (p) => { await p.waitForTimeout(800); await p.getByRole("button", { name: /repl/i }).first().click(); await p.waitForTimeout(1500); }],
];
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
for (const [name, path, act] of PAGES) {
  if (only && !only.split(",").some((o) => name === o || name.startsWith(o + "-") )) continue;
  for (const W of [390, 1440]) {
    const ctx = await b.newContext(W < 800 ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript((t) => localStorage.setItem("raid.theme", t), theme);
    const p = await ctx.newPage(); const errs = [];
    p.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
    p.on("console", (m) => m.type() === "error" && errs.push("console: " + m.text().slice(0, 160)));
    await p.goto(BASE + path, { waitUntil: "load", timeout: 60000 }); await p.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {}); await p.waitForTimeout(2200);
    if (!act) { await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } scrollTo(0, 0); }); await p.waitForTimeout(800); }
    if (act) await act(p).catch((e) => errs.push("action: " + e.message.slice(0, 120)));
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    const full = (!act || name === "raid-any") && process.env.FULL !== "0";
    const f = `${OUT}/${name}${theme === "light" ? "-light" : ""}-${W}.png`;
    await p.screenshot({ path: f, fullPage: full });
    console.log(f.split("/").pop(), sw.join("/"), sw[0] > sw[1] ? "OVERFLOW" : "ok", errs.length ? "ERR " + [...new Set(errs)].join(" | ") : "");
    await ctx.close();
  }
}
await b.close();
