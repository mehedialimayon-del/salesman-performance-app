/* About Details route recovery.
 * Repairs a blank #app without replacing the original full founder story.
 * This file runs after the existing SPA, not as a second router. */
(function(){
 'use strict';
 let busy=false,scheduled=false;
 function routeIsDetails(){return (location.hash||'').split('?')[0]==='#/aboutdetails';}
 function repair(){
  scheduled=false;
  if(!routeIsDetails()||busy)return;
  const app=document.getElementById('app');
  if(!app)return;
  document.body.classList.add('an-about-details-mode');
  document.body.classList.remove('an-about-locked','home-view','an-community-mode','an-services-mode');
  if(app.querySelector('#an2-story .an2-story-chapter'))return;
  const render=window.ANAboutFounderStory;
  if(typeof render!=='function'){
    if(!app.textContent.trim()) app.innerHTML='<section class="wrap content" role="status"><h1>Our Story</h1><p>The complete A&amp;N Overseas story is temporarily unavailable. Please refresh this page.</p><a class="btn outline" href="#/about">← About Us</a></section>';
    return;
  }
  busy=true;
  try{
    const html=render();
    if(typeof html==='string' && html.includes('id="an2-story"') && html.includes('id="an2-services"')){
      app.innerHTML=html;
    }else throw new Error('Incomplete founder story');
  }catch(err){
    console.error('Could not restore About Details',err);
    if(!app.textContent.trim())app.innerHTML='<section class="wrap content" role="alert"><h1>Our Story</h1><p>There was a problem opening the full article. Refresh to try again.</p><a class="btn outline" href="#/about">← About Us</a></section>';
  }finally{busy=false;}
 }
 function queue(){
  if(scheduled)return;scheduled=true;
  requestAnimationFrame(repair);
 }
 function init(){
  const app=document.getElementById('app');
  if(!app)return;
  const observer=new MutationObserver(queue);
  observer.observe(app,{childList:true});
  // The Read More click must draw the full article immediately.
  // Waiting for hashchange left an empty black shell for one frame or longer.
  document.addEventListener('click',event=>{
   const link=event.target.closest?.('#an-about-fixed .an-about-readmore[href="#/aboutdetails"]');
   if(!link)return;
   event.preventDefault();
   if(location.hash!=='#/aboutdetails')location.hash='#/aboutdetails';
   try{
    if(typeof window.render==='function')window.render();
   }catch(err){console.error('About Details navigation failed',err);}
   repair();
  },true);
  window.addEventListener('hashchange',queue);
  window.addEventListener('pageshow',queue);
  queue();
  setTimeout(queue,650);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();