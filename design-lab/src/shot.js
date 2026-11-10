const {chromium}=require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
(async()=>{const [,,url,out,w,h]=process.argv;const b=await chromium.launch();const p=await b.newPage({viewport:{width:+w||390,height:+h||844},deviceScaleFactor:2});
await p.goto(url);await p.waitForTimeout(400);await p.screenshot({path:out,fullPage:true});await b.close()})();
