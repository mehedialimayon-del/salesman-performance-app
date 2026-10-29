/* Mobile-friendly monthly claim dashboard. Existing claim/approval screens remain intact. */
(function(root){'use strict';
const app=document.getElementById('app');
const CATS=['Fuel Expenses','Buyer Entertainment','Team Building','Training','Others'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>'RM '+Number(n||0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
const sb=()=>root.FFH_SUPABASE;
let overlay=null,observerBusy=false;
async function rpc(action,payload){const {data,error}=await sb().rpc('ffh_claims_api',{action,payload:payload||{}});if(error)throw Error(error.message);return data}
async function profile(){const r=await sb().rpc('ffh_my_staff_id');if(r.error||!r.data)throw Error('Approved login required');return String(r.data)}
function close(){overlay?.remove();overlay=null;document.body.classList.remove('ffMonthlyOverlayOpen')}
function popup(){close();overlay=document.createElement('div');overlay.className='ffMonthlyOverlay';overlay.innerHTML='<section class="ffMonthlySheet" role="dialog" aria-label="Monthly Digital Claim"><header><div><small>FIELDFORCE HUB · EXPENSE CLAIM</small><h2>Monthly Digital Claim</h2></div><button type="button" class="ffMonthlyClose" aria-label="Close">✕</button></header><div class="ffMonthlyScroll"><p>Loading claim records…</p></div></section>';document.body.appendChild(overlay);document.body.classList.add('ffMonthlyOverlayOpen');overlay.querySelector('.ffMonthlyClose').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close()};return overlay.querySelector('.ffMonthlyScroll')}
function monthDefault(){const active=document.querySelector('#ffClaimMonth')?.value;if(/^\d{4}-(0[1-9]|1[0-2])$/.test(active||''))return active;const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit'}).formatToParts(new Date());return p.find(x=>x.type==='year').value+'-'+p.find(x=>x.type==='month').value}
async function signed(path){
 const {data,error}=await sb().storage.from('ffh-expenses').createSignedUrl(path,3600);
 if(error||!data?.signedUrl)throw Error(error?.message||'Receipt access failed');
 return data.signedUrl;
}
async function viewReceipt(path){try{const url=await signed(path),a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.click()}catch(e){alert(e.message)}}
async function openMonthly(month){
 const box=popup();
 try{
  const user=await profile(),state=await rpc('state');
  const range=root.FFH_CLAIM_MONTHLY.monthBounds(month);
  const mine=(state.receipts||[]).filter(r=>r.expense_date?.startsWith(month));
  const myClaims=(state.claims||[]).filter(c=>c.owner_staff_id===user&&c.claim_month===month);
  const buyerLines=myClaims.filter(c=>c.kind==='Buyer Entertainment Bill'&&c.status!=='Rejected').flatMap(c=>
   (c.lines||[]).filter(l=>!l.receipt_id).map(l=>Object.assign({},l,{id:'buyer:'+l.id,category:l.category||'Buyer Entertainment'}))
  );
  const all=mine.concat(buyerLines).sort((a,b)=>String(a.expense_date).localeCompare(String(b.expense_date)));
  const grouped=root.FFH_CLAIM_MONTHLY.groupRows(all);
  const approved=root.FFH_CLAIM_MONTHLY.approvedForAll(all,myClaims,month);
  const used=new Set(myClaims.filter(c=>c.status!=='Rejected').flatMap(c=>(c.lines||[]).map(l=>l.receipt_id).filter(Boolean)));
  const pending=mine.filter(r=>!used.has(r.id));
  let people=[];try{const r=await sb().rpc('ffh_duty',{action:'directory',payload:{}});people=Array.isArray(r.data)?r.data:[]}catch(_){}
  const staff=people.find(p=>p.staff_id===user)?.full_name||user;
  const receiptRows=all.map(r=>'<article class="ffMonthlyReceipt"><div><strong>'+esc(r.expense_date)+' · '+esc(r.category||'Others')+'</strong><small>'+esc(r.reason||'')+'</small></div><b>'+fmt(r.amount)+'</b>'+(r.receipt_path?'<button type="button" class="ffMonthlyView" data-path="'+esc(r.receipt_path)+'">RECEIPT</button>':'<small class="ffMonthlyNoReceipt">NO RECEIPT</small>')+'</article>').join('');
  const categories=grouped.groups.map(g=>'<div class="ffMonthlyGroup"><div><strong>'+esc(g.category)+'</strong><small>'+g.items.length+' expense(s)'+(g.reasons.length?' · '+esc(g.reasons.join('; ').slice(0,80)):'')+'</small></div><b>'+fmt(g.total)+'</b></div>').join('');
  const status=approved?'APPROVED BY MANAGER':'DRAFT · APPROVAL PENDING';
  box.innerHTML='<div class="ffMonthlyIntro"><label>Claim Month<input id="ffMonthlyDate" type="month" value="'+esc(month)+'"></label><p>Expense period: '+range.from+' to '+range.to+'</p><div class="ffMonthlyTotal"><span>Grand Total · '+grouped.count+' expense(s)</span><strong>'+fmt(grouped.grandTotal)+'</strong><small>'+status+'</small></div></div><div class="ffMonthlySection"><h3>Category Summary</h3>'+(categories||'<p>No expenses saved this month.</p>')+'</div><div class="ffMonthlySection"><h3>Receipt History</h3>'+(receiptRows||'<p>No receipts yet.</p>')+'</div><div class="ffMonthlyActions"><button type="button" id="ffMonthlyExport" '+(grouped.count?'':'disabled')+'>⬇ DOWNLOAD ORIGINAL FORM + ALL RECEIPTS</button><button type="button" id="ffMonthlySubmit" '+(pending.length?'':'disabled')+'>SUBMIT '+pending.length+' NEW RECEIPTS FOR APPROVAL</button></div><p id="ffMonthlyStatus" role="status">The original uploaded company Claim PDF remains the first page. Only a real Manager approval adds the approval signature.</p><div id="ffMonthlySubmitPanel" hidden></div>';
  box.querySelector('#ffMonthlyDate').onchange=e=>openMonthly(e.target.value);
  box.querySelectorAll('.ffMonthlyView').forEach(b=>b.onclick=()=>viewReceipt(b.dataset.path));
  const progress=box.querySelector('#ffMonthlyStatus');
  const exportButton=box.querySelector('#ffMonthlyExport');
  exportButton.onclick=async()=>{
   exportButton.disabled=true;progress.textContent='Preparing original company Claim Form…';
   try{
    const result=await root.FFH_EXPORT_MONTHLY_CLAIM({month,receipts:all,templateUrl:state.template?.pdf_url,
      staff,claims:myClaims,signed,download:root.FFH_CLAIM_DOWNLOAD_FILE,onProgress:s=>progress.textContent=s});
    progress.textContent='PDF saved · '+fmt(result.grandTotal)+' · '+result.pages+' pages · '+(result.approved?'APPROVED':'DRAFT');
   }catch(e){progress.textContent='Download failed: '+e.message}
   finally{exportButton.disabled=false}
  };
  const submitButton=box.querySelector('#ffMonthlySubmit'),panel=box.querySelector('#ffMonthlySubmitPanel');
  submitButton.onclick=()=>{
   const eligible=people.filter(p=>p.staff_id!==user&&p.active!==false&&(p.can_manage||p.staff_id==='M21954'));
   if(!eligible.length){progress.textContent='No separate active Manager available to review this claim';return}
   panel.hidden=false;panel.innerHTML='<form id="ffMonthlySubmitForm"><label>Reviewing Manager<select name="reviewer" required>'+eligible.map(p=>'<option value="'+esc(p.staff_id)+'">'+esc(p.full_name||p.staff_id)+'</option>').join('')+'</select></label><label>Claim Details<textarea name="details" required maxlength="2000">Monthly company expense claim '+esc(month)+'</textarea></label><button type="submit">SUBMIT MONTH FOR MANAGER APPROVAL</button><p role="status" id="ffMonthlySubmitStatus"></p></form>';
   panel.querySelector('form').onsubmit=async e=>{
    e.preventDefault();const b=e.submitter,fd=new FormData(e.currentTarget);b.disabled=true;
    try{
     const response=await rpc('submit',{kind:'Expense Claim',claim_month:month,title:'Monthly Expense Claim · '+month,
      details:String(fd.get('details')||'Monthly expense claim'),reviewer_staff_id:fd.get('reviewer'),receipt_ids:pending.map(r=>r.id),manual_lines:[]});
     progress.textContent='Submitted for Manager approval: '+(response.id||'Claim created')+'. Approval signature remains blank until approved.';
     await openMonthly(month);
    }catch(err){panel.querySelector('#ffMonthlySubmitStatus').textContent=err.message;b.disabled=false}
   };
  };
 }catch(e){box.innerHTML='<div class="ffMonthlyError"><strong>Monthly Claim could not open</strong><p>'+esc(e.message)+'</p><button type="button">TRY AGAIN</button></div>';box.querySelector('button').onclick=()=>openMonthly(month)}
}
function enhance(){
 if(observerBusy)return;observerBusy=true;
 try{
  const form=app?.querySelector('#ffReceiptForm');
  if(form&&!form.querySelector('.ffExpenseCategory')){
   const first=form.querySelector('label');if(first){
    const holder=document.createElement('div');holder.className='ffCategoryChoice';
    holder.innerHTML='<label>Expense Category<select name="category" class="ffExpenseCategory" required>'+CATS.map(c=>'<option value="'+c+'">'+c+'</option>').join('')+'</select></label><label class="ffClaimOther" hidden>Other Category<input name="custom_category" maxlength="80" placeholder="e.g. New AC Training"></label>';
    first.before(holder);holder.querySelector('select').onchange=e=>{holder.querySelector('.ffClaimOther').hidden=e.target.value!=='Others'};
   }
  }
  const controls=app?.querySelector('.ffCatDownloads #ffClaimPdf')?.closest('.ffCatDownloads');
  if(controls&&!controls.querySelector('#ffClaimMonthly')){
   const b=document.createElement('button');b.type='button';b.id='ffClaimMonthly';b.className='primary';b.textContent='◷ MONTHLY DIGITAL CLAIM';
   b.onclick=()=>openMonthly(monthDefault());
   controls.appendChild(b);
  }
 }finally{observerBusy=false}
}
if(app){new MutationObserver(enhance).observe(app,{childList:true,subtree:true});enhance()}
root.FFH_OPEN_MONTHLY_CLAIM=openMonthly;
})(window);