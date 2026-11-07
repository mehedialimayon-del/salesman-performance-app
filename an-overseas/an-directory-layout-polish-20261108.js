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
 const count=directory.querySelector('#an-global-count');
 if(count&&count.textContent.includes('universities in our world directory'))count.textContent='6,210 matching universities of 6,210 worldwide · All Countries';
}
let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;mount()})}).observe(document.body,{childList:true,subtree:true});mount();
})();