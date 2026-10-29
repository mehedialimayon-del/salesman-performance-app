const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const dom=new JSDOM('<!doctype html><html><body><div id="app"><section class="ffProposalPage"><div class="ffProposalHead"><p>34 FORMS · VIEW · DOWNLOAD</p></div><div class="ffProposalStack"><article class="ffProposalStrip" data-id="test-giant"><div class="ffProposalVisual"><img src="proposal-assets/01_Giant.png" alt="Giant Hypermarket Proposal Form"></div><div class="ffProposalActions"><button type="button" class="ffPropView">VIEW PDF</button></div></article></div></section></div></body></html>',{url:'https://mehedialimayon-del.github.io/salesman-performance-app/',pretendToBeVisual:true,runScripts:'outside-only'});
 const w=dom.window;
 w.alert=m=>{throw Error('Unexpected alert: '+m)};
 w.crypto.randomUUID=()=>'qa-123456';
 let saved=null,payload=null,called=0;
 const items=Array.from({length:9},(_,i)=>({code:'QA'+i,name:'QA product '+i}));
 const query={
   select(){return query},
   order(){return Promise.resolve({data:[],error:null})},
   eq(){return query},
   maybeSingle(){return Promise.resolve({data:{lines:items},error:null})}
 };
 w.FFH_SUPABASE={
  rpc:async name=>({data:name==='ffh_my_staff_id'?'M22075':null,error:null}),
  from(name){
   if(name==='ffh_proposals')return query;
   if(name==='ffh_proposal_item_templates')return query;
   if(name==='ffh_proposal_orders')return {insert(data){saved={...data,id:'qa-123',owner_staff_id:'M22075',created_at:'2026-10-29T01:30:00Z'};return{select(){return this},single:async()=>({data:saved,error:null})}}};
   throw Error('Unexpected table '+name);
  }
 };
 w.FFHBridge={postMessage(str){
   const cmd=JSON.parse(str);assert.equal(cmd.action,'saveFile');payload=JSON.parse(cmd.payload);
   w.queueMicrotask(()=>w.ffhNativeReply(payload.request_id,{saved:true,filename:payload.filename}));
 }};
 w.FFH_EXPORT_PDF=async({download})=>{
   called++;
   return download(new w.Blob(['%PDF-1.4 dummy verified handoff'],{type:'application/pdf'}),'qa-proposal.pdf');
 };
 w.eval(fs.readFileSync('proposal-orders.js','utf8'));
 const until=async selector=>{for(let n=0;n<60;n++){let e=w.document.querySelector(selector);if(e)return e;await wait(15)}throw Error('Missing '+selector)};
 (await until('.ffPropView[data-ff-po-button]')).click();
 const form=await until('#ffPoForm');
 form.querySelector('[name=outlet_name]').value='Giant QA Outlet';
 form.querySelector('[name=bal_0]').value='12';
 form.querySelector('[name=qty_0]').value='24';
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await until('.ffPoSuccess');
 assert.equal(saved.owner_staff_id,'M22075');
 assert.equal(saved.lines.length,9);
 assert.equal(saved.lines[0].proposed,24);
 assert.equal(saved.lines[1].proposed,null);
 (await until('#ffPoDownloadFilled')).click();
 for(let n=0;n<60&&!payload;n++)await wait(15);
 assert.ok(payload,'FFHBridge-only fallback receives the PDF');
 assert.equal(payload.mime,'application/pdf');
 assert.match(payload.base64,/^[A-Za-z0-9+/=]+$/);
 assert.equal(called,1);
 assert.equal(w.document.querySelector('#ffPoSavedStatus').textContent,'');
 dom.window.close();
 console.log('PASS native FFHBridge-only proposal PDF save fallback with 9 lines, blank cells and cloud handoff');
})().catch(e=>{console.error(e);process.exit(1)});
