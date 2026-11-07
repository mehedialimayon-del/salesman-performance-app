/* Compact scholarship and university directory presentation. */
(function(){
'use strict';
const css=`
@media(min-width:1050px){
body:has(.an-scholarship-head) .an-scholarship-head-inner{min-height:42px!important;align-items:center!important}
body:has(.an-scholarship-head) .an-scholarship-head-inner .an-scholarship-filters{gap:6px!important}
body:has(.an-scholarship-head) .an-scholarship-head-inner .an-scholarship-filters input,
body:has(.an-scholarship-head) .an-scholarship-head-inner .an-scholarship-filters select{height:29px!important;min-height:29px!important;padding:3px 8px!important;font-size:11px!important;text-overflow:ellipsis}
body:has(.an-scholarship-head) .an-scholarship-head-inner .an-scholarship-filters label{font-size:8px!important}
body:has(.an-scholarship-head) .an-scholarship-head-inner .an-scholarship-total{min-width:150px!important;max-width:180px!important;font-size:10px!important;padding:4px!important}
body:has(.an-scholarship-head) .an-scholarship-head-inner .an-next-scholarship-deadline{font-size:9px!important}
body:has(.an-scholarship-head) .an-scholarship-directory{padding-top:0!important}
body:has(.an-scholarship-head) .an-feature-grid{margin-top:0!important}
body:has(.university-catalogue) .page-head{padding:5px 0!important;overflow:visible!important}
body:has(.university-catalogue) .page-head>.wrap{display:flex!important;align-items:center!important;gap:16px!important;max-width:100%!important}
body:has(.university-catalogue) .page-head h1{font-size:26px!important;margin:0!important;white-space:nowrap!important}
body:has(.university-catalogue) .page-head .bread{font-size:9px!important}
body:has(.university-catalogue) .page-head p{display:none!important}
body:has(.university-catalogue) .page-head .catalogue-tools{flex:1 1 auto!important;min-width:0!important;margin:0!important;display:flex!important;gap:7px!important;align-items:center!important}
body:has(.university-catalogue) .page-head .catalogue-search{flex:1 1 auto!important;min-width:0!important}
body:has(.university-catalogue) .page-head .catalogue-search input{height:35px!important;min-height:35px!important}
body:has(.university-catalogue) .university-catalogue{padding-top:3px!important}
body:has(.university-catalogue) .an-university-directory-bar{margin:0 0 4px!important;padding:2px 0!important}
body:has(.university-catalogue) #results{margin-top:0!important}
}
body:has(.university-catalogue) .an-guide-card a[href*="/university/"]{color:#fff!important}
body:has(.university-catalogue) .an-guide-card .card-open{background:#e96b08!important;color:#fff!important;border-color:#ffae45!important}
body:has(.university-catalogue) .an-guide-card a[href^="https://"]{background:#152b3d!important;color:#bdeaff!important;border-color:#4696c8!important}
body:has(.university-catalogue) .an-guide-card a[href*="/apply"],body:has(.university-catalogue) .an-guide-card [class*="apply"]{background:#145a42!important;color:#fff!important;border-color:#37ba83!important}
body:has(.university-catalogue) .an-guide-card [class*="badge"],body:has(.university-catalogue) .an-guide-card [class*="tag"]{color:#fff!important;text-shadow:0 1px 2px #000!important}

/* November 8: tighter university directory and accessible orange-on-black accents. */
body:has(.university-catalogue) .page-head>.wrap{padding-left:10px!important;gap:10px!important}
body:has(.university-catalogue) .page-head h1{font-size:clamp(27px,2.3vw,35px)!important;line-height:1.1!important}
body:has(.university-catalogue) .page-head .an-directory-heading{flex:0 0 auto;min-width:0}
body:has(.university-catalogue) .page-head .an-directory-heading h1{margin:0!important}
body:has(.university-catalogue) .page-head .an-directory-heading .an-directory-subtitle{font-size:10px;line-height:1.25;margin:3px 0 0;white-space:nowrap}
body:has(.university-catalogue) .page-head .an-directory-heading .an-directory-subtitle b{color:#ff6500}
body:has(.university-catalogue) .page-head .an-directory-heading .an-directory-subtitle span{color:#fff}
body:has(.university-catalogue) .an-university-directory-bar{min-height:15px!important;margin:0!important;padding:0 0 1px!important;line-height:1.15}
body:has(.university-catalogue) .an-university-directory-bar strong{font-size:10px!important;font-weight:600!important}
body:has(.university-catalogue) .university-catalogue{padding-top:0!important}
body:has(.university-catalogue) .catalogue-filter summary{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;white-space:nowrap!important;overflow:hidden!important;box-sizing:border-box!important;min-width:74px!important;padding:6px 9px!important;font-size:11px!important}
body:has(.university-catalogue) .catalogue-filter summary .filter-word{display:inline!important;white-space:nowrap!important;font-size:11px!important;line-height:1!important}
body:has(.university-catalogue) .catalogue-tools{align-items:center!important}
body:has(.university-catalogue) .catalogue-tools>*{flex-shrink:0}
body:has(.university-catalogue) .catalogue-tools .catalogue-search{flex-shrink:1!important}
.an-favorite-heart,.an-favorite-heart.saved,.an-favorite-heart:hover,.an-favorite-heart:focus-visible{background:#0c0e13e8!important;border-color:#ff6500!important;color:#ff6500!important}
body:has(.an-university-profile) .an-profile-fav .an-favorite-heart{background:#0c0e13e8!important;border-color:#ff6500!important;color:#ff6500!important}
body:has(.an-university-profile) .an-university-profile h2,
body:has(.an-university-profile) .an-university-profile h3{color:#fff!important}
body:has(.an-university-profile) .an-university-profile h2::first-letter,
body:has(.an-university-profile) .an-university-profile h3::first-letter{color:#ff6500!important}
body:has(.an-university-profile) .an-university-profile p{color:#fff!important}
body:has(.an-university-profile) .an-university-profile .badge,
body:has(.an-university-profile) .an-university-profile strong{color:#ff6500}
@media(max-width:1049px){
body:has(.university-catalogue) .page-head>.wrap{flex-wrap:wrap!important;padding-left:14px!important}
body:has(.university-catalogue) .page-head .an-directory-heading .an-directory-subtitle{white-space:normal}
body:has(.university-catalogue) .page-head .catalogue-tools{width:100%!important}
}

/* Desktop-only final alignment; mobile controls and behavior are untouched. */
.an-directory-desktop-label,.an-directory-favorite-shortcut{display:none!important}
@media(min-width:1050px){
 body:has(.university-catalogue) .page-head>.wrap{padding-left:0!important;margin-left:0!important;max-width:100%!important;gap:12px!important}
 body:has(.university-catalogue) .page-head .bread{margin-left:8px!important}
 body:has(.university-catalogue) .page-head .an-directory-heading{margin-left:-10px!important}
 body:has(.university-catalogue) .page-head h1{font-size:32px!important}
 body:has(.university-catalogue) .page-head .catalogue-tools{gap:9px!important;justify-content:flex-end!important}
 body:has(.university-catalogue) .page-head .catalogue-search{flex:1 1 auto!important;max-width:none!important;width:auto!important}
 body:has(.university-catalogue) .page-head .catalogue-filter{flex:0 0 auto!important;position:relative!important;min-width:110px!important}
 body:has(.university-catalogue) .page-head .catalogue-filter summary{min-width:110px!important;width:110px!important;min-height:36px!important;padding:7px 11px!important;border:1px solid #ff6500!important;border-radius:10px!important;gap:7px!important;background:#101218!important;color:#fff!important;font-size:12px!important}
 body:has(.university-catalogue) .page-head .catalogue-filter summary .filter-word{font-size:12px!important;display:inline!important}
 body:has(.university-catalogue) .page-head .an-scholarship-category-wrap{flex:0 0 auto!important}
 body:has(.university-catalogue) .page-head #an-scholarship-category-toggle{min-width:132px!important;min-height:36px!important;padding:6px 10px!important;border:1px solid #ff6500!important;border-radius:10px!important;white-space:nowrap!important;font-size:12px!important}
 body:has(.university-catalogue) .page-head .an-directory-desktop-label{display:inline!important;font-size:12px;font-weight:750;margin-left:5px;color:#fff}
 body:has(.university-catalogue) .page-head .an-directory-favorite-shortcut{display:inline-flex!important;align-items:center;justify-content:center;gap:6px;flex:0 0 auto;min-height:36px;padding:6px 11px;border:1px solid #ff6500;border-radius:10px;background:#101218;color:#ff6500;font-size:12px;font-weight:750;white-space:nowrap}
 body:has(.university-catalogue) .an-university-directory-bar{padding:0!important;margin:0!important;min-height:0!important}
 body:has(.university-catalogue) .an-university-directory-bar #an-global-count{display:none!important}
 body:has(.university-catalogue) .university-catalogue{padding-top:0!important}
 body:has(.university-catalogue) .university-catalogue #results{margin-top:0!important}
}

/* Four compact desktop controls in one fixed-height row. */
@media(min-width:1050px){
 body:has(.university-catalogue) .page-head{position:sticky!important;top:var(--an-directory-sticky-top,110px)!important;z-index:24!important;padding:3px 0!important;background:#0c0e14!important}
 body:has(.university-catalogue) .page-head>.wrap{display:grid!important;grid-template-columns:minmax(250px,340px) minmax(0,1fr)!important;gap:12px!important;align-items:center!important;padding:0 12px 0 0!important}
 body:has(.university-catalogue) .page-head .an-directory-heading{margin:0!important}
 body:has(.university-catalogue) .page-head .catalogue-tools{display:grid!important;grid-template-columns:minmax(180px,1fr) 132px 118px 100px!important;gap:7px!important;align-items:center!important;width:100%!important;min-width:0!important}
 body:has(.university-catalogue) .page-head .catalogue-tools>*{min-width:0!important;width:100%!important;max-width:100%!important;margin:0!important;box-sizing:border-box!important}
 body:has(.university-catalogue) .page-head .catalogue-search{width:100%!important}
 body:has(.university-catalogue) .page-head .catalogue-search input{height:34px!important;min-height:34px!important}
 body:has(.university-catalogue) .page-head .catalogue-filter summary{width:100%!important;min-width:0!important;min-height:34px!important;height:34px!important}
 body:has(.university-catalogue) .page-head #an-scholarship-category-toggle{width:100%!important;min-width:0!important;min-height:34px!important;height:34px!important;display:flex!important;align-items:center!important;justify-content:center!important}
 body:has(.university-catalogue) .page-head .an-catalogue-favourites{width:100%!important;min-width:0!important;min-height:34px!important;height:34px!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:4px!important;padding:5px 8px!important;border:1px solid #ff6500!important;border-radius:10px!important;background:#101218!important;color:#ff6500!important;white-space:nowrap!important}
 body:has(.university-catalogue) .page-head .an-catalogue-favourites .an-directory-desktop-label{display:inline!important;color:#fff!important;font-size:11px!important}
 body:has(.university-catalogue) .page-head .an-catalogue-favourites [data-favorite-count]{font-size:10px!important}
 body:has(.university-catalogue) .an-university-directory-bar{margin:0!important;padding:0!important}
 body:has(.university-catalogue) .university-catalogue{padding-top:0!important}
}

/* Correct the grid collision visible in the desktop screenshot. */
@media(min-width:1050px){
 body:has(.university-catalogue) .page-head>.wrap{display:grid!important;grid-template-columns:minmax(245px,330px) minmax(0,1fr)!important;align-items:center!important;gap:12px!important;min-height:47px!important}
 body:has(.university-catalogue) .page-head .an-directory-heading{grid-column:1!important;grid-row:1!important;display:flex!important;flex-direction:column!important;justify-content:center!important;margin:0!important;padding:0 0 0 10px!important;min-width:0!important}
 body:has(.university-catalogue) .page-head .an-directory-heading .bread{display:none!important}
 body:has(.university-catalogue) .page-head .an-directory-heading h1{font-size:clamp(23px,2.1vw,31px)!important;white-space:nowrap!important;line-height:1.05!important}
 body:has(.university-catalogue) .page-head .an-directory-heading .an-directory-subtitle{margin-top:2px!important}
 body:has(.university-catalogue) .page-head .catalogue-tools{grid-column:2!important;grid-row:1!important;display:grid!important;grid-template-columns:minmax(150px,1fr) 132px 118px 105px!important;gap:8px!important;min-width:0!important;width:100%!important;margin:0!important;align-items:center!important}
 body:has(.university-catalogue) .page-head .catalogue-tools>*{min-width:0!important;max-width:100%!important;position:relative!important}
 body:has(.university-catalogue) .page-head .catalogue-filter{min-width:0!important;width:100%!important}
 body:has(.university-catalogue) .page-head .catalogue-filter summary{width:100%!important;min-width:0!important}
 body:has(.university-catalogue) .page-head .catalogue-search{min-width:0!important;width:100%!important}
 body:has(.university-catalogue) .page-head .catalogue-search input{width:100%!important;min-width:0!important}
 body:has(.university-catalogue) .page-head .an-scholarship-category-wrap{min-width:0!important;width:100%!important}
 body:has(.university-catalogue) .page-head .an-catalogue-favourites{min-width:0!important;width:100%!important}
}

/* Final responsive university navigation: one slim bar, four original controls. */
body:has(.university-catalogue) .an-university-directory-bar{margin:0!important;padding:0!important;min-height:0!important}
body:has(.university-catalogue) .an-university-directory-bar strong,
body:has(.university-catalogue) #an-global-count{display:none!important}
body:has(.university-catalogue) .university-catalogue{padding-top:0!important}
body:has(.university-catalogue) .catalogue-tools .an-directory-desktop-label{display:none!important}
body:has(.university-catalogue) .catalogue-tools .filter-word{display:none!important}
body:has(.university-catalogue) .page-head .an-directory-heading{min-width:0!important}
body:has(.university-catalogue) .page-head .catalogue-tools{min-width:0!important}
body:has(.university-catalogue) .page-head .catalogue-tools .catalogue-filter summary{font-size:0!important}
body:has(.university-catalogue) .page-head .catalogue-tools .catalogue-filter summary::first-letter{font-size:18px!important}
body:has(.university-catalogue) .page-head .catalogue-tools #an-scholarship-category-toggle{font-size:20px!important}
body:has(.university-catalogue) .page-head .catalogue-tools .an-catalogue-favourites{font-size:20px!important}
@media(min-width:1050px){
 body:has(.university-catalogue) .page-head{padding:2px 0!important}
 body:has(.university-catalogue) .page-head>.wrap{display:grid!important;grid-template-columns:minmax(260px,340px) minmax(0,1fr)!important;grid-template-rows:44px!important;gap:8px!important;padding:0 14px!important;margin:0 auto!important;align-items:center!important}
 body:has(.university-catalogue) .page-head .an-directory-heading{grid-column:1!important;grid-row:1!important;margin:0!important;padding:0!important;justify-content:center!important}
 body:has(.university-catalogue) .page-head .catalogue-tools{grid-column:2!important;grid-row:1!important;display:grid!important;grid-template-columns:minmax(0,1fr) repeat(3,44px)!important;gap:7px!important;width:100%!important;margin:0!important}
 body:has(.university-catalogue) .page-head .catalogue-tools>*{width:100%!important;max-width:100%!important;min-width:0!important;min-height:38px!important;height:38px!important;margin:0!important}
 body:has(.university-catalogue) .page-head .catalogue-search{display:flex!important;align-items:center!important}
 body:has(.university-catalogue) .page-head .catalogue-search input{width:100%!important;min-width:0!important;height:38px!important}
 body:has(.university-catalogue) .page-head .catalogue-filter summary,
 body:has(.university-catalogue) .page-head #an-scholarship-category-toggle,
 body:has(.university-catalogue) .page-head .an-catalogue-favourites{width:44px!important;min-width:44px!important;max-width:44px!important;height:38px!important;min-height:38px!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;gap:0!important}
 body:has(.university-catalogue) .page-head .an-catalogue-favourites [data-favorite-count]{font-size:9px!important}
}
@media(max-width:1049px){
 body:has(.university-catalogue) .page-head{padding:3px 0!important;overflow:visible!important}
 body:has(.university-catalogue) .page-head>.wrap{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-rows:auto!important;gap:5px!important;align-items:center!important;padding:2px 12px!important}
 body:has(.university-catalogue) .page-head .an-directory-heading{grid-column:1!important;grid-row:1!important;padding:0!important;margin:0!important}
 body:has(.university-catalogue) .page-head .an-directory-heading h1{font-size:clamp(19px,4.2vw,28px)!important;white-space:nowrap!important}
 body:has(.university-catalogue) .page-head .an-directory-heading .an-directory-subtitle{font-size:9px!important}
 body:has(.university-catalogue) .page-head .catalogue-tools{grid-column:2!important;grid-row:1!important;display:flex!important;flex-wrap:nowrap!important;gap:4px!important;width:auto!important;max-width:100%!important;margin:0!important}
 body:has(.university-catalogue) .page-head .catalogue-tools>*{flex:0 0 34px!important;width:34px!important;min-width:34px!important;max-width:34px!important;height:34px!important;min-height:34px!important;margin:0!important;padding:0!important}
 body:has(.university-catalogue) .page-head .catalogue-search{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important;border:1px solid #ff6500!important;border-radius:10px!important}
 body:has(.university-catalogue) .page-head .catalogue-search>span{font-size:23px!important}
 body:has(.university-catalogue) .page-head .catalogue-search input{position:absolute!important;right:0!important;top:0!important;width:0!important;max-width:0!important;min-width:0!important;height:34px!important;opacity:0!important;padding:0!important;border:0!important}
 body:has(.university-catalogue) .page-head .catalogue-search:focus-within input{width:min(65vw,280px)!important;max-width:65vw!important;opacity:1!important;z-index:50!important;padding:5px 10px!important;background:#11141b!important;border:1px solid #ff6500!important;border-radius:10px!important}
 body:has(.university-catalogue) .page-head .catalogue-filter summary,
 body:has(.university-catalogue) .page-head #an-scholarship-category-toggle,
 body:has(.university-catalogue) .page-head .an-catalogue-favourites{width:34px!important;min-width:34px!important;max-width:34px!important;height:34px!important;min-height:34px!important;padding:0!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:0!important;overflow:hidden!important}
 body:has(.university-catalogue) .page-head .catalogue-filter summary{font-size:17px!important}
 body:has(.university-catalogue) .page-head .catalogue-tools .filter-word{display:none!important}
 body:has(.university-catalogue) .page-head .catalogue-tools .an-directory-desktop-label{display:none!important}
 body:has(.university-catalogue) .page-head .catalogue-tools #an-scholarship-category-toggle{font-size:19px!important}
 body:has(.university-catalogue) .page-head .catalogue-tools .an-catalogue-favourites{font-size:19px!important}
 body:has(.university-catalogue) .page-head .catalogue-tools .an-catalogue-favourites [data-favorite-count]{font-size:9px!important}
}

/* Portfolio colour hierarchy shared by desktop and mobile. */
body:has(.an-study-section) .an-study-section{background:#10151d!important;border-color:#a94a17!important;color:#fff!important}
body:has(.an-study-section) .an-study-section h2,
body:has(.an-study-section) .an-study-section h3{color:#fff!important}
body:has(.an-study-section) .an-study-section p,
body:has(.an-study-section) .an-study-section li{color:#f7f7f7!important}
body:has(.an-study-section) .an-study-section a{color:#ff7928!important}
body:has(.an-study-section) .an-study-section strong{color:#fff}
body:has(.an-study-section) .an-study-section .an-study-section-icon{color:#ff6500!important}
`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
function setStickyTop(){
 const top=document.querySelector('.top');
 const ticker=document.querySelector('.ticker');
 const height=(top?top.getBoundingClientRect().height:0)+(ticker?ticker.getBoundingClientRect().height:0);
 document.documentElement.style.setProperty('--an-directory-sticky-top',height+'px');
}
function mount(){
 setStickyTop();
 const directory=document.querySelector('.university-catalogue'),head=document.querySelector('.page-head');
 if(!directory||!head)return;
 const tools=directory.querySelector('.catalogue-tools'),wrap=head.querySelector('.wrap');
 if(tools&&wrap&&tools.parentElement!==wrap)wrap.appendChild(tools);
 if(wrap){
  const bread=wrap.querySelector('.bread');
  const heading=wrap.querySelector('.an-directory-heading');
  if(bread&&heading&&bread.parentElement!==heading)heading.insertBefore(bread,heading.firstChild);
 }
 if(wrap&&!wrap.querySelector('.an-directory-heading')){
  const h=wrap.querySelector('h1');
  if(h){
   const holder=document.createElement('div');holder.className='an-directory-heading';
   h.parentNode.insertBefore(holder,h);holder.appendChild(h);
   const sub=document.createElement('div');sub.className='an-directory-subtitle';
   sub.innerHTML='<b>6,210 Universities</b> <span>• 40 Study Destinations</span>';
   holder.appendChild(sub);
   const bread=wrap.querySelector('.bread');if(bread)holder.insertBefore(bread,holder.firstChild);
  }
 }
 if(tools){
  const scholarship=tools.querySelector('#an-scholarship-category-toggle');
  if(scholarship&&!scholarship.querySelector('.an-directory-desktop-label')){
   const label=document.createElement('span');label.className='an-directory-desktop-label';label.textContent='Scholarships';scholarship.appendChild(label);
  }

 }
 const favorite=tools&&tools.querySelector('.an-catalogue-favourites');
 if(favorite&&!favorite.querySelector('.an-directory-desktop-label')){
  const label=document.createElement('span');label.className='an-directory-desktop-label';label.textContent='Favourites';favorite.appendChild(label);
 }
 if(tools){
  const search=tools.querySelector('.catalogue-search');
  if(search&&!search.dataset.anSearchToggle){search.dataset.anSearchToggle='1';const glyph=search.querySelector('span'),input=search.querySelector('input');if(glyph&&input){glyph.style.cursor='pointer';glyph.addEventListener('click',()=>input.focus())}}
  const scholarship=tools.querySelector('.an-scholarship-category-wrap'),fav=tools.querySelector('.an-catalogue-favourites'),filter=tools.querySelector('.catalogue-filter');
  [search,scholarship,fav,filter].forEach((el,i)=>{if(el&&tools.children[i]!==el)tools.insertBefore(el,tools.children[i]||null)});
 }
 const count=directory.querySelector('#an-global-count');
 if(count&&count.textContent.includes('universities in our world directory'))count.textContent='6,210 matching universities of 6,210 worldwide · All Countries';
}
let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;mount()})}).observe(document.body,{childList:true,subtree:true});mount();
})();