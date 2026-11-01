window.FFH_CREATE_HEAD_OFFICE=ctx=>{
 'use strict';
 const {q,qa,esc:E,FFH_SUPABASE:sb}=ctx;
 const rpc=async(action,payload={})=>{const {data,error}=await sb.rpc('ffh_governance',{action,payload});if(error)throw Error(error.message);return data;};
 async function home(){
  if(!['M21954','PERVES_HIRA'].includes(ctx.user()?.id))return;
  ctx.setPage('headOffice');
  ctx.shell(ctx.back('HEAD OFFICE')+'<div class="card" role="status">Loading live Head Office scope…</div>');ctx.bindBack();
  try{
   await ctx.ffhLoadCloud();
   const state=await rpc('state'),owner=ctx.user().id==='M21954',scope=ctx.scope(),zones=(state.zones||[]).filter(z=>z.active),people=(state.profiles||[]).filter(p=>p.active&&p.staff_id!=='PERVES_HIRA'),grants=(state.grants||[]).filter(g=>g.staff_id==='PERVES_HIRA'&&g.module!=='kb'&&(g.can_edit||g.can_upload||g.can_delete));
   if(scope.zone!=='ALL'&&!zones.some(z=>z.id===scope.zone))scope.zone='ALL';
   if(scope.staff!=='ALL'&&!people.some(p=>p.staff_id===scope.staff&&(scope.zone==='ALL'||p.zone_id===scope.zone)))scope.staff='ALL';
   ctx.setScope(scope.zone,scope.staff);
   ctx.shell(ctx.back('HEAD OFFICE')+`<section class="card"><div class="cardTitle">PERVES HIRA</div><p>HEAD OF SALES · MODERN TRADE</p><p>Sales, staff performance and work activity across assigned active zones, including Ayon's zone.</p><p><b>${zones.filter(z=>z.id!=='HEAD_OFFICE').length}</b> operational zones · <b>${people.filter(p=>scope.zone==='ALL'||p.zone_id===scope.zone).length}</b> staff</p><p>Account and access controlled by Ayon · AI_BASE editing disabled</p>${owner?'<button id="ffHeadOfficeManage" class="primary">MANAGE HEAD OFFICE ACCESS</button>':''}</section>
   <section class="card"><div class="two"><label>Zone<select id="ffHeadZone"><option value="ALL">ALL PERMITTED ACTIVE ZONES</option>${zones.filter(z=>z.id!=='HEAD_OFFICE').map(z=>`<option value="${E(z.id)}" ${scope.zone===z.id?'selected':''}>${E(z.name)}</option>`).join('')}</select></label><label>Staff<select id="ffHeadStaff"><option value="ALL">COMBINED TEAM</option>${people.filter(p=>scope.zone==='ALL'||p.zone_id===scope.zone).map(p=>`<option value="${E(p.staff_id)}" ${scope.staff===p.staff_id?'selected':''}>${E(p.full_name)}</option>`).join('')}</select></label></div><button id="ffHeadRefresh" class="secondary">REFRESH LIVE DATA</button></section>
   <section class="card"><div class="cardTitle">SALES & TEAM ACTIVITY</div><div class="two">${[['dashboard','SALES DASHBOARD'],['sales','DAILY SALES'],['reports','REPORTS'],['zero','ZERO SALES'],['attendance','ATTENDANCE'],['tracking','SR TRACKING'],['tasks','TASKS & FOLLOW-UP'],['route','ROUTE PLAN'],['cpo','CPO / PROMOTION'],['briefings','MEETINGS & NOTICES']].map(([page,title])=>`<button class="secondary" data-head-page="${page}">${title}</button>`).join('')}</div></section>
   <details class="card"><summary>ENABLED EDIT PERMISSIONS · ${grants.length}</summary>${grants.map(g=>`<p>${E(g.module.replaceAll('_',' ').toUpperCase())} · ${[g.can_edit?'Edit':'',g.can_upload?'Upload':'',g.can_delete?'Delete':''].filter(Boolean).join(' / ')}</p>`).join('')||'<p>View only. Ayon can enable individual module permissions.</p>'}</details>
   <section class="card"><div class="cardTitle">RECENT WORK ACTIVITY</div><div id="ffHeadActivity" role="status">Loading activity…</div></section>`);
   ctx.bindBack();
   if(owner)q('#ffHeadOfficeManage').onclick=()=>ctx.go('access');
   q('#ffHeadZone').onchange=e=>{ctx.setScope(e.target.value,'ALL');home();};
   q('#ffHeadStaff').onchange=e=>{ctx.setScope(q('#ffHeadZone').value,e.target.value);home();};
   q('#ffHeadRefresh').onclick=home;
   qa('[data-head-page]').forEach(b=>b.onclick=()=>ctx.go(b.dataset.headPage));
   try{const rows=await rpc('head_office_activity');const el=q('#ffHeadActivity');if(el)el.innerHTML=(rows||[]).filter(r=>(ctx.scope().zone==='ALL'||r.actor_zone===ctx.scope().zone)&&(ctx.scope().staff==='ALL'||r.actor===ctx.scope().staff)).slice(0,30).map(r=>`<div class="row"><div><b>${E(r.actor_name||r.actor||'System')}</b><p>${E(r.operation)} · ${E(r.table_name.replace(/^ffh_/,''))} · ${E(r.actor_zone||'')}</p><small>${E(new Date(r.occurred_at).toLocaleString('en-MY',{timeZone:'Asia/Kuala_Lumpur'}))}</small></div></div>`).join('')||'No recent work activity in this scope.';}catch(e){const el=q('#ffHeadActivity');if(el)el.textContent='Activity could not load: '+e.message;}
  }catch(e){ctx.shell(ctx.back('HEAD OFFICE')+`<div class="card"><p role="alert">${E(e.message)}</p><button class="primary" id="ffHeadRetry">RETRY CONNECTION</button></div>`);ctx.bindBack();q('#ffHeadRetry').onclick=home;}
 }
 return {home};
};
