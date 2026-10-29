const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
(async()=>{
const d=new JSDOM('<body><div id="app"><div class="ffCatDownloads"><button id="ffClaimPdf">Claim Form PDF</button></div><input id="ffClaimMonth" value="2026-10"><form id="ffReceiptForm"><label>Date<input type="date"></label></form></div></body>',{url:'https://qa.test',pretendToBeVisual:true,runScripts:'outside-only'});
const w=d.window;w.alert=msg=>{throw Error('Unexpected alert: '+msg)};
w.eval(fs.readFileSync('claim-monthly.js','utf8'));
const receipt=(id,amount,category,date)=>({id,amount,category,expense_date:date,reason:category==='Fuel Expenses'?'Refuel at outlet':'Staff training',receipt_path:id+'.png'});
const state={template:{pdf_url:'https://qa.test/company.pdf'},receipts:[receipt('a',120,'Fuel Expenses','2026-10-01'),receipt('b',80,'Fuel Expenses','2026-10-06'),receipt('c',150,'Training','2026-10-14')],claims:[{id:'buyer-claim',owner_staff_id:'M22075',claim_month:'2026-10',kind:'Buyer Entertainment Bill',status:'Submitted',lines:[{id:'buyer-line',amount:150,expense_date:'2026-10-20',reason:'Buyer meal',receipt_id:null,category:'Buyer Entertainment'}]}]};
w.FFH_SUPABASE={
rpc:async(name,args)=>{
 if(name==='ffh_my_staff_id')return{data:'M22075',error:null};
 if(name==='ffh_claims_api'&&args.action==='state')return{data:state,error:null};
 if(name==='ffh_duty')return{data:[{staff_id:'M22075',full_name:'QA Staff',active:true},{staff_id:'M21954',full_name:'QA Manager',can_manage:true,active:true}],error:null};
 throw Error('Unexpected RPC '+name);
},
storage:{from:()=>({createSignedUrl:async path=>({data:{signedUrl:'https://qa.test/'+path},error:null})})}
};
let sent=null;
w.FFH_EXPORT_MONTHLY_CLAIM=async payload=>{sent=payload;return{grandTotal:500,pages:4,approved:false}};
w.FFH_CLAIM_DOWNLOAD_FILE=async()=>({saved:true});
w.eval(fs.readFileSync('claim-monthly-ui.js','utf8'));
const advance=async()=>new Promise(ok=>setTimeout(ok,0));
await advance();await advance();
const cat=d.window.document.querySelector('#ffReceiptForm select[name=category]');
assert.ok(cat,'category picker inserted into existing receipt form');
cat.value='Others';cat.dispatchEvent(new w.Event('change',{bubbles:true}));
assert.equal(d.window.document.querySelector('.ffClaimOther').hidden,false);
const button=d.window.document.querySelector('#ffClaimMonthly');assert.ok(button,'monthly action added');
button.click();await advance();await advance();
assert.ok(d.window.document.querySelector('.ffMonthlySheet'),'monthly screen opens');
assert.match(d.window.document.querySelector('.ffMonthlyTotal').textContent,/RM 500\.00/);
assert.match(d.window.document.querySelector('.ffMonthlyIntro p').textContent,/2026-10-31/);
assert.equal(d.window.document.querySelectorAll('.ffMonthlyReceipt').length,4);
d.window.document.querySelector('#ffMonthlyExport').click();await advance();await advance();
assert.equal(sent.receipts.length,4);
assert.equal(sent.templateUrl,'https://qa.test/company.pdf');
assert.match(d.window.document.querySelector('#ffMonthlyStatus').textContent,/PDF saved/);
d.window.close();
console.log('PASS digital monthly claim UI: injected categories, October 31-day range, RM500/4 items, combined PDF command');
})().catch(e=>{console.error(e);process.exit(1)});
