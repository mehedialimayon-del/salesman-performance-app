/* A&N Overseas — precise highlights and complete i-MESC preparation, Nov 7 2026.
   Scoped to scholarship details; never changes scholarship data or other routes. */
(function(){
'use strict';
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEYS=[
 ['money',/(?:€1,400\s*\/\s*month|€33,600|€20,000|€2,300|€4,000\s*\/\s*year|€8,000|€0|\bfull fee waiver\b|\bscholarship recipients?\b|\bscholarship holders\b|\bno application fee\b|\bindustrial scholarship\b)/gi],
 ['duration',/\b(?:24 months|120 ECTS|four semesters|4 semesters|2 years|two years|minimum 180 ECTS|at least 30 ECTS)\b/gi],
 ['english',/\b(?:MOI|IELTS\s*6\.5|TOEFL\s*iBT\s*87|TOEFL\s*87|B2 First|CEFR B2|English-medium|Medium of Instruction|language certificate|IELTS|TOEFL)\b/gi],
 ['deadline',/\b(?:Class\s*#?23|2027[–-]2029|9 November 2026|26 January 2027|January 2027|Paris time|deadline|before 1st June|2-minute|two minutes|2 minutes|200 MB|no later than|submission|submit)\b/gi],
 ['documents',/\b(?:passport|ID card|proof of residence|university-stamped transcripts|transcripts|Europass CV|2 recommendation letters|two referee letters|recommendation letters|university-issued|sworn translator|motivation video|motivation statement)\b/gi],
 ['policy',/\b(?:visa|residence permit|work permission|family reunion|spouse|dependants|PR|not automatically|not guaranteed|not every admission is funded)\b/gi]
];
function highlightText(container){
 if(!container||container.dataset.anPremiumMarked==='1')return;
 const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT);
 const nodes=[];
 while(walker.nextNode()){
  const n=walker.currentNode,parent=n.parentElement;
  if(!parent||!n.nodeValue||n.nodeValue.trim().length<3)continue;
  if(parent.closest('a,mark,code,script,style,.an-info-hot,.an-fact-highlight,.an-moi-badge,.an-keymark,.an-scholarship-student-brief,.an-em-fact-ribbon,.an-visa-topic-head'))continue;
  nodes.push(n);
 }
 for(const n of nodes){
  let remaining=n.nodeValue,found=false;
  const fragment=document.createDocumentFragment();
  while(remaining.length){
   let best=null;
   for(const [tone,pattern] of KEYS){
    pattern.lastIndex=0;const m=pattern.exec(remaining);
    if(m&&(!best||m.index<best.i||(m.index===best.i&&m[0].length>best.text.length)))
     best={i:m.index,text:m[0],tone};
   }
   if(!best){fragment.append(document.createTextNode(remaining));break;}
   if(best.i>0)fragment.append(document.createTextNode(remaining.slice(0,best.i)));
   const tag=document.createElement('mark');tag.className='an-keymark';tag.dataset.tone=best.tone;tag.textContent=best.text;
   fragment.append(tag);remaining=remaining.slice(best.i+best.text.length);found=true;
  }
  if(found)n.replaceWith(fragment);
 }
 container.dataset.anPremiumMarked='1';
}
function parseHeadedText(raw){
 const lines=String(raw||'').trim().split(/\n(?=[A-Z][A-Z /()-]{2,32}:)/);
 return lines.map((line,i)=>{
  const m=line.match(/^([A-Z][A-Z /()-]{2,36}):\s*([\s\S]+)/);
  if(!m)return {label:i===0?'REQUIREMENT':'IMPORTANT',text:line.trim()};
  return {label:m[1].trim(),text:m[2].trim()};
 }).filter(x=>x.text);
}
function type(label){
 const l=label.toUpperCase();
 return /VISA|RESIDENCE|ERASMUS|IMMIGRATION|STUDENT/.test(l)?'orange':/WORK|EMPLOY/.test(l)?'blue':/FAMILY|SPOUSE|DEPEND/.test(l)?'mint':/AFTER|PR|RETURN|SETTLE/.test(l)?'violet':'gold';
}
function arrangeCountry(root,p){
 const sec=Array.from(root.querySelectorAll('.an-scholarship-section-full')).find(el=>(el.querySelector('h2')?.textContent||'').includes('Country-specific visa'));
 if(!sec||sec.dataset.anPremiumCountry==='1')return;
 const data=window.ANScholarshipCountryGuides?.[p.country];
 if(!data)return;
 const segments=parseHeadedText(data.text);
 const para=sec.querySelector(':scope > p');
 if(!para||segments.length<2)return;
 const grid=document.createElement('div');grid.className='an-visa-topic-grid';
 grid.innerHTML=segments.map((s,i)=>'<article class="an-visa-topic" data-topic="'+type(s.label)+'"><div class="an-visa-topic-head"><span class="an-visa-topic-count">'+String(i+1).padStart(2,'0')+'</span><h3>'+E(s.label.replace(/AFTER STUDY/i,'AFTER STUDY & STAY'))+'</h3></div><p>'+E(s.text)+'</p></article>').join('');
 para.replaceWith(grid);
 const note=document.createElement('div');note.className='an-visa-advice';
 note.innerHTML='<b>IMPORTANT · Separate rules for each destination</b><p>Visa, student-work permission, spouse/dependant rights and post-study residence are four different decisions. A scholarship or admission letter does not automatically grant work, family entry or permanent residence. Check the countries on your actual university mobility schedule before paying non-refundable fees.</p>';
 sec.querySelector('.an-scholarship-cta')?.before(note);
 if(p.id==='erasmus-mundus'){
  const extra=document.createElement('div');extra.className='an-visa-documents';
  extra.innerHTML='<h3>Practical international-student mobility checklist</h3><div class="an-visa-checkgrid">'+[
   ['Before travel','Get the final consortium study/mobility calendar and first destination; check the visa category for your passport and lawful place of residence.'],
   ['Keep ready','Valid passport, admission letter, scholarship/financial confirmation, accommodation evidence, health insurance and the documents requested by the issuing country.'],
   ['Multiple countries','Ask the programme coordinator about each transfer between France, Poland, Slovenia and Spain; do not assume permission for one country covers every other stay.'],
   ['Spouse & children','Confirm separate dependant eligibility, maintenance funds, housing, insurance and timing with each host immigration authority before planning family travel.'],
   ['Paid work','Do not start employment until the host-country student residence/visa conditions and any scholarship-contract restrictions permit it.'],
   ['After graduation','Check an independent post-study residence or employer-sponsored work route well before the student permission expires; there is no automatic PR.']
  ].map((r,i)=>'<article><b>'+String(i+1).padStart(2,'0')+' · '+E(r[0])+'</b><p>'+E(r[1])+'</p></article>').join('')+'</div>';
  note.after(extra);
 }
 sec.dataset.anPremiumCountry='1';
 highlightText(grid);highlightText(note);
}
function courseRibbon(root){
 const guide=Array.from(root.querySelectorAll('.an-specific-guide')).find(x=>(x.querySelector('h2')?.textContent||'').includes('Verified Erasmus Mundus programme example'));
 if(!guide||guide.dataset.anPremiumCourse==='1')return;
 const first=Array.from(guide.querySelectorAll(':scope .an-specific-grid > article')).find(a=>(a.querySelector('h3')?.textContent||'').includes('Course & universities'));
 if(first&&!first.querySelector('.an-em-fact-ribbon')){
  const stats=[
   ['COURSE LENGTH','24 MONTHS','orange'],['ACADEMIC CREDITS','120 ECTS','blue'],
   ['SEMESTERS','4','mint'],['EMJM STIPEND','€1,400 / MONTH','violet'],
   ['24-MONTH MAXIMUM','€33,600','gold']
  ];
  const row=document.createElement('div');row.className='an-em-fact-ribbon';
  row.innerHTML=stats.map(x=>'<span data-tone="'+x[2]+'"><small>'+x[0]+'</small><strong>'+x[1]+'</strong></span>').join('');
  first.querySelector('h3')?.after(row);
 }
 for(const a of guide.querySelectorAll(':scope .an-specific-grid > article')){
  const head=a.querySelector('h3')?.textContent||'';
  if(head==='Submission steps'||head.includes('Submission steps'))a.classList.add('an-premium-submission-steps');
  if(head.startsWith('Application dates')){
   a.classList.add('an-premium-dates');
   a.innerHTML='<h3>Application &amp; selection milestones</h3><ol><li><b>Class #23 (2027–2029):</b> expected portal opening <b>9 November 2026, 14:00 Paris time</b> (indicative).</li><li><b>Application deadline:</b> <b>26 January 2027, 12:00 Paris time</b> (indicative); submit all attachments before the portal closes.</li><li><b>Eligibility screening:</b> incomplete or non-compliant files are excluded before academic ranking. Read every mandatory field carefully.</li><li><b>Academic review &amp; result:</b> scoring, ranking and any interview/offer steps follow; exact Class #23 decision dates are not yet announced.</li><li><b>After an offer:</b> follow consortium visa, mobility, insurance and onboarding instructions; do not assume an automatic residence/work right.</li></ol><p><a target="_blank" rel="noopener noreferrer" href="https://i-mesc.eu/application/admission-criteria">Official programme timeline ↗</a></p>';
  }
  highlightText(a);
 }
 guide.dataset.anPremiumCourse='1';
}
function item(name,content,tone){return '<article class="an-brief-item" data-tone="'+tone+'"><h4>'+name+'</h4><p>'+content+'</p></article>';}
function studentBrief(root){
 if(root.querySelector('#an-scholarship-student-brief'))return;
 const guide=Array.from(root.querySelectorAll('.an-specific-guide')).find(x=>(x.querySelector('h2')?.textContent||'').includes('Verified Erasmus Mundus programme example'));
 if(!guide)return;
 const section=document.createElement('section');
 section.id='an-scholarship-student-brief';
 section.className='an-scholarship-student-brief';
 section.innerHTML='<div class="an-brief-head"><span>i-MESC 2027–2029 · STUDENT PREPARATION HUB</span><h2><em>Everything to prepare</em> before the application</h2><p>A practical programme-specific checklist, verified against the i-MESC admission, applicant, funding and fee instructions. Rules belong to <b>i-MESC</b>, not to every Erasmus Mundus master.</p></div>'+
 '<div class="an-brief-grid">'+
 item('01 · Academic entry','Bachelor degree or equivalent: <b>minimum 180 ECTS</b>. Preferred backgrounds include <b>Chemistry, Physics, Chemical Engineering, Materials Science, Materials Processing</b> and modelling applied to electrochemistry. Other relevant outstanding profiles may be considered. No universal CGPA cutoff is published.','orange')+
 item('02 · Final-year students','You may apply during the final Bachelor year with a <b>current enrolment certificate</b>. If selected, supply successful graduation proof and transcripts by <b>1 June</b> as the programme specifies.','blue')+
 item('03 · English proof & MOI','English ability is mandatory. An <b>official university MOI certificate</b> can substitute for a test if prior studies were in English. Otherwise <b>IELTS 6.5</b>, <b>TOEFL iBT 87</b>, <b>Cambridge B2 First</b> or listed <b>CEFR B2</b> evidence. <b>Duolingo / OLS are not accepted</b> under this programme.','mint')+
 item('04 · Personal identity & address','Prepare your <b>passport or national ID</b> and <b>separate proof of residence</b> such as a utility bill, bank statement or residence certificate. <b>An ID card alone is NOT accepted as proof of residence.</b>','violet')+
 item('05 · Academic documents & referees','Prepare <b>university-stamped certified transcripts</b> and a <b>sworn English translation</b> where needed, a <b>Europass CV limited to 2 pages</b> and <b>two recommendation letters using the mandatory consortium template</b>. Your referees, not you, write their letters.','gold')+
 item('06 · Video statement','Make a clear face-visible video introducing your <b>full name</b>, academic background, motivation and interests in the programme. <b>Maximum 2 minutes and 200 MB</b>; upload <b>AVI, MOV or MP4</b>. An overlong video may render the application ineligible.','blue')+
 item('07 · Apply / submission sequence','<b>Class #23 (2027–2029)</b>: expected opening <b>9 Nov 2026 14:00 Paris</b>; indicative closing <b>26 Jan 2027 12:00 Paris</b>. Create/login to the official account, verify activation email, complete every form tab, upload attachments, review and <b>submit before the portal closes</b>. Incomplete files are screened out; late changes are not allowed.','orange')+
 item('08 · Cost & funding','<b>Application fee: €0.</b> If awarded an <b>Erasmus Mundus scholarship: €1,400/month for 24 months, maximum €33,600</b>, with full registration fee waiver. Without EMJM, registration is <b>€4,000/year (€8,000 total)</b>. A separate <b>industrial scholarship of €20,000</b> may be awarded competitively; that funding pays registration from the grant. Some non-EMJM students receive a <b>€2,300 mobility/visa contribution</b> according to programme conditions.','mint')+
 item('09 · How selection is scored','Published maximum <b>150 points</b>: academic excellence <b>30</b>, relevant scientific background <b>40</b>, motivation video <b>40</b>, references <b>15</b>, language <b>10</b> and origin university <b>15</b>. Strong documents and programme fit matter; meeting the minimum does not guarantee funding.','violet')+
 item('10 · After submitting','Save the submission confirmation and keep copies. Check email/spam and application status for <b>eligibility screening</b>, academic assessment, ranking, possible interview, offer and visa instructions. The current Class #23 selection dates beyond application close are not yet confirmed; do not use old Class #22 dates.','gold')+
 '</div><p class="an-brief-end">Source check: i-MESC admission criteria, application requirements, participation fees, funding and FAQ (reviewed 7 Nov 2026). Official links remain available on this page for last-minute changes, but the preparation points above are readable without leaving A&N Overseas.</p>';
 guide.after(section);
}
function enhanceGeneric(root){
 for(const a of root.querySelectorAll('.an-specific-guide article,.an-scholarship-section article,.an-programme-cost-card')){
  if(a.closest('#an-scholarship-student-brief'))continue;
  highlightText(a);
 }
}
function render(){
 const root=document.querySelector('#app .an-scholarship-detail');
 const id=(location.hash||'').split('?')[0].split('/')[2];
 const p=(window.ANScholarships?.items||[]).find(x=>x.id===id);
 if(!root||!p)return;
 arrangeCountry(root,p);
 if(id==='erasmus-mundus'){courseRibbon(root);studentBrief(root);}
 enhanceGeneric(root);
}
let scheduled=false;
function queue(){
 if(scheduled)return;
 scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;render();});
}
function start(){
 const app=document.getElementById('app');if(!app)return;
 new MutationObserver(queue).observe(app,{childList:true,subtree:false});
 window.addEventListener('hashchange',queue);
 queue();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();