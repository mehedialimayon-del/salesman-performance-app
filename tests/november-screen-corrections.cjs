'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
(async()=>{
 const dom=new JSDOM('<!doctype html><html><head></head><body><div id="app">'+
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
 '<div class="ffPermissionRow" data-module="sales"><input data-verb="edit" type="checkbox"></div>'+
 '</div></form><section class="ffZeroBoard"><div class="ffOutletList"><div class="ffOutletRows"></div></div></section>'+
 '</main><button id="orb"></button></div></body></html>',
 {url:'https://fieldforce.test/',pretendToBeVisual:true,runScripts:'outside-only'});
 const w=dom.window,warnings=[];
 w.alert=x=>warnings.push(x);
 w.eval(fs.readFileSync('november-screen-corrections.js','utf8'));
 await new Promise(ok=>setTimeout(ok,70));
 const one=s=>w.document.querySelector(s);
 const card=one('.ffContactCard');
 assert.ok(card.querySelector('.ffContactIdentity.ffCompactContact'));
 assert.equal(card.querySelectorAll('.ffContactZoneLine').length,1);
 assert.equal(card.querySelector('.ffContactZoneLine b').textContent,'KUALA LUMPUR');
 assert.equal(card.querySelectorAll('.ffContactIdentity>.ffContactLinks a').length,2,'links remain functional and inside compact grid');
 assert.equal(card.querySelector('.ffContactTags').children.length,2,'two compact count cards');
 assert.equal(card.querySelector('.ffContactTags').textContent.replace(/\s+/g,'').includes('Salesmen5'),true);
 assert.ok(card.querySelector('.ffContactExtra summary'),'long team detail remains reachable in accordion');
 assert.equal(card.querySelector('.ffContactPhoto').getAttribute('src'),'https://example.test/photo.png','original image untouched');
 assert.equal(one('.ffRoleBaseGrid').querySelectorAll('input:checked:disabled').length,4,'SR base capabilities visible separately');
 assert.equal(one('.ffPermissionRow[data-module="sales"] input').checked,false,'unchecked extra grant stays unchecked');
 assert.ok(one('main.wrap').style.getPropertyValue('--ff-zero-main-height').endsWith('px'),'zero list receives measured viewport height');
 const sell=one('[name=can_sell]');sell.checked=false;sell.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(sell.checked,true,'SR role cannot silently lose can_sell while still designated SR');
 assert.equal(warnings.length,1,'warning explains mandatory baseline access');
 w.FFH_STAFF_PHOTOS?.render?.();
 dom.window.close();
 console.log('PASS November mobile contact cards, role-vs-extra permissions, SR warning, zero full-height measurement; no data changes');
})().catch(err=>{console.error(err);process.exitCode=1;});
