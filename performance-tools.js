/* Performance helpers reuse existing authenticated APIs and their permissions. */
window.FFH_CREATE_PERFORMANCE_TOOLS = function(ctx) {
 'use strict';
 const $=s=>document.querySelector(s), E=ctx.esc, sb=ctx.sb;
 let flushing=null, ticket=0, lastHistory=null;
 const me=()=>ctx.user()?.id;
 const key=id=>'ffh_order_outbox_v1_'+id;
 const read=id=>{const raw=localStorage.getItem(key(id));if(!raw)return [];let rows;try{rows=JSON.parse(raw);}catch(e){throw Error('Saved orders could not be read. Keep app data and contact Ayon.');}if(!Array.isArray(rows))throw Error('Saved orders could not be read. Keep app data and contact Ayon.');return rows;};
 const write=(id,rows)=>localStorage.setItem(key(id),JSON.stringify(rows));
 const online=()=>navigator.onLine!==false;
 const scopedIds=()=>ctx.isMgr()?ctx.ids():[me()];
 const who=id=>ctx.staff(id)?.name||id||'';
 const page=(name,title,body)=>{ctx.setPage(name);ctx.shell(ctx.back(title)+body);ctx.bindBack();};
 const stamp=s=>{const d=new Date(s);return !s?'Time not recorded':Number.isNaN(d.getTime())?s:d.toLocaleString('en-MY',{timeZone:'Asia/Kuala_Lumpur'});};
 const safePhoto=url=>/^https:\/\//i.test(url||'')?`<button class="secondary ffPerformancePhoto" data-photo="${E(url)}">VIEW PROOF PHOTO</button>`:'';
 const bindPhotos=()=>document.querySelectorAll('.ffPerformancePhoto').forEach(b=>b.onclick=()=>window.FFH_OPEN_IMAGE?.(b.dataset.photo));
 const rpc=async(name,action,payload={})=>{const {data,error}=await sb.rpc(name,{action,payload});if(error)throw Error(error.message);return data;};
 async function rows(table,order) {
  const all=[];
  for(let offset=0;;offset+=1000){const {data,error}=await sb.from(table).select('*').order(order,{ascending:false}).order('id',{ascending:false}).range(offset,offset+999);if(error)throw Error(error.message);all.push(...data||[]);if((data||[]).length<1000)return all;}
 }
 const retryable=e=>!e?.code&&(!e?.status||e.status>=500)||['PGRST000','PGRST001','PGRST002'].includes(e?.code);
 async function queueOrder(order) {
  const id=me();if(!id)throw Error('Login required');
  if(!scopedIds().includes(order.sr))throw Error('Choose an assigned SR');
  const all=read(id), record={id:order.id,actor:id,order:{...order,cloudConfirmed:false},queuedAt:new Date().toISOString(),state:'Pending',error:''};
  if(all.some(x=>x.id===order.id))throw Error('This order is already saved. Open Offline Sync.');
  // Persist before attempting the network; a storage failure must never claim a saved draft.
  write(id,[...all,record]);
  await flush();
  if(me()!==id)return {pending:true};
  const left=read(id).find(x=>x.id===order.id);
  return {pending:!!left,blocked:left?.state==='Blocked',error:left?.error||''};
 }
 async function flush(manual=false) {
  if(flushing)return flushing;
  const id=me();if(!id||!online())return;
  flushing=(async()=>{
   const snapshot=read(id);
   for(const item of snapshot){
    if(me()!==id||!online())break;
    if(item.actor!==id||item.state==='Blocked'&&!manual)continue;
    let failure=null;
    try{await ctx.saveSale(item.order);}catch(e){failure=e;}
    // Never update a different account's cache after a session switch.
    if(me()!==id)break;
    const current=read(id), found=current.find(x=>x.id===item.id);if(!found)continue;
    if(failure){found.state=retryable(failure)?'Pending':'Blocked';found.error=String(failure.message||failure);found.lastAttempt=new Date().toISOString();write(id,current);}
    else {
     ctx.acceptSale(item.order);
     write(id,current.filter(x=>x.id!==item.id));
     localStorage.setItem('ffh_order_sync_time_'+id,new Date().toISOString());
    }
   }
  })().finally(()=>{flushing=null;if(ctx.page()==='offlineSync')syncPage();});
  return flushing;
 }
 function syncPage(){
  const id=me();if(!id)return;let list;
  try{list=read(id);}catch(e){return page('offlineSync','Offline Sync',`<div class="card" role="alert">${E(e.message)}</div>`);}
  const last=localStorage.getItem('ffh_order_sync_time_'+id);
  page('offlineSync','Offline Sync',`<div class="card ffPerformanceIntro"><div class="cardTitle">${online()?'Connection available':'Offline · saved on this phone'}</div><p>New orders are saved here before sending. Only cloud-confirmed orders enter Sales. Delivery confirmation, attendance, photo proof and approvals require a connection.</p><p>Sign in online first. This screen does not enable offline sign-in. Keep app data until pending orders are sent.</p><b>${list.length} order(s) waiting</b><p class="miniStat">Last order sent: ${last?E(stamp(last)):'No confirmed send on this phone'}</p><button id="ffSyncRetry" class="primary" ${flushing||!online()?'disabled':''}>${flushing?'SENDING…':'RETRY / SEND SAVED ORDERS'}</button><p id="ffSyncMessage" role="status"></p></div>${list.map(x=>`<article class="card"><div class="row"><b>${E(x.order.outletName)}</b><span class="ffPerformanceStatus">${E(x.state==='Blocked'?'Needs attention':'Saved · waiting to send')}</span></div><p>${E(x.order.sku)} · ${E(x.order.qty)} cartons · ${ctx.rm(x.order.orderAmount)}</p><p>${E(who(x.order.sr))} · ${E(x.order.date)}</p><p class="miniStat">Saved ${E(stamp(x.queuedAt))} · ${E(x.id)}</p>${x.error?`<p role="status">${E(x.error)}</p>`:''}</article>`).join('')||'<div class="card empty">No new orders waiting to send on this phone.</div>'}`);
  $('#ffSyncRetry').onclick=async e=>{e.target.disabled=true;try{await ctx.refreshStaff();await flush(true);}catch(err){if($('#ffSyncMessage'))$('#ffSyncMessage').textContent=err.message;}finally{if(e.target.isConnected)e.target.disabled=false;}};
 }
 async function approvals(){
  const id=me(), turn=++ticket;
  page('approvals','Approval Inbox','<div class="card" role="status">Loading your permitted requests…</div>');
  const results=await Promise.allSettled([rows('ffh_tasks','created_at'),rpc('ffh_governance','state'),rpc('ffh_earnings','state'),rpc('ffh_claims_api','state'),ctx.refreshStaff()]);
  if(me()!==id||ticket!==turn||ctx.page()!=='approvals')return;
  const tasks=results[0].status==='fulfilled'?results[0].value:[],gov=results[1].status==='fulfilled'?results[1].value:{},earn=results[2].status==='fulfilled'?results[2].value:{},claims=results[3].status==='fulfilled'?results[3].value:{};
  // If permission refresh fails, server-backed review pages remain available; no direct task decision.
  const permissionsFresh=results[4].status==='fulfilled';
  const taskReview=permissionsFresh&&ctx.isMgr()&&ctx.may('tasks');
  const allowed=new Set(scopedIds()), items=[];
  tasks.filter(x=>x.assigned_to===id||ctx.isMgr()&&allowed.has(x.assigned_to)).filter(x=>['Pending Review','Done','Rejected'].includes(x.status)).forEach(x=>items.push({kind:'Task proof',id:x.id,staff:x.assigned_to,title:x.title,detail:x.description||'',status:x.status,date:x.updated_at||x.created_at,photo:x.proof_photo_url,location:x.proof_location,reviewer:x.reviewed_by,reviewedAt:x.reviewed_at,can:taskReview&&x.status==='Pending Review'&&x.assigned_to!==id,raw:x}));
  (gov.requests||[]).forEach(x=>items.push({kind:'Access / correction',id:x.id,staff:x.staff_id,title:x.module+' · '+x.action,detail:x.reason+' · Record '+x.record_id,status:x.status,date:x.created_at,reviewer:x.reviewed_by,reviewedAt:x.reviewed_at,can:false,open:'access',raw:x}));
  (earn.entries||[]).forEach(x=>items.push({kind:'Incentive / penalty',id:x.id,staff:x.staff_id,title:x.kind+' · '+ctx.rm(x.amount),detail:x.reason,status:x.status,date:x.created_at||x.entry_date,reviewer:x.approved_by,reviewedAt:x.reviewed_at,can:false,open:'incomeLedger',raw:x}));
  (claims.claims||[]).forEach(x=>items.push({kind:'Existing claim',id:x.id,staff:x.owner_staff_id,title:x.title,detail:x.kind,status:x.status,date:x.created_at,reviewer:x.reviewer_staff_id,reviewedAt:x.reviewed_at,can:false,open:'claim:'+x.id,raw:x}));
  const errors=results.map((x,i)=>x.status==='rejected'?['Tasks','Access requests','Income requests','Claims','Permissions'][i]+': '+x.reason.message:'').filter(Boolean);
  page('approvals','Approval Inbox',`<div class="card ffPerformanceIntro"><p>You see only requests allowed by your existing access. SRs can follow their submissions. Task review needs Manager access plus Tasks Edit; income review needs separate approval permission. Claims keep their assigned reviewer. Access decisions stay with the owner / delegated administrator.</p><p>Approving an access request records a decision. An authorized administrator must separately change the actual permissions.</p><div class="two"><label>Status<select id="ffApprovalStatus"><option value="pending">Waiting for review</option><option value="all">All history</option></select></label><label>Search<input id="ffApprovalSearch" placeholder="Staff, outlet, task or request"></label></div><button class="secondary" id="ffApprovalReload">REFRESH INBOX</button>${id==='M21954'?'<button class="secondary" id="ffApprovalPermissions">STAFF / TASK ACCESS SETTINGS</button><button class="secondary" id="ffIncomeApprovalPermissions">INCOME APPROVAL SETTINGS</button>':''}${errors.map(s=>`<p role="alert">${E(s)} · Some requests could not load.</p>`).join('')}</div><p id="ffApprovalCount" role="status"></p><div id="ffApprovalList"></div>`);
  const draw=()=>{const term=$('#ffApprovalSearch').value.trim().toLowerCase(),pending=$('#ffApprovalStatus').value==='pending';const shown=items.filter(x=>!pending||['Pending','Pending Review','Submitted'].includes(x.status)).filter(x=>!term||[x.kind,x.title,x.detail,who(x.staff),x.staff].join(' ').toLowerCase().includes(term)).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));$('#ffApprovalCount').textContent=shown.length+' request(s)';$('#ffApprovalList').innerHTML=shown.map((x,i)=>`<article class="card"><div class="row"><b>${E(x.title)}</b><span class="ffPerformanceStatus">${E(x.status)}</span></div><p>${E(x.kind)} · ${E(who(x.staff))}</p><p>${E(x.detail)}</p><p class="miniStat">Submitted / updated ${E(stamp(x.date))}</p>${x.reviewedAt?`<p class="miniStat">Reviewed ${E(stamp(x.reviewedAt))} · ${E(who(x.reviewer))}</p>`:x.reviewer?`<p>Reviewer: ${E(who(x.reviewer))}</p>`:''}${safePhoto(x.photo)}${x.location?`<p class="miniStat">Location proof: ${E(x.location.latitude)}, ${E(x.location.longitude)} · ${E(stamp(x.location.capturedAt))}</p>`:''}${x.can?`<button class="primary ffInboxDecision" data-index="${i}" data-status="Done">APPROVE TASK</button><button class="secondary ffInboxDecision" data-index="${i}" data-status="Rejected">RETURN TASK</button>`:''}${x.open?`<button class="secondary ffInboxOpen" data-index="${i}">OPEN REQUEST / REVIEW</button>`:''}</article>`).join('')||'<div class="card empty">No requests match this selection.</div>';bindPhotos();document.querySelectorAll('.ffInboxOpen').forEach(b=>b.onclick=()=>{const x=shown[+b.dataset.index];ctx.open(x.open,x.raw);});document.querySelectorAll('.ffInboxDecision').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await ctx.reviewTask(shown[+b.dataset.index].id,b.dataset.status);await approvals();}catch(e){alert(e.message);b.disabled=false;}});};
  $('#ffApprovalStatus').onchange=draw;$('#ffApprovalSearch').oninput=draw;$('#ffApprovalReload').onclick=approvals;
  if($('#ffApprovalPermissions'))$('#ffApprovalPermissions').onclick=()=>ctx.open('access');if($('#ffIncomeApprovalPermissions'))$('#ffIncomeApprovalPermissions').onclick=()=>ctx.open('incomeLedger');draw();
 }
 async function historyPage(){
  const id=me(), turn=++ticket;
  page('outletHistory','Outlet Performance History','<div class="card" role="status">Loading assigned outlets and history…</div>');
  let errors=[];try{await ctx.refreshStaff();await ctx.refreshOutlets();}catch(e){errors.push('Outlet access: '+e.message);}
  if(me()!==id||turn!==ticket||ctx.page()!=='outletHistory')return;
  // Permission/assignment failure never falls back to another person's cached history.
  if(errors.length)return page('outletHistory','Outlet Performance History',`<div class="card" role="alert">${E(errors.join(' '))}<button id="ffHistoryRetry" class="primary">RETRY</button></div>`),$('#ffHistoryRetry').onclick=historyPage;
  const result=await Promise.allSettled([rows('ffh_sales','created_at'),rows('ffh_tasks','created_at'),rows('ffh_campaign_executions','created_at')]);
  if(me()!==id||turn!==ticket||ctx.page()!=='outletHistory')return;
  const ids=scopedIds(), outlets=ids.flatMap(sid=>ctx.outlets(sid).map(o=>({...o,sr:sid}))),data=result.map((r,i)=>{if(r.status==='fulfilled')return r.value;errors.push(['Sales','Task proof','CPO / Promotion'][i]+': '+r.reason.message);return []});
  page('outletHistory','Outlet Performance History',`<div class="card ffPerformanceIntro"><p>Order, delivery and recorded outlet tasks / campaign proof in one place. No additional daily form. Missing history is not treated as a completed visit.</p><label>Search outlet / code / SR<input id="ffOutletHistorySearch" placeholder="e.g. KK or outlet code"></label><label>Assigned outlet<select id="ffOutletHistorySelect"><option value="">Choose an outlet</option></select></label><div class="two"><label>From<input id="ffOutletHistoryFrom" type="date"></label><label>To<input id="ffOutletHistoryTo" type="date"></label></div><button id="ffOutletHistoryReload" class="secondary">REFRESH HISTORY</button>${errors.map(e=>`<p role="alert">${E(e)} · History is incomplete.</p>`).join('')}</div><div id="ffOutletHistoryDetail"></div>`);
  const select=$('#ffOutletHistorySelect');
  const fill=()=>{const term=$('#ffOutletHistorySearch').value.trim().toLowerCase(),old=select.value;select.innerHTML='<option value="">Choose an outlet</option>'+outlets.map((o,i)=>({o,i})).filter(({o})=>!term||[o.name,o.code,o.category,who(o.sr)].join(' ').toLowerCase().includes(term)).map(({o,i})=>`<option value="${i}">${E(o.name)} (${E(o.code)}) · ${E(who(o.sr))}</option>`).join('');select.value=old;if(!select.value)$('#ffOutletHistoryDetail').innerHTML='';};
  const draw=()=>{
   const o=outlets[+select.value];if(select.value===''||!o)return;
   lastHistory={sr:o.sr,code:o.code};const from=$('#ffOutletHistoryFrom').value,to=$('#ffOutletHistoryTo').value;
   if(from&&to&&from>to){$('#ffOutletHistoryDetail').textContent='From date must be before To date.';return;}
   const range=d=>(!from||String(d||'').slice(0,10)>=from)&&(!to||String(d||'').slice(0,10)<=to);
   const match=r=>r.sr_id===o.sr&&(o.code?String(r.outlet_code)===String(o.code):r.outlet_name===o.name);
   const sales=data[0].filter(match).filter(r=>range(r.sale_date)),events=[];
   let total=0,pending=0;const skus=new Map();
   sales.forEach(r=>{if(r.status==='Delivered'){total+=+r.delivered_amount||0;skus.set(r.sku,(skus.get(r.sku)||0)+(+r.delivered_amount||0));}else if(r.status==='Pending Delivery')pending+=+r.order_amount||0;events.push({date:r.sale_date,title:r.status+' · '+r.sku,detail:(+r.qty||0)+' cartons · Order '+ctx.rm(r.order_amount)+' · Delivered '+ctx.rm(r.delivered_amount),remarks:r.remarks});});
   data[1].filter(r=>r.assigned_to===o.sr&&r.outlet_name===o.name&&outlets.filter(v=>v.sr===o.sr&&v.name===o.name).length===1).filter(r=>range(r.created_date||r.created_at)).forEach(r=>events.push({date:r.created_date||r.created_at,title:'Task · '+r.title+' · '+r.status,detail:r.description,remarks:r.reviewed_at?'Reviewed '+stamp(r.reviewed_at):'',photo:r.proof_photo_url}));
   data[2].filter(match).filter(r=>range(r.execution_date)).forEach(r=>events.push({date:r.execution_date,title:'CPO / Promotion · '+r.status,detail:r.remarks,photo:r.photo_url}));
   events.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
   $('#ffOutletHistoryDetail').innerHTML=`<div class="card"><div class="cardTitle">${E(o.name)}</div><p>${E(o.code)} · ${E(who(o.sr))}</p><div class="two"><div>Delivered<b class="green ffPerformanceAmount">${ctx.rm(total)}</b></div><div>Pending order<b class="ffPerformanceAmount">${ctx.rm(pending)}</b></div></div><p>${skus.size} delivered SKU(s) in selected dates</p>${[...skus].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([sku,amount])=>`<p>${E(sku)} · ${ctx.rm(amount)}</p>`).join('')}</div>${events.map(x=>`<article class="card"><b>${E(x.title)}</b><p class="miniStat">${E(x.date)}</p><p>${E(x.detail||'')}</p>${x.remarks?`<p>${E(x.remarks)}</p>`:''}${safePhoto(x.photo)}</article>`).join('')||'<div class="card empty">No recorded activity in this selection.</div>'}`;bindPhotos();
  };
  $('#ffOutletHistorySearch').oninput=fill;select.onchange=draw;$('#ffOutletHistoryFrom').onchange=draw;$('#ffOutletHistoryTo').onchange=draw;$('#ffOutletHistoryReload').onclick=historyPage;fill();
  if(lastHistory){const i=outlets.findIndex(o=>o.sr===lastHistory.sr&&o.code===lastHistory.code);if(i>=0){select.value=String(i);draw();}}
 }
 window.addEventListener('online',()=>flush().catch(console.warn));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)flush().catch(console.warn);});
 return {queueOrder,flush,syncPage,approvals,historyPage};
};
