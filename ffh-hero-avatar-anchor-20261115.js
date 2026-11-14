/* Keep the existing editable photo node and its event handlers.
   Move it out of nested layout wrappers so its coordinates are relative
   to the neon hero itself, not to an offset inner grid. */
(()=>{'use strict';
 const root=document.getElementById('app');if(!root)return;
 let pending=false;
 function align(){
   pending=false;
   const hero=root.querySelector('.app:has(.homeGrid) .ffIdentityHero');
   if(!hero)return;
   const photo=hero.querySelector('.editableAvatar');
   if(photo&&photo.parentElement!==hero){
     hero.insertBefore(photo,hero.firstChild);
   }
 }
 function queue(){if(pending)return;pending=true;requestAnimationFrame(align)}
 new MutationObserver(queue).observe(root,{childList:true,subtree:true});
 queue();
})();