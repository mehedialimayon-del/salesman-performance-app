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
const approx=p=>bdt(p)==null?'Funding varies / official call':('≈ ৳'+bdt(p).toLocaleString('en-US')+' / '+(p.period==='once'?'award':p.period));
const amountText=p=>p.amount==null?'Official award varies':money(p.amount,p.currency)+' / '+(p.period==='once'?'award':p.period);
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
 const catalog=getUniList(),key=easy(name);
 return catalog.find(u=>easy(u.name)===key)||null;
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
 ['Universiti Teknologi Brunei','Brunei','Bandar Seri Begawan','https://www.utb.edu.bn/']
];
function addKnownUniversities(list){
 if(!Array.isArray(list))return 0;
 let added=0;
 for(const [name,country,city,site] of knownHosts){
  if(!items.some(p=>(p.universities||[]).some(x=>easy(x)===easy(name))))continue;
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
function listPage(){
 const countries=['All destinations',...new Set(items.map(p=>p.country))].sort((a,b)=>a==='All destinations'?-1:b==='All destinations'?1:a.localeCompare(b));
 const degrees=['All degrees','Bachelor','Master','PhD','Research','Professional','Exchange','Training'];
 const featured=['erasmus-mundus','daad-epos-masters','hungary-masters','turkiye-ma'].map(id=>items.find(p=>p.id===id)).filter(Boolean);
 return '<section class="an-scholarship-head"><div class="wrap"><div class="an-scholarship-head-inner"><div><span class="an-eyebrow">A&N Overseas · Funding Library</span><h1>Explore <span>Global Scholarships</span></h1></div><span class="an-scholarship-total">🎓 '+items.length+' Scholarship Pathways</span></div></div></section>'+
 '<main class="wrap content an-scholarship-directory">'+
 '<div class="an-feature-grid" aria-label="Four featured scholarships">'+featured.map(featureCard).join('')+'</div>'+
 '<details class="an-scholarship-about"><summary>About academic funding, eligibility & latest calls <span>⌄</span></summary><p>Scholarships for Bangladeshi applicants, with separate funding levels and programme-specific eligibility. Amounts, deadlines and university choices are controlled by each official annual call. Funding amounts and exchange rates are approximate planning figures.</p><p>🌍 '+(countries.length-1)+' destination groups · 🇧🇩 BDT planning rates dated 05 Nov 2026.</p></details>'+
 '<div class="an-scholarship-filters"><label>SEARCH FUNDING / COUNTRY<input id="an-scholarship-search" type="search" autocomplete="off" placeholder="e.g. DAAD, PhD, Erasmus, Japan…" value="'+esc(filters.search)+'"></label><label>DESTINATION<select id="an-scholarship-country">'+countries.map(c=>'<option'+(filters.country===c?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select></label><label>DEGREE LEVEL<select id="an-scholarship-level">'+degrees.map(x=>'<option'+(filters.level===x?' selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label></div>'+
 '<div class="an-scholarship-meta"><strong id="an-scholarship-count"></strong><span>Official sources in each profile</span></div>'+
 '<div id="an-scholarship-results" class="an-scholarship-grid"></div>'+
 '<p class="an-scholarship-info">Exchange-rate note: <a href="'+BANK+'" target="_blank" rel="noopener noreferrer">Bangladesh Bank, 05 November 2026</a> provides base USD and major currency BDT rates; HUF, TRY, KRW, MYR, RON, AZN, TWD, AED, HKD, QAR and BND use approximate planning estimates. Amount in BDT is a translation of the published award amount, not an extra payment. Exchange rates change, amounts can be revised, and programme funding is not a living-cost guarantee. A source link is not proof that the current application cycle is open.</p></main>';
}
function refreshList(){
 const target=document.getElementById('an-scholarship-results'),count=document.getElementById('an-scholarship-count');if(!target)return;
 const q=easy(filters.search),filtered=items.filter(p=>(filters.country==='All destinations'||p.country===filters.country)&&(filters.level==='All degrees'||p.level.toLowerCase().includes(filters.level.toLowerCase()))&&(!q||easy([p.name,p.country,p.level,p.coverage,p.eligibility].join(' ')).includes(q)));
 target.innerHTML=filtered.length?filtered.map(p=>card(p,items.indexOf(p))).join(''):'<div class="an-scholarship-info">No matching scholarships. Try another country, degree or keyword.</div>';
 if(count)count.textContent='Showing '+filtered.length+' of '+items.length+' scholarship/funding cards';
}
const section=(n,title,content)=>'<section class="an-scholarship-section"><h2><span>'+String(n).padStart(2,'0')+'</span> · '+esc(title)+'</h2><p>'+esc(content)+'</p></section>';
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
function detailPage(id){
 const p=items.find(x=>x.id===id);
 if(!p)return '<div class="wrap content"><h1>Funding pathway not found</h1><a class="btn" href="#/scholarships">← Back to scholarship directory</a></div>';
 const conv=bdt(p)==null?'Award amount depends on institution / offer':('≈ ৳'+bdt(p).toLocaleString('en-US')+' / '+(p.period==='once'?'award':p.period));
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
 return '<main class="wrap an-scholarship-detail"><div class="an-breadcrumb"><a href="#/home">Home</a> › <a href="#/scholarships">Scholarships</a> › '+esc(p.name)+'</div><div class="an-scholarship-lead"><div class="an-scholarship-intro"><span class="an-type">'+flagCountry(p.country)+' '+esc(p.country)+' · '+esc(p.level)+'</span><h1>'+esc(p.name)+'</h1><p>'+esc(p.coverage)+'</p><p>Last source review: '+esc(p.updated)+' · Bangladesh-oriented application guidance</p><div class="an-scholarship-cta"><a href="'+esc(safeUrl(p.apply))+'" target="_blank" rel="noopener noreferrer">Apply at official provider ↗</a><a href="'+esc(safeUrl(p.source))+'" target="_blank" rel="noopener noreferrer">Scholarship official details ↗</a></div></div><aside class="an-scholarship-amount-panel"><small>Funding in original currency</small><strong>'+esc(amountText(p))+'</strong><small>Indicative Bangladesh taka conversion</small><em>'+esc(conv)+'</em><p style="line-height:1.6;font-size:11px;color:#dcc7b9;margin-top:15px">Currency figures are not an offer and do not include unfunded tuition, travel, visa or living-cost differences. <a href="'+BANK+'" target="_blank" rel="noopener noreferrer" style="color:#ffd097">FX reference ↗</a></p></aside></div><div class="an-scholarship-section-grid">'+sections.map((item,i)=>section(i+1,item[0],item[1])).join('')+'</div>'+countryGuideHtml(p)+'<section class="an-scholarship-universities"><h2>Universities & eligible programmes</h2><p style="font-size:12px;color:#c7c9cd;line-height:1.65">'+esc(p.hostNote)+'</p>'+hostCards(p)+'</section><section class="an-scholarship-section an-scholarship-section-full"><h2><span>13</span> · Official sources, application & reliability</h2><p>Scholarship operator: '+esc(p.name)+'\nApplication window and amounts are subject to the current annual call. Some awards require separate university admission, nomination or an embassy route. A&N can guide preparation but cannot submit an official award decision or guarantee scholarship, visa, family residence or PR.</p><div class="an-scholarship-cta"><a href="'+esc(safeUrl(p.apply))+'" target="_blank" rel="noopener noreferrer">Open official application ↗</a><a href="'+esc(safeUrl(p.source))+'" target="_blank" rel="noopener noreferrer">Read official award & document list ↗</a><a href="#/scholarships">← All scholarship cards</a></div></section></main>';
}
function onRender(page,second){
 if(page==='scholarships'){refreshList();}
 if(page==='scholarship'){
  const p=items.find(x=>x.id===second);if(p)document.title=p.name+' | A&N Scholarships';
 }
 if(page==='university'){
  const u=getUniList().find(x=>x.id===second);
  if(!u)return;
  const matching=items.filter(p=>p.universities.some(n=>easy(n)===easy(u.name)));
  const container=document.querySelector('.university-profile .profile-body')||document.querySelector('.university-profile');
  if(container&&!container.querySelector('.an-uni-scholarship-strip'))container.insertAdjacentHTML('beforeend','<section class="an-uni-scholarship-strip"><h3>🎓 Scholarships & Funding</h3><p>'+esc(matching.length?matching.length+' listed funding pathways mention this university. Eligibility is programme-specific and not automatic.':'Explore country-specific academic scholarship and funding opportunities. Only verified host associations are linked below.')+'</p>'+(matching.map(p=>'<a href="#/scholarship/'+esc(p.id)+'">'+esc(p.name)+' ↗</a>').join(''))+'<a href="#/scholarships">All Scholarships ↗</a></section>');
 }
 if(page==='countries'){
  const container=document.querySelector('.an-country-page');
  if(container&&!container.querySelector('.an-scholarship-page-shortcut'))container.insertAdjacentHTML('afterbegin','<p><a class="an-scholarship-page-shortcut" href="#/scholarships">🎓 Scholarships · Explore academic funding ↗</a></p>');
 }
}
document.addEventListener('input',e=>{
 if(e.target.id==='an-scholarship-search'){filters.search=e.target.value;refreshList();}
});
document.addEventListener('change',e=>{
 if(e.target.id==='an-scholarship-country'){filters.country=e.target.value;refreshList();}
 if(e.target.id==='an-scholarship-level'){filters.level=e.target.value;refreshList();}
});
document.addEventListener('click',e=>{
 const link=e.target.closest('[data-scholarships-only]');
 if(link){e.preventDefault();location.hash='#/scholarships';}
});
window.ANScholarships={items,listPage,detailPage,addKnownUniversities,onRender,refreshList,approx,bdt};
})();