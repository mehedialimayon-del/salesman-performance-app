'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const site='https://mehedialimayon-del.github.io/salesman-performance-app/';
const browserConfig=process.env.FFH_CHROMIUM?{executablePath:process.env.FFH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']}: {};
(async()=>{
 const browser=await chromium.launch({headless:true,...browserConfig});
 try{
  const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  page.on('pageerror',e=>console.log('Site script warning:',e.message.slice(0,240)));
  let ready=false;
  for(let n=0;n<14;n++){
   await page.goto(site,{waitUntil:'domcontentloaded',timeout:50000});
   try{
    await page.waitForFunction(()=>!!(window.FFH_STAFF_DIRECTORY&&window.FFH_CREATE_ACCOUNTS&&
      document.querySelector('link[href*="staff-directory.css?v=leadership-"]')&&
      document.querySelector('script[src*="accounts.js?v=leadership-"]')),
    null,{timeout:7000});
    ready=true;break;
   }catch(e){
    console.log('Published site not updated, refreshing',n+1);
    await page.waitForTimeout(4500);
   }
  }
  assert.ok(ready,'Latest changed assets were not published on live GitHub Pages.');
  await page.evaluate(async()=>{
   const qa=document.createElement('div');qa.id='ffLiveQa';
   qa.style.cssText='width:393px;max-width:100%;margin:0 auto;padding:10px;background:#090909;color:white;min-height:100vh;position:relative;z-index:2147483640';
   document.body.appendChild(qa);
   const staff=[
    {staff_id:'M21954',company_staff_id:'M21954',full_name:'MEHEDI ALIM AYON',zone_id:'PRIMARY',designation:'MANAGER',can_manage:true,can_sell:false,active:true,manager_id:'PERVES_HIRA'},
    {staff_id:'PERVES_HIRA',company_staff_id:'PERVES_HIRA',full_name:'PERVES HIRA',zone_id:'HEAD_OFFICE',designation:'HEAD_OF_SALES',can_manage:true,can_sell:false,active:true},
    {staff_id:'WAHID_ADMIN',company_staff_id:'WAHID_ADMIN',full_name:'WAHIDUR RAHMAN',zone_id:'PRIMARY',designation:'SALES_ADMIN',can_manage:true,can_sell:false,active:true},
    {staff_id:'M22328',company_staff_id:'M22328',full_name:'Md Munnaf Ali',zone_id:'PRIMARY',designation:'SR',can_manage:false,can_sell:true,active:true,manager_id:'M21954'},
    {staff_id:'M22075',company_staff_id:'M22075',full_name:'MOHAMMAD BODRUDDAZA EMON',zone_id:'CHERAS',designation:'MANAGER',can_manage:true,can_sell:false,active:true},
    {staff_id:'M22320',company_staff_id:'M22320',full_name:'Cheras SR',zone_id:'CHERAS',designation:'SR',can_manage:false,can_sell:true,active:true,manager_id:'M22075'}
   ];
   const zones=[{id:'PRIMARY',name:'KL',active:true},{id:'HEAD_OFFICE',name:'Head Office',active:true},{id:'CHERAS',name:'Cheras',active:true}];
   const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
   const ctx={FFH_SUPABASE:{
    rpc:async()=>({data:{owner:true,administrator:true,profiles:staff,zones,grants:[{staff_id:'M22328',module:'sales',can_edit:true,can_upload:false,can_delete:true}],zone_access:[],requests:[],outlets:[]},error:null}),
    functions:{invoke:async()=>({data:{password_changed:true},error:null})}
   },shell:html=>qa.innerHTML=html,back:t=>'<div class="head ffNoScreenBack"><h1>'+esc(t)+'</h1></div>',
   bindBack:()=>{},q:s=>document.querySelector(s),qa:s=>[...document.querySelectorAll(s)],
   esc,user:()=>({id:'M21954',name:'MEHEDI ALIM AYON',can_manage:true}),
   setPage:()=>{},ffhLoadCloud:async()=>{}};
   window.__QA_ACCOUNTS=window.FFH_CREATE_ACCOUNTS(ctx);
   await window.__QA_ACCOUNTS();
  });
  const section=page.locator('#ffLiveQa');
  await section.locator('#ffStaffSearch').waitFor();
  const titles=await section.locator('.ffTeamZoneHeader h3').allTextContents();
  assert.equal(titles[0].trim(),'HEAD OFFICE');
  assert.equal(titles[1].trim(),'KL ZONE');
  assert.equal(titles[2].trim(),'CHERAS TEAM');
  const people=await section.locator('[data-zone-id="HEAD_OFFICE_LEADERSHIP"] [data-ff-staff-item] strong').allTextContents();
  assert.deepEqual(people,['MEHEDI ALIM AYON','PERVES HIRA','WAHIDUR RAHMAN']);
  const kl=await section.locator('[data-zone-id="PRIMARY"] [data-ff-staff-item] strong').allTextContents();
  assert.deepEqual(kl,['Md Munnaf Ali']);
  await section.locator('#ffStaffSearch').fill('emon');
  assert.equal(await section.locator('[data-ff-staff-item]:visible').count(),1);
  await section.locator('#ffStaffSearch').fill('');
  await section.locator('.ffEditAccount[data-id="M22328"]').click();
  await section.locator('#ffAccountForm').waitFor();
  const tick=section.locator('.ffPermissionRow[data-module="sales"] [data-verb="edit"]');
  assert.equal(await tick.isChecked(),true);
  const appearance=await tick.evaluate(el=>getComputedStyle(el).appearance);
  assert.notEqual(appearance,'none','Permission tick must use visible checkbox appearance');
  await section.locator('#back').click();
  await section.locator('#ffStaffSearch').waitFor({timeout:10000});
  assert.equal(await section.locator('.ffTeamZone').count(),3,'Back returns directory instead of Home');
  const overflow=await section.evaluate(el=>({
   client:el.clientWidth,scroll:el.scrollWidth,
   ticks:[...el.querySelectorAll('.ffPermissionRow input[type="checkbox"]')].length
  }));
  assert.ok(overflow.scroll<=overflow.client+15,'Live mobile team layout should not overflow horizontally: '+JSON.stringify(overflow));
  console.log('PASS live GitHub Pages mobile Chromium: Head Office order, no duplicate Ayon, search, real CSS ticks and Back navigation.');
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
