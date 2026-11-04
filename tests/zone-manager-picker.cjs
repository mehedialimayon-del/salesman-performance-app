'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  const dom=new JSDOM('<!doctype html><html><head></head><body><div id="app"></div></body></html>',{url:'https://fieldforce.test/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,q=s=>w.document.querySelector(s);
  const uri='https://cdn.example.test/photos/manager.jpg';
  const records=[
    {zone_id:'PRIMARY',zone_name:'KL',staff_id:'M21954',login_id:'M21954',manager_name:'MEHEDI ALIM AYON',designation:'MANAGER',photo_url:uri},
    {zone_id:'CHERAS',zone_name:'Cheras',staff_id:'M22075',login_id:'M22075',manager_name:'MOHAMMAD BODRUDDAZA EMON',designation:'MANAGER',photo_url:uri},
    {zone_id:'KAJANG',zone_name:'Kajang',staff_id:'MG_KAJANG',login_id:'MG_KAJANG',manager_name:'Nahid',designation:'MANAGER',photo_url:null},
  ];
  let rpcCalls=0;
  w.FFH_SUPABASE={rpc:async name=>{rpcCalls++;assert.equal(name,'ffh_zone_manager_directory');return{data:records,error:null}}};
  w.eval(fs.readFileSync('photo-viewer.js','utf8'));
  w.eval(fs.readFileSync('searchable-picker.js','utf8'));
  let selected='';
  w.FFH_PICK_ITEM({title:'Zone',items:[
    {value:'ALL',label:'ALL PERMITTED ZONES'},
    {value:'PRIMARY',label:'PRIMARY'},
    {value:'CHERAS',label:'CHERAS'},
    {value:'KAJANG',label:'KAJANG'}
  ],onSelect:v=>{selected=v;}});
  await pause(65);
  assert.equal(rpcCalls,1);
  assert.equal(q('.ffZoneManagerPicker .ffZoneManagerRow [class=ffPickerText] strong').textContent,'PRIMARY');
  const rows=[...w.document.querySelectorAll('.ffZoneManagerRow')];
  const cheras=rows.find(x=>x.dataset.staffId==='CHERAS');
  assert.ok(cheras);
  assert.match(cheras.textContent,/M22075.*MANAGER/);
  assert.equal(cheras.querySelector('.ffZoneManagerAvatar img').src,uri);
  const kajang=rows.find(x=>x.dataset.staffId==='KAJANG');
  assert.match(kajang.textContent,/Nahid.*MG_KAJANG/);
  assert.ok(!kajang.querySelector('img'));
  cheras.querySelector('.ffZoneManagerAvatar').click();
  assert.ok(q('.ffPhotoViewer'),'avatar opens full photo viewer');
  assert.ok(q('.ffZoneManagerPicker'),'zone picker remains underneath image');
  q('.ffPhotoToolbar [data-action=close]').click();
  await pause(65);
  assert.ok(q('.ffZoneManagerPicker'),'closing image returns to zone selection, not home');
  const search=q('.ffZoneManagerPicker .ffPickerSearch');
  search.value='M22075';search.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.equal(w.document.querySelectorAll('.ffZoneManagerRow').length,1);
  w.document.querySelector('.ffZoneManagerRow').click();
  assert.equal(selected,'CHERAS');
  assert.equal(q('.ffZoneManagerPicker'),null);
  dom.window.close();
  console.log('PASS: zone manager names, Staff IDs, portrait, no-photo placeholder, photo back and zone selection');
})().catch(e=>{console.error(e);process.exitCode=1;});
