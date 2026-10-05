/* Browser viewing does not require phone permissions. Duty proof still does. */
(function(){'use strict';let deferred=false;
function native(){return !!window.FieldForceNative||/FFHNative\/1/.test(navigator.userAgent);}
function enhance(){if(native()||typeof document==='undefined')return;const overlay=document.getElementById('ffhEntryPermissions');if(!overlay)return;if(deferred){overlay.remove();document.querySelector('#app>.app')?.removeAttribute('inert');return;}if(overlay.querySelector('#ffhEntryBrowse'))return;const section=overlay.querySelector('section');if(!section)return;const button=document.createElement('button');button.id='ffhEntryBrowse';button.type='button';button.className='secondary';button.textContent='CONTINUE IN BROWSER';const detail=document.createElement('p');detail.className='miniStat';detail.textContent='Viewing and exports are available. Attendance and location proof still require location permission.';button.onclick=()=>{deferred=true;overlay.remove();document.querySelector('#app>.app')?.removeAttribute('inert');};section.append(button,detail);}
new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});enhance();
})();
