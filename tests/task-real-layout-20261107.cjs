'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const mock=fs.readFileSync('tests/duty-ui.cjs','utf8').split('const mock=')[1].split('\n(async()=>')[0].replace(/;\s*$/,'');
(async()=>{
 const chrome=process.env.FFH_CHROMIUM||'/usr/bin/google-chrome';
 const browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/**',r=>r.fulfill({contentType:'text/javascript',body:'('+mock+')("M21954",true)'}));
  await page.route('https://cdn.onesignal.com/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await page.goto('http://127.0.0.1:8765');
  await page.locator('[data-page=tasks]').waitFor();
  // Fixture-only permission overlay: do not gate layout measurements on Android setup.\n  await page.evaluate(()=>{document.querySelector('#ffhEntryPermissions')?.remove();document.querySelector('#app>.app')?.removeAttribute('inert');});
  await page.locator('[data-page=tasks]').click();
  await page.locator('.ffTaskScope').waitFor();
  await page.waitForTimeout(900);
  const data=await page.evaluate(()=>{
   const filter=document.querySelector('.ffTaskScope');
   const row=filter.querySelector('.ffScopeFilterBody')||filter.querySelector('.ffDirectScopeFields');
   const zone=document.querySelector('#ffDashboardZone');
   const person=document.querySelector('#ffScopeStaff');
   const styles=el=>{if(!el)return null;const s=getComputedStyle(el),r=el.getBoundingClientRect();return {tag:el.tagName,cls:el.className,width:r.width,height:r.height,pad:s.padding,margin:s.margin,minHeight:s.minHeight,maxHeight:s.maxHeight,display:s.display,position:s.position}};
   return {filterHtml:filter.outerHTML.slice(0,3200),task:styles(filter.closest('main')),scope:styles(filter),scopeChildren:[...filter.children].map(styles),row:styles(row),zone:styles(zone),person:styles(person),zoneLabel:styles(zone?.closest('label')),personLabel:styles(person?.closest('label')),sourceTags:[...document.querySelectorAll('link[rel=stylesheet]')].slice(-7).map(x=>x.getAttribute('href'))};
  });
  console.log('REAL_TASK_LAYOUT',JSON.stringify(data));
  await page.screenshot({path:'/tmp/ffh-actual-task-layout-debug.png'});
  assert.ok(data.scope,'Task selector exists');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
