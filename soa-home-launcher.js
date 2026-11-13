(()=>{'use strict';
const HOME_LABEL=/^Access Requests$/i;
function homeVisible(){const h=document.querySelector('header.top');return !!h;}
function refresh(){
 if(!homeVisible())return;
 const leaves=[...document.querySelectorAll('body *')].filter(e=>e.children.length===0&&HOME_LABEL.test((e.textContent||'').trim()));
 for(const label of leaves){
  if(label.closest('#ffhSoaRoot,#ffhSoaManagerAccess,[data-page="manager"],[data-page="manager-control"]'))continue;
  const tile=label.closest('[data-page="access"],[data-page="home"],button,[role="button"],.moduleCard,.module-card,.moduleTile,.module-tile,.tile,.card')||label.parentElement;
  if(!tile||tile.closest('#ffhSoaRoot,#ffhSoaManagerAccess'))continue;
  if(tile.getBoundingClientRect().width<60)continue;
  label.textContent='SOA';
  tile.dataset.ffhSoaHome='1';
  tile.setAttribute('aria-label','SOA');
 }
}
document.addEventListener('click',e=>{
 const tile=e.target.closest('[data-ffh-soa-home="1"]');
 if(!tile)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(typeof window.FFH_SOA_OPEN==='function')window.FFH_SOA_OPEN();
 else alert('SOA module is still loading. Please reopen this page.');
},true);
const obs=new MutationObserver(()=>{if(!document.querySelector('[data-ffh-soa-home="1"]'))requestAnimationFrame(refresh);});
obs.observe(document.documentElement,{subtree:true,childList:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
window.addEventListener('pageshow',refresh);
})();