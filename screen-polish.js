/* Size complete product pairs to the space below compact catalogue controls. */
(()=>{'use strict';const app=document.getElementById('app');let queued=false;
function fit(){queued=false;const main=app.querySelector('main.wrap'),inner=main?.querySelector(':scope>.ffCatalogueInner');if(!inner)return;main.classList.add('ffProductPairPage');const grid=inner.querySelector('#skuList'),nav=app.querySelector('.bottom');if(!grid||!nav)return;const stage=Math.max(180,Math.floor(nav.getBoundingClientRect().top-grid.getBoundingClientRect().top-8)),old=grid.style.getPropertyValue('--ff-product-stage');if(old!==stage+'px')grid.style.setProperty('--ff-product-stage',stage+'px');}
function schedule(){if(!queued){queued=true;requestAnimationFrame(fit);}}
new MutationObserver(schedule).observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);schedule();})();
