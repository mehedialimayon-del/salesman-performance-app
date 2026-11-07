/* Zero Sales fullscreen control. The existing search, filters and outlet rendering are reused. */
(()=>{
 'use strict';
 const app=document.getElementById('app');
 if(!app)return;
 let queued=false;
 const close=main=>{
  if(!main?.classList.contains('ffZeroFullscreen'))return;
  main.classList.remove('ffZeroFullscreen');
  const btn=main.querySelector('.ffZeroExpandButton');
  if(btn){btn.textContent='⛶';btn.title='Full screen';btn.setAttribute('aria-label','Full screen');btn.setAttribute('aria-pressed','false');}
 };
 function enhance(){
  queued=false;
  const main=app.querySelector('.app > main.wrap');
  if(!main)return;
  const board=main.querySelector('.ffZeroBoard');
  const list=board?.querySelector('.ffOutletList');
  if(!list||list.querySelector('.ffZeroExpandButton'))return;
  const button=document.createElement('button');
  button.type='button';
  button.className='ffZeroExpandButton';
  button.textContent='⛶';
  button.title='Full screen';
  button.setAttribute('aria-label','Full screen');
  button.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>{
   const full=!main.classList.contains('ffZeroFullscreen');
   if(full)main.classList.add('ffZeroFullscreen');else close(main);
   button.textContent=full?'×':'⛶';
   button.title=full?'Close full screen':'Full screen';
   button.setAttribute('aria-label',button.title);
   button.setAttribute('aria-pressed',String(full));
  });
  list.insertBefore(button,list.firstChild);
 }
 const queue=()=>{if(queued)return;queued=true;requestAnimationFrame(enhance);};
 new MutationObserver(queue).observe(app,{childList:true,subtree:true});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')close(app.querySelector('.ffZeroFullscreen'));});
 queue();
})();