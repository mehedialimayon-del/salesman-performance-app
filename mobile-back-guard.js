/* Android hardware/gesture back: close the topmost UI first, navigate inside
   FieldForce, and only ask to exit when the user is at Home. */
(function(){
 'use strict';
 window.FFH_NATIVE_BACK=function(){
  const q=s=>document.querySelector(s);
  const exit=q('.ffExitOverlay');
  if(exit){q('#ffExitCancel')?.click();return true;}
  const viewer=q('.ffPhotoViewer [data-action="close"]');
  if(viewer){viewer.click();return true;}
  const task=q('.ffTaskModalBackdrop [data-task-close]');
  if(task){task.click();return true;}
  if(q('#aiPopup')){
   const orb=q('#orb');
   if(orb)orb.click();
   else if(typeof closeAIPopup==='function')closeAIPopup();
   return true;
  }
  if(q('.drop.show')){q('.drop.show')?.classList.remove('show');return true;}
  // FFH_OVERLAY owns its history entry; allow its back listener to dispose it.
  if(q('.globalSearchOverlay')){history.back();return true;}
  if(typeof currentPage!=='undefined'&&currentPage==='home'){
   if(typeof ffhExitPrompt==='function')ffhExitPrompt();
   return true;
  }
  if(history.state?.ffhPage&&history.length>1){history.back();return true;}
  if(typeof home==='function'){home(true);return true;}
  return false;
 };
})();
