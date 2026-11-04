/* A&N University Guide · 2026-11-05
 * Only known, attributed university photographs and explicitly sourced rankings/fee data.
 * All other identity covers are designed placeholders, not fake campus photos.
 * Official country application routes are informational and do not replace programme-specific rules.
 */
(function(){
'use strict';
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validUrl=x=>{try{const u=new URL(String(x));return u.protocol==='https:'?u.href:'';}catch{return'';}};
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
const qsSource='https://www.topuniversities.com/qs-top-uni-wur';
/* Numbers transcribed from the official QS World University Rankings 2027 top-200 table.
 * No fabricated ranking is supplied for universities not independently checked. */
const ranked=[
['Imperial College London',2],['University of Oxford',4],['University of Cambridge',6],['ETH Zurich',8],
['University College London',8],['UCL',8],['National University of Singapore',10],
['Peking University',13],['Tsinghua University',14],
['University of Melbourne',22],['Technical University of Munich',25],['University of Sydney',28],
['Monash University',31],['University of Toronto',32],['Universite PSL',34],['University of Edinburgh',35],
['Kings College London',37],['Seoul National University',38],['University of Manchester',40],
['University of Queensland',40],['University of British Columbia',45],['Delft University of Technology',48],
['Universiti Malaya',56],['KU Leuven',59],['University of Amsterdam',60],['Lund University',71],
['Sorbonne University',73],['Trinity College Dublin',75],['Trinity College Dublin The University of Dublin',75],
['University of Glasgow',80],['KTH Royal Institute of Technology',82],
['University of Copenhagen',90],['University of Helsinki',123],['Aalto University',126],
['Aarhus University',128],['Universiti Sains Malaysia',128],['Universiti Kebangsaan Malaysia',130],
['University of Oslo',131],['Universiti Putra Malaysia',138],['University of Vienna',140],
['Ghent University',150],['University of Basel',150],['University of Groningen',157],
['Universiti Teknologi Malaysia',158],['University of Barcelona',165],['University of Geneva',168],
['Politecnico di Milano',87],['Uppsala University',87],['University of Warwick',68],
['University of Bristol',57],['University of Birmingham',68],['University of Zurich',98],
['University of Nottingham',97],['RWTH Aachen University',104],['Sapienza University of Rome',111],
['University of Southampton',112],['University of Liverpool',139],['University of Leeds',77],
['University of St Andrews',115],['Erasmus University Rotterdam',148],['Wageningen University and Research',154],
['Vrije Universiteit Amsterdam',185],['Universitaet Heidelberg',86],['Karlsruhe Institute of Technology',110],
['Complutense University of Madrid',199],['University of Reading',196],
['Universite Paris-Saclay',76],['University of Bern',191]
];
const ranks=new Map(ranked.map(([name,rank])=>[norm(name),rank]));
const idRank={upm:138,um:56,ukm:130,utm:158,usm:128,manchester:40,warwick:68,toronto:32,ubc:45,melbourne:22,monash:31,snu:38,tsinghua:14};
const countryRoute={
 'United Kingdom':{name:'UCAS undergraduate application',url:'https://www.ucas.com/international/international-students/applying-to-university-as-an-international-student',level:'Bachelor',note:'Undergraduate: use UCAS for most courses; postgraduate and research applications follow the university instructions.'},
 'Germany':{name:'DAAD / university or uni-assist',url:'https://www.daad.de/en/studying-in-germany/requirements/overview/',note:'Depending on the programme, apply to the institution or through uni-assist; confirm the route first.'},
 'Austria':{name:'Study in Austria · application rules',url:'https://studyinaustria.at/en/plan-your-studies/application-and-admission',note:'Apply directly to the university; confirm admission office, recognition and deadlines.'},
 'Sweden':{name:'UniversityAdmissions.se',url:'https://www.universityadmissions.se/en/apply-to-masters/',note:'National university admissions for many bachelor and master programmes; doctoral posts follow each university.'},
 'Finland':{name:'Studyinfo.fi admissions',url:'https://www.studyinfinland.fi/admissions',note:'Find the exact programme in Studyinfo.fi and check joint or separate application dates.'},
 'Netherlands':{name:'Study in NL / Studielink',url:'https://www.studyinnl.org/plan-your-stay/how-to-apply',note:'Studielink is used for many programmes, but some institutions have additional or different steps.'},
 'Italy':{name:'Universitaly pre-enrolment information',url:'https://studyinitaly.esteri.it/static/ProcedureIscrizione',note:'Visa applicants may require university pre-admission and Universitaly pre-enrolment. PhD deadlines differ.'},
 'France':{name:'Campus France · Études en France',url:'https://www.campusfrance.org/fr/candidature-procedure-etudes-en-france',note:'Études en France applies to residents in designated countries, including Bangladesh and Malaysia. Other routes depend on residence and degree.'}
};
const photos={
 'eu-at-university-of-vienna':{url:'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Universit%C3%A4t_Wien_Hauptgeb%C3%A4ude_%28Ian_Ehm%29_16.jpg/1280px-Universit%C3%A4t_Wien_Hauptgeb%C3%A4ude_%28Ian_Ehm%29_16.jpg',credit:'Wikimedia Commons · University of Vienna'},
};
const flag={Malaysia:'🇲🇾','United Kingdom':'🇬🇧',Germany:'🇩🇪',Austria:'🇦🇹',Belgium:'🇧🇪','Czech Republic':'🇨🇿',Denmark:'🇩🇰',Finland:'🇫🇮',France:'🇫🇷',Greece:'🇬🇷',Hungary:'🇭🇺',Ireland:'🇮🇪',Italy:'🇮🇹',Luxembourg:'🇱🇺',Netherlands:'🇳🇱',Norway:'🇳🇴',Poland:'🇵🇱',Portugal:'🇵🇹',Spain:'🇪🇸',Sweden:'🇸🇪',Switzerland:'🇨🇭',Canada:'🇨🇦',Australia:'🇦🇺',China:'🇨🇳',Japan:'🇯🇵','South Korea':'🇰🇷','United States':'🇺🇸','United Arab Emirates':'🇦🇪',Turkey:'🇹🇷',Singapore:'🇸🇬',Thailand:'🇹🇭','New Zealand':'🇳🇿'};
const getRank=u=>Number.isInteger(Number(u.qs2027))?Number(u.qs2027):idRank[u.id]||ranks.get(norm(u.name))||null;
const compare=(a,b)=>(getRank(a)??999999)-(getRank(b)??999999)||a.name.localeCompare(b.name);
const route=u=>countryRoute[u.country]||null;
const localPhoto=(u,p)=>{
 const custom=photos[u.id];if(custom)return custom;
 const override=validUrl(u.cardPhoto);if(override)return{url:override,credit:'University-specific image — verify attribution before reuse'};
 const image=p?.images?.find(x=>x?.url&&(/^(assets\/|https:\/\/)/.test(x.url))&&/campus|university|main|aerial|verified/i.test(x.label||''));
 return image?{url:image.url,credit:image.source||'Institutional campus image'}:null;
};
const fallback=u=>'<div class="an-guide-identity"><div class="an-guide-symbol">🏛️</div><span class="an-guide-country">'+e(flag[u.country]||'🎓')+' '+e(u.country)+'</span><strong>'+e(u.name)+'</strong><small>University profile · official website linked</small></div>';
const imageMarkup=(u,p)=>{
 const photo=localPhoto(u,p);
 if(!photo)return fallback(u);
 return fallback(u)+'<img class="campus-cover an-guide-photo" src="'+e(photo.url)+'" alt="'+e(u.name)+' — university campus" loading="lazy" decoding="async" data-guide-image><span class="an-guide-credit">'+e(photo.credit)+'</span>';
};
const card=(u,p)=>{
 const rank=getRank(u),kind=u.kind||'University',official=validUrl(u.site);
 const discount=window.ANUniversityTools?.badge?.(u.id)||'';
 const ticket=u.country==='Malaysia'&&kind==='Private'?'<span class="an-guide-ticket" title="Ask A&N about eligibility and offer conditions">✈ Ticket offer enquiry</span>':'';
 const mark=rank?'<span class="an-guide-rank">QS 2027 #'+rank+'</span>':'';
 return '<article class="card uni-card an-guide-card"><div class="uni-cover-wrap">'+imageMarkup(u,p)+mark+discount+(u.country==='Malaysia'&&kind==='Private'&&!discount?'<span class="an-guide-scholarship-enquiry" title="Scholarship availability subject to university offer">🎓 Scholarship enquiry</span>':'')+ticket+'</div><div class="inside"><span class="badge">'+e(kind)+' · '+e(u.country)+'</span><h3>'+e(u.short||u.name)+'</h3><div class="university-fullname">'+e(u.name)+'</div><p class="university-location">⌖ '+e(u.city||u.country)+'</p><div class="an-guide-links"><a class="card-open" href="#/university/'+encodeURIComponent(u.id)+'">University Portfolio <span>↗</span></a>'+(official?'<a class="an-guide-official" href="'+e(official)+'" rel="noopener noreferrer" target="_blank" aria-label="Official university site for '+e(u.name)+'">Official site ↗</a>':'')+'</div></div></article>';
};
const link=(url,text,kind='')=>{const x=validUrl(url);return x?'<a class="an-guide-btn '+e(kind)+'" href="'+e(x)+'" target="_blank" rel="noopener noreferrer">'+e(text)+' ↗</a>':''};
const contactLink=u=>'<a class="an-guide-btn" href="#/contact">Contact A&N Overseas →</a>';
const row=(n,s)=>'<div class="an-guide-step"><b>'+e(n)+'</b><span>'+e(s)+'</span></div>';
const levels={
 Bachelor:[
 ['1','Choose the exact bachelor programme, language of instruction, campus and intake using the official degree catalogue.'],
 ['2','Check school-leaving qualification recognition, subject prerequisites and any foundation or entrance-test conditions.'],
 ['3','Prepare secondary certificates, transcripts, passport, translations and an English/language certificate where required.'],
 ['4','Submit through the correct national portal or the university application system and retain your application reference.'],
 ['5','Complete tests or interview if required, accept the offer and follow tuition deposit and student-visa instructions.']],
 Master:[
 ['1','Choose an accredited master programme and check if your bachelor subject and ECTS/credit background match.'],
 ['2','Review programme-specific GPA, language test, work experience, portfolio and entrance-test requirements.'],
 ['3','Prepare degree certificate, full transcript, CV, SOP/motivation letter, references and supporting translations.'],
 ['4','Apply using the official route; upload exactly the documents and formats requested by the institution.'],
 ['5','Monitor admission, scholarship decisions, deposits and residence/visa steps after an official offer.']],
 PhD:[
 ['1','Find an active doctoral programme, research group or funded position aligned with your research interest.'],
 ['2','Check whether a master degree, research proposal, prospective supervisor or formal vacancy application is required.'],
 ['3','Prepare academic CV, transcripts, proposal/research plan, writing sample and recommendations as requested.'],
 ['4','If the university requests supervisor contact, send a concise, tailored research-interest email with academic CV.'],
 ['5','Follow doctoral admissions interviews, funding contracts, supervision and residence documentation.']]
};
const docs={
 Bachelor:['School-leaving qualification and grades','Passport and verified academic transcripts','English/local language proof if requested','Subject-specific tests, portfolio or statement where applicable'],
 Master:['Recognised bachelor degree and transcripts','CV, motivation or SOP, and recommendations as required','Programme-specific English or local language proof','Relevant portfolio, work experience or entrance test where required'],
 PhD:['Master/qualifying degree if required','Research plan or vacancy-specific proposal','Academic CV, references and supervisor correspondence where requested','Writing sample/publications only if the programme specifically asks']
};
const note='<p class="an-guide-note">Requirements vary by programme, nationality and intake. IELTS, TOEFL, GPA and publication counts are <strong>not universal</strong>. Do not pay or submit credentials outside official institution or national portals.</p>';
const intro=(u)=>'<h2>'+e(u.name)+'</h2><p>📍 '+e(u.city||u.country)+', '+e(u.country)+' · '+e(u.kind||'University')+'. This profile separates practical application steps from verified institution-specific facts. Check the exact programme page before applying.</p>';
const degree=(u,level)=>{
 const p=typeof UNIVERSITY_PROFILES==='object'?UNIVERSITY_PROFILES[u.id]||{}:{};
 const rx={Bachelor:/\\b(bachelor|bsc|beng|ba\\s|bachelor\\x27s)\\b/i,Master:/\\b(master|msc|mba|ma\\s)\\b/i,PhD:/phd|doctor of philosophy|doctoral/i}[level];
 const actual=(p.programs||[]).filter(v=>rx?.test(v)).slice(0,30);
 const verified=actual.length?'<div class="an-guide-check"><h3>Named programmes in existing official-source profile</h3><ul>'+actual.map(v=>'<li>'+e(v)+'</li>').join('')+'</ul>'+link(level==='PhD'?p.pgSource||p.programSource:p.programSource||p.pgSource,'Official degree listing')+'</div>':'';
 return '<div class="an-guide-level"><h2>'+e(level)+' — Admission & Application</h2><p>Explore study fields at '+e(u.name)+': <b>'+e((u.programs||[]).slice(0,6).join(' · ')||'Official programme directory')+'</b>. Fields listed here are not all confirmed as individual available degree titles.</p>'+verified+'<div class="an-guide-check"><h3>Application steps</h3>'+levels[level].map(([n,t])=>row(n,t)).join('')+'</div><div class="an-guide-check"><h3>Documents to verify</h3><ul>'+docs[level].map(x=>'<li>'+e(x)+'</li>').join('')+'</ul></div>'+(level==='PhD'?'<p class="an-guide-note">Research publications: there is no fixed worldwide minimum number of papers. Follow the specific doctoral school or funded-position advertisement. Publish research only in legitimate peer-reviewed outlets, following supervisor and journal guidance.</p>':'')+note+routesPanel(u,level)+'</div>';
};
const routesPanel=(u,level)=>{
 const info=route(u),site=validUrl(u.site);let national='';
 if(info&&(!info.level||info.level===level))national=link(info.url,info.name,'alt');
 return '<section class="an-guide-check"><h3>Where to apply</h3><p>'+(info?e(info.note):'Use the admissions instructions on the institution’s official website. For this country, no common application portal is confirmed in this directory.')+'</p><div class="an-guide-actions">'+national+link(site,'Official university website')+contactLink(u)+'</div></section>';
};
const fees=u=>{
 const site=validUrl(u.site);
 const p=typeof UNIVERSITY_PROFILES==='object'?UNIVERSITY_PROFILES[u.id]||{}:{};
 const known=(p.fees||[]).map(x=>'<tr><td>'+e(x[0])+'</td><td>'+e(x[1])+'</td><td>'+e(x[2]||'')+'</td></tr>').join('');
 const officialFees=known?'<div class="an-guide-check"><h3>Published programme-specific fee examples</h3><table class="an-guide-fee-table"><thead><tr><th>Programme or charge</th><th>Published figure</th><th>What it covers</th></tr></thead><tbody>'+known+'</tbody></table>'+(p.feeNote?'<p>'+e(p.feeNote)+'</p>':'')+link(p.feeSource,'Source: official fee schedule')+'</div>':'';
 const finland=u.country==='Finland';
 return '<h2>Tuition Fees, English Tests & Intakes</h2>'+officialFees+'<div class="an-guide-fee-grid"><div><b>Bachelor</b><p>'+ (finland?'Finland national indication for English-taught Bachelors: approximately €9,000–€20,000 annually for non-EU/EEA students. Confirm the programme amount.':'Tuition is programme-specific. Consult the university’s current international fee schedule.')+'</p></div><div><b>Master</b><p>'+(finland?'Finland national indication for English-taught Masters: approximately €9,000–€20,000 annually for non-EU/EEA students. Confirm the programme amount.':'Tuition depends on degree, programme length and residency status. Confirm the institution’s fee schedule.')+'</p></div><div><b>PhD</b><p>'+(finland?'Finnish doctoral programmes do not charge tuition fees; living costs need funding.':'Check funded positions, research contracts and any doctoral tuition or registration charges.')+'</p></div></div><p class="an-guide-note">An IELTS score, English waiver, intake date, fee or scholarship is only authoritative if it appears on the exact programme’s official page. A country-wide estimate is not a quote from '+e(u.name)+'.</p>'+routesPanel(u,'Bachelor')+(finland?link('https://www.studyinfinland.fi/faq','Official Finland tuition guidance','alt'):'')+link(site,'University tuition & admissions website');
};
const gallery=(u,p)=>{
 const list=(p?.images||[]).filter(x=>x?.url&&(/^(assets\/|https:\/\/)/.test(x.url))).slice(0,12);
 const p0=localPhoto(u,p);if(p0&&!list.some(x=>x.url===p0.url))list.unshift({url:p0.url,label:u.name+' campus',source:p0.credit});
 if(!list.length)return '<h2>University Image Gallery</h2>'+fallback(u)+'<p class="an-guide-note">A verified campus photo has not been added. Please view the official university website for authentic campus photos.</p>'+link(u.site,'Official university media');
 return '<h2>University Photo Gallery</h2><div class="an-guide-gallery">'+list.map(x=>'<figure><img data-guide-image src="'+e(x.url)+'" alt="'+e(x.label||u.name+' university photo')+'" loading="lazy"><figcaption>'+e(x.label||u.name)+(x.source?' · Source: '+e(x.source):'')+'</figcaption></figure>').join('')+'</div>'+link(u.site,'Official university media');
};
const panel=(u,tab,p)=>{
 if(['Bachelor','Master','PhD'].includes(tab))return degree(u,tab);
 if(tab==='Fees & Intake')return fees(u);
 if(tab==='Gallery')return gallery(u,p);
 const history=p?.history?'<section class="an-guide-check"><h3>History & Campus</h3><p>'+e(p.history)+'</p>'+(p.campus?'<p>'+e(p.campus)+'</p>':'')+link(p.historySource,'Official university history','alt')+link(p.campusSource,'Campus source','alt')+'</section>':'';
 const requirements=p?.entry?'<section class="an-guide-check"><h3>Official-source entry information</h3><p>'+e(p.entry)+'</p>'+link(p.entrySource,'Detailed entry requirements','alt')+'</section>':'';
 const housing=p?.housing?'<section class="an-guide-check"><h3>Accommodation and campus life</h3><p>'+e(p.housing)+'</p>'+link(p.housingSource,'Housing information','alt')+'</section>':'';
 return intro(u)+history+requirements+housing+
 '<div class="an-guide-key"><strong>'+((getRank(u))?'QS World University Rankings 2027: #'+getRank(u):'World ranking not independently verified for this entry')+'</strong>'+(getRank(u)?link(qsSource,'Official QS 2027 ranking','alt'):'')+'</div>'+
 '<h3>Subject areas listed</h3><p>'+e((u.programs||[]).join(' · ')||'Choose programmes from the official degree directory')+'</p>'+
 '<h3>Three study levels</h3><div class="an-guide-level-links"><button type="button" data-tab="Bachelor">Bachelor Guide</button><button type="button" data-tab="Master">Master Guide</button><button type="button" data-tab="PhD">PhD Guide</button></div>'+
 note+routesPanel(u,'Bachelor');
};
const support=u=>'<section id="an-university-support" class="an-guide-support"><div class="an-guide-support-head"><img src="assets/brand-logo.jpg" alt="A&N Overseas logo"><div><small>APPLICATION SUPPORT · A&N OVERSEAS EDUCATION & CONSULTANCY</small><h2>Your Study Abroad Journey, Supported</h2></div></div><div class="an-guide-support-grid"><div><b>What we can help with</b><p>Initial programme shortlisting, eligibility guidance, academic document checklists, SOP and application preparation, scholarship search, student visa guidance, accommodation planning, airport pickup coordination, pre-departure and arrival support.</p></div><div><b>Transparent assistance</b><p>Ask about free initial consultation, available campaigns and eligible service inclusions. University fees, application charges, visa costs, tickets and scholarships are not automatically free or guaranteed.</p></div></div>'+(u.country==='Malaysia'&&u.kind==='Private'?'<p class="an-guide-ticket-note">✈️ Private University Ticket Promotion: enquire with A&N about current eligibility, written terms and availability before booking.</p>':'')+'<div class="an-guide-actions">'+link(u.site,'Official university website')+'<a class="an-guide-btn" href="#/apply/'+encodeURIComponent(u.id)+'">Apply Through A&N →</a>'+'<a class="an-guide-btn alt" href="mailto:educationanoverseas@gmail.com">Email A&N →</a>'+contactLink(u)+'</div></section>';
const mount=u=>{
 const page=document.querySelector('#university-panel')?.closest('.wrap.content');if(!page)return;
 let footer=document.getElementById('an-university-support');if(footer)footer.remove();
 const el=document.createElement('div');el.innerHTML=support(u);page.appendChild(el.firstElementChild);
};
document.addEventListener('error',event=>{
 const img=event.target;if(!(img instanceof HTMLImageElement)||!img.matches('[data-guide-image]'))return;
 img.hidden=true;img.style.display='none';const credit=img.parentElement?.querySelector('.an-guide-credit');if(credit)credit.style.display='none';
},true);
window.ANUniGuide={card,compare,getRank,panel,mount,route,photos};
})();