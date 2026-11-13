(()=>{'use strict';
const norm=s=>String(s||'').replace(/\\s+/g,' ').trim().toLowerCase();
let queued=false;
function refresh(){
 const nodes=document.querySelectorAll('#app *');
 for(const el of nodes){
  if(el.closest('#ffhSoaRoot,#ffhSoaManagerAccess'))continue;
  if(!norm(el.textContent).includes('access requests'))continue;
  if([...el.children].some(c=>norm(c.textContent).includes('access requests')))continue;
  let tile=null;
  for(let p=el,n=0;p&&n<9;p=p.parentElement,n++){
   if(p===document.body||p.id==='app')break;
   const r=p.getBoundingClientRect();
   if(r.width>=70&&r.width<=Math.max(260,innerWidth*.45)&&r.height>=75&&r.height<=260){
    tile=p;
    if(p.parentElement&&getComputedStyle(p.parentElement).display.includes('grid'))break;
   }
  }
  if(!tile||tile.closest('[data-page="manager"],[data-page="manager-control"]'))continue;
  if(norm(tile.textContent).includes('manager control'))continue;
  if(!norm(tile.textContent).includes('access requests')&&!norm(tile.textContent).includes('soa'))continue;
  tile.dataset.ffhSoaHome='1';
  tile.setAttribute('aria-label','SOA');
  const walker=document.createTreeWalker(tile,NodeFilter.SHOW_TEXT);
  const changes=[];
  while(walker.nextNode()){
   const t=walker.currentNode;
   if(/access\\s*requests/i.test(t.nodeValue||''))changes.push(t);
  }
  for(const t of changes)t.nodeValue=t.nodeValue.replace(/access\\s*requests/ig,'SOA');
  if(!changes.length){
   const leaf=[...tile.querySelectorAll('*')].find(x=>!x.children.length&&norm(x.textContent)==='access requests');
   if(leaf)leaf.textContent='SOA';
  }
 }
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();});}
document.addEventListener('click',e=>{
 const tile=e.target.closest('[data-ffh-soa-home="1"]');
 if(!tile)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(typeof window.FFH_SOA_OPEN==='function')window.FFH_SOA_OPEN();
 else alert('SOA module failed to load.');
},true);
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.addEventListener('pageshow',schedule);
})();