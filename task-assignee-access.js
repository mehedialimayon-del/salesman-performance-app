/* Task-assignee visibility for FieldForce Hub.
   Server-side ffh_task_can_assign enforces these choices during INSERT. */
(function(){
 'use strict';
 const watched=new WeakSet();
 const safe=s=>String(s??'');
 const taskForm=form=>{
   if(!form||!form.matches('form'))return false;
   const id=safe(form.id).toLowerCase();
   const content=safe(form.textContent).toLowerCase();
   return id.includes('task')||(content.includes('assign')&&content.includes('task'));
 };
 const escapeHtml=s=>safe(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const lookup=async()=>{
   const db=window.FFH_SUPABASE;if(!db?.rpc)throw new Error('Cloud account service not connected');
   const {data,error}=await db.rpc('ffh_task_recipients');if(error)throw error;
   if(!Array.isArray(data))throw new Error('Staff assignment list not available');
   return data.filter(p=>p&&typeof p.staff_id==='string');
 };
 async function wire(form){
   if(watched.has(form)||!taskForm(form))return;
   const select=form.querySelector('select[name="to"],select[name="assigned_to"]');
   if(!select)return;
   watched.add(form);
   const previous=select.value;
   const label=select.closest('label');
   const ui=document.createElement('div');ui.className='ffTaskRecipientScope';ui.style.cssText='display:grid;gap:5px;margin:8px 0;color:#fff;font-size:12px';
   const toolbar=document.createElement('div');toolbar.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap';
   const caption=document.createElement('span');caption.textContent='TASK RECIPIENTS';
   caption.style.cssText='color:#ff7b23;font-weight:800;letter-spacing:.04em';
   const scope=document.createElement('select');scope.type='button';
   scope.setAttribute('aria-label','Filter task recipient zone');scope.style.cssText='background:#090b0e;color:white;border:1px solid #fa762b;border-radius:9px;padding:9px;max-width:250px';
   scope.innerHTML='<option value="all">All permitted · management + team</option><option value="zone">My zone · team</option>';
   toolbar.append(caption,scope);
   const note=document.createElement('small');note.style.color='#eee';note.textContent='Loading permitted staff…';
   ui.append(toolbar,note);
   (label||select.parentElement).insertAdjacentElement('afterend',ui);
   select.disabled=true;
   try{
     const people=await lookup();if(!form.isConnected)return;
     const managerGroup=people.filter(p=>p.can_manage===true),srGroup=people.filter(p=>p.can_manage!==true);
     if(!managerGroup.length)scope.value='zone';
     const zoneHint=(people.find(p=>p.same_zone===true)||{}).zone_id||'';
     function render(){
       const selected=select.value||previous;
       const scoped=scope.value==='zone'?people.filter(p=>p.same_zone===true||p.is_upward===true):people;
       const groups=[['MANAGEMENT',scoped.filter(p=>p.can_manage===true)],['SR · PERMITTED ZONE',scoped.filter(p=>p.can_manage!==true)]];
       select.replaceChildren();
       select.add(new Option('Select a person…',''));
       for(const [title,records] of groups)if(records.length){
         const group=document.createElement('optgroup');group.label=title;
         records.forEach(p=>group.append(new Option(p.name+' · '+(p.login_id||p.staff_id)+' · '+p.zone_id,p.staff_id)));
         select.append(group);
       }
       if(people.some(p=>p.staff_id===selected)&&scoped.some(p=>p.staff_id===selected))select.value=selected;
       else select.value='';
       select.required=true;select.disabled=false;
       note.textContent=scoped.length+' permitted staff · Managers can assign across management; SR assignment stays zone-scoped.';
       window.FFH_STYLE_SELECT?.(select,{title:'Assign task to'});
     }
     if(!managerGroup.some(p=>p.same_zone===false)&&!srGroup.some(p=>p.same_zone===false)){
       scope.remove();caption.textContent='MY ZONE / REPORTING MANAGEMENT';
     }
     scope.addEventListener('change',render);
     render();
   }catch(error){
     select.disabled=false;
     note.textContent='Recipient list could not load: '+safe(error.message||error)+'. Reopen Tasks and retry.';
     note.style.color='#ffad9b';
   }
 }
 let scanning=false;
 function scan(){
   if(scanning)return;scanning=true;
   try{
     document.querySelectorAll('form').forEach(form=>{
       if(!watched.has(form)&&taskForm(form)&&form.querySelector('select[name="to"],select[name="assigned_to"]'))wire(form);
     });
   }finally{scanning=false;}
 }
 const observer=new MutationObserver(()=>scan());
 const start=()=>{observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});scan();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();