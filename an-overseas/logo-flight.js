/* A&N Overseas: stationary emblem, luminous orbit and airplane. */
(function(){
'use strict';
function installFlight(){
 const host=document.querySelector('.top .logo-motion');
 if(!host || host.querySelector('.an-logo-flight'))return;
 host.classList.add('an-logo-fixed');
 const style=document.createElement('style');style.id='an-logo-flight-style';
 style.textContent=`
 .top .logo-motion.an-logo-fixed{position:relative!important;display:block!important;flex-shrink:0;isolation:isolate;transform:none!important;animation:none!important;overflow:visible!important}
 .top .logo-motion.an-logo-fixed::before,.top .logo-motion.an-logo-fixed::after{content:none!important;animation:none!important}
 .top .logo-motion.an-logo-fixed .logo-crop{position:relative!important;z-index:1;transform:none!important;animation:none!important}
 .top .logo-motion.an-logo-fixed .logo-crop img{animation:none!important;transform:none!important}
 .top .logo-motion .an-logo-flight{position:absolute;width:112%;height:112%;left:-6%;top:-6%;display:block;z-index:3;overflow:visible;pointer-events:none;animation:none!important}
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
   <path id="an-centre-orbit" d="M 6,29 C 13,13 69,13 78,29 C 69,45 13,45 6,29 Z"/>
   <linearGradient id="an-trail" x1="0%" y1="0%" x2="100%" y2="0%">
     <stop offset="0%" stop-color="#ff7c00" stop-opacity="0"/>
     <stop offset="48%" stop-color="#ff9d29" stop-opacity=".45"/>
     <stop offset="100%" stop-color="#fff3bc" stop-opacity="1"/>
   </linearGradient>
 </defs>
 <g class="an-animated-flight">
  <use href="#an-centre-orbit" fill="none" stroke="#ffc26f" stroke-width="2.8" stroke-linecap="round" stroke-dasharray="36 122" class="an-orbit-soft">
   <animate attributeName="stroke-dashoffset" from="0" to="-158" dur="3.8s" repeatCount="indefinite"/>
   <animate attributeName="opacity" values=".45;.95;.5" keyTimes="0;.5;1" dur="3.8s" repeatCount="indefinite"/>
  </use>
  <use href="#an-centre-orbit" fill="none" stroke="#fff7cb" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="18 140">
   <animate attributeName="stroke-dashoffset" from="0" to="-158" dur="3.8s" repeatCount="indefinite"/>
  </use>
  <g class="an-plane">
   <path d="M-34 0 L-6 0" fill="none" stroke="url(#an-trail)" stroke-width="2.8" stroke-linecap="round"/>
   <path d="M-14 0 L-5 0" fill="none" stroke="#fff1b2" stroke-width="1.1" stroke-linecap="round"/>
   <path d="M 10 0 L -8 -4.8 L -3 -1 L -10 -1 L -12 -4.5 L -14 -4.5 L -12 0 L -14 4.5 L -12 4.5 L -10 1 L -3 1 L -8 4.8 Z"
     fill="#fff4d0" stroke="#f6a531" stroke-width=".65" stroke-linejoin="round"/>
   <animateMotion dur="3.8s" repeatCount="indefinite" rotate="auto"><mpath href="#an-centre-orbit"/></animateMotion>
   <animate attributeName="opacity" values=".98;.30;.98" keyTimes="0;.5;1" dur="3.8s" repeatCount="indefinite"/>
  </g>
 </g>`;
 host.appendChild(svg);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installFlight,{once:true});
else installFlight();
})();