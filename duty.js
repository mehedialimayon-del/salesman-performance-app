/* Work-hours location and private live communication; authorization is enforced in cloud. */
window.FFH_CREATE_DUTY=function(ctx){
'use strict';
const sb=window.FFH_SUPABASE,core=window.FFH_DUTY_CORE;
let closeFullMap=null, refreshTeamMap=null;
let state=null,people=[],channel=null,watch=null,watchSession=null,lastSent=0,map=null,mapLayer=null,peer=null,messages=[],generation=0,poll=null,lastUnread=0;
const $=s=>document.querySelector(s),E=ctx.esc,user=()=>ctx.user(),date=()=>ctx.today(),page=()=>ctx.page(),native=()=>window.FieldForceNative||null;
async function rpc(action,payload={}){const {data,error}=await sb.rpc('ffh_duty',{action,payload});if(error)throw Error(error.message);return data;}
const active=()=>state?.attendance&&!state.attendance.check_out&&Date.parse(state.attendance.shift_end)>Date.now();
const error=err=>{const el=$('#ffDutyStatus')||$('#ffChatStatus');if(el)el.textContent=err.message||String(err);else alert(err.message||String(err));};
async function refresh(){if(!user())return;const next=await rpc('state');const changed=state?.can_track!==next.can_track;state=next;if(!active())stopWeb();if(changed&&page()==='home')ctx.home();if(page()==='home')updateHome();}
function updateHome(){const b=$('[data-page="tracking"]');if(b)b.hidden=!state?.can_track;const a=$('[data-page="attendance"] small');const chat=$('[data-page="communication"] small');if(chat)chat.textContent=lastUnread?lastUnread+' unread messages':'Private staff messages';const tile=$('[data-page="communication"]');if(tile){tile.querySelectorAll('.ffChatUnreadBadge').forEach(x=>x.remove());if(lastUnread)tile.insertAdjacentHTML('beforeend','<span class="moduleBadge ffChatUnreadBadge">'+lastUnread+'</span>');}const attendanceTile=$('[data-page="attendance"]');if(attendanceTile){attendanceTile.querySelectorAll('.ffAttendancePendingBadge').forEach(x=>x.remove());if(state&&!state.attendance)attendanceTile.insertAdjacentHTML('beforeend','<span class="ffStatusBadge ffStatusWarn ffAttendancePendingBadge">!</span>');}if(a)a.textContent=state?.attendance?'Checked in '+new Date(state.attendance.check_in).toLocaleTimeString('en-MY',{hour:'2-digit',minute:'2-digit'}):'Required before work';}
async function init(){await shutdown();await refresh();people=await rpc('directory');channel=sb.channel('ffh-duty-'+user().id)
 .on('postgres_changes',{event:'*',schema:'public',table:'ffh_live_messages'},()=>loadMessages().catch(error))
 .on('postgres_changes',{event:'*',schema:'public',table:'ffh_attendance'},()=>refresh().catch(error))
 .on('postgres_changes',{event:'*',schema:'public',table:'ffh_location_points'},()=>{if(page()==='tracking')loadMap().catch(error)})
 .on('postgres_changes',{event:'*',schema:'public',table:'ffh_duty_settings'},()=>refresh().catch(error))
 .on('postgres_changes',{event:'*',schema:'public',table:'ffh_tracking_grants'},()=>refresh().catch(error)).subscribe();
 poll=setInterval(()=>{if(!user()||document.hidden)return;refresh().catch(console.warn);if(page()==='communication')loadMessages().catch(console.warn);if(page()==='tracking')loadMap().catch(console.warn)},15000);
 // A native identity is validated against Supabase before binding push.
 await syncNativeIdentity();if(active())await startTracking();await loadMessages(false);
}
async function syncNativeIdentity(){if(!native()||!user())return;const {data}=await sb.auth.getSession();if(data?.session)native().bindIdentity(JSON.stringify({access_token:data.session.access_token,refresh_token:data.session.refresh_token}));}
async function shutdown(){await stopLiveShare().catch(console.warn);chatMedia?.shutdown();generation++;stopWeb();if(poll)clearInterval(poll);poll=null;if(channel)await sb.removeChannel(channel);channel=null;disposeMap();state=null;people=[];peer=null;messages=[];lastUnread=0;}
function stopWeb(){if(watch!==null)navigator.geolocation.clearWatch(watch);watch=null;watchSession=null;}
function fix(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(Error('GPS is unavailable'));navigator.geolocation.getCurrentPosition(p=>{if(p.coords.accuracy>100)return reject(Error('GPS accuracy is too low. Move near an open area and retry.'));resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy_m:p.coords.accuracy,captured_at:new Date(p.timestamp).toISOString(),speed_mps:p.coords.speed})},e=>reject(Error('Allow precise location and turn GPS on: '+e.message)),{enableHighAccuracy:true,maximumAge:0,timeout:25000});});}
function startWeb(){if(!active()||native())return;if(watchSession===state.attendance.id)return;stopWeb();watchSession=state.attendance.id;const sid=watchSession;watch=navigator.geolocation.watchPosition(async p=>{if(!active()||watchSession!==sid){stopWeb();return;}if(Date.now()-lastSent<15000||p.coords.accuracy>100)return;lastSent=Date.now();try{await rpc('point',{attendance_id:sid,latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy_m:p.coords.accuracy,captured_at:new Date(p.timestamp).toISOString(),speed_mps:p.coords.speed,source:'web'})}catch(e){console.warn('Location upload:',e);}},e=>{console.warn('GPS stopped:',e);if($('#ffDutyStatus'))$('#ffDutyStatus').textContent='Location unavailable: '+e.message},{enableHighAccuracy:true,maximumAge:0,timeout:30000});}
async function startTracking(){if(!active())throw Error('Check in before starting duty tracking');if(native()){const {data,error}=await sb.auth.getSession();if(error||!data?.session)throw Error('Sign in again');native().startDuty(JSON.stringify({attendance_id:state.attendance.id,shift_end:state.attendance.shift_end,access_token:data.session.access_token,refresh_token:data.session.refresh_token}));}else startWeb();}
function gate(target){return !!(user()&&user().id!=='PERVES_HIRA'&&state?.settings?.attendance_required&&!state.attendance&&!['home','attendance','profile','notifications','login','contacts','contactEdit'].includes(target));}
const viewport=document.querySelector('meta[name="viewport"]');
const defaultViewport=viewport?.content;
const inDutyScreen=()=>!!$('.ffDutyScreen');
if(viewport&&$('#app')){
 new MutationObserver(()=>{
  const content=inDutyScreen()?defaultViewport+',maximum-scale=1,user-scalable=no':defaultViewport;
  if(viewport.content!==content)viewport.content=content;
 }).observe($('#app'),{childList:true});
}
for(const event of ['touchstart','touchmove']){
 document.addEventListener(event,e=>{if(inDutyScreen()&&e.touches.length>1)e.preventDefault();},{passive:false,capture:true});
}
function shell(title,html){ctx.setPage(title);ctx.shell((title==='communication'?ctx.back('Live Communication'):'')+html);ctx.bindBack();}
const mytTime=value=>value?new Date(value).toLocaleTimeString('en-MY',{timeZone:'Asia/Kuala_Lumpur',hour:'2-digit',minute:'2-digit'}):'—';
const staffZone=p=>p.zone_name||p.zone_id||'';
const dutyTiles=(items,attribute)=>items.map(([key,icon,label,mini,tone])=>`<button type="button" class="ffRefButton" data-color="${tone||'amber'}" ${attribute}="${key}"><i aria-hidden="true">${icon}</i><span>${label}</span>${mini?`<small>${mini}</small>`:''}</button>`).join('');
const dutyHeading=(icon,first,last)=>`<div class="ffDutyHeading"><i aria-hidden="true">${icon}</i><h1><b>${first}</b> ${last}</h1></div>`;
function dutyIdentity(){
 const me=user(), staff=people.find(person=>person.staff_id===me?.id);
 const name=staff?.full_name||me?.name||'';
 const zone=staff?staffZone(staff):me?.zone||'';
 const staffLine=[staff?.display_title||staff?.designation||me?.mode,me?.id,zone].filter(Boolean).join(' · ');
 const stamp=new Date(date()+'T12:00:00+08:00').toLocaleDateString('en-GB',{timeZone:'Asia/Kuala_Lumpur',weekday:'short',day:'numeric',month:'short',year:'numeric'});
 return `<section class="ffAttendanceIdentity"><span class="ffAttendancePortrait" data-ff-staff-avatar="${E(me?.id||'')}" aria-hidden="true">${E(name.trim().charAt(0)||'•')}</span><div><h2>${E(name)}</h2><p>${E(staffLine)}</p></div><time datetime="${E(date())}">${E(stamp)}</time></section>`;
}
function workHours(a){
 if(!a)return '—';
 const end=Math.min(Date.parse(a.check_out||a.shift_end),Date.now());
 const ongoing=a.break_started_at?Math.max(0,(end-Date.parse(a.break_started_at))/1000):0;
 const minutes=Math.floor(Math.max(0,(end-Date.parse(a.check_in))/1000-(a.break_seconds||0)-ongoing)/60);
 return Math.floor(minutes/60)+' h '+minutes%60+' m';
}
function renderAttendance(){
 disposeMap();
 const now=state?.attendance, onBreak=active()&&now?.break_started_at;
 const status=onBreak?'ON BREAK':active()?'DUTY ENGAGED':now?'DUTY ENDED':'AWAITING CHECK-IN';
 shell('attendance',`<div class="ffDutyScreen">${dutyHeading('☑','Attendance','')}${dutyIdentity()}
 <div class="card ffAttendanceToday" id="ffAttendanceToday">
  <h2><b>✓ Today’s Attendance</b> · আজকের উপস্থিতি</h2>
  <div class="ffDutyTodayGrid">
   <article class="ffRefMetric" ${now?'aria-label="Attendance already saved today"':''} data-color="${now?'green':'gold'}"><i aria-hidden="true">${now?'✓':'◷'}</i><strong>${now?'Attendance Saved':'Check-In Required'}</strong><small>${now?'আজকের উপস্থিতি নেওয়া হয়েছে':'আজকের উপস্থিতি দিন'}</small></article>
   <article><i aria-hidden="true">◷</i><span>Check-in</span><b>${E(mytTime(now?.check_in))}</b></article>
   <article><i aria-hidden="true">⚑</i><span>Work Hours</span><b>${E(workHours(now))}</b></article>
   <article><i aria-hidden="true">⌖</i><span>Location (GPS)</span><b>${now?.latitude!=null?'✓':'—'}</b></article>
  </div>
  <div class="ffDutyStatusRow"><span>▣ &nbsp; Status</span><b>${status}</b></div>
  <div class="ffDutyStatusRow"><span>⌖ &nbsp; GPS Tracking</span><b>${active()?(native()?'Work hours (Android)':'Work hours (browser)'):'Inactive'}</b></div>
  ${now?'':`<form class="form" id="ffAttendanceForm" hidden><label>Attendance photo (optional)<input type="file" name="photo" accept="image/*" capture="user"></label><label><input type="checkbox" name="consent" required ${localStorage.getItem('ffh_duty_consent_v1')==='accepted'?'checked':''}> Work-hours location tracking · stops at checkout</label><button class="primary ffAttendanceCheckIn" type="submit">Check in</button></form>`}
  <div id="ffDutyStatus" role="status" class="notice"></div>
 </div><div class="ffDutyShift ffDutyTiles">${dutyTiles([
  ['check-in','⇥','Check-In','প্রবেশ','green'],['check-out','⇤','Check-Out','প্রস্থান','gold'],
  ['break','♨','Break','বিরতি','blue'],['on-duty','⌖','On Duty','কাজে আছি','purple']
 ],'data-duty-shift')}</div></div>`);
 if($('#ffAttendanceForm'))$('#ffAttendanceForm').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{if(!e.target.elements.consent.checked)throw Error('Accept the work-hours tracking disclosure');$('#ffDutyStatus').textContent='Getting GPS…';const location=await fix();let photo_path=null;const file=e.target.elements.photo.files[0];if(file){const blob=await compress(file);photo_path=user().id+'/'+crypto.randomUUID()+'.jpg';const {error}=await sb.storage.from('ffh-attendance').upload(photo_path,blob,{contentType:'image/jpeg'});if(error)throw error;}localStorage.setItem('ffh_duty_consent_v1','accepted');await rpc('checkin',{...location,photo_path,consent_version:'duty-location-v1',tracking_mode:native()?'android':'web'});await refresh();await startTracking();renderAttendance();$('#ffDutyStatus').textContent='Attendance saved. Duty tracking requested.';}catch(err){error(err);button.disabled=false;}};
 document.querySelectorAll('[data-duty-shift]').forEach(button=>{
  const action=button.dataset.dutyShift;
  button.disabled=action==='check-in'?!!now:!active()||(action==='break'&&!!onBreak);
  button.onclick=async()=>{
   if(action==='check-in'){
    const form=$('#ffAttendanceForm');form.hidden=false;form.scrollIntoView?.({block:'nearest'});form.elements.consent.focus();return;
   }
   button.disabled=true;
   try{
    if(action==='check-out'){
     await rpc('checkout');stopWeb();native()?.stopDuty();
    }else if(action==='break'||onBreak){
     const {error:failure}=await sb.rpc('ffh_set_duty_break',{on_break:action==='break'});
     if(failure)throw failure;
    }else await startTracking();
    await refresh();if(page()==='attendance')renderAttendance();
   }catch(err){error(err);}
   finally{if(button.isConnected)button.disabled=false;}
  };
 });
 attendanceHistory();
 // The Home tile is near the bottom of a long page. Do not carry that
 // document scroll into Attendance and leave only History on screen.
 const todayCard=$('#ffAttendanceToday');
 const showToday=()=>{if(page()!=='attendance'||!todayCard?.isConnected)return;const wrap=todayCard.closest('.wrap');if(wrap)wrap.scrollTop=0;window.scrollTo({top:0,left:0,behavior:'instant'});};
 showToday();window.requestAnimationFrame(showToday);

}
let attendanceOwner='',attendanceMonth='',attendanceDay='',historyVersion=0;
function attendanceHistory(){
 const host=$('#ffDutyStatus')?.closest('.card'),sid=user()?.id;
 if(!host||!sid)return;
 if(attendanceOwner!==sid){attendanceOwner=sid;attendanceMonth=date().slice(0,7);attendanceDay='';}
 const owner=user().id==='M21954'||user().ownerAccess===true;
 const staffDirectory=people.filter(p=>p.active!==false);
 let directory=staffDirectory.filter(p=>p.staff_id===sid);
 const editor=owner?`<details class="ffAttendanceRoster"><summary>Shift / Leave Roster</summary><form class="form" id="ffRosterForm">
   <div class="two"><label>Staff<select name="staff_id" required>${[...new Map([{staff_id:sid,full_name:user().name},...staffDirectory].map(p=>[p.staff_id,p])).values()].map(p=>`<option value="${E(p.staff_id)}">${E(p.full_name||p.staff_id)}</option>`).join('')}</select></label>
   <label>Date<input type="date" name="duty_date" value="${E(date())}" required></label></div>
   <label>Day type<select name="day_type"><option>Working</option><option>Leave</option><option>Off</option></select></label>
   <div class="two" id="ffRosterTimes"><label>Shift starts (MYT)<input type="time" name="starts_at" required></label><label>Shift ends (MYT)<input type="time" name="ends_at" required></label></div>
   <button type="submit" class="primary">Save roster day</button><p role="status"></p></form></details>`:'';
 const box=document.createElement('section');box.className='card ffHistoryPanel ffRefAttendance';
 box.innerHTML=`<div class="cardTitle">This Month Summary · মাসিক সারাংশ</div><div class="two ffHistoryControls">
  <label>Month<input id="ffAttendanceMonth" type="month" value="${E(attendanceMonth)}"></label>
  <label>Date (optional)<input id="ffAttendanceDay" type="date" value="${E(attendanceDay)}"></label>
 <label>View<select id="ffAttendanceScope"><option value="own">My Attendance</option><option value="all">Combined · Permitted staff</option></select></label>
 <label hidden id="ffAttendanceStaffLabel">Staff<select id="ffAttendanceStaff"><option value="">All staff in selection</option></select></label>
  <div id="ffAttendanceTeamCards" class="ffAttendanceTeamCards"></div>
 </div><div class="ffAttendanceMetrics" aria-label="Attendance totals in selected period">
  <div data-tone="green"><span>Present</span><output id="ffAttendancePresent">—</output></div>
  <div data-tone="amber"><span>Late</span><output id="ffAttendanceLate">—</output></div>
  <div data-tone="red"><span>Absent</span><output id="ffAttendanceAbsent">—</output></div>
  <div data-tone="violet"><span>Leave</span><output id="ffAttendanceLeave">—</output></div>
  <div data-tone="blue"><span>Total Days</span><output id="ffAttendanceTotal">—</output></div>
 </div><div id="ffAttendanceHistory" class="ffHistoryScroll" tabindex="0" aria-label="Attendance history"></div>
 <button class="secondary" id="ffAttendanceMore" hidden>LOAD MORE HISTORY</button>
 <div class="ffRefExports ffAttendanceActions">
  <button type="button" class="ffRefButton" data-attendance-export="pdf">▤ Report</button>
  <button type="button" class="ffRefButton" data-attendance-export="xlsx">⇩ Export (Excel)</button>
  <button type="button" class="ffRefButton" id="ffAttendanceSummary">▥ Monthly Summary</button>
 </div><p id="ffAttendanceFeedback" role="status"></p>${editor}`;
 const screen=host.closest('.ffDutyScreen');
 screen.append(box);
 const extras=document.createElement('div');extras.className='ffDutyTiles ffDutyQuick';
 extras.innerHTML=dutyTiles([
  ['history','☷','Attendance History','উপস্থিতির ইতিহাস'],['leave','⊞','Leave Request','ছুটির আবেদন'],
  ['schedule','▦','My Schedule','আমার শিডিউল'],['team','♟','Team Attendance','টিমের উপস্থিতি'],
  ['locations','⌖','Location Log','অবস্থানের রেকর্ড'],['export','▤','Report & Export','রিপোর্ট (PDF/Excel)'],
  ['policy','◫','Policy & Rules','নীতি ও নির্দেশনা'],['settings','⚙','Settings','সেটিংস']
 ],'data-duty-open');
 box.querySelector('.ffAttendanceMetrics').after(extras);
 const details=document.createElement('div');details.className='ffDutyHistoryDetails';details.hidden=true;
 while(extras.nextSibling)details.append(extras.nextSibling);
 extras.after(details);
 let offset=0;const attendanceRows=[];
 const stamp=v=>v?new Date(v).toLocaleString('en-MY',{timeZone:'Asia/Kuala_Lumpur'}):'';
 const scope=box.querySelector('#ffAttendanceScope'), staffFilter=box.querySelector('#ffAttendanceStaff');
 const scopePeople=()=>directory.filter(p=>scope.value==='all'||staffZone(p)===scope.value);
 const matchStaff=id=>(!staffFilter.value||staffFilter.value===id)&&scopePeople().some(p=>p.staff_id===id);
 sb.rpc('ffh_attendance_team').then(({data})=>{
  if(!Array.isArray(data)||!scope.isConnected)return;
  directory=staffDirectory.filter(p=>data.includes(p.staff_id));
  scope.insertAdjacentHTML('beforeend',[...new Set(directory.map(staffZone).filter(Boolean))].sort().map(zone=>`<option value="${E(zone)}">${E(zone)}</option>`).join(''));
  if(scope.value!=='own')scope.onchange();
 });

 const periodEnd=month=>new Date(Date.UTC(+month.slice(0,4),+month.slice(5),0)).toISOString().slice(0,10);
 const merged=(rows,schedule)=>{
  const ids=new Set([...rows,...schedule].map(row=>row.staff_id||sid));
  return [...ids].flatMap(id=>core.attendanceDays(rows.filter(row=>(row.staff_id||sid)===id),
   schedule.filter(row=>(row.staff_id||sid)===id),new Date().toISOString()).map(row=>({...row,staff_id:id})))
   .sort((a,b)=>b.duty_date.localeCompare(a.duty_date)||a.staff_id.localeCompare(b.staff_id));
 };
 const records=async(month,day,start,size)=>{
  if(scope.value!=='own'){
   const out=[],requested={from_day:day||month+'-01',to_day:day||periodEnd(month)};
   const query=sb.rpc('ffh_attendance_summary',requested).order('duty_date',{ascending:false}).order('staff_id');
   for(let i=0;;i+=500){
    const {data,error}=await query.range(i,i+499);
    if(error)throw error;
    out.push(...(data||[]).filter(row=>matchStaff(row.staff_id)));
    if((data||[]).length<500)break;
   }
   return out.slice(start,start+size);
  }
  let query=sb.from('ffh_attendance').select('id,duty_date,check_in,check_out,shift_end').eq('staff_id',sid);
  if(day)query=query.eq('duty_date',day);
  else{
   const next=new Date(month+'-01T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);
   query=query.gte('duty_date',month+'-01').lt('duty_date',next.toISOString().slice(0,10));
  }
  const {data,error}=await query.order('duty_date',{ascending:false}).order('check_in',{ascending:false}).range(start,start+size-1);
  if(error)throw error;
  if(user()?.id!==sid)throw Error('Sign in again to view attendance.');
  return data||[];
 };
 const roster=async(month,day)=>{
  let query=sb.from('ffh_attendance_roster').select('staff_id,duty_date,day_type,starts_at,ends_at');
  if(scope.value==='own')query=query.eq('staff_id',sid);
  const next=new Date(month+'-01T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);
  query=day?query.eq('duty_date',day):query.gte('duty_date',month+'-01').lt('duty_date',next.toISOString().slice(0,10));
  const out=[];
  const ordered=query.order('duty_date',{ascending:false}).order('staff_id');
  for(let i=0;;i+=500){
   const {data,error}=await ordered.range(i,i+499);
   if(error)throw error;
   out.push(...(data||[]));
   if((data||[]).length<500)break;
  }
  return scope.value==='own'?out:out.filter(row=>matchStaff(row.staff_id));
 };
 const counts=entries=>Object.fromEntries(['Present','Late','Absent','Leave'].map(status=>[status,entries.filter(row=>row.status===status).length]));
 const load=async(append=false)=>{
  const ticket=++historyVersion,list=box.querySelector('#ffAttendanceHistory'),month=attendanceMonth,day=attendanceDay;
  if(!append){attendanceRows.length=0;box.querySelectorAll('.ffAttendanceMetrics output').forEach(output=>output.value='—');}
  try{
   const [rows,schedule]=await Promise.all([records(month,day,append?offset:0,scope.value==='own'?50:10000),roster(month,day).catch(()=>null)]);
   if(ticket!==historyVersion||!list.isConnected||user()?.id!==sid)return;
   attendanceRows.push(...rows);
   const entries=merged(attendanceRows,schedule||[]);
   box.querySelector('#ffAttendanceTotal').value=String(entries.filter(row=>row.check_in||row.status==='Absent'||row.status==='Leave').length);
   const totals=counts(entries);
   for(const [status,count] of Object.entries(totals))box.querySelector('#ffAttendance'+status).value=status==='Present'||schedule?.length?String(count):'—';
   const teamCards=box.querySelector('#ffAttendanceTeamCards');
   teamCards.innerHTML=scope.value==='own'||scope.value==='all'&&!staffFilter.value?'':scopePeople()
    .filter(p=>!staffFilter.value||p.staff_id===staffFilter.value)
    .sort((a,b)=>Number(!!b.can_manage)-Number(!!a.can_manage)||a.full_name.localeCompare(b.full_name))
    .map(p=>{
     const rows=entries.filter(row=>row.staff_id===p.staff_id), totals=counts(rows);
     return `<button type="button" class="ffRefButton" data-team-staff="${E(p.staff_id)}"><span class="ffTrackingPortrait" data-ff-staff-avatar="${E(p.staff_id)}">${E(p.full_name.charAt(0))}</span><b>${E(p.full_name)}</b><small>${p.can_manage?'Manager':'SR'} · ${totals.Present} present · ${totals.Late} late</small></button>`;
    }).join('');
   teamCards.querySelectorAll('button').forEach(button=>button.onclick=()=>{
    staffFilter.value=staffFilter.value===button.dataset.teamStaff?'':button.dataset.teamStaff;void load();
   });
   list.innerHTML=entries.map(x=>`<article class="ffHistoryEntry"><b class="ffDateBadge">${E(x.duty_date)}</b>
    <div><strong>${E(x.status)}</strong>${scope.value==='own'?'':' · '+E(directory.find(p=>p.staff_id===x.staff_id)?.full_name||x.staff_id)}</div>
    <div>Check-in: <strong>${E(stamp(x.check_in)||'—')}</strong></div><div>Check-out: <strong>${E(stamp(x.check_out)||'—')}</strong></div></article>`).join('')||'<p>No attendance in this period.</p>';
   offset=(append?offset:0)+rows.length;
   box.querySelector('#ffAttendanceMore').hidden=scope.value!=='own'||rows.length<50;
  }catch(err){if(ticket===historyVersion&&list.isConnected)list.textContent='History could not load: '+err.message;}
 };
 const form=box.querySelector('#ffRosterForm');
 if(form){
  const sync=()=>{
   const working=form.elements.day_type.value==='Working';
   form.querySelector('#ffRosterTimes').hidden=!working;
   for(const key of ['starts_at','ends_at'])form.elements[key].disabled=!working;
  };
  form.elements.day_type.onchange=sync;
  sync();
  form.onsubmit=async event=>{
   event.preventDefault();
   if(user()?.id!==sid)return;
   const button=event.submitter,feedback=form.querySelector('[role=status]');
   const fields=Object.fromEntries(new FormData(form)),row={...fields,starts_at:fields.starts_at||null,ends_at:fields.ends_at||null,updated_at:new Date().toISOString(),updated_by:sid};
   button.disabled=true;
   try{
    if(row.day_type==='Working'&&(!row.starts_at||!row.ends_at||row.starts_at>=row.ends_at))throw Error('Enter a shift end after its start.');
    const {error}=await sb.from('ffh_attendance_roster').upsert(row,{onConflict:'staff_id,duty_date'});
    if(error)throw error;
    if(user()?.id!==sid||!form.isConnected)return;
    feedback.textContent='Roster saved for '+row.duty_date+' MYT.';
    await load();
   }catch(error){feedback.textContent=error.message;}
   finally{button.disabled=false;}
  };
 }
 const feedback=box.querySelector('#ffAttendanceFeedback');
 const run=(button,action,day)=>async()=>{
  button.disabled=true;
  feedback.textContent='Loading attendance…';
  const month=attendanceMonth;
  try{
   const data=[];
   for(let start=0;;start+=100){
    const size=scope.value==='own'?100:10000;
    const batch=await records(month,day,start,size);data.push(...batch);
    if(batch.length<size)break;
   }
   if(!box.isConnected)return;
   feedback.textContent='';
   const schedule=await roster(month,day).catch(()=>[]);
   await action(merged(data,schedule),day||month);
  }catch(err){feedback.textContent=err.message;}
  finally{button.disabled=false;}
 };
 box.querySelectorAll('[data-attendance-export]').forEach(button=>{
  button.onclick=()=>run(button,(data,period)=>ctx.exportFile(button,'Attendance '+period,[
   ['Staff','Date','Status','Check-in (MYT)','Check-out (MYT)','Shift end (MYT)'],
   ...data.map(row=>[directory.find(p=>p.staff_id===row.staff_id)?.full_name||row.staff_id,row.duty_date,row.status,stamp(row.check_in),stamp(row.check_out),stamp(row.shift_end)])
  ],feedback),attendanceDay)();
 });
 const summary=box.querySelector('#ffAttendanceSummary');
 summary.onclick=run(summary,(data,period)=>{
  const totals=counts(data),checkedOut=data.filter(row=>row.check_in&&row.check_out).length;
  feedback.textContent=period+' · '+Object.entries(totals).map(([label,value])=>label+' '+value).join(' · ')+' · '+checkedOut+' checked out';
 },'');
 const reveal=target=>{details.hidden=false;target?.scrollIntoView?.({block:'nearest'});};
 scope.onchange=()=>{
  box.querySelector('#ffAttendanceStaffLabel').hidden=scope.value==='own';
  staffFilter.innerHTML='<option value="">All staff in selection</option>'+scopePeople().sort((a,b)=>Number(!!b.can_manage)-Number(!!a.can_manage)).map(p=>`<option value="${E(p.staff_id)}">${E(p.full_name)}${p.can_manage?' · Manager':''}</option>`).join('');
  void load();
 };
 staffFilter.onchange=()=>void load();
 extras.querySelectorAll('button').forEach(button=>button.onclick=()=>{
  const target=button.dataset.dutyOpen;
  if(target==='history')return reveal(box.querySelector('#ffAttendanceHistory'));
  if(target==='team'){reveal(scope);scope.value='all';scope.onchange();scope.focus();return;}
  if(target==='export')return reveal(box.querySelector('.ffAttendanceActions'));
  if(target==='locations'){renderTracking(sid,attendanceDay||date()).catch(error);return;}
  if(target==='schedule'){
   const d=chatDialog('My Schedule','<div role="status">Loading schedule…</div>');
   sb.from('ffh_attendance_roster').select('duty_date,day_type,starts_at,ends_at').eq('staff_id',sid)
    .gte('duty_date',attendanceMonth+'-01').lte('duty_date',periodEnd(attendanceMonth)).order('duty_date').then(({data,error:failure})=>{
     d.el.querySelector('[role=status]').innerHTML=failure?E(failure.message):(data||[]).map(r=>`<p>${E(r.duty_date)} · ${E(r.day_type)} ${E(r.starts_at? r.starts_at.slice(0,5)+'–'+r.ends_at.slice(0,5)+' MYT':'')}</p>`).join('')||'No roster days recorded for this month.';
    });
   return;
  }
  if(target==='leave'){
   const d=chatDialog('Leave Request',`<form class="form"><label>Date<input name="day" type="date" value="${E(date())}" required></label><label>Reason<textarea name="reason" required maxlength="600"></textarea></label><button class="primary" type="submit">Submit leave request</button><p role="status"></p></form>`);
   d.el.querySelector('form').onsubmit=async event=>{
    event.preventDefault();const form=event.target, submit=event.submitter, notice=form.querySelector('[role=status]');
    submit.disabled=true;
    try{
     const day=form.elements.day.value,reason=form.elements.reason.value.trim();
     if(!reason)throw Error('Enter the reason for leave.');
     const {error:failure}=await sb.rpc('ffh_governance',{action:'request',payload:{action:'edit',module:'attendance',record_id:day,reason:'Leave request · '+day+' · '+reason}});
     if(failure)throw failure;
     notice.textContent='Submitted for review in Approval Inbox.';
    }catch(err){notice.textContent=err.message;submit.disabled=false;}
   };
   return;
  }
  if(target==='settings'){
   const editor=box.querySelector('.ffAttendanceRoster');
   if(editor){editor.open=true;reveal(editor);return;}
   chatDialog('Attendance Settings',`<p>Required check-in: ${state?.settings?.attendance_required?'On':'Off'}</p><p>Tracking: ${native()?'Android':'Web'} · precise location required during check-in.</p>`);return;
  }
  chatDialog('Policy & Rules','<ul><li>Allow work-hours GPS before checking in.</li><li>Tracking ends at checkout or shift end. Breaks are deducted from work hours.</li><li>Late and absent status use the saved roster for your shift.</li></ul>');
 });
 box.querySelector('#ffAttendanceMonth').onchange=e=>{
  if(!e.target.value){e.target.value=attendanceMonth;return;}
  attendanceMonth=e.target.value;attendanceDay='';box.querySelector('#ffAttendanceDay').value='';void load();
 };
 box.querySelector('#ffAttendanceDay').onchange=e=>{attendanceDay=e.target.value;void load();};
 box.querySelector('#ffAttendanceMore').onclick=()=>load(true);
 void load();
}
async function compress(file){const img=await createImageBitmap(file);const scale=Math.min(1,640/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);img.close();const b=await new Promise(r=>c.toBlob(r,'image/jpeg',.65));if(!b||b.size>250000)throw Error('Photo is too large; choose a smaller image');return b;}
function disposeMap(){closeFullMap?.();refreshTeamMap=null;generation++;if(map){map.remove();map=null;}mapLayer=null;}
function openTrackingFullscreen(){
 if(closeFullMap){closeFullMap();return;}if(!map)return;const target=$('#ffDutyMap'),marker=document.createComment('tracking-map'),overlay=document.createElement('div');target.before(marker);overlay.className='ffMapFullOverlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Full screen tracking map');overlay.innerHTML='<button class="ffMapFullClose" type="button">× Back to tracking</button>';document.body.append(overlay);overlay.append(target);const close=window.FFH_OVERLAY(overlay,()=>{marker.replaceWith(target);overlay.remove();closeFullMap=null;map?.invalidateSize();});closeFullMap=close;overlay.querySelector('button').onclick=close;requestAnimationFrame(()=>map?.invalidateSize());
}
async function renderTracking(initialStaff='',initialDay=date()){
 await refresh();disposeMap();
 let trackingRows=[],trackingPoints=[],selectedStops=[];
 shell('tracking',`<div class="ffDutyScreen ffTrackingScreen">
 ${dutyHeading('⌖','SR','Tracking')}
 <div class="card ffTrackingCard">
 <p class="ffTrackingIntro">⌖ &nbsp; Live location, visit status, route and daily field activity</p>
 ${dutyIdentity()}
 <div class="ffRefPanel ffRefFields ffRefTrackingFields">
  <label>Date<input id="ffTrackDate" type="date" value="${E(initialDay)}" max="${date()}"></label>
  <label>Zone<select id="ffTrackZone"><option value="">All permitted zones</option></select></label>
  <label>SR / Team<select id="ffTrackStaff"></select></label>
  <button type="button" id="ffTrackSearch" class="ffRefButton" aria-label="Refresh tracking">⌕</button>
 </div>
 <div id="ffTrackSummary" class="ffRefReportKpis" aria-live="polite"></div>
 <div class="ffTrackingSplit">
  <div id="ffDutyMap"></div>
  <section class="ffRefPanel ffRefTrackRoster"><div class="ffTrackRosterHead"><h2 id="ffTrackRosterTitle">SR Live Status</h2><button type="button" id="ffTrackViewAll" class="ffRefButton">View All</button></div><div id="ffTrackRoster" aria-live="polite"></div></section>
 </div>
 <div id="ffDutyStatus" class="notice" role="status"></div>
 <div class="ffDutyTiles ffTrackingPrimary">${dutyTiles([
  ['route','◫','Route Plan'],['outletHistory','▦','Visit Log'],['assign','⊞','Assign Task'],['reports','▥','SR Performance'],['live','⌁','Live Report']
 ],'data-track-open')}</div>
 <div class="ffDutyTiles ffTrackingSecondary">${dutyTiles([
  ['geo','⌖','Geo Fence'],['coverage','▤','Outlet Coverage'],['distance','⌁','Distance & Travel'],
  ['idle','◷','Idle Alert'],['proof','▧','Visit Proof'],['export','⇩','Export Report']
 ],'data-track-open')}</div>
 <div class="ffMapActions"><button class="primary" id="ffMapMessage">MESSAGE SELECTED SR</button><button hidden type="button" id="ffMapTask">Assign location task</button></div>
 <div id="ffStopList" hidden></div><div id="ffAttendanceProof" hidden></div></div></div>${user().id==='M21954'?`<details class="card ffTrackingAccess"><summary>⚙ Tracking viewing access <small>Choose viewers & permitted SRs</small></summary><div class="ffTrackingAccessBody"><p class="miniStat">Team filters use attendance permissions. The map follows the existing GPS record permissions.</p><label><input type="checkbox" id="ffShareTracking" ${state.settings.tracking_shared?'checked':''}> Enable assigned viewers</label><form class="form" id="ffTrackingGrant"><label>Viewer<select name="viewer">${people.filter(p=>p.staff_id!==user().id).map(p=>`<option value="${E(p.staff_id)}">${E(p.full_name)} · ${E(p.role)}</option>`).join('')}</select></label><label>SRs this viewer can see<select name="targets" multiple>${people.map(p=>`<option value="${E(p.staff_id)}">${E(p.full_name)}</option>`).join('')}</select></label><button class="secondary">SAVE VIEWING ASSIGNMENT</button><p class="miniStat">Select no SRs to revoke this viewer's access.</p></form></div></details>`:''}`);
 const sid=user().id, staff=$('#ffTrackStaff'), zone=$('#ffTrackZone');
 const {data:permitted,error:scopeError}=await sb.rpc('ffh_attendance_team');
 if(!staff.isConnected)return;
 const visible=new Set([sid,...(Array.isArray(permitted)?permitted:[])]);
 const own=people.find(p=>p.staff_id===sid)||{staff_id:sid,full_name:user().name,zone_name:user().zone};
 const roster=[own,...people.filter(p=>p.staff_id!==sid&&visible.has(p.staff_id))];
 const group=staffZone;
 zone.insertAdjacentHTML('beforeend',[...new Set(roster.map(group).filter(Boolean))].sort().map(z=>`<option value="${E(z)}">${E(z)}</option>`).join(''));
 const filtered=()=>roster.filter(p=>!zone.value||group(p)===zone.value);
 function fillStaff(){
   const before=staff.value||initialStaff;
   initialStaff='';
   staff.innerHTML='<option value="">All permitted team</option>'+filtered().map(p=>`<option value="${E(p.staff_id)}">${E(p.staff_id===sid?'My location · '+p.full_name:p.full_name)}</option>`).join('');
   if(filtered().some(p=>p.staff_id===before))staff.value=before;
   staff.dispatchEvent(new Event('change'));
 }
 let teamRequest=0, lastTeamLoad=0, trackingStatus='', showAll=false;
 async function teamStatus(fit=false){
   const ticket=++teamRequest, day=$('#ffTrackDate').value;
   if(!day)return;
   const selected=filtered().filter(p=>!staff.value||p.staff_id===staff.value);
   const [summary,sharedRows,proofs]=await Promise.all([
    sb.rpc('ffh_attendance_summary',{from_day:day,to_day:day}),
    sb.from('ffh_attendance').select('id,staff_id,check_in,check_out,shift_end').eq('duty_date',day),
    sb.from('ffh_campaign_executions').select('sr_id,outlet_name,proof_location').eq('execution_date',day)
   ]);
   if(ticket!==teamRequest||!staff.isConnected)return;
   if(sharedRows.error)throw Error(sharedRows.error.message);
   const byId=new Map([...(Array.isArray(summary.data)?summary.data:[]),...(sharedRows.data||[])].map(a=>[a.staff_id,a]));
   const latest=new Map(), attended=selected.filter(p=>byId.get(p.staff_id)?.id);
   const outlets=new Map();
   for(const proof of (Array.isArray(proofs.data)?proofs.data:[])){
    if(!proof.proof_location)continue;
    if(!outlets.has(proof.sr_id))outlets.set(proof.sr_id,[]);
    outlets.get(proof.sr_id).push(proof);
   }
   let incomplete=false;
   for(let start=0;start<attended.length;start+=8){
     if(ticket!==teamRequest||!staff.isConnected)return;
     const items=await Promise.all(attended.slice(start,start+8).map(async p=>{
       const result=await sb.from('ffh_location_points').select('latitude,longitude,accuracy_m,speed_mps,captured_at')
         .eq('attendance_id',byId.get(p.staff_id).id).order('captured_at',{ascending:false}).limit(1);
       if(result.error)incomplete=true;
       return [p.staff_id,result.data?.[0]];
     }));
     items.forEach(([id,point])=>{if(point)latest.set(id,point);});
   }
   if(ticket!==teamRequest||!staff.isConnected)return;
   const state=p=>{
     const a=byId.get(p.staff_id),point=latest.get(p.staff_id);
     if(!a)return 'Not Started';
     if(a.check_out||Date.parse(a.shift_end)<=Date.now())return 'Shift Ended';
     if(!point||Date.now()-Date.parse(point.captured_at)>180000)return 'No Location';
     const atOutlet=(outlets.get(p.staff_id)||[]).some(({proof_location:proof})=>
      Number.isFinite(proof.latitude)&&Number.isFinite(proof.longitude)&&
      Math.abs(Date.parse(point.captured_at)-Date.parse(proof.capturedAt))<=600000&&core.distance(point,proof)<=100);
     if((point.speed_mps??0)>=2)return 'In Transit';
     return atOutlet?'At Outlet':'On Field';
   };
   const labels=[
     ['⌖','Total SR','gold',''],
     ['●','On Field','green','On Field'],
     ['⌖','At Outlet','blue','At Outlet'],
     ['◷','In Transit','gold','In Transit'],
     ['Ⅱ','Not Started','red','Not Started'],
     ['⚠','No Location','purple','No Location'],
     ['⚑','Shift Ended','cyan','Shift Ended']
   ];
   const summaryPanel=$('#ffTrackSummary'), rosterPanel=$('#ffTrackRoster'), viewAll=$('#ffTrackViewAll');
   trackingRows=selected.map(p=>({person:p,status:state(p),point:latest.get(p.staff_id),attendance:byId.get(p.staff_id)}));
   summaryPanel.innerHTML=labels.map(([icon,label,color,filter])=>{
     const count=filter?selected.filter(p=>state(p)===filter).length:selected.length;
     return `<button type="button" class="ffRefMetric" data-color="${color}" data-track-status="${filter}" aria-pressed="${trackingStatus===filter}"><i aria-hidden="true">${icon}</i><strong>${count}</strong><span>${label}</span></button>`;
   }).join('');
   function renderRoster(){
     const matching=trackingStatus?selected.filter(person=>state(person)===trackingStatus):selected;
     const shown=showAll?matching:matching.slice(0,5);
     $('#ffTrackRosterTitle').textContent='SR Live Status ('+shown.length+'/'+matching.length+')';
     viewAll.hidden=matching.length<=5;
     viewAll.textContent=showAll?'Show 5':'View All ('+matching.length+') →';
     viewAll.onclick=()=>{showAll=!showAll;renderRoster();};
     rosterPanel.innerHTML=shown.map(p=>{
       const point=latest.get(p.staff_id), status=state(p);
       const tone=labels.find(label=>label[3]===status)[2];
       const time=point?new Date(point.captured_at).toLocaleTimeString('en-MY',{timeZone:'Asia/Kuala_Lumpur',hour:'2-digit',minute:'2-digit'}):'';
       return `<button type="button" class="ffRefButton ffTrackPerson" data-color="${tone}" data-tracking-staff="${E(p.staff_id)}"><span class="ffTrackingPortrait" data-ff-staff-avatar="${E(p.staff_id)}" aria-hidden="true">${E(p.full_name?.trim().charAt(0)||'•')}</span><b>${E(p.full_name)}<small>${E(group(p))}</small></b><span class="ffTrackingStatus">${E(status)}<small>${E(time||'—')}</small></span><span aria-hidden="true">›</span></button>`;
     }).join('')||'<p class="ffRefHint">No staff in this selection.</p>';
     rosterPanel.querySelectorAll('[data-tracking-staff]').forEach(button=>button.onclick=()=>{
       staff.value=button.dataset.trackingStaff;
       staff.dispatchEvent(new Event('change'));
     });
   }
   summaryPanel.querySelectorAll('[data-track-status]').forEach(button=>button.onclick=()=>{
     trackingStatus=button.dataset.trackStatus;
     summaryPanel.querySelectorAll('[data-track-status]').forEach(card=>card.setAttribute('aria-pressed',String(card===button)));
     renderRoster();
   });
   renderRoster();
   if(!staff.value&&mapLayer){
     mapLayer.clearLayers();
     const coordinates=[];
     for(const p of selected){
       const point=latest.get(p.staff_id);
       if(!point||!Number.isFinite(point.latitude)||!Number.isFinite(point.longitude))continue;
       const coordinate=[point.latitude,point.longitude], tone=labels.find(label=>label[3]===state(p))[2];
       coordinates.push(coordinate);
       addTrackingPin(p,point,tone,state(p));

     }
     if(fit&&coordinates.length)map.fitBounds(L.latLngBounds(coordinates),{padding:[24,24],maxZoom:15});
     $('#ffDutyStatus').textContent=incomplete||summary.error||scopeError?'Some records could not load.':coordinates.length?
       coordinates.length+' recorded locations. Select a pin or staff member for their route.':'No location records for this team and date.';
   }
 }
 refreshTeamMap=async fit=>{
   if(!fit&&Date.now()-lastTeamLoad<12000)return;
   lastTeamLoad=Date.now();
   await teamStatus(fit);
 };
 fillStaff();
 zone.onchange=()=>{trackingStatus='';showAll=false;fillStaff();};
 function reportRows(){
  return [['Staff','Zone','Status','Check-in (MYT)','Last GPS (MYT)'],
   ...trackingRows.map(r=>[r.person.full_name,group(r.person),r.status,mytTime(r.attendance?.check_in),mytTime(r.point?.captured_at)])];
 }
 const reveal=target=>{target.hidden=false;target.scrollIntoView?.({block:'nearest'});};
 document.querySelectorAll('[data-track-open]').forEach(button=>button.onclick=()=>{
  const target=button.dataset.trackOpen,selected=staff.value,day=$('#ffTrackDate').value;
  if(target==='reports'||target==='outletHistory'||target==='coverage'){
   return ctx.openTrackingDetail?.(target==='reports'?'reports':'outletHistory',{staff:selected,day});
  }
  if(target==='route')return ctx.open?.('route');
  if(!trackingRows.length&&target!=='assign')return error(Error('No tracking records in this selection.'));
  if(target==='live'||target==='export'){
   const rows=reportRows();
   const d=chatDialog(target==='live'?'Live Report':'Export Tracking Report',`<p>${E(day)} · ${rows.length-1} staff</p><div class="ffTrackExport"><button type="button" class="ffRefButton" data-attendance-export="pdf">PDF</button><button type="button" class="ffRefButton" data-attendance-export="xlsx">Excel</button></div><p role="status"></p>${target==='live'?rows.slice(1).map(r=>`<p>${E(r[0])} · ${E(r[2])} · ${E(r[4])}</p>`).join(''):''}`);
   d.el.querySelectorAll('[data-attendance-export]').forEach(action=>action.onclick=()=>ctx.exportFile(action,'SR Tracking '+day,rows,d.el.querySelector('[role=status]')));
   return;
  }
  if(!selected){staff.focus();return error(Error('Choose an SR to open '+button.textContent.trim()+'.'));}
  if(target==='assign')return $('#ffMapTask').click();
  if(target==='proof')return ctx.openTrackingDetail?.('outletHistory',{staff:selected,day});
  if(target==='geo'){
   const proof=$('#ffAttendanceProof');
   if(proof.childNodes.length)return reveal(proof);
   return error(Error('No recorded attendance area for this staff and date.'));
  }
  if(target==='idle'){
   const stops=$('#ffStopList');
   if(selectedStops.length)return reveal(stops);
   return error(Error('No sustained stops in the available GPS points.'));
  }
  if(target==='distance'){
   const metres=core.segments(trackingPoints).reduce((sum,line)=>sum+line.slice(1).reduce((part,p,i)=>part+core.distance(
     {latitude:line[i][0],longitude:line[i][1]},{latitude:p[0],longitude:p[1]}),0),0);
   chatDialog('Distance & Travel',`<p>${trackingPoints.length<2?'Insufficient GPS points to calculate travel.':(metres/1000).toFixed(2)+' km across continuous GPS segments'}</p>`);
  }
 });
 $('#ffTrackSearch').onclick=()=>showSelection();
 const detailHost=$('#ffStopList');
 detailHost.addEventListener('ff-route-data',event=>{trackingPoints=event.detail.points;selectedStops=event.detail.stops;});
 if(!window.L){$('#ffDutyStatus').textContent='Map library could not load. Check your internet connection.';return;}
 map=L.map('ffDutyMap',{touchZoom:false,doubleClickZoom:false,scrollWheelZoom:false}).setView([3.139,101.6869],11);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map);mapLayer=L.layerGroup().addTo(map);const full=L.control({position:'topright'});full.onAdd=()=>{const button=L.DomUtil.create('button','ffMapFullscreen');button.type='button';button.id='ffMapFullscreen';button.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';button.title='Full screen map';button.setAttribute('aria-label','Full screen map');L.DomEvent.disableClickPropagation(button);button.onclick=openTrackingFullscreen;return button;};full.addTo(map);setTimeout(()=>map?.invalidateSize(),100);
 function showSelection(){
   currentLocation=null;trackingPoints=[];selectedStops=[];trackingRows=[];mapLayer?.clearLayers();
   $('#ffStopList').hidden=$('#ffAttendanceProof').hidden=true;
   $('#ffStopList').replaceChildren();$('#ffAttendanceProof').replaceChildren();
   const selected=!!staff.value;
   $('#ffMapMessage').disabled=$('#ffMapTask').disabled=!selected;
   refreshTeamMap(true).catch(error);
   if(selected)loadMap(true).catch(error);
 }
 staff.onchange=()=>{trackingStatus='';showAll=false;showSelection();};
 $('#ffTrackDate').onchange=showSelection;
 $('#ffMapMessage').onclick=()=>{const to=$('#ffTrackStaff').value;const text=prompt('Message this SR about this location:','ভাই, আপনি এই জায়গায় কী কাজ করছেন?');if(text?.trim())send(to,text,{date:$('#ffTrackDate').value,...(currentLocation||{})}).then(()=>{$('#ffDutyStatus').textContent='Message saved and notification queued.'}).catch(error)};
 $('#ffMapTask').onclick=()=>ctx.task($('#ffTrackStaff').value,$('#ffTrackDate').value,currentLocation);
 if($('#ffShareTracking'))$('#ffShareTracking').onchange=async e=>{try{await rpc('access',{shared:e.target.checked});await refresh();$('#ffDutyStatus').textContent='Viewing access updated.';}catch(err){e.target.checked=!e.target.checked;error(err)}};
 if($('#ffTrackingGrant'))$('#ffTrackingGrant').onsubmit=async e=>{e.preventDefault();try{const f=new FormData(e.target);await rpc('access',{shared:$('#ffShareTracking').checked,viewer:f.get('viewer'),targets:f.getAll('targets')});$('#ffDutyStatus').textContent='Viewer assignment saved.';}catch(err){error(err)}};
 if($('#ffTrackingGrant')){const form=$('#ffTrackingGrant');const fill=async()=>{const selected=form.elements.viewer.value;const {data,error:err}=await sb.from('ffh_tracking_grants').select('target_staff_ids').eq('viewer_staff_id',selected).maybeSingle();if(!form.isConnected||form.elements.viewer.value!==selected)return;if(err)return error(err);const targets=new Set(data?.target_staff_ids||[]);for(const option of form.elements.targets.options)option.selected=targets.has(option.value);form.elements.targets.dispatchEvent(new Event('change',{bubbles:true}));};form.elements.viewer.onchange=()=>fill().catch(error);await fill();}
 window.FFH_STYLE_SELECT?.($('#ffTrackStaff'),{title:'Choose SR'});window.FFH_STYLE_SELECT?.($('#ffTrackingGrant [name=viewer]'),{title:'Choose viewer'});window.FFH_STYLE_MULTI_SELECT?.($('#ffTrackingGrant [name=targets]'),{title:'SRs this viewer can see'});
 showSelection();
}
function addTrackingPin(person,point,tone,status){
 const pin=document.createElement('span');pin.className='ffTrackingPin';pin.dataset.color=tone;
 const avatar=()=>{
  const portrait=document.createElement('span');
  portrait.className='ffDutyMapAvatar';
  portrait.dataset.ffStaffAvatar=person.staff_id;
  portrait.textContent=person.full_name?.trim().charAt(0)||'•';
  return portrait;
 };
 pin.append(avatar());
 const popup=document.createElement('div');popup.className='ffDutyMapPopup';popup.append(avatar());
 const label=document.createElement('span');
 label.textContent=[person.full_name,staffZone(person),status,mytTime(point.captured_at)].filter(Boolean).join(' · ');
 popup.append(label);
 return L.marker([point.latitude,point.longitude],{
  icon:L.divIcon({className:'ffTrackingMarker',html:pin,iconSize:[35,40],iconAnchor:[17,39],popupAnchor:[0,-38]}),
  title:person.full_name
 }).addTo(mapLayer).bindPopup(popup);
}
let mapLoading=false,pendingMap=false,currentLocation=null;
async function loadMap(fit=false){
 if(!map||page()!=='tracking')return;
 const staff=$('#ffTrackStaff').value,day=$('#ffTrackDate').value;
 if(!staff)return refreshTeamMap?.(fit);
 if(!fit)refreshTeamMap?.(false)?.catch(error);
 if(mapLoading){if(fit)pendingMap=true;return;}
 mapLoading=true;const gen=generation;
 try{
 const {data:a,error:ae}=await sb.from('ffh_attendance').select('*').eq('staff_id',staff).eq('duty_date',day).maybeSingle();if(ae)throw ae;
 let points=[];if(a){for(let offset=0;offset<10000;offset+=1000){const {data,error}=await sb.from('ffh_location_points').select('latitude,longitude,accuracy_m,speed_mps,captured_at,source').eq('attendance_id',a.id).order('captured_at').range(offset,offset+999);if(error)throw error;points.push(...(data||[]));if(!data||data.length<1000)break;}}
 if(gen!==generation||!map||page()!=='tracking'||$('#ffTrackStaff').value!==staff||$('#ffTrackDate').value!==day)return;
 mapLayer.clearLayers();const stopRows=core.stops(points);for(const line of core.segments(points))L.polyline(line,{color:'#ff7417',weight:3}).addTo(mapLayer);
 for(const stop of stopRows){const marker=L.circleMarker([stop.latitude,stop.longitude],{radius:stop.minutes>=5?7:4,color:'#ffac54',fillOpacity:.9}).addTo(mapLayer);marker.bindTooltip((stop.minutes>=5?stop.minutes+' min · ':'')+new Date(stop.start).toLocaleTimeString('en-MY'),{permanent:stop.minutes>=5,direction:'top'});}
 const last=points.at(-1);currentLocation=last||null;if(last){const person=people.find(p=>p.staff_id===staff)||{staff_id:staff,full_name:user().name};addTrackingPin(person,last,'blue','Last recorded location');L.circle([last.latitude,last.longitude],{radius:last.accuracy_m,color:'#55cafa',weight:1,fillOpacity:.08}).addTo(mapLayer);if(fit)map.setView([last.latitude,last.longitude],15);}
 $('#ffDutyStatus').textContent=!a?'No attendance on this date.':!last?'Attendance saved; no route points received.':`${a.check_out?'Checked out':'Shift ends '+new Date(a.shift_end).toLocaleTimeString('en-MY')} · Last GPS ${new Date(last.captured_at).toLocaleString('en-MY')} · ±${Math.round(last.accuracy_m)} m${Date.now()-Date.parse(last.captured_at)>180000?' · LOCATION STALE / TRACKING GAP':''}`;
 $('#ffStopList').dispatchEvent(new CustomEvent('ff-route-data',{detail:{points,stops:stopRows}}));
 $('#ffStopList').innerHTML='<div class="cardTitle">Estimated Stops</div>'+stopRows.map(s=>`<div class="row"><span>${E(new Date(s.start).toLocaleTimeString('en-MY'))}</span><b>${s.minutes} min</b></div>`).join('');
 const proof=$('#ffAttendanceProof');proof.innerHTML=a&&a.latitude!=null&&a.longitude!=null?`<div class="miniStat">Daily starting point: ${a.latitude.toFixed(5)}, ${a.longitude.toFixed(5)} · ${a.daily_home_residence?'Manager-marked home area':'Attendance area; residence unconfirmed'}</div>${user().id==='M21954'||user().ownerAccess||user().mode==='MANAGER'?`<label><input type="checkbox" id="ffDayReturnAlert" ${a.daily_home_enabled?'checked':''}> Alert on return to this area today</label><label><input type="checkbox" id="ffDayHome" ${a.daily_home_residence?'checked':''}> Mark this as home for ${E(day)}</label><button class="secondary" id="ffSaveDayHome">SAVE DAILY AREA</button>`:''}`:'';if(a&&$('#ffSaveDayHome')){$('#ffSaveDayHome').onclick=async()=>{try{await rpc('daily_home',{attendance_id:a.id,enabled:$('#ffDayReturnAlert').checked,residence:$('#ffDayHome').checked});$('#ffDutyStatus').textContent='Daily reference saved for '+day;}catch(e){error(e)}};}if(a?.photo_path){const {data,error}=await sb.storage.from('ffh-attendance').createSignedUrl(a.photo_path,60);if(!error&&gen===generation&&proof.isConnected){const img=document.createElement('img');img.src=data.signedUrl;img.alt='Attendance photo';img.style.cssText='max-width:180px;border-radius:12px';proof.appendChild(img);}}
 }finally{mapLoading=false;if(pendingMap){pendingMap=false;loadMap(true).catch(error);}}}
let contactZone='',chatAttachment=null;
const chatMedia=window.FFH_CREATE_CHAT_MEDIA?.({sb,user,download:(...args)=>ctx.download(...args),error});
async function chatRpc(action,payload={}){const {data,error}=await sb.rpc('ffh_chat',{action,payload});if(error)throw Error(error.message);return data;}
async function send(recipient,body,location_context=null,media=null,contact_card=null){const result=await chatRpc('send',{id:crypto.randomUUID(),recipient,body,location_context,contact_card,media_path:media?.path||null,media_type:media?.kind||null,media_name:media?.name||null});sb.functions.invoke('ffh-push-dispatch',{body:{}}).catch(console.warn);await loadMessages(false);return result;}
const chatIcon=name=>'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+({attach:'<path d="m8 12 6-6a4 4 0 0 1 6 6l-9 9a6 6 0 0 1-8-8L13 3"/><path d="m7 15 9-9"/>',mic:'<rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',send:'<path d="m3 3 19 9-19 9 4-9-4-9Zm4 9h15"/>',location:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',contact:'<rect x="4" y="3" width="16" height="19" rx="3"/><circle cx="12" cy="9" r="3"/><path d="M7 18c0-5 10-5 10 0M2 7h4m-4 5h4m-4 5h4"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',dots:'<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>'}[name]||'')+'</svg>';
function chatDialog(title,body){const o=document.createElement('div');o.className='globalSearchOverlay';o.innerHTML='<section class="globalSearchBox ffChatDialog"><div class="row"><h2>'+E(title)+'</h2><button type="button" class="ffChatIcon" data-close aria-label="Close">'+chatIcon('close')+'</button></div>'+body+'</section>';document.body.append(o);const close=window.FFH_OVERLAY?window.FFH_OVERLAY(o,()=>o.remove()):()=>o.remove();o.querySelector('[data-close]').onclick=close;return{el:o,close};}
function editChatMessage(m){const d=chatDialog('Edit message','<form class="form" data-edit-form><textarea name="body" maxlength="1800" required></textarea><button class="primary" type="submit">Save changes</button><p role="status"></p></form>');d.el.querySelector('textarea').value=m.body;d.el.querySelector('form').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{await chatRpc('edit',{id:m.id,body:d.el.querySelector('textarea').value.trim()});d.close();await loadMessages(false);}catch(err){d.el.querySelector('[role=status]').textContent=err.message;b.disabled=false;}};}
function chatMessageMenu(m){const own=m.sender_staff_id===user().id;const d=chatDialog('Message options',`<div class="ffChatActionMenu">${own&&!m.unsent_at?'<button class="secondary" data-action="edit">Edit message</button><button class="danger" data-action="unsend">Unsend for everyone</button>':''}<button class="secondary" data-action="hide">Delete for me</button></div>`);d.el.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{const action=b.dataset.action;if(action==='edit'){d.close();editChatMessage(m);return;}if(action==='unsend'&&!confirm('Unsend this message for everyone?'))return;b.disabled=true;try{await chatRpc(action,{id:m.id});d.close();await loadMessages(false);}catch(err){error(err);b.disabled=false;}});}
async function shareChatContact(){if(!peer)return error(Error('Choose a staff member first'));const selected=peer;try{const {data,error:err}=await sb.from('ffh_contacts').select('contacts').eq('id',1).single();if(err)throw err;const contacts=(data?.contacts||[]).filter(c=>!c.deleted_at);window.FFH_PICK_ITEM({title:'App contacts · Send contact',items:contacts.map((c,i)=>({value:String(i),label:c.name,detail:[c.designation,c.whatsapp||c.phone].filter(Boolean).join(' · ')})),onSelect:async value=>{const c=contacts[+value],phone=c.whatsapp||c.phone||'';try{await send(selected,'Contact · '+c.name,null,null,{name:c.name,phone,designation:c.designation||'',email:c.email||''});}catch(err){error(err);}}});}catch(err){error(err);}}
function attachmentMenu(){if(!peer)return error(Error('Choose a staff member first'));const d=chatDialog('Attach to conversation','<div class="ffAttachmentGrid"><button type="button" data-attach="document">▤<span>Document</span></button><button type="button" data-attach="gallery">▧<span>Gallery · Photo / Video</span></button><button type="button" data-attach="catalogue">▣<span>Catalogue</span></button><button type="button" data-attach="contact">☏<span>App Contact</span></button><button type="button" data-attach="reports">▥<span>Event / Reports</span></button></div>');d.el.querySelectorAll('[data-attach]').forEach(b=>b.onclick=()=>{const action=b.dataset.attach;d.close();if(action==='contact')return shareChatContact();if(action==='catalogue')return catalogueAttachment();if(action==='reports')return reportAttachment();const input=$('#ffChatPhoto');input.accept=action==='gallery'?'image/jpeg,image/png,image/webp,video/mp4,video/webm,video/3gpp':'.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.vcf';input.click();});}
async function catalogueAttachment(){try{const rows=await ctx.catalogue();window.FFH_PICK_ITEM({title:'Catalogue · Select product PDF',items:[{value:'',label:'Full catalogue PDF',detail:rows.length+' products'},...rows.map(x=>({value:String(x.id),label:x.name,detail:[x.itemCode,x.category,x.pack].join(' · ')}))],onSelect:async id=>{const selected=peer;$('#ffChatStatus').textContent='Preparing catalogue PDF…';try{const file=await ctx.catalogueFile(id||null);if(peer===selected&&$('#ffChatForm')){chatAttachment.select(file);$('#ffChatStatus').textContent='PDF ready · tap Send';}}catch(err){error(err);}}});}catch(err){error(err);}}
function reportAttachment(){const selected=peer;const d=chatDialog('Event / Reports','<form class="form" data-report-share><label>Report<select name="report">'+window.FFH_REPORTS_CORE.names.map(n=>'<option>'+E(n)+'</option>').join('')+'</select></label><div class="two"><label>From<input name="from" type="date" required value="'+date().slice(0,7)+'-01"></label><label>To<input name="to" type="date" required value="'+date()+'"></label></div><label>Team / SR<select name="sr"><option value="">My permitted team</option>'+people.map(p=>'<option value="'+E(p.staff_id)+'">'+E(p.full_name)+'</option>').join('')+'</select></label><label>Chain / outlet search<input name="chain" placeholder="e.g. KK"></label><label>Format<select name="kind"><option value="pdf">PDF</option><option value="excel">Excel</option></select></label><button class="primary" type="submit">Prepare attachment</button><p role="status"></p></form>');d.el.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;const status=d.el.querySelector('[role=status]');status.textContent='Preparing report…';try{const f=Object.fromEntries(new FormData(e.target)),file=await ctx.reportFile(f.report,f.kind,{from:f.from,to:f.to,sr:f.sr,chain:f.chain});if(peer!==selected||!$('#ffChatForm'))throw Error('Conversation changed; retry');chatAttachment.select(file);d.close();$('#ffChatStatus').textContent='Report ready · tap Send';}catch(err){status.textContent=err.message;}finally{button.disabled=false;}};}
let liveShare=null,liveWatch=null,liveTimer=null,liveBusy=false,liveLast=0;
async function liveRpc(action,payload){const {data,error}=await sb.rpc('ffh_live_location',{action,payload});if(error)throw Error(error.message);return data;}
async function stopLiveShare(){const current=liveShare;liveShare=null;if(liveWatch!==null)navigator.geolocation.clearWatch(liveWatch);liveWatch=null;clearTimeout(liveTimer);liveTimer=null;updateLiveControl();if(current)await liveRpc('stop',{id:current.id});}
function updateLiveControl(){const b=$('#ffChatLocation');if(!b)return;b.classList.toggle('recording',!!liveShare);b.title=liveShare?'Stop live location':'Current or live location';b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed',String(!!liveShare));const hint=$('#ffChatStatus');if(hint&&liveShare)hint.textContent='Live location · tap the pin to stop';else if(hint?.textContent.startsWith('Live location'))hint.textContent='Live sharing stopped';}
function shareChatLocation(){if(liveShare){stopLiveShare().then(()=>loadMessages(false)).catch(error);return;}if(!peer)return error(Error('Choose a staff member first'));const selected=peer;const d=chatDialog('Share location','<p>Send to '+E(people.find(p=>p.staff_id===selected)?.full_name||selected)+'.</p><div class="ffChatActionMenu"><button class="secondary" data-location="current">📍 Send current location</button><button class="primary" data-location="live">◉ Share live for 15 minutes</button></div><p class="miniStat">Live updates while this app is open. Tap the location button to stop anytime. Sharing stops when the app is hidden.</p><p role="status"></p>');d.el.querySelectorAll('[data-location]').forEach(b=>b.onclick=async()=>{d.el.querySelectorAll('[data-location]').forEach(x=>x.disabled=true);const isLive=b.dataset.location==='live';d.el.querySelector('[role=status]').textContent='Getting location…';try{const loc=await fix();if(!d.el.isConnected||!user()||document.hidden)return;const sent=await send(selected,isLive?'◉ Live location':'📍 Current location',loc);if(isLive){await liveRpc('start',{id:sent.id});liveShare={id:sent.id,recipient:selected};liveLast=Date.now();liveWatch=navigator.geolocation.watchPosition(async p=>{if(!liveShare||liveBusy||Date.now()-liveLast<15000)return;const id=liveShare.id;liveBusy=true;try{await liveRpc('update',{id,latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy});liveLast=Date.now();await loadMessages(false);}catch(err){error(err);stopLiveShare().catch(console.warn);}finally{liveBusy=false;}},err=>{error(err);stopLiveShare().catch(console.warn);},{enableHighAccuracy:true,timeout:25000,maximumAge:0});liveTimer=setTimeout(()=>stopLiveShare().catch(error),15*60*1000);updateLiveControl();}d.close();await loadMessages(false);}catch(err){d.el.querySelector('[role=status]').textContent=err.message;d.el.querySelectorAll('[data-location]').forEach(x=>x.disabled=false);}});}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopLiveShare().catch(console.warn);});

