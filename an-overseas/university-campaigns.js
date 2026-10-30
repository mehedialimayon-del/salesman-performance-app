/* A&N university PDF, published scholarships and support centre. */
(function(){
'use strict';
const X=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'" :'&#39;'}[c]));
const S=()=>window.ANLive||{};
const db=()=>S().db;
const uni=()=>typeof U!=='undefined'?U:[];
const validPercent=n=>Number.isFinite(Number(n))&&Number(n)>0&&Number(n)<=100;
const scholarships=()=>Array.isArray(S().scholarships)?S().scholarships.filter(x=>x.active===true&&validPercent(x.percent)&&(!x.expires||Date.parse(x.expires+'T23:59:59')>=Date.now())):[];
const costings=()=>Array.isArray(S().universityCostings)?S().universityCostings.filter(x=>x?.university_id&&/^https:\/\//.test(x.pdf_url||'')):[];
const scholarship=id=>scholarships().filter(x=>x.university_id===id).sort((a,b)=>Number(b.percent)-Number(a.percent))[0]||null;
const costing=id=>costings().find(x=>x.university_id===id)||null;
const badge=id=>{const p=scholarship(id);return p?'<span class="an-uni-discount" title="Published scholarship, subject to eligibility">🎓 '+Number(p.percent)+'% Scholarship</span>':''};
const pdf=id=>{
 const row=costing(id);
 return '<section class="an-uni-feature"><div class="an-uni-feature-icon">📄</div><div class="an-uni-feature-copy"><div class="an-uni-eyebrow">SEMESTER COSTING DOCUMENT</div><h2><span>Semester Fees</span> & Costing PDF</h2>'+(row?'<p>'+X(row.title||'Official semester fee schedule')+(row.semester?' · '+X(row.semester):'')+'. This is the latest document published by A&N; university fees may change.</p><div class="an-uni-pdf-buttons"><a href="'+X(row.pdf_url)+'" target="_blank" rel="noopener noreferrer">👁 View PDF ↗</a><a href="'+X(row.pdf_url)+'" target="_blank" rel="noopener noreferrer" download="Semester-Costing.pdf">⬇ Download PDF</a></div><small>Last updated: '+X(row.updated_at?new Date(row.updated_at).toLocaleDateString('en-MY'):'Not specified')+' · Verify the official fee schedule before making any payment.</small>':'<p>The latest semester costing PDF has not been uploaded yet. A&N will publish it here when available. Please contact us for the current university quotation.</p><a class="an-uni-feature-link" href="#/contact">Request Costing Information →</a>')+'</div></section>';
};
const offer=id=>{const p=scholarship(id);return p?'<section class="an-uni-feature an-uni-offer"><div class="an-uni-feature-icon">🎓</div><div class="an-uni-feature-copy"><div class="an-uni-eyebrow">PUBLISHED SCHOLARSHIP</div><h2><span>'+Number(p.percent)+'% Scholarship</span> Opportunity</h2><p>'+X(p.title||'University scholarship')+'. '+X(p.details||'Eligibility and conditions vary by programme.')+'</p><p>A&N can help you check eligibility, compile documents and follow the official scholarship process. Final awards depend on the university.</p></div></section>':''};
const support=u=>'<section class="an-uni-feature an-uni-support"><img class="an-support-logo" src="assets/brand-logo.jpg" alt="A&N Overseas Education and Consultancy logo"><div class="an-uni-feature-copy"><div class="an-uni-eyebrow">A&N OVERSEAS EDUCATION & CONSULTANCY</div><h2><span>We Are Here</span> For Your Journey</h2><p>For students applying to '+X(u.name)+', our team can help with university shortlisting, document review, application guidance, student visa preparation, accommodation, airport pickup planning, travel assistance and arrival support.</p><div class="an-support-list"><span>✓ Admissions</span><span>✓ Student Visa Guidance</span><span>✓ Accommodation</span><span>✓ Airport Pickup</span><span>✓ Documents</span><span>✓ Student Support</span></div>'+(String(u.kind).toLowerCase()==='private'?'<div class="an-free-ticket">✈️ <strong>FREE AIR TICKET OFFER</strong><span>Students applying to a Private University through A&N Overseas can enquire about our Free Air Ticket promotion. Confirm full offer terms, eligible route and ticket conditions with A&N before booking.</span></div>':'')+'<a class="an-uni-feature-link" href="#/contact">Get A&N Assistance →</a></div></section>';
const portfolio=u=>'<div class="an-university-extras">'+pdf(u.id)+offer(u.id)+support(u)+'</div>';
const opts=()=>uni().map(u=>'<option value="'+X(u.id)+'">'+X(u.short||u.name)+' — '+X(u.name)+'</option>').join('');
async function content(key){const {data,error}=await db().from('an_site_content').select('value').eq('key',key).maybeSingle();if(error)throw error;return Array.isArray(data?.value)?data.value:[]}
async function publish(key,value){const {error}=await db().from('an_site_content').upsert({key,value,updated_by:S().user.id,updated_at:new Date().toISOString()},{onConflict:'key'});if(error)throw error;if(key==='scholarships')S().scholarships=value;if(key==='university_costing')S().universityCostings=value;}
const adminUI=async()=>{
 if(!S().isAdmin)return '<p>Administrator permission required.</p>';
 const [sch,pdfs]=await Promise.all([content('scholarships'),content('university_costing')]);
 const list=sch.map(x=>'<div class="an-admin-uni-row"><strong>'+X(uni().find(u=>u.id===x.university_id)?.name||x.university_id)+'</strong> — '+X(x.percent)+'% <small>'+X(x.title||'Scholarship')+'</small> <span>'+(x.active?'Published':'Hidden')+'</span> <button type="button" data-an-remove-sch="'+X(x.university_id)+'">Remove Scholarship</button></div>').join('')||'<p>No published scholarship badges yet.</p>';
 const fees=pdfs.map(x=>'<div class="an-admin-uni-row"><strong>'+X(uni().find(u=>u.id===x.university_id)?.name||x.university_id)+'</strong> — '+X(x.semester||'Semester Costing')+' <a href="'+X(x.pdf_url)+'" target="_blank" rel="noopener noreferrer">Open PDF</a> <button type="button" data-an-remove-pdf="'+X(x.university_id)+'">Remove PDF Card</button></div>').join('')||'<p>No semester costing PDFs uploaded yet.</p>';
 const sel=opts();
 return '<section class="live-panel an-uni-admin"><h2><span>Scholarship</span> Badge Publisher</h2><p>Publish a percentage for a specific university. When removed, the badge and Scholarship filter result disappear. Do not publish unconfirmed discounts.</p><form id="an-admin-scholarship"><div class="live-fieldgrid"><label>University<select name="university_id" required>'+sel+'</select></label><label>Scholarship Percentage<input type="number" name="percent" min="1" max="100" step="1" required placeholder="e.g. 30"></label><label>Offer Title<input type="text" name="title" maxlength="140" placeholder="e.g. Merit Scholarship" required></label><label>Details / eligibility<textarea name="details" maxlength="900" placeholder="Official eligibility and conditions"></textarea></label><label>Expiry Date (optional)<input name="expires" type="date"></label></div><button class="btn mt" type="submit">Publish Scholarship</button></form><h3>Existing Scholarships</h3>'+list+'</section>'+
 '<section class="live-panel an-uni-admin"><h2><span>Semester Costing</span> PDF Publisher</h2><p>Upload the latest university semester costs in PDF format. It replaces that university’s visible PDF card while retaining other universities. Max 15 MB.</p><form id="an-admin-semester-pdf"><div class="live-fieldgrid"><label>University<select name="university_id" required>'+sel+'</select></label><label>Semester / Intake<input name="semester" type="text" maxlength="90" placeholder="e.g. Semester 1 / 2027"></label><label>Document Title<input name="title" type="text" maxlength="140" placeholder="Tuition and Semester Costing" required></label><label>Upload Fee PDF<input name="pdf" type="file" accept="application/pdf,.pdf" required></label></div><button type="submit" class="btn mt">Upload & Publish Semester Costing PDF</button></form><h3>Published Semester PDFs</h3>'+fees+'</section>';
};
async function refreshAdmin(){const el=document.getElementById('admin-body');if(el&&S().isAdmin&&location.hash.startsWith('#/admin')){el.innerHTML=await adminUI();}}
async function runUpload(file,universityId){if(!(file instanceof File)||file.type!=='application/pdf'||!file.size||file.size>15*1024*1024)throw Error('Choose a PDF file smaller than 15 MB');const path='university-fees/'+universityId+'-'+crypto.randomUUID()+'.pdf';const b=db().storage.from('an-public-media');const {error}=await b.upload(path,file,{contentType:'application/pdf',cacheControl:'1800',upsert:false});if(error)throw error;return b.getPublicUrl(path).data.publicUrl}
document.addEventListener('submit',async e=>{
 const f=e.target;if(!S().isAdmin||!location.hash.startsWith('#/admin')||!['an-admin-scholarship','an-admin-semester-pdf'].includes(f.id))return;
 e.preventDefault();e.stopImmediatePropagation();
 const btn=f.querySelector('[type=submit]');if(btn)btn.disabled=true;
 const old=btn?.textContent;if(btn)btn.textContent='Publishing...';
 try{const fd=new FormData(f),id=String(fd.get('university_id')||'');if(!uni().some(x=>x.id===id))throw Error('Unknown university');
 if(f.id==='an-admin-scholarship'){const pct=Number(fd.get('percent'));if(!validPercent(pct))throw Error('Percentage must be between 1 and 100');const oldRows=await content('scholarships');const record={university_id:id,percent:pct,title:String(fd.get('title')||'').slice(0,140),details:String(fd.get('details')||'').slice(0,900),expires:String(fd.get('expires')||''),active:true};await publish('scholarships',[...oldRows.filter(x=>x.university_id!==id),record]);}
 else{const file=fd.get('pdf');const url=await runUpload(file,id);const oldRows=await content('university_costing');const record={university_id:id,pdf_url:url,semester:String(fd.get('semester')||'').slice(0,90),title:String(fd.get('title')||'').slice(0,140),updated_at:new Date().toISOString()};await publish('university_costing',[...oldRows.filter(x=>x.university_id!==id),record]);}
 await refreshAdmin();
 }catch(err){alert('Could not publish: '+String(err?.message||err))}
 finally{if(btn){btn.disabled=false;btn.textContent=old||'Publish';}}
},true);
document.addEventListener('click',async e=>{
 const btn=e.target.closest('[data-an-remove-sch],[data-an-remove-pdf]');
 if(!btn||!S().isAdmin||!location.hash.startsWith('#/admin'))return;
 e.preventDefault();const sid=btn.dataset.anRemoveSch,pid=btn.dataset.anRemovePdf;
 if(!confirm('Remove this '+(sid?'scholarship badge':'semester PDF card')+' from the public site?'))return;
 btn.disabled=true;
 try{if(sid){const rows=await content('scholarships');await publish('scholarships',rows.filter(x=>x.university_id!==sid));}else{const rows=await content('university_costing');await publish('university_costing',rows.filter(x=>x.university_id!==pid));}await refreshAdmin();}
 catch(err){alert('Could not remove: '+String(err?.message||err));btn.disabled=false;}
},true);
window.ANUniversityTools={badge,scholarship,costing,portfolio,adminUI};
})();