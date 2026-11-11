// Phantom / MetaMask backing screens with test wallets injected (throwaway keys, never funded): connect, sign, verify.
// node shoot-keyless.mjs ; env BASE (dev :3410), OUT, WIDTHS, THEMES, RAID (default 5)
import { chromium } from "playwright-core";
import { createRequire } from "node:module";
import nacl from "tweetnacl";
import bs58 from "bs58";
import fs from "node:fs";
const { Wallet } = createRequire(new URL("../web/package.json", import.meta.url))("ethers");
const BASE = process.env.BASE || "http://localhost:3410";
const OUT = process.env.OUT || "/workspace/raid/scripts/shots/prod/v4";
const RAID = process.env.RAID || "5";
fs.mkdirSync(OUT, { recursive: true });
const WIDTHS = (process.env.WIDTHS || "360,390,1440").split(",").map(Number);
const THEMES = (process.env.THEMES || "dark,light").split(",");
const evm = Wallet.createRandom();
const sol = nacl.sign.keyPair();
const solAddr = bs58.encode(sol.publicKey);
const tab = async (p) => { await p.getByRole("tab", { name: /Phantom/ }).click(); await p.waitForTimeout(2500); };
const scrollTo = async (p, re) => { await p.getByText(re).first().evaluate((e) => { const y = e.getBoundingClientRect().top + scrollY - 125; scrollTo(0, y); }); await p.waitForTimeout(500); };
const SHOTS = [
  ["keyless-connect", async (p) => { await tab(p); await scrollTo(p, /No NEAR account needed/); }],
  ["keyless-metamask", async (p) => { await tab(p); await p.getByRole("button", { name: "MetaMask" }).click(); await p.waitForTimeout(3000); await scrollTo(p, /stake account/); }],
  ["keyless-metamask-signed", async (p) => { await tab(p); await p.getByRole("button", { name: "MetaMask" }).click(); await p.waitForTimeout(1500); await p.getByRole("button", { name: /Sign back intent/ }).click(); await p.getByText(/simulate_intents/).waitFor({ timeout: 20000 }); await scrollTo(p, /Already hold USDC/); }],
  ["keyless-phantom-signed", async (p) => { await tab(p); await p.getByRole("button", { name: "Phantom" }).click(); await p.waitForTimeout(1500); await p.getByRole("button", { name: /Sign back intent/ }).click(); await p.getByText(/simulate_intents/).waitFor({ timeout: 20000 }); await scrollTo(p, /Already hold USDC/); }],
];
const metrics = () => ({ sw: document.documentElement.scrollWidth, vw: innerWidth, bodyFs: getComputedStyle(document.body).fontSize,
  offenders: [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== "fixed").slice(0, 3).map((e) => e.tagName + "." + String(e.className).slice(0, 40)) });
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const only = process.argv[2];
for (const [name, act] of SHOTS) {
  if (only && !only.split(",").includes(name)) continue;
  for (const theme of THEMES) for (const W of WIDTHS) {
    const H = W === 360 ? 780 : W === 390 ? 844 : 900;
    const ctx = await b.newContext(W < 800 ? { viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: W, height: H } });
    await ctx.addInitScript((t) => localStorage.setItem("raid.theme", t), theme);
    await ctx.exposeFunction("__evmSign", async (hex) => evm.signMessage(Buffer.from(hex.slice(2), "hex").toString("utf8")));
    await ctx.exposeFunction("__solSign", async (bytes) => Array.from(nacl.sign.detached(new Uint8Array(bytes), sol.secretKey)));
    await ctx.addInitScript(([addr, solA]) => {
      window.ethereum = { isMetaMask: true, request: async ({ method, params }) => method === "eth_requestAccounts" ? [addr] : method === "personal_sign" ? window.__evmSign(params[0]) : null };
      const pk = { toString: () => solA };
      window.phantom = { solana: { isPhantom: true, connect: async () => ({ publicKey: pk }), signMessage: async (m) => ({ signature: new Uint8Array(await window.__solSign(Array.from(m))), publicKey: pk }) } };
    }, [evm.address, solAddr]);
    const p = await ctx.newPage(); const errs = [];
    p.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
    await p.goto(`${BASE}/raids/${RAID}`, { waitUntil: "load", timeout: 90000 }); await p.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {}); await p.waitForTimeout(1500);
    await act(p).catch((e) => errs.push("action: " + e.message.slice(0, 140)));
    const m = await p.evaluate(metrics);
    await p.screenshot({ path: `${OUT}/${name}-${theme}-${W}.png` });
    console.log(`${name}-${theme}-${W} sw=${m.sw}/${m.vw}${m.sw > m.vw ? " OVERFLOW " + m.offenders.join(",") : ""} body=${m.bodyFs}${errs.length ? " ERR " + errs.join(" | ") : ""}`);
    await ctx.close();
  }
}
await b.close();
