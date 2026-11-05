'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
(async()=>{
 const html='<!doctype html><html><head></head><body><div id="app">'+
 '<nav class="bottomSeven"></nav><main class="wrap">'+
 '<article class="ffContactCard"><div class="ffContactIdentity">'+
 '<button class="ffContactPhotoButton"><img class="ffContactPhoto" src="https://example.test/photo.png"></button>'+
 '<div class="ffContactNamePanel"><h3>Manager</h3><div class="ffContactDepartment">Modern Trade</div></div>'+
 '<div class="ffContactTags"><span><small>Zone</small><b>KUALA LUMPUR</b></span>'+
 '<span><small>Salesmen</small><b>5</b></span><span><small>Routes</small><b>5</b></span>'+
 '<span><small>Sales team</small><b>Team</b></span></div></div>'+
 '<div class="ffContactLinks"><a class="ffContactWA">WhatsApp</a><a class="ffContactMail">Email</a></div></article>'+
 '<form id="ffAccountForm"><select name="designation"><option value="SR">SR</option></select>'+
 '<input name="can_sell" type="checkbox" checked><div class="ffPermissionTable">'+
 '<div class="ffPermissionRow" data-module="sales"><span>Sales</span><input data-verb="edit" type="checkbox"></div>'+
 '</div></form><section class="ffZeroBoard"><div class="ffOutletList"><div class="ffOutletRows"></div></div></section>'+
 '</main><button id="orb"></button></div></body></html>';
 const dom=new JSDOM(html,{url:'https://fieldforce.test/',pretendToBeVisual:true,runScripts:'outside-only'});
 const w=dom.window,warnings=[];w.alert=x=>warnings.push(x);
 w.eval(fs.readFileSync('november-mobile-fixes.js','utf8'));
 await new Promise(ok=>setTimeout(ok,70));
 const one=s=>w.document.querySelector(s);
 const card=one('.ffContactCard');
 assert.ok(card.classList.contains('ffCompactContactCard'),'contact card compacted');
 assert.equal(card.querySelector('.ffContactZoneFull b').textContent,'KUALA LUMPUR');
 assert.equal(card.querySelectorAll('.ffContactMiniStats>span').length,2,'salesmen/routes side by side');
 assert.equal(card.querySelectorAll('.ffContactLinks a').length,2,'WhatsApp and email retained');
 assert.ok(card.querySelector('.ffContactExtraDetails summary'),'extra data remains accessible');
 assert.equal(card.querySelector('.ffContactPhoto').getAttribute('src'),'https://example.test/photo.png','original photo kept');
 assert.equal(one('.ffSrRoleGrid').querySelectorAll('input:checked:disabled').length,4,'role-included rights indicated');
 assert.equal(one('.ffPermissionRow[data-module="sales"] input').checked,false,'extra grants remain unmodified');
 assert.ok(one('main.wrap').style.getPropertyValue('--ff-zero-main-height').endsWith('px'),'zero list height follows viewport');
 const selling=one('[name=can_sell]');
 selling.checked=false;selling.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(selling.checked,true,'cannot silently switch off required SR sales role');
 assert.equal(warnings.length,1,'owner sees explanation before role change');
 dom.window.close();
 console.log('PASS verified compact contact, role included vs additional grants, mandatory SR warning, Zero Sales height');
})().catch(err=>{console.error(err);process.exitCode=1;});
