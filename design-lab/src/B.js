// Direction B — TICKET: warm paper, editorial serif, sharp, perforated slips, stamp moment
const INK='#16141C';
const B_CSS=`body{background:#F3EFE6;color:${INK};font-family:Geist}
.sf{font-family:'Instrument Serif';font-weight:400;letter-spacing:-.01em}.mn{font-family:'Geist Mono';font-feature-settings:'tnum'}
.top{display:flex;align-items:center;justify-content:space-between;padding:4px 20px 0}
.mut{color:#7A7468}.yes{color:#0E9F5B}.no{color:#E2384A}
.slip{background:#FFFDF8;border:1.5px solid ${INK};border-radius:4px;position:relative}
.perf{border-top:1.5px dashed ${INK};position:relative;margin:0 -1.5px}.perf:before,.perf:after{content:'';position:absolute;top:-10px;width:18px;height:18px;border-radius:50%;background:#F3EFE6;border:1.5px solid ${INK}}.perf:before{left:-10px;clip-path:inset(0 0 0 50%)}.perf:after{right:-10px;clip-path:inset(0 50% 0 0)}
.lbl{font:500 10.5px 'Geist Mono';letter-spacing:.12em;text-transform:uppercase}
.tab{position:absolute;left:0;right:0;bottom:0;height:88px;background:#F3EFE6;border-top:1.5px solid ${INK};display:flex;justify-content:space-around;align-items:flex-start;padding-top:12px}
.tab div{display:flex;flex-direction:column;align-items:center;gap:4px;font:500 10px 'Geist Mono';letter-spacing:.08em;color:#8B8478}.tab .on{color:${INK}}
.btn{height:56px;border-radius:4px;display:flex;align-items:center;justify-content:center;font:600 16px Geist;gap:8px;border:1.5px solid ${INK}}
.chip{height:32px;padding:0 12px;border-radius:4px;border:1.2px solid ${INK};font:500 12px 'Geist Mono';display:inline-flex;align-items:center;gap:6px;white-space:nowrap;background:#FFFDF8}
.chip.on{background:${INK};color:#F3EFE6}
.stamp{border:3px solid #7C5CFF;color:#7C5CFF;font:700 13px 'Geist Mono';letter-spacing:.12em;padding:6px 10px;display:inline-block;border-radius:6px}`;
function B_tab(on){const t=[['home','home','TODAY'],['feed','feed','FEED'],['fab','plus','CALL'],['bolt','trophy','LEAGUE'],['user','user','CARD']];return `<div class="tab">${t.map(([k,i,l])=>k==='fab'?`<div style="width:52px;height:52px;margin-top:-28px;border-radius:50%;background:#7C5CFF;color:#fff;display:grid;place-items:center;border:1.5px solid ${INK};box-shadow:3px 3px 0 ${INK}">${ic(i,24,2.4)}</div>`:`<div class="${k===on?'on':''}">${ic(i,23,k===on?2.2:1.6)}${l}</div>`).join('')}</div><div class="hi" style="background:${INK}"></div>`}
function B_odds(m,sz=56){return `<div style="display:flex;align-items:baseline;justify-content:space-between"><div><div class="lbl yes">Yes</div><div class="sf yes" style="font-size:${sz}px;line-height:1">${m.yes}%</div></div><div class="sf mut" style="font-size:${sz*.45}px;font-style:italic">vs</div><div style="text-align:right"><div class="lbl no">No</div><div class="sf no" style="font-size:${sz}px;line-height:1">${100-m.yes}%</div></div></div>`}
const B={
home(){const m=MK.btc;return sb(INK)+`<div class="top"><div class="sf" style="font-size:30px;font-style:italic">Called</div><div style="display:flex;gap:10px;align-items:center"><span class="chip">${ic('flame',14,2,'#E2384A')}7 day</span><span class="chip on">${U.bal}</span></div></div>
<div style="padding:20px 20px 0" class="lbl mut">Wed 21 Oct · Today's main event</div>
<div class="sf" style="font-size:44px;line-height:.98;padding:8px 20px 16px">Bulls or bears<i> by New&nbsp;Year?</i></div>
<div class="slip" style="margin:0 16px;box-shadow:5px 5px 0 ${INK}">
 <div style="border-bottom:1.5px solid ${INK}">${battle('btc',{w:355,h:200,st:'ink',ink:INK,n:.95})}</div>
 <div style="padding:14px 16px 12px">${B_odds(m)}<div style="font:500 15px/1.35 Geist;margin-top:10px">${m.q}</div></div>
 <div class="perf"></div>
 <div style="display:flex;padding:12px;gap:10px"><div class="btn" style="flex:1;background:#1FD17A">Yes 64¢</div><div class="btn" style="flex:1;background:#FF4B5C">No 36¢</div></div>
</div>
<div style="padding:22px 20px 8px;display:flex;justify-content:space-between" class="lbl"><span>Also on the card</span><span class="mut">See all →</span></div>
${['ars','f1'].map((k,i)=>`<div style="display:flex;align-items:center;gap:12px;padding:10px 20px;border-top:1px solid #D9D2C3"><span class="mn mut" style="font-size:12px">0${i+2}</span><div style="flex:1;font:500 14px Geist">${MK[k].q}</div><span class="sf ${MK[k].yes>=50?'yes':'no'}" style="font-size:26px">${MK[k].yes}%</span></div>`).join('')}
${B_tab('home')}`},
feed(){const post=(n,h,t,txt,k,side,amt,rot)=>{const m=MK[k];return `<div style="padding:16px 20px 18px;border-bottom:1.5px solid ${INK}"><div style="display:flex;gap:10px;align-items:center">${av(n,36,null,'#fff','4px')}<div style="flex:1;font:600 14px Geist">${n} <span class="mut" style="font-weight:400">${h}</span></div><span class="mn mut" style="font-size:12px">${t}</span></div>
 <div class="sf" style="font-size:24px;line-height:1.12;margin:10px 0 12px">“${txt}”</div>
 <div class="slip" style="display:flex;overflow:hidden;transform:rotate(${rot}deg)"><div style="width:120px;border-right:1.5px dashed ${INK}">${battle(k,{w:120,h:120,st:'ink',ink:INK,n:.55,clash:false})}</div>
 <div style="flex:1;padding:10px 12px;display:flex;flex-direction:column;justify-content:space-between"><div class="lbl mut">Ticket · ${m.cat}</div><div style="font:600 13px/1.3 Geist">${m.q}</div><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="sf ${side?'yes':'no'}" style="font-size:30px;line-height:1">${side?'Yes':'No'} ${side?m.yes:100-m.yes}%</span><span class="mn" style="font-size:12px">${amt}</span></div></div></div>
 <div style="display:flex;gap:22px;margin-top:14px;font:500 12px 'Geist Mono'" class="mut"><span>${ic('msg',16)} 48</span><span>${ic('rep',16)} 12</span><span>${ic('heart',16)} 311</span><span style="margin-left:auto;color:#7C5CFF;font-weight:600">TAIL →</span></div></div>`};
 return sb(INK)+`<div class="top" style="padding-bottom:12px"><div class="sf" style="font-size:36px">The Feed</div>${ic('search',22)}</div>
 <div style="display:flex;border-top:1.5px solid ${INK};border-bottom:1.5px solid ${INK}" class="lbl">${['Following','Hot','Live'].map((x,i)=>`<div style="flex:1;text-align:center;padding:11px 0;${i?'border-left:1.5px solid '+INK:'background:'+INK+';color:#F3EFE6'}">${x}</div>`).join('')}</div>
 ${post('Kemi','@kemicalls','2M','Bears are cooked. Loading yes before the ETF flows land.','btc',1,'₦20,000',-1)}${post('Dayo','@dayo_fc','9M','Chelsea\'s midfield has no legs. Calling it now.','ars',1,'₦5,000',1)}${B_tab('feed')}`},
market(){const m=MK.ars;return sb(INK)+`<div class="top">${ic('back',24)}<span class="lbl">Football · Ticket #A-2210</span>${ic('share',20)}</div>
 <div style="margin:12px 16px 0;border:1.5px solid ${INK};border-radius:4px;overflow:hidden;position:relative">${battle('ars',{w:356,h:250,st:'ink',ink:INK,n:.95})}
 <div style="position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between"><span class="sf yes" style="font-size:54px;line-height:1;background:#FFFDF8;padding:0 8px;border:1.5px solid ${INK}">${m.yes}%</span><span class="sf no" style="font-size:54px;line-height:1;background:#FFFDF8;padding:0 8px;border:1.5px solid ${INK}">${100-m.yes}%</span></div></div>
 <div class="sf" style="font-size:30px;line-height:1.05;padding:14px 20px 4px">${m.q}</div><div class="mn mut" style="font-size:12px;padding:0 20px">${m.vol} staked · closes Sun 16:00 WAT</div>
 <div class="slip" style="position:absolute;left:10px;right:10px;bottom:24px;box-shadow:0 -6px 0 #F3EFE6,5px 5px 0 ${INK}">
  <div style="display:flex;justify-content:space-between;padding:12px 16px" class="lbl"><span>Your slip</span><span class="mut">Odds lock in 0:09</span></div>
  <div style="display:flex;margin:0 12px;border:1.5px solid ${INK}"><div style="flex:1;padding:10px;background:#1FD17A;font:600 15px Geist;border-right:1.5px solid ${INK}">Yes <span class="mn">58¢</span></div><div style="flex:1;padding:10px;font:600 15px Geist" class="no">No <span class="mn">42¢</span></div></div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;padding:16px 16px 6px"><div><div class="lbl mut">Stake</div><div class="sf" style="font-size:52px;line-height:1">₦5,000</div></div><div style="text-align:right"><div class="lbl mut">Pays</div><div class="sf yes" style="font-size:36px;line-height:1">₦8,620</div></div></div>
  <div style="display:flex;gap:6px;padding:8px 16px 14px">${['+1k','+5k','+10k','MAX'].map((x,i)=>`<span class="chip ${i==1?'on':''}" style="flex:1;justify-content:center">${x}</span>`).join('')}</div>
  <div class="perf"></div><div style="padding:12px"><div class="btn" style="background:#7C5CFF;color:#fff;font-size:17px">Print my Yes ticket</div></div></div><div class="hi" style="background:${INK}"></div>`},
profile(){const tiles=U.rec.split('').map(c=>`<i style="flex:1;height:26px;background:${c==='W'?'#1FD17A':'#FF4B5C'};border:1px solid ${INK}"></i>`).join('');
 return sb(INK)+`<div class="top"><span class="lbl">Caller Card</span><div style="display:flex;gap:14px">${ic('share',20)}${ic('rot',20)}</div></div>
 <div style="display:flex;justify-content:center;padding:18px 0 0;position:relative"><div style="position:absolute;top:30px;width:270px;height:400px;background:#7C5CFF;border:1.5px solid ${INK};transform:rotate(6deg);border-radius:10px"></div>
 <div style="width:284px;height:410px;background:#FFFDF8;border:1.5px solid ${INK};border-radius:10px;padding:12px;transform:rotate(-2deg);position:relative;box-shadow:6px 6px 0 ${INK}">
  <div style="display:flex;justify-content:space-between" class="lbl"><span>Series 01 · Amethyst</span><span>№ 0412</span></div>
  <div style="margin-top:10px;height:210px;border:1.5px solid ${INK};position:relative;overflow:hidden;background:#EDE7DA">${battle('btc',{w:258,h:210,st:'ink',ink:INK,n:.75,clash:false,divider:false})}<div style="position:absolute;inset:0;display:grid;place-items:center">${av('T',112,'#7C5CFF','#FFFDF8','50%',"'Instrument Serif'")}</div></div>
  <div class="sf" style="font-size:38px;line-height:1;margin-top:10px">Tolu Adebayo</div><div class="lbl mut" style="margin-top:4px">Crypto · Football · since ’26</div>
  <div style="display:flex;margin-top:12px;border-top:1.5px solid ${INK}">${[['154','called'],['73%','hit rate'],['7','streak']].map(([a,b],i)=>`<div style="flex:1;padding-top:8px;${i?'border-left:1.5px solid '+INK+';padding-left:10px':''}"><div class="sf" style="font-size:28px;line-height:1">${a}</div><div class="lbl mut">${b}</div></div>`).join('')}</div>
  <div class="stamp" style="position:absolute;right:14px;top:198px;transform:rotate(-12deg);background:#FFFDF8">TOP 3%</div></div></div>
 <div style="padding:30px 20px 0"><div style="display:flex;justify-content:space-between;margin-bottom:8px" class="lbl"><span>Last 30 calls</span><span><span class="yes">22 hit</span> · <span class="no">8 miss</span></span></div><div style="display:flex">${tiles}</div></div>
 ${B_tab('user')}`},
callit(){return sb(INK)+`<div class="top">${ic('x',24)}<span class="lbl">New call</span><span class="lbl" style="color:#7C5CFF">Drafts</span></div>
 <div style="padding:20px 20px 0"><div class="lbl mut">I'm calling that…</div><div class="sf" style="font-size:42px;line-height:1.02;margin-top:6px">Burna drops a new album before 2027<span style="display:inline-block;width:2px;height:38px;background:#7C5CFF;vertical-align:-6px"></span></div></div>
 <div style="display:flex;gap:6px;padding:16px 20px;flex-wrap:wrap"><span class="chip">+ Super Eagles qualify</span><span class="chip">+ ETH ≥ $8k</span><span class="chip">+ Davido × Wizkid</span></div>
 <div style="margin:4px 16px;position:relative"><div class="stamp" style="position:absolute;right:12px;top:-14px;transform:rotate(4deg);background:#F3EFE6;z-index:2">AI DRAFT</div>
 <div class="slip" style="box-shadow:5px 5px 0 ${INK}"><div style="border-bottom:1.5px solid ${INK}">${battle('afro',{w:355,h:110,st:'ink',ink:INK,n:.7})}</div>
 <div style="padding:14px 16px"><div class="sf" style="font-size:24px;line-height:1.1">Will Burna Boy release a new studio album before Jan 1, 2027?</div></div><div class="perf"></div>
 <div style="padding:6px 16px 12px">${[['Resolves on','Spotify NG + label post'],['Closes','31 Dec 2026, 23:59 WAT'],['Arena','Music · stage battle'],['Opens at','50 / 50']].map(([a,b])=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dotted #B9B0A0"><span class="lbl mut">${a}</span><span class="mn" style="font-size:12px">${b}</span></div>`).join('')}</div></div></div>
 <div style="position:absolute;bottom:30px;left:16px;right:16px;display:flex;gap:10px"><div class="btn" style="width:56px;background:#FFFDF8">${ic('mic',22)}</div><div class="btn" style="flex:1;background:#7C5CFF;color:#fff;box-shadow:4px 4px 0 ${INK}">Open the market</div></div><div class="hi" style="background:${INK}"></div>`},
calledit(){return `<div style="position:absolute;inset:0;background:${INK}"></div>${confetti(46,['#1FD17A','#F3EFE6','#7C5CFF'],390,844,4)}<div style="position:relative">${sb('#F3EFE6')}
 <div style="text-align:center;padding-top:70px" class="lbl"><span style="color:#B9B0A0">Ticket #A-2210 · settled</span></div>
 <div style="margin:22px 26px 0;background:#FFFDF8;border:1.5px solid #FFFDF8;border-radius:4px;padding:18px;position:relative;transform:rotate(-2deg)">
  <div style="display:flex;justify-content:space-between" class="lbl"><span>Arsenal v Chelsea</span><span>Sun 16:00</span></div>
  <div class="sf" style="font-size:30px;line-height:1.05;margin:12px 0">Arsenal beat Chelsea on Sunday?</div>
  <div style="display:flex;justify-content:space-between;border-top:1.5px dashed ${INK};padding-top:12px"><div><div class="lbl mut">Your call</div><div class="sf yes" style="font-size:34px">Yes</div></div><div style="text-align:right"><div class="lbl mut">Final</div><div class="sf" style="font-size:34px">2 – 1</div></div></div>
  <div style="height:40px"></div>
  </div>
 <div style="text-align:center;margin-top:-34px;position:relative;z-index:3"><div style="position:relative;display:inline-block;transform:rotate(-8deg);border:6px solid #7C5CFF;color:#7C5CFF;border-radius:14px;padding:4px 16px;background:#FFFDF8;font:400 84px/1 'Instrument Serif';font-style:italic;white-space:nowrap;box-shadow:inset 0 0 0 3px #FFFDF8,inset 0 0 0 6px #7C5CFF">Called it!</div></div><div style="text-align:center;padding-top:18px"><div class="lbl" style="color:#B9B0A0">Paid out to your wallet</div><div class="sf" style="font-size:88px;line-height:1;color:#1FD17A">+₦8,620</div></div><div style="padding:22px 26px 0;color:#F3EFE6"><div style="display:flex;gap:3px">${U.rec.split('').map(c=>`<i style="flex:1;height:18px;background:${c==='W'?'#1FD17A':'#FF4B5C'}"></i>`).join('')}<i style="flex:1;height:18px;background:#1FD17A;outline:2px solid #fff"></i></div><div class="lbl" style="margin-top:10px;color:#B9B0A0">Streak 8 · Amethyst → Obsidian in 2 calls</div></div>
 <div style="position:absolute;top:740px;left:16px;right:16px;display:flex;gap:10px"><div class="btn" style="flex:1;background:#7C5CFF;color:#fff;border-color:#7C5CFF">Frame it on my card</div><div class="btn" style="width:56px;background:#F3EFE6">${ic('share',20)}</div></div></div><div class="hi" style="background:#F3EFE6"></div>`},
};
mount(B_CSS,B);
