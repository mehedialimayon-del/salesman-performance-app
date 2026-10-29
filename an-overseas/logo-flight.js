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
 .top .an-logo-flight .an-plane{filter:drop-shadow(0 0 2px white) drop-shadow(0 0 5px #ff9815)}
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
   <path d="M-34 0 L-6 0" fill="none" stroke="url(#an-trail)" stroke-width="2.8" stroke-linecap="round"/>
   <path d="M-14 0 L-5 0" fill="none" stroke="#fff1b2" stroke-width="1.1" stroke-linecap="round"/>
   <g transform="scale(.82)"><path d="M 13 0 L -5 -4 L -9 -16 L -13 -16 L -13 -5 L -20 -5 L -25 -10 L -29 -10 L -25 0 L -29 10 L -25 10 L -20 5 L -13 5 L -13 16 L -9 16 L -5 4 Z" fill="#ffffff" stroke="#6f3809" stroke-width="1.7" stroke-linejoin="round"/><circle cx="7" cy="0" r="1.8" fill="#ffc35c"/></g>
   <animateMotion dur="4.6s" repeatCount="indefinite" rotate="auto"><mpath href="#an-centre-orbit"/></animateMotion>
   <animate attributeName="opacity" values=".98;.30;.98" keyTimes="0;.5;1" dur="4.6s" repeatCount="indefinite"/>
  </g>
 </g>`;
 host.appendChild(svg);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installFlight,{once:true});
else installFlight();
})();