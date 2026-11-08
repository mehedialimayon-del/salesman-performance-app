/* University directory: single scoped layout; replaces accumulated conflicting overrides. */
(()=>{'use strict';
const css=`
body:has(.university-catalogue) .page-head{position:relative!important;top:auto!important;z-index:120!important;margin:0!important;padding:5px 0!important;background:#0c0f16!important;overflow:visible!important}
body:has(.university-catalogue) .page-head>.wrap{max-width:100%!important;width:100%!important;box-sizing:border-box!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto minmax(0,236px)!important;align-items:center!important;gap:8px!important;padding:3px 12px!important;margin:0!important}
body:has(.university-catalogue) .an-directory-heading{min-width:0!important;display:flex!important;flex-direction:column!important;gap:2px!important}
body:has(.university-catalogue) .an-directory-heading h1{font-size:clamp(21px,2.5vw,30px)!important;line-height:1.1!important;margin:0!important;white-space:normal!important}
body:has(.university-catalogue) .an-directory-heading .bread{font-size:10px!important;margin:0!important}
body:has(.university-catalogue) .page-head p{display:none!important}
body:has(.university-catalogue) .page-head .catalogue-tools{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;align-items:center!important;gap:6px!important;width:100%!important;min-width:0!important;max-width:100%!important;margin:0!important;padding:0!important}
body:has(.university-catalogue) .page-head .catalogue-tools>*{box-sizing:border-box!important;grid-column:auto!important;grid-row:auto!important;width:100%!important;min-width:0!important;max-width:100%!important;height:36px!important;min-height:36px!important;margin:0!important;padding:0!important}
body:has(.university-catalogue) .page-head .catalogue-tools{position:relative!important}
body:has(.university-catalogue) .page-head .catalogue-tools :is(.an-directory-search-toggle,summary,#an-scholarship-category-toggle,.an-catalogue-favourites){
 box-sizing:border-box;display:flex!important;align-items:center;justify-content:center;gap:4px;
 width:100%!important;min-width:0!important;max-width:100%!important;height:100%!important;
 min-height:0!important;margin:0!important;padding:0!important;border:1px solid #f06800!important;
 border-radius:9px;background:#10141c!important;color:#ff7900!important;text-decoration:none;
}
body:has(.university-catalogue) .page-head .catalogue-tools :is(summary,#an-scholarship-category-toggle)::before{content:none!important}
body:has(.university-catalogue) .page-head .catalogue-filter summary::-webkit-details-marker{display:none}
.an-directory-icon{display:block;width:20px;height:20px;flex:none}
body:has(.university-catalogue) .page-head .catalogue-tools :is([aria-expanded="true"],.an-category-active,details[open]>summary){background:#382112!important}
body:has(.university-catalogue) .page-head .catalogue-search{position:static!important;border:0!important;background:none!important}
body:has(.university-catalogue) .page-head .catalogue-search input{
 display:none!important;position:absolute!important;left:0!important;top:calc(100% + 6px)!important;
 width:100%!important;max-width:none!important;min-height:42px!important;box-sizing:border-box;
 border:1px solid #f06800!important;border-radius:9px;background:#10141c!important;color:#fff!important;
 font-size:16px!important;padding:8px 10px!important;z-index:270!important;
}
body:has(.university-catalogue) .page-head .catalogue-search:has([aria-expanded="true"]) input{display:block!important}
body:has(.university-catalogue) .page-head .catalogue-filter{position:static!important;display:block!important;overflow:visible!important}
body:has(.university-catalogue) .page-head .an-catalogue-favourites [data-favorite-count]{font-size:11px;color:#fff}
body:has(.university-catalogue) .page-head :is(.catalogue-filter-panel,.an-scholarship-category-panel:not([hidden])){
 position:absolute!important;top:calc(100% + 6px)!important;right:0!important;left:auto!important;
 width:min(540px,calc(100vw - 24px))!important;box-sizing:border-box;max-height:60dvh!important;overflow:auto!important;
 padding:12px!important;background:#111720!important;border:1px solid #f06800!important;border-radius:12px;box-shadow:0 10px 35px #000b;
}
body:has(.university-catalogue) .page-head .an-scholarship-category-wrap{position:static!important}
body:has(.university-catalogue) .page-head .filter-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
body:has(.university-catalogue) .page-head .filter-fields label{display:grid;gap:4px;min-width:0;font-size:10px}
body:has(.university-catalogue) .page-head .filter-fields :is(select,input){min-width:0;width:100%;box-sizing:border-box}
body:has(.university-catalogue) .an-university-directory-bar{display:none!important}
body:has(.university-catalogue) .university-catalogue{margin-top:0!important;padding-top:0!important}
body:has(.university-catalogue) .catalogue-count{margin:0!important;padding:3px 0!important}
body:has(.university-catalogue) .catalogue-filter[open]{z-index:250!important}
body:has(.university-catalogue) .catalogue-filter-panel{z-index:260!important}
.an-favorite-heart,.an-favorite-heart.saved{background:#0b0e14!important;color:#ff690b!important;border-color:#ff690b!important}
 .an-directory-totals{display:flex;gap:5px;justify-content:flex-end}
 .an-directory-totals>span{display:grid;grid-template-columns:auto auto;align-items:center;justify-content:center;column-gap:4px;padding:4px 5px;border:1px solid #895020;border-radius:8px;background:#141922;color:#fff;white-space:nowrap}
 .an-directory-totals .an-directory-icon{width:12px;height:12px;color:#f06800}
 .an-directory-totals b{font-size:12px;line-height:1}
 .an-directory-totals small{grid-column:1/-1;text-align:center;font-size:8px;line-height:1.25}
@media(max-width:849px){
body:has(.university-catalogue) .page-head>.wrap{grid-template-columns:minmax(0,1fr) auto!important;gap:4px!important;padding:4px 10px!important}
body:has(.university-catalogue) .an-directory-heading h1{font-size:clamp(17px,5.25vw,24px)!important}
body:has(.university-catalogue) .page-head .catalogue-tools{grid-column:1/-1;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important}
body:has(.university-catalogue) .page-head .catalogue-tools>*{height:33px!important;min-height:33px!important}
body.an-universities-mode #app .university-catalogue #results{grid-template-columns:minmax(0,1fr)!important}

}

/* Correct the photo overlay at the actual last-loaded runtime style layer. */
body:has(.university-catalogue) #results .an-premium-uni-card .an-premium-hero-details{z-index:80!important;opacity:1!important;filter:none!important;visibility:visible!important}
body:has(.university-catalogue) #results .an-premium-uni-card .an-premium-hero-details :is(h3,h3 span,.an-premium-type,.an-premium-location){opacity:1!important;filter:none!important;visibility:visible!important;mix-blend-mode:normal!important}
body:has(.university-catalogue) #results .an-premium-uni-card .an-premium-name-orange,body:has(.university-catalogue) #results .an-premium-uni-card .an-premium-short{color:#ff7100!important;-webkit-text-fill-color:#ff7100!important}
body:has(.university-catalogue) #results .an-premium-uni-card .an-premium-name-white{color:#fff!important;-webkit-text-fill-color:#fff!important}
body:has(.university-catalogue) #results .an-premium-uni-card .an-premium-location{background:rgba(0,0,0,.93)!important;color:#fff!important;-webkit-text-fill-color:#fff!important;border:1px solid #ff7100!important}
body:has(.university-catalogue) #results .an-premium-uni-card .an-premium-type{background:#064536!important;color:#b8ffe2!important;-webkit-text-fill-color:#b8ffe2!important}
body:has(.university-catalogue) #results .an-premium-uni-card .an-premium-type.is-private{background:#42245d!important;color:#fff!important;-webkit-text-fill-color:#fff!important}
body:has(.university-catalogue) #results .an-premium-uni-card .uni-cover-wrap:after{background:linear-gradient(transparent 35%,rgba(0,0,0,.35) 58%,rgba(0,0,0,.96))!important;z-index:12!important}
body:has(.university-catalogue) #results .an-premium-uni-card .an-guide-links{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:5px!important}
body:has(.university-catalogue) #results .an-premium-uni-card .an-guide-links a{min-width:0!important;overflow-wrap:anywhere!important}

/* Final scoped layout: one university card per mobile viewport, four columns on desktop. */
body.an-universities-mode #results .an-premium-uni-card{height:auto!important;min-height:0!important;max-height:none!important;align-self:start!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}
body.an-universities-mode #results .an-premium-uni-card .uni-cover-wrap{height:clamp(205px,32vh,280px)!important;min-height:0!important;max-height:none!important;flex:0 0 auto!important;position:relative!important}
body.an-universities-mode #results .an-premium-uni-card .uni-cover-wrap .an-premium-hero-details{position:absolute!important;left:8px!important;right:8px!important;bottom:7px!important;top:auto!important;z-index:90!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:3px!important;opacity:1!important;filter:none!important}
body.an-universities-mode #results .an-premium-uni-card .an-premium-university-title{font-size:clamp(17px,2.8vh,23px)!important;line-height:1.1!important;color:#fff!important;opacity:1!important}
body.an-universities-mode #results .an-premium-uni-card .an-premium-type{font-size:9px!important;padding:3px 8px!important}
body.an-universities-mode #results .an-premium-uni-card .an-premium-location{box-sizing:border-box!important;width:100%!important;max-height:39px!important;min-height:25px!important;overflow-y:auto!important;font-size:9px!important;line-height:1.2!important;padding:4px 6px!important;color:#fff!important;background:rgba(0,0,0,.94)!important;border:1px solid #ff7900!important;opacity:1!important}
body.an-universities-mode #results .an-premium-uni-card .inside{height:auto!important;min-height:0!important;flex:0 0 auto!important;padding:6px!important;gap:4px!important}
body.an-universities-mode #results .an-premium-uni-card .an-premium-facts{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:4px!important}
body.an-universities-mode #results .an-premium-uni-card .an-premium-fact{height:clamp(62px,8vh,78px)!important;min-height:0!important;overflow:hidden!important;padding:3px!important;gap:1px!important}
body.an-universities-mode #results .an-premium-uni-card .an-premium-fact b{font-size:11px!important;max-height:2.4em!important;overflow-y:auto!important}
body.an-universities-mode #results .an-premium-uni-card .an-guide-links{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:4px!important;margin:3px 0 0!important}
body.an-universities-mode #results .an-premium-uni-card .an-guide-links a{min-height:38px!important;height:auto!important;padding:4px!important;font-size:10px!important}
@media(min-width:1000px){body.an-universities-mode #results .an-premium-uni-card .uni-cover-wrap{height:clamp(145px,24vh,210px)!important}body.an-universities-mode #results .an-premium-uni-card .an-premium-university-title{font-size:15px!important}body.an-universities-mode #results .an-premium-uni-card .an-premium-fact{height:62px!important}}
`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
const icons={
 globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
 university:'<path d="m3 9 9-5 9 5M4 10h16M6 11v7m6-7v7m6-7v7M3 20h18"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
 scholarship:'<path d="m2 9 10-5 10 5-10 5-10-5Zm4 2v5c3 3 9 3 12 0v-5m4-2v7"/>',
 favourites:'<path d="M12 20 4.5 12.5C0 8 6 2 10.5 6.5L12 8l1.5-1.5C18 2 24 8 19.5 12.5Z"/>',
 filter:'<path d="M3 5h18l-7 8v5l-4 2v-7Z"/>'
};
const icon=name=>'<svg class="an-directory-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">'+icons[name]+'</svg>';

function setupControls(tools,search,scholar,fav,filter){
 if(tools.classList.contains('an-directory-controls')||!search||!scholar||!fav||!filter)return;
 tools.classList.add('an-directory-controls');
 const input=search.querySelector('input');
 const wrapper=document.createElement('div');
 wrapper.className=search.className;
 search.replaceWith(wrapper);
 wrapper.append(input);
 const button=document.createElement('button');
 button.type='button';
 button.className='an-directory-search-toggle';
 button.setAttribute('aria-label','Open university search');
 button.setAttribute('aria-controls',input.id);
 button.innerHTML=icon('search');
 wrapper.prepend(button);
 button.setAttribute('aria-expanded','false');
 button.addEventListener('click',()=>{
  const open=button.getAttribute('aria-expanded')==='true';
  button.setAttribute('aria-expanded',String(!open));
  if(!open)input.focus();
 });
 wrapper.addEventListener('focusout',event=>{
  if(!wrapper.contains(event.relatedTarget))button.setAttribute('aria-expanded','false');
 });
 wrapper.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&event.target===input){
   event.preventDefault();
   button.setAttribute('aria-expanded','false');
   button.focus();
  }
 });
 scholar.querySelector('button').innerHTML=icon('scholarship');
 fav.firstChild.remove();
 fav.insertAdjacentHTML('afterbegin',icon('favourites'));
 filter.querySelector('summary').innerHTML=icon('filter');
}


