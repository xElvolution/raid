// Port of design-lab/src/battle.js (shared Yes-vs-No SVG battle renderer), extended with boxing, tech, space, movies.
/* eslint-disable */
export type Theme='football'|'bull'|'gta'|'f1'|'music'|'boxing'|'tech'|'space'|'movies';
export interface BattleSpec{theme:Theme;yes:number;seed?:number}
// Shared Yes-vs-No battle arena renderer (SVG). style: 'soft' | 'ink' | 'hard'
const C:any={yes:'#1FD17A',no:'#FF4B5C',brand:'#7C5CFF'};
function rng(s:number){return()=>{s=(s*9301+49297)%233280;return s/233280}}
function fig(t:string,x:number,y:number,s:number,side:number,st:string,ink:string){
 const col=side?C.yes:C.no, d=side?1:-1, sw=st==='ink'?2.2:0, stroke=st==='ink'?`stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"`:'';
 const dark=st==='ink'?ink:'#0B0B10', skin=side?'#8a5a3c':'#c58b62';
 const sh=st==='hard'?`<ellipse cx="${x+4*s}" cy="${y+26*s}" rx="${13*s}" ry="${3*s}" fill="#000" opacity=".55"/>`:`<ellipse cx="${x}" cy="${y+26*s}" rx="${12*s}" ry="${3*s}" fill="#000" opacity="${st==='ink'?.12:.35}"/>`;
 let g='';
 if(t==='bull'){ // quadruped
  g+=`<g transform="translate(${x},${y}) scale(${s*d},${s})">
  <rect x="-16" y="12" width="5" height="13" rx="2" fill="${dark}"/><rect x="8" y="12" width="5" height="13" rx="2" fill="${dark}"/>
  <path d="M-20 0 Q-20 -12 -4 -12 L10 -12 Q20 -12 20 2 L20 12 Q20 16 14 16 L-16 16 Q-20 16 -20 10Z" fill="${col}" ${stroke}/>`;
  if(side) g+=`<path d="M16 -10 Q28 -14 30 -2 Q30 8 22 8 L16 8Z" fill="${col}" ${stroke}/><path d="M22 -12 Q24 -24 34 -22 Q27 -19 27 -11Z" fill="#F4EBD8" ${stroke}/><path d="M18 -12 Q12 -22 4 -21 Q11 -17 13 -11Z" fill="#F4EBD8" ${stroke}/><circle cx="25" cy="-4" r="1.8" fill="${dark}"/><path d="M-20 -2 q-8 -2 -9 8" stroke="${col}" stroke-width="3" fill="none"/>`;
  else g+=`<circle cx="22" cy="-6" r="11" fill="${col}" ${stroke}/><circle cx="16" cy="-16" r="4.5" fill="${col}" ${stroke}/><circle cx="28" cy="-16" r="4.5" fill="${col}" ${stroke}/><ellipse cx="29" cy="-3" rx="4.5" ry="3.5" fill="#F4EBD8"/><circle cx="31" cy="-4" r="1.5" fill="${dark}"/><circle cx="24" cy="-9" r="1.8" fill="${dark}"/><path d="M30 6 l5 4 m-7 -2 l4 5" stroke="#fff" stroke-width="1.6"/>`;
  return sh+g+'</g>';
 }
 if(t==='f1'){
  g+=`<g transform="translate(${x},${y+10*s}) scale(${s*d},${s})">
  <rect x="-22" y="-12" width="9" height="7" rx="2" fill="${dark}"/><rect x="-22" y="5" width="9" height="7" rx="2" fill="${dark}"/><rect x="10" y="-11" width="8" height="6" rx="2" fill="${dark}"/><rect x="10" y="5" width="8" height="6" rx="2" fill="${dark}"/>
  <path d="M-26 -9 L-20 -9 L-20 9 L-26 9Z" fill="${col}" ${stroke}/><path d="M-18 -5 L14 -3 L28 -1 L28 1 L14 3 L-18 5Z" fill="${col}" ${stroke}/><rect x="24" y="-8" width="4" height="16" rx="1" fill="${col}" ${stroke}/><circle cx="-2" cy="0" r="3.2" fill="${dark}"/></g>`;
  return sh.replace(/rx="[^"]+"/,`rx="${26*s}"`)+g;
 }
 // humanoid
 g+=`<g transform="translate(${x},${y}) scale(${s*d},${s})">
 <rect x="-7" y="14" width="5" height="12" rx="2" fill="${dark}"/><rect x="2" y="14" width="5" height="12" rx="2" fill="${dark}"/>
 <path d="M-10 -2 Q-10 -6 -6 -6 L6 -6 Q10 -6 10 -2 L10 16 L-10 16Z" fill="${col}" ${stroke}/>
 <circle cx="0" cy="-13" r="7.5" fill="${skin}" ${stroke}/>`;
 if(t==='gta'){g+=`<rect x="-10" y="-20" width="20" height="3" rx="1.2" fill="${dark}"/><rect x="-6" y="-26" width="12" height="7" rx="2" fill="${dark}"/><rect x="-6" y="-21" width="12" height="2" fill="${col}"/><rect x="1" y="-15" width="7" height="3" rx="1.5" fill="${dark}"/><path d="M-1 -4 L2 6 L0 9 L-2 6Z" fill="${dark}"/><rect x="6" y="1" width="9" height="4" rx="1" fill="${col}" ${stroke}/><rect x="12" y="0" width="10" height="3.6" rx="1" fill="${dark}"/><rect x="13" y="3" width="3" height="5" rx="1" fill="${dark}"/>`;}
 else if(t==='football'){g+=`<text x="0" y="10" font-family="Inter" font-weight="900" font-size="10" text-anchor="middle" fill="${dark}" transform="scale(${d},1)">${side?7:9}</text><path d="M-7 -18 Q0 -24 7 -18 L7 -16 L-7 -16Z" fill="${dark}"/><rect x="5" y="-2" width="4" height="12" rx="2" fill="${skin}" transform="rotate(-35 7 -2)"/>`;}
 else if(t==='boxing'){g+=`<circle cx="12" cy="-2" r="5.5" fill="${col}" ${stroke}/><circle cx="8" cy="6" r="5" fill="${col}" ${stroke}/><rect x="-7" y="-19" width="14" height="4" fill="${dark}"/>`;}
 else if(t==='space'){g+=`<circle cx="0" cy="-13" r="10" fill="none" stroke="#cfd8ff" stroke-width="2"/><rect x="-4" y="-16" width="9" height="5" fill="#9fb3ff" opacity=".8"/><rect x="-14" y="-2" width="5" height="12" fill="${dark}"/>`;}
 else if(t==='tech'){g+=`<rect x="6" y="0" width="14" height="9" fill="${dark}"/><rect x="7" y="1" width="12" height="6" fill="${col}" opacity=".6"/><rect x="-6" y="-15" width="12" height="3" fill="${dark}"/>`;}
 else if(t==='movies'){g+=`<rect x="6" y="-4" width="12" height="9" fill="${dark}"/><path d="M6 -4 L18 -8 L18 -5 L6 -1Z" fill="#fff"/><path d="M-8 -19 L8 -19 L5 -24 L-5 -24Z" fill="${dark}"/>`;}
 else {g+=`<path d="M-8 -14 Q-8 -24 0 -24 Q8 -24 8 -14" stroke="${dark}" stroke-width="2.5" fill="none"/><rect x="-10" y="-17" width="4" height="7" rx="2" fill="${dark}"/><rect x="6" y="-17" width="4" height="7" rx="2" fill="${dark}"/><rect x="6" y="-3" width="4" height="12" rx="2" fill="${skin}" transform="rotate(-50 8 -3)"/>`;}
 return sh+g+'</g>';
}
function bg(t:string,w:number,h:number,st:string,ink:string){
 const dark=st==='ink';const line=dark?ink:'#fff';let s='';
 if(t==='football'){s+=`<rect width="${w}" height="${h}" fill="${dark?'#E7EEDD':'#0E1A12'}"/>`;for(let i=0;i<8;i++)s+=`<rect x="${i*w/8}" width="${w/16}" height="${h}" fill="${dark?'#DCE7CF':'#112016'}"/>`;s+=`<circle cx="${w/2}" cy="${h*.62}" r="${h*.22}" fill="none" stroke="${line}" stroke-opacity=".18" stroke-width="2"/><line x1="0" y1="${h*.62}" x2="${w}" y2="${h*.62}" stroke="${line}" stroke-opacity=".1" stroke-width="2"/>`;}
 else if(t==='bull'){s+=`<rect width="${w}" height="${h}" fill="${dark?'#EEE9DD':'#0D0D14'}"/>`;const r=rng(7);for(let i=0;i<22;i++){const x=i*w/22+4,o=h*.25+r()*h*.4,hh=10+r()*30,up=r()>.45;s+=`<line x1="${x+4}" x2="${x+4}" y1="${o-8}" y2="${o+hh+8}" stroke="${up?C.yes:C.no}" stroke-opacity="${dark?.35:.22}"/><rect x="${x}" y="${o}" width="8" height="${hh}" fill="${up?C.yes:C.no}" opacity="${dark?.3:.18}"/>`;}}
 else if(t==='gta'){s+=`<rect width="${w}" height="${h}" fill="${dark?'#EDE6DA':'#0C0A14'}"/>`;const r=rng(3);let x=0;while(x<w){const bw=18+r()*34,bh=h*.2+r()*h*.35;s+=`<rect x="${x}" y="${h*.6-bh}" width="${bw-3}" height="${bh}" fill="${dark?'#DDD3C3':'#171425'}"/>`;for(let k=0;k<5;k++)if(r()>.5)s+=`<rect x="${x+4+r()*(bw-12)}" y="${h*.6-bh+6+r()*(bh-14)}" width="3" height="4" fill="${dark?'#c9bba6':'#FFC86B'}" opacity=".55"/>`;x+=bw;}s+=`<rect y="${h*.6}" width="${w}" height="${h*.4}" fill="${dark?'#E2D9CA':'#100E1A'}"/><line x1="0" x2="${w}" y1="${h*.8}" y2="${h*.8}" stroke="${line}" stroke-opacity=".25" stroke-dasharray="14 10" stroke-width="2"/>`;
  // crashed car
  s+=`<g transform="translate(${w*.5-34},${h*.84}) rotate(-8)"><rect width="60" height="16" rx="5" fill="${dark?'#bdb1a0':'#2a2640'}"/><rect x="12" y="-9" width="30" height="11" rx="4" fill="${dark?'#bdb1a0':'#2a2640'}"/><circle cx="14" cy="16" r="5" fill="#000"/><circle cx="46" cy="16" r="5" fill="#000"/></g>`;}
 else if(t==='f1'){s+=`<rect width="${w}" height="${h}" fill="${dark?'#ECE8E0':'#0D0D10'}"/><rect y="${h*.28}" width="${w}" height="${h*.6}" fill="${dark?'#DCD7CD':'#16161B'}"/>`;for(let i=0;i<w/16;i++){s+=`<rect x="${i*16}" y="${h*.28-6}" width="8" height="6" fill="${i%2?C.no:'#fff'}" opacity=".8"/><rect x="${i*16}" y="${h*.88}" width="8" height="6" fill="${i%2?'#fff':C.no}" opacity=".8"/>`}s+=`<line x1="0" x2="${w}" y1="${h*.58}" y2="${h*.58}" stroke="${line}" stroke-opacity=".3" stroke-dasharray="20 14" stroke-width="2"/>`;}

 else if(t==='boxing'){s+=`<rect width="${w}" height="${h}" fill="#120C0C"/><rect y="${h*.55}" width="${w}" height="${h*.45}" fill="#1E1416"/>`;for(let i=0;i<3;i++)s+=`<line x1="0" x2="${w}" y1="${h*(.3+i*.09)}" y2="${h*(.3+i*.09)}" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>`;s+=`<rect x="4" y="${h*.25}" width="6" height="${h*.5}" fill="${C.brand}"/><rect x="${w-10}" y="${h*.25}" width="6" height="${h*.5}" fill="${C.brand}"/>`;}
 else if(t==='space'){s+=`<rect width="${w}" height="${h}" fill="#05060F"/>`;const r=rng(11);for(let i=0;i<60;i++)s+=`<circle cx="${r()*w}" cy="${r()*h*.7}" r="${r()*1.4+.3}" fill="#fff" opacity="${.3+r()*.6}"/>`;s+=`<circle cx="${w*.82}" cy="${h*.22}" r="${h*.12}" fill="#2a2350"/><path d="M0 ${h*.78} Q${w/2} ${h*.66} ${w} ${h*.78} L${w} ${h} L0 ${h}Z" fill="#14131f"/>`;}
 else if(t==='tech'){s+=`<rect width="${w}" height="${h}" fill="#07090D"/>`;for(let i=0;i<w;i+=22)s+=`<line x1="${i}" x2="${i}" y1="0" y2="${h}" stroke="${C.brand}" stroke-opacity=".12"/>`;for(let j=0;j<h;j+=22)s+=`<line x1="0" x2="${w}" y1="${j}" y2="${j}" stroke="${C.brand}" stroke-opacity=".12"/>`;}
 else if(t==='movies'){s+=`<rect width="${w}" height="${h}" fill="#0E0A08"/><rect x="${w*.08}" y="${h*.06}" width="${w*.84}" height="${h*.3}" fill="#1d1a24" stroke="#fff" stroke-opacity=".15"/>`;for(let i=0;i<w/14;i++)s+=`<rect x="${i*14}" y="${h*.9}" width="7" height="${h*.1}" fill="#1a1414"/>`;}
 else {s+=`<rect width="${w}" height="${h}" fill="${dark?'#EEE8F7':'#100D1A'}"/>`;for(let i=0;i<9;i++)s+=`<path d="M${i*w/8} 0 L${w/2} ${h*.95}" stroke="${C.brand}" stroke-opacity=".12" stroke-width="10"/>`;}
 return s;
}
export function battleSvg(m:BattleSpec,{w=390,h=260,st='soft',ink='#141414',n=1,clash=true,divider=true}={}){
 const t=m.theme,split=w*m.yes/100,r=rng((m.seed??7)*11+3);
 let units='';const ys:[number,string][]=[];
 const cnt=t==='f1'?[3,3]:[Math.max(3,Math.round(m.yes/11)),Math.max(3,Math.round((100-m.yes)/11))];
 const sc=n*(t==='f1'?1.05:1.15)*(h/260);
 function place(side:number,count:number){const x0=side?14:split+14,x1=side?split-22:w-14;const rows=t==='f1'?3:3;for(let i=0;i<count;i++){const row=i%rows,col=Math.floor(i/rows),cols=Math.ceil(count/rows);
  const x=x0+(x1-x0)*((col+.5)/cols)+(r()-.5)*10;const y=h*.42+row*h*.16+(r()-.5)*6;ys.push([y,fig(t,x,y,sc*(0.85+row*0.12),side,st,ink)]);}}
 place(1,cnt[0]);place(0,cnt[1]);ys.sort((a:any,b:any)=>a[0]-b[0]);units=ys.map((a:any)=>a[1]).join('');
 let fx='';
 if(clash){const cy=h*.58;fx+=`<g transform="translate(${split},${cy})">`;for(let i=0;i<10;i++){const a=i*36*Math.PI/180,l=i%2?14:24;fx+=`<line x1="${Math.cos(a)*6}" y1="${Math.sin(a)*6}" x2="${Math.cos(a)*l}" y2="${Math.sin(a)*l}" stroke="${st==='ink'?ink:'#FFE27A'}" stroke-width="3" stroke-linecap="round"/>`}fx+='</g>';
  if(t==='gta')for(let i=0;i<4;i++){const yy=h*.45+i*h*.1;fx+=`<line x1="${split-60+i*7}" x2="${split-18}" y1="${yy}" y2="${yy+2}" stroke="${st==='ink'?ink:'#FFE27A'}" stroke-width="1.6" stroke-dasharray="6 5" opacity=".8"/>`}}
 const tint=st==='ink'?'':`<rect width="${split}" height="${h}" fill="${C.yes}" opacity=".07"/><rect x="${split}" width="${w-split}" height="${h}" fill="${C.no}" opacity=".08"/>`;
 const div=divider?`<line x1="${split}" x2="${split}" y1="0" y2="${h}" stroke="${st==='ink'?ink:'#fff'}" stroke-width="${st==='hard'?3:2}" ${st==='soft'?'stroke-dasharray="2 6" stroke-linecap="round"':''}/>`:'';
 return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" style="display:block">${bg(t,w,h,st,ink)}${tint}${div}${units}${fx}</svg>`;
}

