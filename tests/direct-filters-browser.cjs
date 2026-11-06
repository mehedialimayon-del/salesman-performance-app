'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const chrome=process.env.FFH_CHROMIUM&&fs.existsSync(process.env.FFH_CHROMIUM)?process.env.FFH_CHROMIUM:undefined;
 const browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.setContent('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app"><div class="app"><main class="wrap" id="scopeRoot"></main></div></div>');
  await page.addStyleTag({path:'styles.css'});
  await page.addStyleTag({path:'screen-refinements.css'});
  await page.addStyleTag({path:'ffh-direct-filters.css'});
  const logic=fs.readFileSync('ffh-direct-filters.js','utf8');
  await page.evaluate(code=>{
   window.eval(
    "let ffhSelectedZone='ALL',view='ALL';"+
    "const user={id:'M21954'},db={companyRoster:{configured:true,member_ids:['S1','S2','S3'],teams:[{zone_id:'PRIMARY',active:true},{zone_id:'CHERAS',active:true}]}};"+
    "const U=[{id:'M21954',name:'KL Manager',zone:'PRIMARY',can_manage:true,active:true},"+
      "{id:'M22075',name:'Cheras Manager',zone:'CHERAS',can_manage:true,active:true},"+
      "{id:'S1',name:'SR with very very long full name from Kuala Lumpur and manager M21954',zone:'PRIMARY',can_sell:true,active:true},"+
      "{id:'S2',name:'Other KL',zone:'PRIMARY',can_sell:true,active:true},"+
      "{id:'S3',name:'Cheras SR',zone:'CHERAS',can_sell:true,active:true}];"+
    "const isMgr=()=>true,sr=id=>U.find(p=>p.id===id),srIds=()=>U.filter(p=>p.can_sell&&(ffhSelectedZone==='ALL'||p.zone===ffhSelectedZone)).map(p=>p.id);"+
    code+
    "window.__renderScope=()=>{document.querySelector('#scopeRoot').innerHTML=window.scopeBar();window.bindScope(window.__renderScope)};"+
    "window.__scopeState=()=>({zone:ffhSelectedZone,view,manager:window.FFH_SELECTED_TEAM_MANAGER||''});"+
    "window.__renderScope();"
   );
  },logic);
  for(const width of [320,360,390,412]){
   await page.setViewportSize({width,height:844});
   const metrics=await page.evaluate(()=>{
    const fields=[...document.querySelectorAll('.ffDirectScope select')].map(e=>e.getBoundingClientRect());
    return {viewport:innerWidth,docWidth:document.documentElement.scrollWidth,
      boxes:fields.map(r=>({left:r.left,right:r.right,width:r.width,height:r.height}))};
   });
   assert.equal(metrics.boxes.length,2,'two fixed scope selects on mobile');
   assert.ok(metrics.docWidth<=width+1,'no document horizontal overflow at '+width+': '+JSON.stringify(metrics));
   for(const b of metrics.boxes)assert.ok(b.left>=-1&&b.right<=width+1&&b.width>100,'select fits screen: '+JSON.stringify(metrics));
   assert.equal(await page.locator('.ffDirectScope summary,.ffDirectScope .ffSelectTrigger,.globalSearchOverlay').count(),0,'no extra Filter or popup');
   if(width===390)await page.screenshot({path:'/tmp/ffh-direct-filter-390.png'});
  }
  await page.locator('#ffDashboardZone').selectOption('CHERAS');
  assert.deepEqual(await page.locator('#ffScopeStaff option').evaluateAll(opts=>opts.map(o=>o.value)),['ALL','TEAM:M22075','S3']);
  await page.locator('#ffDashboardZone').selectOption('ALL');
  await page.locator('#ffScopeStaff').selectOption('TEAM:M21954');
  assert.deepEqual(await page.evaluate(()=>window.__scopeState()),{zone:'PRIMARY',view:'ALL',manager:'M21954'});
  await page.locator('#ffScopeStaff').selectOption('ALL');
  assert.deepEqual(await page.evaluate(()=>window.__scopeState()),{zone:'PRIMARY',view:'ALL',manager:''});
  await page.locator('#ffScopeStaff').selectOption('S1');
  assert.equal((await page.evaluate(()=>window.__scopeState())).view,'S1');
  await page.screenshot({path:'/tmp/ffh-direct-filter-individual-390.png'});
  console.log('PASS mobile Chromium 320/360/390/412px: two direct controls, no horizontal overflow, manager/combined/individual SR selection');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
