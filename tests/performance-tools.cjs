const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
(async()=>{
 const dom=new JSDOM('<main></main>',{url:'https://example.test',runScripts:'outside-only'}),w=dom.window;
 let id='SR1',manager=false,grant=false,connected=false,page='',failPermission=false,failHistory=false,failSave=null,saves=0,accepted=[],opened=[],reviewed=[];
 Object.defineProperty(w.navigator,'onLine',{get:()=>connected});
 const table={ffh_outlets:[{id:'o1',sr_id:'SR1',outlet_code:'same',outlet_name:'KK One',category:'KK',active:true},{id:'o2',sr_id:'SR2',outlet_code:'same',outlet_name:'KK One',category:'KK',active:true}],ffh_sales:[{id:'sale',sr_id:'SR1',outlet_code:'same',outlet_name:'KK One',sale_date:'2026-10-18',sku:'Mango',status:'Delivered',delivered_amount:25,order_amount:30,qty:2},{id:'other',sr_id:'SR2',outlet_code:'same',outlet_name:'KK One',sale_date:'2026-10-18',sku:'Secret SKU',status:'Delivered',delivered_amount:99999}],ffh_tasks:[{id:'t1',assigned_to:'SR1',title:'Check display',outlet_name:'KK One',status:'Pending Review',created_at:'2026-10-18',proof_photo_url:'https://example.test/proof.jpg'},{id:'t2',assigned_to:'SR2',title:'Foreign task',status:'Pending Review'}],ffh_campaign_executions:[{id:'c1',sr_id:'SR1',outlet_code:'same',outlet_name:'KK One',execution_date:'2026-10-17',status:'Done',remarks:'Display proof'}]};
 const sb={from:t=>{const q={select:()=>q,order:()=>q,eq:(field,value)=>{q._field=field;q._value=value;return q;},maybeSingle:async()=>({data:(table[t]||[]).find(row=>row[q._field]===q._value)||null,error:null}),range:async()=>failHistory?{error:Error('Offline history')}:{data:table[t]||[]}};return q;},rpc:async(name)=>({data:name==='ffh_governance'?{requests:[{id:'r1',staff_id:id,module:'sales',action:'edit',record_id:'sale',reason:'Correction',status:'Pending'}]}:name==='ffh_earnings'?{entries:[]}: {claims:[]}})};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const ctx={sb,user:()=>({id}),isMgr:()=>manager,ids:()=>manager?['SR1']:['SR1','SR2'],staff:x=>({name:x}),outlets:()=>[{code:'same',name:'KK One',category:'KK'}],may:()=>grant,esc,rm:x=>'RM '+Number(x||0).toFixed(2),page:()=>page,setPage:p=>page=p,shell:s=>w.document.querySelector('main').innerHTML=s,back:t=>'<h1>'+esc(t)+'</h1>',bindBack(){},refreshStaff:async()=>{if(failPermission)throw Error('Permission unavailable');},refreshOutlets:async()=>{},saveSale:async x=>{saves++;if(failSave)throw failSave;x.cloudConfirmed=true;},acceptSale:x=>accepted.push(x),open:(p,row)=>opened.push([p,row]),reviewTask:async(id,status)=>reviewed.push([id,status])};
 w.eval(fs.readFileSync('performance-tools.js','utf8'));const ui=w.FFH_CREATE_PERFORMANCE_TOOLS(ctx),q=s=>w.document.querySelector(s),tick=()=>new Promise(r=>setTimeout(r,15));
 const order={id:'S-one',sr:'SR1',outletName:'KK One',sku:'Mango',qty:1,date:'2026-10-19',orderAmount:20};
 await assert.rejects(ui.queueOrder(null),/Order ID is required/);
 await assert.rejects(ui.queueOrder({}),/Order ID is required/);
 await assert.rejects(ui.queueOrder({...order,id:''}),/Order ID is required/);
 await assert.rejects(ui.queueOrder({...order,qty:-1}),/Complete the outlet/);
 await assert.rejects(ui.queueOrder({...order,outletName:''}),/Complete the outlet/);
 assert.equal(w.localStorage.getItem('ffh_order_outbox_v1_SR1'),null,'invalid drafts must never be stored');
 assert.equal((await ui.queueOrder(order)).pending,true);assert.equal(saves,0);assert.equal(accepted.length,0);ui.syncPage();assert.equal(q('.ffSyncStat.pending strong').textContent,'1');assert(q('#ffSyncQueue').textContent.includes('Saved · waiting to send'));
 // A new instance can recover persisted drafts, with no Sales achievement before cloud confirmation.
 const recovered=w.FFH_CREATE_PERFORMANCE_TOOLS(ctx);connected=true;await recovered.flush();assert.equal(saves,1);assert.equal(accepted.length,1);assert.equal(JSON.parse(w.localStorage.getItem('ffh_order_outbox_v1_SR1')).length,0);
 recovered.syncPage();assert(q('#ffSyncQueue').textContent.includes('Synced to cloud'));assert.equal(q('.ffSyncStat.synced strong').textContent,'1');
 failSave=Error('Network unavailable');assert.equal((await ui.queueOrder({...order,id:'S-two'})).pending,true);assert.equal(accepted.length,1);failSave=Object.assign(Error('Attendance required'),{code:'42501'});await ui.flush(true);const calls=saves;await ui.flush();assert.equal(saves,calls,'permission failures never auto retry');ui.syncPage();assert(q('main').textContent.includes('Needs attention'));failSave=null;await ui.flush(true);assert.equal(accepted.length,2);
 connected=false;await ui.queueOrder({...order,id:'S-three'});id='SR2';ui.syncPage();assert(!q('main').textContent.includes('Mango'),'different account cannot see the previous account outbox');connected=true;await ui.flush();assert.equal(accepted.length,2);id='SR1';await ui.flush();assert.equal(accepted.length,3);
 // Manual Sync must stop if login changes while permission refresh is awaited.
 connected=false;id='SR1';await ui.queueOrder({...order,id:'S-session-switch'});
 connected=true;ui.syncPage();
 const previousRefresh=ctx.refreshStaff,saveCountBeforeSwitch=saves;
 ctx.refreshStaff=async()=>{id='SR2';};
 q('#ffSyncRetry').click();await tick();
 assert.equal(saves,saveCountBeforeSwitch,'Sync Now must not upload a prior account after switching sessions');
 assert.equal(JSON.parse(w.localStorage.getItem('ffh_order_outbox_v1_SR1')).some(x=>x.id==='S-session-switch'),true,'unsent order must remain saved');
 ctx.refreshStaff=previousRefresh;id='SR1';await ui.flush();
 assert.equal(JSON.parse(w.localStorage.getItem('ffh_order_outbox_v1_SR1')).some(x=>x.id==='S-session-switch'),false,'saved order should sync on restored session');
 await assert.rejects(ui.queueOrder({...order,id:'foreign',sr:'SR2'}),/assigned SR/);
 await ui.approvals();assert.equal(w.document.querySelectorAll('.ffInboxDecision').length,0,'SR cannot self approve');assert(!q('main').textContent.includes('Foreign task'));assert(q('main').textContent.includes('Check display'));
 manager=true;id='MANAGER';grant=true;await ui.approvals();assert.equal(w.document.querySelectorAll('.ffInboxDecision').length,2);q('.ffInboxDecision').click();await tick();assert.deepEqual(reviewed,[['t1','Done']]);
 grant=false;await ui.approvals();assert.equal(w.document.querySelectorAll('.ffInboxDecision').length,0);grant=true;failPermission=true;await ui.approvals();assert.equal(w.document.querySelectorAll('.ffInboxDecision').length,0,'refresh failure must hide direct review');failPermission=false;
 manager=false;id='SR1';await ui.historyPage();q('#ffOutletHistorySelect').value='0';q('#ffOutletHistorySelect').dispatchEvent(new w.Event('change'));assert(q('#ffOutletHistoryDetail').textContent.includes('RM 25.00'));assert(!q('#ffOutletHistoryDetail').textContent.includes('Secret SKU'));assert(q('#ffOutletHistoryDetail').textContent.includes('Display proof'));assert(q('#ffOutletHistoryDetail').textContent.includes('Check display'));
 q('#ffOutletHistoryFrom').value='2026-10-19';q('#ffOutletHistoryFrom').dispatchEvent(new w.Event('change'));assert(q('#ffOutletHistoryDetail').textContent.includes('No recorded activity'));q('#ffOutletHistoryTo').value='2026-10-01';q('#ffOutletHistoryTo').dispatchEvent(new w.Event('change'));assert(q('#ffOutletHistoryDetail').textContent.includes('From date'));
 // Keep each SR's outlets contiguous and open the selected proposal and performance.
 manager=true;id='MANAGER';ctx.ids=()=>['SR1','SR2'];grant=true;
 table.ffh_outlets.push({id:'o3',sr_id:'SR1',outlet_code:'GIANT',outlet_name:'Giant Test',category:'Giant Hypermarket',total_sku:19,active:true},
  {id:'o4',sr_id:'SR1',outlet_code:'CLOSED',outlet_name:'Closed Test',category:'Giant Hypermarket',active:false});
 table.ffh_proposal_item_templates=[{chain_key:'01',source_pdf_url:'https://assets.example/1790191455404-lpy3gt-giant-propose-order-form-biscuit.new.pdf',
  lines:[{code:'4216819',name:'Orange'},{code:'4216819',name:'Orange'}]},
  {chain_key:'01-chill',chain_name:'Giant Hypermarket Chiller',source_pdf_url:'https://assets.example/chill.pdf',lines:[{code:'4175201',name:'Basil Seed Mango',catalogue_code:'105641',carton_cost:58.8}]}];
 const originalFrom=sb.from,upserts=[];
 sb.from=tableName=>{
  const query=originalFrom(tableName);
  if(tableName==='ffh_catalogue_products'){
   query.in=(field,values)=>{assert.deepEqual(Array.from(values),['102208','105641']);return query;};
   query.then=resolve=>resolve({data:[{item_code:'102208',name:'Bisk Club Orange',piece_price:1.25,carton_price:85,image_url:'https://assets.example/orange.jpg'}]});
  }
  if(tableName==='ffh_outlets')query.upsert=async rows=>{upserts.push(Array.from(rows));return {error:null};};
  return query;
 };
 await ui.historyPage();
 assert.deepEqual([...w.document.querySelectorAll('[data-outlet-staff]')].map(row=>row.dataset.outletStaff),['SR1','SR2']);
 assert.equal(q('#ffOutletHistoryRows').textContent.includes('Closed Test'),false);
 const giant=[...w.document.querySelectorAll('[data-ref-outlet]')].find(button=>button.textContent.includes('Giant Test'));
 q('#ffOutletHistorySelect').value=giant.dataset.refOutlet;q('#ffOutletHistorySelect').onchange();
 q('#ffOutletListing').click();await tick();
 assert.match(q('[data-sku-result]').textContent,/2 SKUs.*19 recorded/s);
 assert.match(q('[data-sku-result]').textContent,/Catalogue 102208/);
 assert.match(q('[data-sku-result]').textContent,/RM 76.80/);
 assert.match(q('[data-sku-result]').textContent,/Basil Seed Mango.*RM 58.80/s);
 q('.ffOutletDialog [data-close]').click();
 q('#ffOutletHistoryFrom').value='2026-10-01';q('#ffOutletHistoryTo').value='2026-10-31';
 q('#ffOutletPerformance').click();q('[data-perf="zero"]').click();
 assert.match(q('[data-perf-rows]').textContent,/Giant Test/);
 assert.doesNotMatch(q('[data-perf-rows]').textContent,/Closed Test/);
 q('.ffOutletDialog [data-close]').click();
 q('#ffOutletMap').click();assert.match(q('.ffOutletDialog a').href,/google.com\/maps\/search.*Giant/);q('.ffOutletDialog [data-close]').click();
 q('#ffOutletImport').click();
 const form=q('.ffOutletDialog form');
 let dataRows=[['code','name','category','totalSku'],['010','Example','Giant Hypermarket','19'],['010','Duplicate','Other','0']];
 w.ffhEnsureXlsx=async()=>({read:()=>({SheetNames:['Outlets'],Sheets:{Outlets:{}}}),utils:{sheet_to_json:()=>dataRows}});
 Object.defineProperty(form.elements.file,'files',{value:[{name:'outlets.xlsx',size:200,arrayBuffer:async()=>new ArrayBuffer(0)}]});
 const submit={preventDefault(){},submitter:form.querySelector('button[type=submit]')};
 await form.onsubmit(submit);assert.equal(upserts.length,0);assert.match(form.querySelector('[role=status]').textContent,/Duplicate/);
 dataRows.pop();await form.onsubmit(submit);assert.equal(upserts.length,1);assert.equal(upserts[0][0].sr_id,'SR1');assert.equal(upserts[0][0].outlet_code,'010');
 sb.from=originalFrom;manager=false;id='SR1';
 failHistory=true;await ui.historyPage();assert(q('main').textContent.includes('History is incomplete'));failPermission=true;await ui.historyPage();assert.equal(q('#ffOutletHistorySelect'),null,'no cache fallback when access refresh fails');
 // Lost-response recovery never overwrites a delivered/corrected row.
 const vm=require('node:vm'),app=fs.readFileSync('app.js','utf8');let duplicate=true,existing={id:'S',sr_id:'SR1',sale_date:'2026-10-19',outlet_code:'O',outlet_name:'KK One',category:'KK',sku:'Mango',qty:1,price:0,order_amount:20,remarks:'',status:'Delivered',delivered_amount:20};
 const sandbox={today:()=> '2026-10-19',FFH_SUPABASE:{from:()=>{const r={insert:()=>r,select:()=>r,eq:()=>r,maybeSingle:async()=>({data:existing}),then:resolve=>resolve(duplicate?{error:{code:'23505'}}:{data:[{id:'S'}]})};return r;}}};vm.createContext(sandbox);vm.runInContext(app.slice(app.indexOf('async function ffhSaveSaleCloud('),app.indexOf('async function ffhSaveTaskCloud(')),sandbox);const sale={id:'S',sr:'SR1',date:'2026-10-19',outletCode:'O',outletName:'KK One',category:'KK',sku:'Mango',qty:1,orderAmount:20,status:'Pending Delivery'};await sandbox.ffhSaveSaleCloud(sale);assert.equal(sale.status,'Delivered');existing={...existing,sku:'Corrected'};await assert.rejects(sandbox.ffhSaveSaleCloud({...sale}),/conflict/);
 // Malformed saved records must never be silently discarded or synced.
 connected=false;id='SR1';
 const storageKey='ffh_order_outbox_v1_SR1',before=w.localStorage.getItem(storageKey);
 for(const invalid of ['{','[null]','[{"id":"damaged","actor":"SR1"}]']){
  w.localStorage.setItem(storageKey,invalid);
  ui.syncPage();assert(q('main').textContent.includes('Saved orders'),'corruption warning must be visible');
  assert.equal(w.localStorage.getItem(storageKey),invalid,'corrupt local data must remain intact');
 }
 w.localStorage.setItem(storageKey,before);
 dom.window.close();console.log('PASS offline durable orders, reconnect, blocked retries, account isolation, scoped approval and history, partial failure, date filters and lost-response duplicate protection');
})().catch(e=>{console.error(e);process.exit(1)});
