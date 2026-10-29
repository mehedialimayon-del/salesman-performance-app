const assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom'),{randomUUID}=require('node:crypto');
const sleep=()=>new Promise(ok=>setTimeout(ok,15));
async function until(test){for(let i=0;i<60;i++){const val=test();if(val)return val;await sleep()}throw Error('UI state timed out')}
(async()=>{
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const month=p.find(x=>x.type==='year').value+'-'+p.find(x=>x.type==='month').value,day=month+'-01';
 const dom=new JSDOM('<body><div id="app"><div class="ffCatDownloads"><button id="ffClaimPdf">Claim PDF</button></div><input id="ffClaimMonth" value="'+month+'"><form id="ffReceiptForm"><label>Date<input name="expense_date"></label></form></div></body>',{url:'https://example.test',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;Object.defineProperty(w.crypto,'randomUUID',{value:randomUUID});w.alert=m=>{throw Error('Unexpected alert '+m)};
 w.eval(fs.readFileSync('claim-monthly.js','utf8'));
 const receipts=[
  {id:'fuel-a',owner_staff_id:'M22075',expense_date:day,amount:120,category:'Fuel Expenses',reason:'Airport fuel',receipt_path:null},
  {id:'fuel-rejected',owner_staff_id:'M22075',expense_date:day,amount:80,category:'Fuel Expenses',reason:'Claim line excluded',receipt_path:null}
 ];
 const claims=[{id:'check-a',owner_staff_id:'M22075',claim_month:month,kind:'Expense Claim',status:'Submitted',lines:[{id:'excluded-a',receipt_id:'fuel-rejected',excluded:true,category:'Fuel Expenses',amount:80}]}];
 const history=[],uploads=[];
 w.FFH_SUPABASE={
  rpc:async(name,args)=>{
   if(name==='ffh_my_staff_id')return{data:'M22075',error:null};
   if(name==='ffh_duty')return{data:[{staff_id:'M22075',full_name:'QA Staff',active:true},{staff_id:'M21954',full_name:'QA Manager',can_manage:true,active:true}],error:null};
   if(name==='ffh_claims_api'&&args.action==='state')return{data:{template:{pdf_url:'https://example.test/company.pdf'},receipts,claims},error:null};
   if(name==='ffh_claims_api'&&args.action==='receipt'){
    history.push(args.payload);
    receipts.push({id:'receipt-'+history.length,owner_staff_id:'M22075',...args.payload});
    return{data:{id:'receipt-'+history.length},error:null};
   }
   throw Error('Unexpected RPC '+name+':'+args?.action);
  },
  storage:{from:bucket=>{
   assert.equal(bucket,'ffh-expenses');
   return{upload:async(path,file,options)=>{uploads.push({path,file,options});return{data:{path},error:null}},createSignedUrl:async path=>({data:{signedUrl:'https://example.test/'+path},error:null})}
  }}
 };
 w.FFH_EXPORT_MONTHLY_CLAIM=async()=>({grandTotal:220,pages:3,approved:false});
 w.FFH_CLAIM_DOWNLOAD_FILE=async()=>({saved:true});
 w.eval(fs.readFileSync('claim-monthly-ui.js','utf8'));
 const monthly=await until(()=>w.document.querySelector('#ffClaimMonthly'));
 monthly.click();
 await until(()=>w.document.querySelector('.ffMonthlyTotal'));
 assert.match(w.document.querySelector('.ffMonthlyTotal').textContent,/RM 120\.00/,'Manager-excluded bill must not enter monthly total');
 w.document.querySelector('#ffMonthlyAdd').click();
 const form=await until(()=>w.document.querySelector('#ffMonthlyQuickForm'));
 assert.ok(form.querySelector('[name=receipt]'),'receipt attachment field');
 form.querySelector('[name=category]').value='New AC Training';
 form.querySelector('[name=category]').dispatchEvent(new w.Event('change'));
 form.querySelector('[name=expense_date]').value=day;
 form.querySelector('[name=amount]').value='100.00';
 form.querySelector('[name=reason]').value='New team training';
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await until(()=>history.length===1);
 await until(()=>w.document.querySelector('.ffMonthlyTotal')?.textContent.includes('220.00'));
 assert.equal(history[0].category,'New AC Training');
 assert.equal(history[0].amount,'100.00');
 assert.equal(history[0].receipt_path,null);
 assert.equal(uploads.length,0);
 w.document.querySelector('#ffMonthlyAdd').click();
 const other=await until(()=>w.document.querySelector('#ffMonthlyQuickForm'));
 other.querySelector('[name=category]').value='Others';
 other.querySelector('[name=category]').dispatchEvent(new w.Event('change'));
 assert.equal(other.querySelector('.ffMonthlyOther').hidden,false);
 other.querySelector('[name=custom_category]').value='Vehicle Service';
 other.querySelector('[name=expense_date]').value=day;
 other.querySelector('[name=amount]').value='50.00';
 other.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 await until(()=>history.length===2);
 assert.equal(history[1].category,'Vehicle Service');
 await until(()=>w.document.querySelector('.ffMonthlyTotal')?.textContent.includes('270.00'));
 assert.equal(w.document.querySelectorAll('.ffMonthlyReceipt').length,3);
 dom.window.close();console.log('PASS monthly claim quick entry: category saving, Others, month grouping, exclusion of manager deductions, no duplicate expense');
})().catch(e=>{console.error(e);process.exit(1)});
