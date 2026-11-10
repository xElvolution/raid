const U={name:'Tolu Adebayo',h:'@tolu',bal:'₦84,250',streak:7,rec:'WWLWWWLWWLWWWWLWLWWWWLLWWWWLWW',calls:212,acc:73};
const P=new URLSearchParams(location.search);const SCREEN=P.get('s')||'home';
function sb(c='#fff'){return `<div class="sb" style="color:${c}"><b>9:41</b><span><svg width="18" height="11" viewBox="0 0 18 11"><rect x="0" y="7" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5" width="3" height="6" rx="1" fill="currentColor"/><rect x="10" y="2.5" width="3" height="8.5" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="11" rx="1" fill="currentColor"/></svg><svg width="26" height="12" viewBox="0 0 26 12"><rect x=".5" y=".5" width="22" height="11" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor"/><rect x="24" y="4" width="1.5" height="4" rx=".7" fill="currentColor" opacity=".4"/></svg></span></div>`}
const I={ // lucide-ish icons
home:'<path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
feed:'<path d="M4 6h16M4 12h16M4 18h10"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
back:'<path d="M15 18l-6-6 6-6"/>',share:'<path d="M12 3v13M7 8l5-5 5 5M5 14v6h14v-6"/>',
heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
msg:'<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/>',
rep:'<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>',
search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0"/>',
flame:'<path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-6 6-6 9-1-1-2-2-2-4-2 2-3 4-3 7 0 4 4 7 9 7z"/>',
spark:'<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/>',
mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',x:'<path d="M18 6L6 18M6 6l12 12"/>',
chev:'<path d="M9 18l6-6-6-6"/>',rot:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>',trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
};
function ic(n,s=22,w=1.9,c='currentColor',fill='none'){return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="${fill}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`}
function av(n,s,bg,fg='#fff',r='50%',f='Inter'){const cols=['#F5A524','#2EC4B6','#7C5CFF','#FF7AA2','#4CC9F0','#F15BB5'];bg=bg||cols[n.charCodeAt(0)%cols.length];return `<div style="width:${s}px;height:${s}px;border-radius:${r};background:${bg};color:${fg};display:grid;place-items:center;font:800 ${s*.4}px ${f};flex:none">${n[0]}</div>`}
function confetti(n,cols,w=390,h=844,seed=5,shape='mix'){const r=rng(seed);let s='';for(let i=0;i<n;i++){const x=r()*w,y=r()*h,c=cols[i%cols.length],rot=r()*360,k=r();
 s+= k<.4?`<rect x="${x}" y="${y}" width="${6+r()*8}" height="${3+r()*4}" fill="${c}" transform="rotate(${rot} ${x} ${y})"/>`: k<.7?`<circle cx="${x}" cy="${y}" r="${2+r()*3}" fill="${c}"/>`:`<path d="M${x} ${y} l6 10 l-12 0z" fill="${c}" transform="rotate(${rot} ${x} ${y})"/>`}
 return `<svg width="${w}" height="${h}" style="position:absolute;inset:0;pointer-events:none">${s}</svg>`}
function mount(css,screens){document.head.insertAdjacentHTML('beforeend',`<style>*{box-sizing:border-box;margin:0;padding:0}body{width:390px;height:844px;overflow:hidden;-webkit-font-smoothing:antialiased}.sb{height:47px;display:flex;justify-content:space-between;align-items:center;padding:0 26px 0 32px;font:600 16px Inter;position:relative;z-index:5}.sb span{display:flex;gap:6px;align-items:center}.scr{position:relative;width:390px;height:844px;overflow:hidden}.hi{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:134px;height:5px;border-radius:3px;z-index:20}${css}</style>`);
 const S=Object.keys(screens);
 if(SCREEN==='reel'){document.body.innerHTML=S.map(k=>`<div class="scr reel" id="r-${k}">${screens[k]()}</div>`).join('');window.SCREENS=S;}
 else document.body.innerHTML=`<div class="scr">${screens[SCREEN]()}</div>`;}
