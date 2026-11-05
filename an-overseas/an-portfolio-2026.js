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
const feeExamples=p=>(Array.isArray(p?.fees)?p.fees:[]).filter(a=>Array.isArray(a)&&a.length>=2).map(r=>{
 const m=String(r[1]||'').match(/(RM|MYR|USD|EUR|GBP|AUD|CAD)\s*([\d,]+(?:\.\d+)?)/i);
 return {name:String(r[0]||'Programme'),raw:String(r[1]||''),basis:String(r[2]||''),amount:m?Number(m[2].replace(/,/g,'')):null,currency:m?(m[1].toUpperCase()==='RM'?'MYR':m[1].toUpperCase()):''};
});
function section(id,html){
 const node=document.createElement('section');node.className='profile-section';node.id='profile-'+id;node.innerHTML=html;return node;
}
function semester(u,p){
 const rows=feeExamples(p),pdfs=[p?.feeSource,...(p?.feeSources||[]).map(x=>x?.[1])].filter(x=>typeof x==='string'&&/\.pdf(?:$|[?#])/i.test(x));
 return section('semester','<h2>Semester fees & costing PDF</h2><p>Compare the exact level, programme, intake, term charges and refund terms on the official university invoice. Published total-programme prices are not first-semester prices.</p>'+
 (rows.length?'<div class="an-fee-examples">'+rows.slice(0,20).map(r=>'<article><b>'+esc(r.name)+'</b><strong>'+esc(r.raw)+'</strong><small>'+esc(r.basis||'Verify duration and exclusions')+'</small></article>').join('')+'</div>':'<p>The current catalogue has no verified programme-specific fee figure for this institution.</p>')+
 (pdfs.length?pdfs.map(x=>source(x,'Official costing PDF')).join(''):'<p>A verified semester-fee PDF has not been added yet. The official fee source below can be used until the PDF is provided.</p>')+
 source(p?.feeSource||u.site,'University fee schedule'));
}
function firstArrival(u,p){
 const c=window.ANStudyCountry?.get?.(u.country)||{},currency=c.currency||'LOCAL',mal=u.country==='Malaysia';
 const types=[
 ['application','University application fee',null],['registration','Registration / orientation',null],
 ['tuition','First payable semester tuition / deposit',null],['institution','Other university charges',null],
 ['emgs','EMGS new student processing (12 months)',mal?1600:null],['eval','eVAL processing',mal?150:null],
 ['ikad','i-Kad',mal?50:null],['medical','Medical screening',mal?250:null],
 ['insurance','Insurance example — GETB Gold 2026',mal?551:null],['pass','Student Pass sticker',mal?60:null],
 ['tax','Service tax on applicable processing fee',mal?128:null],['visa','Country-dependent visa / SEV / MEV',null],
 ['courier','Courier if applicable',mal?10:null],['flight','Air ticket',null],
 ['transfer','Airport / campus arrival transport',null],['housing','Housing deposit / advance',null],
 ['living','First month food, rent and utilities',null],['family','Spouse / family arrival cost',null],
 ['other','Other documented cost',null]
 ];
 const examples=feeExamples(p),known=examples.filter(x=>Number.isFinite(x.amount));
 const choices=known.map((f,i)=>'<option value="'+i+'">'+esc(f.name+' — '+f.raw+' · '+(f.basis||'check fee basis'))+'</option>').join('');
 const picker=known.length?'<label class="an-fee-picker"><span>Published tuition references (not first-instalment invoices)</span><select id="an-fee-example"><option value="">Choose published programme</option>'+choices+'</select><small id="an-fee-reference">Select a programme to see its published amount and basis. First-semester tuition must be entered using the offer invoice.</small></label>':'<p>No published programme amount has been verified for this university. Obtain the official offer and first-semester invoice.</p>';
 const inputs=types.map(([key,label,value])=>'<label><span>'+esc(label)+'</span><input class="an-portfolio-cost-input" data-cost="'+key+'" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Quote in '+esc(currency)+'"'+(value!==null?' value="'+value+'"':'')+'></label>').join('');
 const emgs=mal?'<p class="an-portfolio-alert">Malaysia figures prefilled below are editable 12-month *illustrative* components based on published EMGS and example institution sources. Public-university medical fees, insurance plan, visa, 8% processing-tax scope and other charges may differ. No institution-specific first-semester tuition has been assumed.</p>'+
 source('https://visa.educationmalaysia.gov.my/catalog/product/view/id/7568/category/123/','Official EMGS calculator')+
 source('https://visa.educationmalaysia.gov.my/guidelines/insurance-new-2026','2026 insurance fee options')+
 source('https://www.imi.gov.my/index.php/en/main-services/pass/student-pass/','Immigration Student Pass fee'):'<p class="an-portfolio-alert">Immigration costs are not prefilled for this country. Use its official visa authority and the accepted university offer.</p>';
 return section('arrival','<h2>First-arrival total cost calculator</h2><p>Costing for '+esc(u.name)+' in <strong>'+esc(currency)+'</strong>. Edit each item, and use 0 only when genuinely not applicable.</p>'+picker+emgs+
 '<div class="an-portfolio-cost-grid">'+inputs+'</div><div class="an-portfolio-total" aria-live="polite"><b>Entered subtotal (not a complete quote)</b><output id="an-portfolio-sum">—</output><small id="an-portfolio-remaining"></small></div>'+
 '<p class="cost-note">Not a visa or admission quotation. Show-money is generally separate from spent costs. Amounts converted to BDT use indicative dated rates, not live payment exchange rates.</p>'+source(p?.feeSource||u.site,'Official tuition source')+source(c.visaUrl,'Official visa authority'));
}
function label(node,key,i){
 const [,title,icon]=ORDER[i],number=String(i+1).padStart(2,'0');
 node.id='profile-'+key;node.classList.add('an-portfolio-order');node.dataset.portfolioNumber=number;
 node.querySelector(':scope > header > .an-study-section-icon')?.remove();
 const h=node.querySelector(':scope > h2')||node.querySelector(':scope > header > h3')||node.querySelector('.an-guide-support-head h2');
 if(h){
   h.textContent=title;
   const ic=document.createElement('span');ic.className='an-portfolio-icon';ic.setAttribute('aria-hidden','true');ic.textContent=icon;
   const n=document.createElement('span');n.className='an-portfolio-serial';n.textContent=number;
   h.prepend(ic);h.append(n);
 }
 node.querySelector(':scope > .section-number')?.remove();
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
 if(out)out.textContent=filled.length?(window.ANStudyCountry?.withBdt?.(total,code)||code+' '+total.toLocaleString()):'No amounts entered';
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
 mapped.semester=semester(u,p);mapped.arrival=firstArrival(u,p);
 const support=main.querySelector('#an-university-support');
 if(support)mapped.support=support;
 else mapped.support=section('support','<h2>How A&N Overseas supports you</h2><p>Programme shortlisting, applications, document reviews, scholarship guidance, visa preparation, accommodation, arrivals and student support. No admission or PR is guaranteed.</p><a class="btn" href="#/apply/'+encodeURIComponent(u.id)+'">Apply through A&N ↗</a>');
 const guideHead=planner?.querySelector(':scope > .an-study-header');
 const foot=planner?.querySelector(':scope > .an-study-footer');
 const back=main.querySelector(':scope > .profile-bottom-link');
 const rest=original.filter(n=>n!==planner&&n!==support&&n!==back&&!/^profile-/.test(n.id||''));
 const f=document.createDocumentFragment();
 if(guideHead){guideHead.classList.add('an-portfolio-mini-intro');f.append(guideHead);}
 const jumps=document.createElement('div');jumps.className='an-portfolio-jumps';
 jumps.innerHTML=ORDER.map(([key,title],i)=>'<button data-profile-jump="'+key+'" title="'+esc(title)+'"><b>'+String(i+1).padStart(2,'0')+'</b>'+esc(title)+'</button>').join('');
 f.append(jumps);
 const expand=document.createElement('button');expand.type='button';expand.className='an-portfolio-jumps-toggle';expand.textContent='Show all 20 sections ↓';expand.addEventListener('click',()=>{const on=jumps.classList.toggle('expanded');expand.textContent=on?'Show fewer sections ↑':'Show all 20 sections ↓';});f.append(expand);
 ORDER.forEach(([key],i)=>{const n=mapped[key]||fallback(key,u);label(n,key,i);f.append(n);});
 rest.forEach(n=>mapped.support.append(n));
 if(foot)mapped.support.append(foot);if(back)mapped.support.append(back);
 main.replaceChildren(f);
 const banner=wrap.querySelector('.profile-banner .wrap'),nav=wrap.querySelector('.profile-navigation');
 if(banner&&nav){
  banner.append(nav);nav.classList.add('an-portfolio-topnav');
  const list=nav.querySelector('nav');
  if(list)list.innerHTML=ORDER.map(([key,title],i)=>'<button data-profile-jump="'+key+'"><span>'+String(i+1).padStart(2,'0')+'</span>'+esc(title)+'</button>').join('');
  nav.querySelector('details')?.removeAttribute('open');
 }
 const picker=main.querySelector('#an-fee-example');
 if(picker){
  const all=feeExamples(p).filter(x=>Number.isFinite(x.amount));
  picker.addEventListener('change',()=>{const r=all[Number(picker.value)],note=main.querySelector('#an-fee-reference');if(note)note.textContent=picker.value!==''&&r?('Published: '+r.raw+'; '+r.basis+'. Enter actual first instalment below.'): 'Choose a programme to see the published tuition basis.';});
 }
 main.addEventListener('input',e=>{if(e.target.matches('.an-portfolio-cost-input'))updateTotal(main,u);});
 updateTotal(main,u);
}
window.ANPortfolio2026={ORDER,apply};
})();