/* Staff Edit > Outlet Access. Owner-reviewed, append/upsert Excel imports only.
   Existing outlets, historical sales, and other SR routes stay untouched. */
(function(root){
 'use strict';
 const escape=s=>String(s??'').replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
 const normalize=s=>String(s??'').trim().toLowerCase().replace(/[\s_./-]+/g,'');
 const mapFields={
  outlet_code:['outletcode','storecode','code','outletid','storeid','customercode','customerid','accountcode'],
  outlet_name:['outletname','storename','name','customername','shopname','outlet'],
  category:['category','chain','chainname','channel','group','brand'],
  total_sku:['totalsku','sku','skucount','numberofsku']
 };
 function parseMatrix(matrix){
  if(!Array.isArray(matrix))throw Error('No rows found in workbook.');
  const headerAt=matrix.findIndex((row,i)=>i<15&&Array.isArray(row)&&row.some(x=>mapFields.outlet_name.includes(normalize(x))));
  if(headerAt<0)throw Error('Excel needs an Outlet Name / Store Name column.');
  const headings=matrix[headerAt].map(normalize);
  const column=field=>headings.findIndex(h=>mapFields[field].includes(h));
  const codeIndex=column('outlet_code'),nameIndex=column('outlet_name'),categoryIndex=column('category'),skuIndex=column('total_sku');
  if(codeIndex<0)throw Error('Excel needs an Outlet Code / Store Code column; existing sales require stable codes.');
  let rows=[],errors=[],seen=new Set();
  for(let n=headerAt+1;n<matrix.length;n++){
   const r=matrix[n]||[];
   if(r.every(cell=>String(cell??'').trim()===''))continue;
   const read=i=>i<0?'':String(r[i]??'').trim();
   const outlet_code=read(codeIndex),outlet_name=read(nameIndex);
   const category=read(categoryIndex)||'Other',skuString=read(skuIndex)||'0';
   const total_sku=/^[0-9]{1,6}$/.test(skuString)?Number(skuString):-1;
   if(!outlet_code||!outlet_name||total_sku<0||seen.has(outlet_code.toLowerCase())){
    errors.push('Excel row '+(n+1)+': '+(!outlet_code?'Missing outlet code':!outlet_name?'Missing outlet name':total_sku<0?'Invalid SKU count':'Duplicate outlet code '+outlet_code));
    continue;
   }
   if(outlet_code.length>90||outlet_name.length>250||category.length>100){errors.push('Excel row '+(n+1)+': code/name/category too long');continue;}
   seen.add(outlet_code.toLowerCase());
   rows.push({outlet_code,outlet_name,category,total_sku});
  }
  if(rows.length>500)errors.push('Maximum 500 outlets per import; split into separate workbooks.');
  if(!rows.length&&!errors.length)errors.push('Workbook has no outlet rows.');
  return {rows,errors,sheetHeaderRow:headerAt+1};
 }
 function renderList(data){
  const outlets=Array.isArray(data.outlets)?data.outlets:[];
  const active=outlets.filter(o=>o.active!==false);
  const inactive=outlets.filter(o=>o.active===false);
  return '<div class="ffOutletTotals"><strong>TOTAL OUTLETS: '+active.length+'</strong><span>INACTIVE: '+inactive.length+'</span></div>'
   +(outlets.length?'<div class="ffOutletList" role="list">'+outlets.map((o,i)=>
    '<div class="ffOutletListRow" role="listitem"><b class="ffOutletSerial">'+(i+1)+'.</b><div><strong>'+escape(o.name)+'</strong>'
    +'<small>'+escape(o.code||'NO CODE')+' · '+escape(o.category||'Other')+' · SKU '+Number(o.total_sku||0)
    +' · '+(o.active===false?'INACTIVE':'ACTIVE')+'</small></div></div>'
    ).join('')+'</div>':'<p>No outlets assigned to this staff account yet.</p>');
 }
 function wire({form,staff,client,onRefresh}){
  const launch=form.querySelector('#ffEditOutletAccessOpen');
  const panel=form.querySelector('#ffEditOutletAccessPanel');
  if(!launch||!panel||!staff?.staff_id)return;
  const $=id=>panel.querySelector('#'+id);
  let current=null,pending=null,loading=false;
  const status=(text,error=false)=>{const el=$('ffOutletAccessStatus');if(el){el.textContent=text;el.style.color=error?'#ffb0a7':'#fff';}};
  async function query(action,payload={}){
   const {data,error}=await client.rpc('ffh_owner_outlet_access',{action,target_staff:staff.staff_id,payload});
   if(error)throw Error(error.message);
   return data;
  }
  async function fetchList(){
   if(loading)return;
   loading=true;status('Loading assigned outlets…');
   try{
    current=await query('list');
    $('ffOutletAccessRows').innerHTML=renderList(current);
    const enabled=current.can_sell===true;
    $('ffOutletAccessImport').hidden=!enabled;
    if(!enabled)status('This account does not have an SR route. Enable Own SR route and save before assigning outlets.');
    else status('This list is live. Excel import adds or updates by Outlet Code; it does not erase previous outlets.');
   }catch(e){status('Could not load outlets: '+e.message,true);}
   finally{loading=false;}
  }
  launch.addEventListener('click',async()=>{
   panel.hidden=!panel.hidden;
   launch.setAttribute('aria-expanded',String(!panel.hidden));
   if(!panel.hidden){await fetchList();panel.scrollIntoView?.({behavior:'smooth',block:'nearest'});}
  });
  $('ffOutletExcelFile').addEventListener('change',async e=>{
   pending=null;
   const file=e.target.files?.[0];
   $('ffOutletUploadSave').disabled=true;
   $('ffOutletExcelPreview').replaceChildren();
   if(!file)return;
   try{
    if(!/\.(xlsx|xls|csv)$/i.test(file.name))throw Error('Please select an .xlsx, .xls or .csv file.');
    if(file.size>5*1024*1024)throw Error('Workbook must be smaller than 5 MB.');
    const XLSX=root.XLSX;
    if(!XLSX?.read||!XLSX?.utils?.sheet_to_json)throw Error('Excel reader has not loaded; refresh the page.');
    const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',raw:false});
    const first=workbook.Sheets[workbook.SheetNames[0]];
    if(!first)throw Error('Workbook does not contain a sheet.');
    const matrix=XLSX.utils.sheet_to_json(first,{header:1,defval:'',raw:false});
    const parsed=parseMatrix(matrix);
    if(parsed.errors.length)throw Error(parsed.errors.slice(0,8).join(' | ')+(parsed.errors.length>8?' (+more errors)':''));
    pending=parsed.rows;
    $('ffOutletExcelPreview').innerHTML='<strong>PREVIEW: '+pending.length+' outlet(s)</strong>'
      +'<p>Existing matching Outlet Codes will update. Unlisted outlets will remain as they are.</p>'
      +pending.slice(0,10).map((o,i)=>'<p>'+(i+1)+'. '+escape(o.outlet_code)+' · '+escape(o.outlet_name)+'</p>').join('')
      +(pending.length>10?'<p>…and '+(pending.length-10)+' more</p>':'');
    $('ffOutletUploadSave').disabled=false;
    status('Excel validated. Review the preview and press Import to save.');
   }catch(err){status(err.message,true);}
  });
  $('ffOutletUploadSave').addEventListener('click',async()=>{
   if(!pending?.length)return;
   if(!root.confirm('Import '+pending.length+' outlet(s) for '+staff.full_name+' ('+staff.staff_id+')? Matching codes will update; other outlets and sales stay unchanged.'))return;
   const btn=$('ffOutletUploadSave');btn.disabled=true;
   status('Saving outlets to FieldForce…');
   try{
    const saved=await query('import',{rows:pending});
    pending=null;
    $('ffOutletExcelFile').value='';
    $('ffOutletExcelPreview').replaceChildren();
    current=saved;
    $('ffOutletAccessRows').innerHTML=renderList(saved);
    status('Saved '+saved.imported+' outlets. Active total: '+saved.active_total+'. Existing history remains unchanged.');
    onRefresh?.(saved);
   }catch(err){status('Import failed; no partial batch saved: '+err.message,true);}
   finally{btn.disabled=false;}
  });
  $('ffOutletReload').addEventListener('click',fetchList);
 }
 const markup=staff=>'<section class="ffAccountOutletAccess" aria-label="Outlet Access">'
   +'<button id="ffEditOutletAccessOpen" class="secondary" type="button" aria-expanded="false">OUTLET ACCESS · VIEW & EXCEL IMPORT</button>'
   +'<div id="ffEditOutletAccessPanel" class="ffAccountOutletPanel" hidden>'
   +'<h3>OUTLET ACCESS — '+escape(staff.full_name||staff.staff_id)+'</h3>'
   +'<button id="ffOutletReload" class="secondary" type="button">REFRESH OUTLETS</button>'
   +'<div id="ffOutletAccessRows" aria-live="polite"></div>'
   +'<div id="ffOutletAccessImport"><label for="ffOutletExcelFile">Import Excel (Outlet Code, Outlet Name, Category, Total SKU)</label>'
   +'<input id="ffOutletExcelFile" type="file" accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">'
   +'<div id="ffOutletExcelPreview" class="ffOutletExcelPreview"></div>'
   +'<button id="ffOutletUploadSave" class="primary" type="button" disabled>IMPORT OUTLETS · SAVE</button></div>'
   +'<p id="ffOutletAccessStatus" role="status"></p></div></section>';
 root.FFH_ACCOUNT_OUTLETS={parseMatrix,renderList,markup,wire};
})(window);
