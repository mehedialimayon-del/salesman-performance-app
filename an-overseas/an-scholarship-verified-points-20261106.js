/* A&N Overseas - 2026-11-06 verified scholarship decision cards and application roadmaps.
   It only augments already-rendered pages; no false generic IELTS waiver or deadline. */
(function(){
'use strict';
const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const A=(url,label)=>'<a target="_blank" rel="noopener noreferrer" href="'+E(url)+'">'+E(label)+' ↗</a>';
const sourceI='https://i-mesc.eu/application/student';
const criteriaI='https://i-mesc.eu/application/admission-criteria';
const accountI='https://i-mesc.eu/create-account';
const visualI='https://i-mesc.eu/fileadmin/documents/i-MESC_Guide_for_Applicants_2025.pdf';
const sourceH='https://www.uni-hohenheim.de/agecon-stipendien';
const sourceG='https://www.uni-goettingen.de/en/572462.html';
const visaG='https://dhaka.diplo.de/bd-en/service/2682868-2682868';
const OFFICIAL='Use the current official programme call before submitting payment or documents.';
const pills=(entries)=>'<div class="an-decision-grid">'+entries.map(f=>'<article class="an-decision-fact" data-tone="'+E(f[0])+'"><small>'+E(f[1])+'</small><strong>'+E(f[2])+'</strong><p>'+E(f[3])+'</p></article>').join('')+'</div>';
function current(){
 const id=(location.hash||'').split('?')[0].replace(/^#\/scholarship\//,'').split('/')[0];
 return (window.ANScholarships?.items||[]).find(x=>x.id===id);
}
function brief(txt,n=84){let t=String(txt||'').trim();return t.length>n?t.slice(0,n).replace(/\s+\S*$/,'')+'…':t;}
function board(p){
 const epos=p.id==='daad-epos-masters',erasmus=p.id==='erasmus-mundus';
 let facts;
 if(epos){
  facts=[
   ['green','Monthly award','€992 / month','DAAD EPOS Master scholarship; additional benefits are conditional.'],
   ['blue','IELTS / TOEFL','Depends on course','Hohenheim AgEcon: IELTS 6.5 / TOEFL iBT 90. Other hosts have different requirements.'],
   ['purple','CGPA / academic rank','Upper academic third','No universal 3.50/4.00 CGPA cut-off; exact course prerequisites still apply.'],
   ['red','MOI certificate','Not sufficient: AgEcon','Hohenheim requires an official English test. Never treat this as a rule for all EPOS courses.'],
   ['orange','German national visa','€75 normally','Publicly funded scholars may qualify for the visa-fee exemption; additional verification fees are separate.'],
   ['green','Post-degree employment','At least 2 years','Relevant full-time professional experience since Bachelor; host assesses evidence.'],
   ['purple','Application deadline','Each course differs','Göttingen: 15 Nov 2026; Hohenheim: 15 Dec (confirm named intake).'],
   ['blue','Where to apply','Direct to university','Choose one of 27 named course cards and follow its verified university channel.']
  ];
 }else if(erasmus){
  facts=[
   ['green','i-MESC scholarship','€1,400 / month','For selected Erasmus Mundus Joint Master award holders, up to 24 months.'],
   ['blue','i-MESC IELTS','6.5 minimum','Or TOEFL iBT 87 / Cambridge B2 First / listed CEFR B2 evidence.'],
   ['green','i-MESC MOI','Accepted conditionally','Official university certificate proving prior studies were taught in English.'],
   ['purple','CGPA','No universal threshold','i-MESC assesses academic excellence and alignment; university GPA can support ranking evidence.'],
   ['orange','Key supporting files','CV 2 pages + 2 references','University-stamped transcript, residence evidence, ID and specific reference template.'],
   ['red','Video statement','≤ 2 min / 200 MB','AVI, MOV or MP4; face clearly visible; programme motivation and relevant content.'],
   ['purple','2027-29 intake open','9 Nov 2026 (indicative)','14:00 Paris time, reconfirm when online portal opens.'],
   ['red','2027-29 intake close','26 Jan 2027 (indicative)','12:00 Paris time; later changes may be published.']
  ];
 }else{
  facts=[
   ['green','Funding / award',p.amount!=null?Number(p.amount).toLocaleString('en-US')+' '+(p.currency||''):'University-specific',brief(p.coverage,125)],
   ['blue','IELTS / TOEFL','Programme-specific',brief(p.language,125)],
   ['purple','CGPA / grades','Check named award',brief(p.eligibility,120)],
   ['red','MOI accepted?','Not verified for this award','A university accepting English-medium proof does not imply this scholarship accepts it.'],
   ['orange','Application charge','Check host/portal',brief(p.fee,125)],
   ['purple','Deadline / timeline',p.deadlineISO||'Programme-specific',brief(p.deadline,125)],
   ['blue','Programme duration',p.duration||'Verify with host','Course and funded-period durations may differ.'],
   ['green','Apply through', 'Official provider',OFFICIAL]
  ];
 }
 return '<section class="an-decision-board" id="an-scholarship-decision-board"><h2>Essential facts · eligibility, money & documents</h2><p class="an-decision-intro">One fact per card • values apply only to the named programme or condition. Orange = cost, blue = language, purple = dates/academic requirement, green = funding/accepted evidence, red = restrictions.</p>'+pills(facts)+'<div class="an-walk-links" style="margin-top:13px">'+A(epos?sourceH:erasmus?sourceI:p.source,'Official source / verification')+'</div></section>';
}
function walk(p){
 const epos=p.id==='daad-epos-masters',er=p.id==='erasmus-mundus';
 const steps=er?[
  '<strong>Choose the actual i-MESC joint master.</strong> Read 2027–2029 admission criteria; the general Erasmus catalogue is not a single application portal.',
  '<strong>Create an i-MESC account</strong> with your email, set a password, verify the activation email and check spam.',
  '<strong>Open the Class #23 form</strong> when the call becomes live; complete personal details, education and degree details.',
  '<strong>Language and MOI:</strong> upload a valid university MOI certificate if eligible, otherwise the accepted IELTS/TOEFL/Cambridge evidence.',
  '<strong>Upload individual files:</strong> ID/passport, separate residence proof, stamped translated transcripts, max 2-page Europass CV and two letters using i-MESC referee template.',
  '<strong>Upload a ≤2-minute video</strong> (MP4/MOV/AVI, ≤200 MB), explain your background and why you chose i-MESC.',
  '<strong>Complete remaining portal chapters:</strong> employment, additional information and referees; check every file and field carefully.',
  '<strong>Save AND submit</strong> the application after edits, check status and retain the email/confirmation. Submit before the current Paris-time closing date.'
 ]:epos?[
  '<strong>Select a named EPOS degree</strong> from the 27 course cards below. Check subjects, tests, 2-year experience and actual funded intake.',
  '<strong>Open the course’s OFFICIAL host website.</strong> DAAD’s central page is an award information source, not the universal submission form.',
  '<strong>Create the university portal account</strong> or follow the institution’s specified email/PDF procedure. For example, Göttingen combines admission and DAAD in one university online application.',
  '<strong>Download and complete DAAD checklist and form.</strong> Prepare certificates/transcripts, signed letter, current employer recommendation, job evidence, Europass CV and course-specific language evidence.',
  '<strong>Select the DAAD scholarship route</strong> inside the host form when provided, then upload the correctly named PDF files. Hohenheim also requires a HohCampus application and separately emailed documents.',
  '<strong>Check each mandatory document and submit</strong> before that course’s deadline. Retain the application/reference number, email and uploaded files.',
  '<strong>Selection or interviews</strong> follow the institution schedule; if nominated, complete any separate DAAD request.',
  '<strong>After a confirmed award</strong> follow the German mission’s study visa instructions for your lawful residence country; the visa is not issued by DAAD.'
 ]:[
  '<strong>Open the official provider application URL</strong> for the exact named scholarship and current year, not a third-party advertisement.',
  '<strong>Check eligible countries, degree level and host.</strong> Verify nationality, programme, intake and any nomination process.',
  '<strong>Create an account if the official portal offers registration.</strong> Enter accurate passport, contact and academic history.',
  '<strong>Prepare the official document checklist.</strong> Check scanned copies, translations, CV, references, funding eligibility and language evidence.',
  '<strong>Choose the correct award/degree,</strong> attach the documents and any course preferences according to provider instructions.',
  '<strong>Review the live deadline and charges.</strong> Do not assume all programmes have one global closing date or the same fee.',
  '<strong>Submit on the official provider platform,</strong> save the confirmation, and follow any nomination, interview, offer or visa stage.'
 ];
 let timeline='',links='';
 if(er){
  timeline='<div class="an-walk-timeline"><span><b>01 · Opening</b><br>9 Nov 2026 · 14:00 Paris time (indicative)</span><span><b>02 · Closing</b><br>26 Jan 2027 · 12:00 Paris time (indicative)</span><span><b>03 · Selection</b><br>Provider publishes later stages; no invented result dates</span></div>';
  links=A(sourceI,'i-MESC application')+A(accountI,'Create i-MESC account')+A(criteriaI,'Official timeline')+A(visualI,'Illustrated applicant guide (2025)');
 }else if(epos){
  timeline='<div class="an-walk-timeline"><span><b>Göttingen</b><br>1 Oct–15 Nov 2026 · 2027 EPOS intake</span><span><b>Hohenheim</b><br>15 Dec · check funded intake year</span><span><b>Other 25 tracks</b><br>Different host windows: review each card</span></div>';
  links=A(sourceG,'Göttingen application steps')+A(sourceH,'Hohenheim 2-part application')+A(visaG,'German visa fees');
 }else{
  timeline='<div class="an-walk-timeline"><span><b>Current call</b><br>'+E(p.deadline||'Check the named scholarship page')+'</span><span><b>Application route</b><br>Provider portal / nomination rules can differ</span></div>';
  links=A(p.apply||p.source,'Official application / host')+A(p.source,'Scholarship conditions');
 }
 return '<section class="an-application-walkthrough" id="an-scholarship-verified-walk"><h2>How to apply · visual step-by-step application flow</h2><p>Each numbered panel describes one action in sequence, with direct official links. Where a form is not yet open, the real registration step becomes available only when the provider activates it.</p><ol>'+steps.map(x=>'<li>'+x+'</li>').join('')+'</ol>'+timeline+'<div class="an-walk-links">'+links+'</div><p class="an-walk-note">'+(er?'The linked illustrated guide contains older intake screenshots; use the live portal for current forms, files and timing. MOI acceptance here is for i-MESC, not all Erasmus Mundus courses.':epos?'Do not apply to “all DAAD EPOS” through one universal web form. Course-level university application instructions take precedence.':'For programmes without an officially confirmed numeric IELTS, CGPA, fee or deadline, an invented figure is deliberately not displayed.')+'</p></section>';
}
function courseSteps(c){
 const name=(c.name||'').toLowerCase(),host=(c.host||'').toLowerCase();
 if(host.includes('göttingen'))return [
  'Open the University of Göttingen Development Economics EPOS page; confirm the next Winter intake.',
  'Within 1 October–15 November, open the official Application Portal and create the applicant account.',
  'Choose MSc Development Economics WITH DAAD EPOS Scholarship; enter personal and academic details.',
  'Upload degree records, EPOS checklist, CV, motivation, references, work evidence and the required English proof.',
  'Click Submit Application and confirm the button/status changes to Application Submitted.',
  'Retain confirmation; shortlisted candidates may be invited for an online interview.'
 ];
 if(host.includes('hohenheim'))return [
  'Read University of Hohenheim Agricultural Economics funded admission and English-score requirements.',
  'Start the AgEcon admission application in HohCampus and retain the HohCampus application ID.',
  'Complete DAAD form and checklist, degree/transcripts, Europass CV, work certificates, references and official IELTS/TOEFL.',
  'Label each PDF individually by number, name and document type; do not merge everything into one PDF.',
  'Email the PDFs as actual attachments to agecon@uni-hohenheim.de and include DAAD + HohCampus application number in subject.',
  'Ensure both HohCampus AND emailed DAAD package are received before the scholarship deadline.'
 ];
 if(name.includes('tropical forestry'))return [
  'Read TU Dresden Tropical Forestry EPOS requirements and the current call.',
  'Create the applicant account through the official Tropical Forestry application portal.',
  'Complete admission and DAAD EPOS forms; upload required individual PDFs and English evidence.',
  'Submit before the host scholarship deadline and save the acknowledgement.',
  'Monitor the university account/email for shortlisting and interview requests.'
 ];
 return [
  'Open this named course’s OFFICIAL university website using the button below.',
  'Read the active funded intake, programme-specific eligibility, English/German test and course closing date.',
  'Follow the university’s stated portal, email or nomination procedure; create an account only if required.',
  'Prepare and upload the exact DAAD/host document set, including proof of relevant post-degree work.',
  'Submit by the specific course deadline and retain confirmation; follow subsequent selection notices.'
 ];
}
function decorateCourseCards(){
 const courses=window.ANEPOSDeep?.courses||[];
 for(const card of document.querySelectorAll('.an-epos-course')){
  if(card.dataset.anStepsDone==='1')continue; card.dataset.anStepsDone='1';
  const c=courses.find(x=>x.id===card.id);if(!c)continue;
  const quick=document.createElement('div');quick.className='an-course-quickfacts';
  const deadline=c.deadline||'Not confirmed — host check';
  const moi=/Hohenheim/i.test(c.host)?'MOI alone NOT accepted':'MOI: check named course';
  const score=(c.score||'').trim();
  const scoreBrief=score.length>80?score.slice(0,77)+'…':score;
  quick.innerHTML='<span>🗓 '+E(deadline)+'</span><span>📖 '+E(c.months)+' months</span><span>🌐 '+E(scoreBrief)+'</span><span>🎓 '+E(moi)+'</span>';
  const anchor=card.querySelector('.an-epos-due');if(anchor)card.insertBefore(quick,anchor);else card.appendChild(quick);
  const d=document.createElement('details');d.className='an-course-apply-steps';
  d.innerHTML='<summary>Apply to this course — exact host route / checklist ▾</summary><ol>'+courseSteps(c).map(x=>'<li>'+E(x)+'</li>').join('')+'</ol><p>'+A(c.url,'Open official host course')+'</p>';
  const nav=card.querySelector('.an-epos-course-links');
  if(nav)card.insertBefore(d,nav);else card.appendChild(d);
 }
}
function splitLongParagraphs(){
 const list=document.querySelectorAll('.an-scholarship-detail .an-specific-guide article p:not([data-an-pointified]),.an-scholarship-detail .an-epos-pointlist li span:not([data-an-pointified])');
 for(const node of list){
  node.setAttribute('data-an-pointified','1');
  if(node.querySelector('a,button,img,input'))continue;
  const text=node.textContent.trim();
  if(text.length<145)continue;
  const parts=text.split(/;\s+|(?<=[.!?])\s+(?=[A-Z][a-z])/g).map(x=>x.trim()).filter(x=>x.length>14);
  if(parts.length<2||parts.length>9)continue;
  const ul=document.createElement('ul');ul.className='an-scholarship-mini-bullets';
  parts.forEach(t=>{const li=document.createElement('li');li.textContent=t;ul.appendChild(li)});
  node.replaceWith(ul);
 }
}
function emphasize(){
 const root=document.querySelector('#app .an-scholarship-detail');if(!root)return;
 const selector='.an-epos-pointlist li span,.an-epos-course>p,.an-specific-guide article li,.an-specific-guide article p,.an-scholarship-item-list li,.an-scholarship-mini-bullets li';
 const nodes=root.querySelectorAll(selector);
 const rx=/\b(?:IELTS(?:\s*Academic)?(?:\s*(?:overall|minimum|Band|score|:)?\s*\d(?:\.\d)?)?|TOEFL(?:\s*iBT)?(?:\s*(?:score|minimum|:)?\s*\d{2,3})?|CGPA|GPA|MOI(?:\s+(?:ACCEPTED|NOT ACCEPTED))?|Europass CV|Passport|transcripts?|reference letters?|Recommendation letters?|Motivation letter|proof of residence|visa fee|application fee|deadline)\b|(?:€|£|¥|৳|\b(?:RM|HUF|GBP|USD|EUR|BDT)\s*)\s?\d[\d,.]*(?:\s?\/\s?month)?|\b\d{4}-\d{2}-\d{2}\b/gi;
 for(const el of nodes){
  if(el.querySelector('a')||el.dataset.anAccented==='1')continue;
  el.dataset.anAccented='1';
  const it=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),found=[];
  while(it.nextNode()){let nd=it.currentNode;if(nd.parentElement?.closest('a,b,strong,mark,.an-info-hot'))continue;if(rx.test(nd.nodeValue))found.push(nd);rx.lastIndex=0}
  for(const node of found){
   const str=node.nodeValue;let last=0,m;rx.lastIndex=0;const frag=document.createDocumentFragment();
   while((m=rx.exec(str))){
    if(m.index>last)frag.append(document.createTextNode(str.slice(last,m.index)));
    const span=document.createElement('strong');span.className='an-info-hot';
    const w=m[0];span.dataset.type=/IELTS|TOEFL/i.test(w)?'score':/CGPA|GPA/i.test(w)?'gpa':/(€|£|¥|৳|RM|HUF|GBP|USD|EUR|BDT)/i.test(w)?'money':/202\d-\d\d-\d\d|deadline/i.test(w)?'date':/MOI/i.test(w)?'moi':'doc';
    span.textContent=w;frag.append(span);last=m.index+m[0].length;
    if(m[0].length===0)rx.lastIndex++;
   }
   if(last<str.length)frag.append(document.createTextNode(str.slice(last)));
   if(last>0)node.replaceWith(frag);
  }
 }
}
function apply(){
 if(!(location.hash||'').startsWith('#/scholarship/'))return;
 const main=document.querySelector('#app .an-scholarship-detail'),p=current();
 if(!main||!p)return;
 const lead=main.querySelector('.an-scholarship-lead');
 if(lead&&!main.querySelector('#an-scholarship-decision-board')){
  const frame=document.createElement('div');frame.innerHTML=board(p);
  lead.insertAdjacentElement('afterend',frame.firstElementChild);
 }
 const dashboard=main.querySelector('#an-scholarship-decision-board');
 if(dashboard&&!main.querySelector('#an-scholarship-verified-walk')){
  const frame=document.createElement('div');frame.innerHTML=walk(p);
  dashboard.insertAdjacentElement('afterend',frame.firstElementChild);
 }
 if(p.id==='daad-epos-masters')decorateCourseCards();
 splitLongParagraphs();
 emphasize();
}
let queued=false;
function enqueue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
function start(){
 const app=document.getElementById('app');
 if(!app)return;
 const mo=new MutationObserver(enqueue);mo.observe(app,{childList:true,subtree:true});
 addEventListener('hashchange',enqueue);enqueue();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
