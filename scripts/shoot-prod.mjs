// node shoot-prod.mjs [filter] -> scripts/shots/prod/<name>-<w>.png ; prints overflow + page errors
import { chromium } from "playwright-core";
const BASE = process.env.BASE || "http://localhost:3410";
const OUT = "/workspace/raid/scripts/shots/prod";
const only = process.argv[2];
const theme = process.env.THEME || "dark";
const PAGES = [
  ["landing", "/"], ["live", "/live"], ["raids", "/raids"], ["raid", "/raids/0"], ["coin", "/coin/PEPE"], ["launch", "/launch"], ["ranks", "/leaderboard"],
  ["caller", "/u/raid-chest-mwab3vnk.testnet"], ["me", "/u/me"], ["start", "/start"], ["404", "/nope"], ["hit-preview", "/raids/0?preview=hit", async (p) => { await p.waitForTimeout(2600); }],
  ["call", "/raids", async (p) => { await p.getByRole("button", { name: "Call a raid" }).first().click(); await p.waitForTimeout(900); }],
  ["call-line", "/raids", async (p) => { await p.getByRole("button", { name: "Call a raid" }).first().click(); await p.waitForTimeout(700); await p.getByRole("dialog").getByRole("button", { name: /\$PEPE/ }).first().click(); await p.waitForTimeout(800); }],
  ["call-review", "/raids", async (p) => { await p.getByRole("button", { name: "Call a raid" }).first().click(); await p.waitForTimeout(700); await p.getByRole("dialog").getByRole("button", { name: /\$PEPE/ }).first().click(); await p.waitForTimeout(500); await p.getByRole("button", { name: "Review raid" }).click(); await p.waitForTimeout(800); }],
  ["start-coins", "/start", async (p) => { await p.getByRole("button", { name: "Let’s go" }).click(); await p.waitForTimeout(500); for (const s of ["PEPE", "TRUMP", "SHITZU"]) await p.getByRole("button", { name: new RegExp(`\\$${s}`) }).click(); await p.waitForTimeout(500); }],
  ["start-done", "/start", async (p) => { await p.getByRole("button", { name: "Let’s go" }).click(); await p.waitForTimeout(400); for (const s of ["PEPE", "TRUMP", "SHITZU"]) await p.getByRole("button", { name: new RegExp(`\\$${s}`) }).click(); await p.getByRole("button", { name: "Build my tape" }).click(); await p.waitForTimeout(400); await p.getByRole("button", { name: "Continue" }).click(); await p.waitForTimeout(400); await p.getByRole("button", { name: "Maybe later" }).click(); await p.waitForTimeout(1600); }],
];
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
for (const [name, path, act] of PAGES) {
  if (only && !name.startsWith(only)) continue;
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
    const full = !act && process.env.FULL !== "0";
    const f = `${OUT}/${name}${theme === "light" ? "-light" : ""}-${W}.png`;
    await p.screenshot({ path: f, fullPage: full });
    console.log(f.split("/").pop(), sw.join("/"), sw[0] > sw[1] ? "OVERFLOW" : "ok", errs.length ? "ERR " + [...new Set(errs)].join(" | ") : "");
    await ctx.close();
  }
}
await b.close();
