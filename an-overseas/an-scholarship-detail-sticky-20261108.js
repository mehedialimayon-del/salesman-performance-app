/* Scholarship detail: persistent section navigator and compact readable panels. */
(function(){
'use strict';
const css=`
.an-detail-jumpbar{position:sticky;top:calc(var(--an-top-height,65px) + var(--an-ticker-height,32px));z-index:180;background:#10141bf5;border:1px solid #ff8a08;border-radius:10px;padding:7px;display:flex;align-items:center;gap:7px;overflow-x:auto;scrollbar-width:thin;box-shadow:0 6px 22px #0009;margin:8px 0 12px}
.an-detail-jumpbar a{flex:0 0 auto;color:#fff;background:#1e242c;border:1px solid #ff8a08;border-radius:7px;padding:7px 10px;font-size:11px;font-weight:750;text-decoration:none;white-space:nowrap}
.an-detail-jumpbar a:hover,.an-detail-jumpbar a:focus-visible{background:#f97300;color:#fff}
.an-detail-jumpbar .an-detail-back{background:#c95000}
.an-scholarship-detail [data-an-detail-section]{scroll-margin-top:165px}
@media(min-width:1000px){
.an-scholarship-detail{max-width:1500px!important}
.an-scholarship-detail .an-scholarship-lead{gap:12px!important;margin-bottom:10px!important}
.an-scholarship-detail .an-scholarship-section-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}
.an-scholarship-detail .an-scholarship-section-grid>.an-scholarship-section{min-width:0!important;padding:12px!important;margin:0!important}
.an-scholarship-detail .an-scholarship-section-grid h2{font-size:clamp(14px,1.1vw,18px)!important;line-height:1.3!important}
.an-scholarship-detail .an-scholarship-section-grid p{font-size:12px!important;line-height:1.5!important}
}
@media(max-width:999px){.an-detail-jumpbar{top:70px}.an-scholarship-detail .an-scholarship-section-grid{grid-template-columns:1fr!important}}
`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
function mount(){
 const root=document.querySelector('.an-scholarship-detail');if(!root||root.querySelector('.an-detail-jumpbar'))return;
 const sections=[...root.querySelectorAll('.an-scholarship-section-grid > *, .an-scholarship-universities, .an-scholarship-datecard, .an-scholarship-section-full, .an-scholarship-lead')];
 if(!sections.length)return;
 const nav=document.createElement('nav');nav.className='an-detail-jumpbar';nav.setAttribute('aria-label','Scholarship page section navigation');
 const back=document.createElement('a');back.href='#/scholarships';back.className='an-detail-back';back.textContent='← All Scholarships';nav.appendChild(back);
 sections.forEach((el,i)=>{
  const heading=el.querySelector('h2,h3')?.textContent?.trim()||(el.classList.contains('an-scholarship-lead')?'Overview':el.classList.contains('an-scholarship-datecard')?'Deadline':'Section '+(i+1));
  el.id='an-detail-section-'+i;el.dataset.anDetailSection='';
  const a=document.createElement('a');a.href='#'+el.id;a.textContent=heading.replace(/^\\d+\\s*[·.:-]?\\s*/,'').slice(0,34);a.addEventListener('click',e=>{e.preventDefault();el.scrollIntoView({behavior:'smooth',block:'start'})});nav.appendChild(a);
 });
 const lead=root.querySelector('.an-scholarship-lead');if(lead)lead.before(nav);else root.prepend(nav);
}
let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;mount()})}).observe(document.body,{childList:true,subtree:true});mount();
})();