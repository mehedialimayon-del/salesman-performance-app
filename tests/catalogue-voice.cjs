const assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../catalogue-voice.js');
assert.deepEqual(C.parse('কার্টন দাম ৬০, পিস দাম ২.৫০, কার্টন ফ্যাক্টর ২৪, বিবরণ ফলের পানীয়').changes,{cartonPrice:'60',piecePrice:'2.5',ctnFactors:'24',descriptionBn:'ফলের পানীয়'});
assert.equal(C.number('দুই দশমিক পাঁচ শূন্য'),2.5);
assert.equal(C.number('নব্বই রিঙ্গিত'),90);
for(const text of ['কার্টন দাম -২০','পিস দাম অনেক','কার্টন ফ্যাক্টর 2.5','কার্টন দাম 20 30']){const r=C.parse(text);assert.equal(Object.keys(r.changes).length,0);assert.ok(r.errors.length);}
const {JSDOM}=require('/tmp/ffh-qa/node_modules/jsdom');
const dom=new JSDOM('<form id="ffProductEditForm"><input name="cartonPrice" value="10"><input name="piecePrice" value="1"><textarea name="descriptionBn"></textarea><button type="submit">SAVE PRODUCT</button></form>',{url:'https://example.com',runScripts:'outside-only'}),w=dom.window;
w.eval(fs.readFileSync('catalogue-voice.js','utf8'));const form=w.document.querySelector('form');w.FFH_CATALOGUE_VOICE.mount(form);let submitted=0;form.onsubmit=e=>{e.preventDefault();submitted++;};
const q=s=>form.querySelector(s);q('[data-voice-text]').value='কার্টন দাম 60, পিস দাম 2.50';q('[data-voice-preview]').click();assert.equal(form.elements.cartonPrice.value,'10','preview must not overwrite');q('[data-voice-apply]').click();assert.equal(form.elements.cartonPrice.value,'60');assert.equal(form.elements.piecePrice.value,'2.5');assert.equal(submitted,0,'voice must not silently publish');
q('[data-voice-field]').value='descriptionBn';q('[data-voice-text]').value='<script>bad()</script>';q('[data-voice-preview]').click();assert.equal(form.querySelector('script'),null,'preview uses text');q('[data-voice-apply]').click();assert.equal(form.elements.descriptionBn.value,'<script>bad()</script>');
q('[data-voice-preview]').click();q('[data-voice-text]').dispatchEvent(new w.Event('input'));assert.equal(q('[data-voice-apply]').hidden,true,'editing invalidates stale preview');q('[data-voice-mic]').click();assert.ok(q('[data-voice-status]').textContent.includes('কিবোর্ড'));dom.window.close();console.log('PASS Bengali prices, unclear-number rejection, safe preview, explicit apply, no automatic save, keyboard microphone fallback');
