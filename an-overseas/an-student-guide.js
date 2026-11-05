/* A&N international student programme, work, spouse, residence and budget planner.
   Renders on every university profile but does not invent university-specific facts.
   Currency cross-rate is an indicative dated bank rate, not a live transfer quote. */
(function(){
'use strict';
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const policy=()=>window.ANStudyCountry;
const txt=(value,empty='Confirm with university')=>String(value||'').trim()||empty;
const url=u=>{try{const x=new URL(u);return x.protocol==='https:'?x.href:'';}catch{return'';}};
const link=(href,label)=>url(href)?'<a href="'+E(url(href))+'" target="_blank" rel="noopener noreferrer">'+E(label)+' ↗</a>':'';
const levelPattern={
 Bachelor:/\b(bachelor|undergraduate|bsc|beng|bba|b\.a\.|b\.s\.)\b/i,
 Master:/\b(master|postgraduate|msc|m\.sc|mba|m\.a\.)\b/i,
 PhD:/\b(phd|doctor|doctoral|dphil)\b/i
};
const sampleThemes=['Business & Economics','Engineering & Technology','Agriculture & Environmental Science'];
const fieldRoles=[
 {key:/agricultur|aquacultur|fisher|horticultur|animal science|food|environment|marine/i, sector:'Agriculture · Fisheries · Environment',jobs:'Agricultural analyst, aquaculture technician, environmental consultant, food quality specialist; research positions may require graduate training.'},
 {key:/engineer|energy|mechani|civil|architect|construction/i,sector:'Engineering · Infrastructure · Energy',jobs:'Graduate engineer, design assistant, infrastructure planner, engineering researcher; professional registration may be required.'},
 {key:/computer|data|artificial|software|cyber|information technolog|games/i,sector:'Software · Data · Technology',jobs:'Software developer, data analyst, cybersecurity analyst, research assistant; local hiring and visa rules apply.'},
 {key:/business|finance|econom|account|management|marketing|entrepreneur/i,sector:'Business · Finance · Management',jobs:'Business analyst, marketing associate, finance officer, audit assistant, business researcher; some roles require local credentials.'},
 {key:/medicine|health|nursing|pharmacy|dent|public health/i,sector:'Healthcare · Health Research',jobs:'Clinical/research support, healthcare analyst, public-health officer; licensed patient-facing professions require local registration.'},
 {key:/education|communication|social|humanities|law|arts/i,sector:'Education · Communication · Social Sciences',jobs:'Research assistant, communications officer, policy analyst, teaching-related roles; licensure and language requirements may apply.'}
];
function fieldMap(u,p){
 const fields=[...(u.programs||[]),...(p?.programs||[])].filter(Boolean);
 const found=fieldRoles.filter(m=>fields.some(x=>m.key.test(x)));
 return found.length?found.slice(0,5):fieldRoles.slice(0,3);
}
function section(icon,title,body,cls=''){
 return '<section class="an-study-section '+cls+'"><header><span class="an-study-section-icon" aria-hidden="true">'+icon+'</span><h3>'+E(title)+'</h3></header>'+body+'</section>';
}
function sources(links){
 return '<div class="an-study-sources">'+links.filter(Boolean).join('')+'</div>';
}
function aid(u,c){
 return section('🧭','Bangladesh applicant checklist',
 '<ol class="an-study-steps"><li>Verify institution recognition, course availability, degree level and English/language criteria directly.</li>'+
 '<li>Choose the correct intake, programme/campus and check nationality-specific entry conditions.</li>'+
 '<li>Prepare passport, certificates, transcripts, SOP, references, finances, and translations as requested.</li>'+
 '<li>Apply only via the official university/national portal; save the application ID and payment receipt.</li>'+
 '<li>Review the offer, tuition/deposit refund policy, official visa conditions, housing, flight and airport arrival plan before paying.</li></ol>'+
 sources([link(u.site,'University website'),link(c.visaUrl,'Official visa instructions'),
 link(window.ANUniGuide?.route?.(u)?.url,'Country application route')])+
 '<p class="an-study-note">This checklist is not proof that A&N is an authorised representative of the university. Always verify financial and admission instructions using the university domain.</p>');
}
function degree(u,p,level,index){
 const verified=(p?.programs||[]).filter(s=>levelPattern[level].test(s)).slice(0,3);
 const suggestions=[...(u.programs||[]),...(p?.programs||[])].filter(s=>s&&!levelPattern.Bachelor.test(s)&&!levelPattern.Master.test(s)&&!levelPattern.PhD.test(s)).slice(0,3);
 const examples=verified.length?verified.map(s=>'<li>'+E(s)+'</li>').join(''):'<li>No institution-verified '+E(level)+' course titles available in this catalogue.</li>';
 const pathways=level==='Bachelor'
  ?'Confirm high-school equivalency, subject prerequisites, foundation or entrance tests and the correct national admission portal.'
  :level==='Master'
  ?'Check relevant Bachelor degree/CGPA, coursework versus research track, English requirement, portfolio and optional supervisor.'
  :'Check relevant graduate degree, supervisor, research proposal, funding call, interview and laboratory/research group eligibility.';
 const feeRows=(p?.fees||[]).filter(row=>{
  if(!Array.isArray(row))return false;
  const text=row.join(' ');return levelPattern[level].test(text)&&/[\d,]+\s*/.test(row[1]||'')&&/(?:RM|GBP|AUD|CAD|USD|EUR|MYR)\s*[\d,]+/i.test(row[1]||'');
 }).slice(0,3);
 let tuition=feeRows.length?'<ul>'+feeRows.map(r=>'<li>'+E(r[0])+': <strong>'+E(r[1])+'</strong> <small>'+E(r[2]||'')+'</small></li>').join('')+'</ul>':'<p>Programme-specific international tuition not verified here. Request the fee schedule and refundable/non-refundable initial payment invoice.</p>';
 return '<details class="an-study-degree"'+(index===0?' open':'')+'><summary><span>'+E(level)+'</span><span class="an-study-check">View subjects, fees & admission</span><b aria-hidden="true">⌄</b></summary>'+
 '<div class="an-study-degree-body"><h4>3 programme examples / subjects</h4>'+
 (verified.length?'<p class="an-study-tag">Listed from existing institution profile — confirm current intake</p>':'<p class="an-study-tag">No verified degree-specific course titles yet; fields below are only subjects to search</p>')+
 '<ul>'+examples+'</ul>'+
 (!verified.length&&suggestions.length?'<p><strong>Fields to explore:</strong> '+E(suggestions.join(' · '))+'</p>':'')+
 '<h4>Tuition & funding</h4>'+tuition+
 '<p>Available grants: investigate the '+E(level)+' scholarships, international tuition waivers and research assistantships at the university. Funding is not guaranteed.</p>'+
 '<h4>Admission process</h4><p>'+E(pathways)+'</p>'+
 sources([link(p?.programSource||u.site,'Courses & fee details'),link(p?.feeSource||u.site,'Official tuition source'),link(u.site,'Application portal start')])+
 '</div></details>';
}
function employment(u,c,p){
 const sec=fieldMap(u,p);
 return section('💼','Student jobs & graduate career sectors',
 '<p>'+E(c.work)+'</p>'+sources([link(c.workUrl,'Official work permission'),link(c.jobsUrl,'Official career guidance')])+
 '<div class="an-study-job-grid">'+sec.map(x=>'<article><h4>'+E(x.sector)+'</h4><p>'+E(x.jobs)+'</p></article>').join('')+'</div>'+
 '<p class="an-study-note">The sectors are linked to broad study fields, not confirmed vacancies. Language, licensing, employer sponsorship and immigration rules may restrict work. Part-time salary must never be assumed to cover tuition.</p>');
}
function spouse(c){
 return section('👫','Spouse / partner & dependant options',
 '<p>'+E(c.spouse)+'</p>'+
 '<div class="an-study-mini-grid"><article><b>Visa eligibility</b><p>Check if Bachelor, taught Master, research Master and PhD students are treated differently.</p></article>'+
 '<article><b>Work rights</b><p>A spouse joining the country does not necessarily have permission to work. Read the actual visa grant.</p></article>'+
 '<article><b>Family budget</b><p>Calculate separate health cover, residence fees, additional rent, travel, dependent maintenance and school costs if relevant.</p></article></div>'+
 sources([link(c.spouseUrl||c.visaUrl,'Official spouse & family criteria')]));
}
function stay(c){
 return section('🏡','Housing, monthly living & spouse living costs',
 '<p><strong>'+E(c.currency)+' — '+E(c.currencyName)+'</strong></p>'+
 (c.living?'<div class="an-study-big-range"><strong>'+E(policy().withBdt(c.living[0],c.currency))+
 (c.living[0]!==c.living[1]?' – '+E(policy().withBdt(c.living[1],c.currency)):'')+
 '</strong><small>One international student / month</small></div>':'<p>Verified location-specific living cost not yet available; request the official international student living-cost guide.</p>')+
 '<p class="an-study-note">'+E(c.livingType)+'. Rent/dorm, utilities, food, transport, internet, insurance and one-time security deposits must be checked separately. A partner normally needs a larger household budget; no automatic multiplier is claimed.</p>'+
 sources([link(c.livingUrl,'Living-cost benchmark / source')]));
}
function funding(c,u,p){
 return section('🎓','Scholarships, university funds & proposal support',
 '<div class="an-study-mini-grid"><article><b>Bachelor</b><p>Check entry-merit awards, tuition discounts, country-based grants and foundation eligibility.</p></article>'+
 '<article><b>Master</b><p>Check taught scholarships, research grants, teaching/research assistantships and tuition waiver conditions.</p></article>'+
 '<article><b>PhD</b><p>Identify open funded doctoral projects, lab positions, research councils, supervisor-led studentships and proposal requirements.</p></article></div>'+
 '<p>'+E(c.scholarship)+'</p>'+
 '<p>Research proposal: align a clear question, methods, feasible timeline and academic supervisor with a published funding call; apply before the deadline.</p>'+
 sources([link(c.scholarshipUrl,'National scholarship route'),link(p?.pgSource||p?.programSource||u.site,'University research/graduate programmes')])+
 '<p class="an-study-note">Scholarship details and amounts are not confirmed for this individual university unless explicitly linked above. No invented percentage or full-funding guarantee.</p>');
}
function settlement(c){
 return section('🛂','Post-study work, PR & settlement',
 '<p>'+E(c.pr)+'</p><p>Before applying, check eligibility by qualification, visa subclass, job offer, work experience, income, recognised occupation, language score, age and required residence years.</p>'+
 sources([link(c.prUrl||c.visaUrl,'Official immigration / post-study route')])+
 '<p class="an-study-note">PR and citizenship are immigration decisions, not university admission benefits. No university can guarantee settlement.</p>');
}
function research(u,p,c){
 return section('🔬','Research, international community & academic contacts',
 '<p>'+E(c.research)+'</p>'+
 '<p><b>International students:</b> This profile does not contain a verified enrolment percentage/count for '+E(u.name)+'. Seek the official annual report or international office factsheet; do not substitute invented statistics.</p>'+
 '<p>Potential activities: lab volunteering where eligible, academic writing groups, undergraduate research schemes, conference presentations, graduate research posts and funded PhD projects.</p>'+
 sources([link(p?.pgSource||u.site,'Graduate and research website'),link(p?.historySource||u.site,'Institutional facts'),link(u.site,'International admissions office')]));
}
function calc(u,c){
 const currency=c.currency;
 const low=c.living?.[0]||0,high=c.living?.[1]||0;
 const starter=low&&high?'<p><b>Starter accommodation + 1 month living, excluding all academic/travel/visa charges:</b> '+E(policy().withBdt(Math.round(low*1.5),currency))+' – '+E(policy().withBdt(Math.round(high*2),currency))+'</p>':'';
 const names=[
  ['application','Application fee (verified quote)'],['tuition','First tuition / university deposit'],['visa','Visa / medical / insurance / EMGS if applicable'],
  ['flight','Dhaka → destination flight quotation'],['arrival','Airport → actual campus transfer quotation'],
  ['housing','Housing deposit / advance quote'],['firstmonth','First month food / rent / utilities']
 ];
 return section('🧮','First-arrival cost — transparent estimate & BDT conversion',
 '<p><b>Location:</b> '+E(u.city||u.country)+' · '+E(u.country)+' · <b>'+E(currency)+'</b> ('+E(c.currencyName)+').</p>'+
 starter+
 '<p class="an-study-note">The starter range above is only a rough housing-and-living planning scenario, NOT the total cost to enter the university. It assumes approximately 1.5–2 months of the monthly planning benchmark and does not represent a verified rent deposit.</p>'+
 '<div class="an-study-cost-grid">'+names.map(([key,label])=>'<label><span>'+E(label)+'</span><input class="an-cost-input" data-cost-key="'+E(key)+'" type="number" min="0" step="1" inputmode="decimal" placeholder="Enter actual '+E(currency)+' amount" aria-label="'+E(label)+'"></label>').join('')+'</div>'+
 '<div class="an-study-total" aria-live="polite"><strong>Complete estimated first-arrival cost</strong><output id="an-first-arrival-total">Enter all 7 quotation amounts to calculate a complete estimate.</output><small>Use 0 only where a documented fee genuinely does not apply. No automatic ticket, visa or deposit price is invented.</small></div>'+
 '<p>Use an offer invoice for tuition, the immigration fee page for visa, a travel agency/airline quote for a Dhaka departure, and university accommodation information for deposits. Add required show-money separately: proof of funds is not always an amount you spend.</p>'+
 sources([link(p?.feeSource||u.site,'University tuition / deposits'),link(c.visaUrl,'Official student visa fees'),
 link('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(u.name+' '+(u.city||u.country)),'Campus & airport route map'),
 link(policy().fxSource,'FX reference · 05 Nov 2026')])+
 '<p class="an-study-note">Currency conversion is an indicative cross-rate from the dated bank table; not a live exchange, fee or remittance rate. Actual airport, taxi/train/grab and air-ticket quotes are route, date and baggage dependent.</p>');
}
function contents(){
 return ['Bachelor / Master / PhD','Admission steps','Student work & jobs','Spouse / dependants','Housing & living cost','Scholarships / funding','PR / post-study','Research / community','First-arrival calculator'];
}
function render(u,p){
 const source=policy();if(!source)return '';
 const c=source.get(u.country);
 return '<section id="an-student-planner" class="an-student-planner" aria-label="International student planning guide">'+
 '<div class="an-study-header"><div><small>A&N OVERSEAS · INTERNATIONAL STUDENT DECISION CENTRE</small><h2><span>Study, Work &</span> Settle Planning Guide</h2><p>'+E(u.name)+' · '+E(u.country)+' · '+E(u.city||'Campus location to verify')+'</p></div><span class="an-study-review">Sources checked 05 NOV 2026</span></div>'+
 '<div class="an-study-progress">'+contents().map((name,i)=>'<span><b>'+String(i+1).padStart(2,'0')+'</b>'+E(name)+'</span>').join('')+'</div>'+
 section('📚','Education: Bachelor · Master · PhD',
 '<div class="an-study-degree-grid">'+['Bachelor','Master','PhD'].map((level,i)=>degree(u,p,level,i)).join('')+'</div>'+
 '<p class="an-study-note">A list of study fields is NOT an official confirmed programme title. Degree availability, fees, CGPA, language tests and deadlines vary by university and intake.</p>')+
 aid(u,c)+employment(u,c,p)+spouse(c)+stay(c)+funding(c,u,p)+settlement(c)+research(u,p,c)+calc(u,c)+
 '<div class="an-study-footer"><p>'+E(source.sourceNote)+'</p><a href="#/contact">Request A&N personalised university costing →</a></div>'+
 '</section>';
}
function refreshCost(){
 const el=document.querySelector('#an-student-planner');if(!el)return;
 const fields=[...el.querySelectorAll('.an-cost-input')];
 const output=el.querySelector('#an-first-arrival-total');if(!output)return;
 if(fields.some(f=>f.value.trim()===''||Number(f.value)<0||!Number.isFinite(Number(f.value)))){
  output.textContent='Enter all 7 quotation amounts to calculate a complete estimate.';return;
 }
 const id=(location.hash.split('?')[0].split('/')[2]||'');
 const u=typeof U!=='undefined'?U.find(o=>o.id===id):null;if(!u)return;
 const c=policy().get(u.country);
 const total=fields.reduce((a,f)=>a+Number(f.value),0);
 output.textContent=policy().withBdt(total,c.currency)+' — indicative amount, based on your inputs';
}
document.addEventListener('input',ev=>{if(ev.target?.matches?.('.an-cost-input'))refreshCost()});
window.ANStudentGuide={render,refreshCost};
})();