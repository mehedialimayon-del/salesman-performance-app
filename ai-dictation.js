(function(root){'use strict';
/* Keep familiar English app terms in Latin letters in Bangla AI speech. */
const terms=[
 ['Head of Sales','হেড\\s+অফ\\s+সেলস|head\\s+of\\s+sales'],
 ['Zero Sales','জিরো\\s*সেলস?|জিরো\\s*সেল|zero\\s+sales'],
 ['Route Plan','রুট\\s*প্ল্যান|রুট\\s*প্লান|route\\s+plan'],
 ['Offline Sync','অফলাইন\\s*সিংক|অফলাইন\\s*সিঙ্ক|offline\\s+sync'],
 ['Basil Seed','বাসিল\\s*সিড|বেসিল\\s*সিড|বাসেল\\s*সিড|basil\\s+seed'],
 ['Promotion','প্রমোশন|প্রোমোশন|প্রমোসন|প্রমোশান|promotion'],
 ['Incentive','ইন্সেন্টিভ|ইনসেন্টিভ|ইন্সেনটিভ|ইনসেনটিভ|ইন্সেন্টিব|ইনসেন্টিব|ইনসেনটিব|incentive'],
 ['Shortfall','শর্টফল|শর্টফোল|শর্ট\\s*ফল|shortfall'],
 ['Dashboard','ড্যাশবোর্ড|ড্যাশ\\s*বোর্ড|dashboard'],
 ['Catalogue','ক্যাটালগ|ক্যাটালগ্|ক্যাটালগু|ক্যাটালগো|catalogue|catalog'],
 ['Notification','নোটিফিকেশন|নটিফিকেশন|notification'],
 ['Attendance','অ্যাটেনডেন্স|অ্যাটেন্ডেন্স|এটেনডেন্স|অ্যাটেনডেন্স|attendance'],
 ['Commission','কমিশন|কমিসন|commission'],
 ['Delivery','ডেলিভারি|ডেলিভারী|delivery'],
 ['Achievement','অ্যাচিভমেন্ট|এচিভমেন্ট|achievement'],
 ['Approval','অ্যাপ্রুভাল|এপ্রুভাল|approval'],
 ['Product','প্রোডাক্ট|প্রডাক্ট|product'],
 ['Profile','প্রোফাইল|profile'],
 ['Settings','সেটিংস|সেটিং|settings'],
 ['Manager','ম্যানেজার|মেনেজার|manager'],
 ['Target','টার্গেট|টাগেট|target'],
 ['Outlet','আউটলেট|আউটলেট্|outlet'],
 ['Report','রিপোর্ট|রিপোর্ট|report'],
 ['Meeting','মিটিং|মীটিং|meeting'],
 ['Notice','নোটিশ|নোটিস|notice'],
 ['Income','ইনকাম|income'],
 ['Penalty','পেনাল্টি|পেনালটি|penalty'],
 ['Sales','সেলস|সেলস্|সেল|sales'],
 ['Price','প্রাইস|price'],
 ['Route','রুট|route'],
 ['Task','টাস্ক|task'],
 ['Order','অর্ডার|order'],
 ['Stock','স্টক|stock'],
 ['Excel','এক্সেল|একসেল|excel'],
 ['PDF','পিডিএফ|পি\\s*ডি\\s*এফ|pdf'],
 ['CPO','সিপিও|সি\\s*পি\\s*ও|cpo'],
 ['SKU','এসকেইউ|এসকিউ|এস\\s*কে\\s*ইউ|sku'],
 ['SR','এসআর|এস\\s*আর|sr'],
 ['Zone','জোন|zone'],
 ['Boss','বস|boss'],
 ['PRAN','প্রাণ|প্রান|pran'],
 ['Mango','ম্যাঙ্গো|ম্যাংগো|mango'],
 ['Juice','জুস|জ্যুস|juice'],
 ['Lollipop','ললিপপ|lollipop']
];
const suffix='গুলোর|গুলির|গুলো|গুলা|টির|টার|টা|টি|দের|য়ের|য়ের|এর|ের|তে|কে|ে|র';
const rules=terms.map(([english,pattern])=>[english,new RegExp('(^|[^\\p{L}\\p{M}\\p{N}])(?:'+pattern+')('+(english==='Boss'?suffix.split('|').filter(x=>x!=='ে'&&x!=='তে').join('|'):suffix)+')?(?=$|[^\\p{L}\\p{M}\\p{N}])','giu')]);
root.FFH_NORMALIZE_AI_TERMS=text=>{let out=String(text??'').normalize('NFC');for(const [english,pattern] of rules)out=out.replace(pattern,(_,before,ending)=>before+english+(ending?'-'+(/^(?:এর|ের|র|য়ের|য়ের)$/.test(ending)?'এর':ending==='ে'?'এ':ending):''));return out;};
const normaliseInput=target=>{if(!target?.matches?.('#aiPopupAsk,#ask'))return;const value=target.value,converted=root.FFH_NORMALIZE_AI_TERMS(value);if(value===converted)return;const start=target.selectionStart,end=target.selectionEnd;target.value=converted;if(start!==null&&end!==null)target.setSelectionRange(Math.min(converted.length,root.FFH_NORMALIZE_AI_TERMS(value.slice(0,start)).length),Math.min(converted.length,root.FFH_NORMALIZE_AI_TERMS(value.slice(0,end)).length));};
if(typeof document!=='undefined'){
 document.addEventListener('input',e=>{if(!e.isComposing)normaliseInput(e.target);});
 document.addEventListener('compositionend',e=>normaliseInput(e.target));
 document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing)normaliseInput(e.target);},true);
 document.addEventListener('click',e=>{if(e.target.closest?.('#aiPopupSend'))normaliseInput(document.getElementById('aiPopupAsk'));},true);
}
root.FFH_BIND_AI_MIC=function({button,input,submit,note,stopSpeech,language}){
 let busy=false,recognizer,disposed=false;
 const reset=()=>{busy=false;button.textContent='🎙';button.classList.remove('listening');};
 const display=text=>{const target=input();if(!target||!button.isConnected)return false;target.value=root.FFH_NORMALIZE_AI_TERMS(text);target.dispatchEvent(new Event('input',{bubbles:true}));return true;};
 button.onclick=async()=>{if(busy){if(root.FieldForceNative?.stopVoice)await root.FieldForceNative.stopVoice();else recognizer?.stop();return;}
 stopSpeech?.();busy=true;button.textContent='■';button.classList.add('listening');
 try{if(root.FieldForceNative?.voice){const result=await root.FieldForceNative.voice({language:language(),continuous:false});if(disposed)return;if(result.text&&display(result.text))await submit();else note('কথা শনাক্ত হয়নি। আবার mic চাপুন।');reset();return;}
 const SR=root.SpeechRecognition||root.webkitSpeechRecognition;if(!SR)throw Error('Microphone speech service unavailable');
 recognizer=new SR();recognizer.lang=language();recognizer.continuous=false;recognizer.interimResults=true;
 recognizer.onresult=e=>{let final='',partial='';for(let i=0;i<e.results.length;i++){const text=e.results[i][0].transcript;if(e.results[i].isFinal)final+=text+' ';else partial+=text+' ';}if(!disposed)display((final+partial).trim());if(final.trim()&&!disposed){recognizer.onresult=null;submit();}};
 recognizer.onerror=e=>{if(!disposed)note('Voice input: '+e.error);reset();};recognizer.onend=reset;recognizer.start();
 }catch(e){if(!disposed)note(e.message);reset();}
 };
 const observer=new MutationObserver(()=>{if(button.isConnected)return;disposed=true;if(busy){root.FieldForceNative?.stopVoice?.().catch(()=>{});recognizer?.abort();}observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});
};
})(window);
