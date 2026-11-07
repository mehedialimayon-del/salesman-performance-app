/* University directory: single scoped layout; replaces accumulated conflicting overrides. */
(()=>{'use strict';
const css=`
body:has(.university-catalogue) .page-head{position:relative!important;top:auto!important;z-index:120!important;margin:0!important;padding:5px 0!important;background:#0c0f16!important;overflow:visible!important}
body:has(.university-catalogue) .page-head>.wrap{max-width:100%!important;width:100%!important;box-sizing:border-box!important;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,236px)!important;align-items:center!important;gap:8px!important;padding:3px 12px!important;margin:0!important}
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
@media(max-width:849px){
body:has(.university-catalogue) .page-head>.wrap{grid-template-columns:minmax(0,1fr)!important;gap:4px!important;padding:4px 10px!important}
body:has(.university-catalogue) .an-directory-heading h1{font-size:24px!important}
body:has(.university-catalogue) .page-head .catalogue-tools{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important}
body:has(.university-catalogue) .page-head .catalogue-tools>*{height:33px!important;min-height:33px!important}
body.an-universities-mode #app .university-catalogue #results{grid-template-columns:minmax(0,1fr)!important}

}
`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
const icons={
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

function mount(){
 const dir=document.querySelector('.university-catalogue'),head=document.querySelector('.page-head');if(!dir||!head)return;
 const wrap=head.querySelector('.wrap'),tools=dir.querySelector('.catalogue-tools')||head.querySelector('.catalogue-tools');if(!wrap||!tools)return;
 let heading=wrap.querySelector('.an-directory-heading');
 if(!heading){const h=wrap.querySelector('h1');if(!h)return;heading=document.createElement('div');heading.className='an-directory-heading';h.parentNode.insertBefore(heading,h);heading.appendChild(h);}
 const bread=wrap.querySelector('.bread');if(bread&&bread.parentNode!==heading)heading.insertBefore(bread,heading.firstChild);
 if(tools.parentNode!==wrap)wrap.appendChild(tools);
 const search=tools.querySelector('.catalogue-search'),scholar=tools.querySelector('.an-scholarship-category-wrap'),fav=tools.querySelector('.an-catalogue-favourites'),filter=tools.querySelector('.catalogue-filter');
 [search,scholar,fav,filter].forEach((el,i)=>{if(el&&tools.children[i]!==el)tools.insertBefore(el,tools.children[i]||null)});
 setupControls(tools,search,scholar,fav,filter);
}
let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;mount()})}).observe(document.body,{childList:true,subtree:true});mount();
})();