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
['University of Southampton',111],['University of Liverpool',139],['University of Leeds',77],
['University of St Andrews',115],['Erasmus University Rotterdam',148],['Wageningen University and Research',154],
['Vrije Universiteit Amsterdam',185],['Universitaet Heidelberg',86],['Karlsruhe Institute of Technology',110],
['Complutense University of Madrid',199],['University of Reading',196],
['Universite Paris-Saclay',76],['University of Bern',191]
];
const ranks=new Map(ranked.map(([name,rank])=>[norm(name),rank]));
const idRank={upm:138,um:56,ukm:130,utm:158,usm:128,manchester:40,warwick:68,'eu-gb-university-college-london-ucl':8,'scholarship-host-vilniusuniversity':465,toronto:32,ubc:45,melbourne:22,monash:31,snu:38,tsinghua:14};
const countryRoute={
 'United Kingdom':{name:'UCAS undergraduate application',url:'https://www.ucas.com/international/international-students/applying-to-university-as-an-international-student',level:'Bachelor',note:'Undergraduate: use UCAS for most courses; postgraduate and research applications follow the university instructions.'},
 'Germany':{name:'DAAD / university or uni-assist',url:'https://www.daad.de/en/studying-in-germany/requirements/overview/',note:'Depending on the programme, apply to the institution or through uni-assist; confirm the route first.'},
 'Austria':{name:'Study in Austria · application rules',url:'https://studyinaustria.at/en/plan-your-studies/application-and-admission',note:'Apply directly to the university; confirm admission office, recognition and deadlines.'},
 'Sweden':{name:'UniversityAdmissions.se',url:'https://www.universityadmissions.se/en/apply-to-masters/',note:'National university admissions for many bachelor and master programmes; doctoral posts follow each university.'},
 'Finland':{name:'Studyinfo.fi admissions',url:'https://www.studyinfinland.fi/admissions',note:'Find the exact programme in Studyinfo.fi and check joint or separate application dates.'},
 'Netherlands':{name:'Study in NL / Studielink',url:'https://www.studyinnl.org/plan-your-stay/how-to-apply',note:'Studielink is used for many programmes, but some institutions have additional or different steps.'},
 'Italy':{name:'Universitaly pre-enrolment information',url:'https://studyinitaly.esteri.it/static/ProcedureIscrizione',note:'Visa applicants may require university pre-admission and Universitaly pre-enrolment. PhD deadlines differ.'},
 'France':{name:'Campus France · Études en France',url:'https://www.campusfrance.org/fr/candidature-procedure-etudes-en-france',note:'Études en France applies to residents in designated countries, including Bangladesh and Malaysia. Other routes depend on residence and degree.'},
 'Denmark':{name:'Study in Denmark · how to apply',url:'https://studyindenmark.dk/study-options/how-to-apply',note:'Most undergraduate programmes apply through Optagelse.dk. Masters applications typically go directly to each university.'},
 'Belgium':{name:'Study in Flanders · how to apply',url:'https://www.studyinflanders.be/practical-information/how-to-apply',note:'Flemish institutions use their own online admission systems; Belgium has different regional arrangements.'},
 'Czech Republic':{name:'Study in Czechia · application steps',url:'https://www.studyin.cz/',note:'Choose the degree and apply using the receiving university’s application form and admission instructions.'},
 'Luxembourg':{name:'Luxembourg higher education information',url:'https://guichet.public.lu/en/citoyens/life-event/famille-education/etudes-universitaires-resident.html',note:'Check approved institutions and individual admissions. Residence and visa procedures have separate government steps.'},
 'Norway':{name:'Study in Norway · programme search',url:'https://studyinnorway.no/study-opportunities',note:'Find the chosen degree, then use the institution-specific application instructions. Language and proof-of-funds requirements vary.'},
 'Switzerland':{name:'Swissuniversities · admission by qualification',url:'https://www.swissuniversities.ch/en/topics/studying/admission-to-universities/countries-1',note:'Qualification recognition varies by origin and Swiss university. Apply using the selected institution’s admissions route.'},
 'Poland':{name:'Study in Poland · international student guide',url:'https://www.gov.studyinpoland.pl/en/how-to-apply/125-guide-for-international-students',note:'Polish universities decide admissions independently. Check qualification recognition through NAWA and apply directly with the institution.'},
 'Malaysia':{name:'MYCAS international application instructions',url:'https://mycas.educationmalaysia.gov.my/how-to-apply.html',note:'MYCAS is available for participating Malaysian institutions. Some universities offer direct admission applications. Verify the specific programme and current route.'},
 'Australia':{name:'Study Australia · apply to study',url:'https://www.studyaustralia.gov.au/en/plan-your-studies/how-to-apply-to-study.html',note:'Find a CRICOS-listed course and apply directly with the university or its authorised application route. Visa applications are separate.'},
 'Canada':{name:'EduCanada · how to apply',url:'https://www.educanada.ca/study-plan-etudes/before-avant/apply-school_canada_demande-ecole.aspx?lang=eng',note:'Each Canadian institution sets its own admission process. Contact the university and verify study-permit requirements separately.'},
 'Japan':{name:'Study in Japan · university admissions',url:'https://www.studyinjapan.go.jp/en/planning/learn-about-schools/universities/',note:'University-specific application forms, EJU or interviews, qualification recognition and language tests may apply.'},
 'United States':{name:'EducationUSA · apply to university',url:'https://educationusa.state.gov/your-5-steps-us-study/complete-your-application',note:'U.S. university admission is institution-specific; follow each university’s undergraduate or graduate instructions.'}
};
const photos={
 'eu-gb-university-of-southampton':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/University%20of%20Southampton%2C%20Highfield%20Campus%20-%20geograph.org.uk%20-%208007299.jpg?width=960',credit:'David Martin · CC BY-SA 2.0 · Wikimedia Commons',source:'https://commons.wikimedia.org/wiki/File:University%20of%20Southampton%2C%20Highfield%20Campus%20-%20geograph.org.uk%20-%208007299.jpg'},
 'eu-gb-university-of-st-andrews':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/United%20College%20University%20of%20St%20Andrews.jpg?width=960',credit:'Oliverkeenan · CC BY 3.0 · Wikimedia Commons',source:'https://commons.wikimedia.org/wiki/File:United%20College%20University%20of%20St%20Andrews.jpg'},
 'eu-gb-university-of-liverpool':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Victoria%20Building%20UoL.jpg?width=960',credit:'Chris Howells · CC BY-SA 3.0 · Wikimedia Commons',source:'https://commons.wikimedia.org/wiki/File:Victoria%20Building%20UoL.jpg'},
 'eu-gb-university-of-reading':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/The%20University%20of%20Reading.jpg?width=960',credit:'Andrew Smith · CC BY-SA 2.0 · Wikimedia Commons',source:'https://commons.wikimedia.org/wiki/File:The%20University%20of%20Reading.jpg'},
 'eu-gb-abertay-university':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Abertay%20Kidd%20building.jpg?width=960',credit:'Ydam · CC BY-SA 3.0 · Wikimedia Commons',source:'https://commons.wikimedia.org/wiki/File:Abertay%20Kidd%20building.jpg'},
 'eu-gb-aberystwyth-university':{url:'https://commons.wikimedia.org/wiki/Special:FilePath/Aberystwyth%20University%20-%20Penglais%20Campus.jpg?width=960',credit:'PKwicipics · CC BY-SA 3.0 · Wikimedia Commons',source:'https://commons.wikimedia.org/wiki/File:Aberystwyth%20University%20-%20Penglais%20Campus.jpg'},
 'eu-at-university-of-vienna':{url:'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Universit%C3%A4t_Wien_Hauptgeb%C3%A4ude_%28Ian_Ehm%29_16.jpg/1280px-Universit%C3%A4t_Wien_Hauptgeb%C3%A4ude_%28Ian_Ehm%29_16.jpg',credit:'© Ian Ehm · CC BY 4.0 · Wikimedia Commons',source:'https://commons.wikimedia.org/wiki/File:Universit%C3%A4t_Wien_Hauptgeb%C3%A4ude_(Ian_Ehm)_16.jpg'},
};
const flag={Malaysia:'🇲🇾','United Kingdom':'🇬🇧',Germany:'🇩🇪',Austria:'🇦🇹',Belgium:'🇧🇪','Czech Republic':'🇨🇿',Denmark:'🇩🇰',Finland:'🇫🇮',France:'🇫🇷',Greece:'🇬🇷',Hungary:'🇭🇺',Ireland:'🇮🇪',Italy:'🇮🇹',Luxembourg:'🇱🇺',Netherlands:'🇳🇱',Norway:'🇳🇴',Poland:'🇵🇱',Portugal:'🇵🇹',Spain:'🇪🇸',Sweden:'🇸🇪',Switzerland:'🇨🇭',Canada:'🇨🇦',Australia:'🇦🇺',China:'🇨🇳',Japan:'🇯🇵','South Korea':'🇰🇷','United States':'🇺🇸','United Arab Emirates':'🇦🇪',Turkey:'🇹🇷',Singapore:'🇸🇬',Thailand:'🇹🇭','New Zealand':'🇳🇿'};
const getRank=u=>Number.isInteger(Number(u.qs2027))?Number(u.qs2027):idRank[u.id]||ranks.get(norm(u.name))||null;
const compare=(a,b)=>(getRank(a)??999999)-(getRank(b)??999999)||a.name.localeCompare(b.name);
const route=u=>countryRoute[u.country]||null;
const localPhoto=(u,p)=>{
 const custom=photos[u.id];if(custom)return custom;
 const override=validUrl(u.cardPhoto);if(override)return{url:override,credit:u.cardCredit||'University-specific image — verify source',source:validUrl(u.cardSource)||''};
 const image=p?.images?.find(x=>x?.url&&(/^(assets\/|https:\/\/)/.test(x.url))&&/campus|university|main|aerial|verified/i.test(x.label||''));
 return image?{url:image.url,credit:image.source||'Institutional campus image'}:null;
};
const fallback=u=>'<div class="an-guide-identity"><div class="an-guide-symbol">🏛️</div><span class="an-guide-country">'+e(flag[u.country]||'🎓')+' '+e(u.country)+'</span><strong>'+e(u.name)+'</strong><small>University profile · official website linked</small></div>';
const imageMarkup=(u,p)=>{
 const photo=localPhoto(u,p);
 if(!photo)return fallback(u);
 return fallback(u)+'<img class="campus-cover an-guide-photo" src="'+e(photo.url)+'" alt="'+e(u.name)+' — university campus" loading="lazy" decoding="async" data-guide-image>'+(photo.source?'<a class="an-guide-credit" href="'+e(photo.source)+'" target="_blank" rel="noopener noreferrer">'+e(photo.credit)+' ↗</a>':'<span class="an-guide-credit">'+e(photo.credit)+'</span>');
};
const amuAdmissions='https://amu.edu.my/international-students-admissions/';
const amuProgrammes='https://amu.edu.my/undergraduate-programmes/';
const amuFees='https://amu.edu.my/fees-and-fundings/fees-for-international-students/';
const utmAdmissions='https://admission.utm.my/undergraduate-international/';
const utmCourses='https://admission.utm.my/offered-allcourses-international/';
const utmFees='https://admission.utm.my/programme-fees-ug-international/';
const amcCourses='https://amc.edu.my/programmes/';
const amcCalendar='https://amc.edu.my/wp-content/uploads/2026/02/Master-Academic-Calendar-2026-2027-Degree-Updated.pdf';
const amcRegister='https://www.mqa.gov.my/mqr/english/eakrKPList.cfm?IDAkrIPTS=447';
const amcMbaFees='https://amc.edu.my/wp-content/uploads/2025/08/MBA-Prospectus-2.pdf';
const amcDbaFees='https://amc.edu.my/wp-content/uploads/2026/01/DBA-Prospectus.pdf';
const amcMaccFees='https://amc.edu.my/wp-content/uploads/2025/10/MAcc-Prospectus-edition-4.pdf';
const manchesterCourse='https://www.manchester.ac.uk/study/undergraduate/courses/2027/00560/bsc-computer-science/application-and-selection/';
const manchesterAdmissions='https://www.manchester.ac.uk/study/undergraduate/applying/how-to-apply/';
const uniklEngineering='https://www.unikl.edu.my/programme/bachelor-of-electrical-engineering-with-honours/';
const klustCalendar='https://klust.edu.my/current-students/academic-calendar/';
const verifiedCardFacts={
 'scholarship-host-vilniusuniversity':{
  tuition:['EUR 3,250','Politics of Global Challenges BA · annual tuition','https://www.vu.lt/en/studies/bachelor-studies/politics-of-global-challenges'],
  intake:['Autumn 2027','Bachelor’s admission · non-EU/EFTA · 1 May 2027','https://www.vu.lt/en/admissions/admissions-to-bachelor-studies','2027-05-01']
 },
 'eu-gb-university-college-london-ucl':{
  tuition:['GBP 48,600','Computer Science BSc · international annual tuition · 2027/28','https://www.ucl.ac.uk/study/prospective-students/undergraduate/courses/computer-science-bsc'],
  intake:['September 2027','Computer Science BSc · UCAS equal consideration 13 Jan, 18:00 GMT','https://www.ucl.ac.uk/study/prospective-students/undergraduate/courses/computer-science-bsc','2027-01-13T18:00:00Z']
 },
 warwick:{
  tuition:['GBP 37,310','Computer Science BSc · overseas annual tuition · 2027/28','https://warwick.ac.uk/services/finance/studentfinance/fees/overseasfees/'],
  intake:['27 September 2027','Computer Science BSc · UCAS equal consideration 13 Jan, 18:00 GMT','https://www.ucas.com/explore/courses/96187c1d-ee68-4b33-3c0e-b040a93861f8/computer-science?studyYear=2027','2027-01-13T18:00:00Z']
 },
 'eu-gb-university-of-bristol':{
  tuition:['GBP 34,700','Computer Science BSc · international first year · 2027/28','https://www.bristol.ac.uk/study/undergraduate/2027/computer-science/bsc-computer-science/'],
  intake:['September 2027','Computer Science BSc · UCAS equal consideration 13 Jan, 18:00 GMT','https://www.ucas.com/explore/courses/7b138283-6c18-ccaf-8161-614238289b2a/course?studyYear=2027','2027-01-13T18:00:00Z']
 },
 'eu-gb-university-of-edinburgh':{
  intake:['2027 entry','Computer Science BEng · UCAS deadline 13 Jan, 18:00 GMT','https://study.ed.ac.uk/programmes/undergraduate/58-computer-science','2027-01-13T18:00:00Z']
 },
 'eu-gb-university-of-southampton':{
  intake:['20 September 2027','Computer Science BSc · UCAS equal consideration 13 Jan, 18:00 GMT','https://www.ucas.com/explore/courses/9a3f103c-66ca-22ed-5c80-20f5736622ef/course?studyYear=2027','2027-01-13T18:00:00Z']
 },
 'an-h-dir-unitedkingdom-rhulacuk':{
  intake:['20 September 2027','Computer Science BSc · UCAS equal consideration 13 Jan, 18:00 GMT','https://www.ucas.com/explore/courses/af54dadf-118f-d112-33b2-871327d04c9a/computer-science?studyYear=2027','2027-01-13T18:00:00Z']
 },
 aimst:{
  ranking:['#78','QS South Eastern Asia 2027','https://www.topuniversities.com/universities/aimst-university'],
  intake:['7 December 2026','Master of Physiotherapy (Musculoskeletal)','https://aimst.edu.my/admission/']
 },
 manchester:{
  ranking:['#=40','QS World University Rankings','https://www.topuniversities.com/universities/university-manchester'],
  programmes:['BSc Computer Science','Undergraduate example',manchesterCourse],
  tuition:['GBP 39,700','International · 2027/28 year',manchesterCourse],
  intake:['September 2027','13 Jan 2027 · 18:00 GMT',manchesterAdmissions,'2027-01-13T18:00:00Z']
 },
 unikl:{
  ranking:['#1401+','QS World University Rankings','https://www.topuniversities.com/universities/universiti-kuala-lumpur-unikl'],
  programmes:['Electrical Engineering','Four-year bachelor example',uniklEngineering],
  tuition:['RM 83,200','Full international degree tuition',uniklEngineering],
  intake:['January · September','Electrical Engineering',uniklEngineering]
 },
 klust:{intake:['9 December 2026','New student registration',klustCalendar]},
 utm:{
  ranking:['#158','QS World · Asia #25 (2027)','https://civil.utm.my/utm-rises-to-the-top-25-in-qs-world-university-rankings-asia-2027/'],
  programmes:['44','International bachelor listings',utmCourses],
  tuition:['RM 75,000','Full Engineering degree',utmFees],
  intake:['February 2027','Feb intake · 31 Dec 2026',utmAdmissions,'2026-12-31']
 },
 amc:{
  programmes:['27','Academic catalogue listings',amcCourses],
  tuition:['RM 24,000','Full international MBA · before SST',amcMbaFees],
  intake:['25 January 2027','Degree semester start',amcCalendar]
 },
 amu:{
  programmes:['10','Undergraduate catalogue entries',amuProgrammes],
  tuition:['RM 48,500','Full international BBA tuition',amuFees],
  intake:['Jan · Feb · Jun · Jul · Sep','BBA · published intake months',amuProgrammes]
 },
 mediu:{
  programmes:['Bachelor · Master · PhD','Official programme search','https://www.mediu.edu.my/search-programs/'],
  tuition:['RM 28,451.80','Full online Islamic Studies degree','https://fedu.mediu.edu.my/wp-content/uploads/sites/14/2020/09/bachelor-OF-EDUCATION_islamic-studies.pdf'],
  intake:['November 2026','Published intake announcement','https://www.mediu.edu.my/admission-for-november-2026-intake-is-now-open/']
 },
 um:{
  ranking:['#56','Asia =17 · SE Asia 3 · MY 1','https://www.um.edu.my/news/universiti-malaya-retains-asia-rsquo-s-top-20-spot-wins-global-engagement-champions-award'],
  programmes:['80','Bachelor’s · 2026/27','https://study.um.edu.my/programmes'],
  tuition:['RM 98,097','Full degree average · 2025/26','https://study.um.edu.my/doc/tution-fee/Fee%20Structure%2C%20UG%2C%20International%20-%20Updated%2022%20Oct%202025.pdf'],
  intake:['Mar 2027','Mar intake · 30 Jan 2027','https://study.um.edu.my/how-to-apply','2027-01-30']
 },
 usm:{
  ranking:['#=128','Asia 27 · MY 5 (Asia table)','https://news.usm.my/english-news/usm-rises-seven-places-to-27th-in-qs-asia-university-rankings-2027'],
  programmes:['60+','International bachelor’s','https://admission.usm.my/index.php/main/undergraduate/international'],
  tuition:['USD 16,000','Full Management degree','https://admission.usm.my/undergraduate/undergraduate-international?id=769&view=article'],
  intake:['March intake','15 Jan · 2025/26 schedule','https://admission.usm.my/images/00uginternational/download_2025/BOOKLET_INTERNATIONAL_2025-2026.pdf']
 },
 ukm:{
  ranking:['#130','Asia =20 · MY 2 (Asia table)','https://www.prnewswire.co.uk/news-releases/qs-asia-rankings-2027-302924353.html'],
  programmes:['12 faculties','UKMi bachelor’s catalogue','https://www.ukm.my/studyukm/ukmi/'],
  tuition:['RM 19,050','BBA year 1 tuition · 2024/25','https://shape.ukm.my/storage/lampiran/struktur_yuran/FEP/pra/strukturyuran_FEP_UKMi_pra_F_int_120242025.pdf'],
  intake:['March / October','UKMi bachelor’s intakes','https://www.ukm.my/studyukm/ukmi/']
 },
 upm:{
  ranking:['#138','Asia 24 · MY 3 (Asia table)','https://www.thestar.com.my/news/nation/2026/11/03/eleven-malaysian-varsities-ranked-among-top-100-in-asia'],
  programmes:['74 codes','Intl. UG fee schedule','https://bursar.upm.edu.my/upload/dokumen/20260406115752Tuition_Fees_International_%281%29.pdf'],
  tuition:['RM 96,000','Full Agricultural Science degree','https://bursar.upm.edu.my/upload/dokumen/20260406115752Tuition_Fees_International_%281%29.pdf'],
  intake:['March intake','31 Dec · published cycle','https://akademik.upm.edu.my/upload/dokumen/menul320250417184027Undergraduate_Programmes_Brochure_for_International_Students.pdf']
 }
};
const malaysiaFactIds={
 aimstuniversity:'aimst',
 universitimalaya:'um',
 universititeknologimalaysia:'utm',
 amcuniversitycollege:'amc',
 universitisainsmalaysia:'usm',
 universitikebangsaanmalaysia:'ukm',
 universitiputramalaysia:'upm'
};
const factKey=u=>{
 const name=norm(String(u.name||'').replace(/\s*\([^)]*\)\s*$/,''));
 if(u.country==='Malaysia'&&name.startsWith('asiametropolitanuniversity'))return 'amu';
 if(u.country==='Malaysia'&&name.startsWith('almadinahinternationaluniversity'))return 'mediu';
 return verifiedCardFacts[u.id]?u.id:malaysiaFactIds[name];
};
const countdownText=(date,now=Date.now())=>{
 if(date.length===10){
  const today=new Date(now);
  const days=(Date.parse(date)-Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))/86400000;
  return days<0?'Deadline passed':days===0?'Closes today':days+'d left';
 }
 const minutes=Math.ceil((Date.parse(date)-now)/60000);
 return minutes<1?'Deadline passed':Math.floor(minutes/1440)+'d '+Math.floor(minutes%1440/60)+'h '+minutes%60+'m left';
};
const countdown=date=>'<span data-an-deadline="'+e(date)+'">'+e(countdownText(date))+'</span>';
setInterval(()=>{
 document.querySelectorAll('[data-an-deadline]').forEach(el=>{
  const value=countdownText(el.dataset.anDeadline);
  if(el.textContent!==value)el.textContent=value;
 });
},1000);
const factNotes={
 manchester:{fees:'The international BSc Computer Science tuition is GBP 39,700 for the 2027/28 academic year. Manchester states that subsequent academic-year fees may rise by up to 7% per year.',entry:'For September 2027 entry, the UCAS equal-consideration deadline for most courses is 13 January 2027 at 18:00 GMT, or 14 January at 02:00 Malaysia time. Medicine and Dentistry have a separate 15 October 2026 deadline. Later applications depend on vacancies.'},
 unikl:{fees:'The Bachelor of Electrical Engineering with Honours costs RM 10,400 per semester or RM 83,200 for the full four-year degree for international students. Published tuition excludes visa processing and is subject to SST.',entry:'The Electrical Engineering programme lists January and September intakes. The programme page does not give an exact application cutoff.'},
 klust:{entry:'The December–April 2026/27 calendar lists new student registration on 9 December 2026 and first lectures on 14 December. KLUST’s general international admission guidance asks applicants to submit two months before the semester. A specific cohort application cutoff was not published on the calendar.'},
 utm:{fees:'The Engineering example is RM 75,000 for the full degree: RM 14,758 for semester 1 and RM 60,242 combined for semesters 2–8. Accommodation is separate.',programmes:'UTM lists 44 international bachelor programmes across its catalogue. Its February table shows Civil Engineering and three Malaysia–Japan International Institute of Technology programmes open: Electronic Systems Engineering, Mechanical Precision Engineering and Chemical Process Engineering.',entry:'International bachelor applications for February 2027 run from 1 November to 31 December 2026. The countdown uses the end of the published deadline day in Malaysia time.',ranking:'UTM is #158 globally and #25 in Asia in the QS 2027 editions. The 2026 QS subject results put UTM first in Malaysia for Civil & Structural Engineering, Chemical Engineering, Mineral & Mining Engineering, and Architecture / Built Environment.'},
 amc:{fees:'AMC’s international MBA example is RM 24,000 tuition before RM 1,440 SST. Add RM 1,500 registration, RM 4,500 assessment and RM 1,000 facilities for the published RM 32,440 total.',programmes:'The catalogue lists 1 foundation, 12 diplomas, 8 bachelor’s, 4 master’s and 2 doctoral programmes.',entry:'The degree calendar shows teaching week 1 beginning 25 January 2027. This is a semester start date. Business Management lists January, June and September as intake months. An application cutoff was not verified.'},
 um:{fees:'RM 98,097 is the rounded arithmetic mean of 74 full-degree tuition amounts in UM’s 2025/26 international bachelor fee schedule. Higher-priced clinical degrees, including medicine and dentistry, raise the average. Check your programme’s fee and any separately stated taxes and charges.',programmes:'UM lists 80 bachelor’s programmes for 2026/27. The number covers the academic session across the university. March availability varies by programme.',entry:'The March 2027 international undergraduate application deadline is 30 January 2027. UM publishes a calendar date. The site countdown uses the end of that day in Malaysia time.'},
 usm:{fees:'USD 16,000 is the full international tuition published for the Bachelor of Management with Honours. USM lists USD 2,285.71 per semester and separate recurring charges.'},
 ukm:{fees:'RM 19,050 is first-year international BBA tuition in the 2024/25 UKMi schedule, calculated as RM 10,650 + RM 8,400. The schedule lists the RM 2,520 registration charge separately.'},
 upm:{fees:'RM 96,000 is the published full-degree international tuition example for Agricultural Science with Honours, calculated as eight semesters × RM 12,000.'},
 amu:{fees:'AMU lists RM 48,500 in full BBA tuition. Registration (RM 2,000), processing (RM 1,500) and visa application (RM 2,800) bring the published total to RM 54,800.',programmes:'The official undergraduate catalogue lists 2 foundation programmes, 4 diplomas and 4 bachelor’s programmes.',entry:'AMU lists January, February, June, July and September for the BBA. Its international admissions page advises sending documents three months before intake. Ask AMU to confirm the exact cutoff for your cohort.'},
 mediu:{fees:'RM 28,451.80 is the published tuition for the full-time online Bachelor of Islamic Studies example in the faculty brochure. Campus-based programmes and other study modes have separate fees.',entry:'MEDIU announced its November 2026 intake for bachelor’s, master’s and doctoral programmes. Its admissions guidance advises applying at least six weeks before the new semester.'}
};
const ipedsSource='https://nces.ed.gov/ipeds/datacenter/data/IC2023_AY.zip';
const ipedsEntry=u=>u.country==='United States'&&Object.hasOwn(window.ANIPEDS2023||{},u.id)?window.ANIPEDS2023[u.id]:null;
const usd=value=>'USD '+value.toLocaleString('en-US');
const recentTuition={
 "an-global-upenn-edu": [
  "USD 65,670",
  "2026/27 annual undergraduate",
  "https://srfs.upenn.edu/costs-budgeting/undergraduate-cost-attendance"
 ],
 "an-global-cornell-edu": [
  "USD 73,946",
  "2026/27 annual undergraduate, endowed Ithaca or contract nonresident",
  "https://courses.cornell.edu/general-information/tuition/"
 ],
 "an-global-usc-edu": [
  "USD 75,384",
  "2026/27 two semesters, 12–18 units each",
  "https://financialaid.usc.edu/undergraduate-financial-aid/cost-of-attendance/"
 ],
 "an-h-dir-unitedstates-wwwriceedu": [
  "USD 71,140",
  "2026/27 annual undergraduate, entered 2024 or later",
  "https://financialaid.rice.edu/cost-attendance"
 ]
};
const publishedTuition=u=>Object.hasOwn(recentTuition,u.id)?recentTuition[u.id]:verifiedCardFacts[factKey(u)]?.tuition;
const ipedsPanel=(u,section)=>{
 const record=ipedsEntry(u);
 if(!record||!['fees','ranking'].includes(section))return '';
 const [unitId,tuition,fees]=record;
 const source=link('https://nces.ed.gov/collegenavigator/?id='+unitId,'NCES College Navigator');
 if(section==='ranking')return '<div class="an-profile-fact"><h3>U.S. federal directory</h3><p>IPEDS institution ID: '+e(unitId)+'</p>'+source+'</div>';
 if(tuition===null)return '';
 return '<div class="an-profile-fact"><h3>2023/24 published out-of-state tuition</h3><p><strong>'+e(usd(tuition))+'</strong> for the full academic year, for first-time, full-time undergraduates.'+
 (fees===null?'':' Separately reported required fees: '+e(usd(fees))+'.')+
 ' Historical NCES data. Current tuition and international-student charges may differ.</p>'+source+link(ipedsSource,'Source: IPEDS 2023/24 data')+'</div>';
};
const leidenRank=u=>Object.hasOwn(window.ANLeiden2026||{},u.id)?window.ANLeiden2026[u.id]:null;
const leidenLink=entry=>'https://open.leidenranking.com/ranking/2026/university/'+entry[2];
const leidenPanel=u=>{
 const record=leidenRank(u);
 if(!record)return '';
 return '<div class="an-profile-fact"><h3>Leiden Open 2026 · Research output</h3><p>World position <strong>#'+e(record[0])+'</strong> by publication count (P), all sciences. '+
 e(record[1].toLocaleString('en-US'))+' core publications, 2021–2024, full counting. The displayed ranking uses a minimum of 100 publications.</p>'+
 link(leidenLink(record),'CWTS university profile')+link('https://open.leidenranking.com/resources','Open edition data')+'</div>';
};
// THE World University Rankings 2027 table. Unique country/name matches only.
const theRankAdditions={
 'eu-de-university-of-kiel':['t','401–450','university-kiel'],
 'an-h-dir-turkey-wwwmuedutr':['t','2001+','mugla-sitki-kocman-university'],
 'an-h-dir-turkey-wwwbamdirmaedutr':['t','1601–1800','bandirma-onyedi-eylul-university']
};
const additionalRankProviders={
 n:['uniRank 2026','National · web popularity',country=>'https://www.unirank.org/'+country+'/ranking/'],
 t:['THE World 2027','World ranking',ref=>'https://www.timeshighereducation.com/world-university-rankings/'+ref],
 q:['QS World 2027','World ranking',ref=>'https://www.topuniversities.com/universities/'+ref],
 a:['QS 2027','South-Eastern Asia',ref=>'https://www.topuniversities.com/universities/'+ref],
 b:['QS Asia 2026','Asia ranking',ref=>'https://www.topuniversities.com/universities/'+ref],
 c:['CWUR 2026','World · Global 2000',ref=>'https://www.cwur.org/2026/'+ref+'.php'],
 s:['SCImago 2026','World · universities',()=> 'https://www.scimagoir.com/rankings.php?sector=Higher+educ&year=2026'],
 e:['EduRank 2026','World · overall',ref=>'https://edurank.org/uni/'+ref+'/rankings/'],
 w:['Webometrics · Jul 2026','World · web and research indicators',ref=>'https://www.webometrics.org/'+ref],
 h:['WalletHub 2026','US · community colleges',()=> 'https://wallethub.com/edu/e/best-worst-community-colleges/15076'],
 u:['uniRank 2026','National · web popularity',ref=>'https://www.unirank.org/'+ref+'/ranking/']
};
const additionalRank=u=>{
 const ranks=window.ANAdditionalRanks2026||{};
 const supplemental=window.ANRankSupplement2026||{};
 const candidate=Object.hasOwn(supplemental,u.id)?supplemental[u.id]:null;
 const record=Object.hasOwn(ranks,u.id)?ranks[u.id]:Object.hasOwn(theRankAdditions,u.id)?theRankAdditions[u.id]:candidate?.[3]===u.name?candidate:null;
 if(!record)return null;
 const [key,position,ref,sourceName]=record;
 const [name,scope,source]=additionalRankProviders[key];
 return {name,scope,position,sourceName,url:source(ref)};
};
const additionalRankPanel=u=>{
 const rank=additionalRank(u);
 if(!rank)return '';
 return '<div class="an-profile-fact"><h3>'+e(rank.name)+'</h3><p><strong>#'+e(rank.position)+'</strong> · '+e(rank.scope)+'</p>'+
  (rank.sourceName?'<p>Listed as '+e(rank.sourceName)+'</p>':'')+link(rank.url,'Published ranking')+'</div>';
};
const commonAppSource='https://content.commonapp.org/Files/ReqGrid.pdf';
const commonAppPlans=['Early Decision','Early Decision II','Early Action','Early Action II','Restrictive Early Action','Regular Decision'];
const commonAppDates=u=>u.country==='United States'&&Object.hasOwn(window.ANCommonApp2027||{},u.id)?window.ANCommonApp2027[u.id]:null;
const admissionDateFormat=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
const formatAdmissionDate=date=>admissionDateFormat.format(new Date(date));
const commonAppCard=u=>{
 const dates=commonAppDates(u);
 if(!dates)return null;
 const today=new Date().toISOString().slice(0,10);
 const regular=dates[5]>=today?5:-1;
 const next=dates.reduce((best,date,i)=>date>=today&&(best===-1||date<dates[best])?i:best,-1);
 const previous=dates.reduce((best,date,i)=>date&&(best===-1||date>dates[best])?i:best,-1);
 const selected=regular>=0?regular:next>=0?next:previous;
 return [formatAdmissionDate(dates[selected]),commonAppPlans[selected]+(next<0?' · past date':''),commonAppSource];
};
const commonAppPanel=u=>{
 const dates=commonAppDates(u);
 if(!dates)return '';
 const list=dates.map((date,i)=>date?'<li><strong>'+e(commonAppPlans[i])+'</strong> · '+e(formatAdmissionDate(date))+'</li>':'').join('');
 return '<div class="an-profile-fact"><h3>Common App first-year deadlines · 2026/27</h3><ul>'+list+'</ul><p>Published calendar dates for first-year applicants. Check the college’s requirements for your programme and applicant type.</p>'+link(commonAppSource,'Common App requirements grid')+'</div>';
};
const profileFact=(u,section)=>{
 const key=factKey(u),facts=verifiedCardFacts[key];
 const item=facts?.[{fees:'tuition',programmes:'programmes',entry:'intake',ranking:'ranking'}[section]];
 const supplemental=section==='ranking'?leidenPanel(u)+additionalRankPanel(u):section==='entry'?commonAppPanel(u):'';
 if(!item)return ipedsPanel(u,section)+supplemental;
 const label={fees:'Tuition basis',programmes:'Published programme scope',entry:'Published intake',ranking:'Regional ranking'}[section];
 const detail=factNotes[key]?.[section]||(section==='ranking'?item[1]:item[0]+' · '+item[1]);
 return '<div class="an-profile-fact"><h3>'+label+'</h3><p>'+e(detail)+(item[3]?' · '+countdown(item[3]):'')+'</p>'+link(item[2],'Published source')+(key==='amu'&&section==='entry'?link(amuAdmissions,'International admissions'):'')+'</div>'+supplemental;
};
const verifiedLogoFiles={aimstuniversity:'aimst',ucsiuniversity:'ucsi',amcuniversitycollege:'amc'};
const catalogueIcon=u=>{
 const icons=window.ANCatalogueWebsiteIcons||{};
 if(!Object.hasOwn(icons,u.id))return '';
 const host=icons[u.id];
 try{if(new URL(u.site).hostname.toLowerCase()!==host)return '';}catch{return '';}
 return 'https://www.google.com/s2/favicons?domain='+encodeURIComponent(host)+'&sz=64';
};
const isWebsiteIcon=(u,logo)=>Boolean(logo&&logo===catalogueIcon(u));
const institutionLogo=(u,p)=>{
 const file=factKey(u)==='amu'?'amu':verifiedLogoFiles[norm(String(u.name||'').replace(/\s*\([^)]*\)\s*$/,''))];
 return file?'assets/universities/'+file+'-official-logo.png':u.logoImage||p?.logo||catalogueIcon(u);
};
const tuitionRows=(u,p)=>{
 const rows=(p.fees||[]).filter(r=>/^(?:RM|MYR|USD|AUD|CAD|EUR|GBP|€|£|\$)\s*[\d,.]+/i.test(String(r?.[1]||'')));
 const known=publishedTuition(u);
 if(known){
  const existing=rows.findIndex(r=>r[1]===known[0]);
  if(existing<0)rows.unshift(['Published tuition',known[0],factNotes[factKey(u)]?.fees||known[1],known[2]]);
  else if(!rows[existing][3])rows[existing]=[...rows[existing].slice(0,3),known[2]];
 }
 const historical=ipedsEntry(u);
 if(!rows.length&&Number.isInteger(historical?.[1]))rows.push(['Undergraduate tuition',usd(historical[1]),'2023/24 annual out-of-state tuition · historical NCES figure',ipedsSource]);
 return rows;
};
const profileData=(u,p={})=>{
 const key=factKey(u);
 if(key==='amc')return {...p,founded:'1985',size:'Kota Kinabalu, Sabah',
  history:'AMC University College was established in 1985. The institution is privately owned by Advanced Business Systems Consultants Sdn Bhd and registered with Malaysia’s Ministry of Higher Education. It offers academic qualifications and professional ICT training.',
  historySource:'https://amc.edu.my/about-us/',
  campus:'AMC is at Lot 43–44, Likas Square Commercial Centre, Jalan Istiadat Likas, 88400 Kota Kinabalu, Sabah. Its facilities include a library, computer lab, training food-and-beverage space, student lounge and prayer room.',
  campusSource:'https://amc.edu.my/facilities/',
  housing:'AMC lists student accommodation with bedrooms, shared living space and kitchen facilities.',
  housingSource:'https://amc.edu.my/facilities/',
  programs:['Foundation in Arts','Diploma in Accounting','Diploma in Business Administration','Diploma in Digital Marketing','Diploma in Hotel Management','Diploma in Hotel Management (Work-Based Learning)','Diploma in Computer Science','Diploma in Information Technology','Diploma in Digital Creative Design','Diploma in Digital Media Content','Diploma in e-Governance','Diploma in Law Enforcement','Diploma in Policing and Investigation','Bachelor in Accounting (Honours)','Bachelor of Business Administration (Honours)','Bachelor in Business Management (Honours)','Bachelor in Digital Marketing (Honours)','Bachelor in Hospitality Management (Honours)','Bachelor in Computer Science (Honours)','Bachelor in Information Technology (Honours)','Bachelor in Corporate Governance (Honours)','Master in Business Administration','Master in Accounting','Master in Corporate Governance','Master in Information Technology','Doctor of Business Administration','Doctor of Philosophy'],
  programSource:amcCourses,pgSource:amcCourses,fees:[['MBA','RM 24,000','Full international tuition before SST; published total RM 32,440'],['Master in Accounting','RM 25,200','Full international tuition before SST; published total RM 34,087'],['Doctor of Business Administration','RM 47,200','Full-time international tuition before SST; published total RM 58,782']],
  feeSource:amcMbaFees,feeSources:[['Master in Accounting prospectus',amcMaccFees],['DBA prospectus',amcDbaFees]],feeNote:'Published examples cover the full programme. Totals include the charges shown in each prospectus. Undergraduate tuition remains unverified.',
  intake:'Degree teaching week 1 starts 25 January 2027 on the academic calendar.',intakeSource:amcCalendar,rankSource:amcRegister};
 if(key==='utm')return {...p,programSource:utmCourses,feeSource:utmFees,intakeSource:utmAdmissions,
  intake:'February 2027 applications for international bachelor’s study run 1 November–31 December 2026.'};
 return p;
};
const factIcons={
 rank:'<path d="M8 21h8M12 17v4M7 4h10v7a5 5 0 0 1-10 0zM7 6H3v2a4 4 0 0 0 4 4m10-6h4v2a4 4 0 0 1-4 4"/>',
 programmes:'<path d="M12 7v13M3 5h4a5 5 0 0 1 5 2 5 5 0 0 1 5-2h4v13h-4a5 5 0 0 0-5 2 5 5 0 0 0-5-2H3z"/>',
 tuition:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h1m10 0h1"/>',
 intake:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-14 5h2m3 0h2m3 0h2"/>'
};
const card=(u,p)=>{
 const rank=getRank(u),kind=u.kind||'University',official=validUrl(u.site),registry=validUrl(u.registrySource);
 const name=String(u.name||u.short||'University').trim(),words=name.split(/\s+/),cut=Math.max(1,Math.ceil(words.length/2));
 const mainName='<span class="an-premium-name-orange">'+e(words.slice(0,cut).join(' '))+'</span> <span class="an-premium-name-white">'+e(words.slice(cut).join(' '))+'</span>';
 const short=String(u.short||'').trim(),shortLabel=short&&norm(short)!==norm(name)&&!norm(name.match(/\(([^)]+)\)\s*$/)?.[1]).startsWith(norm(short))?' <span class="an-premium-short">('+e(short)+')</span>':'';
 const privateUni=/private/i.test(kind),typeText=privateUni?'PRIVATE UNIVERSITY':/public/i.test(kind)?'PUBLIC UNIVERSITY':(/university/i.test(kind)?String(kind).toUpperCase():String(kind).toUpperCase()+' UNIVERSITY');
 const discount=window.ANUniversityTools?.badge?.(u.id)||'';
 const mark=rank?'<span class="an-guide-rank">QS World 2027 #'+rank+'</span>':'';
 const key=factKey(u),verified=verifiedCardFacts[key];
 const programmeCount=Number(u.totalPrograms||p?.totalPrograms||p?.programmeCount);
 const programmeText=Number.isInteger(programmeCount)&&programmeCount>0?String(programmeCount):'';
 const fees=Array.isArray(p?.fees)?p.fees:[],annualFees=fees.filter(x=>/first.year|annual|per year|1.year/i.test(String(x?.[2]||'')+' '+String(x?.[0]||''))).map(x=>String(x?.[1]||''));const firstYear=annualFees.length?annualFees[0]:null;
 const historicalTuition=ipedsEntry(u)?.[1];
 const tuitionFact=publishedTuition(u);
 const historicalFact=!firstYear&&Number.isInteger(historicalTuition)?[usd(historicalTuition),'Out-of-state UG · 2023/24',ipedsSource]:null;
 const logo=institutionLogo(u,p);
 const logoMarkup=validUrl(logo)||/^assets\//.test(logo)?'<img class="an-premium-meta-logo'+(logo==='assets/universities/aimst-official-logo.png'?' an-premium-logo-on-dark':'')+'" src="'+e(logo)+'" alt="'+e(name)+(isWebsiteIcon(u,logo)?' website icon':' logo')+'" loading="lazy" onerror="this.remove()">':'';
 const country=u.country||u.city||'';
 const factHeading=label=>{const space=label.indexOf(' ');const cut=space>0?space:Math.ceil(label.length/2);return '<span>'+e(label.slice(0,cut))+'</span>'+e(label.slice(cut));};
 const fact=(icon,label,value,extra='',source='',date='')=>'<div class="an-premium-fact"><span class="an-premium-fact-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+factIcons[icon]+'</svg></span><strong>'+factHeading(label)+'</strong>'+(value?'<b>'+(source?'<a href="'+e(source)+'" rel="noopener noreferrer" target="_blank">'+(date?countdown(date):e(value))+'</a>':e(value))+'</b>':'')+(value&&extra?'<small>'+e(extra)+'</small>':'')+'</div>';
 const intake=verified?.intake,admissionDeadline=commonAppCard(u);
 const researchRank=leidenRank(u),publishedRank=additionalRank(u);
 let rankingFact;
 if(verified?.ranking){
  rankingFact=fact('rank','QS RANKINGS 2027',...verified.ranking);
 }else if(rank){
  rankingFact=fact('rank','WORLD RANKING','#'+rank,'QS World 2027',qsSource);
 }else if(researchRank){
  rankingFact=fact('rank','RESEARCH RANK','#'+researchRank[0],'Leiden Open 2026 · publications',leidenLink(researchRank));
 }else if(publishedRank){
  rankingFact=fact('rank','PUBLISHED RANK','#'+publishedRank.position,publishedRank.name+' · '+publishedRank.scope,publishedRank.url);
 }else if(key==='amc'){
  rankingFact=fact('rank','ACCREDITATION','MQA register','Programme records',amcRegister);
 }else{
  rankingFact=fact('rank','WORLD RANKING','Not verified');
 }
 const facts=rankingFact+fact('programmes','PROGRAMMES',...(verified?.programmes||[programmeText,programmeText?'Published count':'',validUrl(p?.programSource)||official]))
  +fact('tuition',tuitionFact&&key!=='um'?'TUITION EXAMPLE':'TUITION FEE',...(tuitionFact||historicalFact||[firstYear||'',firstYear?'Published fee example':'']))
  +(intake?fact('intake','UPCOMING INTAKE',intake[0],intake[1],intake[2],intake[3]):admissionDeadline?fact('intake','APPLICATION DEADLINE',...admissionDeadline):fact('intake','UPCOMING INTAKE',''));
 return '<article class="card uni-card an-guide-card an-premium-uni-card"><div class="uni-cover-wrap">'+imageMarkup(u,p)+mark+discount+'<div class="an-premium-hero-details"><h3 class="an-premium-university-title">'+mainName+shortLabel+'</h3><div class="an-premium-meta">'+logoMarkup+'<div class="an-premium-meta-text"><div class="an-premium-type '+(privateUni?'is-private':'is-public')+'">'+e(typeText)+'</div><p class="university-location an-premium-location">'+e(country)+'</p></div></div></div></div><div class="inside"><div class="an-premium-facts">'+facts+'</div><div class="an-guide-links"><a class="card-open" href="#/university/'+encodeURIComponent(u.id)+'">University Portfolio <span>↗</span></a>'+(official?'<a class="an-guide-official" href="'+e(official)+'" rel="noopener noreferrer" target="_blank">Official Website ↗</a>':registry?'<a class="an-guide-official" href="'+e(registry)+'" rel="noopener noreferrer" target="_blank">Official Register ↗</a>':'')+'<a class="an-premium-apply" href="#/apply">Apply Now ↗</a></div></div></article>';
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
 return '<div class="an-guide-level"><h2>'+e(level)+' — Admission & Application</h2><p>Explore study fields at '+e(u.name)+': <b>'+e((u.programs||[]).slice(0,6).join(' · ')||'Official programme directory')+'</b>. Fields listed here are not all confirmed as individual available degree titles.</p>'+verified+'<div class="an-guide-check"><h3>Application steps</h3>'+levels[level].map(([n,t])=>row(n,t)).join('')+'</div><div class="an-guide-check"><h3>Documents to verify</h3><ul>'+docs[level].map(x=>'<li>'+e(x)+'</li>').join('')+'</ul></div>'+(level==='PhD'?'<p class="an-guide-note">Research publications: there is no fixed worldwide minimum number of papers. Follow the specific doctoral school or funded-position advertisement. Publish research only in legitimate peer-reviewed outlets, following supervisor and journal guidance.</p>':'')+note+routesPanel(u,level)+(window.ANUniContacts?.render?.(u,level)||'')+'</div>';
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
 const publishedRank=additionalRank(u),researchRank=leidenRank(u);
 const housing=p?.housing?'<section class="an-guide-check"><h3>Accommodation and campus life</h3><p>'+e(p.housing)+'</p>'+link(p.housingSource,'Housing information','alt')+'</section>':'';
 return intro(u)+history+requirements+housing+
 '<div class="an-guide-key">'+(getRank(u)?'<strong>QS World University Rankings 2027: #'+getRank(u)+'</strong>'+link(qsSource,'Official QS 2027 ranking','alt'):researchRank?leidenPanel(u):publishedRank?additionalRankPanel(u):'<strong>Published ranking not verified for this entry</strong>')+'</div>'+
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
 const img=event.target;if(!(img instanceof HTMLImageElement))return;
 if(img.matches('[data-guide-image]')){
  img.hidden=true;img.style.display='none';
  const credit=img.parentElement?.querySelector('.an-guide-credit');
  if(credit)credit.style.display='none';
  return;
 }
 if(!img.closest('.university-profile'))return;
 if(img.closest('.campus-gallery')){img.closest('figure')?.remove();return;}
 if(img.classList.contains('university-logo')){
  const txt=img.getAttribute('alt')||'University';
  const initial=document.createElement('span');initial.className='university-monogram';initial.textContent=txt.replace(/ university logo$/i,'');
  img.replaceWith(initial);
 }
},true);
const extended=(u,p)=>'<section class="profile-section an-guide-degrees" id="profile-degree"><h2><span>Degree-wise</span> Application Guide</h2><p>Expand a level for its application preparation, recognised-document checklist and official route.</p><div class="an-guide-degree-grid">'+['Bachelor','Master','PhD'].map((level,i)=>'<details class="an-guide-degree-box"'+(i===0?' open':'')+'><summary>'+e(level)+' <span>⌄</span></summary>'+degree(u,level)+'</details>').join('')+'</div></section>'+support(u);
const hasPublishedRank=u=>Boolean(verifiedCardFacts[factKey(u)]?.ranking||getRank(u)||leidenRank(u)||additionalRank(u));
const publishedCoverage=(u,p={})=>{
 const facts=verifiedCardFacts[factKey(u)];
 const profile=profileData(u,p);
 return {
  tuition:tuitionRows(u,profile).some(row=>validUrl(row[3]||profile.feeSource)),
  intake:Boolean(facts?.intake?.[0]&&validUrl(facts.intake[2])),
  deadline:Boolean(commonAppDates(u)?.some(Boolean)||(facts?.intake?.[3]&&validUrl(facts.intake[2])))
 };
};
window.ANUniGuide={card,compare,getRank,hasPublishedRank,publishedCoverage,panel,mount,route,photos,extended,profileFact,institutionLogo,profileData,tuitionRows,leidenRank,isWebsiteIcon};
})();