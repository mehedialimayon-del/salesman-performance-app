/* Restore the preceding Contacts view when hardware/browser Back is pressed.
   Keep this separate from the large app.js so other modules remain untouched. */
(function(){
 'use strict';
 window.addEventListener('popstate',function(event){
  try{
   if(window.__FFH_ALLOW_EXIT__||!event.state||event.state.ffhPage!=='contacts')return;
   if(typeof currentPage==='undefined'||!['contacts','contactEdit'].includes(currentPage))return;
   if(typeof ffContacts==='undefined'||typeof ffContacts.home!=='function')return;
   event.stopImmediatePropagation();
   if(currentPage!=='contacts'&&typeof navStack!=='undefined'&&navStack.length)navStack.pop();
   Promise.resolve(ffContacts.home(event.state.ffhContactsCategory||null)).catch(error=>console.warn('Contact Back restore:',error));
  }catch(error){console.warn('Contact history restore:',error);}
 },true);
})();
