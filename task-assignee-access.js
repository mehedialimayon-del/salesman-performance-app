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
   const scope=document.createElement('select');
   scope.setAttribute('aria-label','Filter task recipient zone');scope.style.cssText='background:#090b0e;color:white;border:1px solid #fa762b;border-radius:9px;padding:9px;max-width:250px';
   scope.innerHTML='<option value="all">All active staff · company-wide</option><option value="zone">My zone + leadership</option>';
   toolbar.append(caption,scope);
   const search=document.createElement('input');
   search.type='search';search.setAttribute('aria-label','Search task recipients');
   search.placeholder='Search SR / manager / staff ID / zone';
   search.style.cssText='width:100%;box-sizing:border-box;border:1px solid #984a23;border-radius:10px;padding:9px;background:#101214;color:#fff;font-size:13px';
   const directoryButton=document.createElement('button');
   directoryButton.type='button';directoryButton.className='ffTaskDirectoryReadOnly';
   directoryButton.textContent='SR MANAGEMENT · VIEW ONLY';
   directoryButton.style.cssText='border:1px solid #ff7b23;border-radius:10px;background:#201710;color:#fff;padding:8px 10px;font-size:11px';
   toolbar.append(directoryButton);
   const note=document.createElement('small');note.style.color='#eee';note.textContent='Loading permitted staff…';
   ui.append(toolbar,search,note);
   (label||select.parentElement).insertAdjacentElement('afterend',ui);
   select.disabled=true;
   try{
     const people=await lookup();if(!form.isConnected)return;
     const managerGroup=people.filter(p=>p.can_manage===true);
     if(!managerGroup.length)scope.value='zone';
     for(const id of [...new Set(people.map(p=>p.zone_id).filter(Boolean))].sort()){
       scope.add(new Option('ZONE · '+id,'zone:'+id));
     }
     directoryButton.onclick=async()=>{
       directoryButton.disabled=true;
       try{
         const {data:state,error}=await window.FFH_SUPABASE.rpc('ffh_governance',{action:'state',payload:{}});
         if(error)throw error;
         if(!window.FFH_STAFF_DIRECTORY?.render)throw Error('Staff Directory unavailable. Refresh the page.');
         const layer=document.createElement('div');layer.className='ffReadOnlyStaffOverlay';
         layer.setAttribute('role','dialog');layer.setAttribute('aria-label','Staff Management view only');
         layer.style.cssText='position:fixed;inset:0;z-index:28000;background:#090b0f;overflow:auto;padding:12px 10px 85px;box-sizing:border-box';
         const head=document.createElement('div');head.style.cssText='position:sticky;top:0;z-index:1;background:#090b0f;padding:8px 0;display:flex;gap:8px;justify-content:space-between;align-items:center';
         const title=document.createElement('strong');title.style.color='#ff7b23';title.textContent='SR MANAGEMENT · READ ONLY';
         const close=document.createElement('button');close.type='button';close.textContent='CLOSE';close.className='secondary';close.onclick=()=>layer.remove();
         head.append(title,close);layer.append(head);
         const info=document.createElement('p');info.textContent='Names, zones and Staff IDs only. No edit, delete, password, or access controls. Zone data follows your signed-in viewing scope.';info.style.cssText='color:#eee;font-size:12px';layer.append(info);
         const listing=document.createElement('div');
         listing.innerHTML=window.FFH_STAFF_DIRECTORY.render({profiles:state?.profiles||[],zones:state?.zones||[],owner:false,admin:false,viewerId:'',escape:escapeHtml});
         layer.append(listing);document.body.append(layer);window.FFH_STAFF_DIRECTORY.bindSearch(layer);
       }catch(error){note.textContent='Directory: '+safe(error.message||error);note.style.color='#ffad9b';}
       finally{directoryButton.disabled=false;}
     };
     function render(){
       const selected=select.value||previous;
       const scoped=scope.value==='zone'?people.filter(p=>p.same_zone===true||p.is_upward===true):
         scope.value.startsWith('zone:')?people.filter(p=>p.zone_id===scope.value.slice(5)):people;
       const term=search.value.trim().toLocaleLowerCase();
       const matched=term?scoped.filter(p=>[p.name,p.staff_id,p.login_id,p.zone_id,p.designation].join(' ').toLocaleLowerCase().includes(term)):scoped;
       const groups=[['MANAGERS / HEAD OF SALES / SALES ADMIN',matched.filter(p=>p.can_manage===true)],['SALES REPRESENTATIVES · SELECTED ZONE',matched.filter(p=>p.can_manage!==true)]];
       select.replaceChildren();
       select.add(new Option('Select a person…',''));
       for(const [title,records] of groups)if(records.length){
         const group=document.createElement('optgroup');group.label=title;
         records.forEach(p=>group.append(new Option(p.name+' · '+(p.login_id||p.staff_id)+' · '+p.zone_id+' · '+String(p.designation|| (p.can_manage?'MANAGER':'SR')).replaceAll('_',' '),p.staff_id)));
         select.append(group);
       }
       if(people.some(p=>p.staff_id===selected)&&scoped.some(p=>p.staff_id===selected))select.value=selected;
       else select.value='';
       select.required=true;select.disabled=false;
       note.textContent=matched.length+' of '+scoped.length+' active staff · All means all returned by signed-in cloud RPC; assignments do not grant dashboard, location, or private chat access.';
       window.FFH_STYLE_SELECT?.(select,{title:'Assign task to'});
     }
     // Keep the All active staff filter available for every logged-in role.
     scope.addEventListener('change',render);
     search.addEventListener('input',render);
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