// run after mount when s=reel
(function(){if(SCREEN!=='reel')return;const D=P.get('d');const els=SCREENS.map(k=>document.getElementById('r-'+k));
const st=document.createElement('style');st.textContent=`.reel{position:absolute!important;inset:0;background:inherit;will-change:transform,clip-path,opacity}`;document.head.appendChild(st);
els.forEach((e,i)=>{e.style.zIndex=i;e.style.visibility=i?'hidden':'visible'});
const T={A:{in:[{transform:'translateY(100%) scale(.9)',borderRadius:'48px'},{transform:'translateY(-2%) scale(1.01)',borderRadius:'40px',offset:.7},{transform:'none',borderRadius:'0'}],out:[{transform:'none',filter:'brightness(1)'},{transform:'scale(.92)',filter:'brightness(.4)'}],ms:650,ease:'cubic-bezier(.2,.9,.25,1.1)'},
 B:{in:[{transform:'translateX(110%) rotate(8deg)'},{transform:'translateX(-2%) rotate(-1deg)',offset:.75},{transform:'none'}],out:[{transform:'none'},{transform:'translateX(-30%) rotate(-4deg)',opacity:.3}],ms:600,ease:'cubic-bezier(.3,.8,.3,1)'},
 C:{in:[{clipPath:'polygon(0 0,0 0,-30% 100%,-30% 100%)'},{clipPath:'polygon(0 0,130% 0,100% 100%,-30% 100%)'}],out:[{transform:'none'},{transform:'translateX(-8%)'}],ms:380,ease:'cubic-bezier(.7,0,.2,1)'}}[D];
// micro motion: battle units bob, numbers pop
function micro(e){e.querySelectorAll('svg g[transform]').forEach((g,i)=>{g.animate([{translate:'0 0'},{translate:`${i%2?2:-2}px -4px`},{translate:'0 0'}],{duration:500+(i%4)*90,iterations:Infinity})});
 if(D==='C'){const w=document.createElement('div');w.style.cssText='position:absolute;inset:0;background:#7C5CFF;z-index:99;pointer-events:none';e.appendChild(w);w.animate([{clipPath:'polygon(0 0,40% 0,10% 100%,-30% 100%)'},{clipPath:'polygon(130% 0,170% 0,140% 100%,100% 100%)'}],{duration:420,easing:'cubic-bezier(.7,0,.2,1)',fill:'forwards'});}
 if(SCREENS[els.indexOf(e)]==='calledit'){e.querySelectorAll('svg rect,svg circle,svg path').forEach((c,i)=>c.animate([{translate:'0 -300px',opacity:0},{translate:'0 0',opacity:1}],{duration:900+(i%7)*120,easing:'cubic-bezier(.2,.8,.3,1)',fill:'backwards'}));
  [...e.querySelectorAll('.d,.sf,.cd')].slice(0,3).forEach(t=>t.animate([{transform:(getComputedStyle(t).transform==='none'?'':getComputedStyle(t).transform)+' scale(2.2)',opacity:0},{opacity:1,offset:.5},{transform:getComputedStyle(t).transform==='none'?'none':getComputedStyle(t).transform}],{duration:600,easing:'cubic-bezier(.2,1.4,.4,1)'}))}
}
let i=0;micro(els[0]);window.REEL_DONE=false;
function next(){const a=els[i],b=els[i+1];if(!b){window.REEL_DONE=true;return}b.style.visibility='visible';b.animate(T.in,{duration:T.ms,easing:T.ease,fill:'both'});a.animate(T.out,{duration:T.ms,easing:T.ease,fill:'forwards'});micro(b);i++;setTimeout(next,2100)}
setTimeout(next,2000);})();
