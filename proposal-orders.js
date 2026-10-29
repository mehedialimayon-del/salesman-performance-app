(function proposalOrderFeature(){
'use strict';
const API=()=>window.FFH_SUPABASE;
const APP=document.getElementById('app');
const H=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DAY=()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());return ['year','month','day'].map(k=>p.find(x=>x.type===k)?.value).join('-')};
const clean=s=>String(s||'').toUpperCase().replace(/[^A-Z0-9]+/g,'');
let modal=null,staff=null,queue=false,cloud=[],cache=new Map();
function message(e){alert(e?.message||String(e||'Unable to complete action'))}
async function identify(){const {data,error}=await API().rpc('ffh_my_staff_id');if(error||!data)throw Error('Please sign in to your approved FieldForce Hub account.');return staff=String(data)}
function sourceKey(name){
 const n=clean(name);
 if(n.includes('GIANT'))return '01';if(n.includes('KKSUPER'))return '02';if(n.includes('NSKGROCER'))return '03';
 if(n.includes('AEONBIG'))return '05';if(n.includes('LOTUS'))return '07';if(n.includes('BIGBENS'))return '15';
 return '';
}
function chainFromCard(card){
 const src=card.querySelector('.ffProposalVisual>img')?.getAttribute('src')||'';
 const name=(card.querySelector('.ffProposalVisual>img')?.getAttribute('alt')||'').replace(/\s*Proposal Form$/i,'').trim()||'Proposal';
 const key=(src.match(/proposal-assets\/(\d{2})_/i)||[])[1]||sourceKey(name)||'custom:'+card.dataset.id;
 const cid=card.dataset.id||'';
 const pdf=cloud.find(x=>String(x.id)===cid)||cloud.find(x=>{
   const a=clean(name),b=clean(x.name);return b===a||b.includes(a)||a.includes(b);
 })||{};
 return {key,name,id:cid,image:src,file:pdf.file_url||'',filename:pdf.filename||'',manage:!!card.querySelector('.ffPropEdit')};
}
async function refreshFiles(){
 const {data,error}=await API().from('ffh_proposals').select('id,name,file_url,filename').order('created_at',{ascending:false});
 if(error)throw error;cloud=Array.isArray(data)?data:[];
}
function matchingFile(chain){
 const name=clean(chain.name),key=chain.key;
 const aliases={
  '01':['GIANT'], '02':['KKSUPERMART','KKSUPERMARKET'], '03':['NSKGROCER','NSK'],
  '05':['AEONBIG'], '07':['LOTUS'], '15':['BIGBENSINDEPENDENTGROCER'],
  '16':['TFVALUEMART'], '21':['MERCEARIA'], '23':['KECOMART']
 };
 return cloud.find(x=>String(x.id)===String(chain.id))||
 cloud.find(x=>{
  const n=clean(x.name),names=[name,...(aliases[key]||[])];
  return names.some(a=>a&&(a.length>3)&&(n===a||n.includes(a)||a.includes(n)));
 });
}
async function importPdf(chain,input,allowOCR=true){
 if(!window.FFH_PROPOSAL_PDF_PARSE?.read)throw Error('PDF SKU reader is not loaded. Please refresh the app.');
 const parsed=await window.FFH_PROPOSAL_PDF_PARSE.read(input||chain.file,{allowOCR,maxPages:35});
 if(parsed.lines.length<2||parsed.confidence==='low')throw Error('The uploaded PDF does not contain a reliably readable Item Code + Product Name table. Please upload a clear/searchable PDF; no SKU was guessed or saved.');
 cache.set(chain.key,parsed.lines);
 if(chain.manage){
  const staffId=await identify();
  const row={chain_key:chain.key,chain_name:chain.name,source_pdf_url:chain.file||'',lines:parsed.lines,updated_by:staffId,updated_at:new Date().toISOString()};
  const {error}=await API().from('ffh_proposal_item_templates').upsert(row,{onConflict:'chain_key'});
  if(error)throw Error('PDF items were read, but SKU cloud sync failed: '+error.message);
 }
 return parsed.lines;
}
async function getTemplate(chain,options={}){
 const match=matchingFile(chain);if(match?.file_url){chain.file=match.file_url;chain.filename=match.filename||chain.filename;}
 if(cache.has(chain.key)&&!options.force)return cache.get(chain.key);
 const {data,error}=await API().from('ffh_proposal_item_templates').select('lines,source_pdf_url').eq('chain_key',chain.key).maybeSingle();
 if(error)throw error;
 const lines=Array.isArray(data?.lines)?data.lines:[];
 if(lines.length&&(data.source_pdf_url===chain.file||(!data.source_pdf_url&&!chain.file))){
  cache.set(chain.key,lines);return lines;
 }
 if(!chain.file){if(lines.length){cache.set(chain.key,lines);return lines}return []}
 return importPdf(chain,chain.file,options.allowOCR!==false);
}
async function autoImportUploaded({name,file_url,file,templateKey,id}){
 await identify();
 const key=templateKey||sourceKey(name)||('custom:'+String(id||clean(name)));
 const chain={key,name:String(name||'Proposal'),id:id||'',file:file_url||'',manage:true};
 cache.delete(key);
 return {count:(await importPdf(chain,file||file_url,true)).length,key};
}
let scanning=false;const scannedSources=new Set();let nextScanTimer=null;
async function autoBackfill(){
 if(scanning)return;
 const page=APP?.querySelector('.ffProposalPage');
 if(!page||!page.querySelector('.ffPropEdit'))return;
 scanning=true;
 let status=page.querySelector('.ffPoSyncStatus');
 if(!status){status=document.createElement('span');status.className='ffPoSyncStatus';status.setAttribute('role','status');page.querySelector('.ffProposalHead')?.append(status)}
 let ready=0,failed=0,attempted=0;
 try{
  await refreshFiles();
  for(const card of [...page.querySelectorAll('.ffProposalStrip')]){
   if(!APP?.contains(card))break;
   const chain=chainFromCard(card),match=matchingFile(chain);
   if(!match?.file_url||scannedSources.has(match.file_url))continue;
   chain.file=match.file_url;chain.manage=true;
   scannedSources.add(chain.file);
   attempted++;status.textContent='Reading SKU from uploaded PDF '+attempted+'…';
   try{const list=await getTemplate(chain,{allowOCR:false});if(list.length>1)ready++;else failed++}
   catch(e){failed++;console.warn('Proposal PDF SKU extraction:',chain.name,e.message)}
  }
  if(APP.contains(page)){
   status.textContent=attempted?'SKU auto-sync: '+ready+' imported'+(failed?' · '+failed+' need OCR on opening':''):'Uploaded PDFs checked';
  }
 }catch(e){if(APP.contains(page))status.textContent='PDF SKU sync unavailable';console.warn(e)}
 finally{scanning=false}
}
function scheduleBackfill(){
 if(nextScanTimer)clearTimeout(nextScanTimer);
 nextScanTimer=setTimeout(()=>{nextScanTimer=null;autoBackfill()},1400);
}
function close(){if(modal){modal.remove();modal=null;document.body.classList.remove('ffProposalModalOn')}}
function pane(title,inner){
 close();modal=document.createElement('div');modal.className='ffPoOverlay';
 modal.innerHTML=`<section class="ffPoDialog" role="dialog" aria-modal="true" aria-label="${H(title)}"><header class="ffPoTop"><div><small>FIELDFORCE HUB · DIGITAL PROPOSALS</small><h2>${H(title)}</h2></div><button type="button" class="ffPoClose" aria-label="Close">✕</button></header><div class="ffPoScroll">${inner}</div></section>`;
 document.body.append(modal);document.body.classList.add('ffProposalModalOn');
 modal.querySelector('.ffPoClose').onclick=close;
 modal.addEventListener('click',e=>{if(e.target===modal)close()});
 return modal;
}
function loading(title){return pane(title,'<div class="ffPoMessage" role="status">Loading proposal data…</div>')}
function emptyTemplate(chain){
 return `<div class="ffPoMessage"><strong>SKU template not configured</strong><p>${H(chain.name)}-এর PDF থেকে Item Code এবং Product Name একবার Manager সেট করবেন। ভুল SKU অনুমান করে অর্ডার তৈরি করা যাবে না।</p>${chain.manage?'<button type="button" id="ffPoSetupNow">SET UP SKU LIST</button>':'<p>Manager-কে SKU template সেট করতে বলুন।</p>'}</div>`;
}
function banner(chain){
 return `<div class="ffPoBanner">${chain.image?`<img src="${H(chain.image)}" alt="${H(chain.name)}" onerror="this.style.display='none'">`:''}<span>${H(chain.name)} · PROPOSED ORDER</span></div>`;
}
async function openComposer(chain){
 loading('Create Proposal');try{
  await identify();await refreshFiles();const lines=await getTemplate(chain);
  if(!lines.length){pane('Create Proposal',banner(chain)+emptyTemplate(chain));return}
  const cols=lines.map((it,i)=>`<tr><td class="ffPoNum">${i+1}</td><td class="ffPoItem"><strong>${H(it.code)}</strong><span>${H(it.name)}</span></td><td><input name="bal_${i}" type="number" min="0" max="9999999" step="1" inputmode="numeric" placeholder="—" aria-label="Balance Stock ${i+1}"></td><td><input name="qty_${i}" type="number" min="0" max="9999999" step="1" inputmode="numeric" placeholder="—" aria-label="Proposed Order ${i+1}"></td></tr>`).join('');
  const html=banner(chain)+`<form id="ffPoForm" class="ffPoForm"><div class="ffPoInfoGrid"><label>Outlet Name *<input name="outlet_name" maxlength="130" placeholder="Giant Ampang Point" required></label><label>Outlet / Store Code<input name="outlet_code" maxlength="70" placeholder="Outlet code"></label><label>Proposal Date *<input type="date" name="proposal_date" value="${DAY()}" required></label><label>Supplier Name<input name="supplier_name" maxlength="130" placeholder="Pinnacle Foods (M) Sdn Bhd"></label><label>Prepared By<input name="prepared_by" maxlength="100" placeholder="Your name"></label><label>Mobile Number<input name="phone" maxlength="40" inputmode="tel" placeholder="+60"></label><label>WhatsApp Number<input name="whatsapp" maxlength="40" inputmode="tel" placeholder="+60"></label></div><p class="ffPoHelp">Only Balance Stock and Proposed Order are editable for each SKU. Leave a quantity empty to keep its PDF cell blank.</p><div class="ffPoTableWrap"><table><thead><tr><th>No.</th><th>Item Code / Product Name</th><th>Balance<br>Stock (pcs)</th><th>Proposed<br>Order (pcs)</th></tr></thead><tbody>${cols}</tbody></table></div><footer class="ffPoActions"><button type="submit" class="ffPoPrimary">✓ SAVE PROPOSAL</button><button type="button" id="ffPoCancel">CANCEL</button>${chain.manage?'<button type="button" id="ffPoManageTemplate">⚙ SKU TEMPLATE</button>':''}</footer><p id="ffPoStatus" role="status"></p></form>`;
  const box=pane('Create Proposal',html),form=box.querySelector('#ffPoForm');
  box.querySelector('#ffPoCancel').onclick=close;
  const edit=box.querySelector('#ffPoManageTemplate');if(edit){edit.textContent='↻ RE-READ PDF SKUs';edit.onclick=()=>{cache.delete(chain.key);openComposer(chain)};}
  form.onsubmit=async e=>{
   e.preventDefault();const fd=new FormData(form),b=form.querySelector('button[type=submit]'),status=form.querySelector('#ffPoStatus');
   const qty=(field,i)=>{const v=String(fd.get(field+'_'+i)||'').trim();if(v==='')return null;const n=Number(v);if(!Number.isSafeInteger(n)||n<0||n>9999999)throw Error('Quantity must be a whole number from 0 to 9,999,999.');return n};
   try{
    b.disabled=true;status.textContent='Saving to cloud…';
    const data={chain_key:chain.key,chain_name:chain.name,outlet_name:String(fd.get('outlet_name')||'').trim(),outlet_code:String(fd.get('outlet_code')||'').trim(),proposal_date:String(fd.get('proposal_date')||''),supplier_name:String(fd.get('supplier_name')||'').trim(),prepared_by:String(fd.get('prepared_by')||'').trim(),phone:String(fd.get('phone')||'').trim(),whatsapp:String(fd.get('whatsapp')||'').trim(),source_pdf_url:chain.file,lines:lines.map((l,i)=>({code:l.code,name:l.name,balance:qty('bal',i),proposed:qty('qty',i)}))};
    if(!data.outlet_name||!data.proposal_date)throw Error('Enter outlet name and proposal date.');
    const {data:row,error}=await API().from('ffh_proposal_orders').insert(data).select('*').single();
    if(error)throw error;
    await showSaved(row,chain);
   }catch(err){status.textContent=err.message;b.disabled=false;}
  };
 }catch(err){const box=pane('Create Proposal',`<div class="ffPoMessage"><strong>PDF SKU reading failed</strong><p>${H(err.message)}</p><button type="button" id="ffPoRetryAuto">↻ TRY PDF READING AGAIN</button></div>`);box.querySelector('#ffPoRetryAuto').onclick=()=>{cache.delete(chain.key);openComposer(chain)};box.querySelector('.ffPoClose').focus();}
}
async function openSetup(chain){
 if(!chain.manage)return;
 loading('Manage SKU Template');
 try{
  const staffId=await identify();const lines=await getTemplate(chain);
  const rows=lines.map(l=>`${l.code} | ${l.name}`).join('\n');
  const box=pane('SKU Template Setup',banner(chain)+`<form id="ffPoTemplateForm" class="ffPoForm"><p class="ffPoHelp">Copy the exact Item Codes and Product Names from the original uploaded PDF. Put one item on each line using: <b>ITEM CODE | PRODUCT NAME</b>. Changes affect new proposals only; saved history stays unchanged.</p><label>Fixed SKU List<textarea name="lines" rows="12" spellcheck="false" placeholder="123456 | Product name">${H(rows)}</textarea></label><p class="ffPoHelp">Maximum 200 items. Do not include Balance Stock or Proposed Order here.</p><footer class="ffPoActions"><button type="submit" class="ffPoPrimary">SAVE FIXED SKU LIST</button><button type="button" id="ffPoBackToCreate">BACK</button></footer><p id="ffPoSetupStatus" role="status"></p></form>`);
  box.querySelector('#ffPoBackToCreate').onclick=()=>openComposer(chain);
  box.querySelector('form').onsubmit=async e=>{
   e.preventDefault();const form=e.target,btn=form.querySelector('[type=submit]'),status=box.querySelector('#ffPoSetupStatus');
   try{
    btn.disabled=true;
    const lines=form.elements.lines.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map((line,i)=>{
      const p=line.indexOf('|');if(p<1||p===line.length-1)throw Error('Line '+(i+1)+' must contain ITEM CODE | PRODUCT NAME');
      const code=line.slice(0,p).trim(),name=line.slice(p+1).trim();
      if(!code||!name||code.length>80||name.length>250)throw Error('Invalid SKU in line '+(i+1));
      return {code,name};
    });
    if(!lines.length||lines.length>200)throw Error('Enter 1 to 200 SKUs.');
    const seen=new Set();for(const line of lines){if(seen.has(line.code))throw Error('Duplicate item code: '+line.code);seen.add(line.code);}
    const {error}=await API().from('ffh_proposal_item_templates').upsert({chain_key:chain.key,chain_name:chain.name,lines,updated_by:staffId,updated_at:new Date().toISOString()},{onConflict:'chain_key'});
    if(error)throw error;cache.set(chain.key,lines);await openComposer(chain);
   }catch(err){status.textContent=err.message;btn.disabled=false;}
  };
 }catch(err){pane('SKU Template Setup',`<div class="ffPoMessage">${H(err.message)}</div>`)}
}
function printable(r,chain){
 const lines=Array.isArray(r.lines)?r.lines:[];
 const rows=lines.map((l,i)=>`<tr style="border-bottom:1px solid #b1b1b1"><td style="padding:8px;border:1px solid #bbb;text-align:center">${i+1}</td><td style="padding:8px;border:1px solid #bbb">${H(l.code)}</td><td style="padding:8px;border:1px solid #bbb">${H(l.name)}</td><td style="padding:8px;border:1px solid #bbb;text-align:center">${l.balance===null||l.balance===undefined?'':H(l.balance)}</td><td style="padding:8px;border:1px solid #bbb;text-align:center">${l.proposed===null||l.proposed===undefined?'':H(l.proposed)}</td></tr>`).join('');
 const total=lines.reduce((s,l)=>s+(Number(l.proposed)||0),0);
 return `<div style="font-family:Arial,sans-serif;color:#171717;background:white;padding:20px"><div style="display:flex;align-items:center;justify-content:space-between;border-bottom:4px solid #f47711;padding-bottom:14px"><div><small style="font-size:12px;color:#9b4608">FIELDFORCE HUB · DIGITAL PROPOSAL</small><h1 style="font-size:30px;margin:4px 0;color:#171717">${H(r.chain_name||chain?.name||'PROPOSAL')}</h1><strong style="color:#c95a00">PROPOSED ORDER FORM</strong></div><div style="font-size:12px;text-align:right">Date<br><b>${H(r.proposal_date)}</b></div></div><table style="width:100%;border-collapse:collapse;font-size:13px;margin:18px 0"><tr><td style="padding:7px"><b>Outlet Name:</b> ${H(r.outlet_name)}</td><td style="padding:7px"><b>Outlet Code:</b> ${H(r.outlet_code)}</td></tr><tr><td style="padding:7px"><b>Supplier:</b> ${H(r.supplier_name)}</td><td style="padding:7px"><b>Prepared By:</b> ${H(r.prepared_by)}</td></tr></table><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#efefef"><th style="padding:8px;border:1px solid #bbb">No.</th><th style="padding:8px;border:1px solid #bbb">Item Code</th><th style="padding:8px;border:1px solid #bbb">Product Name</th><th style="padding:8px;border:1px solid #bbb">Balance Stock<br>(pcs)</th><th style="padding:8px;border:1px solid #bbb">Proposed Order<br>(pcs)</th></tr></thead><tbody>${rows}</tbody></table><p style="text-align:right;margin:12px 0;font-size:14px"><b>Total Proposed: ${total} pcs</b></p><div style="border-top:2px solid #f47711;margin-top:20px;padding-top:12px;font-size:13px"><strong>${H(r.prepared_by)}</strong><p>Phone: ${H(r.phone)} &nbsp; | &nbsp; WhatsApp: ${H(r.whatsapp)}</p><small>Saved on ${H((r.created_at||'').slice(0,10))} · Proposal ID ${H(r.id||'')}</small></div></div>`;
}
async function saveFile(blob,filename){
 const native=!!window.FieldForceNative||/FFHNative\/1/.test(navigator.userAgent)||!!window.FFHBridge;
 if(native){
  if(blob.size>20*1024*1024)throw Error('PDF exceeds Android download limit. Please use a browser.');
  const base64=await new Promise((ok,no)=>{const reader=new FileReader();reader.onload=()=>ok(String(reader.result).split(',')[1]);reader.onerror=()=>no(Error('Cannot read PDF'));reader.readAsDataURL(blob)});
  const payload={base64,filename:filename.replace(/\.pdf$/i,'-'+Date.now().toString(36)+'.pdf'),mime:'application/pdf'};
  let save;
  if(window.FieldForceNative?.saveFile)save=()=>window.FieldForceNative.saveFile(JSON.stringify(payload));
  else if(window.ffhNativeCall)save=()=>window.ffhNativeCall('saveFile',payload);
  else if(window.FFHBridge?.postMessage)save=()=>new Promise((resolve,reject)=>{
   const id=crypto.randomUUID(),previous=window.ffhNativeReply;
   const reply=(request,result)=>{
    if(request!==id){if(previous)previous(request,result);return}
    if(window.ffhNativeReply===reply)window.ffhNativeReply=previous;
    result?.error?reject(Error(result.error)):resolve(result);
   };
   window.ffhNativeReply=reply;
   try{window.FFHBridge.postMessage(JSON.stringify({action:'saveFile',payload:JSON.stringify({...payload,request_id:id})}));}
   catch(e){if(window.ffhNativeReply===reply)window.ffhNativeReply=previous;reject(e)}
  });
  else throw Error('Android download service not available. Please reopen app.');
  const result=await save();
  if(result?.saved!==true)throw Error(result?.error||'Android did not confirm the PDF save.');
  return result;
 }
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},60000);return {started:true};
}
async function downloadFilled(row,chain){
 const name=[row.chain_name,row.outlet_name,row.proposal_date].join('_').replace(/[^a-z0-9_\- ]/gi,'').replace(/\s+/g,'_').slice(0,100)||'proposal';
 if(!window.FFH_EXPORT_PDF)throw Error('PDF export engine is unavailable.');
 return window.FFH_EXPORT_PDF({title:'Filled Proposal PDF',articles:[printable(row,chain)],filename:name+'.pdf',download:saveFile});
}
async function showSaved(row,chain){
 const box=pane('Saved Proposal',`<div class="ffPoSuccess">✓ SAVED TO CLOUD HISTORY</div><div class="ffPoPreview">${printable(row,chain)}</div><div class="ffPoActions"><button type="button" class="ffPoPrimary" id="ffPoDownloadFilled">⬇ DOWNLOAD FILLED PDF</button><button type="button" id="ffPoSeeHistory">ORDER HISTORY</button><button type="button" id="ffPoDone">CLOSE</button></div><p role="status" id="ffPoSavedStatus"></p>`);
 box.querySelector('#ffPoDownloadFilled').onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{await downloadFilled(row,chain)}catch(err){box.querySelector('#ffPoSavedStatus').textContent=err.message}finally{b.disabled=false}};
 box.querySelector('#ffPoSeeHistory').onclick=()=>showHistory(chain?.key||'');
 box.querySelector('#ffPoDone').onclick=close;
}
async function showHistory(chainKey=''){
 loading('Proposal History');
 try{
  await identify();
  const {data,error}=await API().from('ffh_proposal_orders').select('*').order('created_at',{ascending:false}).limit(350);
  if(error)throw error;let rows=data||[];
  const chainHtml='<option value="">All chains</option>'+[...new Map(rows.map(x=>[x.chain_key,x.chain_name])).entries()].map(([k,n])=>`<option value="${H(k)}"${k===chainKey?' selected':''}>${H(n)}</option>`).join('');
  const box=pane('Proposal History',`<div class="ffPoHistoryFilters"><label>Outlet / Code Search<input id="ffPoHistorySearch" type="search" placeholder="Search outlet or code"></label><label>Chain<select id="ffPoHistoryChain">${chainHtml}</select></label><label>Date<input id="ffPoHistoryDate" type="date"></label></div><div id="ffPoHistoryList"></div><p class="ffPoHelp">Latest 350 accessible proposals. Saved proposals keep their original SKU values.</p>`);
  const search=box.querySelector('#ffPoHistorySearch'),select=box.querySelector('#ffPoHistoryChain'),date=box.querySelector('#ffPoHistoryDate'),list=box.querySelector('#ffPoHistoryList');
  const paint=()=>{
   const q=clean(search.value);
   const filtered=rows.filter(r=>(!select.value||r.chain_key===select.value)&&(!date.value||r.proposal_date===date.value)&&(!q||clean([r.outlet_name,r.outlet_code,r.chain_name].join(' ')).includes(q)));
   list.innerHTML=filtered.length?filtered.map(r=>`<article class="ffPoHistoryRow"><div><b>${H(r.outlet_name)}</b><small>${H(r.chain_name)} · ${H(r.proposal_date)} · ${H(r.outlet_code||'No code')}</small><small>Created by ${H(r.owner_staff_id)} · ${H(r.created_at?new Date(r.created_at).toLocaleString('en-MY',{timeZone:'Asia/Kuala_Lumpur',hour12:false,day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'')}</small></div><div><button type="button" data-v="${H(r.id)}">👁 VIEW</button><button type="button" data-d="${H(r.id)}">⬇ PDF</button></div></article>`).join(''):'<div class="ffPoMessage">No matching proposals found.</div>';
   list.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>showSaved(rows.find(x=>x.id===b.dataset.v),null));
   list.querySelectorAll('[data-d]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await downloadFilled(rows.find(x=>x.id===b.dataset.d),null)}catch(e){message(e)}finally{b.disabled=false}});
  };
  [search,select,date].forEach(el=>el.addEventListener('input',paint));paint();
 }catch(err){pane('Proposal History',`<div class="ffPoMessage">${H(err.message)}</div>`)}
}
function enhance(){
 queue=false;const page=APP?.querySelector('.ffProposalPage');if(!page)return;
 const label=page.querySelector('.ffProposalHead p');if(label&&label.dataset.ffPoHeader!=='1'){label.dataset.ffPoHeader='1';label.textContent=label.textContent.replace('VIEW · DOWNLOAD','CREATE · HISTORY · PDF')}
 const head=page.querySelector('.ffProposalHead');
 if(head&&!head.querySelector('#ffPoHistoryButton')){
  const b=document.createElement('button');b.id='ffPoHistoryButton';b.className='secondary ffPoHistoryHeader';b.type='button';b.textContent='◷ History';b.onclick=()=>showHistory();head.append(b);
 }
 scheduleBackfill();
 page.querySelectorAll('.ffProposalStrip').forEach(card=>{
  const view=card.querySelector('.ffPropView');if(view&&!view.dataset.ffPoButton){
    view.dataset.ffPoButton='1';view.textContent='＋ CREATE PROPOSAL';view.onclick=()=>openComposer(chainFromCard(card));
  }
  if(!view&&!card.querySelector('.ffPoCreateBtn')){
    const actions=card.querySelector('.ffProposalActions');if(!actions)return;
    const b=document.createElement('button');b.className='secondary ffPoCreateBtn';b.textContent='＋ CREATE PROPOSAL';b.onclick=()=>openComposer(chainFromCard(card));actions.prepend(b);
  }
 });
}
function schedule(){if(!queue){queue=true;requestAnimationFrame(enhance)}}
if(APP){new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});schedule()}
window.FFH_PROPOSAL_ORDERS={openHistory:showHistory,autoImportUploaded,autoBackfill,refreshPdf:(chain)=>{cache.delete(chain.key);return getTemplate(chain,{force:true})}};
})();
