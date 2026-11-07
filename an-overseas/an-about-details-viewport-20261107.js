/* A&N Overseas: measure the actual desktop header and fit the About Details
   founder panel plus five chapter buttons into the opening laptop viewport.
   This does not modify the content or the mobile layout. */
(function(){
 'use strict';
 let frame=0;
 const desktop=window.matchMedia('(min-width:801px)');
 function sync(){
  frame=0;
  const active=(location.hash||'').split('?')[0]==='#/aboutdetails';
  const root=document.documentElement;
  if(!active||!desktop.matches){
    ['--an-details-header-h','--an-details-ticker-h','--an-details-hero-h'].forEach(k=>root.style.removeProperty(k));
    document.body.classList.remove('an-details-compact');
    return;
  }
  const header=document.querySelector('body > header.top');
  const ticker=document.getElementById('an-global-ticker');
  const story=document.getElementById('an2-story');
  const hh=Math.ceil(header?.getBoundingClientRect().height||108);
  const th=Math.ceil(ticker?.getBoundingClientRect().height||28);
  root.style.setProperty('--an-details-header-h',hh+'px');
  root.style.setProperty('--an-details-ticker-h',th+'px');
  if(!story)return;
  const topline=story.querySelector('.an2-topline');
  const nav=story.querySelector('.an2-nav');
  const topH=Math.ceil(topline?.getBoundingClientRect().height||35);
  const navH=Math.ceil(nav?.getBoundingClientRect().height||50);
  const available=Math.floor(window.innerHeight-hh-th-topH-navH-20);
  const height=Math.min(485,Math.max(295,available));
  root.style.setProperty('--an-details-hero-h',height+'px');
  document.body.classList.toggle('an-details-compact',height<410);
 }
 function queue(){if(frame)cancelAnimationFrame(frame);frame=requestAnimationFrame(sync)}
 window.addEventListener('hashchange',()=>{queue();setTimeout(queue,100)});
 window.addEventListener('resize',queue,{passive:true});
 window.addEventListener('pageshow',queue);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
 window.addEventListener('load',queue,{once:true});
 if(typeof ResizeObserver!=='undefined'){
  const ro=new ResizeObserver(queue);
  const watch=()=>{for(const node of [document.querySelector('body > header.top'),document.getElementById('an-global-ticker')])if(node)ro.observe(node)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
 }
})();
