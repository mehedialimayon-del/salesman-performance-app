/* A&N directory layout: single stable responsive implementation. */
(function(){
'use strict';
const style=document.createElement('style');
style.textContent=`
body:has(.university-catalogue) .page-head{position:sticky!important;top:var(--an-dir-top,0px)!important;z-index:80!important;background:#0b0d13!important;padding:4px 0!important;margin:0!important;overflow:visible!important}
body:has(.university-catalogue) .page-head>.wrap{width:100%!important;max-width:100%!important;box-sizing:border-box!important;display:grid!important;align-items:center!important;gap:8px!important;padding:0 12px!important;margin:0!important}
body:has(.university-catalogue) .page-head .an-directory-heading{min-width:0!important;margin:0!important;padding:0!important;display:flex!important;flex-direction:column!important;justify-content:center!important}
body:has(.university-catalogue) .page-head .an-directory-heading .bread{font-size:9px!important;line-height:1.1!important;margin:0 0 2px!important}
body:has(.university-catalogue) .page-head .an-directory-heading h1{font-size:clamp(18px,2.3vw,31px)!important;line-height:1.08!important;margin:0!important;white-space:nowrap!important}
body:has(.university-catalogue) .page-head .an-directory-subtitle{font-size:10px!important;line-height:1.15!important;margin:2px 0 0!important;white-space:nowrap!important}
body:has(.university-catalogue) .page-head .an-directory-subtitle b{color:#ff6500!important}
body:has(.university-catalogue) .page-head .an-directory-subtitle span{color:#fff!important}
body:has(.university-catalogue) .page-head p{display:none!important}
body:has(.university-catalogue) .page-head .catalogue-tools{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;align-items:center!important;gap:5px!important;width:100%!important;min-width:0!important;margin:0!important;padding:0!important}
body:has(.university-catalogue) .page-head .catalogue-tools>*{box-sizing:border-box!important;width:100%!important;min-width:0!important;max-width:100%!important;height:35px!important;min-height:35px!important;margin:0!important;position:relative!important}
body:has(.university-catalogue) .page-head .catalogue-search{display:flex!important;align-items:center!important;justify-content:center!important;border:1px solid #ff6500!important;border-radius:9px!important;background:#101218!important;overflow:visible!important}
body:has(.university-catalogue) .page-head .catalogue-search>span{font-size:19px!important;cursor:pointer!important;color:#ff6500!important}
body:has(.university-catalogue) .page-head .catalogue-search input{position:absolute!important;top:0!important;right:0!important;width:0!important;min-width:0!important;max-width:0!important;height:34px!important;opacity:0!important;padding:0!important;border:0!important;pointer-events:none!important}
body:has(.university-catalogue) .page-head .catalogue-search:focus-within input{width:min(55vw,310px)!important;min-width:0!important;max-width:55vw!important;opacity:1!important;pointer-events:auto!important;padding:4px 9px!important;background:#101218!important;border:1px solid #ff6500!important;border-radius:9px!important;z-index:100!important}
body:has(.university-catalogue) .page-head .catalogue-filter{width:100%!important;min-width:0!important;position:relative!important}
body:has(.university-catalogue) .page-head .catalogue-filter summary,
body:has(.university-catalogue) .page-head #an-scholarship-category-toggle,
body:has(.university-catalogue) .page-head .an-catalogue-favourites{display:flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;width:100%!important;min-width:0!important;max-width:100%!important;height:35px!important;min-height:35px!important;margin:0!important;padding:0!important;border:1px solid #ff6500!important;border-radius:9px!important;background:#101218!important;color:#ff6500!important;overflow:hidden!important;gap:2px!important}
body:has(.university-catalogue) .page-head .catalogue-filter summary{font-size:18px!important}
body:has(.university-catalogue) .page-head .catalogue-filter .filter-word,
body:has(.university-catalogue) .page-head .an-directory-desktop-label{display:none!important}
body:has(.university-catalogue) .page-head #an-scholarship-category-toggle,
body:has(.university-catalogue) .page-head .an-catalogue-favourites{font-size:19px!important}
body:has(.university-catalogue) .page-head .an-catalogue-favourites [data-favorite-count]{font-size:10px!important}
body:has(.university-catalogue) .an-university-directory-bar{display:none!important}
body:has(.university-catalogue) .university-catalogue{padding-top:0!important;margin-top:0!important}
body:has(.university-catalogue) .catalogue-count{margin-top:0!important;padding-top:0!important}
body:has(.university-catalogue) .catalogue-filter-panel{z-index:200!important}
body:has(.university-catalogue) .catalogue-filter[open]{z-index:210!important}
.an-favorite-heart,.an-favorite-heart.saved{background:#0c0e13!important;color:#ff6500!important;border-color:#ff6500!important}
@media(min-width:850px){
body:has(.university-catalogue) .page-head>.wrap{grid-template-columns:minmax(245px,350px) minmax(0,1fr)!important;grid-template-rows:46px!important}
body:has(.university-catalogue) .page-head .an-directory-heading{grid-column:1!important;grid-row:1!important}
body:has(.university-catalogue) .page-head .catalogue-tools{grid-column:2!important;grid-row:1!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}
body:has(.university-catalogue) .page-head .catalogue-tools>*{height:36px!important;min-height:36px!important}
body:has(.university-catalogue) .page-head .catalogue-search:focus-within input{width:100%!important;max-width:100%!important}
}
@media(max-width:849px){
body:has(.university-catalogue) .page-head>.wrap{grid-template-columns:minmax(0,1fr) 148px!important;grid-template-rows:auto!important;gap:5px!important;padding:3px 10px!important}
body:has(.university-catalogue) .page-head .an-directory-heading{grid-column:1!important;grid-row:1!important}
body:has(.university-catalogue) .page-head .an-directory-heading h1{font-size:clamp(16px,4vw,25px)!important;white-space:normal!important}
body:has(.university-catalogue) .page-head .an-directory-subtitle{font-size:8px!important;white-space:normal!important}
body:has(.university-catalogue) .page-head .catalogue-tools{grid-column:2!important;grid-row:1!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:3px!important}
body:has(.university-catalogue) .page-head .catalogue-tools>*{height:31px!important;min-height:31px!important}
body:has(.university-catalogue) .page-head .catalogue-filter summary,
body:has(.university-catalogue) .page-head #an-scholarship-category-toggle,
body:has(.university-catalogue) .page-head .an-catalogue-favourites{height:31px!important;min-height:31px!important;font-size:16px!important}
body:has(.university-catalogue) .page-head .catalogue-search input{height:31px!important}
body:has(.university-catalogue) .page-head .catalogue-search:focus-within input{width:min(60vw,250px)!important;max-width:60vw!important}
body:has(.university-catalogue) .catalogue-filter-panel{position:fixed!important;top:calc(var(--an-dir-top,0px) + 64px)!important;left:10px!important;right:10px!important;width:auto!important;max-width:none!important;max-height:65dvh!important;overflow-y:auto!important;z-index:250!important;background:#11151d!important;border:1px solid #ff6500!important;border-radius:12px!important;box-shadow:0 12px 40px #000c!important}
body:has(.university-catalogue) .an-scholarship-category-panel:not([hidden]){position:fixed!important;top:calc(var(--an-dir-top,0px) + 64px)!important;left:10px!important;right:10px!important;max-height:65dvh!important;overflow-y:auto!important;z-index:250!important}
}

/* Mobile repair: no blank sticky offset, no clipped controls, restore original action colours. */
@media(max-width:849px){
body:has(.university-catalogue) .page-head{position:relative!important;top:auto!important;margin-top:0!important;transform:none!important}
body:has(.university-catalogue) .page-head>.wrap{display:grid!important;grid-template-columns:minmax(0,1fr) 132px!important;gap:5px!important;padding:3px 8px!important;overflow:visible!important}
body:has(.university-catalogue) .page-head .an-directory-heading{min-width:0!important;max-width:100%!important;overflow:hidden!important}
body:has(.university-catalogue) .page-head .an-directory-heading h1{font-size:clamp(17px,3.8vw,24px)!important;line-height:1.12!important;overflow:visible!important}
body:has(.university-catalogue) .page-head .catalogue-tools{width:132px!important;max-width:132px!important;min-width:132px!important;display:grid!important;grid-template-columns:repeat(4,30px)!important;gap:4px!important;overflow:visible!important}
body:has(.university-catalogue) .page-head .catalogue-tools>*{width:30px!important;min-width:30px!important;max-width:30px!important;height:30px!important;min-height:30px!important;flex:none!important}
body:has(.university-catalogue) .page-head .catalogue-search,
body:has(.university-catalogue) .page-head .catalogue-filter summary,
body:has(.university-catalogue) .page-head #an-scholarship-category-toggle,
body:has(.university-catalogue) .page-head .an-catalogue-favourites{width:30px!important;min-width:30px!important;max-width:30px!important;height:30px!important;min-height:30px!important;padding:0!important;overflow:hidden!important}
body:has(.university-catalogue) .page-head #an-scholarship-category-toggle{font-size:0!important}
body:has(.university-catalogue) .page-head #an-scholarship-category-toggle::before{content:'🎓';font-size:17px!important;line-height:1}
body:has(.university-catalogue) .page-head .catalogue-filter summary{font-size:0!important}
body:has(.university-catalogue) .page-head .catalogue-filter summary::before{content:'☷';font-size:19px!important}
body:has(.university-catalogue) .page-head .catalogue-search>span{font-size:18px!important}
body:has(.university-catalogue) .page-head .an-catalogue-favourites{font-size:17px!important}
body:has(.university-catalogue) .catalogue-filter-panel{top:calc(var(--an-dir-top,0px) + 8px)!important}
}
.university-catalogue #results .uni-card .card-open,
.university-catalogue #results .uni-card a[href*="/university/"]{background:#f46b08!important;color:#fff!important;border-color:#ff9c3a!important}
.university-catalogue #results .uni-card a[href^="https://"]{background:#152b3d!important;color:#38bfff!important;border-color:#2986bc!important}
.university-catalogue #results .uni-card a[href*="/apply"],
.university-catalogue #results .uni-card [class*="apply"]{background:#087e52!important;color:#fff!important;border-color:#27b979!important}

/* Final compact mobile icon rail: never allow inherited wide search sizing. */
@media(max-width:849px){
body:has(.university-catalogue) .page-head>.wrap{grid-template-columns:minmax(0,1fr) 128px!important;gap:4px!important;padding:3px 8px!important}
body:has(.university-catalogue) .page-head .catalogue-tools{grid-template-columns:repeat(4,29px)!important;grid-template-rows:30px!important;gap:4px!important;width:128px!important;min-width:128px!important;max-width:128px!important;justify-self:end!important;overflow:visible!important}
body:has(.university-catalogue) .page-head .catalogue-tools>*,
body:has(.university-catalogue) .page-head .catalogue-tools .catalogue-search,
body:has(.university-catalogue) .page-head .catalogue-tools .an-scholarship-category-wrap,
body:has(.university-catalogue) .page-head .catalogue-tools .an-catalogue-favourites,
body:has(.university-catalogue) .page-head .catalogue-tools .catalogue-filter{display:flex!important;grid-column:auto!important;grid-row:1!important;flex:0 0 29px!important;width:29px!important;min-width:29px!important;max-width:29px!important;height:30px!important;min-height:30px!important;margin:0!important;padding:0!important}
body:has(.university-catalogue) .page-head .catalogue-tools .catalogue-search input:not(:focus){width:0!important;min-width:0!important;max-width:0!important;opacity:0!important;pointer-events:none!important}
body:has(.university-catalogue) .page-head .catalogue-tools .catalogue-search:focus-within input{position:fixed!important;left:12px!important;right:12px!important;top:calc(var(--an-dir-top,0px) + 44px)!important;width:calc(100vw - 24px)!important;max-width:none!important;opacity:1!important;pointer-events:auto!important;z-index:260!important}
body:has(.university-catalogue) .page-head .catalogue-tools .catalogue-filter summary,
body:has(.university-catalogue) .page-head .catalogue-tools #an-scholarship-category-toggle,
body:has(.university-catalogue) .page-head .catalogue-tools .an-catalogue-favourites{width:29px!important;min-width:29px!important;max-width:29px!important;height:30px!important;min-height:30px!important}
body:has(.university-catalogue) .page-head .an-directory-heading h1{font-size:clamp(16px,3.8vw,22px)!important}
body:has(.university-catalogue) .page-head .an-directory-subtitle{font-size:8px!important}
}

/* Correct actual mobile viewport: a complete icon rail, never horizontal overflow. */
@media(max-width:849px){
body:has(.university-catalogue) .page-head>.wrap{display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:3px!important;padding:5px 10px!important}
body:has(.university-catalogue) .page-head .an-directory-heading{width:100%!important;max-width:100%!important;overflow:visible!important}
body:has(.university-catalogue) .page-head .an-directory-heading h1{font-size:clamp(21px,5.1vw,27px)!important;white-space:normal!important}
body:has(.university-catalogue) .page-head .catalogue-tools{display:grid!important;grid-column:auto!important;grid-row:auto!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-template-rows:36px!important;gap:7px!important;width:100%!important;min-width:0!important;max-width:100%!important;margin:0!important}
body:has(.university-catalogue) .page-head .catalogue-tools>*,
body:has(.university-catalogue) .page-head .catalogue-tools .catalogue-search,
body:has(.university-catalogue) .page-head .catalogue-tools .an-scholarship-category-wrap,
body:has(.university-catalogue) .page-head .catalogue-tools .an-catalogue-favourites,
body:has(.university-catalogue) .page-head .catalogue-tools .catalogue-filter{grid-row:1!important;grid-column:auto!important;box-sizing:border-box!important;width:100%!important;min-width:0!important;max-width:100%!important;height:36px!important;min-height:36px!important;flex:1 1 auto!important;margin:0!important;padding:0!important}
body:has(.university-catalogue) .page-head .catalogue-tools .catalogue-filter summary,
body:has(.university-catalogue) .page-head .catalogue-tools #an-scholarship-category-toggle,
body:has(.university-catalogue) .page-head .catalogue-tools .an-catalogue-favourites{width:100%!important;max-width:100%!important;min-width:0!important;height:36px!important;min-height:36px!important}
body:has(.university-catalogue) .page-head .catalogue-tools .catalogue-search input:not(:focus){width:0!important;max-width:0!important;opacity:0!important}
body:has(.university-catalogue) .page-head .catalogue-tools .catalogue-search:focus-within input{position:fixed!important;left:10px!important;right:10px!important;top:calc(var(--an-dir-top,0px) + 80px)!important;width:calc(100vw - 20px)!important;max-width:none!important;z-index:300!important;opacity:1!important}
body:has(.university-catalogue) .page-head .catalogue-tools .an-scholarship-category-wrap{overflow:visible!important}
body:has(.university-catalogue) .page-head .catalogue-tools .catalogue-filter summary{font-size:0!important}
body:has(.university-catalogue) .page-head .catalogue-tools .catalogue-filter summary::before{content:'☷'!important;font-size:20px!important}
body:has(.university-catalogue) .page-head .catalogue-tools #an-scholarship-category-toggle{font-size:0!important}
body:has(.university-catalogue) .page-head .catalogue-tools #an-scholarship-category-toggle::before{content:'🎓'!important;font-size:19px!important}
body:has(.university-catalogue) .page-head .catalogue-filter-panel{top:calc(var(--an-dir-top,0px) + 10px)!important}
}
`;
document.head.appendChild(style);
function mount(){
 const directory=document.querySelector('.university-catalogue');
 const head=document.querySelector('.page-head');
 if(!directory||!head)return;
 const wrap=head.querySelector('.wrap'),tools=directory.querySelector('.catalogue-tools')||head.querySelector('.catalogue-tools');
 if(!wrap||!tools)return;
 let heading=wrap.querySelector('.an-directory-heading');
 if(!heading){
  const h=wrap.querySelector('h1');if(!h)return;
  heading=document.createElement('div');heading.className='an-directory-heading';
  h.parentNode.insertBefore(heading,h);heading.appendChild(h);
  const sub=document.createElement('div');sub.className='an-directory-subtitle';
  sub.innerHTML='<b>6,210 Universities</b> <span>• 40 Study Destinations</span>';heading.appendChild(sub);
 }
 const bread=wrap.querySelector('.bread');if(bread&&bread.parentElement!==heading)heading.insertBefore(bread,heading.firstChild);
 if(tools.parentElement!==wrap)wrap.appendChild(tools);
 const search=tools.querySelector('.catalogue-search'),scholarship=tools.querySelector('.an-scholarship-category-wrap'),favorite=tools.querySelector('.an-catalogue-favourites'),filter=tools.querySelector('.catalogue-filter');
 [search,scholarship,favorite,filter].forEach((el,i)=>{if(el&&tools.children[i]!==el)tools.insertBefore(el,tools.children[i]||null)});
 if(search&&!search.dataset.anToggle){search.dataset.anToggle='1';const glyph=search.querySelector('span'),input=search.querySelector('input');if(glyph&&input)glyph.addEventListener('click',()=>input.focus())}
 const old=tools.querySelector('.an-directory-favorite-shortcut');if(old)old.remove();
 const top=document.querySelector('.top'),ticker=document.querySelector('.ticker');
 const topHeight=(top?top.getBoundingClientRect().height:0)+(ticker?ticker.getBoundingClientRect().height:0);
 const current=document.documentElement.style.getPropertyValue('--an-dir-top');
 const next=topHeight+'px';if(current!==next)document.documentElement.style.setProperty('--an-dir-top',next);
}
let queued=false;
new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount()})}).observe(document.body,{childList:true,subtree:true});
window.addEventListener('resize',mount,{passive:true});
mount();
})();