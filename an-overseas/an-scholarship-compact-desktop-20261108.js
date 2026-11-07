/* Compact desktop scholarship heading; retains original filter elements and event handlers. */
(function(){
'use strict';
const css=`
@media(min-width:1050px){
.an-scholarship-head{padding-top:8px!important;padding-bottom:6px!important}
.an-scholarship-head>.wrap{max-width:100%!important}
.an-scholarship-head-inner{display:flex!important;align-items:end!important;gap:14px!important;flex-wrap:nowrap!important}
.an-scholarship-head-inner>div:first-child{flex:0 0 auto;min-width:0}
.an-scholarship-head-inner h1{font-size:clamp(23px,2.1vw,34px)!important;white-space:nowrap!important;margin:2px 0 0!important}
.an-scholarship-head-inner .an-eyebrow{font-size:10px!important}
.an-scholarship-head-inner .an-scholarship-filters{flex:1 1 auto!important;min-width:0!important;display:grid!important;grid-template-columns:minmax(140px,1.1fr) minmax(125px,1fr) minmax(125px,1fr)!important;gap:8px!important;margin:0!important;padding:0!important;align-items:end!important}
.an-scholarship-head-inner .an-scholarship-filters label{min-width:0!important;font-size:9px!important;margin:0!important;line-height:1.15!important}
.an-scholarship-head-inner .an-scholarship-filters input,.an-scholarship-head-inner .an-scholarship-filters select{width:100%!important;min-width:0!important;height:35px!important;min-height:35px!important;padding:5px 9px!important;font-size:11px!important;margin-top:3px!important}
.an-scholarship-head-inner .an-scholarship-total{flex:0 0 auto!important;white-space:nowrap!important;font-size:10px!important;padding:9px 10px!important;margin:0!important}
.an-scholarship-directory{padding-top:2px!important;margin-top:0!important}
.an-scholarship-content-scroll{margin-top:0!important}
.an-feature-grid{margin-top:0!important}
}
@media(min-width:1050px) and (max-width:1250px){
.an-scholarship-head-inner{gap:8px!important}
.an-scholarship-head-inner h1{font-size:22px!important}
.an-scholarship-head-inner .an-scholarship-filters{gap:5px!important;grid-template-columns:minmax(110px,1.1fr) minmax(95px,1fr) minmax(95px,1fr)!important}
.an-scholarship-head-inner .an-scholarship-total{font-size:9px!important;padding:8px 6px!important}
}
`;
const style=document.createElement('style');style.id='an-scholarship-compact-desktop-style';style.textContent=css;document.head.appendChild(style);
function arrange(){
 const head=document.querySelector('.an-scholarship-head-inner');
 const filters=document.querySelector('.an-scholarship-directory > .an-scholarship-filters');
 if(!head||!filters||filters.parentElement===head)return;
 const total=head.querySelector('.an-scholarship-total');
 if(total)head.insertBefore(filters,total);else head.appendChild(filters);
}
let queued=false;
new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;arrange()})}).observe(document.body,{childList:true,subtree:true});
arrange();
})();