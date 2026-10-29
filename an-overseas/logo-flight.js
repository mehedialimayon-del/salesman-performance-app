/* A&N Overseas: stationary emblem, luminous orbit and airplane. */
(function(){
'use strict';
function installFlight(){
 const host=document.querySelector('.top .logo-motion');
 if(!host || host.querySelector('.an-logo-flight'))return;
 host.classList.add('an-logo-fixed');
 const style=document.createElement('style');style.id='an-logo-flight-style';
 style.textContent=`
 .top{height:62px!important;min-height:62px!important;box-sizing:border-box!important;overflow:visible!important}
 .top>.wrap{height:62px!important;min-height:62px!important;box-sizing:border-box!important;padding-top:0!important;padding-bottom:0!important;display:flex!important;align-items:center!important}
 .top a.brand{height:58px!important;min-height:0!important;align-items:center!important;gap:7px!important;overflow:visible!important}
 .top .logo-motion.an-logo-fixed{position:relative!important;display:block!important;flex:none!important;width:58px!important;height:50px!important;min-width:58px!important;min-height:50px!important;mix-blend-mode:normal!important;transform:none!important;animation:none!important;overflow:visible!important;isolation:isolate}
 .top .logo-motion.an-logo-fixed::before,.top .logo-motion.an-logo-fixed::after{display:none!important;content:none!important;animation:none!important}
 .top .logo-motion.an-logo-fixed .logo-crop{display:block!important;position:relative!important;width:58px!important;height:50px!important;min-width:58px!important;min-height:50px!important;max-height:50px!important;overflow:hidden!important;clip-path:none!important;transform:none!important;animation:none!important;border:0!important;z-index:1}
 .top .logo-motion.an-logo-fixed .logo-crop img{position:absolute!important;top:5px!important;left:0!important;width:165px!important;height:40px!important;max-width:none!important;min-width:0!important;max-height:40px!important;object-fit:fill!important;object-position:left center!important;display:block!important;margin:0!important;padding:0!important;transform:none!important;animation:none!important;mix-blend-mode:screen!important;filter:brightness(1.18) contrast(1.08)!important}
 .top .logo-motion.an-logo-fixed .an-logo-flight{position:absolute!important;display:block!important;width:80px!important;height:64px!important;top:-7px!important;left:-9px!important;z-index:5!important;overflow:visible!important;pointer-events:none!important}
 .top .an-logo-flight .an-orbit-soft{filter:drop-shadow(0 0 3px #ffb13e)}
 .top .an-logo-flight .an-plane{filter:drop-shadow(0 0 1.5px #ffbf5a) drop-shadow(0 0 3px #b86d12)}
 .top .brand-copy{min-width:0!important}
 @media(max-width:800px){.top>.wrap{height:62px!important;min-height:62px!important}.top a.brand{height:56px!important}}
 @media(prefers-reduced-motion:reduce){.top .an-logo-flight .an-animated-flight{display:none!important}}
 `;
 document.head.appendChild(style);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.classList.add('an-logo-flight');
 svg.setAttribute('viewBox','0 0 84 60');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 svg.innerHTML=`
 <defs>
   <path id="an-centre-orbit" d="M 15,29 C 23,15 66,15 72,29 C 66,43 23,43 15,29 Z"/>
   <linearGradient id="an-trail" x1="0%" y1="0%" x2="100%" y2="0%">
     <stop offset="0%" stop-color="#ff7c00" stop-opacity="0"/>
     <stop offset="48%" stop-color="#ff9d29" stop-opacity=".45"/>
     <stop offset="100%" stop-color="#fff3bc" stop-opacity="1"/>
   </linearGradient>
 </defs>
 <g class="an-animated-flight">
  <use href="#an-centre-orbit" fill="none" stroke="#ffc26f" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="40 118" class="an-orbit-soft">
   <animate attributeName="stroke-dashoffset" from="0" to="-151" dur="4.6s" repeatCount="indefinite"/>
   <animate attributeName="opacity" values=".45;.95;.5" keyTimes="0;.5;1" dur="4.6s" repeatCount="indefinite"/>
  </use>
  <use href="#an-centre-orbit" fill="none" stroke="#fff7cb" stroke-width="1.7" stroke-linecap="round" stroke-dasharray="23 135">
   <animate attributeName="stroke-dashoffset" from="0" to="-151" dur="4.6s" repeatCount="indefinite"/>
  </use>
  <g class="an-plane">
   <path d="M-34 0 L-6 0" fill="none" stroke="url(#an-trail)" stroke-width="1.8" stroke-linecap="round"/>
   <path d="M-14 0 L-5 0" fill="none" stroke="#fff1b2" stroke-width=".85" stroke-linecap="round"/>
   <g transform="rotate(0) scale(.53)"><path d="M 21 -1 C 24 -1 27 -.5 28 0 C 27 .5 24 1 21 1 L -3 2.4 L -10 16.5 Q -11 18.5 -13 17 L -14.5 3.6 L -25 4.2 L -29 9.2 L -32 9.2 L -30 1.9 L -34 1.4 L -34 -1.4 L -30 -1.9 L -32 -9.2 L -29 -9.2 L -25 -4.2 L -14.5 -3.6 L -13 -17 Q -11 -18.5 -10 -16.5 L -3 -2.4 Z" fill="#f5b63a" stroke="#f6d37c" stroke-width="0.65" stroke-linejoin="round"/><path d="M 20 0 L -23 0" fill="none" stroke="#8d4c12" stroke-width=".9"/><circle cx="7" cy="0" r=".8" fill="#fff2b7"/></g>
   <animateMotion dur="4.6s" repeatCount="indefinite" rotate="auto"><mpath href="#an-centre-orbit"/></animateMotion>
   <animate attributeName="opacity" values=".98;.30;.98" keyTimes="0;.5;1" dur="4.6s" repeatCount="indefinite"/>
  </g>
 </g>`;
 host.appendChild(svg);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installFlight,{once:true});
else installFlight();
})();