async function loadMessages(announce=true){if(!user())return;const {data,error:err}=await sb.from('ffh_live_messages').select('*').or(`sender_staff_id.eq.${user().id},recipient_staff_id.eq.${user().id}`).order('created_at',{ascending:false}).limit(500);if(err)throw err;const seen=new Set(messages.map(m=>m.id));const incoming=(data||[]).filter(m=>m.recipient_staff_id===user().id&&!m.unsent_at&&!m.read_at&&!seen.has(m.id));let all=data||[];if(all.length===500){const me=user().id,known=new Set(all.map(m=>m.sender_staff_id===me?m.recipient_staff_id:m.sender_staff_id));const older=await Promise.all(people.filter(p=>p.staff_id!==me&&!known.has(p.staff_id)).map(async p=>{const {data,error}=await sb.from('ffh_live_messages').select('*').or(`and(sender_staff_id.eq.${me},recipient_staff_id.eq.${p.staff_id}),and(sender_staff_id.eq.${p.staff_id},recipient_staff_id.eq.${me})`).order('created_at',{ascending:false}).limit(1);if(error)throw error;return data||[];}));all=all.concat(older.flat());}messages=all.slice().reverse();lastUnread=messages.filter(m=>m.recipient_staff_id===user().id&&!m.unsent_at&&!m.read_at).length;const badge=$('[data-page="communication"] small');if(badge)badge.textContent=lastUnread?lastUnread+' unread messages':'Private staff messages';updateHome();if(page()==='communication'){drawContacts();if(peer&&!document.hidden)await drawThread();}else if(announce&&incoming.length)ctx.notice({title:'Live Communication',body:incoming[0].body,target_page:'communication'});}
let chatSearchOwner='',chatSearch='';
function renderCommunication(){if(chatSearchOwner!==user()?.id){chatSearchOwner=user()?.id;chatSearch='';contactZone='';}disposeMap();chatMedia?.shutdown();shell('communication',`<section class="ffChatFull ffMessenger"><header class="ffChatHeader"><div class="ffChatIdentity"><span class="ffChatOnlineDot"></span><div><strong>Live <span class="ffAccent">Communication</span></strong><small>Private team conversations</small></div></div><div class="two ffChatSelectors"><label><span aria-hidden="true">◎</span><select aria-label="Zone" id="ffChatZone"><option value="">All zones</option>${[...new Set(people.map(p=>p.zone_name||p.zone_id).filter(Boolean))].map(z=>`<option value="${E(z)}" ${contactZone===z?'selected':''}>${E(z)}</option>`).join('')}</select></label><label><span aria-hidden="true">♙</span><button type="button" class="ffSelectTrigger" id="ffChooseChatPerson" aria-label="Choose staff / search">All staff ▾</button></label></div><input id="ffContactSearch" hidden></header><div class="ffChatSearchBar" id="ffChatSearchBar" ${peer?'hidden':''}><label class="ffRefSearch"><input type="search" id="ffChatSearch" aria-label="Search chats" placeholder="Search staff or message…" value="${E(chatSearch)}"></label><button type="button" class="secondary" id="ffChatTeamNotices">Team Notices</button></div><div id="ffChatContacts" class="ffConversationList" aria-label="Recent conversations"></div><div class="ffChatConversation"><button type="button" class="secondary ffConversationsBack" id="ffConversationsBack">← Conversations</button><div class="cardTitle" id="ffChatTitle">Choose a staff member</div><button class="secondary" id="ffChatOlder" hidden>Earlier messages ↑</button><div id="ffChatThread" class="ffChatThread"><div class="ffChatWelcome"><span>✉</span><strong>Your team, one conversation away.</strong><small>Choose a colleague to send a message, document or voice note.</small></div></div></div><form class="form ffChatComposer" id="ffChatForm"><div id="ffChatPhotoPreview"></div><div class="ffChatInputRow"><button type="button" class="ffChatIcon" id="ffChatLocation" aria-label="Share current location" title="Location">${chatIcon('location')}</button><textarea name="body" maxlength="1800" rows="1" placeholder="Message…" aria-label="Message"></textarea><button type="button" class="ffChatIcon ffChatAttach" id="ffChatAttachMenu" aria-label="Attach file" title="Attachments">${chatIcon('attach')}</button><input id="ffChatPhoto" name="photo" type="file" hidden><button type="button" class="ffChatIcon" id="ffChatCancelAttachment" hidden aria-label="Clear attachment">${chatIcon('close')}</button><button type="button" class="ffChatIcon ffChatMic" id="ffChatRecord" aria-label="Hold to record voice message" title="Hold to record · release to send">${chatIcon('mic')}</button><button class="ffChatIcon ffChatSend" type="submit" aria-label="Send message" title="Send" hidden>${chatIcon('send')}</button></div><small id="ffChatRecordStatus" role="status"></small><small id="ffChatStatus" role="status"></small></form></section>`);
const form=$('#ffChatForm');$('#ffConversationsBack').onclick=()=>{if(history.state?.ffhChatPeer)history.back();else{peer=null;renderCommunication();}};let sending=false;const sendForm=async()=>{if(sending)return;const btn=form.querySelector('[type=submit]');sending=true;btn.disabled=true;try{if(!peer)throw Error('Choose a recipient');const selected=peer,text=form.elements.body.value.trim(),file=chatAttachment?.file();if(!text&&!file)throw Error('Write a message or choose an attachment');let media=null;try{if(file)media=await chatMedia.upload(file,selected);await send(selected,text||(media?.kind==='photo'?'Photo':media?.kind==='video'?'Video':media?.kind==='file'?media.name:'Voice message'),null,media);}catch(err){if(media)await chatMedia.remove(media.path).catch(()=>{});throw err;}form.elements.body.value='';chatAttachment?.clear();$('#ffChatStatus').textContent='Sent';}catch(err){error(err);throw err;}finally{sending=false;btn.disabled=false;}};
chatAttachment=chatMedia?.bind(form,{onVoiceSend:sendForm,canRecord:()=>!!peer&&!sending});const syncComposer=()=>{const ready=!!form.elements.body.value.trim()||!!form.querySelector('#ffChatPhotoPreview').childNodes.length;form.querySelector('.ffChatSend').hidden=!ready;form.querySelector('#ffChatRecord').hidden=ready;};form.addEventListener('input',syncComposer);form.elements.photo.addEventListener('change',()=>setTimeout(syncComposer));new MutationObserver(syncComposer).observe(form.querySelector('#ffChatPhotoPreview'),{childList:true});$('#ffChatAttachMenu').onclick=attachmentMenu;$('#ffChatZone').onchange=e=>{contactZone=e.target.value;drawContacts();};$('#ffChooseChatPerson').onclick=choosePerson;$('#ffChatSearch').oninput=e=>{chatSearch=e.target.value;drawContacts();};$('#ffChatTeamNotices').onclick=()=>ctx.open?.('notices');form.onsubmit=e=>{e.preventDefault();sendForm().catch(()=>{});};$('#ffChatLocation').onclick=shareChatLocation;$('#ffChatOlder').onclick=()=>drawThread(true).catch(error);updateLiveControl();drawContacts();if(peer)drawThread().catch(error);loadMessages(false).catch(error);}
function choosePerson(){const rows=people.filter(p=>p.staff_id!==user().id&&(!contactZone||(p.zone_name||p.zone_id)===contactZone));window.FFH_PICK_ITEM({title:'Choose staff · '+(contactZone||'All zones'),selected:peer,items:rows.map(p=>({value:p.staff_id,label:p.full_name,detail:[p.display_title||p.role,p.zone_name||p.zone_id,p.staff_id].filter(Boolean).join(' · ')})),onSelect:openPickedConversation});}
function openPickedConversation(id){let attempts=0;const open=()=>{if(page()!=='communication')return;if(history.state?.ffhOverlay){if(attempts++<50)setTimeout(open,20);else error(Error('Please choose the colleague again.'));return;}openConversation(id);};open();}
function openConversation(id){if(!people.some(p=>p.staff_id===id&&id!==user().id))return;peer=id;threadRows=[];history.pushState({ffhPage:'communication',ffhChatPeer:id},'',location.href);renderCommunication();}
window.addEventListener('popstate',e=>{if(page()!=='communication'||e.state?.ffhPage!=='communication'||(!peer&&!e.state?.ffhChatPeer))return;e.stopImmediatePropagation();peer=e.state?.ffhChatPeer||null;threadRows=[];renderCommunication();},true);
function drawContacts(){
 const button=$('#ffChooseChatPerson');if(button)button.textContent='New message / search ▾';
 const list=$('#ffChatContacts');if(!list)return;
 const messenger=$('.ffMessenger');messenger?.classList.toggle('ffConversationOpen',!!peer);
 list.hidden=!!peer;$('.ffChatConversation').hidden=!peer;$('#ffChatForm').hidden=!peer;
 const latest=new Map(),unread=new Map(),matching=new Set(),me=user().id,term=chatSearch.trim().toLowerCase();
 for(const m of messages){const id=m.sender_staff_id===me?m.recipient_staff_id:m.recipient_staff_id===me?m.sender_staff_id:null;if(!id||id===me)continue;if(term&&!m.unsent_at&&String(m.body||'').toLowerCase().includes(term))matching.add(id);const old=latest.get(id);if(!old||m.created_at>old.created_at)latest.set(id,m);if(m.recipient_staff_id===me&&!m.unsent_at&&!m.read_at)unread.set(id,(unread.get(id)||0)+1);}
 const rows=[...latest].filter(([id])=>people.some(p=>p.staff_id===id&&(!contactZone||(p.zone_name||p.zone_id)===contactZone)&&(!term||matching.has(id)||[p.full_name,p.staff_id,p.zone_name||p.zone_id].join(' ').toLowerCase().includes(term)))).sort((a,b)=>b[1].created_at.localeCompare(a[1].created_at));
 list.innerHTML=rows.map(([id,m])=>{const person=people.find(p=>p.staff_id===id),preview=m.unsent_at?'Message unsent':m.body||(m.location_context?'Location':m.contact_card?'Contact':m.media_type==='voice'?'Voice message':m.media_type==='video'?'Video':m.media_path||m.photo_path?'Attachment':'Message'),count=unread.get(id)||0;return `<button type="button" class="ffConversationRow ${count?'ffConversationUnread':''}" data-conversation="${E(id)}"><span class="ffConversationAvatar">${E(person.full_name?.trim().charAt(0)||id.charAt(0))}</span><span class="ffConversationPreview"><strong>${E(person.full_name||id)}</strong><small>${m.sender_staff_id===me?'You: ':''}${E(preview)}</small></span><span class="ffConversationMeta"><time>${E(new Date(m.created_at).toLocaleString('en-MY',{timeZone:'Asia/Kuala_Lumpur',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}))}</time>${count?`<b>${count}</b>`:''}</span></button>`;}).join('')||(term?'<div class="ffChatWelcome"><strong>No conversations match your search.</strong></div>':'<div class="ffChatWelcome"><span>✉</span><strong>No conversations yet</strong><small>Choose a colleague above to start a new message.</small></div>');
 list.querySelectorAll('[data-conversation]').forEach(b=>b.onclick=()=>openConversation(b.dataset.conversation));
}
let threadRows=[];
function messageMarkup(m){const own=m.sender_staff_id===user().id,loc=m.location_context,contact=m.contact_card;const phone=contact?.phone?.replace(/[^+0-9]/g,'')||'';const location=loc&&Number.isFinite(+loc.latitude)&&Number.isFinite(+loc.longitude)?`<a class="ffChatLocationCard" href="https://www.google.com/maps?q=${Number(loc.latitude)},${Number(loc.longitude)}" target="_blank" rel="noopener">${chatIcon('location')}<span>${loc.live_until?(Date.parse(loc.live_until)>Date.now()&&!loc.stopped_at?'Live location':'Live sharing ended'):'Current location'}<small>${Number(loc.latitude).toFixed(5)}, ${Number(loc.longitude).toFixed(5)}</small><small>${loc.captured_at?'Updated '+E(new Date(loc.captured_at).toLocaleTimeString('en-MY')):''}</small></span>↗</a>`:'';const card=contact?`<div class="ffChatContactCard">${chatIcon('contact')}<div><strong>${E(contact.name)}</strong><a href="tel:${E(phone)}">${E(contact.phone)}</a><small>${E(contact.designation||'')}</small>${phone?`<a href="https://wa.me/${E(phone.replace(/\D/g,''))}" target="_blank" rel="noopener">WhatsApp ↗</a>`:''}</div><button type="button" class="ffChatIcon" data-save-contact="${E(m.id)}" aria-label="Save contact">↓</button></div>`:'';return `<div data-chat-id="${E(m.id)}" data-chat-version="${E([m.body,m.edited_at,m.unsent_at,JSON.stringify(m.location_context)].join('|'))}" class="ffChatBubble ${own?'ffChatOwn':''} ${m.unsent_at?'ffChatUnsent':''}"><button type="button" class="ffChatMessageMenu ffChatIcon" data-chat-menu="${E(m.id)}" aria-label="Message options">${chatIcon('dots')}</button><span class="ffChatSender">${E(people.find(p=>p.staff_id===m.sender_staff_id)?.full_name||m.sender_staff_id)}</span><p>${E(m.body)}</p>${m.unsent_at?'':location+card+((m.media_path||m.photo_path)?`<div class="ffChatImageBox" data-chat-image="${E(m.id)}"><span>Loading attachment…</span></div>`:'')}<small data-chat-receipt="${E(m.id)}">${E(new Date(m.created_at).toLocaleString('en-MY'))}${m.edited_at?' · edited':''}${own?' · '+(m.read_at?'Read ✓✓':'Sent ✓'):''}</small></div>`;}
async function drawThread(older=false){const el=$('#ffChatThread');if(!el||!peer)return;const selected=peer;const before=older?threadRows[0]?.created_at:null;let query=sb.from('ffh_live_messages').select('*').or(`and(sender_staff_id.eq.${user().id},recipient_staff_id.eq.${selected}),and(sender_staff_id.eq.${selected},recipient_staff_id.eq.${user().id})`).order('created_at',{ascending:false}).limit(100);if(before)query=query.lt('created_at',before);const {data,error:err}=await query;if(err)throw err;if(peer!==selected||!el.isConnected)return;threadRows=older?[...(data||[]).reverse(),...threadRows]:(data||[]).reverse();$('#ffChatTitle').textContent=people.find(p=>p.staff_id===selected)?.full_name||selected;$('#ffChatOlder').hidden=(data||[]).length<100;const nearBottom=el.scrollHeight-el.scrollTop-el.clientHeight<80;const staged=document.createElement('div');staged.innerHTML=threadRows.map(messageMarkup).join('')||'<div class="empty">Start this conversation.</div>';const existing=new Map([...el.querySelectorAll('[data-chat-id]')].map(node=>[node.dataset.chatId,node])),keep=new Set(threadRows.map(m=>m.id));el.querySelectorAll('.empty,.ffChatWelcome').forEach(node=>node.remove());for(const [id,node] of existing)if(!keep.has(id))node.remove();let anchor=null;for(const node of [...staged.children].reverse()){const prior=existing.get(node.dataset.chatId);if(prior&&keep.has(node.dataset.chatId)){if(prior.dataset.chatVersion!==node.dataset.chatVersion){prior.replaceWith(node);anchor=node;}else anchor=prior;}else{el.insertBefore(node,anchor);anchor=node;}}
for(const m of threadRows){const bubble=[...el.querySelectorAll('[data-chat-id]')].find(n=>n.dataset.chatId===m.id),receipt=bubble?.querySelector('[data-chat-receipt]');if(receipt)receipt.textContent=new Date(m.created_at).toLocaleString('en-MY')+(m.edited_at?' · edited':'')+(m.sender_staff_id===user().id?' · '+(m.read_at?'Read ✓✓':'Sent ✓'):'');const menu=bubble?.querySelector('[data-chat-menu]');if(menu)menu.onclick=()=>chatMessageMenu(m);const save=bubble?.querySelector('[data-save-contact]');if(save)save.onclick=async()=>{const safe=v=>String(v).replace(/[\\;:]/g,' ').replace(/[\r\n]/g,' ');const card='BEGIN:VCARD\r\nVERSION:3.0\r\nFN:'+safe(m.contact_card.name)+'\r\nTEL:'+safe(m.contact_card.phone)+'\r\nEND:VCARD\r\n';try{await ctx.download(new Blob([card],{type:'text/vcard'}),'Contact.vcf');}catch(err){error(err);}};}
await chatMedia?.draw(el,threadRows,()=>peer===selected);if(!older&&nearBottom)el.scrollTop=el.scrollHeight;if((data||[]).some(m=>m.recipient_staff_id===user().id&&!m.unsent_at&&!m.read_at)){await rpc('read',{peer:selected});const at=new Date().toISOString();messages.forEach(m=>{if(m.sender_staff_id===selected&&m.recipient_staff_id===user().id&&!m.read_at)m.read_at=at;});lastUnread=messages.filter(m=>m.recipient_staff_id===user().id&&!m.unsent_at&&!m.read_at).length;drawContacts();updateHome();}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)return;if(active()&&!native())startWeb();refresh().catch(console.warn)});
window.addEventListener('ffh-native-status',e=>{if($('#ffDutyStatus'))$('#ffDutyStatus').textContent=String(e.detail?.message||'');});
return{init,shutdown,refresh,gate,attendance:renderAttendance,tracking:()=>renderTracking().catch(error),communication:()=>{peer=null;threadRows=[];renderCommunication();},canTrack:()=>!!state?.can_track,updateHome,syncNativeIdentity,resume:()=>{stopWeb();return active()?startTracking():Promise.resolve()}};
};
