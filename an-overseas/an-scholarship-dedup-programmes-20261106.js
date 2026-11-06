/* A&N Overseas — one scholarship guide per award, course-by-course verified costs (06 Nov 2026). */
(function(){
'use strict';
const E=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const link=(url,txt)=>'<a href="'+E(url)+'" target="_blank" rel="noopener noreferrer">'+E(txt)+' ↗</a>';
const FEES={
 'epos-course-1':{
  fee:'€0 tuition per semester',extra:'Approximately €460 semester contribution (not tuition); recheck current semester invoice.',
  source:'https://www2.daad.de/deutschland/studienangebote/international-programmes/en/detail/4204/'
 },
 'epos-course-2':{
  fee:'Published standard tuition: €6,000 for full programme',extra:'Four instalments of €1,500 plus Leipzig semester contribution. Confirm DAAD-funded payment/waiver arrangement.',
  source:'https://www.wifa.uni-leipzig.de/en/sept-competence-center/masters-program/financial-matters'
 },
 'epos-course-5':{
  fee:'Standard tuition: none for the regular degree',extra:'TU Dresden semester fee applies; second-degree/long-study charges may apply individually.',
  source:'https://tu-dresden.de/studium/vor-dem-studium/studienangebot/sins/sins_studiengang?autoid=71&set_language=en'
 },
 'epos-course-11':{
  fee:'Published standard programme tuition: €13,800 / 3 semesters',extra:'€5,000 + €5,000 + €3,800; semester fee about €350 each, German course up to €300 per semester. Confirm EPOS payment conditions.',
  source:'https://www.tu.berlin/en/planen-bauen-umwelt/urbanmanagement/application-admission-and-tuition-fees'
 },
 'epos-course-25':{
  fee:'Published standard full-time tuition: €14,100 / 1 year',extra:'Heidelberg states special arrangements apply to DAAD scholarship holders; verify award-specific payment in writing.',
  source:'https://www.klinikum.uni-heidelberg.de/heidelberger-institut-fuer-global-health/education/master-of-science-in-international-health'
 },
 'epos-course-26':{
  fee:'Published standard programme tuition: €9,700 total',extra:'€4,850 per semester, two semesters; confirm separately what any DAAD EPOS award pays.',
  source:'https://www.uni-bonn.de/en/studying/degree-programs/degree-programs-a-z/global-health-wm'
 },
 'epos-course-14':{
  fee:'€0 tuition for awarded DAAD EPOS scholars',extra:'A 2-year tuition waiver; other semester and personal costs require separate checking.',
  source:'https://www.uni-hohenheim.de/agecon-stipendien'
 },
 'epos-course-17':{
  fee:'€0 study tuition for awarded DAAD EPOS scholars',extra:'Without exemption, non-EU tuition is €1,500 per semester. Other semester charges may remain.',
  source:'https://www.meg.uni-freiburg.de/admissions/Scholarships/daad%20scholarship'
 }
};
function current(){
 const hash=location.hash||'';
 if(!hash.startsWith('#/scholarship/'))return null;
 const id=hash.split('?')[0].split('/')[2];
 return (window.ANScholarships?.items||[]).find(x=>x.id===id)||null;
}
function verifyLabel(duration){
 const d=String(duration||'').trim();
 return d&&!/^(depends|check |varies|according|programme-specific)/i.test(d)?d:'Not verified for a named degree';
}
function programmeSection(p){
 if(p.id==='daad-epos-masters'){
  return '<section class="an-unified-programme-note"><h3>27 named DAAD EPOS programmes</h3><p>Every individual course below lists the published duration and university. Tuition and semester costs are labelled separately; exact figures appear only for programmes whose official source was checked.</p></section>';
 }
 const rows=[];
 if(p.id==='erasmus-mundus'){
  rows.push({name:'i-MESC · Materials for Energy Storage and Conversion (joint MSc)',host:'Erasmus Mundus consortium',duration:'24 months · 4 semesters · 120 ECTS',tuition:'€0 registration/tuition for EMJM scholarship holders; €4,000/year (€8,000 total) for non-EMJM students',fee:'EMJM scholarship: €1,400/month up to 24 months, if awarded',source:'https://i-mesc.eu/the-course/fees',note:'This fee applies to i-MESC only. Other Erasmus Mundus joint masters set separate rules.'});
 }
 if(['turkiye-ba','turkiye-ma','turkiye-phd'].includes(p.id)){
  rows.push({name:p.name.replace(/^Türkiye Scholarships · /,''),host:'The programme and university selected in the official TBBS portal',duration:verifyLabel(p.duration),tuition:'Tuition covered by the Full-Time Türkiye Scholarship if awarded',fee:'Department-specific price for self-funded students is not published as a universal figure',source:'https://www.turkiyeburslari.gov.tr/fulltimeprograms',note:'The exact university/department and degree duration must be taken from the TBBS programme selection.'});
 }
 if(p.id.startsWith('hungary-')){
  rows.push({name:p.name.replace(/^Stipendium Hungaricum · /,''),host:'Eligible Hungarian programmes under the Bangladesh sending-partner agreement',duration:verifyLabel(p.duration),tuition:'€0 tuition for scholarship recipients (tuition-free education)',fee:'Official scholarship application and admission exam: free; personal costs may remain',source:'https://stipendiumhungaricum.hu/apply/',note:'Individual programme name, length and non-scholarship price must be verified in the live DreamApply course list.'});
 }
 if(!rows.length){
  const display=p.level||p.name;
  rows.push({name:display+' · named university/course to be selected',host:(p.universities||[]).length?p.universities.slice(0,3).join(' / ')+(p.universities.length>3?' + more':''):'Check the official funded-programme catalogue',duration:verifyLabel(p.duration),tuition:p.discountPercent!=null?'Tuition price is university/course-specific; advertised discount '+p.discountPercent+'% does not establish a numeric fee':'No independently verified course-specific tuition amount in this award listing',fee:'Application charge: '+String(p.fee||'Confirm with provider'),source:p.source||p.apply||'#/scholarships',note:'Do not confuse scholarship stipend, the cost of a degree, and a separate application fee.'});
 }
 return '<section class="an-programme-costs" id="an-scholarship-programmes"><h2>Programmes · duration · tuition & application fees</h2><p class="an-programme-explainer">Only verified degree/course figures are shown as amounts. Tuition, university semester charges, application charges and scholarship funding are different items.</p><div class="an-programme-cost-grid">'+rows.map((r,i)=>'<article class="an-programme-cost-card"><div class="an-programme-cost-head"><span>'+String(i+1).padStart(2,'0')+'</span><h3>'+E(r.name)+'</h3></div><p class="an-programme-host">'+E(r.host)+'</p><dl><div><dt>Duration</dt><dd>'+E(r.duration)+'</dd></div><div><dt>Tuition / participation fees</dt><dd>'+E(r.tuition)+'</dd></div><div><dt>Funding / application fee</dt><dd>'+E(r.fee)+'</dd></div></dl><p class="an-programme-note">'+E(r.note)+'</p>'+link(r.source,'Official fee / programme source')+'</article>').join('')+'</div></section>';
}
function addEposFees(){
 const courses=window.ANEPOSDeep?.courses||[];
 const cards=document.querySelectorAll('#app .an-scholarship-detail .an-epos-course');
 for(const card of cards){
  if(card.querySelector('.an-programme-fee-breakdown'))continue;
  const c=courses.find(x=>x.id===card.id);
  if(!c)continue;
  const info=FEES[c.id];
  const block=document.createElement('div');
  block.className='an-programme-fee-breakdown';
  block.innerHTML='<div><strong>Programme duration</strong><span>'+E(c.months)+' months</span></div>'+
   '<div><strong>Tuition fee</strong><span>'+E(info?info.fee:'No independently verified exact fee for this named course')+'</span></div>'+
   '<div><strong>Semester / extra charges</strong><span>'+E(info?info.extra:'Host-specific; check official tuition and semester schedule')+'</span></div>'+
   '<div><strong>Application fee</strong><span>Separate host processing charge not verified — do not assume zero</span></div>'+
   '<p>'+link(info?info.source:c.url,'Official university fee / degree page')+'</p>';
  const due=card.querySelector('.an-epos-due');
  if(due)due.before(block);else card.append(block);
 }
}
function consolidate(){
 const p=current(),main=document.querySelector('#app .an-scholarship-detail');
 if(!p||!main)return;
 // Itemised DAAD A-Z guide is already complete; do not append generic document/fee/how-to templates.
 if(p.id==='daad-epos-masters'){
  main.querySelector('#an-scholarship-document-guide')?.remove();
  main.querySelector('.an-scholarship-decision-board')?.remove();
  main.querySelector('.an-application-walkthrough')?.remove();
  addEposFees();
 }else{
  const grid=main.querySelector('.an-scholarship-section-grid');
  if(grid&&!grid.dataset.anDeduplicated){
   for(const num of [3,4,5,6,7,8])grid.querySelector('.an-scholarship-section-'+num)?.remove();
   for(const [num,newNum] of [[9,3],[10,4],[11,5],[12,6]]){
    const sec=grid.querySelector('.an-scholarship-section-'+num);
    if(sec){const badge=sec.querySelector('h2 span');if(badge)badge.textContent=String(newNum).padStart(2,'0');}
   }
   grid.dataset.anDeduplicated='1';
  }
  // The verified i-MESC 2027–29 requirements below replace the general document/how-to template.
  if(p.id==='erasmus-mundus')main.querySelector('#an-scholarship-document-guide')?.remove();
  // These programmes already have a provider-specific application process; do not also show generic steps.
  if(p.id.startsWith('hungary-')||p.id.startsWith('turkiye-')){
   const doc=main.querySelector('#an-scholarship-document-guide');
   for(const article of doc?.querySelectorAll('article')||[]){
    if(/^06\s*·\s*When, where and how to apply/i.test(article.querySelector('h3')?.textContent||''))article.remove();
   }
  }
 }
 if(main.dataset.anUnified==='1')return;
 main.dataset.anUnified='1';
 const wrapper=document.createElement('div');
 wrapper.className='an-scholarship-master-guide';
 wrapper.id='an-scholarship-complete-guide';
 wrapper.innerHTML='<header class="an-unified-heading"><h2>Complete scholarship guide</h2><p>One organised guide: no duplicated document lists or repeated application instructions. The official named programme controls eligibility, fee and deadline.</p></header>'+programmeSection(p);
 const lead=main.querySelector('.an-scholarship-lead');
 if(lead)lead.after(wrapper);else main.prepend(wrapper);
 const children=Array.from(main.children);
 for(const child of children){
  if(child===wrapper||child===lead||child.matches('.an-breadcrumb,#an-scholarship-help'))continue;
  // Keep the final Back to Scholarships action outside the unified information folder.
  if(child.classList.contains('an-scholarship-cta'))continue;
  wrapper.append(child);
 }
 // Put the detailed document guide directly after the basic eligibility/coverage points.
 const documentGuide=wrapper.querySelector('#an-scholarship-document-guide');
 const grid=wrapper.querySelector('.an-scholarship-section-grid');
 if(documentGuide&&grid)grid.after(documentGuide);
}
let queued=false;
function schedule(){
 if(queued)return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;consolidate()});
}
function start(){
 const app=document.getElementById('app');
 if(!app)return;
 const obs=new MutationObserver(schedule);
 obs.observe(app,{childList:true,subtree:true});
 window.addEventListener('hashchange',schedule);
 schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();