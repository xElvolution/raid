// node shoot-v4.mjs [filter] ; env BASE (default dev :3410), OUT, WIDTHS=360,390,1440, THEMES=dark,light, FULL=1
// Writes <name>-<theme>-<w>-fold.png (+ -full.png) and prints overflow + key size metrics.
import { chromium } from "playwright-core";
import fs from "node:fs";
const BASE = process.env.BASE || "http://localhost:3410";
const OUT = process.env.OUT || "/workspace/raid/scripts/shots/prod/v4";
fs.mkdirSync(OUT, { recursive: true });
const only = process.argv[2];
const WIDTHS = (process.env.WIDTHS || "390,1440").split(",").map(Number);
const THEMES = (process.env.THEMES || "dark,light").split(",");
const FULL = process.env.FULL !== "0";
const openCall = async (p) => { await p.getByRole("button", { name: "Call a raid" }).first().click(); await p.waitForTimeout(800); await p.getByRole("dialog").getByRole("button", { name: /\$PEPE/ }).first().click(); await p.waitForTimeout(900); };
const toText = async (p, re) => { const el = p.getByText(re).first(); await el.waitFor({ timeout: 15000 }).catch(() => {}); await el.evaluate((e) => scrollTo(0, e.getBoundingClientRect().top + scrollY - 120)).catch(() => {}); await p.waitForTimeout(700); };
const PAGES = [
  ["war", "/war"],
  ["judges", "/judges"],
  ["landing", "/"],
  ["raids", "/raids"],
  ["raid", "/raids/3"],
  ["back-wallet", "/raids/3", async (p) => { const t = p.getByRole("tab", { name: /Phantom|MetaMask/ }).first(); await t.click(); await p.waitForTimeout(1500); await t.evaluate((e) => { const y = e.getBoundingClientRect().top + scrollY - 110; scrollTo(0, y); }); await p.waitForTimeout(400); }],
  ["reels", "/reels"],
  ["reels-top", "/reels/top"],
  ["feed", "/feed"],
  // Testnet E2E rehearsal (raid #6): one shot per step. Run with OUT=…/v4/e2e WIDTHS=390 node shoot-v4.mjs e2e-
  ["e2e-01-war-score", "/war"],
  ["e2e-02-crew-proposal", "/war", (p) => toText(p, /E2E rehearsal/)],
  ["e2e-03-raid-called-by-dao", "/raids/6"],
  ["e2e-04-backers", "/raids/6", (p) => toText(p, /^Crew · /)],
  ["e2e-05-phantom-metamask", "/raids/6", async (p) => { const t = p.getByRole("tab", { name: /Phantom|MetaMask/ }).first(); await t.click(); await p.waitForTimeout(1500); await t.evaluate((e) => { const y = e.getBoundingClientRect().top + scrollY - 110; scrollTo(0, y); }); await p.waitForTimeout(400); }],
  ["e2e-06-reel", "/reels"],
  ["e2e-07-reel-board", "/reels/top"],
  ["e2e-08-launchpad", "/launch", (p) => toText(p, /E2E Rehearsal|E2EF9TQM/)],
  ["e2e-09-countdown-over-mpc", "/raids/6", (p) => toText(p, /^Raid progress$/i)],
  ["e2e-10-reel-back-receipt", "/raids/6", (p) => toText(p, /^Back this raid$/i)],
];
const metrics = () => {
  const vh = innerHeight, vw = innerWidth;
  const vis = (r) => r.width > 0 && r.height > 0 && r.top < vh && r.bottom > 0;
  let maxFs = 0, maxFsText = "";
  for (const el of document.querySelectorAll("body *")) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect(); if (!vis(r)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize); if (fs > maxFs) { maxFs = fs; maxFsText = el.textContent.trim().slice(0, 24); }
  }
  const btns = [...document.querySelectorAll("button, a.press, [role=dialog] button")].map((b) => b.getBoundingClientRect()).filter(vis);
  const maxBtn = Math.max(0, ...btns.filter((r) => r.width > 80).map((r) => Math.round(r.height)));
  const hdr = document.querySelector("header")?.getBoundingClientRect().height;
  const tab = document.querySelector('nav[aria-label="Tabs"]')?.getBoundingClientRect().height;
  const bodyFs = getComputedStyle(document.body).fontSize;
  const offenders = [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > vw + 1 && getComputedStyle(e).position !== "fixed").slice(0, 3).map((e) => e.tagName + "." + String(e.className).slice(0, 40));
  return { sw: document.documentElement.scrollWidth, vw, maxFs, maxFsText, maxBtn, hdr: hdr && Math.round(hdr), tab: tab && Math.round(tab), bodyFs, offenders };
};
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const rows = [];
for (const [name, path, act] of PAGES) {
  if (only && !only.split(",").some((o) => name === o || (o.endsWith("-") && name.startsWith(o)))) continue;
  for (const theme of THEMES) for (const W of WIDTHS) {
    const H = W === 360 ? 780 : W === 390 ? 844 : 900;
    const ctx = await b.newContext(W < 800 ? { viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: W, height: H } });
    await ctx.addInitScript((t) => localStorage.setItem("raid.theme", t), theme);
    const p = await ctx.newPage(); const errs = [];
    p.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
    await p.goto(BASE + path, { waitUntil: "load", timeout: 90000 }); await p.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {}); await p.waitForTimeout(2000);
    if (act) await act(p).catch((e) => errs.push("action: " + e.message.slice(0, 120)));
    const m = await p.evaluate(metrics);
    const base = `${OUT}/${name}-${theme}-${W}`;
    await p.screenshot({ path: `${base}-fold.png` });
    if (FULL && !act) { await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } scrollTo(0, 0); }); await p.waitForTimeout(600); await p.screenshot({ path: `${base}-full.png`, fullPage: true }); }
    const line = `${name}-${theme}-${W} sw=${m.sw}/${m.vw}${m.sw > m.vw ? " OVERFLOW " + m.offenders.join(",") : ""} body=${m.bodyFs} maxFs=${m.maxFs}("${m.maxFsText}") maxBtn=${m.maxBtn} hdr=${m.hdr} tab=${m.tab}${errs.length ? " ERR " + [...new Set(errs)].join(" | ") : ""}`;
    console.log(line); rows.push(line);
    await ctx.close();
  }
}
fs.writeFileSync(`${OUT}/metrics${process.env.TAG ? "-" + process.env.TAG : ""}.txt`, rows.join("\n") + "\n");
await b.close();