/* Centre the university name and relocate the institution logo beside metadata. */
function alignUniversityCards(){
 document.querySelectorAll('.university-catalogue .uni-card').forEach(card=>{
  const inside=card.querySelector('.inside'),title=inside?.querySelector('.university-fullname'),cover=card.querySelector('.uni-cover-wrap');
  if(!inside||!title||!cover)return;
  card.classList.add('an-centred-university-card');
  let meta=inside.querySelector('.an-university-meta');
  if(!meta){meta=document.createElement('div');meta.className='an-university-meta';title.after(meta);}
  const badge=inside.querySelector('.badge'),location=inside.querySelector('.university-location');
  if(badge&&badge.parentElement!==meta)meta.appendChild(badge);
  if(location&&location.parentElement!==meta)meta.appendChild(location);
  const logo=cover.querySelector('.uni-card-logo');
  if(logo&&logo.parentElement!==meta)meta.insertBefore(logo,meta.firstChild);
  const short=inside.querySelector('h3');if(short)short.style.display='none';
 });
}
const alignStyle=document.createElement('style');alignStyle.textContent=`
.university-catalogue .an-centred-university-card .inside>.university-fullname{display:block!important;width:100%!important;text-align:center!important;font-weight:850!important;line-height:1.35!important;margin:6px 0 10px!important;color:#fff!important}
.university-catalogue .an-centred-university-card .an-university-meta{display:grid!important;grid-template-columns:58px minmax(0,1fr)!important;grid-template-rows:auto auto!important;column-gap:10px!important;row-gap:6px!important;align-items:center!important;margin:0 0 10px!important}
.university-catalogue .an-centred-university-card .an-university-meta .uni-card-logo{position:static!important;grid-column:1!important;grid-row:1/span 2!important;width:54px!important;height:54px!important;max-width:54px!important;object-fit:contain!important;border:1px solid #f07820!important;border-radius:9px!important;padding:5px!important;background:#10141a!important;box-shadow:none!important}
.university-catalogue .an-centred-university-card .an-university-meta .badge{grid-column:2!important;grid-row:1!important;justify-self:start!important;margin:0!important}
.university-catalogue .an-centred-university-card .an-university-meta .university-location{grid-column:2!important;grid-row:2!important;justify-self:start!important;margin:0!important;padding:5px 9px!important;border:1px solid #e96b1c!important;border-radius:8px!important;background:#151922!important;color:#fff!important;font-size:12px!important}
`;document.head.appendChild(alignStyle);
\nfunction mount(){
 const dir=document.querySelector('.university-catalogue'),head=document.querySelector('.page-head');if(!dir||!head)return;
 const wrap=head.querySelector('.wrap'),tools=dir.querySelector('.catalogue-tools')||head.querySelector('.catalogue-tools');if(!wrap||!tools)return;
 let heading=wrap.querySelector('.an-directory-heading');
 if(!heading){const h=wrap.querySelector('h1');if(!h)return;heading=document.createElement('div');heading.className='an-directory-heading';h.parentNode.insertBefore(heading,h);heading.appendChild(h);}
 const bread=wrap.querySelector('.bread');if(bread&&bread.parentNode!==heading)heading.insertBefore(bread,heading.firstChild);
 let totals=wrap.querySelector('.an-directory-totals');
 if(!totals){
  totals=document.createElement('div');
  totals.className='an-directory-totals';
  heading.after(totals);
 }
 const universities=U.length.toLocaleString('en-US');
 const destinations=new Set(U.map(university=>university.country==='Türkiye'?'Turkey':university.country).filter(Boolean)).size;
 const signature=universities+'/'+destinations;
 if(totals.dataset.count!==signature){
  totals.dataset.count=signature;
  totals.innerHTML='<span>'+icon('globe')+'<b>'+destinations+'</b><small>Countries</small></span>'
   +'<span>'+icon('university')+'<b>'+universities+'</b><small>Universities</small></span>';
 }
 if(tools.parentNode!==wrap)wrap.appendChild(tools);
 const search=tools.querySelector('.catalogue-search'),scholar=tools.querySelector('.an-scholarship-category-wrap'),fav=tools.querySelector('.an-catalogue-favourites'),filter=tools.querySelector('.catalogue-filter');
 [search,scholar,fav,filter].forEach((el,i)=>{if(el&&tools.children[i]!==el)tools.insertBefore(el,tools.children[i]||null)});
 setupControls(tools,search,scholar,fav,filter);alignUniversityCards();
}
let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;mount()})}).observe(document.body,{childList:true,subtree:true});mount();
})();