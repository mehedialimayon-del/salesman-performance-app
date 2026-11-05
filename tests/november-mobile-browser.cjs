'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.FFH_CHROMIUM?{executablePath:process.env.FFH_CHROMIUM}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 for(const width of [320,360,412]){
  const page=await browser.newPage({viewport:{width,height:790}});
  const html=(inner)=>'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#080808;color:#fff"><div id="app"><div class="app"><main class="wrap" style="margin-top:175px;width:100%;box-sizing:border-box">'+inner+'</main><nav class="bottomSeven" style="position:fixed;left:0;right:0;bottom:0;height:82px;background:#080808"></nav></div></div></body></html>';
  await page.setContent(html('<div class="ffProposalPage"><div class="ffProposalStack">'+
   [1,2,3].map(i=>'<article class="ffProposalStrip"><div class="ffProposalVisual"><img class="ffFramedArt" src="data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20'+(i===2?'180%20200':'600%20200')+'%22%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20fill=%22%23000%22/%3E%3C/svg%3E"></div><div class="ffProposalActions"><button>CREATE</button></div></article>').join('')+'</div></div>'));
  await page.addStyleTag({content:fs.readFileSync('screen-refinements.css','utf8')+'\n'+fs.readFileSync('proposal-orders.css','utf8')+'\n'+fs.readFileSync('november-mobile-fixes.css','utf8')});
  const proposal=await page.locator('.ffProposalVisual').evaluateAll(els=>els.map(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,background:getComputedStyle(el).backgroundColor,fit:getComputedStyle(el.querySelector('img')).objectFit})));
  assert.ok(proposal.every(x=>Math.abs(x.h-proposal[0].h)<2),'all proposal cards same height at '+width);
  assert.ok(proposal.every(x=>x.fit==='fill'),'art is full-bleed without external letterboxing');
  await page.setContent(html('<article class="ffContactCard"><div class="ffContactTop"><h2 class="ffContactDesignation">KEY ACCOUNT MANAGER</h2></div><div class="ffContactIdentity"><button class="ffContactPhotoButton"><img class="ffContactPhoto" src="data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3C/svg%3E"></button><div class="ffContactNamePanel"><h3>MEHEDI ALIM AYON</h3><div class="ffContactDepartment">Modern Trade</div></div><div class="ffContactTags"><span><small>Zone</small><b>KUALA LUMPUR</b></span><span><small>Salesmen</small><b>5</b></span><span><small>Routes</small><b>5</b></span><span><small>Sales team</small><b>A Team</b></span></div></div><div class="ffContactLinks"><a>WhatsApp</a><a>Email</a></div></article>'));
  await page.addStyleTag({content:fs.readFileSync('contacts.css','utf8')+'\n'+fs.readFileSync('november-mobile-fixes.css','utf8')});
  await page.addScriptTag({content:fs.readFileSync('november-mobile-fixes.js','utf8')});
  await page.waitForFunction(()=>!!document.querySelector('.ffCompactContactCard'));
  const contact=await page.locator('.ffContactCard').evaluate(el=>({h:el.getBoundingClientRect().height,overflow:el.scrollWidth>el.clientWidth,counts:el.querySelectorAll('.ffContactMiniStats>span').length,zone:el.querySelector('.ffContactZoneFull b')?.textContent,links:el.querySelectorAll('.ffContactLinks a').length,extras:!!el.querySelector('.ffContactExtraDetails')}));
  assert.equal(contact.overflow,false,'no contact horizontal overflow at '+width);
  assert.equal(contact.counts,2);assert.equal(contact.zone,'KUALA LUMPUR');assert.equal(contact.links,2);assert.ok(contact.extras);
  assert.ok(contact.h<430,'contact should be compact at '+width+', height='+contact.h);
  await page.setContent(html('<section class="ffZeroBoard"><div class="ffZeroSummary">33 outlets</div><div class="ffOutletList"><input class="ffOutletSearch" placeholder="Search"><div class="ffOutletRows">'+Array.from({length:10},(_,i)=>'<div class="ffZeroOutlet" style="height:155px">Outlet '+i+'</div>').join('')+'</div></div></section>'));
  await page.addStyleTag({content:fs.readFileSync('page-frame.css','utf8')+'\n'+fs.readFileSync('november-mobile-fixes.css','utf8')});
  await page.addScriptTag({content:fs.readFileSync('november-mobile-fixes.js','utf8')});
  await page.waitForFunction(()=>!!document.querySelector('main.wrap').style.getPropertyValue('--ff-zero-main-height'));
  const z=await page.evaluate(()=>({main:document.querySelector('main.wrap').getBoundingClientRect().bottom,nav:document.querySelector('nav.bottomSeven').getBoundingClientRect().top,list:document.querySelector('.ffOutletRows').clientHeight,scroll:document.querySelector('.ffOutletRows').scrollHeight}));
  assert.ok(Math.abs(z.main-z.nav)<24,'zero list ends by bottom nav at '+width+' '+JSON.stringify(z));
  assert.ok(z.scroll>z.list,'zero outlets stay scrollable');
  await page.setContent('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0"><div id="app"></div><div class="ffTaskModalBackdrop"><section class="ffTaskModal"><header><h2>Assign task</h2></header><div class="ffTaskModalBody"><form class="form"><label>Assigned to<select><option>MEHEDI ALIM AYON · M21954 · PRIMARY · MANAGER</option></select></label><label>Deadline<input type="date"></label><textarea>Task</textarea></form></div></section></div></body></html>');
  await page.addStyleTag({content:fs.readFileSync('interaction-refresh.css','utf8')+'\n'+fs.readFileSync('november-mobile-fixes.css','utf8')});
  const modal=await page.locator('.ffTaskModal').evaluate(el=>{const r=el.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,content:el.querySelector('.ffTaskModalBody').scrollWidth,client:el.querySelector('.ffTaskModalBody').clientWidth}});
  assert.ok(modal.left>=0&&modal.right<=width+1,'task modal stays within screen at '+width+' '+JSON.stringify(modal));
  assert.ok(modal.content<=modal.client+1,'task body has no horizontal overflow');
  await page.close();
  console.log('PASS 320/360/412 proposal card sizes, compact contacts, Zero Sales full height, task modal width at '+width);
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
