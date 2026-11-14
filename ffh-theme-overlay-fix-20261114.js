(()=>{'use strict';
const transparent=['background','background-color','background-image','border','box-shadow','outline','filter'];
function apply(){
 const grid=document.querySelector('#app .app .homeGrid');if(!grid)return;
 const tiles=[...grid.querySelectorAll('.module')];
 for(const tile of tiles){
  for(const p of transparent){const val=p==='background'||p==='background-color'?'transparent':p==='background-image'?'none':p==='filter'?'none':'none';if(tile.style.getPropertyValue(p)!==val||tile.style.getPropertyPriority(p)!=='important')tile.style.setProperty(p,val,'important');}
  for(const pseudo of ['before','after']){} // pseudo elements cleared by CSS
 }
 const last=tiles.find(x=>/access\s*requests/i.test(x.textContent||''));
 if(last){
  const label=last.querySelector('.moduleTitle')||[...last.querySelectorAll('*')].find(x=>x.children.length===0&&/access\s*requests/i.test(x.textContent||''));
  if(label&&/access\s*requests/i.test(label.textContent||''))label.textContent='SOA';
  last.dataset.ffhSoaHome='1';last.setAttribute('aria-label','SOA');
 }
}
let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;apply()})}
const obs=new MutationObserver(schedule);
obs.observe(document.getElementById('app')||document.body,{childList:true,subtree:true,characterData:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.addEventListener('pageshow',schedule);
})();