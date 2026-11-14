(() => {
  const $ = id => document.getElementById(id);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isPhone = () => innerWidth <= 640;
  const DPR = () => Math.min(devicePixelRatio || 1, 2);
  const ease = x => 1 - Math.pow(1 - x, 3);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const MONO = 'GeistMono, ui-monospace, monospace', SANS = 'Geist, system-ui, sans-serif';
  const C = {fire:'#ff5b2e',fire2:'#ff8a4c',up:'#35f0a1',red:'#ff4d6a',ink:'#eef1f6',mute:'#8b93a3',dim:'#5b6372',line:'#1e222c',line2:'#2a2f3a',amber:'#ffcf6b',panel:'#0c0e13'};

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {rootMargin:'0px 0px -8% 0px'});
  document.querySelectorAll('.rv').forEach(el => io.observe(el));

  /* visibility gate for animated things */
  const vis = new Map();
  const vio = new IntersectionObserver(es => es.forEach(e => vis.set(e.target, e.isIntersecting)), {rootMargin:'100px'});
  const watch = el => { vis.set(el, false); vio.observe(el); };
  const seen = el => vis.get(el);

  /* ---------- nav progress + active link ---------- */
  const bp = $('barprog'), links = [...document.querySelectorAll('#links a')];
  const secs = links.map(a => document.querySelector(a.getAttribute('href')));
  function onScroll(){
    const h = document.documentElement.scrollHeight - innerHeight;
    bp.style.width = (h > 0 ? scrollY / h * 100 : 0) + '%';
    let on = -1; secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.35) on = i; });
    links.forEach((a, i) => a.classList.toggle('on', i === on));
  }
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  /* ---------- canvas helper ---------- */
  function fit(cv){ const r = cv.getBoundingClientRect(), d = DPR(); const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d)); if (cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; } return {W:w, H:h, d}; }
  function rr(x, y, w, h, r, c){ c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  /* ---------- 01 problem duel ---------- */
  function mkPath(n, f){ const a = []; for (let i = 0; i < n; i++) a.push(f(i / (n - 1), i)); return a; }
  seed = 5;
  const badP = mkPath(160, (p) => { const up = p < .46 ? 1 + 1.45 * Math.pow(p / .46, 1.6) : 2.45 - 2.0 * ease(clamp((p - .46) / .3, 0, 1)); return up + (rnd() - .5) * .07; });
  seed = 9;
  const goodP = mkPath(160, (p) => { let v = p < .86 ? 1.03 + 0.97 * Math.pow(p / .86, 1.3) - .12 * Math.sin(p * 11) * (1 - p) : 2.02 + .03 * Math.sin(p * 30); v += (rnd() - .5) * .05; return p < .86 ? clamp(v, 1.02, 1.96) : Math.max(v, 2.01); });
  function drawDuel(cv, path, good, t){
    const {W, H, d} = fit(cv), c = cv.getContext('2d'); c.clearRect(0, 0, W, H);
    const ph = isPhone(), pl = 10 * d, pr = 10 * d, pt = 30 * d, pb = 26 * d, lo = .3, hi = 2.7;
    const X = i => pl + (W - pl - pr) * i / (path.length - 1), Y = v => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
    const fs = (ph ? 8.5 : 10.5) * d; c.font = `500 ${fs}px ${MONO}`; c.textBaseline = 'middle';
    c.strokeStyle = 'rgba(255,255,255,.04)'; c.lineWidth = d; for (let g = .5; g <= 2.5; g += .5){ c.beginPath(); c.moveTo(pl, Y(g)); c.lineTo(W - pr, Y(g)); c.stroke(); }
    c.setLineDash([2 * d, 4 * d]); c.strokeStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.moveTo(pl, Y(1)); c.lineTo(W - pr, Y(1)); c.stroke(); c.setLineDash([]);
    if (good){ c.setLineDash([6 * d, 5 * d]); c.strokeStyle = C.fire; c.lineWidth = 1.5 * d; c.beginPath(); c.moveTo(pl, Y(2)); c.lineTo(W - pr, Y(2)); c.stroke(); c.setLineDash([]);
      c.fillStyle = 'rgba(255,77,106,.035)'; c.fillRect(pl, Y(2), W - pl - pr, Y(lo) - Y(2)); c.fillStyle = C.fire2; c.fillText('LINE 2.00x', pl + 4 * d, Y(2) - 9 * d); }
    const n = Math.max(2, Math.floor(path.length * clamp(t / .82, 0, 1)));
    const col = good ? C.up : (n > 80 ? C.red : C.up);
    c.beginPath(); c.moveTo(X(0), Y(path[0])); for (let i = 1; i < n; i++) c.lineTo(X(i), Y(path[i]));
    c.strokeStyle = col; c.lineWidth = 2 * d; c.lineJoin = 'round'; c.shadowColor = col; c.shadowBlur = 10 * d; c.stroke(); c.shadowBlur = 0;
    const dot = (i, color, label, above, ring) => { if (n <= i) return; const x = X(i), y = Y(path[i]); c.fillStyle = color; c.beginPath(); c.arc(x, y, 4 * d, 0, 7); c.fill(); if (ring){ c.strokeStyle = color; c.beginPath(); c.arc(x, y, 9 * d, 0, 7); c.stroke(); }
      if (label){ const w = c.measureText(label).width; let tx = clamp(x - w / 2, pl, W - pr - w); c.fillStyle = color; c.fillText(label, tx, y + (above ? -14 : 15) * d); } };
    if (!good){
      dot(4, C.up, ph ? 'caller in' : 'caller buys early', false);
      [52, 60, 66, 70].forEach((i, k) => dot(i, C.amber, k === 0 ? (ph ? 'crowd in' : 'followers buy here') : '', false));
      dot(74, C.red, ph ? 'caller out' : 'caller sells', true, true);
      if (n > 150){ const lbl = ph ? 'bag: -55%' : 'followers hold: -55%'; c.fillStyle = C.red; c.font = `600 ${fs}px ${MONO}`; const w = c.measureText(lbl).width; c.fillText(lbl, W - pr - w, Y(path[159]) - 14 * d); }
    } else {
      dot(2, C.fire, ph ? 'one buy' : 'chest buys once', false);
      [40, 70, 98].forEach(i => { if (n > i){ const x = X(i), y = Y(path[i]); c.strokeStyle = C.red; c.lineWidth = 1.5 * d; c.beginPath(); c.moveTo(x - 3 * d, y - 3 * d); c.lineTo(x + 3 * d, y + 3 * d); c.moveTo(x + 3 * d, y - 3 * d); c.lineTo(x - 3 * d, y + 3 * d); c.stroke(); } });
      if (n > 50 && n < 140){ c.fillStyle = 'rgba(255,120,140,.8)'; c.fillText(ph ? 'sells refused' : 'early sells refused', pl + 4 * d, Y(2) + 12 * d); }
      dot(138, C.up, ph ? 'all out 2x' : 'everyone exits at 2.00x', true, true);
    }
    // head
    const hx = X(n - 1), hy = Y(path[n - 1]); c.fillStyle = '#fff'; c.beginPath(); c.arc(hx, hy, 3 * d, 0, 7); c.fill();
  }
  const pvB = $('pvBad'), pvG = $('pvGood'); watch(pvB);

  /* ---------- 02 stage ---------- */
  const stage = $('stage'), sc = stage.getContext('2d'); watch(stage);
  const stepsEl = [...document.querySelectorAll('#howSteps li')];
  const NAMES = ['Call','Back','Countdown','Buy','Locked','Line hit','Paid'];
  const FOOT = ['coin · line · retreat, on chain','USDC in from any wallet','public · buy time on chain','one swap · signed by the network','sells below the line refused','sold once, same price for all','fees only from profit'];
  const STEP_T = 5.2;
  let cur = 0, stepStart = performance.now(), playing = !RM;
  function setStep(i, user){ cur = (i + 7) % 7; stepStart = performance.now(); stepsEl.forEach((li, k) => li.classList.toggle('on', k === cur)); $('stLabel').textContent = `0${cur + 1} · ${NAMES[cur]}`; $('stFoot').textContent = FOOT[cur]; if (RM) requestAnimationFrame(() => drawStage(performance.now())); if (user && !isPhone()){ playing = false; $('stPlay').textContent = '▶'; $('stPlay').setAttribute('aria-label','Play'); } }
  stepsEl.forEach((li, i) => li.querySelector('button').addEventListener('click', () => setStep(i, true)));
  $('stPrev').onclick = () => setStep(cur - 1, true); $('stNext').onclick = () => setStep(cur + 1, true);
  $('stPlay').onclick = () => { playing = !playing; stepStart = performance.now(); $('stPlay').textContent = playing ? '❚❚' : '▶'; $('stPlay').setAttribute('aria-label', playing ? 'Pause' : 'Play'); };
  // phone: scroll drives steps
  const sio = new IntersectionObserver(es => { if (!isPhone()) return; es.forEach(e => { if (e.isIntersecting){ const i = stepsEl.indexOf(e.target); if (i !== cur) setStep(i); } }); }, {rootMargin:'-55% 0px -40% 0px'});
  stepsEl.forEach(li => sio.observe(li));

  seed = 21; const lockP = mkPath(120, p => clamp(1.08 + .8 * Math.pow(p, 1.1) - .14 * Math.sin(p * 13) * (1 - p * .6) + (rnd() - .5) * .05, 1.04, 1.95));
  function drawStage(now){
    const {W, H, d} = fit(stage), c = sc; c.clearRect(0, 0, W, H);
    const s = W / 600; const VH = H / s; const cy = VH / 2;
    c.save(); c.scale(s, s);
    const px = v => v * d / s; // real css px -> virtual
    const ph = isPhone();
    const F = (size, w = 500, fam = MONO) => { c.font = `${w} ${px(size)}px ${fam}`; };
    const lt = playing ? (now - stepStart) / 1000 : 3.2; const k = clamp(lt / 3.2, 0, 1);
    c.textBaseline = 'middle'; c.textAlign = 'center';
    // background grid
    c.strokeStyle = 'rgba(255,255,255,.035)'; c.lineWidth = px(1);
    for (let x = 0; x <= 600; x += 40){ c.beginPath(); c.moveTo(x, 0); c.lineTo(x, VH); c.stroke(); }
    for (let y = (cy % 40); y <= VH; y += 40){ c.beginPath(); c.moveTo(0, y); c.lineTo(600, y); c.stroke(); }
    const chest = (x, y, a = 1, label = 'CHEST', lock = false) => {
      c.globalAlpha = a; const w = 128, h = 86;
      c.shadowColor = 'rgba(255,91,46,.5)'; c.shadowBlur = px(24);
      rr(x - w / 2, y - h / 2, w, h, 14, c); c.fillStyle = '#0d0f15'; c.fill(); c.shadowBlur = 0;
      c.strokeStyle = C.fire; c.lineWidth = px(1.5); c.stroke();
      c.beginPath(); c.moveTo(x - w / 2, y - h / 2 + 26); c.lineTo(x + w / 2, y - h / 2 + 26); c.strokeStyle = C.line2; c.lineWidth = px(1); c.stroke();
      F(10.5); c.fillStyle = C.mute; c.fillText(label, x, y - h / 2 + 13);
      if (lock){ c.strokeStyle = C.red; c.lineWidth = px(2); c.beginPath(); c.arc(x, y + 4, 8, Math.PI, 0); c.stroke(); rr(x - 12, y + 4, 24, 18, 4, c); c.fillStyle = C.red; c.fill(); }
      c.globalAlpha = 1; };
    const pill = (x, y, txt, col = C.ink, bg = '#11141b', bd = C.line2, size = 11) => { F(size, 600); const w = c.measureText(txt).width + px(16), h = px(size + 11); rr(x - w / 2, y - h / 2, w, h, px(6), c); c.fillStyle = bg; c.fill(); c.strokeStyle = bd; c.lineWidth = px(1); c.stroke(); c.fillStyle = col; c.fillText(txt, x, y + px(.5)); return w; };
    const CX = 300;
    if (cur === 0){
      if (!ph) chest(CX, cy + 70, .25);
      const yy = lerp(cy - 160, cy - 40, ease(clamp(k * 1.6, 0, 1)));
      const tw = 300, th = 150; rr(CX - tw / 2, yy - th / 2, tw, th, 12, c); c.fillStyle = '#0f1218'; c.fill(); c.strokeStyle = C.line2; c.lineWidth = px(1); c.stroke();
      c.textAlign = 'left'; const rows = [['COIN','$TRUMP'],['LINE','2.00x'],['RETREAT','48 hours'],['CALLER','Frog Legion DAO']];
      rows.forEach((r, i) => { const ry = yy - th / 2 + 26 + i * 33; const show = clamp((k * 1.6 - .3 - i * .15) * 3, 0, 1); c.globalAlpha = show; F(10.5); c.fillStyle = C.dim; c.fillText(r[0], CX - tw / 2 + 18, ry); F(14, 600, SANS); c.fillStyle = i === 1 ? C.fire : C.ink; c.fillText(r[1], CX - tw / 2 + 110, ry); c.globalAlpha = 1;
        if (i < 3){ c.beginPath(); c.moveTo(CX - tw / 2 + 14, ry + 16); c.lineTo(CX + tw / 2 - 14, ry + 16); c.strokeStyle = C.line; c.stroke(); } });
      c.textAlign = 'center';
      if (k > .75){ const a = clamp((k - .75) * 6, 0, 1); c.save(); c.translate(CX + 118, yy + th / 2 + 4); c.rotate(-.12); c.scale(lerp(1.6, 1, a), lerp(1.6, 1, a)); c.globalAlpha = a; rr(-54, -16, 108, 32, 6, c); c.strokeStyle = C.up; c.lineWidth = px(2); c.stroke(); F(12, 700); c.fillStyle = C.up; c.fillText('ON CHAIN', 0, 1); c.restore(); c.globalAlpha = 1; }
    }
    if (cur === 1 || cur === 2){
      const srcs = [['N','NEAR wallet','#e9ecf2'],['M','MetaMask','#f6a04d'],['P','Phantom','#a99bff']];
      const sy = i => cy + (i - 1) * (ph ? 78 : 92);
      srcs.forEach((sx, i) => { const y = sy(i), x = 74; c.globalAlpha = cur === 2 ? .3 : 1;
        rr(x - 18, y - 18, 36, 36, 9, c); c.fillStyle = sx[2]; c.fill(); F(14, 700); c.fillStyle = '#0b0c10'; c.fillText(sx[0], x, y + 1);
        F(10); c.fillStyle = C.mute; c.fillText(sx[1], x, y + 32); if (i) { F(9); c.fillStyle = C.dim; c.fillText('via Intents', x, y + 46); }
        // curve
        c.beginPath(); c.moveTo(x + 22, y); c.bezierCurveTo(180, y, 190, cy, CX - 66, cy); c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = px(1.2); c.stroke();
        if (cur === 1) for (let p = 0; p < 4; p++){ const tt = ((lt * .55 + p / 4 + i * .13) % 1); const bx = (t) => { const a = 1 - t; return [a*a*a*(x+22) + 3*a*a*t*180 + 3*a*t*t*190 + t*t*t*(CX-66), a*a*a*y + 3*a*a*t*y + 3*a*t*t*cy + t*t*t*cy]; }; const [qx, qy] = bx(tt); c.fillStyle = C.up; c.shadowColor = C.up; c.shadowBlur = px(8); c.beginPath(); c.arc(qx, qy, 3.2, 0, 7); c.fill(); c.shadowBlur = 0; }
        c.globalAlpha = 1; });
      chest(CX, cy, 1, 'CHEST · RAID #6');
      const amt = cur === 1 ? Math.round(4820 * ease(clamp(lt / 4.6, 0, 1))) : 4820;
      F(20, 600); c.fillStyle = C.ink; c.fillText(amt.toLocaleString('en-US'), CX, cy + 8); F(9.5); c.fillStyle = C.mute; c.fillText('USDC', CX, cy + 28);
      if (cur === 2){
        const p = clamp(lt / 4.6, 0, 1), R = 96; c.lineWidth = 6; c.strokeStyle = C.line; c.beginPath(); c.arc(CX, cy, R, 0, 7); c.stroke();
        c.strokeStyle = C.fire; c.lineCap = 'round'; c.beginPath(); c.arc(CX, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p)); c.stroke(); c.lineCap = 'butt';
        for (let i = 0; i < 60; i++){ const a = i / 60 * Math.PI * 2; const r1 = R + 12, r2 = R + (i % 5 ? 16 : 22); c.strokeStyle = i / 60 < (1 - p) ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.06)'; c.lineWidth = px(1); c.beginPath(); c.moveTo(CX + Math.cos(a - Math.PI / 2) * r1, cy + Math.sin(a - Math.PI / 2) * r1); c.lineTo(CX + Math.cos(a - Math.PI / 2) * r2, cy + Math.sin(a - Math.PI / 2) * r2); c.stroke(); }
        const secs = Math.round(600 * (1 - p)); const tx = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
        F(30, 600); c.textAlign = 'left'; c.fillStyle = C.ink; c.fillText(tx, CX + R + 40, cy - 10); F(10); c.fillStyle = C.mute; c.fillText('UNTIL THE BUY', CX + R + 40, cy + 16); c.textAlign = 'center';
      } else pill(CX, cy - 70, '37 backers · 10 min window', C.mute);
    }
    if (cur === 3){
      const ix = 445, tx = 548, p = clamp(lt / 3.4, 0, 1);
      chest(150, cy, 1, 'CHEST');
      F(18, 600); c.fillStyle = C.ink; c.fillText('4,820', 150, cy + 8); F(9.5); c.fillStyle = C.mute; c.fillText('USDC', 150, cy + 28);
      // beam
      c.strokeStyle = C.line2; c.lineWidth = px(2); c.beginPath(); c.moveTo(214, cy); c.lineTo(tx - 30, cy); c.stroke();
      const gx = lerp(214, tx - 30, ease(p)); const g = c.createLinearGradient(214, 0, gx, 0); g.addColorStop(0, 'rgba(255,91,46,.1)'); g.addColorStop(1, C.fire);
      c.strokeStyle = g; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(214, cy); c.lineTo(gx, cy); c.stroke(); c.lineCap = 'butt';
      // intents diamond
      c.save(); c.translate(ix, cy); c.rotate(Math.PI / 4); rr(-22, -22, 44, 44, 8, c); c.fillStyle = '#11141b'; c.fill(); c.strokeStyle = p > .55 ? C.fire : C.line2; c.lineWidth = px(1.5); c.stroke(); c.restore();
      F(10); c.fillStyle = C.mute; c.fillText('NEAR Intents', ix, cy + 46);
      // coin
      c.beginPath(); c.arc(tx, cy, 28, 0, 7); c.fillStyle = p > .95 ? 'rgba(53,240,161,.12)' : '#11141b'; c.fill(); c.strokeStyle = p > .95 ? C.up : C.line2; c.lineWidth = px(1.5); c.stroke(); F(12, 700); c.fillStyle = C.ink; c.fillText('$T', tx, cy + 1); F(10); c.fillStyle = C.mute; c.fillText('$TRUMP', tx, cy + 46);
      // signature
      const sp = clamp((lt - .3) / 1.6, 0, 1); c.save(); c.beginPath(); c.rect(240, cy - 120, 300 * sp, 80); c.clip();
      c.strokeStyle = C.up; c.lineWidth = px(2); c.lineCap = 'round'; c.beginPath(); for (let i = 0; i <= 120; i++){ const xx = 250 + i * 2.3, yy = cy - 82 + Math.sin(i * .21) * 12 * Math.sin(i * .05 + 1) + Math.cos(i * .53) * 4; i ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); c.restore();
      F(10.5, 600); c.fillStyle = sp > .9 ? C.up : C.dim; c.fillText('SIGNED BY CHAIN SIGNATURES · NO PERSON HOLDS A KEY', 330, cy - 120 + (ph ? 0 : 0));
      if (p > .95) pill(CX, cy + 92, 'ONE BUY · WHOLE POT', C.fire, 'rgba(255,91,46,.08)', 'rgba(255,91,46,.4)');
    }
    if (cur === 4 || cur === 5){
      const L = 40, R = 560, T = cy - (ph ? 120 : 130), B = cy + (ph ? 120 : 130), lo = .85, hi = 2.3;
      const X = i => L + (R - L) * i / 159, Y = v => T + (B - T) * (1 - (v - lo) / (hi - lo));
      // path: lockP for 120, then crossing 40
      const full = lockP.concat(mkPath(40, p => 1.95 + .25 * ease(p) + .02 * Math.sin(p * 20)));
      const n = cur === 4 ? Math.max(2, Math.floor(120 * clamp(lt / 4.2, .05, 1))) : 120 + Math.floor(40 * clamp(lt / 1.6, 0, 1));
      c.fillStyle = cur === 4 ? 'rgba(255,77,106,.05)' : 'rgba(255,77,106,.02)'; c.fillRect(L, Y(2), R - L, Y(lo) - Y(2));
      c.setLineDash([7, 6]); c.strokeStyle = cur === 5 && n > 125 ? C.up : C.fire; c.lineWidth = px(1.6); c.beginPath(); c.moveTo(L, Y(2)); c.lineTo(R, Y(2)); c.stroke();
      c.setLineDash([2, 5]); c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = px(1); c.beginPath(); c.moveTo(L, Y(1)); c.lineTo(R, Y(1)); c.stroke(); c.setLineDash([]);
      c.textAlign = 'left'; F(10.5, 600); c.fillStyle = C.fire2; c.fillText('THE LINE · 2.00x', L + 4, Y(2) - 13); c.fillStyle = C.dim; c.fillText('ENTRY 1.00x', L + 4, Y(1) + 13);
      c.beginPath(); c.moveTo(X(0), Y(full[0])); for (let i = 1; i < n; i++) c.lineTo(X(i), Y(full[i]));
      c.strokeStyle = C.up; c.lineWidth = px(2.2); c.lineJoin = 'round'; c.shadowColor = C.up; c.shadowBlur = px(10); c.stroke(); c.shadowBlur = 0;
      const hx = X(n - 1), hy = Y(full[n - 1]); c.fillStyle = '#fff'; c.beginPath(); c.arc(hx, hy, 4, 0, 7); c.fill();
      if (cur === 4){
        // sell attempts bouncing off the line
        [[30, .2], [62, 1.4], [96, 2.7]].forEach(([i, t0]) => { if (n <= i) return; const age = lt - t0; if (age < 0 || age > 1.6) return; const x = X(i), y0 = Y(full[i]), yl = Y(2);
          const up = clamp(age / .5, 0, 1), y = lerp(y0, yl + 6, ease(up)); c.strokeStyle = C.red; c.lineWidth = px(1.6); c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y); c.stroke();
          c.beginPath(); c.moveTo(x - 5, y + 6); c.lineTo(x, y); c.lineTo(x + 5, y + 6); c.stroke();
          if (age > .45) { c.globalAlpha = clamp(1.6 - age, 0, 1); pill(clamp(x, L + 70, R - 70), yl - 30, 'SELL REFUSED', C.red, 'rgba(255,77,106,.1)', 'rgba(255,77,106,.5)', 10); c.globalAlpha = 1; } });
        c.textAlign = 'right'; F(10); c.fillStyle = C.mute; c.fillText('LOCKED', R - 4, Y(1) + 13);
      } else if (n > 125){
        const ci = 121, x = X(ci), y = Y(2), a = clamp((lt - .4) * 1.2, 0, 1);
        for (let r = 0; r < 3; r++){ const rr2 = ((lt * .8 + r / 3) % 1); c.strokeStyle = `rgba(53,240,161,${.6 * (1 - rr2)})`; c.lineWidth = px(1.5); c.beginPath(); c.arc(x, y, 8 + rr2 * 50, 0, 7); c.stroke(); }
        c.fillStyle = C.up; c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill();
        c.globalAlpha = a; c.textAlign = 'center'; pill(clamp(x, L + 90, R - 90), y + 40, 'SOLD ONCE AT 2.00x', '#06110b', C.up, C.up, 11); c.globalAlpha = 1;
      }
      c.textAlign = 'center';
    }
    if (cur === 6){
      const x0 = 150, p = clamp(lt / 2.2, 0, 1);
      chest(x0, cy, 1, 'SOLD AT 2.00x');
      F(18, 600); c.fillStyle = C.ink; c.fillText('$200', x0, cy + 8); F(9.5); c.fillStyle = C.mute; c.fillText('ON $100 BACKED', x0, cy + 28);
      const outs = [['Backers', '$190.00', C.up, 34, '90% of profit + stake'], ['Buyback', '$7.50', C.fire, 7, '7.5% of profit'], ['Caller', '$2.50', C.amber, 3.5, '2.5% of profit']];
      const gap = ph ? 74 : 86;
      outs.forEach((o, i) => { const y = cy + (i - 1) * gap, x1 = 400;
        c.beginPath(); c.moveTo(x0 + 66, cy + (i - 1) * 16); c.bezierCurveTo(300, cy + (i - 1) * 16, 300, y, x1, y);
        c.strokeStyle = o[2]; c.globalAlpha = .25 + .75 * p; c.lineWidth = o[3] * ease(p) + 1; c.stroke(); c.globalAlpha = 1;
        const dt = (lt * .7 + i * .2) % 1; const a = 1 - dt; const bx = a*a*a*(x0+66) + 3*a*a*dt*300 + 3*a*dt*dt*300 + dt*dt*dt*x1, by = a*a*a*(cy+(i-1)*16) + 3*a*a*dt*(cy+(i-1)*16) + 3*a*dt*dt*y + dt*dt*dt*y;
        if (playing) { c.fillStyle = '#fff'; c.beginPath(); c.arc(bx, by, 2.6, 0, 7); c.fill(); }
        c.textAlign = 'left'; F(10.5); c.fillStyle = C.mute; c.fillText(o[0].toUpperCase(), x1 + 14, y - 14); F(20, 600); c.fillStyle = o[2]; c.fillText(o[1], x1 + 14, y + 6); F(9.5); c.fillStyle = C.dim; c.fillText(o[4], x1 + 14, y + 26); c.textAlign = 'center'; });
    }
    c.restore();
    // progress bar on active step
    if (playing && !isPhone()){ const p = clamp((now - stepStart) / 1000 / STEP_T, 0, 1); stepsEl.forEach((li, i) => li.querySelector('.hs-bar').style.width = i === cur ? (p * 100) + '%' : '0'); if (p >= 1) setStep(cur + 1); }
    else stepsEl.forEach(li => li.querySelector('.hs-bar').style.width = '0');
  }

  /* ---------- 03 MPC ring ---------- */
  const mpcSvg = $('mpcSvg'); watch(mpcSvg);
  const NS = 'http://www.w3.org/2000/svg', mk = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const nodesG = $('mpcNodes'), linksG = $('mpcLinks'), nodes = [], mlinks = [];
  for (let i = 0; i < 9; i++){ const a = i / 9 * Math.PI * 2 - Math.PI / 2, x = 230 + Math.cos(a) * 150, y = 230 + Math.sin(a) * 150;
    const l = mk('line', {x1:x, y1:y, x2:230, y2:230, stroke:'#ff5b2e', 'stroke-width':1, 'stroke-dasharray':'3 5', opacity:0}, linksG); mlinks.push(l);
    const g = mk('g', {class:'node'}, nodesG); mk('circle', {cx:x, cy:y, r:15, fill:'#0c0e13', stroke:'#2a2f3a'}, g); const dot = mk('circle', {cx:x, cy:y, r:4, fill:'#2a2f3a'}, g); nodes.push(dot); }
  mk('text', {x:230, y:56, 'text-anchor':'middle', class:'svt dim'}, $('mpcSvg')).textContent = 'chain signatures network';
  const sigPath = $('sigPath'), sigLen = sigPath.getTotalLength(); sigPath.style.strokeDasharray = sigLen;
  function drawMPC(t){ const T = 6, p = (t / 1000 % T) / T;
    nodes.forEach((n, i) => { const on = p > i * .05 && p < .85; n.setAttribute('fill', on ? '#ff8a4c' : '#2a2f3a'); n.setAttribute('r', on ? 5 : 4); mlinks[i].setAttribute('opacity', on ? .7 : 0); mlinks[i].setAttribute('stroke-dashoffset', -t / 60); });
    const sp = clamp((p - .5) / .3, 0, 1); sigPath.style.strokeDashoffset = sigLen * (1 - sp); $('sigTxt').style.opacity = sp > .95 && p < .95 ? 1 : .25; }

  /* ---------- 04 route ---------- */
  const routeSvg = $('routeSvg'); let routeMode = '';
  function buildRoute(){
    const mode = isPhone() ? 'v' : 'h'; if (mode === routeMode) return; routeMode = mode; routeSvg.innerHTML = '';
    const P = (d, col, dur, n, begin = 0) => { mk('path', {d, fill:'none', stroke:'#1e222c', 'stroke-width':2}, routeSvg); const pth = mk('path', {d, fill:'none', stroke:col, 'stroke-width':1.4, opacity:.45, 'stroke-dasharray':'4 7', class:'flowp'}, routeSvg);
      for (let i = 0; i < n; i++){ const c = mk('circle', {r:3.6, fill:col}, routeSvg); const am = mk('animateMotion', {dur:dur + 's', repeatCount:'indefinite', begin:(begin + i * dur / n) + 's', path:d}, c); } };
    const node = (x, y, w, h, title, sub, col, strong) => { mk('rect', {x:x - w / 2, y:y - h / 2, width:w, height:h, rx:12, fill: strong ? '#120d0b' : '#0c0e13', stroke: col || '#2a2f3a', 'stroke-width': strong ? 1.6 : 1}, routeSvg);
      const t = mk('text', {x, y: sub ? y - 3 : y + 5, 'text-anchor':'middle', class:'svt', style:`font-size:${mode === 'v' ? 13 : 14}px;font-family:Geist,sans-serif;font-weight:600;fill:#eef1f6`}, routeSvg); t.textContent = title;
      if (sub){ const s = mk('text', {x, y:y + 15, 'text-anchor':'middle', class:'svt dim', style:`font-size:${mode === 'v' ? 10.5 : 11}px`}, routeSvg); s.textContent = sub; } };
    if (mode === 'h'){
      routeSvg.setAttribute('viewBox', '0 0 1200 420');
      const S = [[80,'NEAR wallet','USDC direct'],[175,'MetaMask','signed intent'],[265,'Phantom','signed intent'],[355,'SOL · ETH · USDC','1Click deposit']];
      const T = [[80,'NEAR tokens','on NEAR'],[175,'TRUMP','on Solana'],[265,'PEPE','on Ethereum'],[355,'DOGE','and more']];
      S.forEach(([y], i) => { if (i === 0) P(`M210 ${y} C 500 ${y}, 560 150, 690 200`, '#e9ecf2', 3.4, 2); else P(`M210 ${y} C 320 ${y}, 340 215, 440 215`, ['#f6a04d','#a99bff','#35f0a1'][i - 1], 2.8, 2, i * .3); });
      P('M560 215 L 690 215', '#ff5b2e', 1.6, 2);
      T.forEach(([y], i) => P(`M830 215 C 930 215, 920 ${y}, 990 ${y}`, '#ff8a4c', 2.6, 1, i * .4));
      S.forEach(([y, a, b]) => node(130, y, 160, 62, a, b));
      node(500, 215, 120, 74, 'NEAR Intents', 'routes value', '#ff5b2e');
      node(760, 215, 140, 96, 'War chest', 'raid #6 · keyless', '#ff5b2e', true);
      T.forEach(([y, a, b]) => node(1070, y, 160, 62, a, b));
      [['YOUR WALLET', 130], ['ROUTE', 500], ['HOLDS + SWAPS', 760], ['TARGET COIN', 1070]].forEach(([t, x]) => { const e = mk('text', {x, y:30, 'text-anchor':'middle', class:'svt dim', style:'font-size:11px;letter-spacing:.08em'}, routeSvg); e.textContent = t; });
      const sw = mk('text', {x:905, y:180, 'text-anchor':'middle', class:'svt', style:'font-size:10.5px;fill:#ff8a4c'}, routeSvg); sw.textContent = 'swap via Intents';
    } else {
      routeSvg.setAttribute('viewBox', '0 0 360 640');
      const S = [[95,70,'NEAR wallet','USDC direct'],[265,70,'MetaMask','signed intent'],[95,150,'Phantom','signed intent'],[265,150,'Other chains','1Click deposit']];
      const T = [[95,520,'NEAR tokens','on NEAR'],[265,520,'TRUMP','on Solana'],[95,598,'PEPE','on Ethereum'],[265,598,'DOGE','and more']];
      P('M20 70 C 4 70, 4 330, 105 340', '#e9ecf2', 3.4, 2);
      P('M340 70 C 358 70, 358 250, 245 262', '#f6a04d', 2.6, 1);
      P('M95 178 C 95 220, 180 205, 180 240', '#a99bff', 2.4, 1, .3);
      P('M265 178 C 265 220, 180 205, 180 240', '#35f0a1', 2.4, 1, .6);
      P('M180 290 L 180 300', '#ff5b2e', 1, 1);
      T.forEach(([x, y]) => P(`M180 390 C 180 450, ${x} 440, ${x} ${y - 28}`, '#ff8a4c', 2.4, 1));
      S.forEach(([x, y, a, b]) => node(x, y, 150, 56, a, b));
      node(180, 265, 130, 50, 'NEAR Intents', 'routes value', '#ff5b2e');
      node(180, 345, 150, 70, 'War chest', 'raid #6 · keyless', '#ff5b2e', true);
      T.forEach(([x, y, a, b]) => node(x, y, 150, 56, a, b));
      const e = mk('text', {x:180, y:24, 'text-anchor':'middle', class:'svt dim', style:'font-size:10px;letter-spacing:.08em'}, routeSvg); e.textContent = 'YOUR WALLET';
    }
    if (RM) routeSvg.pauseAnimations();
  }
  buildRoute();

  /* ---------- 05 fee calc ---------- */
  const stakeIn = $('stake'); let X = 2, hit = true; const fmt = v => '$' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  function calc(){
    const s = +stakeIn.value; stakeIn.style.setProperty('--p', ((s - 10) / 990 * 100) + '%'); $('stakeOut').textContent = '$' + s;
    const bar = document.querySelector('.fl-bar').children;
    if (hit){ const P = s * (X - 1), b = .9 * P, bb = .075 * P, cl = .025 * P;
      bar[0].style.flexGrow = s; bar[1].style.flexGrow = b; bar[2].style.flexGrow = bb; bar[3].style.flexGrow = cl;
      $('oStake').textContent = fmt(s); $('oProfit').textContent = fmt(b); $('oBurn').textContent = fmt(bb); $('oCall').textContent = fmt(cl);
      $('oTotal').textContent = fmt(s + b); const n = $('oNet'); n.textContent = '+' + Math.round(b / s * 100) + '%'; n.classList.remove('neg');
      $('ccNote').textContent = `Paid when the chest sells at ${X}x. Your share is pro rata to what you backed.`;
    } else {
      bar[0].style.flexGrow = s * .5; bar[1].style.flexGrow = 0; bar[2].style.flexGrow = 0; bar[3].style.flexGrow = 0;
      $('oStake').textContent = 'Market'; $('oProfit').textContent = '$0.00'; $('oBurn').textContent = '$0.00'; $('oCall').textContent = '$0.00';
      $('oTotal').textContent = '$0 to ' + fmt(s); const n = $('oNet'); n.textContent = 'can lose'; n.classList.add('neg');
      $('ccNote').textContent = 'At the retreat deadline the chest sells at market. Backers split what comes back. No fees, and the caller earns nothing.';
    } }
  stakeIn.addEventListener('input', calc);
  document.querySelectorAll('#lineSeg button').forEach(b => b.onclick = () => { document.querySelectorAll('#lineSeg button').forEach(x => x.classList.remove('on')); b.classList.add('on'); X = +b.dataset.x; calc(); });
  document.querySelectorAll('#hitSeg button').forEach(b => b.onclick = () => { document.querySelectorAll('#hitSeg button').forEach(x => x.classList.remove('on')); b.classList.add('on'); hit = b.dataset.h === '1'; calc(); });
  calc();

  /* ---------- 06 rulebook strike sequence ---------- */
  const rows = [...document.querySelectorAll('.rb-row')];
  const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ setTimeout(() => e.target.classList.add('hit'), RM ? 0 : 450); rio.unobserve(e.target); } }), {rootMargin:'0px 0px -25% 0px'});
  rows.forEach(r => rio.observe(r));

  /* ---------- 07 crew chat ---------- */
  const chat = $('chat'), phoneEl = document.querySelector('.phone'); watch(phoneEl);
  const SCRIPT = [
    [0, 'msg', 'C', '#ff8a4c', 'captain', 'Proposing $TRUMP, 2x line, 48h retreat.'],
    [1.6, 'vote', 1],
    [2.8, 'msg', 'M', '#a99bff', 'member', 'Read the chest rules. Voting yes.'],
    [4.0, 'vote', 2],
    [4.6, 'sys', 'Passed. The DAO called the raid on chain.'],
    [6.2, 'msg', 'R', '#e9ecf2', 'ribbit', 'Backing 40 USDC from my NEAR wallet.'],
    [7.6, 'msg', 'K', '#f6a04d', 'kek', '12 from MetaMask. No NEAR account needed.'],
    [8.6, 'war', 64],
    [9.8, 'msg', 'C', '#ff8a4c', 'captain', 'Countdown is public. Nobody buys early.'],
  ];
  let chatClock = 5.2, chatLast = null, chatI = 0; const LOOP = 14;
  function chatReset(){ chat.innerHTML = ''; chatI = 0; $('v1').className = ''; $('v2').className = ''; $('prVotes').textContent = '0 / 2 approvals'; const st = $('prSt'); st.textContent = 'voting'; st.className = 'pr-st'; $('warA').style.flexGrow = 1; $('warB').style.flexGrow = 1; }
  function chatStep(ev){
    if (ev[1] === 'msg' || ev[1] === 'sys'){ const m = document.createElement('div'); m.className = 'msg' + (ev[1] === 'sys' ? ' sys' : '');
      m.innerHTML = ev[1] === 'sys' ? `<div class="bub">${ev[2]}</div>` : `<span class="av" style="background:${ev[3]}">${ev[2]}</span><div class="bub"><small>${ev[4]}</small>${ev[5]}</div>`; chat.appendChild(m); while (chat.children.length > 5) chat.firstChild.remove(); }
    if (ev[1] === 'vote'){ $('v' + ev[2]).className = 'y'; $('prVotes').textContent = ev[2] + ' / 2 approvals'; if (ev[2] === 2){ const st = $('prSt'); st.textContent = 'passed'; st.className = 'pr-st ok'; } }
    if (ev[1] === 'war'){ $('warA').style.flexGrow = ev[2]; $('warB').style.flexGrow = 100 - ev[2]; } }
  function drawChat(now){ const dt = chatLast === null ? 0 : Math.min(.1, (now - chatLast) / 1000); chatLast = now; chatClock += dt; let t = chatClock; if (t > LOOP){ chatClock = 0; chatReset(); t = 0; } while (chatI < SCRIPT.length && SCRIPT[chatI][0] <= t){ chatStep(SCRIPT[chatI]); chatI++; } }
  if (RM){ SCRIPT.forEach(chatStep); }

  /* ---------- 08 bonding curve ---------- */
  const cvSvg = $('curveSvg'); watch(cvSvg); const cvPath = $('cvPath'), cvLen = cvPath.getTotalLength();
  const grid = cvSvg.querySelector('.cv-grid'); for (let i = 0; i < 6; i++) mk('line', {x1:40, x2:540, y1:40 + i * 60, y2:40 + i * 60}, grid);
  function drawCurve(t){ const T = 7, p = (t / 1000 % T) / T;
    let f = p < .55 ? ease(p / .55) * .82 : p < .75 ? .82 - .2 * ease((p - .55) / .2) : .62 + .2 * ease((p - .75) / .25);
    if (RM) f = .7;
    const L = cvLen * (.04 + f * .9), pts = []; for (let i = 0; i <= 40; i++){ const q = cvPath.getPointAtLength(L * i / 40); pts.push(q.x.toFixed(1) + ' ' + q.y.toFixed(1)); }
    $('cvLive').setAttribute('d', 'M' + pts.join(' L')); $('cvFill').setAttribute('d', 'M40 340 L' + pts.join(' L') + ` L${pts[pts.length - 1].split(' ')[0]} 340 Z`);
    const pt = cvPath.getPointAtLength(L); $('cvDot').setAttribute('cx', pt.x); $('cvDot').setAttribute('cy', pt.y); $('cvRing').setAttribute('cx', pt.x); $('cvRing').setAttribute('cy', pt.y); $('cvRing').setAttribute('r', 10 + (t / 90 % 10));
    $('cvRing').setAttribute('opacity', 1 - (t / 90 % 10) / 10);
    const selling = p >= .55 && p < .75; $('cvTxt').textContent = selling ? 'sell · price down' : 'buy · price up'; $('cvTxt').style.fill = selling ? '#ff4d6a' : '#35f0a1';
    const tx = clamp(pt.x - 140, 50, 400), ty = clamp(pt.y - 13, 50, 320); $('cvTick').setAttribute('transform', `translate(${tx},${ty})`); }

  /* ---------- 09 cells ---------- */
  const cells = $('cells'); for (let i = 0; i < 25; i++) cells.appendChild(document.createElement('i'));
  const cio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ [...cells.children].forEach((c, i) => setTimeout(() => c.className = i < 21 ? 'p' : 'w', RM ? 0 : i * 45)); cio.disconnect(); } }));
  cio.observe(cells);

  /* ---------- 12 CTA canvas ---------- */
  const cta = $('ctaCv'); watch(cta); seed = 77;
  const lines = Array.from({length:22}, () => ({sx:rnd() * .55, span:.25 + rnd() * .4, y0:.62 + rnd() * .34, ph:rnd(), a:.35 + rnd() * .55, w:rnd() * 6}));
  function drawCTA(t){ const {W, H, d} = fit(cta), c = cta.getContext('2d'); c.clearRect(0, 0, W, H); const ly = H * .26;
    c.setLineDash([8 * d, 7 * d]); c.strokeStyle = 'rgba(255,91,46,.55)'; c.lineWidth = 1.5 * d; c.beginPath(); c.moveTo(0, ly); c.lineTo(W, ly); c.stroke(); c.setLineDash([]);
    c.font = `500 ${11 * d}px ${MONO}`; c.fillStyle = 'rgba(255,138,76,.8)'; c.textAlign = 'right'; c.fillText('THE LINE', W - 20 * d, ly - 10 * d); c.textAlign = 'left';
    lines.forEach(L => { const p = ((t / 7000) + L.ph) % 1, grow = clamp(p / .6, 0, 1), fade = p > .8 ? 1 - (p - .8) / .2 : 1;
      const x0 = W * L.sx, x1 = x0 + W * L.span, yA = H * L.y0; c.beginPath();
      const steps = 60; for (let i = 0; i <= steps * grow; i++){ const q = i / steps, x = lerp(x0, x1, q), y = lerp(yA, ly, Math.pow(q, 1.6)) + Math.sin(q * 14 + L.w) * 9 * d * (1 - q); i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.strokeStyle = `rgba(53,240,161,${L.a * .5 * fade})`; c.lineWidth = 1.2 * d; c.stroke();
      if (grow >= 1){ const k = clamp((p - .6) / .2, 0, 1); c.fillStyle = `rgba(53,240,161,${fade})`; c.beginPath(); c.arc(x1, ly, 3 * d, 0, 7); c.fill(); c.strokeStyle = `rgba(53,240,161,${(1 - k) * .7 * fade})`; c.beginPath(); c.arc(x1, ly, (3 + k * 16) * d, 0, 7); c.stroke(); } });
    const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(6,7,10,.92)'); g.addColorStop(.5, 'rgba(6,7,10,.5)'); g.addColorStop(1, 'rgba(6,7,10,.05)'); c.fillStyle = g; c.fillRect(0, 0, W, H); }

  /* ---------- main loop ---------- */
  function frame(now){
    if (seen(pvB)){ const t = ((now / 1000) % 9) / 9; drawDuel(pvB, badP, false, t); drawDuel(pvG, goodP, true, t); }
    if (seen(stage)) drawStage(now);
    if (seen(mpcSvg)) drawMPC(now);
    if (seen(phoneEl)) drawChat(now); else chatLast = null;
    if (seen(cvSvg)) drawCurve(now);
    if (seen(cta)) drawCTA(now);
    requestAnimationFrame(frame);
  }
  if (RM){
    const once = () => { drawDuel(pvB, badP, false, 1); drawDuel(pvG, goodP, true, 1); drawStage(performance.now()); drawMPC(4200); drawCurve(0); drawCTA(4000); };
    setTimeout(once, 50); addEventListener('resize', () => { buildRoute(); once(); });
    stepsEl.forEach((li, i) => li.querySelector('button').addEventListener('click', () => setTimeout(() => drawStage(performance.now()), 0)));
    $('stPrev').addEventListener('click', () => drawStage(performance.now())); $('stNext').addEventListener('click', () => drawStage(performance.now()));
  } else { requestAnimationFrame(frame); addEventListener('resize', buildRoute); }
})();
