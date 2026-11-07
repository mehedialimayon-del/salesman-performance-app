/* FieldForce Hub · task scope compact adapter v2.
   Handles both legacy scopeBar() and newer ffDirectScope markup without replacing
   filters or binding new permission/data handlers. */
(()=>{
 'use strict';
 const app=document.getElementById('app');if(!app)return;
 let queued=false;
 const setText=(label,text)=>{
  if(!label)return;
  if(label.dataset.ffTaskCompactCaption===text)return;
  const own=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
  if(own){own.textContent=text;}
  else{
   const first=[...label.children].find(n=>!n.matches('select,button,input,.ffSelectTrigger'));
   if(first&&!first.querySelector('select,button,input')){
    first.textContent=text;
   }else label.insertBefore(document.createTextNode(text),label.firstChild);
  }
  label.dataset.ffTaskCompactCaption=text;
 };
 function enhance(){
  queued=false;
  const main=app.querySelector('main.wrap.ffTaskPage');
  const scope=main?.querySelector(':scope > details.ffTaskScope');
  if(!scope)return;
  if(!scope.open)scope.open=true;
  const zone=scope.querySelector('#ffDashboardZone');
  const staff=scope.querySelector('#ffScopeStaff');
  if(!zone||!staff)return;
  const zl=zone.closest('label'),sl=staff.closest('label');
  if(!zl||!sl)return;
  // Mark only the shared parent of the two selectors, preserving original
  // select IDs and events so Tasks/History/Assign continue unchanged.
  const parent=zl.parentElement===sl.parentElement?zl.parentElement:null;
  if(!parent)return;
  if(!scope.classList.contains('ffTaskCompactV2'))scope.classList.add('ffTaskCompactV2');
  if(!parent.classList.contains('ffTaskCompactPair'))parent.classList.add('ffTaskCompactPair');
  setText(zl,'SELECT ZONE');
  setText(sl,'SELECT SR / FILTER');
 }
 function queue(){if(!queued){queued=true;requestAnimationFrame(enhance)}}
 new MutationObserver(queue).observe(app,{subtree:true,childList:true,characterData:false});
 document.addEventListener('ffh-staff-updated',queue);
 window.addEventListener('pageshow',queue);
 queue();
})();
