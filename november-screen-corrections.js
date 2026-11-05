/* Targeted, idempotent FieldForce Hub UI fixes. All data and role checks
   remain owned by the existing authenticated app and database. */
(()=>{
 'use strict';
 const app=document.getElementById('app');if(!app)return;
 let pending=false,closingAI=false,bypassAI=false;
 function compactContacts(){
   for(const card of app.querySelectorAll('.ffContactCard')){
     const identity=card.querySelector('.ffContactIdentity'),tags=identity?.querySelector('.ffContactTags');
     if(!identity||!tags||identity.classList.contains('ffCompactContact'))continue;
     identity.classList.add('ffCompactContact');
     const labeled=Array.from(tags.children).map(el=>({
        el,key:el.querySelector('small')?.textContent.trim().toLowerCase()||''
     }));
     const zone=labeled.find(x=>x.key==='zone');
     if(zone){
       const line=document.createElement('div');line.className='ffContactZoneLine';
       line.append(zone.el);identity.append(line);
     }
     const extra=labeled.filter(x=>x.key==='sales team'||x.key==='route names');
     if(extra.length){
       const details=document.createElement('details');details.className='ffContactExtra';
       const summary=document.createElement('summary');summary.textContent='Team / route details';
       details.append(summary,...extra.map(x=>x.el));identity.append(details);
     }
     const links=card.querySelector(':scope > .ffContactLinks');
     if(links)identity.append(links);
   }
 }
 function effectivePermissions(){
   const f=app.querySelector('#ffAccountForm');
   if(!f)return;
   const table=f.querySelector('.ffPermissionTable');
   if(!table)return;
   let included=f.querySelector('.ffRoleIncluded');
   if(!included){
     included=document.createElement('section');included.className='ffRoleIncluded';
     table.before(included);
   }
   const designation=f.elements.namedItem('designation')?.value||'';
   const canSell=f.elements.namedItem('can_sell')?.checked||designation==='SR';
   const roleKey=designation+'|'+canSell;
   if(included.dataset.roleKey!==roleKey){
     included.dataset.roleKey=roleKey;
     included.replaceChildren();
     const title=document.createElement('h3');title.textContent=canSell?'✓ Included with SR role':'Additional module permissions';
     included.append(title);
     if(canSell){
       const grid=document.createElement('div');grid.className='ffRoleBaseGrid';
       for(const labelText of ['Own daily sales entry','Own attendance','Assigned task / proof','Own private chat']){
         const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';
         check.checked=true;check.disabled=true;check.setAttribute('aria-label',labelText+' (included with SR role)');
         label.append(check,document.createTextNode(labelText));grid.append(label);
       }
       included.append(grid);
     }
     const help=document.createElement('p');help.className='ffRoleHint';
     help.textContent=canSell
       ?'✓ These are role-included operations, not extra Edit / Upload / Delete grants. The boxes below control extra delegation only; an empty grant does not disable the normal SR sales form.'
       :'Edit, Upload and Delete below are independent extra grants. Owner decides each manager permission; your existing account scope still applies.';
     included.append(help);
   }
   if(!f.dataset.ffRoleGuard){
     f.dataset.ffRoleGuard='1';
     const designationSelect=f.elements.namedItem('designation'),sell=f.elements.namedItem('can_sell');
     designationSelect?.addEventListener('change',()=>requestAnimationFrame(effectivePermissions));
     sell?.addEventListener('change',()=>{
       if(designationSelect?.value==='SR'&&!sell.checked){
         // The existing save code always restores can_sell for SR designation.
         // Do not imply this checkbox can revoke the mandatory baseline role.
         sell.checked=true;
         window.alert('SR role includes daily sales by default. To disable that role, change the account Position and review its route assignment first. Extra permissions can be removed separately.');
       }
       requestAnimationFrame(effectivePermissions);
     });
   }
 }
 function zeroHeight(){
   const main=app.querySelector('main.wrap:has(.ffZeroBoard)');
   if(!main)return;
   const nav=app.querySelector('nav.bottomSeven')||app.querySelector('nav');
   const mainTop=main.getBoundingClientRect().top,navTop=nav?.getBoundingClientRect().top;
   const target=Math.max(330,Math.floor((navTop&&navTop>mainTop?navTop:window.innerHeight-77)-mainTop-5));
   const value=target+'px';
   if(main.style.getPropertyValue('--ff-zero-main-height')!==value)main.style.setProperty('--ff-zero-main-height',value);
 }
 function render(){pending=false;compactContacts();effectivePermissions();zeroHeight();}
 function queue(){if(pending)return;pending=true;requestAnimationFrame(render)}
 new MutationObserver(queue).observe(app,{childList:true,subtree:true});
 window.addEventListener('resize',queue,{passive:true});
 window.visualViewport?.addEventListener('resize',queue,{passive:true});
 queue();

 // Open from the original AI portrait position, not from a new top-right icon.
 function geometry(panel,orb){
   const a=orb.getBoundingClientRect(),b=panel.getBoundingClientRect();
   return {x:Math.round(a.left+a.width/2-b.left-b.width/2),
     y:Math.round(a.top+a.height/2-b.top-b.height/2)};
 }
 function openMotion(orb){
   const panel=document.querySelector('#aiPopup .aiPopupPanel'),popup=document.querySelector('#aiPopup');
   if(!panel||!popup||popup.dataset.ffAnimated)return;
   popup.dataset.ffAnimated='yes';
   if(typeof panel.animate!=='function'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
   const {x,y}=geometry(panel,orb);
   panel.animate([
     {transform:`translate(${x}px,${y}px) scale(.13)`,opacity:0},
     {transform:'translate(0,0) scale(1)',opacity:1}
   ],{duration:265,easing:'cubic-bezier(.18,.82,.22,1)'});
 }
 document.addEventListener('click',e=>{
   const orb=e.target.closest?.('#orb');
   if(!orb)return;
   const popup=document.querySelector('#aiPopup');
   if(!popup){
     queueMicrotask(()=>openMotion(orb));return;
   }
   if(bypassAI||closingAI)return;
   const panel=popup.querySelector('.aiPopupPanel');
   if(!panel||typeof panel.animate!=='function'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
   e.preventDefault();e.stopImmediatePropagation();
   closingAI=true;
   const {x,y}=geometry(panel,orb);
   const animation=panel.animate([
     {transform:'translate(0,0) scale(1)',opacity:1},
     {transform:`translate(${x}px,${y}px) scale(.13)`,opacity:0}
   ],{duration:210,easing:'ease-in',fill:'forwards'});
   const complete=()=>{
     if(!closingAI)return;
     closingAI=false;
     bypassAI=true;
     try{orb.click()}finally{bypassAI=false}
   };
   animation.onfinish=complete;
   animation.oncancel=complete;
 },true);
 document.addEventListener('click',e=>{
   const orb=e.target.closest?.('#orb');
   if(orb&&!closingAI)queueMicrotask(()=>openMotion(orb));
 },false);
})();
