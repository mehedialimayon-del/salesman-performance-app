const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const mock=fs.readFileSync('tests/duty-ui.cjs','utf8').split('const mock=')[1].split('\n(async()=>')[0].replace(/;\s*$/,'');
const augment=()=>{const original=window.supabase.createClient;window.supabase.createClient=(...args)=>{const sb=original(...args),rpc=sb.rpc;sb.rpc=(action,payload)=>action==='ffh_staff_photo_directory'?Promise.resolve({data:[{staff_id:'M21954',full_name:'MEHEDI ALIM AYON',photo_url:'https://qa.fieldforce.test/photos/owner.png'},{staff_id:'M22075',full_name:'Test Colleague',photo_url:'https://qa.fieldforce.test/photos/colleague.png'}],error:null}):rpc(action,payload);return sb;};};
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.FFH_CHROMIUM?{executablePath:process.env.FFH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
try{
for(const id of ['M21954','M22075']){
 const ctx=await browser.newContext({viewport:{width:412,height:844},geolocation:{latitude:3.139,longitude:101.687},permissions:['geolocation']});
 const page=await ctx.newPage();
 await page.route('https://qa.fieldforce.test/photos/**',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y5AAsoAAAAASUVORK5CYII=','base64')}));
 await page.route('https://cdn.jsdelivr.net/npm/@supabase/**',route=>route.fulfill({contentType:'text/javascript',body:'('+mock+')('+JSON.stringify(id)+',true);('+augment.toString()+')();'}));
 await page.route('https://cdn.onesignal.com/**',route=>route.fulfill({contentType:'text/javascript',body:''}));
 await page.goto(process.env.FFH_TEST_URL||'http://127.0.0.1:8765');
 await page.locator('.ffIdentityHero .editableAvatar').waitFor({timeout:25000});
 if(await page.locator('#ffhEntryAllow').count())await page.locator('#ffhEntryAllow').click();
 await page.locator('.ffOwnPhotoEdit').waitFor({timeout:20000});
 await page.waitForFunction(()=>!!window.FFH_STAFF_PHOTOS?.find('M22075'),null,{timeout:12000});
 assert.equal(await page.locator('.ffIdentityHero .editableAvatar.zoomable').count(),1,'own image supports zoom');
 await page.locator('.ffIdentityHero .editableAvatar').click();
 await page.locator('.ffPhotoViewer').waitFor({timeout:5000});
 await page.locator('.ffPhotoViewer [data-action=close]').click();
 await page.evaluate(()=>{window.__ownPhotoEditOpened=false;window.changeOwnPhoto=()=>{window.__ownPhotoEditOpened=true;};});
 await page.locator('.ffOwnPhotoEdit').click();assert.equal(await page.evaluate(()=>window.__ownPhotoEditOpened),true);
 if(id==='M21954'){
  await page.locator('[data-page="dashboard"]').click();
  await page.locator('.dashHero').waitFor();
  const staff=page.locator('#ffScopeStaff');if(await staff.count()){await staff.evaluate(select=>{select.value='M22075';select.dispatchEvent(new Event('change',{bubbles:true}));});await page.locator('.ffDashStaffIdentity .ffStaffPhoto').waitFor({timeout:10000});}
 }
 await page.locator('#bh').click();await page.locator('[data-page="communication"]').click();
 await page.locator('#ffChooseChatPerson').waitFor({timeout:10000});
 await page.locator('#ffChooseChatPerson').click();
 await page.locator('.ffItemPicker .ffPickerOption').first().waitFor({timeout:5000});
 await page.locator('.ffItemPicker .ffPickerAvatar').first().waitFor({timeout:8000});
 assert.ok(await page.locator('.ffItemPicker .ffPickerAvatar').count()>=1,'chat contact picker includes portrait');
 console.log('PASS Chromium home profile zoom/edit, manager scoped dashboard and chat staff selection: '+id);
 await ctx.close();
}
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});