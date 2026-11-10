import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { marks } from './marks.mjs';
const opt = (k, title, note) => `
<section><h2>Option ${k} · ${title}</h2><p>${note}</p>
<div class="row">
  <div class="tile big">${marks[k]('#7C5CFF', '#fff', `g${k}1`)}</div>
  <div class="tile">${marks[k]('#0A0A0B', '#fff')}<span>mono dark</span></div>
  <div class="tile light">${marks[k]('#0A0A0B', '#fff')}<span>on light</span></div>
  <div class="tile">${marks[k]('#fff', '#0A0A0B')}<span>inverse</span></div>
  <div class="sizes">${[64, 32, 16].map((s) => `<div style="width:${s}px;height:${s}px">${marks[k]('#7C5CFF', '#fff', `g${k}${s}`)}</div>`).join('')}<span>64 · 32 · 16 px</span></div>
  <div class="word"><div style="width:40px;height:40px">${marks[k]('#7C5CFF', '#fff', `g${k}w`)}</div><b>Called</b><small>wordmark set in the BRAND name (one config constant)</small></div>
</div></section>`;
const html = `<!doctype html><html><head><style>
body{margin:0;background:#0A0A0B;color:#EDEDEF;font:15px Inter,system-ui,sans-serif;padding:48px 56px;width:1400px}
h1{font-size:34px;letter-spacing:-.03em;margin:0 0 6px} .lead{color:#8A8F98;margin:0 0 32px}
section{border:1px solid #1F1F23;border-radius:20px;padding:24px 28px;margin-bottom:20px;background:#111113}
h2{margin:0;font-size:19px;letter-spacing:-.02em} p{color:#8A8F98;margin:6px 0 18px}
.row{display:flex;gap:20px;align-items:center}.tile{width:120px;height:120px;border-radius:16px;background:#17171A;display:grid;place-items:center;position:relative}
.tile svg{width:64px;height:64px}.tile.big{width:150px;height:150px;background:radial-gradient(circle at 50% 40%,#1b1f35,#111113)}.tile.big svg{width:104px;height:104px}
.tile.light{background:#F4F4F5}.tile span,.sizes span{position:absolute;bottom:-22px;font-size:12px;color:#8A8F98}
.sizes{display:flex;gap:16px;align-items:end;position:relative;padding:0 8px}.sizes svg{width:100%;height:100%}
.word{display:flex;align-items:center;gap:12px;margin-left:auto}.word svg{width:100%;height:100%}.word b{font-size:30px;letter-spacing:-.04em}.word small{display:block;color:#8A8F98;width:140px;font-size:12px}
.pick{color:#22D3A6;font-weight:600}
</style></head><body><h1>Brand mark · 3 options</h1><p class="lead">Mark-only logos so the product name can change without touching the icon. Signature gradient: Aurora (#6E7BFF → #22D3A6), blue for odds, mint for a winning call. <span class="pick">Applied: Option A.</span></p>
${opt('A', 'Rising check (applied)', 'A call that keeps rising: the check turns into an up-arrow. Reads as “called it” and “odds up”. Clearest at 16px.')}
${opt('B', 'Split orb', 'Yes and No halves of a single market. Calm and geometric; less expressive about winning.')}
${opt('C', 'Proof seal', 'A hexagonal stamp around a pulse: verifiable results. Busy below 24px.')}
</body></html>`;
writeFileSync('/tmp/brand-sheet.html', html);
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1512, height: 900 }, deviceScaleFactor: 2 });
await p.goto('file:///tmp/brand-sheet.html'); await p.waitForTimeout(400);
await p.screenshot({ path: '/workspace/called/brand/options.png', fullPage: true });
// assets for the applied mark (A)
writeFileSync('/workspace/called/brand/mark.svg', marks.A('#7C5CFF'));
writeFileSync('/workspace/called/brand/mark-mono.svg', marks.A('#0A0A0B'));
writeFileSync('/workspace/called/brand/favicon.svg', marks.A('#7C5CFF'));
await p.setViewportSize({ width: 1024, height: 1024 });
await p.setContent(`<html><body style="margin:0;background:transparent">${marks.A('#7C5CFF', '#fff').replace('<svg ', '<svg width="1024" height="1024" ')}</body></html>`);
await p.screenshot({ path: '/workspace/called/brand/app-icon-1024.png', omitBackground: true, clip: { x: 0, y: 0, width: 1024, height: 1024 } });
await b.close();