export function themeFor(q:string,cat?:string|null):Theme{const s=(q+' '+(cat??'')).toLowerCase();
 if(/gta|game|playstation|xbox|nintendo/.test(s))return 'gta';if(/bitcoin|btc|eth|crypto|sol|coin/.test(s))return 'bull';
 if(/f1|grand prix|verstappen|hamilton|norris|\bgp\b/.test(s))return 'f1';if(/box|ufc|fight|joshua|knockout/.test(s))return 'boxing';
 if(/album|music|burna|wizkid|davido|song|grammy|tour/.test(s))return 'music';if(/space|mars|spacex|starship|nasa|moon|rocket/.test(s))return 'space';
 if(/movie|film|box office|avengers|marvel|oscar|netflix/.test(s))return 'movies';if(/apple|iphone|ai\b|openai|tech|google|launch|chip/.test(s)||cat==='tech')return 'tech';
 if(/win|beat|league|cup|goal|arsenal|chelsea|madrid|bayern|match|fc /.test(s)||cat==='sports')return 'football';return 'music';}
export function crewLabels(t:Theme):[string,string]{return ({football:['YES XI','NO XI'],bull:['BULLS','BEARS'],gta:['YES CREW','NO CREW'],f1:['YES GRID','NO GRID'],boxing:['YES CORNER','NO CORNER'],music:['YES','NO'],tech:['YES','NO'],space:['YES','NO'],movies:['YES','NO']} as const)[t] as any;}
