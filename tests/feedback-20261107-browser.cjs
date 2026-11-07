'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const installed=process.env.FFH_CHROMIUM&&fs.existsSync(process.env.FFH_CHROMIUM)?process.env.FFH_CHROMIUM:undefined;
 const browser=await chromium.launch({headless:true,...(installed?{executablePath:installed}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 const css=['styles.css','ffh-direct-filters.css','ffh-visual-followup.css','ffh-orange-compact-20261107.css','ffh-full-height-20261107.css','ffh-feedback-20261107.css'];
 const apply=async page=>{for(const path of css)await page.addStyleTag({path});};
 try{
  const task=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await task.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#030303;margin:0"><div id="app"><div class="app ffBlackGlow"><main class="wrap ffTaskPage"><header class="head"><h1>Tasks, Notes & Reminders</h1></header><details class="ffTaskScope"><summary>Old filter</summary><section class="ffScopeFilter ffDirectScope"><div class="ffScopeFilterBody ffDirectScopeFields"><label class="ffZoneScope">SELECT ZONE<select id="ffDashboardZone"><option value="ALL">All zones</option><option selected value="PRIMARY">PRIMARY</option></select></label><label>SELECT STAFF / SR<select id="ffScopeStaff"><option selected value="ALL">COMBINED TOTAL - ALL SRs</option><option value="S1">Munnaf Ali</option></select></label></div></section></details><section class="ffTaskList"><h2>Tasks & History</h2><div class="ffHistoryScroll">Task history</div></section><details class="ffTaskComposer"><summary>Assign task</summary></details><details class="ffPrivateNoteDrawer"><summary>Private notes</summary></details></main></div></div></body></html>`);
  await apply(task);
  await task.evaluate(()=>{const people={
    S1:{id:'S1',name:'A very long demonstration SR name to ensure nothing clips',companyStaffId:'M22391',manager_id:'M21954',route:'Bukit Bintang and additional territory',zone:'PRIMARY'},
    M21954:{id:'M21954',name:'MEHEDI ALIM AYON',companyStaffId:'M21954',can_manage:true,zone:'PRIMARY'}
   };window.FFH_STAFF_PROFILE=id=>people[id]||null;});
  await task.addScriptTag({path:'searchable-picker.js'});
  await task.addScriptTag({path:'ffh-visual-followup.js'});
  for(const width of [320,360,390,412]){
   await task.setViewportSize({width,height:844});
   await task.locator('#ffScopeStaff + .ffSelectTrigger').waitFor();
   const dim=await task.evaluate(()=>{
    const b=document.querySelector('.ffTaskScope .ffScopeFilter').getBoundingClientRect();
    const buttons=[...document.querySelectorAll('.ffTaskScope .ffSelectTrigger')].map(x=>x.getBoundingClientRect());
    return {height:b.height,width:b.width,buttons:buttons.map(x=>({top:x.top,width:x.width,height:x.height})),scrollWidth:document.documentElement.scrollWidth};
   });
   assert.equal(dim.buttons.length,2,'two visible selectors');
   assert.ok(dim.height>35&&dim.height<90,'scope is slim at '+width+': '+JSON.stringify(dim));
   assert.ok(Math.abs(dim.buttons[0].top-dim.buttons[1].top)<3,'scope controls stay on one line at '+width);
   assert.ok(dim.scrollWidth<=width+3,'no page horizontal overflow at '+width);
  }
  await task.locator('#ffScopeStaff + .ffSelectTrigger').click();
  await task.locator('.ffScopeStaffPicker .ffPickerOption[data-staff-id="S1"]').waitFor();
  for(const height of [844,550]){
   await task.setViewportSize({width:390,height});
   const dim=await task.evaluate(()=>{
    const ov=document.querySelector('.ffScopeStaffPicker'),inp=ov.querySelector('.ffPickerSearch'),row=ov.querySelector('.ffPickerOption[data-staff-id="S1"]');
    const name=row.querySelector('.ffScopeStaffName'),manager=row.querySelector('.ffScopeStaffManager'),fine=row.querySelector('.ffScopeStaffFine');
    const a=row.getBoundingClientRect(),first=ov.querySelector('.ffPickerOption').getBoundingClientRect(),search=inp.getBoundingClientRect();
    return {cardH:a.height,cardMax:getComputedStyle(row).maxHeight,visibleText:row.scrollHeight<=row.clientHeight+3,
      fieldHeight:ov.querySelector('.globalSearchBox').getBoundingClientRect().height,
      firstTop:first.top,searchBottom:search.bottom,nameH:name.getBoundingClientRect().height,
      managerH:manager.getBoundingClientRect().height,fineH:fine.getBoundingClientRect().height,
      viewport:innerHeight,scrollWidth:document.documentElement.scrollWidth};
   });
   assert.equal(dim.cardMax,'none','no forced 78px cap');
   assert.ok(dim.visibleText,'card fully displays name/manager/route '+JSON.stringify(dim));
   assert.ok(dim.firstTop>=dim.searchBottom-2,'rows below search field '+JSON.stringify(dim));
   assert.ok(dim.fieldHeight<=height,'picker fits viewport '+JSON.stringify(dim));
   assert.ok(dim.scrollWidth<=392,'no picker overflow '+JSON.stringify(dim));
  }
  await task.locator('.ffScopeStaffPicker .ffPickerSearch').fill('M22391');
  assert.equal(await task.locator('.ffScopeStaffPicker .ffPickerOption[data-staff-id="S1"]').count(),1,'search filters by staff ID');
  await task.locator('.ffScopeStaffPicker .ffPickerOption[data-staff-id="S1"]').click();
  assert.equal(await task.locator('#ffScopeStaff').inputValue(),'S1','selection works');
  console.log('PASS compact task Zone/SR row and unclipped keyboard-size picker 320/360/390/412px');

  const contact=await browser.newPage({viewport:{width:390,height:844},isMobile:true});
  await contact.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#030303;margin:0"><div id="app"><div class="app ffBlackGlow"><main class="wrap"><article class="ffContactCard"><div class="ffContactTop"><h2>KEY ACCOUNT MANAGER</h2></div><div class="ffContactIdentity ffContactIdentityCompact"><div class="ffContactVisual"><button class="ffContactPhotoButton"><img class="ffContactPhoto" alt="Ayon" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3C/svg%3E"></button><div class="ffContactZone"><small>ZONE</small>KUALA LUMPUR</div></div><div class="ffContactRight"><div class="ffContactNamePanel"><h3>MEHEDI ALIM AYON</h3><div class="ffContactDepartment">Modern Trade</div></div><div class="ffContactCounts"><span>5</span></div></div></div></article></main></div></div></body></html>`);
  await apply(contact);
  const contactDim=await contact.evaluate(()=>{
   const p=document.querySelector('.ffContactPhotoButton').getBoundingClientRect(),z=document.querySelector('.ffContactZone').getBoundingClientRect();
   return {photoLeft:p.left,photoWidth:p.width,zoneLeft:z.left,zoneWidth:z.width,zoneHeight:z.height,zoneLabel:document.querySelector('.ffContactZone').textContent.trim()};
  });
  assert.ok(Math.abs(contactDim.photoLeft-contactDim.zoneLeft)<2,'zone starts at photo left');
  assert.ok(Math.abs(contactDim.photoWidth-contactDim.zoneWidth)<2,'zone ends at photo right');
  assert.ok(contactDim.zoneHeight<=31&&contactDim.zoneHeight>=26,'slim zone row: '+JSON.stringify(contactDim));
  assert.match(contactDim.zoneLabel,/ZONE\s*KUALA LUMPUR/);
  console.log('PASS centered compact Contact zone band matching portrait width');

  const chat=await browser.newPage({viewport:{width:390,height:844},isMobile:true});
  await chat.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#030303;margin:0"><div id="app"><div class="app ffBlackGlow"><main class="wrap"><section class="ffMessenger ffConversationOpen"><div class="ffChatConversation"><div id="ffChatTitle" class="cardTitle">LEHAN HOSSAIN</div></div></section></main></div></div></body></html>`);
  await chat.evaluate(()=>{history.replaceState({ffhPage:'communication',ffhChatPeer:'M22396'},'');window.FFH_STAFF_PROFILE=id=>id==='M22396'?{staff_id:'M22396',full_name:'LEHAN HOSSAIN',role:'SR',designation:'SR',can_sell:true}:null;});
  await chat.addStyleTag({path:'black-glow-theme.css'});
  await chat.addStyleTag({path:'ffh-feedback-20261107.css'});
  await chat.addScriptTag({path:'black-glow-theme.js'});
  await chat.addScriptTag({path:'ffh-chat-identity-20261107.js'});
  await chat.waitForFunction(()=>document.querySelector('#ffChatTitle .ffChatIdentityRole')?.textContent.includes('SR'));
  for(let i=0;i<5;i++){
   // The real chat repaints its title before the shared avatar manager adds an
   // initial letter. Repeat to detect runaway MutationObserver concatenation.
   await chat.evaluate(()=>{
    const el=document.querySelector('#ffChatTitle');el.textContent='LEHAN HOSSAIN';
    const avatar=document.createElement('span');avatar.className='ffChatTitleAvatar';avatar.textContent='L';el.prepend(avatar);
   });
   await chat.waitForFunction(()=>document.querySelector('#ffChatTitle .ffChatIdentityRole')?.textContent==='SR · M22396');
   await chat.waitForTimeout(75);
   const state=await chat.evaluate(()=>({name:document.querySelector('.ffChatIdentityName')?.textContent,role:document.querySelector('.ffChatIdentityRole')?.textContent,avatarCount:document.querySelectorAll('#ffChatTitle .ffChatTitleAvatar').length,len:document.querySelector('#ffChatTitle').textContent.length}));
   assert.equal(state.name,'LEHAN HOSSAIN');
   assert.equal(state.role,'SR · M22396');
   assert.equal(state.avatarCount,1);
   assert.ok(state.len<70,'no repeated L multiplication '+JSON.stringify(state));
  }
  console.log('PASS stable Live Chat peer name/role for LEHAN HOSSAIN; no repeated initial');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
