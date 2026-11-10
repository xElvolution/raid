import { chromium } from "/workspace/raid/scripts/node_modules/playwright-core/index.mjs";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
for (const n of ["a","b","c"]) for (const [w,h] of [[390,844],[1440,900]]) { const p = await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:w<800?2:1}); await p.goto(`file:///workspace/raid/design-dirs/${n}.html`); await p.waitForTimeout(1500); await p.screenshot({path:`/workspace/raid/design-dirs/${n}-${w}.png`}); await p.close(); }
await b.close();
