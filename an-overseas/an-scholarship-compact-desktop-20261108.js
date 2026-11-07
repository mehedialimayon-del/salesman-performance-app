/* Compact desktop scholarship heading; retains original filter elements and event handlers. */
(function(){
'use strict';
const css=`
@media(min-width:1050px){body:has(.an-scholarship-detail) .top,body:has(.an-scholarship-head) .top{position:sticky!important;top:0!important;z-index:200!important}
body:has(.an-scholarship-detail) .ticker,body:has(.an-scholarship-head) .ticker{position:sticky!important;top:var(--an-top-height,65px)!important;z-index:190!important}
body:has(.an-scholarship-head) .an-scholarship-head{position:sticky!important;top:calc(var(--an-top-height,65px) + var(--an-ticker-height,32px))!important;z-index:180!important;background:#101319!important;border-bottom:1px solid #ff8a08!important}
}
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
const desktopGapFix="\n/* an-scholarship-desktop-gap-fix-v2: keep heading directly under ticker,\n   compact controls without clipping option labels, preserve mobile layout. */\n@media(min-width:1050px){\n body:has(.an-scholarship-head) .an-scholarship-head{margin-block:0!important;transform:none!important}\n body:has(.an-scholarship-head) .an-scholarship-head-inner{min-height:46px!important;gap:8px!important}\n body:has(.an-scholarship-head) .an-scholarship-directory.content{padding-top:2px!important}\n body:has(.an-scholarship-head) .an-scholarship-filters{margin-block:0!important}\n body:has(.an-scholarship-head) .an-scholarship-filters select,\n body:has(.an-scholarship-head) .an-scholarship-filters input{box-sizing:border-box!important;text-overflow:ellipsis!important;min-width:0!important}\n body:has(.an-scholarship-head) .an-scholarship-meta{margin:5px 0 7px!important}\n body:has(.an-scholarship-head) .an-scholarship-about{margin-top:5px!important}\n body:has(.an-scholarship-head) .an-scholarship-scroll-region{scroll-margin-top:125px}\n}\n";
const style=document.createElement('style');style.id='an-scholarship-compact-desktop-style';style.textContent=css+desktopGapFix+"\n@media(min-width:1050px){\nbody:has(.an-scholarship-head) main,body:has(.an-scholarship-head) #app{min-height:0!important}\nbody:has(.an-scholarship-head) .an-scholarship-head{position:relative!important;top:auto!important;z-index:5!important;padding:3px 0!important}\nbody:has(.an-scholarship-head) .an-scholarship-head-inner{min-height:48px!important;align-items:center!important}\nbody:has(.an-scholarship-head) .an-scholarship-directory{padding-top:2px!important}\nbody:has(.an-scholarship-head) .an-feature-grid{margin-top:0!important}\nbody:has(.an-scholarship-head) .an-scholarship-filters input,\nbody:has(.an-scholarship-head) .an-scholarship-filters select{min-height:32px!important;height:32px!important}\n}\n";document.head.appendChild(style);
function arrange(){
 if(window.innerWidth<1050)return;
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
 if(window.innerWidth<1050)return;
 const filters=document.querySelector('.an-scholarship-head-inner .an-scholarship-filters');if(!filters||filters.querySelector('.an-section-selector'))return;
 const label=document.createElement('label');label.className='an-section-selector';label.textContent='PAGE SECTIONS';
 const select=document.createElement('select');select.setAttribute('aria-label','Jump to scholarship section');
 [['','Choose section'],['.an-feature-grid','Featured awards'],['.an-scholarship-meta','All funding pathways'],['.an-scholarship-scroll-region','Funding categories']].forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;select.appendChild(o)});
 select.addEventListener('change',()=>{const target=document.querySelector(select.value);if(target)target.scrollIntoView({behavior:'smooth',block:'start'});select.value='';});label.appendChild(select);filters.appendChild(label);
}
function syncSticky(){const top=document.querySelector('.top'),ticker=document.querySelector('.ticker');document.documentElement.style.setProperty('--an-top-height',(top?.getBoundingClientRect().height||65)+'px');document.documentElement.style.setProperty('--an-ticker-height',(ticker?.getBoundingClientRect().height||32)+'px')}
window.addEventListener('resize',()=>{syncSticky();arrange();addFourth()});syncSticky();addFourth();
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

/* Mobile-only scholarship compact layout; desktop styles untouched. */
const mobileCSS=`
@media(max-width:800px){
body:has(.an-scholarship-head) .an-scholarship-head{padding:5px 0!important}
body:has(.an-scholarship-head) .an-scholarship-head-inner{gap:8px!important;align-items:center!important}
body:has(.an-scholarship-head) .an-scholarship-head h1{font-size:clamp(18px,4.5vw,25px)!important;line-height:1.08!important;margin:2px 0!important}
body:has(.an-scholarship-head) .an-scholarship-head .an-eyebrow{font-size:8px!important}
body:has(.an-scholarship-head) .an-scholarship-total{flex:0 0 45%!important;max-width:45%!important;min-width:0!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;padding:6px 7px!important;border-radius:12px!important;font-size:10px!important;line-height:1.2!important;background:linear-gradient(120deg,#25160e,#10151b)!important;border:1px solid #ff7100!important;color:#fff!important}
body:has(.an-scholarship-head) .an-scholarship-total .an-next-scholarship-deadline{max-width:100%!important;box-sizing:border-box!important;font-size:9px!important;line-height:1.2!important;padding:4px!important;border-color:#ff8b24!important}
body:has(.an-scholarship-head) .an-scholarship-directory.content{padding-top:3px!important}
body:has(.an-scholarship-head) .an-scholarship-filters{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:5px!important;margin:5px 0!important;align-items:stretch!important}
body:has(.an-scholarship-head) .an-scholarship-filters label{grid-column:auto!important;min-width:0!important;gap:0!important;font-size:0!important;letter-spacing:0!important}
body:has(.an-scholarship-head) .an-scholarship-filters input,
body:has(.an-scholarship-head) .an-scholarship-filters select{height:34px!important;min-height:34px!important;padding:5px 7px!important;font-size:11px!important;border-radius:8px!important;min-width:0!important;text-overflow:ellipsis!important}
body:has(.an-scholarship-head) .an-scholarship-meta{margin:3px 0 5px!important}
body:has(.an-scholarship-head) .an-scholarship-about{margin:3px 0!important}
body:has(.an-scholarship-head) .an-scholarship-scroll-region{margin-top:0!important}
body:has(.an-scholarship-head) .an-scholarship-scroll-region h2{margin-top:3px!important;margin-bottom:3px!important}
body:has(.an-scholarship-head) .an-scholarship-grid{gap:8px!important}
}
@media(max-width:430px){
body:has(.an-scholarship-head) .an-scholarship-filters input,
body:has(.an-scholarship-head) .an-scholarship-filters select{font-size:10px!important;padding:4px!important}
}
`;
const mobileStyle=document.createElement('style');mobileStyle.id='an-mobile-scholarship-compact-20261108';mobileStyle.textContent=mobileCSS;document.head.appendChild(mobileStyle);
function compactMobileFilters(){
 if(window.innerWidth>800)return;
 const head=document.querySelector('.an-scholarship-head');
 const filters=document.querySelector('.an-scholarship-directory > .an-scholarship-filters');
 if(!head||!filters)return;
 const fields=filters.querySelectorAll('input,select');
 fields.forEach((field,i)=>{
  if(field.dataset.anMobileCompact==='yes')return;
  field.dataset.anMobileCompact='yes';
  const label=field.closest('label');
  const caption=label?.textContent.trim()||'';
  field.setAttribute('aria-label',field.getAttribute('aria-label')||caption||'Scholarship filter');
  if(field.tagName==='INPUT')field.placeholder='Search funding / country';
  else if(i===1){const o=field.options[0];if(o&&/all destinations/i.test(o.textContent))o.textContent='Destination';}
  else if(i===2){const o=field.options[0];if(o&&/all degrees/i.test(o.textContent))o.textContent='Degree level';}
 });
}
let mobilePending=false;
new MutationObserver(()=>{if(mobilePending)return;mobilePending=true;requestAnimationFrame(()=>{mobilePending=false;compactMobileFilters()})}).observe(document.body,{childList:true,subtree:true});
window.addEventListener('resize',compactMobileFilters);
compactMobileFilters();


/* Mobile first-screen funding directory: prioritize full award cards. */
const mobileFirstScreenCSS=`
@media(max-width:800px){
body:has(.an-scholarship-head) .an-scholarship-head{padding:2px 0!important}
body:has(.an-scholarship-head) .an-scholarship-head h1{font-size:clamp(17px,4.2vw,22px)!important;line-height:1.04!important}
body:has(.an-scholarship-head) .an-scholarship-head-inner{gap:5px!important}
body:has(.an-scholarship-head) .an-scholarship-total{padding:3px 5px!important;font-size:9px!important}
body:has(.an-scholarship-head) .an-scholarship-total .an-next-scholarship-deadline{padding:3px!important;font-size:8px!important}
body:has(.an-scholarship-head) .an-scholarship-filters{margin:3px 0!important}
body:has(.an-scholarship-head) .an-scholarship-filters input,
body:has(.an-scholarship-head) .an-scholarship-filters select{height:31px!important;min-height:31px!important}
body:has(.an-scholarship-head) .an-feature-grid{display:none!important}
body:has(.an-scholarship-head) .an-scholarship-about{display:none!important}
body:has(.an-scholarship-head) .an-scholarship-meta{display:none!important}
body:has(.an-scholarship-head) .an-scholarship-directory.content{padding-top:0!important}
body:has(.an-scholarship-head) .an-scholarship-scroll-region{margin-top:0!important;padding-top:0!important}
body:has(.an-scholarship-head) .an-scholarship-scroll-region h2{color:#fff!important;line-height:1.15!important}
body:has(.an-scholarship-head) .an-scholarship-scroll-region h2::first-letter{color:#ff7100!important}
body:has(.an-scholarship-head) .an-scholarship-card h3{color:#fff!important}
body:has(.an-scholarship-head) .an-scholarship-country{color:#fff!important}
body:has(.an-scholarship-head) .an-scholarship-number{color:#fff!important}
body:has(.an-scholarship-head) .an-scholarship-level{color:#ff7100!important}
body:has(.an-scholarship-head) .an-scholarship-cover{min-height:76px!important;padding:7px!important}
body:has(.an-scholarship-head) .an-scholarship-glyph{font-size:17px!important;padding:4px 7px!important}
body:has(.an-scholarship-head) .an-scholarship-body{padding:8px!important}
body:has(.an-scholarship-head) .an-scholarship-card h3{font-size:12px!important;min-height:0!important;margin:4px 0 6px!important}
body:has(.an-scholarship-head) .an-scholarship-money{padding:6px 8px!important;margin-bottom:6px!important}
body:has(.an-scholarship-head) .an-scholarship-desc{font-size:10px!important;line-height:1.35!important;margin-bottom:7px!important}
body:has(.an-scholarship-head) .an-scholarship-actions{gap:5px!important}
body:has(.an-scholarship-head) .an-scholarship-actions a{min-height:31px!important;padding:6px!important;font-size:10px!important}
}
`;
const firstScreenStyle=document.createElement('style');firstScreenStyle.id='an-scholarship-mobile-firstscreen-v2';firstScreenStyle.textContent=mobileFirstScreenCSS;document.head.appendChild(firstScreenStyle);

})();