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
  for(let n=0;n<12;n++){
   const response=await page.goto(site+'?qa_version=outlets-avatar-mobile1&attempt='+n,{waitUntil:'domcontentloaded',timeout:50000});
   console.log('Live HTTP status:',response?.status(),'URL:',page.url());
   try{
    await page.waitForFunction(()=>!!(window.FFH_STAFF_DIRECTORY&&window.FFH_CREATE_ACCOUNTS&&
      document.querySelector('link[href*="account-outlet-access.css?v=20261103-responsive-1"]')&&
      document.querySelector('script[src*="accounts.js?v=20261103-outlets-edit-1"]')&&
      document.querySelector('script[src*="staff-directory.js?v=20261103-all-zone-avatars-1"]')&&
      document.querySelector('script[src*="account-outlet-access.js?v=20261103-owner-excel-1"]')),
    null,{timeout:7000});
    ready=true;break;
   }catch(e){
    console.log('Site diagnosis',JSON.stringify(await page.evaluate(()=>({title:document.title,htmlSize:document.documentElement.outerHTML.length,script:document.querySelector('script[src*="accounts.js"]')?.getAttribute('src'),css:document.querySelector('link[href*="staff-directory.css"]')?.getAttribute('href'),accounts:!!window.FFH_CREATE_ACCOUNTS,directory:!!window.FFH_STAFF_DIRECTORY,body:document.body?.innerText.slice(0,140)}))),'refresh',n+1);
    await page.waitForTimeout(4500);
   }
  }
  assert.ok(ready,'Latest changed assets were not published on live GitHub Pages.');
  await page.addStyleTag({content:'#onesignal-slidedown-container,.onesignal-slidedown-container {display:none!important;pointer-events:none!important}'});
  await page.evaluate(async()=>{
   const qa=document.createElement('div');qa.id='ffLiveQa';
   qa.style.cssText='width:393px;max-width:100%;margin:0 auto;padding:10px;background:#090909;color:white;min-height:100vh;position:relative;z-index:100';
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
   window.__qaOutletSaved=null;
   const outletBase={can_sell:true,active_total:2,inactive_total:0,
    outlets:[{code:'00012',name:'First Outlet',category:'NSK',total_sku:10,active:true},
             {code:'00013',name:'Second Outlet',category:'Giant',total_sku:8,active:true}]};
   const ctx={FFH_SUPABASE:{
    rpc:async(name,args)=>{
     if(name==='ffh_owner_outlet_access'){
      if(args?.action==='import'){window.__qaOutletSaved=args.payload.rows;return{data:{...outletBase,imported:args.payload.rows.length,active_total:4},error:null};}
      return {data:outletBase,error:null};
     }
     return {data:{owner:true,administrator:true,profiles:staff,zones,grants:[{staff_id:'M22328',module:'sales',can_edit:true,can_upload:false,can_delete:true}],zone_access:[],requests:[],outlets:[]},error:null};
    },
    functions:{invoke:async()=>({data:{password_changed:true},error:null})}
   },shell:html=>qa.innerHTML=html,back:t=>'<div class="head ffNoScreenBack"><h1>'+esc(t)+'</h1></div>',
   bindBack:()=>{},q:s=>document.querySelector(s),qa:s=>[...document.querySelectorAll(s)],
   esc,user:()=>({id:'M21954',name:'MEHEDI ALIM AYON',can_manage:true}),
   setPage:()=>{},ffhLoadCloud:async()=>{}};
   window.__QA_ACCOUNTS=window.FFH_CREATE_ACCOUNTS(ctx);
   await window.__QA_ACCOUNTS();
  });
  // The published site is tested with an isolated, mocked photo directory.
  // No real user's profile or Auth data is modified by this browser test.
  await page.route('https://qa.fieldforce.test/profiles/**',route=>route.fulfill({
   contentType:'image/png',
   body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y5AAsoAAAAASUVORK5CYII=','base64')
  }));
  await page.evaluate(async()=>{
   localStorage.setItem('ffh_session',JSON.stringify({id:'M21954'}));
   const sb=window.FFH_SUPABASE;
   const original=sb.rpc.bind(sb);
   window.__qaPhotoVersion='a';
   sb.rpc=(name,payload)=>name==='ffh_staff_photo_directory'?
    Promise.resolve({data:['M21954','PERVES_HIRA','WAHID_ADMIN','M22328','M22075','M22320']
      .map(id=>({staff_id:id,full_name:id,photo_url:'https://qa.fieldforce.test/profiles/'+id.toLowerCase()+'/photo-v2-'+window.__qaPhotoVersion+'.png'})),error:null}):
    original(name,payload);
   await window.FFH_STAFF_PHOTOS.refresh(true);
   window.FFH_STAFF_PHOTOS.render();
  });
  await page.locator('#ffLiveQa [data-ff-staff-avatar="M21954"] img.ffStaffPhoto').waitFor({timeout:8000});
  assert.equal(await page.locator('#ffLiveQa [data-ff-staff-avatar] img.zoomable').count(),6,
    'Every tested team member gets the correct round profile image');
  const photoSource=await page.locator('#ffLiveQa [data-ff-staff-avatar="PERVES_HIRA"] img.ffStaffPhoto').getAttribute('src');
  assert.ok(photoSource.includes('/perves_hira/'),'Parvez uses his own ID-specific photo, not owner photo');
  await page.locator('#ffLiveQa [data-ff-staff-avatar="M21954"] img.zoomable').click();
  await page.locator('.ffPhotoViewer').waitFor();
  assert.ok((await page.locator('.ffPhotoViewer img').getAttribute('src')).includes('/full-v2-'),
    'Zoom opens full original portrait, not cropped thumbnail');
  await page.locator('.ffPhotoViewer [data-action="in"]').click();
  assert.notEqual(await page.locator('.ffPhotoViewer output').textContent(),'100%');
  await page.locator('.ffPhotoViewer [data-action="close"]').click();
  await page.evaluate(async()=>{
   window.__qaPhotoVersion='b';
   await window.FFH_STAFF_PHOTOS.refresh(true);
   window.FFH_STAFF_PHOTOS.render();
  });
  await page.waitForFunction(()=>document.querySelector('#ffLiveQa [data-ff-staff-avatar="M21954"] img')?.src.includes('photo-v2-b'),null,{timeout:8000});
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
  const editOverflow=await section.locator('#ffAccountForm').evaluate(form=>({
    formWidth:form.getBoundingClientRect().width,
    viewWidth:document.documentElement.clientWidth,
    documentScroll:document.documentElement.scrollWidth
  }));
  assert.ok(editOverflow.documentScroll<=editOverflow.viewWidth+6,
   'Edit/permissions screen must not overflow 393px mobile viewport: '+JSON.stringify(editOverflow));
  await section.locator('#ffEditOutletAccessOpen').click();
  await section.locator('#ffOutletAccessRows .ffOutletListRow').first().waitFor();
  assert.match(await section.locator('.ffOutletTotals').innerText(),/TOTAL OUTLETS: 2/);
  assert.equal(await section.locator('.ffOutletListRow').count(),2);
  assert.match(await section.locator('.ffOutletListRow').first().innerText(),/1\.\s*First Outlet/);
  page.on('dialog',dialog=>dialog.accept());
  await section.locator('#ffOutletExcelFile').setInputFiles({
    name:'staff-outlets.csv',mimeType:'text/csv',
    buffer:Buffer.from('Outlet Code,Outlet Name,Category,Total SKU\n00021,New Outlet,NSK,6\n00022,Another Outlet,Giant,0')
  });
  await page.waitForTimeout(450);
  console.log('OUTLET FILE CHECK',JSON.stringify(await section.evaluate(el=>({
    status:el.querySelector('#ffOutletAccessStatus')?.textContent,
    preview:el.querySelector('#ffOutletExcelPreview')?.textContent?.slice(0,260),
    filename:el.querySelector('#ffOutletExcelFile')?.files?.[0]?.name,
    xlsxLoaded:!!window.XLSX?.read,buttonDisabled:el.querySelector('#ffOutletUploadSave')?.disabled
  }))));
  await section.locator('#ffOutletUploadSave:not([disabled])').waitFor({timeout:10000});
  await section.locator('#ffOutletUploadSave').click();
  await page.waitForFunction(()=>Array.isArray(window.__qaOutletSaved),null,{timeout:10000});
  assert.equal(await page.evaluate(()=>window.__qaOutletSaved.length),2);
  assert.match(await section.locator('#ffOutletAccessStatus').innerText(),/Saved 2 outlets/);
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
