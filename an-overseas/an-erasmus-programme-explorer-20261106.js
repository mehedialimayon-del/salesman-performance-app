/* A&N Overseas | verified consortium explorer, first-party page integration 2026-11-06 */
(function () {
'use strict';
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const URL_EACEA='https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en';
const URL_iMESC='https://i-mesc.eu/the-master/consortium-and-universities';
const URL_EURO='https://www.euroculturemaster.eu/partners';
const URL_EDISS='https://www.master-ediss.eu/programme/';
const H=(name,country,city,url,role)=>({name,country,city,url,role:role||'Degree-awarding partner'});
const programmes=[
 {id:'imesc',name:'i-MESC · Materials for Energy Storage and Conversion',tag:'Materials · batteries & electrochemistry',duration:'24 months · 120 ECTS',fees:'EMJM award holders: €0 registration fee; self-funded: €4,000/year (€8,000 total)',funding:'Up to €1,400/month × 24 months when awarded',language:'IELTS 6.5 / TOEFL iBT 87 or an accepted MOI exemption (i-MESC only)',deadline:'9 Nov 2026 opening; 26 Jan 2027 closing — indicative Paris times',source:URL_iMESC,apply:'https://i-mesc.eu/application/student',hosts:[
 H('Université de Picardie Jules Verne','France','Amiens','https://www.u-picardie.fr/','Coordinating · awarding'),
 H('Warsaw University of Technology','Poland','Warsaw','https://www.pw.edu.pl/','Semester 1 · awarding'),
 H('Université Toulouse III – Paul Sabatier','France','Toulouse','https://www.univ-tlse3.fr/','Semester 2 · awarding'),
 H('University of Ljubljana','Slovenia','Ljubljana','https://www.uni-lj.si/','Semester 3 · awarding'),
 H('University of the Basque Country (UPV/EHU)','Spain','Bilbao','https://www.ehu.eus/','Semester 3 · awarding'),
 H('Drexel University','United States','Philadelphia','https://drexel.edu/','Associated · thesis mobility'),
 H('Deakin University','Australia','Melbourne','https://www.deakin.edu.au/','Associated · thesis mobility')
 ]},
 {id:'euroculture',name:'Euroculture · European Politics, Culture and Society',tag:'Social sciences · culture & politics',duration:'24 months · 120 ECTS',fees:'University/route-specific: confirm participation fees in the current call',funding:'Erasmus Mundus scholarships offered subject to programme selection',language:'Language evidence is programme-specific; confirm the current call',deadline:'2027–2029 EM scholarship: 15 January 2027',source:URL_EURO,apply:'https://www.euroculturemaster.eu/application-procedure',hosts:[
 H('University of Groningen','Netherlands','Groningen','https://www.rug.nl/','Coordinating · European partner'),
 H('University of Göttingen','Germany','Göttingen','https://www.uni-goettingen.de/','European partner'),
 H('University of Udine','Italy','Udine','https://www.uniud.it/','European partner'),
 H('University of Strasbourg','France','Strasbourg','https://www.unistra.fr/','European partner'),
 H('Palacký University Olomouc','Czech Republic','Olomouc','https://www.upol.cz/','European partner'),
 H('Jagiellonian University','Poland','Kraków','https://en.uj.edu.pl/','European partner'),
 H('Uppsala University','Sweden','Uppsala','https://www.uu.se/','European partner'),
 H('University of Hyderabad','India','Hyderabad','https://uohyd.ac.in/','Associated · specialised mobility'),
 H("Queen's University",'Canada','Kingston','https://www.queensu.ca/','Associated · specialised mobility'),
 H('The University of Osaka','Japan','Osaka','https://www.osaka-u.ac.jp/en','Associated · specialised mobility'),
 H('National Autonomous University of Mexico','Mexico','Mexico City','https://www.unam.mx/','Associated · specialised mobility')
 ]},
 {id:'ediss',name:'EDISS · Engineering of Data-intensive Intelligent Software Systems',tag:'Computer science · AI & software engineering',duration:'24 months · 120 ECTS',fees:'Confirm tuition/participation fee and scholarship funding for the chosen intake',funding:'Competitive Erasmus Mundus awards; availability varies by intake',language:'Official language requirements apply to this programme',deadline:'Check the current EDISS admissions window',source:URL_EDISS,apply:'https://www.master-ediss.eu/',hosts:[
 H('Åbo Akademi University','Finland','Turku','https://www.abo.fi/en/','Entry university · year 1'),
 H('University of the Balearic Islands','Spain','Palma','https://www.uib.eu/','Partner · mobility'),
 H("University of L'Aquila",'Italy',"L'Aquila",'https://www.univaq.it/','Partner · mobility'),
 H('Mälardalen University','Sweden','Västerås','https://www.mdu.se/en','Partner · mobility')
 ]}
];
/* First 40 live catalogue entries independently transcribed from the EACEA
   list on 2026-11-06. They are projects, NOT a guarantee of funded places. */
const official=[
 ['CNE','Chemical Nano-Engineering','https://master-cne.eu/'],
 ['NavigAIte EU','Navigating AI Business Transformation in the EU','https://erasmus-plus.ec.europa.eu/projects/search/details/101323042'],
 ['sosMER','Sustainable Ocean Services and Marine Environment','https://merconsortium.eu/'],
 ['MultiDiverse','Multilingualism and Cultural Diversity','https://www.multidiverse.eu/'],
 ['LAWGID','Law and Gender, Intersectionality and Diversity','https://lawgid.ius.bg.ac.rs/'],
 ['WOCC','Contemporary Challenges in the World of Work','https://www.master-wocc.eu/'],
 ['CLIDE','InterCultural Leadership in the Digital Era','https://clide.umk.pl/'],
 ['STEPS','Sustainable Transportation and Electric Power Systems','https://www.emjmdstepsrock.eu/'],
 ['EPS','European Politics and Society: Václav Havel','https://epsmaster.eu/'],
 ['ISSF','Insects as Solutions for a Sustainable Future','https://issf-master.eu/'],
 ['RESCO','Renewable Energy and Sustainable Construction','https://resco-master.eu/'],
 ['MAiSI','Sports Ethics and Integrity','https://www.maisi-project.eu/'],
 ['EMMA','Journalism, Media and Globalisation','https://mundusjournalism.com/'],
 ['TERRA','European Masters in Earthen Architecture and Construction','https://msc-terra.org/'],
 ['TFMASA','Transfers-Fluids-Materials Aeronautical Sustainable Applications','https://tfmasa.com/'],
 ['EDISS','Engineering of Data-intensive Intelligent Software Systems','https://www.master-ediss.eu/'],
 ['RADMEP','Radiation and its Effects on MicroElectronics and Photonics Technologies','https://master-radmep.org/'],
 ['BIOPHAM','Bio and Pharmaceutical Materials Science','https://www.master-biopham.eu/'],
 ['CYBERSURE','Cybersecurity and Assurance','https://www.cybersure-master.eu/'],
 ['DEAI','Data Engineering and Artificial Intelligence','https://deai.ulb.be/'],
 ['REM Plus Plus','Renewable Energy in the Marine Environment','https://master-remplus2.eu/'],
 ['SuCat','Sustainable Catalysis','https://www.master-sucat.eu/'],
 ['ILSP SD','International Law of Security, Peace and Sustainable Development','https://master-international-law-erasmusmundus.eu/'],
 ['MITRA','International Master in Transnational Migrations','https://www.master-mitra.eu/'],
 ['EESIC','Engineering for Environmental Sustainability and International Cooperation','https://eesic.eu/'],
 ['JANUS','Applied Security and Defense – Networks for Unified Strategies','https://master-janus-security-defense.eu/'],
 ['LASCALA','Large Scale Accelerators and Lasers','https://www.master-lascala.eu/'],
 ['NOHA','International Humanitarian Action','https://www.nohanet.org/'],
 ['TELME','Foreign Language Learning for Multicultural Inclusive Environments','https://telme.hypotheses.org/'],
 ['MULTICOM','Data Science of Human Multimodal Communication','https://multicom-em.eu/'],
 ['SPACEs','Theatre in Social, Participatory and Educational Contexts','https://www.theatre-spaces.eu/'],
 ['NucPhys','Joint European Master Degree in Nuclear Physics','https://www.emm-nucphys.eu/'],
 ['Bioceb','Biological and Chemical Engineering for a Sustainable Bioeconomy','https://www.bioceb.eu/'],
 ['DocNomadsPlus','Documentary Filmmaking','https://docnomadsplus.eu/'],
 ['Neurasmus','Neuroscience','https://www.neurasmus.u-bordeaux.fr/'],
 ['GEM','Geo-Information Science and Earth Observation','https://www.gem-msc.eu/'],
 ['InterMaths','Interdisciplinary Mathematics','https://www.intermaths.eu/'],
 ['IMSISS','Security, Intelligence and Strategic Studies','https://www.securityintelligence-erasmusmundus.eu/'],
 ['Choreomundus','Dance and Movement as Practical Knowledge and Heritage','https://choreomundus.org/'],
 ['EMCL-25','European Masters in Clinical Linguistics','https://www.emcl.eu/']
];
const uniqueHosts=Array.from(new Map(programmes.flatMap(p=>p.hosts.map(h=>[h.name.toLowerCase(),h]))).values());
function initials(n){return n.split(/\W+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();}
function hostImage(h){let host;try{host=new URL(h.url).hostname;}catch(e){host='';}
 return '<span class="an-em-logo"><span class="an-em-initials" aria-hidden="true">'+E(initials(h.name))+'</span><img loading="lazy" decoding="async" alt="'+E(h.name)+' official website icon" src="https://www.google.com/s2/favicons?domain='+encodeURIComponent(host)+'&sz=128"></span>';
}
function hostCard(h,i,p){
 return '<article class="an-em-university" data-an-uni-name="'+E(h.name)+'">'+hostImage(h)+
  '<div class="an-em-uni-copy"><span class="an-em-seq">'+String(i+1).padStart(2,'0')+' · '+E(h.country)+' · '+E(h.city)+'</span><h4>'+E(h.name)+'</h4><p>'+E(h.role)+'</p><div class="an-em-uni-actions"><a href="'+E(h.url)+'" rel="noopener noreferrer" target="_blank">University website ↗</a><a href="'+E(p.source)+'" rel="noopener noreferrer" target="_blank">Verify consortium ↗</a></div></div></article>';
}
function programme(p,i){
 return '<article class="an-em-programme" id="an-em-'+E(p.id)+'"><div class="an-em-programme-head"><span class="an-em-num">'+String(i+1).padStart(2,'0')+'</span><div><div class="an-em-kicker">'+E(p.tag)+'</div><h3>'+E(p.name)+'</h3></div></div>'+
 '<div class="an-em-keyfacts"><span><b>Duration</b>'+E(p.duration)+'</span><span><b>Scholarship</b>'+E(p.funding)+'</span><span><b>Fees</b>'+E(p.fees)+'</span><span><b>English / MOI</b>'+E(p.language)+'</span><span><b>Application window</b>'+E(p.deadline)+'</span><span><b>Universities</b>'+p.hosts.length+' named programme partners</span></div>'+
 '<h4 class="an-em-subheading">Participating university cards</h4><div class="an-em-university-grid">'+p.hosts.map((h,j)=>hostCard(h,j,p)).join('')+'</div>'+
 '<div class="an-em-actions"><a href="'+E(p.apply)+'" target="_blank" rel="noopener noreferrer">Official programme / apply ↗</a><a href="'+E(p.source)+'" target="_blank" rel="noopener noreferrer">Verified partner list ↗</a></div></article>';
}
function explorer(){
 return '<header class="an-em-head"><span class="an-em-eyebrow">PROGRAMME-BY-PROGRAMME · OFFICIAL SOURCES</span><h2><span>Universities</span> & <em>Eligible Programmes</em></h2>'+
 '<p>Choose a <strong>joint master programme first</strong>; only its stated consortium universities are participating hosts. The 215-project EACEA catalogue includes programmes that may NOT have a current funded scholarship.</p>'+
 '<div class="an-em-counters"><span><b>'+programmes.length+'</b> verified partner networks</span><span><b>'+uniqueHosts.length+'</b> named university records</span><span><b>40</b> recent official catalogue entries</span></div></header>'+
 '<div class="an-em-searchline"><label for="an-em-search">Search programme or university</label><input type="search" id="an-em-search" placeholder="e.g. battery, Erasmus, Sweden, EDISS" autocomplete="off"><span id="an-em-result-count" aria-live="polite"></span></div>'+
 '<div class="an-em-programme-stack">'+programmes.map(programme).join('')+'</div>'+
 '<section class="an-em-official"><div class="an-em-official-top"><div><span class="an-em-eyebrow">EU OFFICIAL CATALOGUE · NOT UNIVERSAL SCHOLARSHIP ELIGIBILITY</span><h3>Other published Erasmus Mundus joint masters</h3></div><strong>40 / 215</strong></div>'+
 '<p>The first 40 projects currently shown in the EACEA catalogue are listed on this page. Click an individual programme to verify its universities, intake, scholarship places, duration and fees. No unverified partner universities or tuition amounts are invented.</p>'+
 '<div class="an-em-official-grid">'+official.map((p,i)=>'<article class="an-em-official-card"><span>'+String(i+1).padStart(2,'0')+' · '+E(p[0])+'</span><h4>'+E(p[1])+'</h4><p>Universities, eligibility, current scholarship places and fees: verify with this consortium.</p><a href="'+E(p[2])+'" target="_blank" rel="noopener noreferrer">Programme details ↗</a></article>').join('')+'</div>'+
 '<a class="an-em-masterlink" href="'+URL_EACEA+'" target="_blank" rel="noopener noreferrer">Browse the full 215-project European Commission catalogue ↗</a></section>';
}
function attachDirectory(){
 if(typeof U==='undefined'||!Array.isArray(U))return;
 const current=new Set(U.map(u=>(u.name+'|'+u.country).toLowerCase()));
 for(const h of uniqueHosts){
  const exact=(h.name+'|'+h.country).toLowerCase();
  if(current.has(exact))continue;
  const same=U.some(u=>u.country===h.country&&u.name.toLowerCase()===h.name.toLowerCase());
  if(same)continue;
  const id='em-'+h.name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,58);
  if(U.some(u=>u.id===id))continue;
  const linked=programmes.filter(p=>p.hosts.some(a=>a.name===h.name));
  U.push({id,name:h.name,short:h.name,city:h.city,country:h.country,kind:'Public',programs:linked.map(p=>p.name),site:h.url,logoImage:'https://www.google.com/s2/favicons?domain='+encodeURIComponent(new URL(h.url).hostname)+'&sz=128',scholarshipProgrammes:linked.map(p=>p.id)});
  current.add(exact);
 }
 try{window.ANScholarships?.addKnownUniversities?.(U);}catch(err){}
}
function topTimer(id,label,date,closing){
 const end=Date.parse(date),ms=end-Date.now(),done=ms<=0;
 if(done)return '<div class="an-em-timer-unit"><small>'+E(label)+'</small><strong>'+E(closing?'Indicative deadline passed':'Opening time reached')+'</strong><span>Check official portal for the current status</span></div>';
 const days=Math.floor(ms/86400000),hours=Math.floor(ms/3600000)%24,mins=Math.floor(ms/60000)%60,secs=Math.floor(ms/1000)%60;
 return '<div class="an-em-timer-unit"><small>'+E(label)+'</small><div class="an-em-time-grid"><span><b>'+String(days)+'</b><i>DAYS</i></span><span><b>'+String(hours).padStart(2,'0')+'</b><i>HOURS</i></span><span><b>'+String(mins).padStart(2,'0')+'</b><i>MIN</i></span><span><b>'+String(secs).padStart(2,'0')+'</b><i>SEC</i></span></div></div>';
}
function attachCountdown(root,p){
 const lead=root.querySelector('.an-scholarship-lead');if(!lead)return;
 let el=root.querySelector('#an-em-top-countdown');
 if(p.id==='erasmus-mundus'){
  if(!el){el=document.createElement('section');el.id='an-em-top-countdown';el.className='an-em-top-countdown';lead.before(el);}
  const opened=Date.now()>=Date.parse('2026-11-09T13:00:00Z');
  el.innerHTML='<div class="an-em-countdown-heading"><span class="an-em-countdown-dot"></span><div><span>APPLICATION COUNTDOWN · i-MESC CLASS #23</span><h2>2027–2029 Erasmus Mundus joint master</h2><p>Dates published as <b>indicative</b> — other Erasmus programmes have different deadlines</p></div></div>'+
  '<div class="an-em-two-timers">'+topTimer('open','Indicative opening · 9 Nov 2026, 14:00 Paris','2026-11-09T13:00:00Z',false)+topTimer('close','Indicative closing · 26 Jan 2027, 12:00 Paris','2027-01-26T11:00:00Z',true)+'</div>'+
  '<div class="an-em-countdown-footer"><span>'+(opened?'Opening date reached · confirm that the portal is accepting submissions':'Expected next application opening')+'</span><a href="https://i-mesc.eu/application/admission-criteria" target="_blank" rel="noopener noreferrer">Verify current dates ↗</a></div>';
 }else{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(p.deadlineISO||''))return;
  if(!el){el=document.createElement('section');el.id='an-em-top-countdown';el.className='an-em-top-countdown';lead.before(el);}
  el.innerHTML='<div class="an-em-countdown-heading"><span class="an-em-countdown-dot"></span><div><span>SCHOLARSHIP APPLICATION DEADLINE</span><h2>'+E(p.name)+'</h2><p>Device-clock estimate · check exact closing time with the provider</p></div></div>'+
  topTimer('deadline','Published closing date · '+p.deadlineISO,p.deadlineISO+'T23:59:59',true);
 }
}
function updateCountdown(){const root=document.querySelector('#app .an-scholarship-detail');if(!root)return;const p=(window.ANScholarships?.items||[]).find(x=>x.id===(location.hash.split('?')[0].split('/')[2]));if(p)attachCountdown(root,p);}
function decorate(){
 const id=(location.hash||'').split('?')[0].split('/')[2];
 const root=document.querySelector('#app .an-scholarship-detail');
 if(!root)return;
 const p=(window.ANScholarships?.items||[]).find(x=>x.id===id);
 if(!p)return;
 attachCountdown(root,p);
 if(id!=='erasmus-mundus')return;
 const existing=root.querySelector('.an-scholarship-universities');
 if(!existing||existing.dataset.anEmExplorer==='1')return;
 existing.dataset.anEmExplorer='1';
 existing.innerHTML=explorer();
 // Avoid duplicated countdown buried deep inside the i-MESC explanatory card.
 for(const article of root.querySelectorAll('.an-specific-guide article')){
  if((article.querySelector('h3')?.textContent||'').includes('Application timeline'))article.remove();
 }
}
let queued=false;
function schedule(){
 if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate();});
}
function start(){
 attachDirectory();
 const app=document.querySelector('#app');if(!app)return;
 new MutationObserver(schedule).observe(app,{childList:true,subtree:false});
 window.addEventListener('hashchange',schedule);
 app.addEventListener('input',ev=>{
  if(ev.target.id!=='an-em-search')return;
  const q=ev.target.value.trim().toLowerCase();
  let shown=0;
  for(const el of app.querySelectorAll('.an-em-programme,.an-em-official-card')){
   const hit=!q||el.textContent.toLowerCase().includes(q);
   el.hidden=!hit;if(hit)shown++;
  }
  const msg=app.querySelector('#an-em-result-count');if(msg)msg.textContent=shown+' matching programme cards';
 });
 schedule();
 setInterval(()=>{if(document.querySelector('#an-em-top-countdown'))updateCountdown();},1000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();