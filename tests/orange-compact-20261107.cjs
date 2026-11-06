'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><html><body><div id="app"><main class="wrap ffDashboardFrame"><section class="ffScopeFilter"><select id="ffDashboardZone"><option value="ALL">ALL</option><option value="SUNGai_BULOH">Sungai Buloh</option></select><select id="ffScopeStaff"><option value="ALL">COMBINED</option><option value="S1">Manna Fuli</option></select></section><div class="dashHero"><div><b>Performance Command Center</b></div><div class="dashAch">0%</div></div></main></div></body></html>',{url:'https://fieldforce.test/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,query=q=>w.document.querySelector(q),pause=()=>new Promise(resolve=>setTimeout(resolve,45));
w.localStorage.setItem('ffh_session',JSON.stringify({id:'M21954'}));
const profiles={
 M21954:{id:'M21954',name:'MEHEDI ALIM AYON',zone:'PRIMARY',photo_url:'https://example.test/kl.jpg'},
 MG_SUNGAI_BULOH:{id:'MG_SUNGAI_BULOH',name:'Jamil',zone:'SUNGai_BULOH',photo_url:'https://example.test/jamil.jpg'},
 S1:{id:'S1',name:'Manna Fuli',manager_id:'MG_SUNGAI_BULOH',photo_url:'https://example.test/s1.jpg'}
};
w.FFH_STAFF_PROFILE=id=>profiles[id];
w.FFH_STAFF_PHOTOS={find:id=>profiles[id]?{photo_url:profiles[id].photo_url}:null};
w.ffhZoneManagers=async()=>[{zone_id:'SUNGai_BULOH',staff_id:'MG_SUNGAI_BULOH',manager_name:'Jamil',photo_url:'https://example.test/jamil.jpg'}];
w.eval(fs.readFileSync('ffh-selected-identity-20261107.js','utf8'));
(async()=>{
 await pause();
 let card=()=>query('.ffDashSelectedIdentity');
 assert.equal(card().querySelector('.ffDashSelectedName').textContent,'MEHEDI ALIM AYON','combined all zones uses overall KL owner');
 w.localStorage.setItem('ffh_session',JSON.stringify({id:'MG_SUNGAI_BULOH'}));query('.dashHero').append(w.document.createElement('span'));await pause();assert.equal(card().querySelector('.ffDashSelectedName').textContent,'MEHEDI ALIM AYON','authorized non-owner All Zones view still shows overall KL owner');
 query('#ffDashboardZone').value='SUNGai_BULOH';query('#ffDashboardZone').dispatchEvent(new w.Event('change',{bubbles:true}));
 await pause();assert.equal(card().querySelector('.ffDashSelectedName').textContent,'JAMIL','individual zone uses assigned manager, never HoS');
 assert.match(card().querySelector('img').src,/jamil.jpg/);
 query('#ffScopeStaff').value='S1';query('#ffScopeStaff').dispatchEvent(new w.Event('change',{bubbles:true}));
 await pause();assert.equal(card().querySelector('.ffDashSelectedName').textContent,'MANNA FULI','chosen SR uses SR image/name');
 assert.match(card().querySelector('img').src,/s1.jpg/);
 assert.equal(query('.dashHero .dashAch').textContent,'0%','percentage preserved');
 assert.equal(w.document.querySelectorAll('.ffDashSelectedIdentity').length,1,'no duplicate identity');
 assert.equal(query('#ffScopeStaff').value,'S1','scope is not mutated');
 w.document.querySelector('.dashHero').append(w.document.createElement('span'));
 await pause();assert.equal(w.document.querySelectorAll('.ffDashSelectedIdentity').length,1,'mutation observer idempotent');
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/ffh-orange-compact-20261107.css/);
 assert.match(html,/ffh-selected-identity-20261107.js/);
 const css=fs.readFileSync('ffh-orange-compact-20261107.css','utf8');
 assert.match(css,/ffDashboardTabs button:nth-child\(3\)/);
 assert.match(css,/ffTaskPage>\.ffTaskList/);
 assert.match(css,/ffContactIdentityCompact/);
 dom.window.close();console.log('PASS orange theme, compact layouts, All Zones / Zone Manager / SR identity, photo and percentage preserved');
})().catch(e=>{console.error(e);process.exitCode=1});