/* University directory: single scoped layout; replaces accumulated conflicting overrides. */
(()=>{'use strict';
const css=`
body:has(.university-catalogue) .page-head{position:relative!important;top:auto!important;z-index:40!important;margin:0!important;padding:5px 0!important;background:#0c0f16!important;overflow:visible!important}
body:has(.university-catalogue) .page-head>.wrap{max-width:100%!important;width:100%!important;box-sizing:border-box!important;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1.35fr)!important;align-items:center!important;gap:8px!important;padding:3px 12px!important;margin:0!important}
body:has(.university-catalogue) .an-directory-heading{min-width:0!important;display:flex!important;flex-direction:column!important;gap:2px!important}
body:has(.university-catalogue) .an-directory-heading h1{font-size:clamp(21px,2.5vw,30px)!important;line-height:1.1!important;margin:0!important;white-space:normal!important}
body:has(.university-catalogue) .an-directory-heading .bread{font-size:10px!important;margin:0!important}
body:has(.university-catalogue) .an-directory-subtitle{font-size:10px!important;line-height:1.25!important;color:white!important}
body:has(.university-catalogue) .an-directory-subtitle b{color:#ff690b!important}
body:has(.university-catalogue) .page-head p{display:none!important}
body:has(.university-catalogue) .page-head .catalogue-tools{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;align-items:center!important;gap:6px!important;width:100%!important;min-width:0!important;max-width:100%!important;margin:0!important;padding:0!important}
body:has(.university-catalogue) .page-head .catalogue-tools>*{box-sizing:border-box!important;grid-column:auto!important;grid-row:auto!important;width:100%!important;min-width:0!important;max-width:100%!important;height:36px!important;min-height:36px!important;margin:0!important;padding:0!important}
body:has(.university-catalogue) .page-head .catalogue-search{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;background:#10141c!important;border:1px solid #f66a13!important;border-radius:10px!important;overflow:visible!important}
body:has(.university-catalogue) .page-head .catalogue-search>span{color:#ff701c!important;font-size:21px!important;cursor:pointer!important}
body:has(.university-catalogue) .page-head .catalogue-search input{position:absolute!important;top:0!important;right:0!important;width:0!important;min-width:0!important;max-width:0!important;height:35px!important;opacity:0!important;padding:0!important;border:0!important;pointer-events:none!important}
body:has(.university-catalogue) .page-head .catalogue-search:focus-within input{width:min(70vw,320px)!important;max-width:70vw!important;opacity:1!important;pointer-events:auto!important;padding:5px 10px!important;border:1px solid #f66a13!important;border-radius:10px!important;background:#10141c!important;z-index:120!important}
body:has(.university-catalogue) .page-head .catalogue-filter{position:relative!important;display:block!important;overflow:visible!important}
body:has(.university-catalogue) .page-head .catalogue-filter summary,
body:has(.university-catalogue) .page-head #an-scholarship-category-toggle,
body:has(.university-catalogue) .page-head .an-catalogue-favourites{box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:2px!important;width:100%!important;min-width:0!important;max-width:100%!important;height:36px!important;min-height:36px!important;margin:0!important;padding:0!important;background:#10141c!important;color:#ff701c!important;border:1px solid #f66a13!important;border-radius:10px!important;overflow:hidden!important}
body:has(.university-catalogue) .page-head .catalogue-filter summary{font-size:0!important}
body:has(.university-catalogue) .page-head .catalogue-filter summary:before{content:'☷';font-size:21px!important}
body:has(.university-catalogue) .page-head .catalogue-filter .filter-word{display:none!important}
body:has(.university-catalogue) .page-head #an-scholarship-category-toggle{font-size:0!important}
body:has(.university-catalogue) .page-head #an-scholarship-category-toggle:before{content:'🎓';font-size:19px!important}
body:has(.university-catalogue) .page-head .an-catalogue-favourites{font-size:20px!important;text-decoration:none!important}
body:has(.university-catalogue) .page-head .an-catalogue-favourites [data-favorite-count]{font-size:10px!important}
body:has(.university-catalogue) .an-university-directory-bar{display:none!important}
body:has(.university-catalogue) .university-catalogue{margin-top:0!important;padding-top:0!important}
body:has(.university-catalogue) .catalogue-count{margin:0!important;padding:3px 0!important}
body:has(.university-catalogue) .catalogue-filter[open]{z-index:250!important}
body:has(.university-catalogue) .catalogue-filter-panel{z-index:260!important}
.an-favorite-heart,.an-favorite-heart.saved{background:#0b0e14!important;color:#ff690b!important;border-color:#ff690b!important}
@media(max-width:849px){
body:has(.university-catalogue) .page-head>.wrap{grid-template-columns:minmax(0,1fr)!important;gap:4px!important;padding:4px 10px!important}
body:has(.university-catalogue) .an-directory-heading h1{font-size:24px!important}
body:has(.university-catalogue) .page-head .catalogue-tools{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important}
body:has(.university-catalogue) .page-head .catalogue-tools>*{height:33px!important;min-height:33px!important}
body:has(.university-catalogue) .page-head .catalogue-filter summary,
body:has(.university-catalogue) .page-head #an-scholarship-category-toggle,
body:has(.university-catalogue) .page-head .an-catalogue-favourites{height:33px!important;min-height:33px!important}
body:has(.university-catalogue) .page-head .catalogue-filter-panel{position:fixed!important;top:45vh!important;left:10px!important;right:10px!important;width:auto!important;max-height:47vh!important;overflow:auto!important;background:#111720!important;border:1px solid #f66a13!important;border-radius:12px!important;box-shadow:0 10px 35px #000b!important}
body:has(.university-catalogue) .page-head .an-scholarship-category-panel:not([hidden]){position:fixed!important;top:45vh!important;left:10px!important;right:10px!important;max-height:47vh!important;overflow:auto!important;z-index:260!important}
body:has(.university-catalogue) .page-head .catalogue-search:focus-within input{position:fixed!important;top:37vh!important;left:10px!important;right:10px!important;width:calc(100vw - 20px)!important;max-width:none!important}
}
`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
function mount(){
 const dir=document.querySelector('.university-catalogue'),head=document.querySelector('.page-head');if(!dir||!head)return;
 const wrap=head.querySelector('.wrap'),tools=dir.querySelector('.catalogue-tools')||head.querySelector('.catalogue-tools');if(!wrap||!tools)return;
 let heading=wrap.querySelector('.an-directory-heading');
 if(!heading){const h=wrap.querySelector('h1');if(!h)return;heading=document.createElement('div');heading.className='an-directory-heading';h.parentNode.insertBefore(heading,h);heading.appendChild(h);const subtitle=document.createElement('div');subtitle.className='an-directory-subtitle';subtitle.innerHTML='<b>6,210 Universities</b> · <span>40 Study Destinations</span>';heading.appendChild(subtitle)}
 const bread=wrap.querySelector('.bread');if(bread&&bread.parentNode!==heading)heading.insertBefore(bread,heading.firstChild);
 if(tools.parentNode!==wrap)wrap.appendChild(tools);
 const search=tools.querySelector('.catalogue-search'),scholar=tools.querySelector('.an-scholarship-category-wrap'),fav=tools.querySelector('.an-catalogue-favourites'),filter=tools.querySelector('.catalogue-filter');
 [search,scholar,fav,filter].forEach((el,i)=>{if(el&&tools.children[i]!==el)tools.insertBefore(el,tools.children[i]||null)});
 if(search&&!search.dataset.anFocus){search.dataset.anFocus='1';search.querySelector('span')?.addEventListener('click',()=>search.querySelector('input')?.focus())}
}
let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;mount()})}).observe(document.body,{childList:true,subtree:true});mount();
})();