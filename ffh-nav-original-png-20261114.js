/* Original uploaded navigation PNG, applied to the rendered 7-shortcut bar. */
(()=>{'use strict';
const image='url("fieldforce-nav-border.png")';
function apply(){
 const root=document.getElementById('app');if(!root)return;
 const candidates=[...root.querySelectorAll('.bottomSix,.bottom,[class*="bottomNav"],[class*="BottomNav"],nav')];
 for(const el of candidates){
  const buttons=[...el.children].filter(x=>x.matches('button,a,[role="button"]'));
  if(buttons.length!==7)continue;
  const labels=buttons.map(x=>(x.textContent||'').trim().toLowerCase());
  if(!labels.some(x=>x.includes('home'))||!labels.some(x=>x.includes('chat')))continue;
  if(el.dataset.ffhOriginalNavPng==='1')return;
  el.dataset.ffhOriginalNavPng='1';
  el.style.setProperty('background-image',image,'important');
  el.style.setProperty('background-size','100% 100%','important');
  el.style.setProperty('background-position','center','important');
  el.style.setProperty('background-repeat','no-repeat','important');
  el.style.setProperty('background-color','#090807','important');
  el.style.setProperty('border','0','important');
  el.style.setProperty('border-radius','0','important');
  el.style.setProperty('box-shadow','none','important');
  el.style.setProperty('grid-template-columns','repeat(7,minmax(0,1fr))','important');
  el.style.setProperty('gap','0','important');
  buttons.forEach(b=>{b.style.setProperty('background','transparent','important');b.style.setProperty('border','0','important');b.style.setProperty('box-shadow','none','important');b.style.setProperty('min-width','0','important');});
 }
}
let pending=false;const obs=new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;apply()})});
function start(){apply();const root=document.getElementById('app');if(root)obs.observe(root,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();