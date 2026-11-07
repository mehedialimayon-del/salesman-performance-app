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
`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
function mount(){
 const directory=document.querySelector('.university-catalogue'),head=document.querySelector('.page-head');
 if(!directory||!head)return;
 const tools=directory.querySelector('.catalogue-tools'),wrap=head.querySelector('.wrap');
 if(tools&&wrap&&tools.parentElement!==wrap)wrap.appendChild(tools);
 if(wrap&&!wrap.querySelector('.an-directory-heading')){
  const h=wrap.querySelector('h1');
  if(h){
   const holder=document.createElement('div');holder.className='an-directory-heading';
   h.parentNode.insertBefore(holder,h);holder.appendChild(h);
   const sub=document.createElement('div');sub.className='an-directory-subtitle';
   sub.innerHTML='<b>6,210 Universities</b> <span>• 40 Study Destinations</span>';
   holder.appendChild(sub);
  }
 }
 if(tools){
  const scholarship=tools.querySelector('#an-scholarship-category-toggle');
  if(scholarship&&!scholarship.querySelector('.an-directory-desktop-label')){
   const label=document.createElement('span');label.className='an-directory-desktop-label';label.textContent='Scholarships';scholarship.appendChild(label);
  }
  if(!tools.querySelector('.an-directory-favorite-shortcut')){
   const fav=document.createElement('a');fav.className='an-directory-favorite-shortcut';fav.href='#/favorites';fav.innerHTML='♡ <span>Favourites</span>';
   fav.setAttribute('aria-label','Saved universities');tools.appendChild(fav);
  }
 }
 const count=directory.querySelector('#an-global-count');
 if(count&&count.textContent.includes('universities in our world directory'))count.textContent='6,210 matching universities of 6,210 worldwide · All Countries';
}
let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;mount()})}).observe(document.body,{childList:true,subtree:true});mount();
})();