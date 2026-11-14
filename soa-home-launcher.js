(()=>{'use strict';
const norm=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
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
  // Update the home tile icon only; preserve the original tile click target.
  const icon=tile.querySelector('svg, i, [class*="icon"], [class*="Icon"]');
  if(icon && !icon.dataset.ffhSoaIcon){
   icon.dataset.ffhSoaIcon='1';
   if(icon.tagName.toLowerCase()==='svg'){
    icon.innerHTML='<rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 8h10M7 12h10M7 16h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    icon.setAttribute('viewBox','0 0 24 24');
   }else if(icon.tagName.toLowerCase()==='i'){
    icon.className='';icon.textContent='▤';icon.style.fontStyle='normal';
   }
  }
  const walker=document.createTreeWalker(tile,NodeFilter.SHOW_TEXT);
  const changes=[];
  while(walker.nextNode()){
   const t=walker.currentNode;
   if(/access\s*requests/i.test(t.nodeValue||''))changes.push(t);
  }
  for(const t of changes)t.nodeValue=t.nodeValue.replace(/access\s*requests/ig,'SOA');
  if(!changes.length){
   const leaf=[...tile.querySelectorAll('*')].find(x=>!x.children.length&&norm(x.textContent)==='access requests');
   if(leaf)leaf.textContent='SOA';
  }
 }
}
function fixLastHomeTile(){
 const app=document.getElementById('app');if(!app)return;
 const elements=[...app.querySelectorAll('*')].filter(e=>e.children.length===0&&/access\s*requests/i.test((e.textContent||'').replace(/\s+/g,' ')));
 for(const leaf of elements){
  const rect=leaf.getBoundingClientRect();
  if(rect.top<innerHeight*.42||rect.top>innerHeight*.94)continue;
  let tile=leaf;
  for(let n=0;n<6&&tile.parentElement;n++){
   const p=tile.parentElement,r=p.getBoundingClientRect();
   if(r.width>=100&&r.width<=innerWidth*.32&&r.height>=95&&r.height<=240){tile=p;break;}
   tile=p;
  }
  if(tile.id==='app'||tile.textContent.includes('Manager Control'))continue;
  leaf.textContent='SOA';
  tile.dataset.ffhSoaHome='1';
  tile.setAttribute('aria-label','SOA');
  // Update the home tile icon only; preserve the original tile click target.
  const icon=tile.querySelector('svg, i, [class*="icon"], [class*="Icon"]');
  if(icon && !icon.dataset.ffhSoaIcon){
   icon.dataset.ffhSoaIcon='1';
   if(icon.tagName.toLowerCase()==='svg'){
    icon.innerHTML='<rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 8h10M7 12h10M7 16h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    icon.setAttribute('viewBox','0 0 24 24');
   }else if(icon.tagName.toLowerCase()==='i'){
    icon.className='';icon.textContent='▤';icon.style.fontStyle='normal';
   }
  }
 }
}
function fixGridSoa(){
 const grid=document.querySelector('#app .homeGrid');
 if(!grid)return;
 const tile=[...grid.querySelectorAll('.module')].find(t=>/access\s*requests/i.test(t.textContent||''));
 if(!tile)return;
 const leaf=[...tile.querySelectorAll('*')].find(e=>e.children.length===0&&/access\s*requests/i.test(e.textContent||''));
 if(leaf)leaf.textContent='SOA';
 tile.dataset.ffhSoaHome='1';
 tile.setAttribute('aria-label','SOA');
 const icon=tile.querySelector('.mi');
 if(icon){icon.textContent='▤';icon.style.cssText+=';font-style:normal;color:#ff9c20;';}
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh();fixLastHomeTile();fixGridSoa();});}
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