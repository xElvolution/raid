(() => {
  const $ = id => document.getElementById(id);
  // duplicate tape for seamless loop
  const tape = $('tape'); tape.innerHTML += tape.innerHTML;

  /* ---------- floor: perspective grid ---------- */
  const fc = $('floor'), fx = fc.getContext('2d');
  function sizeCanvas(c){ const r=c.getBoundingClientRect(), d=Math.min(devicePixelRatio||1,2); c.width=Math.max(1,r.width*d); c.height=Math.max(1,r.height*d); return d; }
  let fd = sizeCanvas(fc);
  function drawFloor(t){
    const W=fc.width,H=fc.height; fx.clearRect(0,0,W,H);
    const hz=H*0.58, cx=W*0.62;
    fx.lineWidth=1*fd;
    for(let i=-26;i<=26;i++){
      const xb=cx+i*W*0.06;
      const g=fx.createLinearGradient(0,hz,0,H); g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(1,'rgba(255,255,255,0.055)');
      fx.strokeStyle=g; fx.beginPath(); fx.moveTo(cx+i*W*0.004,hz); fx.lineTo(xb,H); fx.stroke();
    }
    const off=(t*0.00018)%1;
    for(let j=0;j<14;j++){
      const p=(j+off)/14, y=hz+(H-hz)*p*p;
      fx.strokeStyle=`rgba(255,255,255,${0.05*p})`; fx.beginPath(); fx.moveTo(0,y); fx.lineTo(W,y); fx.stroke();
    }
  }

  /* ---------- price path (example) ---------- */
  let seed=7; const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  const N=260, CROSS=Math.floor(N*0.86), path=[];
  for(let i=0;i<N;i++){
    const p=i/CROSS;
    let v = i<=CROSS ? 1+1.0*Math.pow(p,1.25) - 0.07*Math.sin(p*Math.PI*3)*(1-p) : 2.0+0.06*Math.sin((i-CROSS)/(N-CROSS)*Math.PI*0.9);
    v += (rnd()-0.5)*0.035;
    if(i<CROSS) v=Math.min(Math.max(v,1.02+0.04*p),1.965); else v=Math.max(v,2.003);
    path.push(i===0?1:v);
  }
  const hitIdx=CROSS;

  /* ---------- timeline ---------- */
  const PH=[
    {k:'Called',  d:1.8, v:'A caller picks the coin, a 2x line and a deadline. It goes on chain.'},
    {k:'Backing', d:3.0, v:'The crew backs one chest in USDC from NEAR, MetaMask or Phantom. 10 minute window.'},
    {k:'Bought',  d:1.4, v:'The chest buys once through NEAR Intents, quote checked on chain. Chain Signatures signs.'},
    {k:'Locked',  d:4.0, v:'Below the line, every sell is refused. Nobody can dump early, not even the caller.'},
    {k:'Line hit',d:1.3, v:'Price crosses 2.00x. The chest sells once, at the line.'},
    {k:'Paid',    d:2.8, v:'Fees only from profit: 90% to backers, 7.5% buyback and burn, 2.5% caller.'},
  ];
  let acc=0; PH.forEach(p=>{p.s=acc; acc+=p.d;}); const T=acc;
  const steps=[...$('steps').children];
  const ease=x=>1-Math.pow(1-x,3);

  const wallets=[['n','N','NEAR','frogking.near'],['m','M','MetaMask','0x7a3f…c91e'],['p','P','Phantom','9xQe…Lp4d'],['n','N','NEAR','lilypad.near'],['m','M','MetaMask','0xb12d…04aa'],['p','P','Phantom','4Ktr…ZbW2'],['n','N','NEAR','ribbit.near'],['m','M','MetaMask','0x55e0…9f13']];
  const amts=[120,250,60,400,85,150,300,75];
  const CHEST=4820, BACKERS=37;
  const feed=$('feed'); let fedCount=-1;
  function pushRow(i){
    const w=wallets[i%wallets.length];
    const r=document.createElement('div'); r.className='row';
    r.innerHTML=`<span class="w ${w[0]}">${w[1]}</span><span class="who">${w[3]}<small>${w[2]} via Intents</small></span><span class="amt">+$${amts[i%amts.length]}</span>`;
    feed.prepend(r); while(feed.children.length>5) feed.lastChild.remove();
  }

  /* ---------- chart ---------- */
  const cc=$('chart'), cx=cc.getContext('2d'); let cd=sizeCanvas(cc);
  const lo=0.75, hi=2.3;
  function drawChart(drawn, phase, pt){
    const W=cc.width,H=cc.height,d=cd; cx.clearRect(0,0,W,H);
    const padL=10*d,padR=64*d,padT=58*d*(W<500*d?0.8:1),padB=18*d;
    const X=i=>padL+(W-padL-padR)*(i/(N-1)), Y=v=>padT+(H-padT-padB)*(1-(v-lo)/(hi-lo));
    // grid
    cx.strokeStyle='rgba(255,255,255,0.045)'; cx.lineWidth=1*d;
    for(let g=1;g<=2.25;g+=0.25){cx.beginPath();cx.moveTo(padL,Y(g));cx.lineTo(W-padR,Y(g));cx.stroke();}
    // locked zone
    const yl=Y(2.0), yb=Y(1.0);
    const locked = phase>=3 && phase<4;
    cx.fillStyle = locked? 'rgba(255,77,106,0.06)':'rgba(255,77,106,0.025)';
    cx.fillRect(padL,yl,W-padL-padR,H-padB-yl);
    // hatching
    cx.save(); cx.beginPath(); cx.rect(padL,yl,W-padL-padR,H-padB-yl); cx.clip();
    cx.strokeStyle=locked?'rgba(255,77,106,0.09)':'rgba(255,77,106,0.04)';
    for(let x=-H;x<W;x+=14*d){cx.beginPath();cx.moveTo(x,H);cx.lineTo(x+H,0);cx.stroke();}
    cx.restore();
    // target line
    const hit = phase>=4;
    cx.setLineDash([6*d,5*d]); cx.lineWidth=1.5*d;
    cx.strokeStyle= hit?'rgba(53,240,161,0.95)':'rgba(255,91,46,0.95)';
    cx.beginPath(); cx.moveTo(padL,yl); cx.lineTo(W-padR,yl); cx.stroke();
    cx.setLineDash([2*d,4*d]); cx.strokeStyle='rgba(255,255,255,0.22)'; cx.lineWidth=1*d;
    cx.beginPath(); cx.moveTo(padL,yb); cx.lineTo(W-padR,yb); cx.stroke(); cx.setLineDash([]);
    // labels
    const fs=Math.round((W<500*d?9:10.5)*d);
    cx.font=`600 ${fs}px GeistMono, monospace`; cx.textAlign='left'; cx.textBaseline='middle';
    const tag=(txt,y,bg,fg)=>{const w=cx.measureText(txt).width+10*d,h=fs+8*d,x=W-padR+6*d;cx.fillStyle=bg;roundRect(x,y-h/2,w,h,4*d);cx.fill();cx.fillStyle=fg;cx.fillText(txt,x+5*d,y+0.5*d);};
    tag('2.00x',yl,hit?'#35f0a1':'#ff5b2e','#08090c');
    tag('1.00x',yb,'#1e222c','#b7bdc9');
    cx.fillStyle=hit?'rgba(53,240,161,0.85)':'rgba(255,140,100,0.85)'; cx.font=`500 ${fs}px GeistMono, monospace`;
    cx.fillText(hit?'LINE HIT · SELLS OPEN':'THE LINE · SELLS OPEN HERE',padL+6*d,yl-10*d);
    cx.fillStyle='rgba(255,120,140,0.6)'; if(!hit) cx.fillText('SELLS REFUSED BELOW',padL+6*d,yl+12*d);
    if(drawn<1) return;
    // price path
    const n=Math.min(N,Math.max(2,Math.floor(drawn)));
    const grad=cx.createLinearGradient(0,Y(2.2),0,Y(0.9)); grad.addColorStop(0,'rgba(53,240,161,0.28)'); grad.addColorStop(1,'rgba(53,240,161,0)');
    cx.beginPath(); cx.moveTo(X(0),Y(path[0]));
    for(let i=1;i<n;i++) cx.lineTo(X(i),Y(path[i]));
    cx.lineTo(X(n-1),H-padB); cx.lineTo(X(0),H-padB); cx.closePath(); cx.fillStyle=grad; cx.fill();
    cx.beginPath(); cx.moveTo(X(0),Y(path[0])); for(let i=1;i<n;i++) cx.lineTo(X(i),Y(path[i]));
    cx.strokeStyle='#35f0a1'; cx.lineWidth=2*d; cx.lineJoin='round'; cx.shadowColor='rgba(53,240,161,0.6)'; cx.shadowBlur=12*d; cx.stroke(); cx.shadowBlur=0;
    // buy marker
    cx.fillStyle='#ff5b2e'; cx.beginPath(); cx.arc(X(0),Y(1),4*d,0,7); cx.fill();
    // head
    const hx=X(n-1), hy=Y(path[n-1]);
    const pr=(pt*2)%1;
    cx.fillStyle=`rgba(53,240,161,${0.35*(1-pr)})`; cx.beginPath(); cx.arc(hx,hy,(4+12*pr)*d,0,7); cx.fill();
    cx.fillStyle='#eafff5'; cx.beginPath(); cx.arc(hx,hy,3.5*d,0,7); cx.fill();
    if(phase>=4){ // sell marker
      const hi2=Math.max(hitIdx,0);
      cx.strokeStyle='#35f0a1'; cx.lineWidth=1.5*d; cx.beginPath(); cx.arc(X(hi2),Y(2.0),7*d,0,7); cx.stroke();
    }
  }
  function roundRect(x,y,w,h,r){cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath();}

  const mult=$('mult'), msub=$('multsub'), amt=$('amt'), bk=$('backers'), cdn=$('cd'), cbar=$('cbar'), capk=$('capk'), capv=$('capv'), split=$('split'), prog=$('prog'), toast=$('toast');
  let lastPhase=-1, lastLoop=-1;
  const t0=performance.now();
  function frame(now){
    const el=(now-t0)/1000, loop=Math.floor(el/T), t=el%T;
    let ph=PH.findIndex(p=>t>=p.s && t<p.s+p.d); if(ph<0) ph=PH.length-1;
    const lp=(t-PH[ph].s)/PH[ph].d;
    if(loop!==lastLoop){ lastLoop=loop; feed.innerHTML=''; fedCount=-1; }
    if(ph!==lastPhase){
      lastPhase=ph;
      steps.forEach((s,i)=>{s.className=i<ph?'done':i===ph?'on':'';});
      capk.textContent=`${ph+1}/6 · ${PH[ph].k}`; capv.textContent=PH[ph].v;
      split.classList.toggle('on',ph===5);
    }
    // chest
    const bp = ph<1?0: ph===1? ease(lp):1;
    amt.textContent=Math.round(CHEST*bp).toLocaleString('en-US');
    bk.textContent=Math.round(BACKERS*bp);
    cbar.style.width=(bp*100)+'%';
    const secs = ph<1?600: ph===1? Math.round(600*(1-lp)):0;
    cdn.textContent = ph<=1? `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}` : (ph===2?'buying':ph===3?'locked':ph===4?'sold':'settled');
    if(ph===1){ const want=Math.floor(lp*8); while(fedCount<want){fedCount++; pushRow(fedCount);} }
    // chart
    const lockS=PH[3].s, hitE=PH[4].s+PH[4].d;
    let drawn=0;
    if(ph===3) drawn=1+lp*CROSS; else if(ph>=4){ const q=ph===4?lp:1; drawn=CROSS+1+q*(N-1-CROSS); }
    else if(ph===2) drawn=1+lp*2;
    drawChart(drawn, ph, el);
    const cur = drawn>=1? path[Math.min(N-1,Math.floor(drawn)-1)] : 1;
    mult.textContent = ph<2? '1.00x' : ph>=4? '2.00x' : cur.toFixed(2)+'x';
    mult.style.color = ph>=4? '#35f0a1' : '';
    msub.textContent = ph<2? 'awaiting buy' : ph===2? 'bought once' : ph===3? 'locked · line 2.00x' : ph===4? 'sold at the line' : 'sold at 2.00x · paid out';
    // toast
    const showRefuse = ph===3 && lp>0.35 && lp<0.8;
    const showGood = ph===4 || (ph===5 && lp<0.4);
    if(showRefuse) toast.textContent='Sell refused · below the line'; else if(showGood) toast.textContent='Sold once at the line';
    toast.className = 'toast'+(showRefuse||showGood?' show':'')+(toast.textContent.startsWith('Sold')?' good':'');
    prog.style.width=(t/T*100)+'%';
    drawFloor(now);
    requestAnimationFrame(frame);
  }
  addEventListener('resize',()=>{fd=sizeCanvas(fc); cd=sizeCanvas(cc);});
  requestAnimationFrame(frame);
})();
