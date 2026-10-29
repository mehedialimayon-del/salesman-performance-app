/* A&N Overseas: functional multi-filter university catalogue.
   Costs are illustrative published programme examples, NOT overall university fees. */
(function(){
'use strict';
var pref={kind:'All Types',level:'All Levels',subject:'All Subjects',budget:'Any Budget',order:'Featured',requirement:''};
var levels={
 upm:['Bachelor','Master','PhD'],um:['Bachelor','Master','PhD'],
 ukm:['Bachelor','Master','PhD'],utm:['Bachelor','Master','PhD'],
 uum:['Bachelor','Master','PhD'],unikl:['Foundation','Diploma','Bachelor','Master','PhD'],
 klust:['Foundation','Diploma','Bachelor','Master','PhD'],
 uniten:['Foundation','Diploma','Bachelor','Master','PhD']
};
function optionItems(items,value){return items.map(function(s){return '<option value="'+esc(s)+'"'+(value===s?' selected':'')+'>'+esc(s)+'</option>';}).join('');}
function field(name,id,contents){return '<label><span>'+name+'</span>'+contents.replace('PLACEHOLDER_ID',id)+'</label>';}
function selectBox(id,items,current){return '<select id="'+id+'">'+optionItems(items,current)+'</select>';}
var subjects=['All Subjects','Agriculture','Aquaculture','Architecture','Business','Communication','Computer Science','Economics','Education','Engineering','Finance','Health','Management','Science','Social Sciences','Technology'];
universitiesPage=function(){
 var query=new URLSearchParams((location.hash.split('?')[1]||''));
 filterCountry=query.get('country')||'Malaysia';
 var controls='<div class="filter-fields">'
 +field('COUNTRY','country-filter',selectBox('country-filter',['All Countries'].concat(countries.map(function(c){return c[0];})),filterCountry))
 +field('PUBLIC / PRIVATE','type-filter',selectBox('type-filter',['All Types','Public','Private'],pref.kind))
 +field('STUDY LEVEL','level-filter',selectBox('level-filter',['All Levels','Foundation','Diploma','Bachelor','Master','PhD'],pref.level))
 +field('SUBJECT / FIELD','subject-filter',selectBox('subject-filter',subjects,pref.subject))
 +field('TUITION BUDGET (RM)','budget-filter',selectBox('budget-filter',['Any Budget','Up to RM 20,000','Up to RM 40,000','Up to RM 60,000','Up to RM 90,000','RM 90,000+'],pref.budget))
 +field('SORT BY','order-filter',selectBox('order-filter',['Featured','University A–Z','Fee low to high','Fee high to low'],pref.order))
 +field('ADMISSION REQUIREMENTS','requirements-filter','<input id="requirements-filter" type="search" value="'+esc(pref.requirement)+'" placeholder="IELTS, CGPA, English, etc.">')
 +'</div>';
 return title('Explore Universities','Discover universities, courses, entry requirements, tuition and student accommodation.')
 +'<div class="wrap content university-catalogue"><div class="catalogue-tools"><label class="catalogue-search"><span>⌕</span><input id="university-search" type="search" value="'+esc(searchTerm)+'" placeholder="Search universities or programmes" aria-label="Search universities and programmes"></label>'
 +'<details class="catalogue-filter"><summary aria-label="Filter universities" title="Filter universities">☷ <span class="filter-word">Filters</span></summary><div class="catalogue-filter-panel">'
 +controls+'<div class="filter-actions"><small>Fee ranges use verified programme examples, not fixed university-wide prices.</small><button type="button" class="catalogue-clear" id="reset-university-filters">Reset filters</button></div>'
 +'</div></details></div><div id="catalogue-count" class="catalogue-count" aria-live="polite"></div><div id="results" class="grid"></div>'
 +'<div class="other-university">Your preferred university is not listed? <a href="#/contact">Ask A&N Overseas about another university ↗</a></div>'
 +'<p class="catalogue-footnote">Fees, eligibility and study levels depend on the exact programme. Published fee examples may have different durations and exclusions; always confirm with the official university offer.</p></div>';
};
function feeEstimate(u){
 var p=UNIVERSITY_PROFILES[u.id],fees=p&&p.fees||[],nums=[];
 fees.forEach(function(row){
  if(/initial payment|deposit|not total tuition|per month/i.test((row[2]||'')+' '+(row[0]||'')))return;
  var amount=String(row[1]||'').match(/RM\s*([\d,]+)/i);
  if(amount){var n=Number(amount[1].replace(/,/g,''));if(n>0)nums.push(n);}
 });
 return nums.length?Math.min.apply(null,nums):null;
}
function hasLevel(u,level){
 if(level==='All Levels')return true;
 if(levels[u.id])return levels[u.id].indexOf(level)>=0;
 var p=UNIVERSITY_PROFILES[u.id]||{},s=(u.programs||[]).concat(p.programs||[]).concat((p.fees||[]).map(function(f){return f[0];})).join(' ').toLowerCase();
 var words={Foundation:/foundation/i,Diploma:/diploma/i,Bachelor:/bachelor|undergraduate|bsc|bba/i,Master:/master|postgraduate|msc/i,PhD:/phd|doctor/i};
 return words[level].test(s);
}
function passesBudget(n){
 if(pref.budget==='Any Budget')return true;
 if(n===null)return false;
 if(pref.budget==='RM 90,000+')return n>=90000;
 var m=pref.budget.match(/[\d,]+/);return !m||n<=Number(m[0].replace(/,/g,''));
}
renderResults=function(){
 var el=document.querySelector('#results');if(!el)return;
 var term=searchTerm.toLowerCase().trim(),requirement=pref.requirement.toLowerCase().trim();
 var arr=U.filter(function(u){
  var p=UNIVERSITY_PROFILES[u.id]||{};
  var all=[u.name,u.short,u.country,u.city].concat(u.programs||[],p.programs||[]).join(' ').toLowerCase();
  var entries=[p.entry,p.intake].join(' ').toLowerCase();
  var subject=pref.subject==='All Subjects'||all.indexOf(pref.subject.toLowerCase())>=0||(pref.subject==='Science'&&/science|biology|chemistry/.test(all));
  return (filterCountry==='All Countries'||u.country===filterCountry)
   &&(pref.kind==='All Types'||u.kind===pref.kind)
   &&hasLevel(u,pref.level)&&subject&&passesBudget(feeEstimate(u))
   &&(!requirement||entries.indexOf(requirement)>=0)&&all.indexOf(term)>=0;
 });
 if(pref.order==='University A–Z')arr.sort(function(a,b){return a.name.localeCompare(b.name);});
 if(pref.order==='Fee low to high'||pref.order==='Fee high to low')arr.sort(function(a,b){
  var x=feeEstimate(a),y=feeEstimate(b);
  if(x===null)return 1;if(y===null)return -1;
  return pref.order==='Fee low to high'?x-y:y-x;
 });
 var count=document.querySelector('#catalogue-count');
 if(count)count.innerHTML='<strong>'+arr.length+'</strong> universities · '+esc(filterCountry)+(pref.budget!=='Any Budget'?' · published fee examples':'');
 el.innerHTML=arr.length?arr.map(card).join(''):'<div class="empty">No universities matched. Try resetting filters or another search.</div>';
};
document.addEventListener('change',function(e){
 var map={'type-filter':'kind','level-filter':'level','subject-filter':'subject','budget-filter':'budget','order-filter':'order'};
 if(map[e.target.id]){pref[map[e.target.id]]=e.target.value;renderResults();}
});
document.addEventListener('input',function(e){
 if(e.target.id==='requirements-filter'){pref.requirement=e.target.value;renderResults();}
});
document.addEventListener('click',function(e){
 if(e.target.id==='reset-university-filters'){
  pref={kind:'All Types',level:'All Levels',subject:'All Subjects',budget:'Any Budget',order:'Featured',requirement:''};
  filterCountry='Malaysia';searchTerm='';render();return;
 }
 var back=e.target.closest('.university-profile a[href="#/universities"]');
 if(back){var id=(location.hash.split('?')[0].split('/')[2]||''),u=U.find(function(x){return x.id===id;});if(u)back.href='#/universities?country='+encodeURIComponent(u.country);}
},true);

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
   +siteCopy.management.map(function(p){return '<article class="card"><div class="inside"><h3>'+esc(p.name||'')+'</h3><p>'+esc(p.role||'')+'</p><p>'+esc(p.description||'')+'</p></div></article>';}).join('')+'</div>';
   host.appendChild(panel);
  }
 }
}
window.addEventListener('hashchange',function(){queueMicrotask(repaintCopy);});
fetch('site-content.json?v=20261029-2154',{cache:'no-cache'}).then(function(r){if(!r.ok)throw Error('Content not available');return r.json();}).then(function(cfg){
 siteCopy=cfg;
 (cfg.additionalUniversities||[]).forEach(function(u){
  if(!u||!u.id||!u.name||U.some(function(o){return o.id===u.id;}))return;
  U.push({id:String(u.id),name:String(u.name),short:String(u.short||u.name),country:String(u.country||'Malaysia'),city:String(u.city||''),kind:u.kind==='Private'?'Private':'Public',programs:Array.isArray(u.programs)?u.programs:[],site:/^https:\/\//i.test(u.site||'')?u.site:'https://www.mqa.gov.my',photo:''});
 });
 Object.keys(cfg.universityOverrides||{}).forEach(function(id){
  var u=U.find(function(o){return o.id===id;}),v=cfg.universityOverrides[id];
  if(!u||!v)return;
  ['name','short','city'].forEach(function(k){if(typeof v[k]==='string'&&v[k].trim())u[k]=v[k].trim();});
 });
 render();repaintCopy();
}).catch(function(){/* Preserve the normal site if optional content configuration fails. */});

render();
})();