(function(root){'use strict';
const fields=[
 ['cartonPrice','কার্টন দাম',['কার্টন দাম','কার্টন প্রাইস','carton price']],
 ['piecePrice','পিস দাম',['পিস দাম','ইউনিট দাম','পিস প্রাইস','unit price','piece price']],
 ['ctnFactors','কার্টন ফ্যাক্টর',['কার্টন ফ্যাক্টর','ctn factor','carton factor']],
 ['pack','প্যাক',['প্যাক','pack']],['name','নাম',['পণ্যের নাম','প্রোডাক্ট নাম','product name']],
 ['descriptionBn','বিবরণ',['বিবরণ','description']],['originBn','উৎপত্তি',['উৎপত্তি','origin']],
 ['processBn','উৎপাদন প্রক্রিয়া',['উৎপাদন প্রক্রিয়া','production process']],
 ['talkingPointsBn','বায়ার পয়েন্ট',['বায়ার পয়েন্ট','buyer points']],['pitchBn','পিচ',['পিচ','pitch']]
 ];
const numbers={'শূন্য':0,'এক':1,'দুই':2,'তিন':3,'চার':4,'পাঁচ':5,'ছয়':6,'ছয়':6,'সাত':7,'আট':8,'নয়':9,'নয়':9,'দশ':10,'এগারো':11,'বারো':12,'তেরো':13,'চৌদ্দ':14,'পনেরো':15,'ষোলো':16,'সতেরো':17,'আঠারো':18,'উনিশ':19,'বিশ':20,'চব্বিশ':24,'পঁচিশ':25,'ত্রিশ':30,'চল্লিশ':40,'পঞ্চাশ':50,'ষাট':60,'সত্তর':70,'আশি':80,'নব্বই':90,'একশ':100,'একশো':100,'দুইশ':200,'দুইশো':200};
function normalize(s){return String(s||'').replace(/[০-৯]/g,d=>'০১২৩৪৫৬৭৮৯'.indexOf(d));}
function number(s){s=normalize(s).toLowerCase().replace(/(?:রিংগিট|রিঙ্গিত|রিংগিত|টাকা|rm|ringgit)/g,'').trim();
 if(/^\d+(?:\.\d{1,2})?$/.test(s))return +s;
 const parts=s.split(/\s*(?:দশমিক|পয়েন্ট|পয়েন্ট|point)\s*/),whole=parts[0].trim();let n;
 if(/^\d+$/.test(whole))n=+whole;else if(Object.hasOwn(numbers,whole))n=numbers[whole];else return null;
 if(parts.length>2)return null;
 if(parts.length===2){let tail=parts[1].trim();if(!/^\d{1,2}$/.test(tail)){const words=tail.split(/\s+/);if(words.every(w=>Object.hasOwn(numbers,w)&&numbers[w]<10))tail=words.map(w=>numbers[w]).join('');else if(Object.hasOwn(numbers,tail)&&numbers[tail]<100)tail=String(numbers[tail]);else return null;}if(!/^\d{1,2}$/.test(tail))return null;n+=+tail/(10**tail.length);}
 return Math.round(n*100)/100;
}
function parse(text){const changes={},errors=[];const aliases=fields.flatMap(([key,label,names])=>names.map(alias=>({key,label,alias}))).sort((a,b)=>b.alias.length-a.alias.length);const escaped=aliases.map(a=>a.alias.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');const re=new RegExp('('+escaped+')\\s*(?:[:：=]|হবে)?\\s*','gi');const matches=[...String(text||'').matchAll(re)];
 for(let i=0;i<matches.length;i++){const hit=matches[i],f=aliases.find(a=>a.alias.toLowerCase()===hit[1].toLowerCase());let value=String(text).slice(hit.index+hit[0].length,matches[i+1]?.index).replace(/^[\s,;।]+|[\s,;।]+$/g,'').trim();if(!value){errors.push(f.label+': তথ্য পাওয়া যায়নি');continue;}
 if(['cartonPrice','piecePrice','ctnFactors'].includes(f.key)){value=number(value);if(value===null||!Number.isFinite(value)||(f.key==='ctnFactors'&&(value<=0||!Number.isInteger(value)))){errors.push(f.label+': সংখ্যাটি পরিষ্কার নয়, যেমন 60.50 লিখুন');continue;}}
 changes[f.key]=String(value);}
 if(!matches.length)errors.push('ঘরের নাম বলুন: কার্টন দাম 60, পিস দাম 2.50, বিবরণ …');return {changes,errors};
}
function mount(form){if(form.dataset.voiceReady)return;form.dataset.voiceReady='1';const doc=form.ownerDocument,panel=doc.createElement('details');panel.className='card';panel.innerHTML='<summary class="cardTitle">🎙 বাংলায় ক্যাটালগ পূরণ</summary><p class="miniStat">বলুন: কার্টন দাম ৬০, পিস দাম ২.৫০, কার্টন ফ্যাক্টর ২৪, বিবরণ …। অথবা ঘর বেছে শুধু তথ্যটি বলুন। আগে দেখে নিন, তারপর SAVE PRODUCT চাপুন।</p><label>ঘর<select data-voice-field><option value="">একসাথে কয়েকটি ঘর</option></select></label><textarea data-voice-text rows="3" placeholder="বাংলায় বলুন বা কিবোর্ডের মাইক্রোফোন ব্যবহার করুন"></textarea><button type="button" class="secondary" data-voice-mic>🎙 কথা বলুন</button><button type="button" class="secondary" data-voice-preview>প্রিভিউ দেখুন</button><div data-voice-status role="status" class="miniStat"></div><div data-voice-list></div><button type="button" class="primary" data-voice-apply hidden>ঘরে বসান</button>';form.prepend(panel);
 const q=s=>panel.querySelector(s),select=q('[data-voice-field]'),status=q('[data-voice-status]'),input=q('[data-voice-text]'),apply=q('[data-voice-apply]');for(const [key,label] of fields){const opt=doc.createElement('option');opt.value=key;opt.textContent=label;select.append(opt);}let pending={},recognition,busy=false,disposed=false;
 const reset=()=>{pending={};apply.hidden=true;q('[data-voice-list]').replaceChildren();};input.oninput=reset;select.onchange=reset;
 q('[data-voice-preview]').onclick=()=>{reset();const field=fields.find(f=>f[0]===select.value);const result=parse(field?field[2][0]+': '+input.value:input.value);pending=result.changes;status.textContent=result.errors.join(' · ');for(const [key,value]of Object.entries(pending)){const row=doc.createElement('p');const target=form.elements.namedItem(key);row.textContent=fields.find(f=>f[0]===key)[1]+': '+(target?.value||'—')+' → '+value;q('[data-voice-list]').append(row);}apply.hidden=!Object.keys(pending).length;};
 apply.onclick=()=>{for(const [key,value]of Object.entries(pending)){const target=form.elements.namedItem(key);if(target){target.value=value;target.dispatchEvent(new Event('input',{bubbles:true}));}}reset();status.textContent='ঘরে বসানো হয়েছে। তথ্য দেখে SAVE PRODUCT চাপুন।';};
 q('[data-voice-mic]').onclick=async()=>{if(root.FieldForceNative?.voice){reset();try{const result=await root.FieldForceNative.voice({language:'bn-BD'});if(disposed)return;input.value=result.text;q('[data-voice-preview]').click();}catch(e){if(!disposed)status.textContent=e.message;}return;}const SR=root.SpeechRecognition||root.webkitSpeechRecognition;if(!SR){input.focus();status.textContent='এই অ্যাপে সরাসরি মাইক নেই। ফোনের কিবোর্ডের মাইক দিয়ে বাংলায় বলে প্রিভিউ দেখুন।';return;}if(busy){recognition.stop();return;}reset();recognition=new SR();recognition.lang='bn-BD';recognition.interimResults=false;recognition.continuous=false;recognition.onstart=()=>{busy=true;q('[data-voice-mic]').textContent='■ থামান';status.textContent='শুনছি…';};recognition.onresult=e=>{if(disposed)return;input.value=[...e.results].filter(r=>r.isFinal).map(r=>r[0].transcript).join(' ');q('[data-voice-preview]').click();};recognition.onerror=e=>{if(!disposed)status.textContent='কথা নেওয়া যায়নি ('+e.error+')। কিবোর্ডের মাইক বা লেখা ব্যবহার করুন।';};recognition.onend=()=>{busy=false;if(!disposed)q('[data-voice-mic]').textContent='🎙 কথা বলুন';};try{recognition.start();}catch(e){status.textContent=e.message;}};
 const cleanup=new MutationObserver(()=>{if(!form.isConnected){disposed=true;recognition?.abort();cleanup.disconnect();}});cleanup.observe(doc.body,{childList:true,subtree:true});
}
const api={parse,number,mount};if(typeof module==='object')module.exports=api;else{root.FFH_CATALOGUE_VOICE=api;const doc=root.document;new MutationObserver(()=>{const form=doc.querySelector('#ffProductEditForm');if(form)mount(form);}).observe(doc.body,{childList:true,subtree:true});}
})(typeof window==='undefined'?globalThis:window);
