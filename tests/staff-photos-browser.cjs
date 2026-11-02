const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const mock=fs.readFileSync('tests/duty-ui.cjs','utf8').split('const mock=')[1].split('\n(async()=>')[0].replace(/;\s*$/,'');
const augment=()=>{const original=window.supabase.createClient;window.supabase.createClient=(...args)=>{
 const sb=original(...args),rpc=sb.rpc,originalFrom=sb.from,originalStorage=sb.storage.from;
 const authId=JSON.parse(localStorage.getItem('ffh_session')||'null')?.id||window.__qaCurrentId||'M21954';
 window.__qaPhotoRows=[{staff_id:'M21954',full_name:'MEHEDI ALIM AYON',photo_url:'https://qa.fieldforce.test/photos/owner.png'},{staff_id:'M22075',full_name:'Test Colleague',photo_url:'https://qa.fieldforce.test/photos/colleague.png'}];window.__qaPhotoUploads=[];
 sb.rpc=(action,payload)=>action==='ffh_staff_photo_directory'?Promise.resolve({data:window.__qaPhotoRows,error:null}):rpc(action,payload);
 sb.from=(name)=>{const q=originalFrom(name);if(name!=='ffh_profiles')return q;return new Proxy(q,{get(target,key){
  if(key==='select')return fields=>fields==='staff_id,active,login_approved,photo_url'?{eq:()=>({maybeSingle:async()=>({data:{staff_id:window.__qaCurrentId,active:true,login_approved:true},error:null})})}:target.select(fields);
  if(key==='update')return changes=>{window.__qaPhotoSave=changes;window.__qaPhotoRows.find(x=>x.staff_id===window.__qaCurrentId).photo_url=changes.photo_url;const c={eq:()=>c,select:()=>c,maybeSingle:async()=>({data:{staff_id:window.__qaCurrentId,photo_url:changes.photo_url},error:null})};return c;};
  return target[key];
 }});};
 sb.storage.from=bucket=>bucket==='ffh-public'?{upload:async(path,blob,options)=>{const im=await createImageBitmap(blob);window.__qaPhotoUploads.push({path,size:blob.size,width:im.width,height:im.height,options});im.close();return {error:null};},getPublicUrl:path=>({data:{publicUrl:'https://qa.fieldforce.test/photos/'+path.split('/').pop()}})}:originalStorage(bucket);
 return sb;};};
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.FFH_CHROMIUM?{executablePath:process.env.FFH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage']}: {})});
try{
for(const id of ['M21954','M22075']){
 const ctx=await browser.newContext({viewport:{width:412,height:844},geolocation:{latitude:3.139,longitude:101.687},permissions:['geolocation']});
 const page=await ctx.newPage();
 await page.route('https://qa.fieldforce.test/photos/**',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y5AAsoAAAAASUVORK5CYII=','base64')}));
 await page.route('https://cdn.jsdelivr.net/npm/@supabase/**',route=>route.fulfill({contentType:'text/javascript',body:'('+mock+')('+JSON.stringify(id)+',true);('+augment.toString()+')();'}));
 await page.route('https://cdn.onesignal.com/**',route=>route.fulfill({contentType:'text/javascript',body:''}));
 await page.addInitScript(staff=>window.__qaCurrentId=staff,id);
 await page.goto(process.env.FFH_TEST_URL||'http://127.0.0.1:8765');
 await page.locator('.ffIdentityHero .editableAvatar').waitFor({timeout:25000});
 if(await page.locator('#ffhEntryAllow').count())await page.locator('#ffhEntryAllow').click();
 await page.locator('#ffSetProfilePicture').waitFor({state:'attached',timeout:20000});assert.equal(await page.locator('.ffOwnPhotoEdit').count(),0);
 await page.waitForFunction(()=>!!window.FFH_STAFF_PHOTOS?.find('M22075'),null,{timeout:12000});
 assert.equal(await page.locator('.ffIdentityHero .editableAvatar.zoomable').count(),1,'own image supports zoom');
 await page.locator('.ffIdentityHero .editableAvatar').click();
 await page.locator('.ffPhotoViewer').waitFor({timeout:5000});
 await page.locator('.ffPhotoViewer [data-action=close]').click();
 await page.locator('#dots').click();await page.locator('#ffSetProfilePicture').click();
 await page.locator('#ffProfilePhotoDialog').waitFor();
 assert.equal(await page.locator('#ffProfilePhotoFile').getAttribute('accept'),'.jpg,.jpeg,.png,.webp');
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=96;c.height=120;const x=c.getContext('2d');x.fillStyle='#ff7a18';x.fillRect(0,0,96,120);return c.toDataURL('image/png').split(',')[1];});await page.locator('#ffProfilePhotoFile').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await page.locator('#ffProfilePhotoPreview').waitFor({state:'visible'});
 const shape=await page.locator('#ffProfileCropStage').evaluate(el=>getComputedStyle(el).borderRadius);
 assert.ok(shape.includes('50%'),'crop frame is actually circular');
 await page.locator('#ffPhotoCropPlus').click();
 assert.ok(Number(await page.locator('#ffPhotoCropZoom').inputValue())>100,'zoom in updates crop');
 const rect=await page.locator('#ffProfileCropStage').boundingBox();
 await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);
 await page.mouse.down();await page.mouse.move(rect.x+rect.width/2+14,rect.y+rect.height/2+12,{steps:4});await page.mouse.up();
 assert.match(await page.locator('#ffProfilePhotoPreview').getAttribute('style'),/translate\(/,'drag positions crop');
 await page.locator('#ffProfilePhotoSave').click();
 try{await page.waitForFunction(()=>!!window.__qaPhotoSave,null,{timeout:12000});}catch(ex){const detail=await page.evaluate(()=>({status:document.querySelector('#ffProfilePhotoStatus')?.textContent,uploads:window.__qaPhotoUploads,currentId:window.__qaCurrentId,auth:!!window.FFH_SUPABASE?.auth}));throw Error('Profile save did not finish: '+JSON.stringify(detail));}
 assert.equal(await page.evaluate(()=>window.__qaPhotoUploads.length),2,'full original and cropped avatar both uploaded');
 assert.equal(await page.evaluate(()=>window.__qaPhotoUploads.every(x=>x.path.startsWith('profiles/'+window.__qaCurrentId.toLowerCase()+'/'))),true,'both images in own staff folder');
 assert.equal(await page.evaluate(()=>window.__qaPhotoUploads[1].width),640,'avatar crop is 640px square');
 assert.equal(await page.evaluate(()=>window.__qaPhotoUploads[1].height),640,'avatar crop is 640px square');
 assert.equal(await page.evaluate(()=>window.__qaPhotoUploads[0].height>window.__qaPhotoUploads[0].width),true,'full photo keeps portrait aspect ratio');
 await page.locator('#ffProfilePhotoDialog').waitFor({state:'detached',timeout:12000});
 await page.waitForFunction(()=>document.querySelector('.ffIdentityHero .editableAvatar')?.src.includes('/photo-v2-'),null,{timeout:10000});
 assert.ok((await page.locator('.ffIdentityHero .editableAvatar').getAttribute('data-full-src')).includes('/full-v2-'),'avatar click preserves the uncropped photo for zoom');
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
 await page.locator('.ffItemPicker .globalSearchBox > .row button.secondary').first().click();
 await page.locator('.ffItemPicker').waitFor({state:'detached',timeout:4000});
 await page.evaluate(()=>{
  const select=document.createElement('select');select.id='ffAssignQaSelect';select.multiple=true;
  select.innerHTML='<option value="M22075">Test Colleague</option><option value="M21954">MEHEDI ALIM AYON</option>';
  document.querySelector('main.wrap').append(select);
  window.FFH_STYLE_MULTI_SELECT(select,{title:'Assign staff'});
 });
 await page.locator('#ffAssignQaSelect + .ffSelectTrigger').click();
 await page.locator('.ffMultiPicker .ffPickerAvatar').first().waitFor({timeout:8000});
 const assignLayout=await page.locator('.ffMultiPicker .ffMultiOption').first().evaluate(row=>{
  const photo=row.querySelector('.ffPickerAvatar').getBoundingClientRect();
  const name=row.querySelector('span:not(.ffPickerAvatar)').getBoundingClientRect();
  return {photoX:photo.x,nameX:name.x,photoWidth:photo.width,height:row.getBoundingClientRect().height};
 });
 assert.ok(assignLayout.photoX<assignLayout.nameX,'round photo displayed before the SR name');
 assert.ok(assignLayout.photoWidth>=36,'assign photo large enough to recognize');
 assert.ok(assignLayout.height<=84,'assign option is compact rather than a tall card');

 console.log('PASS Chromium circular pinch-ready crop, drag and zoom, saved cropped + original photo, manager dashboard, chat and compact assign picker: '+id);
 await ctx.close();
}
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});