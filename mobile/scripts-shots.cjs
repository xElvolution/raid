// Dev-only: renders the web target at 390x844 for review stills. Usage: node scripts-shots.cjs [base]
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const base = process.argv[2] || 'http://localhost:8081';
const api = process.env.API || 'http://localhost:8799';
(async () => {
  const tok = (await (await fetch(api + '/v1/auth/demo', { method: 'POST' })).json()).token;
  const b = await chromium.launch();
  const errs = [];
  async function shot(name, path, { theme = 'dark', auth = true, wait = 2500, act } = {}) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: theme });
    await ctx.addInitScript(([t, th, a]) => { if (a) localStorage.setItem('called.token', t); else localStorage.removeItem('called.token'); localStorage.setItem('theme', th); }, [tok, theme, auth]);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(name + ': ' + e.message));
    await p.goto(base + path); await p.waitForTimeout(wait);
    if (act) await act(p);
    await p.screenshot({ path: `shots/${name}.png` }); await ctx.close();
  }
  await shot('01-splash', '/', { auth: false, wait: 600 });
  await shot('02-onboarding', '/onboarding', { auth: false });
  await shot('03-signin', '/signin', { auth: false });
  await shot('04-home-dark', '/home', { wait: 4000 });
  await shot('05-home-light', '/home', { theme: 'light', wait: 4000 });
  await shot('06-feed', '/feed', { wait: 4000 });
  await shot('07-market', '/market/35798', { wait: 3500 });
  await shot('08-trade-sheet', '/market/35798', { wait: 3500, act: async (p) => { await p.getByText('BULLS · 19¢', { exact: true }).click(); await p.waitForTimeout(900); } });
  await shot('09-callit', '/callit');
  await shot('10-explore', '/explore', { wait: 4000 });
  await shot('11-portfolio', '/portfolio', { wait: 3500 });
  await shot('12-profile-dark', '/u/ada', { wait: 4000 });
  await shot('13-profile-light', '/u/ada', { theme: 'light', wait: 4000 });
  await shot('14-profile-scrolled', '/u/ada', { wait: 4000, act: async (p) => { await p.mouse.move(200, 500); await p.mouse.wheel(0, 700); await p.waitForTimeout(800); } });
  await shot('15-my-profile', '/profile', { wait: 4000 });
  await shot('16-notifications', '/notifications', { wait: 3000 });
  await shot('17-settings', '/settings');
  await shot('18-calledit', '/calledit?q=Will%20GTA%20VI%20launch%20on%20its%20announced%20date%3F&amt=7042', { wait: 1400 });
  console.log(errs.join('\n') || 'no page errors');
  await b.close();
})();
