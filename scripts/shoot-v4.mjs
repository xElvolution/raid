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
  if (only && !only.split(",").some((o) => name === o)) continue;
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
