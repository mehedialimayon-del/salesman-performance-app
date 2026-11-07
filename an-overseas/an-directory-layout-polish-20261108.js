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
`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
function mount(){
 const directory=document.querySelector('.university-catalogue'),head=document.querySelector('.page-head');
 if(!directory||!head)return;
 const tools=directory.querySelector('.catalogue-tools'),wrap=head.querySelector('.wrap');
 if(tools&&wrap&&tools.parentElement!==wrap)wrap.appendChild(tools);
}
let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;mount()})}).observe(document.body,{childList:true,subtree:true});mount();
})();