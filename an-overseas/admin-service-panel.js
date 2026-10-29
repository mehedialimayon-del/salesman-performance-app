(function(){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sl=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const an=()=>window.ANLive;
const db=()=>an()?.db;
const admin=()=>!!an()?.isAdmin;
const validFile=f=>f instanceof File&&f.size>0;
const statuses=['requested','reviewing','quoted','approved','in_progress','completed','cancelled'];
const elmsg=(text)=>{const x=document.getElementById('an-admin-note');if(x)x.textContent=text;};
const prices=async()=>{
 if(!admin())return '<p>Administrator login required.</p>';
 const live=await db().from('an_site_content').select('value').eq('key','service_prices').maybeSingle();if(live.error)throw live.error;
 const saved=Array.isArray(live.data?.value)?live.data.value:[];
 const services=(typeof serviceList!=='undefined'?serviceList:[]).filter(v=>Array.isArray(v)&&v[1]&&!/bus.ticket/i.test(v[1]));
 return '<section class="live-panel"><h2><span style="color:#ff931b">Service</span> Reference Pricing</h2><p>Publish optional indicative prices only. Students can select services freely, but each request needs an individual admin quotation. Do not publish unconfirmed prices.</p><form id="an-service-prices-form">'+services.map(x=>{
  const key=sl(x[1]),row=saved.find(r=>r.service_key===key)||{};
  return '<div class="live-msg an-admin-price" data-service-price="'+esc(key)+'"><b>'+esc(x[0])+' '+esc(x[1])+'</b><div class="live-fieldgrid"><label>Reference amount (optional)<input type="number" min="0" step="0.01" name="amount-'+esc(key)+'" value="'+(row.amount==null?'':Number(row.amount))+'" placeholder="No rate published"></label><label>Currency<select name="currency-'+esc(key)+'">'+['MYR','USD','BDT'].map(c=>'<option '+(row.currency===c?'selected':'')+'>'+c+'</option>').join('')+'</select></label></div><label><input type="checkbox" name="enabled-'+esc(key)+'" style="width:auto" '+(row.enabled===true?'checked':'')+'> Show price on student selection</label></div>';
 }).join('')+'<p class="an-service-price-footnote">This is a reference price only, not an automatic charge. A student’s personal quote is controlled in Service Requests.</p><button class="btn" type="submit">Publish Reference Prices</button></form></section>';
};
const requests=async()=>{
 if(!admin())return '<p>Administrator login required.</p>';
 const [req,apps,history]=await Promise.all([
 db().from('an_service_requests').select('id,application_id,user_id,service_key,service_title,status,progress,amount,currency,admin_note,receipt_path,photo_path,created_at').order('created_at',{ascending:false}).limit(250),
 db().from('an_applications').select('id,applicant_name,university_id').limit(500),
 db().from('an_service_updates').select('request_id,title,created_at').order('created_at',{ascending:false}).limit(500)
 ]);
 for(const v of [req,apps,history])if(v.error)throw v.error;
 const records=req.data||[],appsById=new Map((apps.data||[]).map(a=>[a.id,a]));
 return '<section class="live-panel"><h2><span style="color:#ff9323">Student</span> Service Requests</h2><p>Set a personal quotation, progress percentage, and status. Upload private receipts and progress photos; only the linked student and authorised admin can access them.</p><p><strong>'+records.length+'</strong> requests</p></section>'+
 (records.length?records.map(r=>{
 const student=appsById.get(r.application_id),historyCount=(history.data||[]).filter(x=>x.request_id===r.id).length;
 return '<form class="an-admin-req" data-an-admin-request="'+esc(r.id)+'" data-owner="'+esc(r.user_id)+'"><h3>'+esc(r.service_title)+'</h3><p>'+esc(student?.applicant_name||'Student')+' • '+esc(student?.university_id||'')+' • '+esc(r.created_at.slice(0,10))+' • '+historyCount+' logged updates</p><div class="live-fieldgrid">'+
 '<label>Status<select name="status">'+statuses.map(x=>'<option value="'+x+'" '+(r.status===x?'selected':'')+'>'+esc(x.replace(/_/g,' '))+'</option>').join('')+'</select></label>'+
 '<label>Progress (%)<input name="progress" type="number" min="0" max="100" step="1" value="'+Number(r.progress||0)+'" required></label>'+
 '<label>Quoted Amount<input name="amount" type="number" min="0" step="0.01" placeholder="Not quoted yet" value="'+(r.amount==null?'':Number(r.amount))+'"></label>'+
 '<label>Currency<select name="currency">'+['MYR','USD','BDT'].map(x=>'<option '+(r.currency===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label>'+
 '<label>Update Title<input name="title" maxlength="150" placeholder="e.g. Quotation ready / Pickup booked"></label>'+
 '<label>Internal/Student Update<textarea name="message" maxlength="3000" placeholder="What has been completed, what is next?">'+esc(r.admin_note||'')+'</textarea></label>'+
 '<label>Upload Receipt (PDF or image)<input name="receipt" type="file" accept="application/pdf,image/png,image/jpeg,image/webp"></label>'+
 '<label>Upload Progress Photo (JPG/PNG/WebP)<input name="photo" type="file" accept="image/png,image/jpeg,image/webp"></label></div>'+
 '<div class="an-private-actions">'+(r.receipt_path?'<button type="button" data-an-admin-file="'+esc(r.receipt_path)+'">Existing Receipt ↗</button>':'')+(r.photo_path?'<button type="button" data-an-admin-file="'+esc(r.photo_path)+'">Existing Photo ↗</button>':'')+'</div>'+
 '<label><input type="checkbox" name="create_invoice" style="width:auto"> Also create a pending student invoice for this confirmed amount (only once)</label>'+
 '<button class="btn" type="submit">Save Quote, Progress & Files</button><p class="an-service-price-footnote">Uploading a receipt does not automatically mark an invoice paid. Mark payment only after verification.</p></form>';
 }).join(''):'<div class="live-panel"><p>No student has requested an optional service yet.</p></div>');
};
async function upload(file,user,request,kind){
 if(!validFile(file))return null;
 const media=['image/jpeg','image/png','image/webp','application/pdf'];
 if(!media.includes(file.type)||file.size>10*1024*1024)throw Error('Please use PDF/JPG/PNG/WebP below 10 MB.');
 if(kind==='photo'&&file.type==='application/pdf')throw Error('Progress photo must be an image.');
 const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf'}[file.type];
 const path=user+'/'+request+'/'+kind+'-'+crypto.randomUUID()+'.'+ext;
 const {error}=await db().storage.from('an-service-files').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'private, max-age=0'});
 if(error)throw error;return path;
}
async function refresh(){if(window.ANRenderAdmin)window.ANRenderAdmin();}
document.addEventListener('submit',async e=>{
 const f=e.target;if(!admin()||!location.hash.startsWith('#/admin')||!['an-service-prices-form'].includes(f.id)&&!f.matches('[data-an-admin-request]'))return;
 e.preventDefault();e.stopImmediatePropagation();
 const b=f.querySelector('button[type=submit]');if(b)b.disabled=true;
 try{
  if(f.id==='an-service-prices-form'){
   const rows=[...f.querySelectorAll('[data-service-price]')].map(el=>{
    const key=el.dataset.servicePrice,amount=el.querySelector('[name="amount-'+key+'"]').value;
    const val=amount.trim()===''?null:Number(amount);
    if(val!==null&&(!Number.isFinite(val)||val<0))throw Error('Invalid service price');
    return {service_key:key,amount:val,currency:el.querySelector('[name="currency-'+key+'"]').value,enabled:val!==null&&!!el.querySelector('[name="enabled-'+key+'"]').checked};
   });
   const {error}=await db().from('an_site_content').upsert({key:'service_prices',value:rows,updated_by:an().user.id,updated_at:new Date().toISOString()},{onConflict:'key'});if(error)throw error;
   an().servicePrices=rows;elmsg('Reference service prices published. Individual quotes remain editable per student.');
  }else{
   const fd=new FormData(f),val=k=>String(fd.get(k)||'').trim(),user=f.dataset.owner,id=f.dataset.anAdminRequest;
   const amount=val('amount')===''?null:Number(val('amount')),progress=Number(val('progress'));
   if(amount!==null&&(!Number.isFinite(amount)||amount<0))throw Error('Amount must be a non-negative number');
   if(!Number.isInteger(progress)||progress<0||progress>100)throw Error('Progress must be a whole number from 0 to 100');
   if(!statuses.includes(val('status')))throw Error('Invalid service status');
   let {data:old,error:readErr}=await db().from('an_service_requests').select('receipt_path,photo_path,service_title,application_id,user_id').eq('id',id).single();if(readErr)throw readErr;
   if(old.user_id!==user)throw Error('Student ownership mismatch');
   const receipt=await upload(fd.get('receipt'),user,id,'receipt')||old.receipt_path;
   const photo=await upload(fd.get('photo'),user,id,'photo')||old.photo_path;
   const payload={amount,currency:val('currency'),status:val('status'),progress,admin_note:val('message'),receipt_path:receipt,photo_path:photo,updated_at:new Date().toISOString()};
   const {error}=await db().from('an_service_requests').update(payload).eq('id',id);if(error)throw error;
   const label=val('title')||'Service update';
   const {error:evErr}=await db().from('an_service_updates').insert({request_id:id,user_id:user,title:label,message:val('message'),progress,receipt_path:receipt,photo_path:photo});
   if(evErr)throw evErr;
   if(fd.get('create_invoice')==='on'){
    if(amount===null||amount<=0)throw Error('Enter a confirmed amount before issuing an invoice');
    const {data:existing,error:checkError}=await db().from('an_invoices').select('id').eq('user_id',user).ilike('note','%SERVICE REQUEST: '+id+'%').limit(1);if(checkError)throw checkError;
    if(existing.length)throw Error('An invoice already exists for this service request. Updates saved without creating a duplicate.');
    const {error:iErr}=await db().from('an_invoices').insert({user_id:user,title:old.service_title+' — Optional Service',amount,currency:val('currency'),status:'pending',note:'SERVICE REQUEST: '+id});if(iErr)throw iErr;
   }
   elmsg('Service quote, status, progress, receipt and photo saved for the linked student.');
   const forms=f.closest('#admin-body');if(forms){const success=document.createElement('p');success.textContent='✓ Update saved. Refresh Service Requests to view the latest details.';success.style.color='#ffab4e';f.appendChild(success);}
  }
 }catch(err){elmsg('Could not save: '+String(err.message||err));}finally{if(b)b.disabled=false;}
},true);
document.addEventListener('click',async e=>{
 if(!admin()||!location.hash.startsWith('#/admin'))return;
 const btn=e.target.closest('[data-an-admin-file]');if(!btn)return;
 e.preventDefault();btn.disabled=true;
 try{const {data,error}=await db().storage.from('an-service-files').createSignedUrl(btn.dataset.anAdminFile,90);if(error)throw error;window.open(data.signedUrl,'_blank','noopener,noreferrer');}
 catch(err){elmsg('Cannot open private file: '+String(err.message||err));}finally{btn.disabled=false;}
},true);
window.ANServiceAdmin={prices,requests};
})();