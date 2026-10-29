/* A&N Overseas: stationary emblem, luminous orbit and airplane. */
(function(){
'use strict';
function installFlight(){
 const host=document.querySelector('.top .logo-motion');
 if(!host || host.querySelector('.an-logo-flight'))return;
 host.classList.add('an-logo-fixed');
 const style=document.createElement('style');style.id='an-logo-flight-style';
 style.textContent=`
 .top .logo-motion.an-logo-fixed{position:relative!important;display:block!important;flex-shrink:0;isolation:isolate;transform:none!important;animation:none!important;overflow:visible!important;width:66px!important;height:60px!important;mix-blend-mode:normal!important}
 .top .logo-motion.an-logo-fixed::before,.top .logo-motion.an-logo-fixed::after{content:none!important;animation:none!important}
 .top .logo-motion.an-logo-fixed .logo-crop{position:relative!important;z-index:1;transform:none!important;animation:none!important;width:64px!important;height:60px!important;clip-path:none!important;overflow:hidden!important;border-radius:0!important}
 .top .logo-motion.an-logo-fixed .logo-crop img{animation:none!important;transform:none!important;display:block!important;width:245px!important;height:60px!important;max-width:none!important;object-fit:fill!important;object-position:left center!important;margin:0!important;filter:brightness(1.16) contrast(1.06)!important}
 .top .logo-motion .an-logo-flight{position:absolute;width:100px!important;height:80px!important;left:-18px!important;top:-10px!important;display:block;z-index:6!important;overflow:visible!important;pointer-events:none;animation:none!important}
 .top .an-logo-flight .an-orbit-soft{filter:drop-shadow(0 0 3px #ffc169)}
 .top .an-logo-flight .an-plane{filter:drop-shadow(0 0 2px #fff1a1) drop-shadow(0 0 4px #ffa035)}
 @media(prefers-reduced-motion:reduce){.top .an-logo-flight .an-animated-flight{display:none}}
 `;
 document.head.appendChild(style);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.classList.add('an-logo-flight');
 svg.setAttribute('viewBox','0 0 84 60');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 svg.innerHTML=`
 <defs>
   <path id="an-centre-orbit" d="M 9,29 C 15,15 68,15 76,29 C 68,43 15,43 9,29 Z"/>
   <linearGradient id="an-trail" x1="0%" y1="0%" x2="100%" y2="0%">
     <stop offset="0%" stop-color="#ff7c00" stop-opacity="0"/>
     <stop offset="48%" stop-color="#ff9d29" stop-opacity=".45"/>
     <stop offset="100%" stop-color="#fff3bc" stop-opacity="1"/>
   </linearGradient>
 </defs>
 <g class="an-animated-flight">
  <use href="#an-centre-orbit" fill="none" stroke="#ffc26f" stroke-width="3.8" stroke-linecap="round" stroke-dasharray="40 118" class="an-orbit-soft">
   <animate attributeName="stroke-dashoffset" from="0" to="-151" dur="4.6s" repeatCount="indefinite"/>
   <animate attributeName="opacity" values=".45;.95;.5" keyTimes="0;.5;1" dur="4.6s" repeatCount="indefinite"/>
  </use>
  <use href="#an-centre-orbit" fill="none" stroke="#fff7cb" stroke-width="1.7" stroke-linecap="round" stroke-dasharray="23 135">
   <animate attributeName="stroke-dashoffset" from="0" to="-151" dur="4.6s" repeatCount="indefinite"/>
  </use>
  <g class="an-plane">
   <path d="M-34 0 L-6 0" fill="none" stroke="url(#an-trail)" stroke-width="2.8" stroke-linecap="round"/>
   <path d="M-14 0 L-5 0" fill="none" stroke="#fff1b2" stroke-width="1.1" stroke-linecap="round"/>
   <text x="-12" y="7" font-size="23" font-family="Segoe UI Symbol,Arial,sans-serif" fill="#ffffff" stroke="#ff9a1b" stroke-width=".65" paint-order="stroke" font-weight="bold">✈</text>
   <animateMotion dur="4.6s" repeatCount="indefinite" rotate="auto"><mpath href="#an-centre-orbit"/></animateMotion>
   <animate attributeName="opacity" values=".98;.30;.98" keyTimes="0;.5;1" dur="4.6s" repeatCount="indefinite"/>
  </g>
 </g>`;
 host.appendChild(svg);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installFlight,{once:true});
else installFlight();
})();