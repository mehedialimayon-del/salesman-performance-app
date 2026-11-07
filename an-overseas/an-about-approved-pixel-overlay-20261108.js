/* A&N Overseas — approved reference artwork on desktop, with real navigation,
   real founder portrait, and every country flag shown on the mobile artwork.
   No new rendering of the brand/quote; the reference's original pixels are used. */
(function(){
 'use strict';
 const breakpoint=window.matchMedia('(min-width:801px)');
 const flags=[
  ['bd','Bangladesh','🇧🇩'], ['my','Malaysia','🇲🇾'],
  ['cn','China','🇨🇳'], ['jp','Japan','🇯🇵'],
  ['kr','South Korea','🇰🇷'], ['sg','Singapore','🇸🇬'],
  ['th','Thailand','🇹🇭'], ['ae','United Arab Emirates','🇦🇪'],
  ['tr','Turkey','🇹🇷'], ['gb','United Kingdom','🇬🇧'],
  ['de','Germany','🇩🇪'], ['fr','France','🇫🇷'],
  ['it','Italy','🇮🇹'], ['ie','Ireland','🇮🇪'],
  ['nl','Netherlands','🇳🇱'], ['se','Sweden','🇸🇪'],
  ['fi','Finland','🇫🇮'], ['at','Austria','🇦🇹'],
  ['be','Belgium','🇧🇪'], ['ch','Switzerland','🇨🇭'],
  ['no','Norway','🇳🇴'], ['dk','Denmark','🇩🇰'],
  ['es','Spain','🇪🇸'], ['pt','Portugal','🇵🇹'],
  ['pl','Poland','🇵🇱'], ['cz','Czech Republic','🇨🇿'],
  ['hu','Hungary','🇭🇺'], ['gr','Greece','🇬🇷'],
  ['lu','Luxembourg','🇱🇺'], ['az','Azerbaijan','🇦🇿'],
  ['bn','Brunei','🇧🇳'], ['hk','Hong Kong','🇭🇰'],
  ['qa','Qatar','🇶🇦'], ['ro','Romania','🇷🇴'],
  ['sa','Saudi Arabia','🇸🇦'], ['tw','Taiwan','🇹🇼'],
  ['ca','Canada','🇨🇦'], ['us','United States','🇺🇸'],
  ['au','Australia','🇦🇺'], ['nz','New Zealand','🇳🇿']
 ];
 let queued=false;
 const active=()=>breakpoint.matches && (location.hash||'').split('?')[0]==='#/aboutdetails';
 function generateFlags(){
  const band=document.createElement('div');
  band.className='an-reference-flags';
  band.setAttribute('aria-label','International destinations — forty national flags waving on fixed flagpoles');
  flags.forEach(([iso,name,emoji],i)=>{
   const unit=document.createElement('span');
   unit.className='an-reference-flag';
   unit.setAttribute('role','img');
   unit.setAttribute('aria-label',name+' flag');
   unit.setAttribute('title',name);
   unit.style.setProperty('--an-flag-order',String(i));
   const cloth=document.createElement('span');cloth.className='an-reference-flag-cloth';
   const img=document.createElement('img');
   img.src='https://flagcdn.com/w80/'+iso+'.png';
   img.alt='';img.decoding='async';img.loading='eager';
   img.addEventListener('error',()=>unit.classList.add('is-fallback'),{once:true});
   const fallback=document.createElement('span');fallback.className='an-reference-flag-fallback';fallback.textContent=emoji;
   cloth.append(img,fallback);unit.appendChild(cloth);band.appendChild(unit);
  });
  return band;
 }
 function apply(){
  queued=false;
  const hero=document.querySelector('#an2-story .an2-exact-hero');
  const activated=active() && !!hero;
  if(!activated){
   document.body.classList.remove('an-reference-pixel-view');
   document.querySelectorAll('.an-reference-flags').forEach(node=>node.remove());
   return;
  }
  if(!hero.querySelector(':scope > .an-reference-flags'))hero.appendChild(generateFlags());
  document.body.classList.add('an-reference-pixel-view');
 }
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(apply)}
 window.addEventListener('hashchange',()=>{schedule();setTimeout(schedule,100)});
 window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('pageshow',schedule);
 breakpoint.addEventListener('change',schedule);
 function init(){
  const root=document.getElementById('app');
  if(root)new MutationObserver(schedule).observe(root,{childList:true});
  schedule();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 window.addEventListener('load',schedule,{once:true});
})();