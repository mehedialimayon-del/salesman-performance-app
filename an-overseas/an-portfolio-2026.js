/* A&N university portfolio: same twenty-section order for every country. */
(function(){
'use strict';
const ORDER=[
['overview','University history','🏛️'],['campus','Campus and student life','🌳'],['programmes','Courses & Programmes','📚'],
['education','Education: Bachelor, Master, PhD','🎓'],['scholarships','Scholarships, university funds & proposal support','🏅'],
['entry','Entry Requirements & Intake','📋'],['fees','Tuition and study cost','💳'],['semester','Semester fees & costing PDF','📄'],
['degree','Degree-wise application guide','📝'],['settlement','Post-study work, PR & settlement','🛂'],
['research','Research, international community & academic contacts','🔬'],['jobs','Student jobs & graduate career sectors','💼'],
['spouse','Spouse / partner & dependant options','👪'],['accommodation','Accommodation & housing','🏠'],
['living','Housing, monthly living & spouse living costs','🧾'],['visa','Student visa & arrival','🛫'],
['arrival','First-arrival total cost calculator','🧮'],['ranking','Ranking & official sources','🏆'],
['checklist','Student Applicant Checklist','✅'],['support','How A&N Overseas supports you','🤝']
];
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const source=(href,label)=>/^https:\/\//.test(String(href||''))?'<a class="source-link" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+' ↗</a>':'';
const feeExamples=(u,p)=>(window.ANUniGuide?.tuitionRows(u,p)||[]).map(r=>{
 const m=String(r[1]||'').match(/(RM|MYR|USD|EUR|GBP|AUD|CAD)\s*([\d,]+(?:\.\d+)?)/i);
 return {name:String(r[0]||'Programme'),raw:String(r[1]||''),basis:String(r[2]||''),source:r[3],amount:m?Number(m[2].replace(/,/g,'')):null,currency:m?(m[1].toUpperCase()==='RM'?'MYR':m[1].toUpperCase()):''};
});
function section(id,html){
 const node=document.createElement('section');node.className='profile-section';node.id='profile-'+id;node.innerHTML=html;return node;
}
function tuitionCards(rows){
 return rows.length?'<div class="an-fee-examples">'+rows.map(r=>'<article><b>'+esc(r.name)+'</b><strong>'+esc(r.raw)+'</strong><small>'+esc(r.basis)+'</small>'+source(r.source,'Fee reference')+'</article>').join('')+'</div>':
 '<p class="cost-note">A programme-specific tuition amount is awaiting verification for this university.</p>';
}
function tuition(u,p){
 const rows=feeExamples(u,p);
 return section('fees','<h2>Tuition and study cost</h2>'+tuitionCards(rows)+
 (rows.length&&p.feeNote?'<p class="cost-note">'+esc(p.feeNote)+'</p>':'')+
 '<p>Budget separately for visa processing, travel and living costs. Use the first-arrival calculator below to enter the actual first instalment from your offer.</p>'+
 (rows.length&&p.feeSource!==u.site?source(p.feeSource,'Published fee reference'):''));
}
function semester(u,p){
 const rows=feeExamples(u,p);
 const termRows=rows.filter(r=>/^(?:first|1st|per) semester\b/i.test(r.basis));
 const pdfs=[...new Set([p.feeSource,...(p.feeSources||[]).map(x=>x?.[1]),...rows.map(r=>r.source)])]
  .filter(x=>typeof x==='string'&&/\.pdf(?:$|[?#])/i.test(x));
 return section('semester','<h2>Semester fees & costing PDF</h2>'+
 (termRows.length?tuitionCards(termRows):'<p>First-semester amount awaiting verification. Use the offer invoice for the payable instalment, registration, deposits and refund terms.</p>')+
 pdfs.map(x=>source(x,'Published fee PDF')).join(''));
}
const immigration='https://www.imi.gov.my/index.php/en/main-services/pass/student-pass/';
const dhakaVisa='https://www.kln.gov.my/web/bgd_dhaka/faqs';
const emgsTracking='https://visa.educationmalaysia.gov.my/track-my-application';
const steps=items=>'<ol class="visa-steps">'+items.map(([title,body])=>'<li><b>'+title+'</b><span>'+body+'</span></li>').join('')+'</ol>';
function malaysiaStudentVisa(){
 return section('visa','<h2>Student visa & arrival</h2>'+
 '<p>Malaysia Student Pass guide for applicants from Bangladesh. The progress figures below are Student Pass milestones published by Universiti Malaya. Read the actual status and approval letters for your own file.</p>'+
 steps([
  ['1. Before submission','Accept the offer. Prepare your passport, photo, offer letter, transcripts and certificates, English evidence where required, and health declaration. Submit through the institution or the authorised EMGS route while outside Malaysia.'],
  ['2. EMGS review and Immigration approval','EMGS screens the documents and sends complete cases to Immigration for eVAL approval. EMGS aims to process complete Student Pass applications within 14 working days. Entry visa, travel and endorsement take additional time.'],
  ['3. About 70% · eVAL stage','Download the approved eVAL. Apply from Bangladesh for your own Student Single Entry Visa through the official Malaysian eVISA route. Carry your passport, eVAL, approved visa and offer letter on arrival.'],
  ['4. About 80% · medical and passport submission','Report to the institution and complete the required medical screening within 7 days of arrival. Once the medical clears and the institution requests your passport, submit it for endorsement.'],
  ['5. About 100% · Student Pass endorsed','Collect or verify the issued Student Pass with your university. The spouse application can begin once the principal Student Pass is issued and the institution’s prerequisites are met.']
 ])+
 source(immigration,'Malaysia Immigration rules')+
 source('https://aasd.um.edu.my/visa/student%20pass/Visa%20Application%20Guidelines%20For%20international%20Students.pdf','UM student progress milestones')+
 source('https://visa.educationmalaysia.gov.my/track-my-application-terms-and-conditions/','EMGS timing')+
 source(emgsTracking,'Track the actual application')+
 source('https://malaysiavisa.imi.gov.my','Malaysia eVISA'));
}
function malaysiaSpouse(){
 return section('spouse','<h2>Spouse / partner & dependant options</h2>'+
 '<p><b>Who can apply?</b> Malaysia Immigration’s published higher-education route covers the legally married spouse of a valid Master’s or PhD Student Pass holder at an eligible institution. Taught and research Master’s applicants should confirm their specific programme and campus with the visa office. Bachelor’s, foundation, diploma and language-course students from Bangladesh should plan on this route being unavailable. The Dependant Pass carries no work or business permission.</p>'+
 steps([
  ['1. When to apply and whether you can fly together','Prepare documents before departure. The student normally travels first, completes the medical screening and obtains the endorsed Student Pass. The spouse cannot use the student’s eVAL. Travel together only if the spouse already has a separate lawful entry basis and the institution confirms the proposed dependant process in writing. Do not book on the assumption that a visitor entry can be converted. UPM, for example, requires the principal pass to have at least 6 months of validity.'],
  ['2. Prepare marriage documents in Bangladesh','Collect the original registered marriage certificate and Nikah Nama or Kabin Nama from the relevant marriage registrar. Obtain a certified English translation where required. Follow Bangladesh MOFA’s eApostille process. For older documents handled under the legacy route, obtain the applicable Law Ministry and Bangladesh MOFA Consular Wing attestations in Dhaka. Bring originals and copies.'],
  ['3. Bangladesh High Commission in Kuala Lumpur','If the university requires embassy certification or a relationship letter, take the marriage documents, passport copies of both spouses and the student’s pass copy to the Bangladesh High Commission’s consular service. Its marriage-document attestation requires one applicant in person. The published attestation options are RM 42 within 3 working days or RM 63 for same-working-day service. Ask separately about the relationship letter if required.'],
  ['4. Assemble the application and bank evidence','Prepare the student passport and Student Pass, spouse passport and requested page copies, photos, enrolment or university support letter, certified proof of marriage, health insurance and Immigration forms IM.38 and IM.55 as requested. The university may request a bank-certified three-month statement, sponsorship or income evidence, and housing proof. Nottingham Malaysia lists RM 10,000 per dependant in the student’s Malaysian bank account. UTHM’s checklist uses a different basis, RM 10,000 average per month per family over three months. Confirm the amount and account rules for your own institution. Proof of funds is separate from the fees you pay.'],
  ['5. Submit a separate spouse application','The university visa office submits or coordinates the Dependant Pass case through its applicable EMGS/STARS and Immigration route. Ask for the reference, submission date and passport instructions. Track document review, Immigration decision and endorsement using the actual case status. There is no verified universal spouse percentage sequence or processing deadline. Nottingham Malaysia publishes a 4–6 week estimate, which can vary.'],
  ['6. Entry visa in Bangladesh and travel','If the spouse is in Bangladesh, ask the visa office which entry route Immigration authorises before purchasing tickets. If it requires a visa with reference, use the spouse’s own approval/reference and the applicable official eVISA or High Commission-authorised submission route. Keep passport and copies, photos, approval, student pass and enrolment evidence, certified marriage documents and financial proof ready. Carry the approved entry visa and supporting papers on the flight, then follow the institution’s instructions for passport submission or endorsement.']
 ])+
 '<p class="cost-note"><b>Published fee components.</b> EMGS lists RM 250 for a new Dependant Pass application before applicable service tax. Immigration lists RM 90 for the pass. Budget separately for insurance, nationality-specific visa charges, university fees and the RM 500 Journey Performed charge if it applies to the approved route.</p>'+
 source(immigration,'Malaysia Immigration eligibility')+
 source('https://www.imi.gov.my/wp-content/uploads/2022/06/6.-CHECKLIST-DEPENDENTS.pdf','Immigration document checklist')+
 source('https://mofa.gov.bd/pages/static-pages/694032bf35ce18e1c0561b1f','Bangladesh MOFA marriage certificate')+
 source('https://www.bdhckl.gov.bd/consular-services/','Bangladesh High Commission in Kuala Lumpur')+
 source(dhakaVisa,'Malaysia High Commission in Dhaka')+
 source('https://intl.upm.edu.my/visa_pas/dependent-8453','UPM validity example')+
 source('https://www.nottingham.edu.my/International/Offerholders/Visasandimmigration/Special-Circumstances.aspx','Nottingham processing and bank example')+
 source('https://io.uthm.edu.my/images/Visa%20%20Pass/Form%20Dependent%20Visa-New%20update.pdf','UTHM bank evidence example')+
 source('https://visa.educationmalaysia.gov.my/media/cms_upload/Schedule_fees_for_student_dependant_pass_app_28.10.2025.pdf','EMGS student and dependant charges'));
}
function firstArrival(u,p){
 const c=window.ANStudyCountry?.get?.(u.country)||{},currency=c.currency||'LOCAL',mal=u.country==='Malaysia';
 const types=[
 ['application','University application fee',null],['registration','Registration / orientation',null],
 ['tuition','First payable semester tuition / deposit',null],['institution','Other university charges',null],
 ['emgs','EMGS new student processing (12 months)',mal?1600:null],['eval','eVAL processing',mal?150:null],
 ['ikad','i-Kad',mal?50:null],['medical','Medical screening',mal?250:null],
 ['insurance','Insurance example — GETB Gold 2026',mal?551:null],['pass','Student Pass sticker',mal?60:null],
 ['tax','8% service tax on EMGS processing and eVAL',mal?140:null],['visa','Country-dependent visa / SEV / MEV',null],
 ['courier','Courier if applicable',mal?10:null],['flight','Air ticket',null],
 ['transfer','Airport / campus arrival transport',null],['housing','Housing deposit / advance',null],
 ['living','First month food, rent and utilities',null],['family','Spouse / family arrival cost',null],
 ['other','Other documented cost',null]
 ];
 const examples=feeExamples(u,p),known=examples.filter(x=>Number.isFinite(x.amount));
 const choices=known.map((f,i)=>'<option value="'+i+'">'+esc(f.name+' — '+f.raw+' · '+(f.basis||'check fee basis'))+'</option>').join('');
 const picker=known.length?'<label class="an-fee-picker"><span>Published tuition references (not first-instalment invoices)</span><select id="an-fee-example"><option value="">Choose published programme</option>'+choices+'</select><small id="an-fee-reference">Select a programme to see its published amount and basis. First-semester tuition must be entered using the offer invoice.</small></label>':'<p>Programme tuition is awaiting verification. Enter the first instalment shown on your offer invoice.</p>';
 const inputs=types.map(([key,label,value])=>'<label><span>'+esc(label)+'</span><input class="an-portfolio-cost-input" data-cost="'+key+'" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Quote in '+esc(currency)+'"'+(value!==null?' value="'+value+'"':'')+'></label>').join('');
 const emgs=mal?'<p class="an-portfolio-alert">Malaysia figures prefilled below are editable 12-month illustrative components based on published EMGS and example institution sources. Public-university medical fees, insurance plan, visa, 8% processing-tax scope and other charges may differ. No institution-specific first-semester tuition has been assumed.</p>'+
 source('https://visa.educationmalaysia.gov.my/catalog/product/view/id/7568/category/123/','Official EMGS calculator')+
 source('https://visa.educationmalaysia.gov.my/guidelines/insurance-new-2026','2026 insurance fee options')+
 source('https://www.imi.gov.my/index.php/en/main-services/pass/student-pass/','Immigration Student Pass fee'):'<p class="an-portfolio-alert">Immigration costs are not prefilled for this country. Use its official visa authority and the accepted university offer.</p>';
 return section('arrival','<h2>First-arrival total cost calculator</h2><p>Costing for '+esc(u.name)+' in <strong>'+esc(currency)+'</strong>. Edit each item, and use 0 only when genuinely not applicable.</p>'+picker+emgs+
 '<div class="an-portfolio-cost-grid">'+inputs+'</div><div class="an-portfolio-total" aria-live="polite"><b>Entered subtotal (not a complete quote)</b><output id="an-portfolio-sum">—</output><small id="an-portfolio-remaining"></small></div>'+
 '<p class="cost-note">Not a visa or admission quotation. Show-money is generally separate from spent costs. Amounts converted to BDT use indicative dated rates, not live payment exchange rates.</p>'+source(c.visaUrl,'Official visa authority'));
}
function label(node,key,i){
 const [,title,icon]=ORDER[i],number=String(i+1).padStart(2,'0');
 node.id='profile-'+key;node.classList.add('an-portfolio-order');node.dataset.portfolioNumber=number;
 node.querySelector(':scope > header > .an-study-section-icon')?.remove();
 const h=node.querySelector(':scope > h2')||node.querySelector(':scope > header > h3')||node.querySelector('.an-guide-support-head h2');
 if(h){
   const divider=title.indexOf(' ');
   const name=document.createElement('span');
   name.className='an-portfolio-heading-text';
   const accent=document.createElement('span');
   accent.className='an-portfolio-heading-accent';
   accent.textContent=divider<0?title:title.slice(0,divider);
   name.append(accent,title.slice(accent.textContent.length));
   h.replaceChildren(name);
   const ic=document.createElement('span');ic.className='an-portfolio-icon';ic.setAttribute('aria-hidden','true');ic.textContent=icon;
   const n=document.createElement('span');n.className='an-portfolio-serial';n.textContent=number;
   h.prepend(ic);h.append(n);
 }
 node.querySelector(':scope > .section-number')?.remove();
}
function highlightDetails(section,u){
 const terms=/\b(?:admission requirements|admission information|recognised qualifications|teaching locations|campus address|application deadline|tuition fees?|entry requirements|official university website|student pass|scholarships?|intake dates?)\b/i;
 const name=String(u.name||'');
 for(const p of section.querySelectorAll('p')){
  const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  let budget=2;
  for(const node of nodes){
   if(!budget)break;
   if(node.parentElement.closest('a,strong,b,em,.an-portfolio-detail-accent'))continue;
   const value=node.data;
   const index=name?value.indexOf(name):-1;
   const match=index<0?terms.exec(value):null;
   const start=index>=0?index:match?.index;
   if(start===undefined)continue;
   const text=index>=0?name:match[0];
   const accent=document.createElement('strong');
   accent.className='an-portfolio-detail-accent';
   accent.textContent=text;
   node.replaceWith(value.slice(0,start),accent,value.slice(start+text.length));
   budget--;
  }
 }
}
function fallback(id,u){
 const title=ORDER.find(x=>x[0]===id)?.[1]||id;
 return section(id,'<h2>'+esc(title)+'</h2><p>University-specific information has not been verified in this catalogue. Confirm the current details and application route with the official institution.</p>'+source(u.site,'Official university website'));
}
function updateTotal(main,u){
 const fields=[...main.querySelectorAll('.an-portfolio-cost-input')],filled=fields.filter(x=>x.value.trim()!==''&&Number.isFinite(+x.value)&&+x.value>=0);
 const total=filled.reduce((sum,x)=>sum+Number(x.value),0),missing=fields.length-filled.length;
 const code=window.ANStudyCountry?.get?.(u.country)?.currency||'LOCAL';
 const out=main.querySelector('#an-portfolio-sum');
 if(out){
  out.replaceChildren();
  if(!filled.length)out.textContent='No amounts entered';
  else{
   const amount=document.createElement('span');
   amount.className=code==='MYR'?'an-currency-myr':'';
   amount.textContent=total.toLocaleString('en-US',{maximumFractionDigits:2})+' '+code;
   out.append(amount);
   const conversion=window.ANStudyCountry?.bdt?.(total,code);
   if(conversion){
    const taka=document.createElement('span');
    if(conversion.startsWith('(≈'))taka.className='an-currency-bdt';
    taka.textContent=conversion;
    out.append(' ',taka);
   }
  }
 }
 const remaining=main.querySelector('#an-portfolio-remaining');
 if(remaining)remaining.textContent=missing?missing+' categories have no quotes yet; this subtotal is not the total cost.':'All fields entered — estimated figure only, not an official invoice.';
}
function apply(u,p){
 const wrap=document.querySelector('.university-profile'),main=wrap?.querySelector('.profile-body');
 if(!main||main.dataset.orderReady==='1')return;
 main.dataset.orderReady='1';document.body.classList.add('an-portfolio-v2');p=p||{};
 const planner=main.querySelector('#an-student-planner');
 const mapped={},original=[...main.children];
 original.forEach(n=>{if(/^profile-/.test(n.id||''))mapped[n.id.slice(8)]=n;});
 if(planner)for(const n of planner.querySelectorAll(':scope > .an-study-section')){
  const title=(n.querySelector('h3')?.textContent||'').toLowerCase();
  const key=title.includes('education:')?'education':title.includes('scholarships,')?'scholarships':title.includes('student jobs')?'jobs':title.includes('spouse /')?'spouse':title.includes('housing,')?'living':title.includes('post-study')?'settlement':title.includes('research,')?'research':title.includes('applicant checklist')?'checklist':'';
  if(key)mapped[key]=n;
 }
 mapped.fees=tuition(u,p);mapped.semester=semester(u,p);mapped.arrival=firstArrival(u,p);
 if(u.country==='Malaysia'){
  mapped.visa=malaysiaStudentVisa();
  mapped.spouse=malaysiaSpouse();
 }
 const support=main.querySelector('#an-university-support');
 if(support)mapped.support=support;
 else mapped.support=section('support','<h2>How A&N Overseas supports you</h2><p>Programme shortlisting, applications, document reviews, scholarship guidance, visa preparation, accommodation, arrivals and student support. No admission or PR is guaranteed.</p><a class="btn" href="#/apply/'+encodeURIComponent(u.id)+'">Apply through A&N ↗</a>');
 const guideHead=planner?.querySelector(':scope > .an-study-header');
 const foot=planner?.querySelector(':scope > .an-study-footer');
 const back=main.querySelector(':scope > .profile-bottom-link');
 // The CMS's semester PDF and scholarship card belong in their existing numbered sections, never after A&N support.
 const extras=original.find(n=>n.classList?.contains('an-university-extras'));
 if(extras){
  const pdf=extras.querySelector('.an-uni-feature:not(.an-uni-offer)');
  const availablePdf=pdf?.querySelector('.an-uni-pdf-buttons');
  if(availablePdf){
   [...mapped.semester.querySelectorAll('p')].filter(n=>/pdf has not been added yet|No verified official semester-fee pdf/i.test(n.textContent)).forEach(n=>n.remove());
   mapped.semester.append(pdf);
  }
  const scholarship=extras.querySelector('.an-uni-offer');
  if(scholarship)mapped.scholarships.append(scholarship);
 }
 const rest=original.filter(n=>n!==planner&&n!==support&&n!==back&&!n.classList?.contains('an-university-extras')&&!/^profile-/.test(n.id||''));
 const f=document.createDocumentFragment();
 if(guideHead){guideHead.classList.add('an-portfolio-mini-intro');f.append(guideHead);}
 const jumps=document.createElement('div');jumps.className='an-portfolio-jumps';
 jumps.innerHTML=ORDER.map(([key,title],i)=>'<button data-profile-jump="'+key+'" title="'+esc(title)+'"><b>'+String(i+1).padStart(2,'0')+'</b>'+esc(title)+'</button>').join('');
 f.append(jumps);
 const expand=document.createElement('button');expand.type='button';expand.className='an-portfolio-jumps-toggle';expand.textContent='Show all 20 sections ↓';expand.addEventListener('click',()=>{const on=jumps.classList.toggle('expanded');expand.textContent=on?'Show fewer sections ↑':'Show all 20 sections ↓';});f.append(expand);
 ORDER.forEach(([key],i)=>{const n=mapped[key]||fallback(key,u);label(n,key,i);highlightDetails(n,u);f.append(n);});
 rest.forEach(n=>mapped.support.append(n));
 if(foot)mapped.support.append(foot);if(back)mapped.support.append(back);
 main.replaceChildren(f);
 // Put "On this page" in the free left column of the short planning bar, never over the QS ranking.
 const guideBar=main.querySelector('.an-portfolio-mini-intro'),nav=wrap.querySelector('.profile-navigation');
 if(guideBar&&nav){
  guideBar.prepend(nav);nav.classList.add('an-portfolio-topnav');
  const list=nav.querySelector('nav');
  if(list)list.innerHTML=ORDER.map(([key,title],i)=>'<button data-profile-jump="'+key+'"><span>'+String(i+1).padStart(2,'0')+'</span>'+esc(title)+'</button>').join('');
  nav.querySelector('details')?.removeAttribute('open');
 }
 const picker=main.querySelector('#an-fee-example');
 if(picker){
  const all=feeExamples(u,p).filter(x=>Number.isFinite(x.amount));
  picker.addEventListener('change',()=>{const r=all[Number(picker.value)],note=main.querySelector('#an-fee-reference');if(note)note.textContent=picker.value!==''&&r?('Published: '+r.raw+'; '+r.basis+'. Enter actual first instalment below.'): 'Choose a programme to see the published tuition basis.';});
 }
 main.addEventListener('input',e=>{if(e.target.matches('.an-portfolio-cost-input'))updateTotal(main,u);});
 updateTotal(main,u);
}
window.ANPortfolio2026={ORDER,apply};
})();