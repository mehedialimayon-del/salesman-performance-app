/* Compact desktop scholarship heading; retains original filter elements and event handlers. */
(function(){
'use strict';
const css=`
body:has(.an-scholarship-detail) .top,body:has(.an-scholarship-head) .top{position:sticky!important;top:0!important;z-index:200!important}
body:has(.an-scholarship-detail) .ticker,body:has(.an-scholarship-head) .ticker{position:sticky!important;top:var(--an-top-height,65px)!important;z-index:190!important}
body:has(.an-scholarship-head) .an-scholarship-head{position:sticky!important;top:calc(var(--an-top-height,65px) + var(--an-ticker-height,32px))!important;z-index:180!important;background:#101319!important;border-bottom:1px solid #ff8a08!important}
.an-scholarship-filters .an-section-selector{position:relative;display:flex;flex-direction:column;gap:3px;font-size:9px;font-weight:800;color:#ffd28a;min-width:0}
.an-section-selector select{width:100%;height:35px;background:#1d242d;color:#fff;border:1px solid #ff8a08;border-radius:7px;font-size:11px;padding:4px}
.an-scholarship-head-inner .an-scholarship-total{align-self:stretch!important;justify-content:center!important;min-width:145px!important}
@media(min-width:1050px){.an-scholarship-head-inner{align-items:end!important}.an-scholarship-head-inner>div:first-child{align-self:start!important}.an-scholarship-head-inner .an-eyebrow{display:block!important}}

@media(min-width:1050px){
.an-scholarship-head{padding-top:0!important;padding-bottom:0!important;margin-top:0!important}
.an-scholarship-head>.wrap{max-width:100%!important}
.an-scholarship-head-inner{display:flex!important;align-items:center!important;gap:10px!important;flex-wrap:nowrap!important;min-height:48px!important}
.an-scholarship-head-inner>div:first-child{flex:0 0 auto;min-width:0}
.an-scholarship-head-inner h1{font-size:clamp(22px,2vw,31px)!important;white-space:nowrap!important;margin:0!important;line-height:1.08!important}
.an-scholarship-head-inner .an-eyebrow{font-size:10px!important}
.an-scholarship-head-inner .an-scholarship-filters{flex:1 1 auto!important;min-width:0!important;display:grid!important;grid-template-columns:minmax(130px,1.2fr) minmax(110px,1fr) minmax(110px,1fr) minmax(115px,.85fr)!important;gap:8px!important;margin:0!important;padding:0!important;align-items:end!important}
.an-scholarship-head-inner .an-scholarship-filters label{min-width:0!important;font-size:9px!important;margin:0!important;line-height:1.15!important}
.an-scholarship-head-inner .an-scholarship-filters input,.an-scholarship-head-inner .an-scholarship-filters select{width:100%!important;min-width:0!important;height:35px!important;min-height:35px!important;padding:5px 9px!important;font-size:11px!important;margin-top:3px!important}
.an-scholarship-head-inner .an-scholarship-total{flex:0 0 auto!important;white-space:nowrap!important;font-size:10px!important;padding:6px 10px!important;margin:0!important;color:#fff!important;background:linear-gradient(120deg,#f36a00,#a62d00)!important;border:1px solid #ffae40!important;border-radius:10px!important;display:flex!important;flex-direction:column!important;gap:3px!important;align-items:center!important}
.an-scholarship-directory{padding-top:0!important;margin-top:0!important}
.an-scholarship-content-scroll{margin-top:0!important}
.an-feature-grid{margin-top:0!important}
}
@media(min-width:1050px) and (max-width:1250px){
.an-scholarship-head-inner{gap:8px!important}
.an-scholarship-head-inner h1{font-size:22px!important}
.an-scholarship-head-inner .an-scholarship-filters{gap:5px!important;grid-template-columns:minmax(100px,1.1fr) minmax(85px,1fr) minmax(85px,1fr) minmax(100px,1fr)!important}
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
new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;arrange();addFourth();syncSticky()})}).observe(document.body,{childList:true,subtree:true});
arrange();
function addFourth(){
 const filters=document.querySelector('.an-scholarship-head-inner .an-scholarship-filters');if(!filters||filters.querySelector('.an-section-selector'))return;
 const label=document.createElement('label');label.className='an-section-selector';label.textContent='PAGE SECTIONS';
 const select=document.createElement('select');select.setAttribute('aria-label','Jump to scholarship section');
 [['','Choose section'],['.an-feature-grid','Featured awards'],['.an-scholarship-meta','All funding pathways'],['.an-scholarship-scroll-region','Funding categories']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;select.appendChild(o)});
 select.addEventListener('change',()=>{const target=document.querySelector(select.value);if(target)target.scrollIntoView({behavior:'smooth',block:'start'});select.value='';});label.appendChild(select);filters.appendChild(label);
}
function syncSticky(){const top=document.querySelector('.top'),ticker=document.querySelector('.ticker');document.documentElement.style.setProperty('--an-top-height',(top?.getBoundingClientRect().height||65)+'px');document.documentElement.style.setProperty('--an-ticker-height',(ticker?.getBoundingClientRect().height||32)+'px')}
window.addEventListener('resize',syncSticky);syncSticky();addFourth();
function countdown(){
 const host=document.querySelector('.an-scholarship-head-inner .an-scholarship-total');
 if(!host)return;
 let widget=host.querySelector('.an-next-scholarship-deadline');
 if(!widget){widget=document.createElement('a');widget.className='an-next-scholarship-deadline';widget.style.cssText='display:block;color:#fff;background:#1b100c;border:1px solid #ffcc65;border-radius:6px;padding:3px 7px;text-decoration:none;text-align:center;font-size:10px;max-width:210px;white-space:normal;line-height:1.25';host.appendChild(widget);}
 const entries=(window.ANScholarships?.items||[]).filter(p=>/^\\d{4}-\\d{2}-\\d{2}$/.test(p.deadlineISO||'')).map(p=>({p,day:new Date(p.deadlineISO+'T00:00:00')})).filter(x=>!Number.isNaN(x.day.getTime()));
 const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 const future=entries.filter(x=>x.day>=today).sort((a,b)=>a.day-b.day);
 if(!future.length){widget.textContent='Next verified deadline: awaiting official dates';widget.removeAttribute('href');widget.style.cursor='default';return;}
 const item=future[0],days=Math.round((item.day-today)/86400000);
 const name=item.p.short||item.p.abbr||item.p.name;
 widget.textContent='⏳ '+name+' · '+(days===0?'Deadline date TODAY':days+' calendar day'+(days===1?'':'s')+' left')+' · '+item.p.deadlineISO;
 widget.href='#/scholarship/'+encodeURIComponent(item.p.id);
 widget.title='Open scholarship details; exact closing time and timezone must be verified with the provider';
}
setInterval(countdown,60000);
new MutationObserver(()=>{if(document.querySelector('.an-scholarship-head-inner .an-scholarship-total:not(:has(.an-next-scholarship-deadline))'))countdown()}).observe(document.body,{childList:true,subtree:true});
countdown();
})();