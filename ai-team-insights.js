(function(root){
'use strict';
const original=root.FFH_CREATE_APP_ANSWERS;
if(typeof original!=='function')return;
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/[^\p{L}\p{M}\p{N}]+/gu,' ').trim();
const words=s=>norm(s).split(' ').filter(Boolean);
const shortNames=new Set(['md','mohammad','mohammed','muhammad','bin','hossain','rahman','chowdhury','majumder','মো','হোসেন','রহমান','চৌধুরী','স্যার']);
const bangla=[[/লিমন|লেমন/gu,'limon'],[/রাসেল|রসেল/gu,'russell'],[/লিহান|লেহান/gu,'lehan'],[/মান্নাফ|মুন্নাফ|মন্নাফ/gu,'munnaf'],[/মান্না|মন্না/gu,'manna'],[/ইমন/gu,'emon'],[/মাইনুল|নাইমুল|নাঈমুল/gu,'naimul'],[/আয়ন|অয়ন|আয়ন/gu,'ayon'],[/পারভেজ/gu,'parvez'],[/সায়েম|সায়েম/gu,'sayem']];
function transliterate(s){let z=' '+norm(s)+' ';for(const [re,value] of bangla)z=z.replace(re,' '+value+' ');return norm(z);}
const number=x=>Number(x)||0;
const money=x=>'RM '+number(x).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2});
const TEAM=/(ranking|rank|leaderboard|compare|comparison|which.*(?:sr|staff)|best.*(?:sr|staff)|worst.*(?:sr|staff)|team.*performance|সবার|সবাই|সকল|তুলনা|র‍্যাঙ্ক|র্যাঙ্ক|পিছিয়ে|পিছিয়ে|পেছনে|পিছনে|পিছে|পিসি|সেরা|আগে|সবচেয়ে|সবচেয়ে|কোন.*(?:এসআর|স্যার|sr)|কে.*(?:কম|বেশি|ভালো|আগে|পিছ))/iu;
const FULL=/(full.*(?:data|detail|report)|complete.*(?:data|detail)|all.*details|ফুল.*(?:ডাটা|ডেটা|তথ্য|রিপোর্ট)|পুরো.*(?:ডাটা|ডেটা|তথ্য)|সম্পূর্ণ.*(?:তথ্য|বিস্তারিত)|সব.*তথ্য|বিস্তারিত|ডিটেইল)/iu;
const INCOME=/(income|salary|commission|earning|ইনকাম|বেতন|কমিশন|আয়|আয়)/iu;
const DATA=/(sales?|target|achievement|performance|income|salary|commission|orders?|outlet|zero|shortfall|ranking|rank|সেল|বিক্রি|টার্গেট|অর্জন|পারফরম্যান্স|পারফরমেন্স|ইনকাম|আয়|আয়|বেতন|কমিশন|অর্ডার|আউটলেট|জিরো|শর্টফল|পিছ|পেছ|পিসি|হিসাব|ডাটা|তথ্য|রিপোর্ট)/iu;
const OWN=/^(আমার|আমাকে|আমি|my|mine|নিজের)(\s|$)/iu;
function matchedPeople(q,people){
 const phrase=transliterate(q),tokens=new Set(words(phrase)),list=[];
 for(const p of people){
  const id=norm(p.id),name=transliterate(p.name);
  const important=words(name).filter(x=>x.length>=4&&!shortNames.has(x));
  if((id&&tokens.has(id))||(name&&phrase.includes(name))||important.some(x=>tokens.has(x)||tokens.has(x+'র')||tokens.has(x+'এর')||tokens.has(x+'কে')||tokens.has(x+'er')))list.push(p);
 }
 return list;
}
function inputFound(c,id,from,to){
 const inRange=d=>typeof d==='string'&&d.slice(0,10)>=from&&d.slice(0,10)<=to;
 return (c.db?.sales||[]).some(x=>x.sr===id&&(inRange(x.date)||inRange(x.deliveredAt))) ||
 (c.daily?.updates||[]).some(x=>x.staff_id===id&&(!x.entry_scope||x.entry_scope==='staff')&&inRange(x.sale_date));
}
function wrap(ctx,text,buttons=[]){
 const result={text,html:''};
 if(buttons.length){
  result.html='<div class="ffAiLiveActions">'+buttons.map((b,i)=>'<button type="button" class="aiPdfDownload" data-ai-team-index="'+i+'">'+ctx.esc(b[1])+'</button>').join('')+'</div>';
  result.bind=node=>node.querySelectorAll('[data-ai-team-index]').forEach(b=>b.onclick=()=>ctx.open(buttons[Number(b.dataset.aiTeamIndex)][0]));
 }
 return result;
}
root.FFH_CREATE_APP_ANSWERS=ctx=>{
 const base=original(ctx);
 async function teamAnswer(question){
  const viewer=ctx.user?.()?.id,team=TEAM.test(question),full=FULL.test(question),incomeRequested=INCOME.test(question);
  const bridge=root.FFH_REPORT_ASSISTANT,core=root.FFH_REPORTS_CORE;
  if(!viewer)throw Error('Login required');
  if(!bridge||!core)throw Error('Reports connection unavailable. Refresh the app.');
  const allowed=[...new Set(ctx.ids())];
  if(!allowed.length)return wrap(ctx,'এই লগইনের অনুমোদিত SR তালিকা পাওয়া যায়নি।');
  const dates=root.FFH_AI_LIVE_UTILS?.period?.(question,ctx.today())||{from:ctx.today().slice(0,7)+'-01',to:ctx.today()};
  const {from,to}=dates;
  const snap=await bridge.snapshot({from,to,allowedIds:allowed,incomeStaff:viewer});
  if(snap.viewerId!==viewer||ctx.user?.()?.id!==viewer)throw Error('Session changed');
  const c=snap.context,people=c.people||[],permitted=new Set(snap.model.ids);
  const found=matchedPeople(question,people),denied=found.filter(p=>!permitted.has(p.id)),named=found.filter(p=>permitted.has(p.id));
  if(denied.length)return wrap(ctx,'এই স্টাফের ডাটা দেখার অনুমতি নেই, অথবা বর্তমান SR/Zone scope-এ নেই।');
  if(named.length>1)return wrap(ctx,'একাধিক নাম মিলে গেছে। পুরো নাম বা Staff ID দিন: '+named.map(p=>p.name+' ('+p.id+')').join(', '));
  if(!named.length&&!team&&!full)return null;
  if(!named.length&&!team)return wrap(ctx,'কোন SR-এর পূর্ণ ডাটা চান? তাঁর নাম বা Staff ID বলুন।');
  const ids=named.length?[named[0].id]:snap.model.ids;
  const model=named.length?core.build({...c,allowedIds:ids},{...snap.filters,sr:ids[0],incomeStaff:viewer}):snap.model;
  const performance=model.rows('SR Performance').slice(1);
  const rows=ids.map((id,i)=>{
   const r=performance[i]||[],p=people.find(x=>x.id===id)||{id,name:id};
   return {id,name:p.name,person:p,zone:p.zone,target:number(r[1]),delivered:number(r[2]),achievement:number(r[3]),shortfall:number(r[4]),qty:number(r[5]),zero:number(r[6]),assigned:model.assigned.filter(x=>x.sr===id).length,entered:inputFound(c,id,from,to)};
  });
  const range=from+' → '+to;
  if(named.length){
   const r=rows[0],s=model.summary,zeros=model.rows('Zero Sales').slice(1).map(x=>x[2]).filter(Boolean);
   let text=r.name+' · '+r.id+(r.zone?' · '+r.zone:'')+'\n'+range+'\n';
   if(!r.entered)text+='এই সময়ের Sales input পাওয়া যায়নি। তাই নিশ্চিত 0 sales ধরে নিচ্ছি না।\n';
   text+='Confirmed delivered: '+money(r.delivered)+'\nTarget: '+money(r.target);
   text+=r.target>0?'\nAchievement: '+r.achievement.toFixed(2)+'%':'\nAchievement: Target সেট করা হয়নি';
   text+='\nShortfall: '+money(r.shortfall)+'\nOrder records: '+s.orders+'\nRecorded order value: '+money(s.orderAmount)+'\nPending: '+money(s.pendingAmount)+'\nZero-delivery outlets: '+r.zero+'/'+r.assigned+'\nDelivered quantity: '+r.qty;
   if(full&&zeros.length)text+='\nZero-delivery outlet list: '+zeros.slice(0,20).join(', ')+(zeros.length>20?' (বাকি তালিকা রিপোর্টে)':'');
   if(full||incomeRequested){
    const me=people.find(p=>p.id===viewer);
    if(!root.FFH_HOME_CORE?.visibleIncome(me,r.person))text+='\nIncome: এই স্টাফের ব্যক্তিগত আয়ের তথ্য দেখার অনুমতি নেই।';
    else{
     const m=to.slice(0,7),start=from>m+'-01'?from:m+'-01';
     try{
      const pay=root.FFH_PERSONAL_INCOME.build(c,r.id,m,start,to);
      if(pay.setupMissing)text+='\nIncome: মাসিক setup পাওয়া যায়নি। অঙ্ক অনুমান করা হয়নি।';
      else text+='\nIncome ('+m+'): Basic '+money(pay.basic)+'; Commission '+money(pay.comm)+'; Incentives/adjustments '+money(pay.bonus+pay.pos)+'; Penalty '+money(pay.pen)+'\n'+(pay.growthPending?'Estimated (growth history pending)':'Estimated net')+': '+money(pay.total);
     }catch(_){text+='\nIncome: যাচাই করা যায়নি; অনুমতি বা setup পরীক্ষা করুন।';}
    }
   }
   if(!r.entered)text+='\nআজ থেকেই সেলস ইনপুট শুরু করুন 😄। মাস শেষে পিছিয়ে না পড়তে প্রতিদিন আপডেট রাখুন।';
   return wrap(ctx,text,[['reports','FULL REPORT খুলুন'],['zero','ZERO SALES খুলুন']]);
  }
  if(!rows.length)return wrap(ctx,'আপনার অনুমোদিত scope-এ SR নেই।');
  const entered=rows.filter(x=>x.entered),missing=rows.filter(x=>!x.entered);
  if(!entered.length)return wrap(ctx,'অনুমোদিত '+rows.length+' জন SR-এর '+range+' সময়সীমায় এখনো কোনো individual Sales input পাওয়া যায়নি।\nকে আগে বা পিছিয়ে আছেন তা নিশ্চিত বলা যাচ্ছে না—সবাই আপাতত একই অবস্থানে 😄।\nআজ থেকেই Daily Sales ইনপুট শুরু করুন, না হলে মাস শেষে পিছিয়ে পড়ার ঝুঁকি আছে।',[['sales','DAILY SALES খুলুন']]);
  const comparable=entered.every(x=>x.target>0),sorted=[...entered].sort((a,b)=>comparable?b.achievement-a.achievement||b.delivered-a.delivered:b.delivered-a.delivered);
  let text='অনুমোদিত SR Performance · '+range+'\nRanking: '+(comparable?'Target achievement %':'Confirmed delivered sales (কিছু Target সেট নেই)')+'\n';
  text+=sorted.map((r,i)=>(i+1)+'. '+r.name+' · '+money(r.delivered)+(r.target>0?' · '+r.achievement.toFixed(2)+'%':'')+' · Zero outlets '+r.zero+'/'+r.assigned).join('\n');
  if(missing.length)text+='\nInput পাওয়া যায়নি ('+missing.length+' জন): '+missing.map(x=>x.name).join(', ')+'. এদের 0 sales ধরে rank করিনি।';
  else if(sorted.length>1&&sorted[0].delivered===sorted.at(-1).delivered)text+='\nসবার confirmed sales সমান; কাউকে নিশ্চিতভাবে পিছিয়ে বলা যাচ্ছে না 😄।';
  if(sorted.length>1&&sorted[0].delivered!==sorted.at(-1).delivered)text+='\nএখন '+sorted.at(-1).name+' পিছিয়ে আছেন ('+(comparable?'achievement':'delivered amount')+' অনুযায়ী)। Pending ও missing input যাচাই করুন।';
  text+='\nসঠিক ইনপুট হলে ranking আপডেট হবে।';
  return wrap(ctx,text,[['reports','SR PERFORMANCE REPORT'],['dashboard','DASHBOARD খুলুন']]);
 }
 return {...base,answer:async question=>{
  if(!DATA.test(question))return base.answer(question);
  // Do not treat 'my Limon income' as personal income; resolve the named SR first.
  try{
   const result=await teamAnswer(question);
   return result||base.answer(question);
  }catch(e){
   return {text:'লাইভ SR তথ্য যাচাই করা যায়নি: '+e.message+'\nঅনুমান করে সংখ্যা দিচ্ছি না। সংযোগ ও অনুমতি দেখে আবার চেষ্টা করুন।',html:''};
  }
 }};
};
})(typeof window==='undefined'?globalThis:window);