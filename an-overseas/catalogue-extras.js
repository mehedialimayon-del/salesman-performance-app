/* A&N Overseas: functional multi-filter university catalogue.
   Costs are illustrative published programme examples, NOT overall university fees. */
(function(){
'use strict';
var visibleLimit=80,lastQuerySignature='',lastQueryFilterSignature='',lastRenderedSignature='',lastRenderedCount=0,loadMoreObserver=null;
var priority=['Malaysia','China','Japan','South Korea','Singapore','Thailand','United Arab Emirates','Turkey','United Kingdom','Germany','France','Italy','Ireland','Netherlands','Sweden','Finland','Austria','Belgium','Switzerland','Norway','Denmark','Spain','Portugal','Poland','Czech Republic','Hungary','Greece','Luxembourg','Canada','United States','Australia','New Zealand'];
const countryIndex=name=>{const n=priority.indexOf(name);return n<0?1000:n;};
countries.sort((a,b)=>countryIndex(a[0])-countryIndex(b[0])||a[0].localeCompare(b[0]));
var pref={kind:'All Types',level:'All Levels',subject:'All Subjects',currency:'Any currency',minFee:'',maxFee:'',order:'Country → QS ranking',requirement:''};
var levels={upm:['Bachelor','Master','PhD'],um:['Bachelor','Master','PhD'],ukm:['Bachelor','Master','PhD'],utm:['Bachelor','Master','PhD'],uum:['Bachelor','Master','PhD'],unikl:['Foundation','Diploma','Bachelor','Master','PhD'],klust:['Foundation','Diploma','Bachelor','Master','PhD'],uniten:['Foundation','Diploma','Bachelor','Master','PhD']};
var subjects=['All Subjects','Agriculture','Aquaculture','Architecture','Business','Communication','Computer Science','Economics','Education','Engineering','Finance','Health','Management','Science','Social Sciences','Technology'];
const moneyUnits=['Any currency','MYR','EUR','GBP','USD','CAD','AUD','JPY','CNY','KRW','SGD','NZD','SEK','NOK','DKK','CHF','TRY','THB','AED','PLN','CZK','HUF'];
const optionItems=(arr,value)=>arr.map(x=>'<option value="'+esc(x)+'"'+(x===value?' selected':'')+'>'+esc(x)+'</option>').join('');
const labelled=(name,field)=>'<label><span>'+name+'</span>'+field+'</label>';
const choice=(id,opts,now)=>'<select id="'+id+'">'+optionItems(opts,now)+'</select>';
universitiesPage=function(){
 const query=new URLSearchParams((location.hash.split('?')[1]||''));
 filterCountry=query.get('country')||'All Countries';
 const controls='<div class="filter-fields">'
 +labelled('COUNTRY',choice('country-filter',['All Countries',...countries.map(c=>c[0])],filterCountry))
 +labelled('PUBLIC / PRIVATE',choice('type-filter',['All Types','Public','Private'],pref.kind))
 +labelled('STUDY LEVEL',choice('level-filter',['All Levels','Foundation','Diploma','Bachelor','Master','PhD'],pref.level))
 +labelled('SUBJECT / FIELD',choice('subject-filter',subjects,pref.subject))
 +labelled('TUITION CURRENCY',choice('currency-filter',moneyUnits,pref.currency))
 +labelled('MINIMUM PUBLISHED TUITION','<input id="min-fee-filter" type="number" min="0" inputmode="decimal" placeholder="Min" value="'+esc(pref.minFee)+'">')
 +labelled('MAXIMUM PUBLISHED TUITION','<input id="max-fee-filter" type="number" min="0" inputmode="decimal" placeholder="Max" value="'+esc(pref.maxFee)+'">')
 +labelled('SORT BY',choice('order-filter',['Country → QS ranking','Global QS ranking','University A–Z','Published fee: low to high','Published fee: high to low'],pref.order))
 +labelled('ADMISSION REQUIREMENTS','<input id="requirements-filter" type="search" value="'+esc(pref.requirement)+'" placeholder="IELTS, CGPA, English">')
 +'</div><div class="filter-actions"><small>Only programme-specific fee examples with matching currency can be compared. Unquoted fees are not shown as zero.</small><button type="button" class="catalogue-clear" id="reset-university-filters">Reset filters</button></div>';
 return title('Explore Universities','Browse the full multi-country directory, compare published programme fees and save universities for later.')
 +'<div class="wrap content university-catalogue"><div class="an-university-directory-bar"><strong id="an-global-count">'+U.length.toLocaleString('en-US')+' universities in our world directory</strong><a href="#/favorites" class="an-directory-fav">♡ Saved universities <b data-favorite-count>0</b></a></div>'
 +'<div class="catalogue-tools"><label class="catalogue-search"><span>⌕</span><input id="university-search" type="search" value="'+esc(searchTerm)+'" placeholder="Search university or course" aria-label="Search universities"></label>'
 +'<details class="catalogue-filter"><summary aria-label="Filter universities" title="Filter universities">☷ <span class="filter-word">Filters</span></summary><div class="catalogue-filter-panel">'+controls+'</div></details>'
 +'<label class="an-scholarship-only"><input id="scholarship-filter" type="checkbox" '+(scholarshipOnly?'checked':'')+'> 🎓 Scholarships only</label></div>'
 +'<div id="catalogue-count" class="catalogue-count" aria-live="polite"></div><div id="results" class="grid"></div>'
 +'<p class="catalogue-footnote">Malaysia entries include institutions from the MQA register; its accreditation applies to specific programmes and may change. Institution listing does not establish eligibility for international enrolment. This directory also contains other sourced and unverified entries and is not an A&N partner list. Check the official university website, exact programme, recognition, application fee and any scholarship offer before applying. Published example fees are not comparable across different durations or currencies. QS 2027 ranks are shown only for institutions with verified ranking data; institutions without a confirmed QS rank follow ranked universities within their country.</p></div>';
};
function amountOf(u,code){
 const rows=UNIVERSITY_PROFILES[u.id]?.fees||[],matches=[];
 rows.forEach(row=>{
  if(!Array.isArray(row))return;
  const match=String(row[1]||'').match(/(RM|MYR|EUR|GBP|USD|CAD|AUD|JPY|CNY|KRW|SGD|NZD|SEK|NOK|DKK|CHF|TRY|THB|AED|PLN|CZK|HUF)\s*([\d,]+(?:\.\d+)?)/i);
  if(!match)return;
  let unit=match[1].toUpperCase();if(unit==='RM')unit='MYR';
  const val=Number(match[2].replace(/,/g,''));
  if(!Number.isFinite(val)||val<=0||code!=='Any currency'&&code!==unit)return;
  if(/initial payment|deposit|per month/i.test(String(row[0]||'')+' '+String(row[2]||'')))return;
  matches.push({value:val,currency:unit});
 });
 return matches.length?matches.sort((a,b)=>a.value-b.value)[0]:null;
}
function hasLevel(u,level){
 if(level==='All Levels')return true;
 if(levels[u.id])return levels[u.id].includes(level);
 const p=UNIVERSITY_PROFILES[u.id]||{},text=[...(u.programs||[]),...(p.programs||[]),...(p.fees||[]).map(x=>x[0])].join(' ').toLowerCase();
 const tests={Foundation:/foundation/,Diploma:/diploma/,Bachelor:/bachelor|undergraduate|bsc|bba/,Master:/master|postgraduate|msc/,PhD:/phd|doctor/};
 return tests[level].test(text);
}
const verifiedRank=u=>{
  const rank=Number(window.ANUniGuide?.getRank?.(u));
  return Number.isInteger(rank)&&rank>0?rank:null;
};
const rankingCompare=(a,b)=>{
  const aRank=verifiedRank(a),bRank=verifiedRank(b);
  if(aRank===null&&bRank!==null)return 1;
  if(bRank===null&&aRank!==null)return -1;
  return (aRank??999999)-(bRank??999999)||String(a.name).localeCompare(String(b.name),undefined,{sensitivity:'base'});
};
const serialState={size:-1,items:new Map()};
function globalSerial(){
 if(serialState.size===U.length)return serialState.items;
 const entries=U.slice().sort((a,b)=>countryIndex(a.country)-countryIndex(b.country)||rankingCompare(a,b));
 const map=new Map();
 entries.forEach((u,i)=>map.set(u.id,{number:i+1,total:entries.length}));
 serialState.items=map;serialState.size=U.length;return map;
}
function anNumberedCard(u){
 const seq=globalSerial().get(u.id)||{number:0,total:U.length},zero=n=>String(n).padStart(3,'0');
 const badge='<span class="an-catalogue-index" aria-label="Global university '+seq.number+' of '+seq.total+'">'+zero(seq.number)+' <small>/ '+zero(seq.total)+'</small></span>';
 const favorite='<button class="an-favorite-heart" data-favorite-university="'+esc(u.id)+'" type="button" aria-label="Save '+esc(u.name)+' to favorites" aria-pressed="false" title="Save university">♡</button>';
 let html=card(u);
 if(u.kind==='Public'||u.kind==='Private'){
  html=html.replace('<span class="badge">','<span class="badge an-type-'+u.kind.toLowerCase()+'">');
 }else{
  html=html.replace('<span class="badge">','<span class="badge an-type-unknown">');
  html=html.replace('University · '+esc(u.country),'Type not verified · '+esc(u.country));
 }
 html=html.replace(/<span class="an-catalogue-index"[^>]*>[\s\S]*?<\/small><\/span>/,'');
 if(u.closedDate){
   html=html.replace('<span class="badge">','<span class="badge an-type-closed">');
   html=html.replace('<div class="inside">','<div class="inside"><div class="an-closed-status">HISTORICAL RECORD · CLOSED '+esc(u.closedDate)+'</div>');
   return html.replace(/(<div class="uni-cover-wrap"[^>]*>)/,($0)=>$0+badge+favorite).replace('</article>','<p class="an-no-applications">Institution closed — applications unavailable</p></article>');
 }
 return html.replace(/(<div class="uni-cover-wrap"[^>]*>)/,($0)=>$0+badge+favorite).replace('</article>','<a class="an-catalogue-apply" href="#/apply/'+encodeURIComponent(u.id)+'" aria-label="Start an A&amp;N application for '+esc(u.name)+'">Apply through A&amp;N ↗</a></article>');
}

function filterStateSignature(){
 return [filterCountry,searchTerm.toLowerCase().trim(),String(pref.requirement||'').toLowerCase().trim(),
  pref.kind,pref.level,pref.subject,pref.currency,pref.minFee,pref.maxFee,pref.order,scholarshipOnly].join('|');
}
function snapshotState(){
 return {visibleLimit,pref:{...pref},filterCountry,searchTerm,scholarshipOnly};
}
function restoreState(){
 const saved=window.ANNavState?.get?.(location.hash||'#/home')?.catalogue;
 if(!saved||typeof saved!=='object')return false;
 const keys=Object.keys(pref);
 keys.forEach(k=>{if(Object.prototype.hasOwnProperty.call(saved.pref||{},k))pref[k]=saved.pref[k];});
 const params=new URLSearchParams(location.hash.split('?')[1]||'');
 filterCountry=params.has('country')?params.get('country'):String(saved.filterCountry||filterCountry);
 searchTerm=String(saved.searchTerm||'');scholarshipOnly=!!saved.scholarshipOnly;
 visibleLimit=Math.min(Math.max(80,U.length),Math.max(80,Number(saved.visibleLimit)||80));
 lastQueryFilterSignature=filterStateSignature();
 const controls={'type-filter':pref.kind,'level-filter':pref.level,'subject-filter':pref.subject,
  'currency-filter':pref.currency,'min-fee-filter':pref.minFee,'max-fee-filter':pref.maxFee,
  'order-filter':pref.order,'requirements-filter':pref.requirement,'country-filter':filterCountry,
  'university-search':searchTerm};
 for(const [id,value] of Object.entries(controls)){
   const el=document.getElementById(id);
   if(el)el.value=value;
 }
 const check=document.getElementById('scholarship-filter');if(check)check.checked=scholarshipOnly;
 return true;
}
function applyCountryFilters(q){
 if(!q||![...q.keys()].some(k=>k.startsWith('hero_')))return false;
 const country=q.get('hero_country')||'All Countries';
 filterCountry=country;
 searchTerm=q.get('hero_university')||'';
 scholarshipOnly=q.get('hero_scholarship')==='1';
 const level=q.get('hero_level')||'';
 pref.level=['Bachelor','Master','PhD'].includes(level)?level:'All Levels';
 pref.minFee=q.get('hero_min')||'';
 pref.maxFee=q.get('hero_max')||'';
 pref.currency=(pref.minFee!==''||pref.maxFee!=='')?(q.get('hero_currency')||'MYR'):'Any currency';
 const inputs={'university-search':searchTerm,'country-filter':filterCountry,'level-filter':pref.level,
  'currency-filter':pref.currency,'min-fee-filter':pref.minFee,'max-fee-filter':pref.maxFee};
 for(const [id,val] of Object.entries(inputs)){const el=document.getElementById(id);if(el)el.value=val;}
 const cb=document.getElementById('scholarship-filter');if(cb)cb.checked=scholarshipOnly;
 return true;
}
window.ANCatalogueState={snapshot:snapshotState,restore:restoreState,applyCountryFilters};
document.addEventListener('submit',function(event){
 if(event.target?.id!=='an-country-hero-form')return;
 event.preventDefault();
 const get=id=>document.getElementById(id)?.value.trim()||'';
 const q=new URLSearchParams();
 q.set('hero_country',get('an-country-filter-country')||'All Countries');
 if(get('an-country-university-name'))q.set('hero_university',get('an-country-university-name'));
 if(get('an-country-filter-level'))q.set('hero_level',get('an-country-filter-level'));
 if(get('an-country-fee-min'))q.set('hero_min',get('an-country-fee-min'));
 if(get('an-country-fee-max'))q.set('hero_max',get('an-country-fee-max'));
 q.set('hero_currency',get('an-country-fee-currency')||'MYR');
 if(document.getElementById('an-country-scholarship-only')?.checked)q.set('hero_scholarship','1');
 location.hash='#/universities?'+q.toString();
});

renderResults=function(){
 const el=document.getElementById('results');if(!el)return;
 const term=searchTerm.toLowerCase().trim(),req=pref.requirement.toLowerCase().trim();
 const signature=[filterCountry,term,req,pref.kind,pref.level,pref.subject,pref.currency,pref.minFee,pref.maxFee,pref.order,scholarshipOnly,U.length].join('|');
 const filterSig=filterStateSignature();
 if(filterSig!==lastQueryFilterSignature){visibleLimit=80;lastQueryFilterSignature=filterSig;}
 lastQuerySignature=signature;
 const feeFilter=pref.minFee!==''||pref.maxFee!=='',needsCurrency=(feeFilter||pref.order.startsWith('Published fee:'))&&pref.currency==='Any currency';
 let found=needsCurrency?[]:U.filter(u=>{
  const p=UNIVERSITY_PROFILES[u.id]||{},str=[u.name,u.short,u.country,u.city,...(u.programs||[]),...(p.programs||[])].join(' ').toLowerCase();
  if(!str.includes(term)||filterCountry!=='All Countries'&&filterCountry!==u.country)return false;
  if(scholarshipOnly&&!window.ANUniversityTools?.scholarship(u.id))return false;
  if(pref.kind!=='All Types'&&pref.kind!==u.kind)return false;
  if(!hasLevel(u,pref.level)||pref.subject!=='All Subjects'&&!str.includes(pref.subject.toLowerCase()))return false;
  if(req&&![p.entry,p.intake].join(' ').toLowerCase().includes(req))return false;
  if(feeFilter){
   const amount=amountOf(u,pref.currency)?.value;
   if(!Number.isFinite(amount)||pref.minFee!==''&&amount<Number(pref.minFee)||pref.maxFee!==''&&amount>Number(pref.maxFee))return false;
  }
  return true;
 });
 if(pref.order==='Country → QS ranking'||pref.order==='Country directory order')
    found.sort((a,b)=>globalSerial().get(a.id).number-globalSerial().get(b.id).number);
 else if(pref.order==='Global QS ranking'||pref.order==='QS Ranking (verified first)')
    found.sort(rankingCompare);
 else if(pref.order==='University A–Z')found.sort((a,b)=>a.name.localeCompare(b.name));
 else if(pref.order.startsWith('Published fee:')){
  found.sort((a,b)=>{
   const x=amountOf(a,pref.currency)?.value??null,y=amountOf(b,pref.currency)?.value??null;
   if(x===null)return 1;if(y===null)return -1;
   return pref.order.includes('low')?x-y:y-x;
  });
 }
 const count=document.getElementById('catalogue-count');
 if(count)count.innerHTML='<strong>'+found.length.toLocaleString('en-US')+'</strong> matching universities of <strong>'+U.length.toLocaleString('en-US')+'</strong> worldwide · '+esc(filterCountry)+(feeFilter?' · fee ranges in '+esc(pref.currency):'');
 const grand=document.getElementById('an-global-count');if(grand)grand.textContent=U.length.toLocaleString('en-US')+' universities · '+countries.length+' study destinations';
 if(needsCurrency){el.innerHTML='<div class="empty">Select a tuition currency before comparing minimum or maximum amounts.</div>';return;}
 if(loadMoreObserver)loadMoreObserver.disconnect();
 const currentCount=el.querySelectorAll('.an-guide-card').length;
 const appendOnly=found.length>0&&lastRenderedSignature===signature&&lastRenderedCount>0&&currentCount===lastRenderedCount&&visibleLimit>lastRenderedCount;
 const start=appendOnly?lastRenderedCount:0;
 const cards=found.slice(start,visibleLimit).map(anNumberedCard).join('');
 const more=found.length>visibleLimit?'<div class="catalogue-load-more" style="grid-column:1/-1;text-align:center;padding:20px"><button class="btn outline" id="load-more-universities" type="button">Show next '+Math.min(80,found.length-visibleLimit)+' of '+found.length+' universities ↓</button></div>':'';
 if(appendOnly){
   el.querySelector('.catalogue-load-more')?.remove();
   el.insertAdjacentHTML('beforeend',cards+more);
 }else{
   el.innerHTML=found.length?cards+more:'<div class="empty">No matches. Try another destination or reset filters.</div>';
 }
 lastRenderedSignature=signature;lastRenderedCount=Math.min(found.length,visibleLimit);
 const moreButton=el.querySelector('#load-more-universities');
 if(moreButton&&'IntersectionObserver' in window){
   loadMoreObserver=new IntersectionObserver(entries=>{
     if(!entries.some(x=>x.isIntersecting))return;
     loadMoreObserver.disconnect();
     visibleLimit=Math.min(found.length,visibleLimit+80);
     renderResults();
   },{rootMargin:'0px 0px 500px 0px',threshold:0});
   loadMoreObserver.observe(moreButton);
 }
 window.ANUniversityFavorites?.refresh?.();
};
document.addEventListener('change',e=>{
 const mapping={'type-filter':'kind','level-filter':'level','subject-filter':'subject','currency-filter':'currency','order-filter':'order'};
 if(mapping[e.target.id]){pref[mapping[e.target.id]]=e.target.value;renderResults();}
 if(e.target.id==='country-filter'){filterCountry=e.target.value;renderResults();}
 if(e.target.id==='scholarship-filter'){scholarshipOnly=e.target.checked;renderResults();}
});
document.addEventListener('input',e=>{
 const mapping={'min-fee-filter':'minFee','max-fee-filter':'maxFee','requirements-filter':'requirement'};
 if(mapping[e.target.id]){pref[mapping[e.target.id]]=e.target.value;renderResults();}
});
document.addEventListener('click',e=>{
 if(e.target.closest('#load-more-universities')){visibleLimit+=80;renderResults();}
 if(e.target.id==='reset-university-filters'){pref={kind:'All Types',level:'All Levels',subject:'All Subjects',currency:'Any currency',minFee:'',maxFee:'',order:'Country → QS ranking',requirement:''};filterCountry='All Countries';searchTerm='';scholarshipOnly=false;render();}
},true);
window.ANCatalogueExtras={priority,countryIndex,globalSerial,anNumberedCard,verifiedRank,rankingCompare};
/* Owner-managed PUBLIC information, published by updating site-content.json in GitHub. */
var siteCopy=null;
function repaintCopy(){
 if(!siteCopy)return;
 var ticker=document.querySelector('.ticker .marquee');
 if(ticker&&siteCopy.ticker)ticker.textContent=siteCopy.ticker;
 var h=document.querySelector('body.home-view .hero h1');
 if(h&&siteCopy.heroLead&&siteCopy.heroAccent)h.innerHTML=esc(siteCopy.heroLead)+'<br><span class="gradient">'+esc(siteCopy.heroAccent)+'</span>';
 var desc=document.querySelector('body.home-view .home-description');
 if(desc&&siteCopy.heroDescription)desc.textContent=siteCopy.heroDescription;
 if(location.hash.indexOf('#/about')===0){
  var lead=document.querySelector('.page-head p');
  if(lead&&siteCopy.aboutIntro)lead.textContent=siteCopy.aboutIntro;
  var host=document.querySelector('#app>.wrap.content');
  if(host&&Array.isArray(siteCopy.management)&&siteCopy.management.length&&!document.querySelector('#owner-management')){
   var panel=document.createElement('section');
   panel.id='owner-management';panel.className='white mt';
   panel.innerHTML='<h2><span style="color:#ff8500">Our</span> Management</h2><div class="grid">'
   +siteCopy.management.map(function(p){var photo=/^https:\/\//i.test(p.photo||'')?'<img alt="'+esc(p.name||'Manager')+'" src="'+esc(p.photo)+'" loading="lazy" style="width:100%;height:140px;object-fit:contain;background:#101010">':'';return '<article class="card">'+photo+'<div class="inside"><h3>'+esc(p.name||'')+'</h3><p>'+esc(p.role||'')+'</p><p>'+esc(p.description||'')+'</p></div></article>';}).join('')+'</div>';
   host.appendChild(panel);
  }
 }
}
window.addEventListener('hashchange',function(){queueMicrotask(repaintCopy);});
fetch('site-content.json?v=20261106-malaysia-mqa-117-v1',{cache:'no-cache'}).then(function(r){if(!r.ok)throw Error('Content not available');return r.json();}).then(function(cfg){
 siteCopy=cfg;
 (cfg.additionalUniversities||[]).forEach(function(u){
  if(!u||!u.id||!u.name||U.some(function(o){return o.id===u.id;}))return;
  var clean=function(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();};
  var dest=String(u.country||'Malaysia');
  var previous=U.find(function(o){return o.country===dest&&clean(o.name)===clean(u.name);});
  if(previous){
   if(/^an-(global|h-dir)-/.test(previous.id))U.splice(U.indexOf(previous),1);
   else return;
  }
  U.push({id:String(u.id),name:String(u.name),short:String(u.short||u.name),country:dest,city:String(u.city||''),kind:u.kind==='Private'?'Private':u.kind==='Public'?'Public':'University',institutionType:String(u.institutionType||'University'),programs:Array.isArray(u.programs)?u.programs:[],site:/^https:\/\//i.test(u.site||'')?u.site:'',registrySource:/^https:\/\//i.test(u.registrySource||'')?u.registrySource:'',cardPhoto:/^https:\/\//i.test(u.cardPhoto||'')?u.cardPhoto:'',cardPhotoSource:/^https:\/\//i.test(u.cardPhotoSource||'')?u.cardPhotoSource:'',photo:''});
 });
 Object.keys(cfg.universityOverrides||{}).forEach(function(id){
  var u=U.find(function(o){return o.id===id;}),v=cfg.universityOverrides[id];
  if(!u||!v)return;
  ['name','short','city'].forEach(function(k){if(typeof v[k]==='string'&&v[k].trim())u[k]=v[k].trim();});
 });
 window.ANExpandUniversityProfiles?.();render();repaintCopy();
}).catch(function(){/* Preserve the normal site if optional content configuration fails. */});

render();
})();