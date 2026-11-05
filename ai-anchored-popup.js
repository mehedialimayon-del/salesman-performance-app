/* AYON AI: open and close from the floating orb's actual position.
   Never change the saved user drag location or the existing AI content. */
(()=>{
 'use strict';
 let anchor=null,closing=false,synthetic=false,original=null;
 const style=document.createElement('style');
 style.textContent=`
  body #app #orb.aiOrb{display:grid!important;place-items:center;z-index:10160!important}
  #aiPopup.aiFloatingOverlay{z-index:10100!important}
  #aiPopup .aiPopupPanel.ffOrbOpen{animation:ffOrbGrow .28s cubic-bezier(.19,.89,.30,1)!important;transform-origin:var(--ff-orb-origin-x,50%) var(--ff-orb-origin-y,50%)}
  #aiPopup .aiPopupPanel.ffOrbClose{animation:ffOrbShrink .20s ease-in forwards!important;transform-origin:var(--ff-orb-origin-x,50%) var(--ff-orb-origin-y,50%)}
  @keyframes ffOrbGrow{from{opacity:.12;transform:translate(var(--ff-orb-dx,0px),var(--ff-orb-dy,0px)) scale(.12)}to{opacity:1;transform:translate(0,0) scale(1)}}
  @keyframes ffOrbShrink{from{opacity:1;transform:translate(0,0) scale(1)}to{opacity:.12;transform:translate(var(--ff-orb-dx,0px),var(--ff-orb-dy,0px)) scale(.12)}}
  @media(prefers-reduced-motion:reduce){#aiPopup .aiPopupPanel.ffOrbOpen,#aiPopup .aiPopupPanel.ffOrbClose{animation:none!important}}
 `;
 document.head.append(style);
 const orb=()=>document.getElementById('orb');
 function capture(){
  const el=orb();if(!el)return;
  const r=el.getBoundingClientRect();
  anchor={x:r.left,y:r.top,w:r.width,h:r.height};
  original=['top','bottom','left','right','width','height'].map(k=>[k,el.style.getPropertyValue(k),el.style.getPropertyPriority(k)]);
 }
 function fixPosition(){
  const el=orb();if(!el||!anchor)return;
  el.style.setProperty('position','fixed','important');
  el.style.setProperty('top',Math.max(4,anchor.y)+'px','important');
  el.style.setProperty('left',Math.max(4,anchor.x)+'px','important');
  el.style.setProperty('bottom','auto','important');
  el.style.setProperty('right','auto','important');
  el.style.setProperty('width',anchor.w+'px','important');
  el.style.setProperty('height',anchor.h+'px','important');
 }
 function restore(){
  const el=orb();if(!el||!original)return;
  for(const [key,val,pri] of original){
   if(val)el.style.setProperty(key,val,pri);
   else el.style.removeProperty(key);
  }
  el.style.removeProperty('position');
  anchor=null;original=null;
 }
 function prepare(panel){
  if(!panel||!anchor)return;
  const r=panel.getBoundingClientRect();
  if(!r.width||!r.height)return;
  const x=anchor.x+anchor.w/2-r.left,y=anchor.y+anchor.h/2-r.top;
  panel.style.setProperty('--ff-orb-origin-x',x+'px');
  panel.style.setProperty('--ff-orb-origin-y',y+'px');
  panel.style.setProperty('--ff-orb-dx',(x-r.width/2)+'px');
  panel.style.setProperty('--ff-orb-dy',(y-r.height/2)+'px');
 }
 document.addEventListener('click',e=>{
  if(!e.target.closest?.('#orb'))return;
  if(synthetic){synthetic=false;return;}
  const popup=document.getElementById('aiPopup');
  if(!popup){capture();return;}
  // Close first visually into the same round button, then use the
  // application's original toggle method to dispose voice/chat safely.
  if(closing)return;
  capture();fixPosition();
  const panel=popup.querySelector('.aiPopupPanel');
  if(!panel||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  e.preventDefault();e.stopImmediatePropagation();
  closing=true;prepare(panel);panel.classList.remove('ffOrbOpen');panel.classList.add('ffOrbClose');
  const finish=()=>{if(!closing)return;closing=false;synthetic=true;orb()?.click();setTimeout(()=>{synthetic=false;restore()},0)};
  panel.addEventListener('animationend',finish,{once:true});
  setTimeout(finish,270);
 },true);
 new MutationObserver(records=>{
  const popup=document.getElementById('aiPopup');
  if(popup){
   if(!popup.dataset.ffAnchored){
    if(!anchor)capture();
    fixPosition();popup.dataset.ffAnchored='1';
    requestAnimationFrame(()=>{const p=popup.querySelector('.aiPopupPanel');prepare(p);p?.classList.add('ffOrbOpen')});
   }
  }else if(!closing&&anchor){
   restore();
  }
 }).observe(document.body,{childList:true,subtree:false});
})();
