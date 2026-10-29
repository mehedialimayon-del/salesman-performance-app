const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const mock=fs.readFileSync('tests/duty-ui.cjs','utf8').split('const mock=')[1].split('\n(async()=>')[0].replace(/;\s*$/,'');
(async()=>{
const browser=await chromium.launch({headless:true,executablePath:process.env.FFH_CHROMIUM||chromium.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage']});
try{
for(const id of ['M21954','M22075']){
const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('dialog',d=>d.accept());
await page.route('https://cdn.jsdelivr.net/npm/@supabase/**',r=>r.fulfill({contentType:'text/javascript',body:'('+mock+')('+JSON.stringify(id)+',true)'}));
await page.route('https://cdn.onesignal.com/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
await page.goto('http://127.0.0.1:8765');
await page.locator('.homeGrid').waitFor();
if(await page.locator('#ffhEntryAllow').count())await page.locator('#ffhEntryAllow').click();
await page.evaluate(id=>{
 const sb=window.FFH_SUPABASE,oldFrom=sb.from.bind(sb),oldRpc=sb.rpc.bind(sb);
 const fixed=Array.from({length:9},(_,i)=>({code:'QA-'+String(i+1).padStart(3,'0'),name:'Verified sample item '+(i+1)}));
 let lines=[];
 const rows=[];
 window.qaProposal={rows,lines:()=>lines.slice()};
 window.FFH_PROPOSAL_PDF_PARSE={read:async()=>({lines:fixed.slice(),confidence:'high',headerFound:true,source:'pdf-text'})};
 sb.rpc=(name,args)=>name==='ffh_my_staff_id'?Promise.resolve({data:id,error:null}):oldRpc(name,args);
 sb.from=table=>{
  if(table==='ffh_proposals'){const q={select(){return q},order(){return Promise.resolve({data:[{id:'qa-giant',name:'Giant Hypermarket Biscuits Proposal Form',filename:'Giant.pdf',file_url:'https://svpgjrxeqnluipsgjywk.supabase.co/storage/v1/object/public/ffh-public/proposals/M21954/pdf/qa-giant.pdf'}],error:null})}};return q;}
  if(table==='ffh_proposal_item_templates'){
   const q={select(){return q},eq(){return q},maybeSingle(){return Promise.resolve({data:lines.length?{lines}:null,error:null})}};
   return {...q,upsert(data){lines=data.lines;return Promise.resolve({data:null,error:null})}};
  }
  if(table==='ffh_proposal_orders'){
   const q={select(){return q},order(){return q},limit(){return Promise.resolve({data:rows.slice().reverse(),error:null})},
    single(){return Promise.resolve({data:rows[rows.length-1],error:null})}};
   return {...q,insert(data){rows.push({...data,id:'qa-proposal-'+rows.length,owner_staff_id:id,created_at:new Date().toISOString()});return q}};
  }
  return oldFrom(table);
 };
},id);
for(const width of [320,390,412]){
 await page.setViewportSize({width,height:844});
 await page.locator('[data-page=proposals]').click();
 await page.locator('.ffProposalPage').waitFor();
 await page.waitForFunction(()=>document.querySelectorAll('.ffPoCreateBtn,.ffPropView[data-ff-po-button]').length>0);
 const first=page.locator('.ffProposalStrip').first();
 const banner=await first.locator('.ffProposalVisual').boundingBox();
 assert.ok(banner.width<=width+2,'banner fits viewport');
 assert.ok(banner.x>=-2,'banner not clipped left');
 assert.ok(await first.locator('button').allTextContents().then(xs=>xs.some(x=>x.includes('CREATE PROPOSAL'))));
 if(width===390){
   await first.locator('button').filter({hasText:'CREATE PROPOSAL'}).click();
   await page.locator('.ffPoDialog').waitFor();
   await page.locator('#ffPoForm').waitFor();
   assert.equal(await page.locator('#ffPoForm tbody tr').count(),9,'nine fixed rows');
   assert.equal(await page.locator('#ffPoManageTemplate').count(),id==='M21954'?1:0,'SR cannot change SKU template');
   await page.locator('[name=outlet_name]').fill('Giant QA Ampang');
   await page.locator('[name=outlet_code]').fill('GI-TEST');
   await page.locator('[name=supplier_name]').fill('Pinnacle Foods (M) Sdn Bhd');
   await page.locator('[name=prepared_by]').fill('QA Tester');
   await page.locator('[name=phone]').fill('+60111111111');
   await page.locator('[name=whatsapp]').fill('+60111111111');
   await page.locator('[name=bal_0]').fill('12');
   await page.locator('[name=qty_0]').fill('24');
   await page.getByRole('button',{name:'SAVE PROPOSAL'}).click();
   await page.locator('.ffPoSuccess').waitFor();
   const saved=await page.evaluate(()=>window.qaProposal.rows[0]);
   assert.equal(saved.lines[0].balance,12);
   assert.equal(saved.lines[0].proposed,24);
   assert.equal(saved.lines[1].balance,null);
   assert.equal(saved.lines[1].proposed,null);
   assert.equal(saved.outlet_name,'Giant QA Ampang');
   const downloadPromise=page.waitForEvent('download',{timeout:30000});
   await page.locator('#ffPoDownloadFilled').click();
   const download=await downloadPromise;
   const path=await download.path();
   const bytes=fs.readFileSync(path);
   assert.equal(bytes.subarray(0,5).toString(),'%PDF-','filled PDF must be real PDF');
   assert.ok(bytes.byteLength>2000,'filled PDF not empty');
   await page.locator('#ffPoSeeHistory').click();
   await page.locator('.ffPoHistoryRow').first().waitFor();
   assert.match(await page.locator('.ffPoHistoryRow').first().innerText(),/Giant QA Ampang/);
   await page.locator('#ffPoHistorySearch').fill('no-match');
   assert.equal(await page.locator('.ffPoHistoryRow').count(),0);
   await page.locator('#ffPoHistorySearch').fill('Giant QA Ampang');
   assert.equal(await page.locator('.ffPoHistoryRow').count(),1);
   await page.screenshot({path:'/tmp/ffh-proposal-phone-'+id+'.png'});
   await page.locator('.ffPoClose').click();
 }
 await page.locator('#bh').click();
}
assert.deepEqual(errors,[],'No JavaScript page errors');
console.log('PASS Proposal mobile flow',id,'320/390/412px, nine SKUs, cloud save mock, blank quantities, filled PDF bytes, history search');
await context.close();
}
}finally{await browser.close()}
})().catch(e=>{console.error('FAIL proposal mobile',e);process.exit(1)});
