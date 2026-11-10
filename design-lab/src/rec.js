const {chromium}=require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
(async()=>{const D=process.argv[2];const b=await chromium.launch();const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,recordVideo:{dir:'/tmp/vid'+D,size:{width:780,height:1688}}});
const p=await c.newPage();await p.goto(`file://${__dirname}/lab.html?d=${D}&s=reel`);await p.waitForFunction('window.REEL_DONE',null,{timeout:30000});await p.waitForTimeout(1600);const v=p.video();await c.close();console.log(await v.path());await b.close()})();
