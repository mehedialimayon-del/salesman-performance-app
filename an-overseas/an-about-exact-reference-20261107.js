/* A&N Overseas — approved desktop visual: an actual interactive page, not a static poster.
   Only #/aboutdetails at min-width 801px. Original mobile/story DOM can be restored. */
(function(){
 'use strict';
 const desktop=window.matchMedia('(min-width:801px)');
 const quoteHtml='<span class="an2-exact-lead">International education should never be a privilege reserved for the few.</span> It should be a bridge between potential and possibility—where trustworthy guidance, the right opportunities and meaningful support turn uncertainty into confidence. At A&amp;N Overseas, we do more than help students cross borders; we stand beside them as they discover what they can become. From your first dream to your first confident step abroad, we are committed to walking this journey with you. <span class="an2-end-quote" aria-label="End of quote">”</span>';
 const cards=[
  ['🚀','OUR BEGINNING','The story of A&N Overseas'],
  ['◎','WHY WE BEGIN','Our purpose and inspiration'],
  ['▱','GLOBAL DIRECTORY','Explore universities'],
  ['▤','WHAT WE DO','Our services at a glance'],
  ['◉','OUR VISION','The future we are building']
 ];
 const desiredFlags=[
  'Bangladesh','Malaysia','China','Japan','South Korea','Singapore',
  'United Kingdom','United States','Canada','Australia',
  'Germany','France','Italy','Netherlands','Sweden','Finland',
  'Turkey','United Arab Emirates','Saudi Arabia','Qatar',
  'Thailand','Switzerland','Norway','Denmark','Spain','Portugal'
 ];
 const snapshots=new WeakMap();
 let scheduled=false;
 function element(tag,classname,markup){
  const el=document.createElement(tag);
  if(classname)el.className=classname;
  if(markup!==undefined)el.innerHTML=markup;
  return el;
 }
 function routeActive(){return (location.hash||'').split('?')[0]==='#/aboutdetails'}
 function resizeHeight(){
  if(!routeActive()||!desktop.matches)return;
  const root=document.documentElement;
  const header=document.querySelector('body > header.top');
  const ticker=document.getElementById('an-global-ticker');
  const topline=document.querySelector('#an2-story > .an2-topline');
  const headerH=Math.ceil(header?.getBoundingClientRect().height||88);
  const tickerH=Math.ceil(ticker?.getBoundingClientRect().height||28);
  const topH=Math.ceil(topline?.getBoundingClientRect().height||42);
  root.style.setProperty('--an-details-header-h',headerH+'px');
  root.style.setProperty('--an-details-ticker-h',tickerH+'px');
  root.style.setProperty('--an-exact-h',Math.max(480,Math.min(850,window.innerHeight-headerH-tickerH-topH-15))+'px');
 }
 function restore(hero){
  const old=snapshots.get(hero);if(!old)return;
  document.body.classList.remove('an-exact-desktop');
  const {brand,quote,footer,sign,nav,flags,portrait,slogan,flagNodes}=old;
  if(nav?.isConnected) {
   for(const a of nav.querySelectorAll('a[data-an-about-jump]')){
     if(a.dataset.anExactText!==undefined){
       a.textContent=a.dataset.anExactText;
       delete a.dataset.anExactText;
     }
   }
   hero.insertAdjacentElement('afterend',nav);
  }
  if(flags && sign){
   const list=flags.querySelector('.an2-floating-flags');
   if(list)for(const node of flagNodes)list.appendChild(node);
   sign.insertBefore(flags,sign.querySelector('.an2-founder-message-label'));
  }
  if(portrait&&footer)footer.appendChild(portrait);
  if(slogan&&brand){slogan.classList.remove('an2-exact-slogan');brand.appendChild(slogan)}
  quote.querySelector('blockquote').innerHTML=old.originalQuote;
  hero.querySelectorAll('.an2-exact-logo,.an2-exact-company,.an2-exact-sub,.an2-exact-est,.an2-exact-towers,.an2-exact-world-title,.an2-exact-plane,.an2-exact-globe,.an2-exact-name,.an2-exact-role,.an2-exact-flagband').forEach(n=>n.remove());
  hero.classList.remove('an2-exact-hero');
  snapshots.delete(hero);
 }
 function install(hero,story) {
  const brand=hero.querySelector('.an2-founder-brand');
  const quote=hero.querySelector('.an2-founder-quote');
  const nav=story.querySelector(':scope > .an2-nav');
  const footer=quote?.querySelector('.an2-quote-footer');
  const sign=quote?.querySelector('.an2-quote-sign');
  const flags=quote?.querySelector('.an2-flags-journey');
  const portrait=quote?.querySelector('.an2-founder-person');
  const slogan=brand?.querySelector(':scope > strong');
  const blockquote=quote?.querySelector('blockquote');
  const flagNodes=flags?.querySelector('.an2-floating-flags') ? Array.from(flags.querySelector('.an2-floating-flags').children):[];
  if(!brand||!quote||!nav||!footer||!sign||!flags||!portrait||!slogan||!blockquote)return;
  snapshots.set(hero,{brand,quote,nav,footer,sign,flags,portrait,slogan,flagNodes,originalQuote:blockquote.innerHTML});
  hero.classList.add('an2-exact-hero');
  blockquote.innerHTML=quoteHtml;
  brand.insertBefore(element('span','an2-exact-logo'),brand.firstChild);
  brand.insertBefore(element('span','an2-exact-company','A&amp;N OVERSEAS'),brand.querySelector('.an2-exact-logo')?.nextSibling);
  brand.insertBefore(element('span','an2-exact-sub','EDUCATION &amp; CONSULTANCY'),brand.querySelector('.an2-exact-company')?.nextSibling);
  brand.appendChild(element('div','an2-exact-est','<strong>ESTABLISHED 2024</strong><small>🇲🇾 MALAYSIA &amp; BANGLADESH 🇧🇩</small>'));
  hero.appendChild(element('div','an2-exact-towers'));
  hero.appendChild(element('div','an2-exact-globe'));
  hero.appendChild(element('div','an2-exact-world-title','FROM <span>HOME</span> TO THE <span>WORLD</span>'));
  hero.appendChild(element('span','an2-exact-plane','✈'));
  hero.appendChild(portrait);
  hero.appendChild(element('div','an2-exact-name','NUSRAT NASRIN'));
  hero.appendChild(element('div','an2-exact-role','Founder, A&amp;N Overseas'));
  hero.appendChild(nav);
  nav.querySelectorAll('a[data-an-about-jump]').forEach((a,i)=>{
    if(!cards[i])return;
    a.dataset.anExactText=a.textContent.trim();
    a.innerHTML='<span class="an2-exact-icon" aria-hidden="true">'+cards[i][0]+'</span><span class="an2-exact-cardcopy"><b>'+cards[i][1]+'</b><small>'+cards[i][2]+'</small></span>';
    a.setAttribute('aria-label',cards[i][1]+': '+cards[i][2]);
  });
  const band=element('div','an2-exact-flagband');hero.appendChild(band);band.appendChild(flags);
  const list=flags.querySelector('.an2-floating-flags');
  if(list){
    const nodes=Array.from(list.querySelectorAll('.an2-flag-unit'));
    const order=new Map(desiredFlags.map((x,i)=>[x.toLowerCase(),i]));
    nodes.sort((a,b)=>(order.get((a.getAttribute('title')||'').toLowerCase())??1000)-(order.get((b.getAttribute('title')||'').toLowerCase())??1000));
    for(const node of nodes)list.appendChild(node);
    list.scrollLeft=0;
  }
  slogan.innerHTML='ROOTED IN EXPERIENCE, <em>BUILT FOR YOUR FUTURE.</em>';
  slogan.classList.add('an2-exact-slogan');
  hero.appendChild(slogan);
  document.body.classList.add('an-exact-desktop');
  resizeHeight();
 }
 function update(){
  scheduled=false;
  const active=routeActive(),story=document.getElementById('an2-story');
  const hero=story?.querySelector('.an2-founder-hero');
  if(!desktop.matches||!active){
    document.body.classList.remove('an-exact-desktop');
    if(hero && snapshots.has(hero))restore(hero);
    document.documentElement.style.removeProperty('--an-exact-h');
    return;
  }
  if(hero && !snapshots.has(hero))install(hero,story);
  else if(hero)resizeHeight();
 }
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(update)}
 window.addEventListener('hashchange',()=>{schedule();setTimeout(schedule,120)});
 window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('pageshow',schedule);
 desktop.addEventListener('change',schedule);
 function init(){
   const app=document.getElementById('app');
   if(!app)return;
   new MutationObserver(schedule).observe(app,{childList:true});
   const header=document.querySelector('body > header.top');
   const ticker=document.getElementById('an-global-ticker');
   if(typeof ResizeObserver!=='undefined'){
     const ro=new ResizeObserver(()=>{if(routeActive()&&desktop.matches)resizeHeight()});
     if(header)ro.observe(header);
     if(ticker)ro.observe(ticker);
   }
   schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.addEventListener('load',schedule,{once:true});
})();