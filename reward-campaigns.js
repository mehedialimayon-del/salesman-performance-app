window.FFH_CREATE_REWARD_CAMPAIGNS=function(ctx){'use strict';
const E=ctx.esc,C=window.FFH_DAILY_CORE,$=s=>document.querySelector(s),people=()=>ctx.people().filter(p=>p.active!==false),name=id=>people().find(p=>p.id===id)?.name||id,offers=()=>ctx.db.incentives||[],may=()=>ctx.may('income'),status=x=>window.FFH_EARNINGS_CORE.offerStatus(x,ctx.today());let chosen=null,recipient=null;
const lastFilters=new Map();
const productRule=g=>['single','combo'].includes(g.mode)&&g.skus?.length;
const money=n=>'RM '+(Number(n)||0).toLocaleString('en-MY',{maximumFractionDigits:2});
const unit=g=>g.mode==='sales'?'RM':g.mode==='orders'?'POs':g.mode==='outlets'?'outlets':'Ctn';
const isRate=g=>g.payout==='per-carton'&&['single','combo','qty'].includes(g.mode);
const rewardLabel=g=>money(g.reward)+(isRate(g)?' / Ctn':' when target is met');
const safeImage=url=>/^https:\/\//i.test(url||'')?`<img src="${E(url)}" alt="Campaign cover">`:'';
const recordZone=person=>person.zone||person.zone_id;
function visibleStaff(viewer){
 const directory=people(),manager=viewer.mode==='MANAGER';
 const staff=manager?directory.filter(p=>p.id===viewer.id||viewer.ownerAccess||viewer.accessAll||
   viewer.accessibleZones?.includes('*')||!viewer.zone||recordZone(p)===viewer.zone||
   viewer.accessibleZones?.includes(recordZone(p))):directory.filter(p=>p.id===viewer.id);
 if(!staff.some(p=>p.id===viewer.id))staff.push(viewer);
 return staff;
}
let selectedMonth='';
async function refresh(){await Promise.all([ctx.earnings.refresh(),ctx.daily.refresh(),ctx.refreshPeople?.()]);}
async function open(){
 ctx.setPage('incentive');
 ctx.shell(ctx.back('Incentives')+'<div class="card" role="status">Loading assigned incentive campaigns…</div>');ctx.bindBack();
 const viewer=ctx.user()?.id;
 try{await refresh();if(ctx.user()?.id===viewer&&(!ctx.page||ctx.page()==='incentive'))list();}
 catch(e){if(ctx.user()?.id===viewer&&(!ctx.page||ctx.page()==='incentive')){ctx.shell(ctx.back('Incentives')+'<div class="card" role="alert">'+E(e.message)+'</div>');ctx.bindBack();}}
}
function list(){
 chosen=null;
 ctx.setPage('incentive');
 const viewer=ctx.user(), directory=people(), manager=viewer.mode==='MANAGER';
 const scope=visibleStaff(viewer);
 const zones=[...new Set(scope.map(recordZone).filter(Boolean))].sort();
 const filters=lastFilters.get(viewer.id)||{month:ctx.today().slice(0,7),zone:manager?(viewer.zone||''):(viewer.zone||''),staff:'',scheme:'',search:'',view:'product'};
 if(filters.zone&&!zones.includes(filters.zone))filters.zone='';
 lastFilters.set(viewer.id,filters);
 const button=(attrs,label)=>`<button type="button" class="ffRefButton" ${attrs}>${label}</button>`;
 const select=(id,label)=>`<label><span>${label}<select id="${id}" data-ff-picker="native"></select></span></label>`;
 const opts=(values,all)=>'<option value="">'+E(all)+'</option>'+values.map(([value,label])=>`<option value="${E(value)}">${E(label)}</option>`).join('');
 const zoneName=z=>z==='PRIMARY'?'KL Zone':z;
 ctx.shell(ctx.back('Incentives')+`<section class="ffRewardDetail ffIncentiveArtwork" aria-label="Incentives">
   <div class="ffRefPanel ffRefFields ffIncFilters">
    <label><span>Month<input id="ffRewardMonth" type="month" value="${E(filters.month)}"></span></label>
    ${select('ffRewardZone','Zone')}${select('ffRewardStaff','Sales Representative')}${select('ffRewardProduct','Product / Scheme')}
   </div>
   <div class="ffRefReportKpis ffIncMetrics">
    ${[['◎','SR Target','green'],['▥','Total Sales','gold'],['%','Achievement','blue'],['◆','Total Incentive','red']].map(([icon,label,color])=>
    `<div class="ffRefMetric" data-color="${color}"><i aria-hidden="true">${icon}</i><span>${label}</span><strong class="ffIncMetric"></strong></div>`).join('')}
   </div>
   <div class="ffRefExports ffIncTabs">
    ${button('data-reward-view="staff"','SR Incentive')}${button('data-reward-view="product"','Product Incentive')}${button('data-reward-view="rules"','Scheme &amp; Rules')}
   </div>
   <label class="ffRefSearch"><i aria-hidden="true">⌕</i><input id="ffRewardSearch" type="search" aria-label="Search product, SKU or category" placeholder="Search product (SKU / name / category)…" value="${E(filters.search)}"></label>
   <section class="ffRefPanel ffIncListing">
    <header><h2><span id="ffRewardViewTitle">Product-wise Incentive Scheme</span> <small id="ffRewardHeading" aria-live="polite"></small></h2>
     ${may()?button('id="ffRewardCreate"','＋ Add Scheme'):''}</header>
    <div id="ffRewardRows" class="ffIncRows" tabindex="0" aria-label="Incentive schemes"></div>
   </section>
   <div class="ffIncSummaries">
    <section class="ffRefPanel"><h2>Product Incentive Summary</h2><dl id="ffRewardSummary" class="ffIncSummary"></dl></section>
    <section class="ffRefPanel"><h2>Top Incentive Products</h2><ol id="ffRewardTop" class="ffIncTop"></ol></section>
   </div>
   <footer class="ffRefExports">
    ${button('data-reward-export="xlsx" data-color="green"','Download Excel')}${button('data-reward-export="pdf" data-color="blue"','Download PDF')}${button('id="ffRewardHistory"','Incentive History')}
   </footer>
   <p id="ffRewardFeedback" class="ffIncNotice" role="status"></p>
 </section>`);
 ctx.bindBack();
 const month=$('#ffRewardMonth'),zone=$('#ffRewardZone'),staff=$('#ffRewardStaff'),scheme=$('#ffRewardProduct'),search=$('#ffRewardSearch');
 zone.innerHTML=opts(zones.map(z=>[z,zoneName(z)]),'All permitted zones');
 zone.value=filters.zone;
 zone.disabled=!manager;staff.disabled=!manager;
 const inZone=()=>scope.filter(p=>!zone.value||recordZone(p)===zone.value);
 const selectedStaff=()=>inZone().filter(p=>!staff.value||p.id===staff.value);
 let catalogue=ctx.productList?.()||[];
 const productInfo=sku=>catalogue.find(p=>[p.name,p.itemCode,p.sku].includes(sku));
 function fillStaff(){
   staff.innerHTML=opts(inZone().map(p=>[p.id,p.id===viewer.id&&p.can_manage&&p.can_sell?p.name+' · My Route':p.name]),'Combined / All SRs');
   if(inZone().some(p=>p.id===filters.staff))staff.value=filters.staff;
 }
 function eligible(includeAllMonths=false){
   return offers().filter(x=>(includeAllMonths||!month.value||(!x.startDate||x.startDate.slice(0,7)<=month.value)&&(!x.endDate||x.endDate.slice(0,7)>=month.value))&&
     selectedStaff().some(p=>C.audience(x,p.id,directory)));
 }
 function fillSchemes(){
   const values=eligible(),skus=[...new Set(values.flatMap(x=>(x.groups||[]).filter(productRule).flatMap(g=>g.skus)))].sort();
   scheme.innerHTML=opts([...values.map(x=>['offer:'+x.id,x.name]),...skus.map(s=>['sku:'+s,s]),...['Active','Upcoming','Expired','Inactive'].map(s=>['status:'+s,s+' schemes'])],'All products');
   if([...scheme.options].some(o=>o.value===filters.scheme))scheme.value=filters.scheme;
 }
 function model(){
   const selected=selectedStaff(),value=scheme.value,term=search.value.trim().toLowerCase();
   const currentMonth=month.value||ctx.today().slice(0,7),first=currentMonth+'-01';
   selectedMonth=currentMonth;
   const [y,m]=currentMonth.split('-').map(Number),last=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
   const salesIds=selected.filter(p=>C.seller(p)).map(p=>p.id);
   const target=salesIds.reduce((n,id)=>n+(Number(ctx.target?.(id,currentMonth)??ctx.db.targets?.[currentMonth]?.[id]??selected.find(p=>p.id===id)?.target)||0),0);
   const sales=ctx.daily.summary?.(salesIds,first,last)?.delivered||0;
   const rows=[];
   for(const x of eligible())for(const g of x.groups||[]){
     if(filters.view==='product'&&!productRule(g)||filters.view==='staff'&&productRule(g))continue;
     if(value.startsWith('offer:')&&value!=='offer:'+x.id||value.startsWith('sku:')&&!g.skus?.includes(value.slice(4))||value.startsWith('status:')&&value.slice(7)!==status(x))continue;
     const keywords=(g.skus||[]).flatMap(s=>{const p=productInfo(s);return [s,p?.itemCode,p?.name,p?.category,p?.subcategory];});
     if(![x.name,x.description,g.name,...keywords].join(' ').toLowerCase().includes(term))continue;
     const recipients=selected.filter(p=>C.audience(x,p.id,directory)),single={...x,groups:[g]};
     const earned=recipients.reduce((n,p)=>n+ctx.daily.rewards([single],p.id,currentMonth).reduce((v,r)=>v+r.amount,0),0);
     const reportingWindow={...x,startDate:x.startDate>first?x.startDate:first,endDate:x.endDate<last?x.endDate:last};
     const got=recipients.reduce((n,p)=>n+ctx.daily.progress(reportingWindow,g,p.id),0);
     rows.push({x,g,earned,got,goal:(+g.target||0)*recipients.length,label:g.name||x.name,sku:(g.skus||[]).map(s=>productInfo(s)?.itemCode||s).join(' + ')});
   }
   const productRows=rows.filter(r=>productRule(r.g));
   const earned=rows.reduce((n,r)=>n+r.earned,0);
   return {target,sales,earned,rows,productRows};
 }
 function render(){
   const {target,sales,earned,rows,productRows}=model();
   const stat=(x,total)=>total>0?(100*x/total).toFixed(1)+'%':'—';
   const amount=n=>C.round(n).toLocaleString('en-MY');
   const sum=(rr,key)=>rr.reduce((n,r)=>n+r[key],0);
   document.querySelectorAll('.ffIncMetric').forEach((el,i)=>{el.textContent=[money(target),money(sales),stat(sales,target),money(earned)][i];});
   $('#ffRewardViewTitle').textContent={staff:'SR Incentive',product:'Product-wise Incentive Scheme',rules:'Scheme & Rules'}[filters.view];
   $('#ffRewardHeading').textContent='('+rows.length+')';
   $('#ffRewardRows').innerHTML=rows.map(({x,g,label,sku,earned,got,goal})=>`<button type="button" class="ffIncRow ffRewardCover" data-reward="${E(x.id)}">
     <span class="ffIncCover">${safeImage(x.image)||'<small>No cover photo</small>'}</span>
     <span><b>${E(label)}</b>
     <small title="${E(sku)}">SKU: ${E(sku||'All products')}</small><small>◎ Target: ${amount(goal)} ${unit(g)}</small>
     <small>◈ Incentive: ${E(rewardLabel(g))}</small><small>▣ ${E(x.startDate)} – ${E(x.endDate)}</small>
     ${filters.view==='rules'?`<small>${E(status(x))} · ${g.basis==='order'?'Order-based':'Confirmed delivery'} · ${g.period==='daily'?'Daily':'Date range'}</small>`:''}</span>
     <span class="ffIncFigures"><small>Sales<br><b>${amount(got)} ${unit(g)}</b></small><small>Incentive<br><b>${money(earned)}</b></small></span><span class="ffIncArrow">›</span></button>`).join('')||'<p class="ffIncEmpty">No assigned schemes match these filters.</p>';
   const goals=sum(productRows,'goal'),cartons=sum(productRows,'got');
   const products=new Set(productRows.flatMap(r=>r.g.skus));
   $('#ffRewardSummary').innerHTML=[
     ['Total Products',products.size],['Total Target',amount(goals)+' Ctn'],['Total Sales',amount(cartons)+' Ctn'],
     ['Achievement',stat(cartons,goals)],['Total Incentive',money(sum(productRows,'earned'))]
   ].map(([label,value])=>`<div><dt>${label}</dt><dd>${E(value)}</dd></div>`).join('');
   $('#ffRewardTop').innerHTML=productRows.filter(r=>r.earned>0).sort((a,b)=>b.earned-a.earned).slice(0,3).map(r=>
     `<li><span title="${E(r.label)}">${E(r.label)}</span><strong>${money(r.earned)}</strong></li>`).join('')||'<li>No earned product incentives</li>';
   document.querySelectorAll('[data-reward]').forEach(button=>button.onclick=()=>{chosen=button.dataset.reward;recipient=staff.value||null;detail();});
 }
 const refreshFilters=()=>{fillStaff();fillSchemes();render();};
 zone.onchange=()=>{filters.zone=zone.value;filters.staff='';filters.scheme='';refreshFilters();};
 month.onchange=()=>{filters.month=month.value;fillSchemes();render();};
 staff.onchange=()=>{filters.staff=staff.value;filters.scheme='';fillSchemes();render();};
 scheme.onchange=()=>{filters.scheme=scheme.value;render();};
 search.oninput=()=>{filters.search=search.value;render();};
 const tabs=[...document.querySelectorAll('[data-reward-view]')];
 const mark=()=>tabs.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rewardView===filters.view)));
 tabs.forEach(button=>button.onclick=()=>{filters.view=button.dataset.rewardView;mark();render();});
 $('#ffRewardCreate')?.addEventListener('click',()=>editor());
 $('#ffRewardHistory').onclick=()=>{
   const dialog=document.createElement('dialog');dialog.className='ffIncHistory';
   dialog.setAttribute('aria-label','Incentive History');
   dialog.innerHTML='<h2>Incentive History</h2><button type="button" data-close>Close</button><p>Campaign dates, status and version</p>'+
      eligible(true).sort((a,b)=>String(b.startDate).localeCompare(String(a.startDate))).map(x=>`<p><button type="button" data-history-offer="${E(x.id)}">${E(x.name)}</button> · ${E(status(x))} · ${E(x.startDate)} – ${E(x.endDate)} · v${E(x.version||1)}</p>`).join('');
   dialog.querySelector('[data-close]').onclick=()=>dialog.close();
   dialog.querySelectorAll('[data-history-offer]').forEach(b=>b.onclick=()=>{chosen=b.dataset.historyOffer;recipient=staff.value||null;dialog.close();detail();});
   dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.querySelector('main').append(dialog);dialog.showModal();
 };
 document.querySelectorAll('[data-reward-export]').forEach(button=>button.onclick=()=>{
   const {rows}=model(),data=[['Campaign','Scheme','SKU / Combo','Target','Progress','Unit','Payout rule','Earned (RM)'],
       ...rows.map(({x,g,sku,goal,got,earned})=>[x.name,g.name,sku,goal,got,unit(g),rewardLabel(g),earned])];
   ctx.exportFile?.(button,'Incentives '+(month.value||ctx.today().slice(0,7)),data,$('#ffRewardFeedback'));
 });
 mark();refreshFilters();
}
function pendingHtml(x,id){const data=ctx.daily.data(),ids=C.teamIds(x,id,data),selection=C.selected(data,ids,x.audience?.kind==='team'),controls=new Set(selection.controls.map(r=>r.zone_id+'|'+r.sale_date)),records=[...selection.staff.filter(r=>!controls.has(r.zone_id+'|'+r.sale_date)),...selection.controls].filter(r=>r.sale_date>=x.startDate&&r.sale_date<=x.endDate),skus=new Set((x.groups||[]).flatMap(g=>g.skus||[])),rows=[];for(const r of records)for(const p of r.product_lines||[]){if(skus.size&&!skus.has(p.sku))continue;for(const o of p.outlets?.length?p.outlets:[p])rows.push([r.sale_date,r.staff_id?name(r.staff_id):r.zone_id,o.outlet_name||'Daily total',p.sku,C.num(o.order_qty),C.num(o.delivered_qty),Math.max(0,C.round(o.order_qty-o.delivered_qty)),r.delivery_completed?'Completed':C.num(o.delivered_qty)>0?'Part delivered':'Pending']);}const table=(heads,rows)=>'<div class="ffDailyTable"><table><thead><tr>'+heads.map(h=>'<th>'+E(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+E(v)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';return `<section class="ffDaily"><h3>Orders &amp; delivery by date / outlet</h3><p class="ffDailySmall">Ordered cartons remain pending. Only actual confirmed delivery contributes to delivery-based incentives. Confirm quantities in Daily Sales → Delivery follow-up.</p>${rows.length?table(['Order date','SR / Zone','Outlet','SKU','Ordered CTN','Delivered CTN','Unfulfilled CTN','Status'],rows):'<p class="ffDailySmall">No incentive SKU orders recorded in this campaign’s dates.</p>'}${(x.groups||[]).some(g=>!['single','combo'].includes(g.mode))?table(['Order date','SR / Zone','Ordered RM','Delivered RM','Status'],records.map(r=>[r.sale_date,r.staff_id?name(r.staff_id):r.zone_id,C.num(r.order_amount),C.num(r.delivered_amount),r.delivery_completed?'Completed':'Pending / part delivered'])):''}</section>`;}
function expiredRequest(x,index){
 const viewer=ctx.user()?.id,rule=x.groups[index];
 const popup=document.createElement('div');
 popup.className='globalSearchOverlay ffInsetDialog';
 popup.innerHTML=`<section class="globalSearchBox" role="dialog" aria-modal="true" aria-label="Expired incentive request">
  <div class="row"><h2>Request expired incentive</h2><button type="button" class="secondary" data-close>Close</button></div>
  <p>${E(x.name)} · ${E(rule.name||'Campaign rule')} · ${money(rule.reward)}</p>
  <form class="form"><label>Reason and delivery reference<textarea name="reason" required maxlength="1000"></textarea></label>
  <button type="submit" class="primary">Send to Approval Inbox</button><p role="status"></p></form></section>`;
 document.body.append(popup);
 const close=window.FFH_OVERLAY?.(popup,()=>popup.remove())||(()=>popup.remove());
 popup.querySelector('[data-close]').onclick=close;
 const form=popup.querySelector('form'),status=popup.querySelector('[role=status]');
 form.onsubmit=async event=>{
  event.preventDefault();
  if(ctx.user()?.id!==viewer)return;
  const button=event.submitter;button.disabled=true;
  try{
   const {error}=await ctx.sb.rpc('ffh_request_expired_incentive',{offer_id:x.id,rule_index:index,request_reason:form.elements.reason.value.trim()});
   if(error)throw Error(error.message);
   if(ctx.user()?.id===viewer&&popup.isConnected)status.textContent='Pending review. Check Approval Inbox for the decision.';
  }catch(error){status.textContent=error.message;button.disabled=false;}
 };
}
function detail(){const x=offers().find(x=>x.id===chosen);if(!x)return list();const recipients=visibleStaff(ctx.user()).filter(p=>C.audience(x,p.id,people()));if(!recipients.some(p=>p.id===recipient))recipient=recipients.find(p=>p.id===ctx.user().id)?.id||recipients[0]?.id;if(!recipient)return list();const month=selectedMonth||ctx.today().slice(0,7),earned=ctx.daily.rewards([x],recipient,month).reduce((n,r)=>n+r.amount,0);
ctx.shell(ctx.back('Incentive Details')+`<section class="ffRewardDetail"><div class="card">${safeImage(x.image)}<h2>${E(x.name)}</h2><p>${E(status(x))} · ${E(x.startDate)} → ${E(x.endDate)}</p><p style="white-space:pre-wrap">${E(x.description||'')}</p><p class="ffDailySmall">${x.audience?.kind==='team'?'Manager progress combines the permitted SR routes. A zone total replaces the SR sum for that day.':'This incentive belongs to each assigned SR separately.'}</p><label>Progress for<select id="ffRewardRecipient">${recipients.map(p=>`<option value="${E(p.id)}" ${recipient===p.id?'selected':''}>${E(p.name)} · ${E(p.id)}</option>`).join('')}</select></label><p><b class="green">Earned this month: RM ${earned.toFixed(2)}</b></p>${(x.groups||[]).map((g,index)=>{const got=ctx.daily.progress({...x,progressDay:g.period==='daily'&&status(x)==='Active'?ctx.today():undefined},g,recipient),target=+g.target||0,unit=g.mode==='sales'?'RM':g.mode==='orders'?'POs':g.mode==='outlets'?'outlets':'cartons';return `<div class="incGroup"><b>${E(g.name||'Incentive target')}</b><p>${g.basis==='order'?'KEYED SALES':'CONFIRMED DELIVERY'} · ${g.period==='daily'?'EACH DAY':'WHOLE DATE RANGE'}</p><p>${(g.skus||[]).map(E).join(' + ')||'All products'}</p><div class="row"><span>Achieved</span><strong>${C.round(got)} / ${target} ${unit}</strong></div><div class="progress"><span style="width:${Math.max(0,Math.min(100,got/target*100))}%"></span></div><div class="row"><span>Remaining</span><b>${Math.max(0,C.round(target-got))} ${unit}</b></div><div class="row"><span>Payout</span><b class="green">${E(rewardLabel(g))}</b></div><p class="ffDailySmall">${g.period==='daily'&&status(x)==='Active'?'Today’s progress. ':''}Entries received after expiry do not earn this reward. Late delivery qualifies only if its delivery time is inside this campaign’s dates.</p>${x.cloud&&status(x)==='Expired'&&recipient===ctx.user().id&&(!g.period||g.period==='window')&&!isRate(g)&&got<target?`<button type="button" class="secondary" data-expired-rule="${index}">Request expired incentive</button>`:''}</div>`;}).join('')}${pendingHtml(x,recipient)}<button class="secondary" id="ffRewardBack">ALL CAMPAIGNS</button>${may()?'<button class="secondary" id="ffRewardEdit">EDIT CAMPAIGN</button>':''}</div></section>`);ctx.bindBack();$('#ffRewardRecipient').onchange=e=>{recipient=e.target.value;detail();};$('#ffRewardBack').onclick=list;document.querySelectorAll('[data-expired-rule]').forEach(button=>button.onclick=()=>expiredRequest(x,Number(button.dataset.expiredRule)));if($('#ffRewardEdit'))$('#ffRewardEdit').onclick=()=>editor(x);}
function editor(old){if(!may())return;const a=old?.audience||{kind:'staff',staff_ids:old?.sr&&old.sr!=='ALL'?[old.sr]:'ALL',zone_ids:'ALL'},zs=[...new Set(visibleStaff(ctx.user()).map(recordZone).filter(Boolean))].sort(),skus=ctx.catalogue();ctx.shell(ctx.back(old?'Edit Incentive Campaign':'New Incentive Campaign')+`<section class="ffDaily ffIncEditor"><div class="card"><form class="form" id="ffRewardEditor"><label>Campaign / package name<input name="title" value="${E(old?.name||'')}" required></label><label>Campaign details<textarea name="description" maxlength="10000">${E(old?.description||'')}</textarea></label><label>Cover photo<input name="poster" type="file" accept="image/*" data-ff-original-image="1"></label><figure id="ffRewardPosterPreview" aria-label="Cover preview">${safeImage(old?.image)}</figure><div class="two"><label>Start date<input name="start_date" type="date" value="${old?.startDate||ctx.today()}" required></label><label>End date<input name="end_date" type="date" value="${old?.endDate||ctx.today()}" required></label></div><label>Target belongs to<select name="kind" id="ffRewardKind"><option value="staff" ${a.kind==='staff'?'selected':''}>Each assigned SR · own achievement</option><option value="team" ${a.kind==='team'?'selected':''}>Assigned manager · combined team achievement</option></select></label><label>Zones<select name="zones" multiple size="4"><option value="ALL" ${a.zone_ids==='ALL'?'selected':''}>All permitted zones · includes future SRs</option>${zs.map(z=>`<option value="${E(z)}" ${a.zone_ids?.includes?.(z)?'selected':''}>${E(z)}</option>`).join('')}</select></label><label>Assign to<select name="recipients" id="ffRewardRecipients" multiple size="5"></select></label><p class="ffDailySmall">Choose ALL for current and future people in the selected role/zones. Choose individual IDs for a personal offer. Create separate SR and manager campaigns when their targets or rewards differ.</p><div id="ffRewardGroups"></div><button class="secondary" type="button" id="ffRewardAddGroup">+ ADD SKU / COMBINED PACKAGE / SALES RULE</button><button class="primary" id="ffRewardPublish">SAVE CAMPAIGN TO CLOUD</button><button class="secondary" type="button" id="ffRewardCancel">CANCEL</button><p role="status" id="ffRewardStatus"></p></form></div></section>`);ctx.bindBack();
const posterInput=$('#ffRewardEditor [name=poster]'),preview=$('#ffRewardPosterPreview');
let previewUrl='';
posterInput.onchange=()=>{
 if(previewUrl)URL.revokeObjectURL(previewUrl);
 const file=posterInput.files[0];
 preview.innerHTML=safeImage(old?.image);
 if(!file||!file.type.startsWith('image/'))return;
 previewUrl=URL.createObjectURL(file);
 const image=document.createElement('img');image.src=previewUrl;image.alt='Selected campaign cover';preview.replaceChildren(image);
};
let cleaned=false;const dispose=()=>{if(!cleaned&&previewUrl){URL.revokeObjectURL(previewUrl);cleaned=true;}};
const observer=new MutationObserver(()=>{if(!preview.isConnected){dispose();observer.disconnect();}});observer.observe(document.querySelector('#app')||document.body,{childList:true,subtree:true});
const fillRecipients=(kind,initial=false)=>{$('#ffRewardRecipients').innerHTML='<option value="ALL" '+((!initial||a.staff_ids==='ALL')?'selected':'')+'>ALL · includes future staff in this role</option>'+visibleStaff(ctx.user()).filter(p=>kind==='team'?p.can_manage:C.seller(p)).map(p=>`<option value="${E(p.id)}" ${initial&&Array.isArray(a.staff_ids)&&a.staff_ids.includes(p.id)?'selected':''}>${E(p.name)} · ${E(p.id)}</option>`).join('');};fillRecipients(a.kind,true);$('#ffRewardKind').onchange=e=>fillRecipients(e.target.value);
const add=g=>{const d=document.createElement('div');d.className='ffDailyLine ffRewardGroup';d.innerHTML=`<label>Rule / combined package name<input data-k="name" value="${E(g?.name||'')}" required></label><label>Measure<select data-k="mode">${[['sales','Sales amount RM'],['qty','All-product cartons'],['single','One SKU cartons'],['combo','Combined SKU cartons'],['orders','PO / order count'],['outlets','Delivered outlet coverage']].map(([v,l])=>`<option value="${v}" ${v===(g?.mode||'sales')?'selected':''}>${l}</option>`).join('')}</select></label><div class="two"><label>Count from<select data-k="basis"><option value="delivered" ${g?.basis!=='order'?'selected':''}>Confirmed delivery</option><option value="order" ${g?.basis==='order'?'selected':''}>Keyed orders</option></select></label><label>Reward period<select data-k="period"><option value="window" ${g?.period!=='daily'?'selected':''}>Once in the date range</option><option value="daily" ${g?.period==='daily'?'selected':''}>Once for each qualifying day</option></select></label></div><label>Catalogue SKUs<select data-k="skus" multiple size="7">${[...new Set([...skus,...(g?.skus||[])])].map(s=>`<option value="${E(s)}" ${g?.skus?.includes(s)?'selected':''}>${E(s)}</option>`).join('')}</select></label><label>Payout type<select data-k="payout"><option value="fixed">Fixed reward at target</option><option value="per-carton" ${isRate(g||{})?'selected':''}>RM per qualifying carton</option></select></label><div class="two"><label>Target RM / cartons / count<input data-k="target" type="number" min=".01" step=".01" value="${g?.target||''}" required></label><label>Reward amount / rate (RM)<input data-k="reward" type="number" min=".01" step=".01" value="${g?.reward||''}" required></label></div><button class="secondary" type="button">REMOVE RULE</button>`;const select=d.querySelector('[data-k=mode]'),payout=d.querySelector('[data-k=payout]'),skuSelect=d.querySelector('[data-k=skus]'),apply=()=>{
 skuSelect.disabled=!['single','combo'].includes(select.value);const rate=['single','combo','qty'].includes(select.value);
 payout.options[1].disabled=!rate;if(!rate)payout.value='fixed';
 if(skuSelect.nextElementSibling?.matches('.ffSelectTrigger'))skuSelect.nextElementSibling.disabled=skuSelect.disabled;
 };select.onchange=apply;apply();d.querySelector('button').onclick=()=>d.remove();$('#ffRewardGroups').append(d);window.FFH_STYLE_MULTI_SELECT?.(skuSelect,{title:'Search and select catalogue SKUs'});
 apply();};(old?.groups?.length?old.groups:[null]).forEach(add);$('#ffRewardAddGroup').onclick=()=>add();$('#ffRewardCancel').onclick=old?detail:list;
$('#ffRewardEditor').onsubmit=async e=>{e.preventDefault();const button=$('#ffRewardPublish');button.disabled=true;try{const f=new FormData(e.target),multi=key=>[...e.target.elements[key].selectedOptions].map(o=>o.value),recipients=multi('recipients'),zones=multi('zones'),groups=[...document.querySelectorAll('.ffRewardGroup')].map(d=>{const v=k=>d.querySelector('[data-k='+k+']').value,mode=v('mode'),skus=[...d.querySelector('[data-k=skus]').selectedOptions].map(o=>o.value);if(mode==='single'&&skus.length!==1)throw Error('Choose exactly one SKU');if(mode==='combo'&&skus.length<2)throw Error('Choose at least two combined SKUs');return{name:v('name').trim(),mode,basis:v('basis'),period:v('period'),payout:v('payout'),skus:['single','combo'].includes(mode)?skus:[],target:+v('target'),reward:+v('reward')};});if(!groups.length)throw Error('Add at least one incentive rule');if(!recipients.length||!zones.length)throw Error('Choose recipients and zones');if(f.get('start_date')>f.get('end_date'))throw Error('End date must be after start date');let poster=old?.image||'';const file=f.get('poster');if(file?.size){if(!file.type.startsWith('image/'))throw Error('Choose an image file.');poster=await ctx.upload(file,'incentives/'+ctx.user().id);}const payload={id:old?.id||null,expected_version:old?.version||0,title:String(f.get('title')).trim(),description:String(f.get('description')||''),start_date:f.get('start_date'),end_date:f.get('end_date'),poster_url:poster,audience:{kind:f.get('kind'),staff_ids:recipients.includes('ALL')?'ALL':recipients,zone_ids:zones.includes('ALL')?'ALL':zones},groups};const {data,error}=await ctx.sb.rpc('ffh_reward_campaign',{action:'save',payload});if(error)throw error;await refresh();chosen=data.id;detail();}catch(err){$('#ffRewardStatus').textContent=err.message;}finally{if(button.isConnected)button.disabled=false;}};}
return {open,refresh};
};
