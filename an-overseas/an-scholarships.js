/* A&N Overseas scholarship catalogue and programme-to-university route integration. */
(function(){
'use strict';
const items=window.ANScholarshipData||[];
const FX={USD:124.34,EUR:139.61,GBP:167.50,AUD:87.10,JPY:0.7847,CNY:18.63,SEK:12.77,HUF:0.36,TRY:2.90,KRW:0.088,MYR:30.0,RON:27.5,AZN:73,TWD:3.84,AED:33.85,HKD:15.96,QAR:34.14,BND:97.2};
const BANK='https://www.bb.org.bd/en/index.php/econdata/exchangerate';
const DIRECT_FX=['USD','EUR','GBP','AUD','JPY','CNY','SEK'];
const easy=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g,'');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=u=>/^https:\/\/[a-z0-9.-]+\//i.test(String(u||''))?u:'#/scholarships';
const money=(n,code)=>Number(n).toLocaleString('en-US',{maximumFractionDigits:0})+' '+code;
const bdt=p=>p.amount==null||!FX[p.currency]?null:Math.round((p.amount*FX[p.currency])/10)*10;
const approx=p=>p.discountPercent!=null?('Tuition discount · '+p.discountPercent+'% · no cash stipend'):bdt(p)==null?(p.awardDisplay?'Tuition/merit award · check full details':'Funding varies / official call'):('≈ ৳'+bdt(p).toLocaleString('en-US')+' / '+(p.period==='once'?'award':p.period));
const amountText=p=>p.awardDisplay?String(p.awardDisplay):p.amount==null?'Official award varies':money(p.amount,p.currency)+' / '+(p.period==='once'?'award':p.period);
const flagCountry=c=>({'Germany':'🇩🇪','United Kingdom':'🇬🇧','Hungary':'🇭🇺','Türkiye':'🇹🇷','Japan':'🇯🇵','China':'🇨🇳','South Korea':'🇰🇷','Australia':'🇦🇺','France':'🇫🇷','Netherlands':'🇳🇱','Romania':'🇷🇴','Azerbaijan':'🇦🇿','Malaysia':'🇲🇾','Taiwan':'🇹🇼','Finland':'🇫🇮','Sweden':'🇸🇪','United Arab Emirates':'🇦🇪','Saudi Arabia':'🇸🇦','Qatar':'🇶🇦','Hong Kong':'🇭🇰','Brunei':'🇧🇳'})[c]||'🌐';

/* Country-specific destination photography already used by the A&N catalogue, with a gradient fallback.
   These are illustrative destination visuals, not scholarship sponsor marks. */
const PHOTO={
 'Europe (multiple countries)':'photo-1513635269975-59663e0ac1ad',
 'Germany':'photo-1467269204594-9661b134dd2b',
 'Hungary':'photo-1541343672885-9be56236302a',
 'Türkiye':'photo-1527838832700-5059252407fa',
 'Japan':'photo-1493976040374-85c8e12f0c0e',
 'South Korea':'photo-1517154421773-0529f29ea451',
 'China':'photo-1547981609-4b6bfe67ca0b',
 'Malaysia':'photo-1508062878650-88b52897f298',
 'United Kingdom':'photo-1513635269975-59663e0ac1ad',
 'Australia':'photo-1523482580672-f109ba8cb9be',
 'France':'photo-1502602898657-3e91760cbb34',
 'Netherlands':'photo-1512470876302-972faa2aa9a4',
 'Romania':'photo-1533105079780-92b9be482077',
 'Azerbaijan':'photo-1524231757912-21f4fe3a7200',
 'Taiwan':'photo-1534168923333-9ee7b67e763b',
 'Finland':'photo-1531366936337-7c912a4589a7',
 'Sweden':'photo-1509356843151-3e7d96241e11',
 'United Arab Emirates':'photo-1512453979798-5ea266f8880c',
 'Saudi Arabia':'photo-1578894381163-e72c17f2d45f',
 'Qatar':'photo-1562835155-9c5c5cfa02c7',
 'Hong Kong':'photo-1536599018102-9f803c140fc1',
 'Brunei':'photo-1549476464-37392f717541',
 'Asia-Pacific (multiple countries)':'photo-1547981609-4b6bfe67ca0b',
 'Global (multiple countries)':'photo-1485738422979-f5c462d49f74'
};
const FLAGS={
 'Germany':'de','Hungary':'hu','Türkiye':'tr','Japan':'jp','South Korea':'kr','China':'cn','Malaysia':'my','United Kingdom':'gb','Australia':'au','France':'fr','Netherlands':'nl','Romania':'ro','Azerbaijan':'az','Taiwan':'tw','Finland':'fi','Sweden':'se','United Arab Emirates':'ae','Saudi Arabia':'sa','Qatar':'qa','Hong Kong':'hk','Brunei':'bn'
};
const photoUrl=p=>PHOTO[p.country]?'https://images.unsplash.com/'+PHOTO[p.country]+'?w=740&q=76&auto=format&fit=crop':'';
const coverPhoto=(p,cls)=>photoUrl(p)?'<img class="'+cls+'" src="'+esc(photoUrl(p))+'" loading="lazy" decoding="async" alt="" aria-hidden="true">':'';
const flagPhoto=p=>FLAGS[p.country]?'<img class="an-scholarship-flag" src="https://flagcdn.com/w40/'+FLAGS[p.country]+'.png" alt="" aria-hidden="true" loading="lazy" decoding="async">':'';
const asList=text=>esc(text).replace(/(?:^|\n)(\d+\.) /g,'$&');
const getUniList=()=>typeof U!=='undefined'&&Array.isArray(U)?U:[];
function resolveUniversity(name){
 const catalog=getUniList(),raw=String(name||''),primary=raw.split(' / ')[0].split('/')[0].trim();
 const aliases={'Stuttgart University of Applied Sciences (HFT Stuttgart)':'Stuttgart University of Applied Sciences (HFT Stuttgart)','Charité':'Charité'};
 const key=easy(primary),full=easy(name);
 return catalog.find(u=>easy(u.name)===full)||catalog.find(u=>easy(u.name)===key)||null;
}
const knownHosts=[
 ['Bonn-Rhein-Sieg University of Applied Sciences','Germany','Sankt Augustin','https://www.h-brs.de/en'],
 ['University of Duisburg-Essen','Germany','Duisburg/Essen','https://www.uni-due.de/en/'],
 ['University of Erfurt','Germany','Erfurt','https://www.uni-erfurt.de/en/'],
 ['Otto von Guericke University Magdeburg','Germany','Magdeburg','https://www.ovgu.de/en/'],
 ['Osnabrück University of Applied Sciences','Germany','Osnabrück','https://www.hs-osnabrueck.de/en/'],
 ['University of Passau','Germany','Passau','https://www.uni-passau.de/en/'],
 ['University of Oxford','United Kingdom','Oxford','https://www.ox.ac.uk/'],
 ['University of Manchester','United Kingdom','Manchester','https://www.manchester.ac.uk/'],
 ['University of Warwick','United Kingdom','Coventry','https://warwick.ac.uk/'],
 ['University of Leeds','United Kingdom','Leeds','https://www.leeds.ac.uk/'],
 ['University of Birmingham','United Kingdom','Birmingham','https://www.birmingham.ac.uk/'],
 ['University of Glasgow','United Kingdom','Glasgow','https://www.gla.ac.uk/'],
 ['Cranfield University','United Kingdom','Cranfield','https://www.cranfield.ac.uk/'],
 ['Leeds Arts University','United Kingdom','Leeds','https://www.leeds-art.ac.uk/'],
 ['University of Hong Kong','Hong Kong','Hong Kong','https://www.hku.hk/'],
 ['Indian Institute of Technology Delhi','India','New Delhi','https://home.iitd.ac.in/'],
 ['Hitotsubashi University','Japan','Tokyo','https://www.hit-u.ac.jp/eng/'],
 ['International University of Japan','Japan','Minamiuonuma','https://www.iuj.ac.jp/'],
 ['University of Tsukuba','Japan','Tsukuba','https://www.tsukuba.ac.jp/en/'],
 ['National University of Singapore','Singapore','Singapore','https://www.nus.edu.sg/'],
 ['Asian Institute of Technology','Thailand','Pathum Thani','https://ait.ac.th/'],
 ['University of Tokyo','Japan','Tokyo','https://www.u-tokyo.ac.jp/en/'],
 ['Australian National University','Australia','Canberra','https://www.anu.edu.au/'],
 ['Brandeis University','United States','Waltham','https://www.brandeis.edu/'],
 ['Columbia University','United States','New York','https://www.columbia.edu/'],
 ['Erasmus University Rotterdam','Netherlands','Rotterdam','https://www.eur.nl/en'],
 ['IHE Delft Institute for Water Education','Netherlands','Delft','https://www.un-ihe.org/'],
 ['Johns Hopkins University','United States','Baltimore','https://www.jhu.edu/'],
 ['London School of Economics and Political Science','United Kingdom','London','https://www.lse.ac.uk/'],
 ['Yale University','United States','New Haven','https://www.yale.edu/'],
 ['Stanford University','United States','Stanford','https://www.stanford.edu/'],
 ['National Cheng Kung University','Taiwan','Tainan','https://www.ncku.edu.tw/'],
 ['Mohamed bin Zayed University of Artificial Intelligence','United Arab Emirates','Abu Dhabi','https://mbzuai.ac.ae/'],
 ['King Abdullah University of Science and Technology','Saudi Arabia','Thuwal','https://www.kaust.edu.sa/'],
 ['Qatar University','Qatar','Doha','https://www.qu.edu.qa/'],
 ['Universiti Brunei Darussalam','Brunei','Bandar Seri Begawan','https://ubd.edu.bn/'],
 ['Universiti Teknologi Brunei','Brunei','Bandar Seri Begawan','https://www.utb.edu.bn/'],
 ['Sentral Digital College Kuala Lumpur','Malaysia','Kuala Lumpur','https://sdckl.edu.my/'],
 ['Nilai University','Malaysia','Nilai, Negeri Sembilan','https://www.nilai.edu.my/'],
 ['Sunway University','Malaysia','Bandar Sunway, Selangor','https://sunway.edu.my/'],
 ['Curtin University Malaysia','Malaysia','Miri, Sarawak','https://curtin.edu.my/'],
 ['Monash University Malaysia','Malaysia','Bandar Sunway, Selangor','https://www.monash.edu.my/'],
 ['University of Padua','Italy','Padua','https://www.unipd.it/en/'],
 ["Ca' Foscari University of Venice",'Italy','Venice','https://www.unive.it/pag/13526/'],
 ['Vilnius University','Lithuania','Vilnius','https://www.vu.lt/en/'],
 ['VILNIUS TECH','Lithuania','Vilnius','https://vilniustech.lt/en/'],
 ["University of Göttingen","Germany","Göttingen","https://www.uni-goettingen.de/en/"],
 ["Leipzig University","Germany","Leipzig","https://www.uni-leipzig.de/en"],
 ["Ruhr University Bochum","Germany","Bochum","https://www.ruhr-uni-bochum.de/en"],
 ["University of Bonn","Germany","Bonn","https://www.uni-bonn.de/en"],
 ["TU Dresden","Germany","Dresden","https://tu-dresden.de/"],
 ["Europa-Universität Flensburg","Germany","Flensburg","https://www.uni-flensburg.de/en"],
 ["University of Oldenburg","Germany","Oldenburg","https://uol.de/en"],
 ["Stuttgart University of Applied Sciences (HFT Stuttgart)","Germany","Stuttgart","https://www.hft-stuttgart.de/en"],
 ["Bauhaus-Universität Weimar","Germany","Weimar","https://www.uni-weimar.de/en/"],
 ["TU Berlin","Germany","Berlin","https://www.tu.berlin/en"],
 ["University of Stuttgart","Germany","Stuttgart","https://www.uni-stuttgart.de/en/"],
 ["University of Hohenheim","Germany","Stuttgart","https://www.uni-hohenheim.de/en"],
 ["University of Bremen","Germany","Bremen","https://www.uni-bremen.de/en/"],
 ["TU Darmstadt","Germany","Darmstadt","https://www.tu-darmstadt.de/index.en.jsp"],
 ["University of Freiburg","Germany","Freiburg","https://uni-freiburg.de/en/"],
 ["University of Greifswald","Germany","Greifswald","https://www.uni-greifswald.de/en/"],
 ["TH Köln","Germany","Cologne","https://www.th-koeln.de/en/"],
 ["Charité","Germany","Berlin","https://www.charite.de/en/"],
 ["Heidelberg University","Germany","Heidelberg","https://www.uni-heidelberg.de/en"],
 ["Ludwigsburg University of Education","Germany","Ludwigsburg","https://www.ph-ludwigsburg.de/en"]
];
function addKnownUniversities(list){
 if(!Array.isArray(list))return 0;
 let added=0;
 for(const [name,country,city,site] of knownHosts){
  if(!items.some(p=>(p.universities||[]).some(x=>easy(x)===easy(name)))&&!window.ANEPOSDeep?.courses?.some(c=>easy(c.host.split(' / ')[0].split('/')[0])===easy(name)))continue;
  if(list.some(u=>easy(u.name)===easy(name) || (u.site&&u.site.replace(/^https?:\/\/(www\.)?/,'').split('/')[0]===site.replace(/^https?:\/\/(www\.)?/,'').split('/')[0])))continue;
  const id='scholarship-host-'+easy(name).slice(0,36);
  if(list.some(u=>u.id===id))continue;
  list.push({id,name,short:name.length>24?name.split(' ').filter(x=>!['of','the','and','for'].includes(x.toLowerCase())).slice(0,3).map(x=>x[0]).join('').toUpperCase():name,country,city,kind:'University',site,programs:['See official university programme catalogue'],scholarshipHost:true});
  added++;
 }
 return added;
}
let filters={search:'',country:'All destinations',level:'All degrees'};
function card(p,i){
 let desc=p.coverage.length>120?p.coverage.slice(0,117).replace(/\s+\S*$/,'')+'…':p.coverage;
 const initials=p.name.split(/[ \-·]/).filter(x=>/[A-Za-z]/.test(x)).slice(0,3).map(x=>x[0]).join('').toUpperCase();
 return '<article class="an-scholarship-card"><div class="an-scholarship-cover">'+coverPhoto(p,'an-scholarship-cover-photo')+'<div class="an-scholarship-cover-top"><span class="an-scholarship-number">'+String(i+1).padStart(3,'0')+' / '+items.length+'</span><span class="an-scholarship-country">'+flagPhoto(p)+esc(p.country)+'</span></div><span class="an-scholarship-glyph" aria-hidden="true">'+esc(initials)+'</span></div><div class="an-scholarship-body"><small class="an-scholarship-level">'+esc(p.level)+'</small><h3>'+esc(p.name)+'</h3><div class="an-scholarship-money"><strong>'+esc(amountText(p))+'</strong><small>'+esc(approx(p))+'</small></div><p class="an-scholarship-desc">'+esc(desc)+'</p><div class="an-scholarship-actions"><a href="#/scholarship/'+esc(p.id)+'">View full funding & requirements ↗</a><a href="'+esc(safeUrl(p.apply))+'" target="_blank" rel="noopener noreferrer">Official application ↗</a></div></div></article>';
}

function featureCard(p){
 if(!p)return '';
 const acronym=p.name.split(/[ ·-]/).filter(Boolean).slice(0,3).map(v=>v[0]).join('').toUpperCase();
 return '<a class="an-feature-scholarship" href="#/scholarship/'+esc(p.id)+'" title="Open '+esc(p.name)+' funding details">'+coverPhoto(p,'an-feature-photo')+'<span class="an-feature-main"><span class="an-feature-tag">'+flagPhoto(p)+esc(p.country)+'</span><strong>'+esc(p.name)+'</strong><small>'+esc(p.level)+' · '+esc(p.amount==null?'Funding by official award':amountText(p))+'</small></span><span class="an-feature-arrow" aria-hidden="true">↗</span></a>';
}
const meritIds=new Set([
 'it-padua-excellence-ba','it-padua-excellence-ma','it-padua-fee-waiver',
 'it-cafoscari-honours-ba','it-cafoscari-honours-ma',
 'it-cafoscari-college-ba','it-cafoscari-college-ma',
 'lt-vu-masters-fee','lt-vu-political-ma','lt-vu-political-ba','lt-vu-feba-admission',
 'lt-vtech-ba-full','lt-vtech-ba-partial'
]);
const isMerit=p=>p.id.startsWith('my-')||meritIds.has(p.id);
function scholarshipRail(id,heading,subtitle){
 return '<section class="an-scholarship-rail-section" aria-label="'+esc(heading)+'">'+
 '<div class="an-scholarship-rail-header"><div><span class="an-scholarship-rail-eyebrow">'+(id==='an-global-rail'?'01 / INTERNATIONAL FUNDING':'02 / ACADEMIC PERFORMANCE')+'</span><h2>'+esc(heading)+'</h2><p>'+esc(subtitle)+'</p></div>'+
 '<div class="an-scholarship-rail-nav"><button type="button" data-scholarship-slide="'+id+'" data-dir="-1" aria-label="Previous scholarships">‹</button><button type="button" data-scholarship-slide="'+id+'" data-dir="1" aria-label="Next scholarships">›</button></div></div>'+
 '<div class="an-scholarship-rail an-scholarship-grid" id="'+id+'" tabindex="0" role="region" aria-label="'+esc(heading)+' scholarship cards"></div></section>';
}
function listPage(){
 const countries=['All destinations',...new Set(items.map(p=>p.country))].sort((a,b)=>a==='All destinations'?-1:b==='All destinations'?1:a.localeCompare(b));
 const degrees=['All degrees','Bachelor','Master','PhD','Research','Professional','Exchange','Training'];
 const featured=['erasmus-mundus','daad-epos-masters','hungary-masters','turkiye-ma'].map(id=>items.find(p=>p.id===id)).filter(Boolean);
 return '<section class="an-scholarship-head"><div class="wrap"><div class="an-scholarship-head-inner"><div><span class="an-eyebrow">A&N Overseas · Funding Library</span><h1>Explore <span>Global Scholarships</span></h1></div><span class="an-scholarship-total">🎓 '+items.length+' Scholarship Pathways</span></div></div></section>'+
 '<main class="wrap content an-scholarship-directory">'+
 '<div class="an-scholarship-filters"><label>SEARCH FUNDING / COUNTRY<input id="an-scholarship-search" type="search" autocomplete="off" placeholder="e.g. DAAD, PhD, Erasmus, Japan…" value="'+esc(filters.search)+'"></label><label>DESTINATION<select id="an-scholarship-country">'+countries.map(c=>'<option'+(filters.country===c?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select></label><label>DEGREE LEVEL<select id="an-scholarship-level">'+degrees.map(x=>'<option'+(filters.level===x?' selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label></div>'+
 '<div class="an-scholarship-content-scroll" tabindex="0" role="region" aria-label="Scroll featured and all scholarship cards">'+
 '<div class="an-feature-grid" aria-label="Four featured scholarships">'+featured.map(featureCard).join('')+'</div>'+
 '<details class="an-scholarship-about"><summary>About academic funding, eligibility & latest calls <span>⌄</span></summary><p>Scholarships for Bangladeshi applicants, with separate funding levels and programme-specific eligibility. Amounts, deadlines and university choices are controlled by each official annual call. Funding amounts and exchange rates are approximate planning figures.</p><p>🌍 '+(countries.length-1)+' destination groups · 🇧🇩 BDT planning rates dated 05 Nov 2026.</p></details>'+
 '<div class="an-scholarship-meta"><strong id="an-scholarship-count"></strong><span>Official sources in each profile</span></div>'+
 '<div class="an-scholarship-scroll-region">'+scholarshipRail('an-global-rail','International & Research Funding','Government, university and research funding pathways for eligible Bangladeshi applicants.')+scholarshipRail('an-merit-rail','Intake, Semester & Merit Scholarships','University admission awards, CGPA progression, semester results and tuition-fee reductions.')+
 '</div>'+'<p class="an-scholarship-info">Exchange-rate note: <a href="'+BANK+'" target="_blank" rel="noopener noreferrer">Bangladesh Bank, 05 November 2026</a> provides base USD and major currency BDT rates; HUF, TRY, KRW, MYR, RON, AZN, TWD, AED, HKD, QAR and BND use approximate planning estimates. Amount in BDT is a translation of the published award amount, not an extra payment. Exchange rates change, amounts can be revised, and programme funding is not a living-cost guarantee. A source link is not proof that the current application cycle is open.</p></div></main>';
}
function refreshList(){
 const q=easy(filters.search);
 const eligible=items.filter(p=>(filters.country==='All destinations'||p.country===filters.country)&&
   (filters.level==='All degrees'||p.level.toLowerCase().includes(filters.level.toLowerCase()))&&
   (!q||easy([p.name,p.country,p.level,p.coverage,p.eligibility].join(' ')).includes(q)));
 const global=eligible.filter(p=>!isMerit(p)),merit=eligible.filter(isMerit);
 for(const [id,group] of [['an-global-rail',global],['an-merit-rail',merit]]){
  const el=document.getElementById(id);if(!el)continue;
  el.innerHTML=group.length?group.map(p=>card(p,items.indexOf(p))).join(''):'<div class="an-scholarship-rail-empty">No matching scholarship in this category. Change the search or filters.</div>';
  const section=el.closest('.an-scholarship-rail-section');
  if(section)section.hidden=!group.length;
 }
 const counter=document.getElementById('an-scholarship-count');
 if(counter)counter.textContent='Showing '+eligible.length+' of '+items.length+' funding pathways · '+global.length+' international / research · '+merit.length+' merit / intake / semester';
}

function highlightScholarshipFacts(value){
 return esc(value).replace(/\b(IELTS|TOEFL|PTE|English|CGPA|GPA|B2|Tuition|Scholarship|Fully funded|Master|PhD|Bachelor|Recommendation|Visa|Passport|Deadline|Motivation|Research|University|Attendance)\b/gi,'<strong class="an-fact-highlight">$1</strong>')
 .replace(/(≥\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*%|€\s*[\d,]+|RM\s*[\d,]+|USD\s*[\d,]+)/g,'<mark class="an-fact-number">$1</mark>');
}
function detailLines(content){
 const text=String(content||'').trim();
 if(!text)return [];
 let lines=text.match(/(?:^|\s)\d+\.\s/)?
  text.split(/(?=\b\d+\.\s)/g):
  text.split(/(?:\n+|;\s+(?=[A-Z0-9])|(?<=[.!?])\s+(?=[A-Z][a-z]))/g);
 return lines.map(x=>x.replace(/^\d+\.\s*/,'').trim()).filter(Boolean);
}
const section=(n,title,content)=>{
 const bits=detailLines(content);
 const body=bits.length?'<ul class="an-scholarship-item-list">'+bits.map(t=>'<li>'+highlightScholarshipFacts(t)+'</li>').join('')+'</ul>':'<p>Programme-specific details were not supplied in the current notice.</p>';
 return '<section class="an-scholarship-section an-scholarship-section-'+n+'"><h2><span>'+String(n).padStart(2,'0')+'</span> · '+esc(title)+'</h2>'+body+'</section>';
};
function hostCards(p){
 const names=p.universities||[];
 if(!names.length)return '<div class="an-scholarship-info">'+esc(p.hostNote)+' <a href="'+esc(safeUrl(p.source))+'" target="_blank" rel="noopener noreferrer">Open official host list ↗</a></div>';
 return '<div class="an-scholarship-unigrid">'+names.map((name,i)=>{
  const u=resolveUniversity(name);
  return '<article class="an-scholarship-unicard"><strong>'+String(i+1).padStart(2,'0')+' · '+esc(name)+'</strong><small>'+esc(u?u.country+' · '+u.city:'Host may require a specific programme; confirm in the official scholarship notice.')+'</small><div class="an-unilinks">'+(u?'<a href="#/university/'+encodeURIComponent(u.id)+'">University Portfolio ↗</a><a href="'+esc(safeUrl(u.site))+'" target="_blank" rel="noopener noreferrer">Official Site ↗</a><a href="#/apply/'+encodeURIComponent(u.id)+'">Apply Through A&N ↗</a>':'<a href="'+esc(safeUrl(p.source))+'" target="_blank" rel="noopener noreferrer">Programme host list ↗</a>')+'</div></article>';
 }).join('')+'</div>';
}
function countryGuideHtml(p){
 const x=window.ANScholarshipCountryGuides?.[p.country];
 if(!x)return '';
 return '<section class="an-scholarship-section an-scholarship-section-full"><h2><span>✈</span> · Country-specific visa, spouse, work & settlement</h2><p>'+esc(x.text)+'</p><div class="an-scholarship-cta"><a href="'+esc(safeUrl(x.url))+'" target="_blank" rel="noopener noreferrer">Official immigration / student guidance ↗</a></div></section>';
}
function genericDeadline(p){
 if(!p.deadlineISO||!/^\d{4}-\d{2}-\d{2}$/.test(p.deadlineISO))return '';
 return '<section class="an-scholarship-datecard"><span>📅 Published scholarship deadline</span><h3>'+esc(p.deadlineKind||'Application deadline')+'</h3><strong>'+esc(p.deadlineISO)+'</strong><b data-scholarship-date="'+esc(p.deadlineISO)+'">Checking date…</b><p>Closing time not published; calendar-day counter is based on the device clock, not a live provider feed.</p></section>';
}
let genericDeadlineTimer;
function mountGenericDeadlines(){
 if(genericDeadlineTimer)clearInterval(genericDeadlineTimer);
 const tick=()=>{
  for(const el of document.querySelectorAll('[data-scholarship-date]')){
   const [y,m,d]=el.dataset.scholarshipDate.split('-').map(Number),now=new Date();
   const days=Math.round((Date.UTC(y,m-1,d)-Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()))/86400000);
   el.textContent=days<0?'Listed intake deadline has passed':days===0?'Closing calendar date is TODAY':days+' calendar days remaining';
   el.classList.toggle('an-expired',days<0);
  }
 };
 if(document.querySelector('[data-scholarship-date]')){tick();genericDeadlineTimer=setInterval(tick,60000);}
}

/* Verified versus programme-dependent requirements are kept separate.
   Values not published by a provider are NEVER fabricated. */
function detailPreparation(p){
 const isErasmus=p.id==='erasmus-mundus',isEpos=p.id==='daad-epos-masters';
 const due=p.deadlineISO
  ?'<b>Deadline in this library:</b> '+esc(p.deadlineISO)+'. Review the named intake and exact portal timezone.'
  :'<b>Deadline:</b> '+esc(p.deadline||'Not yet verified for a specific intake')+'. A precise day/hour cannot be claimed without a specific programme call.';
 const moi=isErasmus?
 '<p><span class="an-moi-badge">MOI ACCEPTED — selected programmes only</span></p><ul><li><b>i-MESC Erasmus Mundus:</b> previous studies taught in English may be evidenced by a university Medium of Instruction certificate, under its current published rules. <a href="https://i-mesc.eu/application/student" target="_blank" rel="noopener noreferrer">Official programme requirements ↗</a></li><li><b>Euroculture Joint Master:</b> an MOI letter or degree record can support an English-test exemption, subject to first-choice university and degree-country conditions. <a href="https://www.euroculturemaster.eu/application-procedure" target="_blank" rel="noopener noreferrer">Official Euroculture conditions ↗</a></li><li><b>Other Erasmus programmes:</b> MOI is NOT automatically accepted merely because they belong to Erasmus Mundus. Check each consortium.</li></ul>':
 isEpos?'<p><span class="an-moi-badge no">MOI NOT ACCEPTED — Hohenheim AgEcon EPOS</span></p><p>The University of Hohenheim explicitly requires an official English test for its DAAD-funded Agricultural Economics MSc: IELTS Academic 6.5 or TOEFL iBT 90 (published old TOEFL scale). An English-medium university letter alone is not sufficient. <a href="https://www.uni-hohenheim.de/agecon-stipendien" target="_blank" rel="noopener noreferrer">Official AgEcon EPOS requirement ↗</a>. Other DAAD EPOS tracks set their own language rules.</p>':
 '<p><span class="an-moi-badge unknown">MOI: NOT VERIFIED FOR THIS SPECIFIC AWARD</span></p><p>An English-medium Bachelor degree does not automatically waive IELTS/TOEFL. Ask the named host programme whether an official MOI letter is an accepted substitute before paying an application fee. <a href="https://www.uni-assist.de/en/how-to-apply/plan-your-application/language-certificates/" target="_blank" rel="noopener noreferrer">Evidence formats described by uni-assist ↗</a>.</p>';
 return '<section class="an-specific-guide" id="an-scholarship-document-guide"><h2>Complete application preparation — programme-specific checklist</h2><p>Everything below distinguishes university/provider requirements from preparation tips. Exact mandatory formats and cut-offs can differ across universities and application rounds.</p><div class="an-specific-grid">'+
 '<article><h3>01 · Passport and identity scan</h3><ul><li><b>Minimum:</b> a legible bio-data page with full name, date of birth, nationality, passport number and expiration.</li><li><b>All pages or 2-page spread?</b> No universal scholarship-wide rule. Upload additional visa/stamp/blank pages or both sides ONLY when that programme’s official portal asks for them.</li><li><b>Format:</b> use colour PDF/JPG as specified by portal; 300 dpi is a helpful scan-quality target, NOT an official universal requirement.</li><li><b>Validity:</b> check the destination visa and admission rules for the required remaining passport validity.</li></ul></article>'+
 '<article><h3>02 · Certificates, transcripts, grades</h3><ul><li><b>Bachelor or Master:</b> provide the qualifying degree and complete semester/year transcripts for the degree level requested.</li><li><b>SSC/HSC:</b> attach school certificates and results for undergraduate entry or where a postgraduate portal explicitly requests earlier qualifications. Not every Master scholarship needs SSC/HSC.</li><li><b>CGPA/GPA:</b> '+esc(p.eligibility||'See named host criteria')+'. There is no fabricated universal GPA threshold.</li><li><b>Translations:</b> obtain certified translations if the university requires documents in English or the destination language. Include grading-scale explanations where requested.</li></ul></article>'+
 '<article><h3>03 · CV / résumé template</h3><ul><li><b>Preferred where required:</b> Europass CV for DAAD EPOS; otherwise use the official provider form or a neat reverse-chronological PDF.</li><li><b>Contents:</b> dated education, work roles, relevant projects, research, publications, awards, language skills, references.</li><li><b>Length and file size:</b> 1–2 pages is often a practical starting point; this is NOT a binding scholarship specification. Follow each portal’s maximum size and format.</li><li><a href="https://europa.eu/europass/en/create-europass-cv" target="_blank" rel="noopener noreferrer">Create Europass CV ↗</a></li></ul></article>'+
 '<article><h3>04 · Photograph, recommendations and SOP</h3><ul><li><b>Portrait:</b> provide a recent colour passport-style photo only when required. A 35 × 45 mm photo is NOT universal for university applications; use the exact dimensions, background and pixel/file-size limit published by the chosen portal.</li><li><b>Recommendation:</b> academic/professional referee name, title, official email and signed letter according to the call.</li><li><b>Motivation / SOP:</b> relate your previous training and future goals directly to the host programme. Match its word/page limit.</li><li><b>Research candidates:</b> add supervisor, proposal, writing samples or portfolio only when the degree requires them.</li></ul></article>'+
 '<article><h3>05 · IELTS / TOEFL / MOI eligibility</h3>'+moi+'<p><b>Current language entry description:</b> '+esc(p.language||'Confirm the named programme')+'. Individual programmes may require IELTS Academic, TOEFL iBT, PTE, Duolingo, German or another language test. A scholarship name alone never guarantees a waiver.</p></article>'+
 '<article><h3>06 · When, where and how to apply</h3><p>'+due+'</p><ol><li>Choose the exact course, award level, eligible host and intake.</li><li>Open its official admission/application link and create the account when required.</li><li>Choose the scholarship-funded route or tick the award option if the provider offers it.</li><li>Upload each required document in the format/size shown by that portal.</li><li>Submit by the programme’s closing date and retain the confirmation email, receipt and application/reference number.</li><li>Complete interview, nomination, award and visa steps when formally requested.</li></ol><p><a href="'+esc(safeUrl(p.apply))+'" rel="noopener noreferrer" target="_blank">Official application portal ↗</a></p></article>'+
 '<article><h3>07 · Application fees and visa budget</h3><p><b>Scholarship / university fee:</b> '+esc(p.fee||'Only the provider can confirm')+'</p><p><b>Visa charges:</b> Country, age, visa type and waiver rules vary. Check the applicable embassy before paying; a scholarship can qualify for a waiver in some countries, not all.</p><p><b>Upfront costs:</b> tests, translations, document legalisation, travel, deposit and insurance depend on the selected destination. Never treat an example budget as an official fixed fee.</p></article>'+
 '<article><h3>08 · Duration, host universities and funding</h3><p><b>General duration:</b> '+esc(p.duration||'Check official degree')+'. A programme-specific duration is authoritative over this summary.</p><p><b>Confirmed host list:</b> use the university/eligible-programme cards on this page. Where no host is confirmed, the scholarship operator’s current course catalogue is the source—not all universities in that country are automatically eligible.</p><p><b>Funding:</b> '+esc(p.coverage||'Refer to award')+'. Each monthly stipend is separate from tuition coverage, housing, travel and visa costs unless expressly included.</p></article>'+
 '</div></section>';
}

/* Current official call examples: never turn an indicative round into a guaranteed open application. */
function verifiedCallHtml(p){
 if(p.id==='erasmus-mundus')return '<section class="an-specific-guide"><h2>Verified Erasmus Mundus programme example: i-MESC 2027–2029</h2><div class="an-specific-grid"><article><h3>Course & universities</h3><p>i-MESC · interdisciplinary Materials for Energy Storage and Conversion. Four semesters, 120 ECTS, approximately 24 months. The five awarding partners and associated institutions are linked in the university cards below.</p><p><b>Funding:</b> EU EMJM scholarship €1,400/month for up to 24 months = maximum €33,600 for selected scholarship recipients; not every admission is funded.</p><p><a target="_blank" rel="noopener noreferrer" href="https://i-mesc.eu/for-students">Official award details ↗</a></p></article><article><h3>Application timeline — published indicative dates</h3><p><b>Indicative opening:</b> 9 November 2026, 14:00 Paris time. <span class="an-deadline-live" data-call-utc="2026-11-09T13:00:00Z">Checking live time…</span></p><p><b>Indicative closing:</b> 26 January 2027, 12:00 Paris time. <span class="an-deadline-live" data-call-utc="2027-01-26T11:00:00Z">Checking live time…</span></p><p>These dates are expressly described by the programme as indicative and must be reconfirmed when its portal opens.</p><p><a target="_blank" rel="noopener noreferrer" href="https://i-mesc.eu/application/admission-criteria">Official programme calendar ↗</a></p></article><article><h3>Language and supporting materials</h3><p><span class="an-moi-badge">MOI accepted for qualifying English-medium previous study</span> Submit an official university-issued English Medium of Instruction certificate when the programme’s exemption criteria are met. Otherwise IELTS/TOEFL or another listed accepted test is required.</p><p>Prepare academic transcripts, CV, purpose/motivation materials, referee details and the video presentation where requested by this programme. Follow upload formats and limits displayed when the application portal opens.</p><p><a target="_blank" rel="noopener noreferrer" href="https://i-mesc.eu/application/student">i-MESC official document requirements ↗</a></p></article><article><h3>Submission steps</h3><ol><li>Visit the i-MESC official application page once the 2027–2029 call opens.</li><li>Choose the correct Class #23 intake; create the applicant account when the form becomes available.</li><li>Complete personal, academic, programme and language fields.</li><li>Upload the named documents and any video statement required by the live portal.</li><li>Review, submit before the published Paris-time deadline and keep the confirmation.</li></ol><p>No A&N website can submit directly to the consortium on your behalf without a formal official integration.</p></article></div></section>';
 if(p.id.startsWith('hungary-'))return '<section class="an-specific-guide"><h2>Hungary — country-specific official submission route</h2><div class="an-specific-grid"><article><h3>Bangladesh sending partner</h3><p>Bangladesh nominates through the Secondary and Higher Education Division, Ministry of Education. The available study fields and programmes must be selected under Bangladesh in the official portal; nomination is required to continue.</p><p><a href="https://stipendiumhungaricum.hu/partners/www.ugc.gov.in/?partner=bangladesh" target="_blank" rel="noopener noreferrer">Official Bangladesh partner details ↗</a></p></article><article><h3>Official DreamApply steps & fee</h3><ol><li>Open the official application portal and create an account when the current call is published.</li><li>Select Bangladesh as the sending partner and your eligible Master/PhD programme(s).</li><li>Complete personal, education and language fields; upload all documents in the live portal checklist.</li><li>Submit the free online application and separately complete any Bangladesh sending-partner requirements.</li><li>Nomination, institutional assessment and admission follow according to official rules.</li></ol><p><b>Application fee:</b> The official online Stipendium Hungaricum application and admission examinations are free. A&N offers optional independent preparation help, not government nomination.</p><p><b>2027/28 deadline:</b> not confirmed by the official programme yet; do not use the expired 15 January 2026 date as the next deadline.</p><p><a href="https://stipendiumhungaricum.hu/apply/" target="_blank" rel="noopener noreferrer">Official guide and instructions ↗</a></p></article></div></section>';
 if(p.id.startsWith('turkiye-'))return '<section class="an-specific-guide"><h2>Türkiye Scholarships — official online timeline and criteria</h2><div class="an-specific-grid"><article><h3>Eligibility and annual dates</h3><p>Regular full-time scholarship applications are generally accepted <b>10 January – 20 February</b> each year. Do not describe the 2027 intake as currently open without its specific announcement. Minimum academic achievement: Bachelor 70%; Master/PhD 75%; health degree options 90%. Age limits: Bachelor under 21, Master under 30 and PhD under 35.</p><p><a href="https://www.turkiyeburslari.gov.tr/scholarshipsprograms" target="_blank" rel="noopener noreferrer">Official eligibility ↗</a> · <a href="https://turkiyeburslari.gov.tr/calendar" target="_blank" rel="noopener noreferrer">Official calendar ↗</a></p></article><article><h3>Where to submit</h3><ol><li>Open the Türkiye Scholarships TBBS system in the published application window.</li><li>Create your applicant profile and complete citizenship, academic history and contact data.</li><li>Choose eligible programmes shown for your qualifications.</li><li>Upload the required academic documents, photo, test certificates and other items as instructed by TBBS.</li><li>Review, submit and monitor interview and selection notices in the official account.</li></ol><p><a href="https://tbbs.turkiyeburslari.gov.tr/" target="_blank" rel="noopener noreferrer">Official TBBS application ↗</a></p></article></div></section>';
 return '';
}
let verifiedCountdownTicker=null;
function mountSpecificTimers(){
 if(verifiedCountdownTicker)clearInterval(verifiedCountdownTicker);
 const tick=()=>{
  const els=document.querySelectorAll('.an-deadline-live[data-call-utc]');
  for(const el of els){
   const t=Date.parse(el.dataset.callUtc);
   if(!Number.isFinite(t)){el.textContent='Exact time unavailable';continue;}
   const ms=t-Date.now();
   if(ms<=0){el.textContent='Published indicative time has passed · check live programme status';continue;}
   const d=Math.floor(ms/86400000),h=Math.floor(ms/3600000)%24,m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60;
   el.textContent=d+'d '+String(h).padStart(2,'0')+'h '+String(m).padStart(2,'0')+'m '+String(s).padStart(2,'0')+'s (live estimate)';
  }
  if(!els.length){clearInterval(verifiedCountdownTicker);verifiedCountdownTicker=null;}
 };
 if(document.querySelector('.an-deadline-live[data-call-utc]')){tick();verifiedCountdownTicker=setInterval(tick,1000)}
}
function scholarshipSupportCard(p){
 return '<section class="an-scholarship-help" id="an-scholarship-help" aria-label="A&N Overseas scholarship assistance"><h2>How A&N Overseas Can Help You</h2>'+
 '<p>Our education consultancy team can help you review programme eligibility, select an official university, prepare a CV and motivation statement, check document completeness, understand application steps and plan the next admission and visa stages. Programme-specific acceptance and an individual adviser’s experience should be confirmed during consultation.</p>'+
 '<p><b>Scholarship:</b> '+esc(p.name)+'</p>'+
 '<form id="contact-form"><label>Your Name<input name="name" required autocomplete="name" placeholder="Full name"></label>'+
 '<label>Email<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label>'+
 '<label class="an-help-full">Phone / WhatsApp (optional)<input name="phone" type="tel" autocomplete="tel" placeholder="Include country code"></label>'+
 '<label class="an-help-full">Tell us your qualification and preferred intake<textarea name="message" required rows="4">'+esc('I would like A&N Overseas guidance for '+p.name+'. My highest qualification, CGPA, IELTS/TOEFL/MOI status and target intake are: ')+'</textarea></label>'+
 '<button class="an-help-full" type="submit">Request A&N Scholarship Support ↗</button>'+
 '<p id="an-contact-feedback" class="an-contact-feedback an-help-full" aria-live="polite" role="status"></p></form>'+
 '<p class="an-help-disclaimer">This submits an enquiry to A&N Overseas, NOT an official scholarship application. The university/award provider controls admissions, acceptance and visa decisions. We never guarantee an award. <a href="'+esc(safeUrl(p.apply))+'" target="_blank" rel="noopener noreferrer">Go to official application portal ↗</a></p></section>';
}
function detailPage(id){
 const p=items.find(x=>x.id===id);
 if(!p)return '<div class="wrap content"><h1>Funding pathway not found</h1><a class="btn" href="#/scholarships">← Back to scholarship directory</a></div>';
 const conv=p.discountPercent!=null?('Tuition discount '+p.discountPercent+'%, not a cash payment'):bdt(p)==null?(p.awardDisplay?'Tuition-waiver value depends on course fees':'Award amount depends on institution / offer'):('≈ ৳'+bdt(p).toLocaleString('en-US')+' / '+(p.period==='once'?'award':p.period));
 const isEpos=p.id==='daad-epos-masters';
 if(isEpos&&window.ANEPOSGuide&&window.ANEPOSDeep){
  const guide=window.ANEPOSGuide.render(p,bdt(p),name=>resolveUniversity(name));
  return '<main class="wrap an-scholarship-detail"><nav class="an-breadcrumb"><a href="#/home">Home</a> › <a href="#/scholarships">Scholarships</a> › '+esc(p.name)+'</nav>'+
   '<section class="an-scholarship-lead"><div class="an-scholarship-intro"><span class="an-type">🇩🇪 GERMANY · '+esc(p.level)+'</span><h1>'+esc(p.name)+'</h1><p>Government-funded DAAD EPOS scholarship for named development-related courses, with separate university application, exact academic prerequisites and verified programme-specific deadlines.</p><div class="an-scholarship-cta"><button type="button" data-epos-jump>Read Full A–Z Guide ↓</button><a href="'+esc(safeUrl(p.source))+'" target="_blank" rel="noopener noreferrer">Official DAAD award ↗</a></div></div><aside class="an-scholarship-amount-panel"><small>DAAD Monthly Award</small><strong>'+esc(amountText(p))+'</strong><small>Approximate BDT equivalent</small><em>'+esc(conv)+'</em><p style="color:#e5d4bc;font-size:12px">Only a planning currency conversion. Tuition, insurance, rent and travel are separately itemised below.</p></aside></section>'+
   guide+detailPreparation(p)+verifiedCallHtml(p)+scholarshipSupportCard(p)+'<div class="an-scholarship-cta"><a href="#/scholarships">← Back to all scholarships</a></div></main>';
 }
 const sections=[
 ['Scholarship & financial coverage',p.coverage],
 ['Academic eligibility — Bangladeshi applicants',p.eligibility],
 ['English / IELTS / language',p.language],
 ['Documents & full application file',p.documents],
 ['How to apply — step by step',p.steps],
 ['Scholarship / university application fees',p.fee],
 ['When to apply & processing',p.deadline+' Selection, offer and visa processing times differ by institution and government; no decision timeframe can be guaranteed.'],
 ['Programme duration',p.duration],
 ['Expected costs not necessarily covered',p.costs+'\n\nSuggested personal planning reserve (illustrative only, not an official visa estimate): language testing ৳15,000–৳30,000 if required; document copies/translations/notarisation ৳3,000–৳25,000; outbound flight ৳40,000–৳180,000 if not covered; accommodation deposits and government visa fees vary by destination. Do not pay airfare or nonrefundable fees before a confirmed offer and immigration advice.'],
 ['Spouse / family benefits & restrictions',p.family],
 ['Student work permissions',p.work],
 ['Post-study stay, PR & return duties',p.post]
 ];
 return '<main class="wrap an-scholarship-detail"><div class="an-breadcrumb"><a href="#/home">Home</a> › <a href="#/scholarships">Scholarships</a> › '+esc(p.name)+'</div><div class="an-scholarship-lead"><div class="an-scholarship-intro"><span class="an-type">'+flagCountry(p.country)+' '+esc(p.country)+' · '+esc(p.level)+'</span><h1>'+esc(p.name)+'</h1><p>'+esc(p.coverage)+'</p><p>Last source review: '+esc(p.updated)+' · Bangladesh-oriented application guidance</p><div class="an-scholarship-cta"><a href="'+esc(safeUrl(p.apply))+'" target="_blank" rel="noopener noreferrer">Apply at official provider ↗</a><a href="'+esc(safeUrl(p.source))+'" target="_blank" rel="noopener noreferrer">Scholarship official details ↗</a></div></div><aside class="an-scholarship-amount-panel"><small>Funding in original currency</small><strong>'+esc(amountText(p))+'</strong><small>Indicative Bangladesh taka conversion</small><em>'+esc(conv)+'</em><p style="line-height:1.6;font-size:11px;color:#dcc7b9;margin-top:15px">Currency figures are not an offer and do not include unfunded tuition, travel, visa or living-cost differences. <a href="'+BANK+'" target="_blank" rel="noopener noreferrer" style="color:#ffd097">FX reference ↗</a></p></aside></div>'+genericDeadline(p)+'<div class="an-scholarship-section-grid">'+sections.map((item,i)=>section(i+1,item[0],item[1])).join('')+'</div>'+countryGuideHtml(p)+'<section class="an-scholarship-universities"><h2>Universities & eligible programmes</h2><p style="font-size:12px;color:#c7c9cd;line-height:1.65">'+esc(p.hostNote)+'</p>'+hostCards(p)+'</section><section class="an-scholarship-section an-scholarship-section-full"><h2><span>13</span> · Official sources, application & reliability</h2><p>Scholarship operator: '+esc(p.name)+'\nApplication window and amounts are subject to the current annual call. Some awards require separate university admission, nomination or an embassy route. A&N can guide preparation but cannot submit an official award decision or guarantee scholarship, visa, family residence or PR.</p><div class="an-scholarship-cta"><a href="'+esc(safeUrl(p.apply))+'" target="_blank" rel="noopener noreferrer">Open official application ↗</a><a href="'+esc(safeUrl(p.source))+'" target="_blank" rel="noopener noreferrer">Read official award & document list ↗</a><a href="#/scholarships">← All scholarship cards</a></div></section>'+detailPreparation(p)+verifiedCallHtml(p)+scholarshipSupportCard(p)+'</main>';
}
function onRender(page,second){
 if(page==='scholarships'){refreshList();}
 if(page==='scholarship'){
  const p=items.find(x=>x.id===second);if(p)document.title=p.name+' | A&N Scholarships';
  window.ANEPOSGuide?.mount?.();mountGenericDeadlines();mountSpecificTimers();
 }
 if(page==='university'){
  const u=getUniList().find(x=>x.id===second);
  if(!u)return;
  const matching=items.filter(p=>p.universities.some(n=>easy(n)===easy(u.name)));
  const container=document.querySelector('.university-profile .profile-body')||document.querySelector('.university-profile');
  if(container&&!container.querySelector('.an-uni-scholarship-strip'))container.insertAdjacentHTML('beforeend','<section class="an-uni-scholarship-strip"><h3>🎓 Scholarships & Funding</h3><p>'+esc(matching.length?matching.length+' listed funding pathways mention this university. Eligibility is programme-specific and not automatic.':'Explore country-specific academic scholarship and funding opportunities. Only verified host associations are linked below.')+'</p>'+(matching.map(p=>'<a href="#/scholarship/'+esc(p.id)+'">'+esc(p.name)+' ↗</a>').join(''))+'<a href="#/scholarships">All Scholarships ↗</a></section>');
 }

}
document.addEventListener('click',e=>{if(e.target.closest?.('[data-epos-jump]'))document.getElementById('an-epos-extended')?.scrollIntoView({behavior:'smooth',block:'start'});});
document.addEventListener('click',e=>{
 const b=e.target.closest?.('[data-scholarship-slide]');
 if(!b)return;
 const rail=document.getElementById(b.dataset.scholarshipSlide);
 if(rail)rail.scrollBy({left:(Number(b.dataset.dir)||1)*Math.max(280,rail.clientWidth*.8),behavior:'smooth'});
});
document.addEventListener('input',e=>{
 if(e.target.id==='an-scholarship-search'){filters.search=e.target.value;refreshList();}
});
document.addEventListener('change',e=>{
 if(e.target.id==='an-scholarship-country'){filters.country=e.target.value;refreshList();}
 if(e.target.id==='an-scholarship-level'){filters.level=e.target.value;refreshList();}
});
/* Broken/blocked remote photos simply fall back to the premium gradient. */
document.addEventListener('error',e=>{
 const el=e.target;
 if(el?.matches?.('.an-scholarship-cover-photo,.an-feature-photo,.an-scholarship-flag'))el.style.display='none';
},true);
document.addEventListener('click',e=>{
 const link=e.target.closest('[data-scholarships-only]');
 if(link){e.preventDefault();location.hash='#/scholarships';}
});
window.ANScholarships={items,listPage,detailPage,addKnownUniversities,onRender,refreshList,approx,bdt,isMerit};
})();