(function () {
  'use strict';
  const text = value => String(value ?? '');
  const escape = value => text(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const normalize = value => text(value).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
  const tokens = value => normalize(value).trim().split(/\s+/).filter(Boolean);
  const matches = (query, value) => {
    const haystack = normalize(value);
    return tokens(query).every(word => haystack.includes(word));
  };
  const siteHost = url => {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
  };
  const number = value => value === '' || value == null ? null : Number(value);
  const rules = window.ANEligibilityRules;
  const PAGE_SIZE = 24;
  const options = (values, blank) => (blank ? '<option value="">' + escape(blank) + '</option>' : '') +
    values.map(value => '<option>' + escape(value) + '</option>').join('');

  function page() {
    return `
      <div class="an-elig wrap">
        <header class="an-elig-hero">
          <p class="an-elig-kicker">A&amp;N OVERSEAS · STUDENT TOOLS</p>
          <h1>Check My <span>Eligibility</span></h1>
          <p>Compare your qualifications against published admission and scholarship requirements.</p>
          <nav aria-label="Related student tools"><a href="#/universities">Explore Universities ↗</a><a href="#/scholarships">Explore Scholarships ↗</a></nav>
        </header>
        <form id="an-elig-profile">
          <fieldset class="an-elig-panel an-elig-step an-elig-destination"><legend>01 / Destination and programme</legend>
            <h2>Where would you like to study?</h2>
            <div class="an-elig-grid">
            <label>Destination<select name="country"><option value="">All destinations</option></select></label>
            <label>Study level<select name="level" required>${options(['Foundation','Diploma','Bachelor','Master','PhD'], 'Choose level')}</select></label>
            ${picker('goal','Subject or programme','Search or browse subjects','subject')}
            <label>Preferred intake<select name="intake"><option value="">Any published intake</option></select></label>
            <label>Nationality<select name="nationality"></select></label>
            </div><p id="an-elig-intake-note" aria-live="polite"></p>
          </fieldset>
          <fieldset class="an-elig-panel an-elig-step"><legend>02 / Qualifications</legend>
            <h2>What have you studied?</h2>
            <p>Select all qualifications you want to include. Each opens its own form.</p>
            <div class="an-elig-qualifications">${qualifications.map(q=>'<label><input type="checkbox" data-credential value="'+escape(q)+'"> '+escape(q)+'</label>').join('')}</div>
            <div id="an-elig-education"></div>
          </fieldset>
          <fieldset class="an-elig-panel an-elig-step"><legend>03 / English proficiency</legend>
            <h2>How will you demonstrate English?</h2>
            <div class="an-elig-grid">
            <label>English evidence<select name="english">${options(['IELTS','TOEFL iBT','TOEFL PBT','TOEFL CBT','TOEFL Essentials','PTE Academic','MUET','Cambridge English','OET','Duolingo','CEFR','MOI','Other'], 'Choose evidence, if available')}</select></label>
            <label data-english-score hidden>Overall score or level<input name="englishScore" placeholder="e.g. 6.5 or B2"></label>
            <label data-english-test hidden>Individual bands<input name="bands" placeholder="Listening, Reading, Writing, Speaking"></label>
            <label data-english-test hidden>Test date<input name="testDate" type="date"></label>
            ${picker('issuer','MOI / EMI issuing institution','Search institution or abbreviation','issuer',true)}
            </div>
          </fieldset>
          <fieldset class="an-elig-panel an-elig-step"><legend>04 / Experience and skills</legend>
            <h2>What else supports your application?</h2>
            <div class="an-elig-grid">
            <label>Current or most recent job title<input name="jobTitle"></label>
            <label>Employer and industry<input name="employer"></label>
            <label>Relevant work experience (years)<input name="experience" type="number" min="0" step="0.1"></label>
            <label>How does your work relate to this programme?<input name="relevance"></label>
            <label>Professional skills<input name="skills"></label>
            <label>Work hours after Bachelor’s (Chevening)<input name="workHours" type="number" min="0" step="1"></label>
            </div>
          </fieldset>
          <fieldset class="an-elig-panel an-elig-step"><legend>05 / Research and supporting evidence</legend>
            <div class="an-elig-grid">
            <label>Research and publications<input name="research"></label>
            <label>Research proposal<select name="proposal">${options(['Ready','In progress','Not prepared'], 'Select status')}</select></label>
            <label>Professional certificates or awards<input name="awards" placeholder="Name, issuer and year"></label>
            <label>Study gap (years, if applicable)<input name="gap" type="number" min="0" step="0.1"></label>
            </div>
          </fieldset>
          <button type="submit" class="an-elig-primary">Review my information →</button>
          <section id="an-elig-review" class="an-elig-panel" hidden>
            <h2 tabindex="-1">Review your information</h2><div data-review-summary></div>
            <label class="an-elig-confirm"><input type="checkbox" name="confirmed"> I confirm the information above is correct.</label>
            <div class="an-elig-result-head"><button type="button" data-review-edit class="an-elig-secondary">Edit information</button><button type="button" data-confirm-results class="an-elig-primary" disabled>Check My Eligibility →</button></div>
          </section>
        </form>
        <section id="an-elig-results" class="an-elig-panel" aria-label="Eligibility results" hidden>
          <div class="an-elig-result-head"><h2 tabindex="-1">Your Eligibility Results</h2><a href="#an-elig-profile" data-edit-profile>Edit profile ↑</a></div>
          <p id="an-elig-summary"></p>
          <div class="an-elig-tabs" role="group" aria-label="Result sections">
            <button type="button" data-result="goal" aria-pressed="true">Chosen Programme</button>
            <button type="button" data-result="institutions" aria-pressed="false">Universities &amp; Colleges</button>
            <button type="button" data-result="scholarships" aria-pressed="false">Scholarships</button>
          </div>
          <div id="an-elig-output"></div>
        </section>
        <aside class="an-elig-panel an-elig-support">
          <p class="an-elig-kicker">A&amp;N OVERSEAS EDUCATION &amp; CONSULTANCY</p>
          <h2>Need help with your next step?</h2>
          <p>Ask A&amp;N about your application, grade equivalency, English evidence or funding.</p>
          <a class="an-elig-primary" href="#/contact">Contact A&amp;N →</a>
        </aside>
      </div>`;
  }

  const qualifications = ['SSC','HSC','O-Level','A-Level','Foundation','Diploma','Bachelor','Master','PhD','Other'];
  const scales = [['4','CGPA out of 4'],['4.33','GPA out of 4.33'],['5','GPA out of 5'],['7','GPA out of 7'],['10','GPA out of 10'],['20','Grade out of 20'],['100','Percentage out of 100'],['other','Other numeric scale']];
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December','Winter semester'];
  function picker(name, label, placeholder, kind, hidden = false) {
    return `<div class="an-elig-picker" data-picker="${kind}"${hidden ? ' hidden' : ''}>
      <label>${label}<input type="search" name="${name}" placeholder="${placeholder}" autocomplete="off" aria-expanded="false"></label>
      <div class="an-elig-suggestions" hidden></div></div>`;
  }
  const bdBoards = ['Dhaka','Rajshahi','Dinajpur','Cumilla','Chattogram','Jashore','Barishal','Sylhet','Mymensingh','Madrasah','Technical'];
  const bdGroups = ['Science','Business Studies','Humanities'];
  function educationRow(qualification) {
    const row = document.createElement('section');
    const secondary = ['SSC','HSC','O-Level','A-Level'].includes(qualification);
    row.className = 'an-elig-education-row';
    row.dataset.qualification = qualification;
    row.innerHTML = `<h3>${escape(qualification)}</h3><div class="an-elig-grid">
      <label>Country of study<select name="educationCountry"></select></label>
      <div data-secondary-group hidden><label>Group<select name="group">${options(bdGroups,'Choose group')}</select></label></div>
      <div data-secondary-board hidden><label>Education board<select name="board">${options(bdBoards,'Choose board')}</select></label></div>
      <div data-subject-wrap>${picker('subject',secondary?'Subjects or group':'Programme / subject','Search programme','subject')}</div>
      ${picker('institution',secondary?'School / college / examination board':'Institution / university','Search institution','institution')}
      <div data-faculty-wrap${secondary?' hidden':''}><label>Faculty<input name="faculty" placeholder="Faculty at selected institution"></label></div>
      <label>Passing or expected year<input name="year" type="number" min="1900" max="2100"></label>
      <label>Status<select name="completion">${options(['Completed','In progress'])}</select></label>
      <label>Grading scale<select name="gradeScale"><option value="">Choose scale</option>${scales.map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('')}</select></label>
      <label data-custom-scale hidden>Maximum grade<input name="customScale" type="number" min="0.01" step="any"></label>
      <label>Your grade<input name="grade" type="number" min="0" step="any"></label>
      <label data-tertiary>Degree stream<select name="stream">${options(['Science','Non-science'], 'If applicable')}</select></label>
      <label data-tertiary>Honours degree<select name="honours">${options(['Yes','No'], 'If applicable')}</select></label>
      <label data-tertiary>Fully taught in English?<select name="englishMedium">${options(['Yes','No'], 'Not specified')}</select></label>
      <label data-mqa hidden>MQA-recognised institution?<select name="mqa">${options(['Yes','No'], 'Not sure')}</select></label>
      </div>`;
    return row;
  }

  const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  function compareEnglish(rule, profile) {
    if (rule.malaysiaEnglishDegreeWaiver && profile.education.some(row =>
      ['Bachelor','Master','PhD'].includes(row.credential) && row.completion==='Completed' &&
      row.educationCountry==='Malaysia' && row.institution?.trim() && row.englishMedium==='Yes' && row.mqa==='Yes')) {
      return ['conditional', 'Your reported Malaysian qualification fits UPM’s published exemption route, subject to UPM confirming the degree and English-medium evidence'];
    }
    const score = number(profile.englishScore?.trim());
    const minimum = rule.english?.[profile.english];
    if (profile.english === 'MOI') {
      if (rule.rejectsMoi) return ['below', rule.moi];
      if (rule.moi) return ['conditional', rule.moi];
    }
    if (profile.english === 'CEFR' && rule.cefr) {
      const level = cefrLevels.indexOf(profile.englishScore.trim().toUpperCase());
      if (level >= 0) return level >= cefrLevels.indexOf(rule.cefr)
        ? ['met', 'Published English level met'] : ['below', 'Below the published English level'];
    }
    if (minimum != null && Number.isFinite(score) && score >= 0) {
      return score >= minimum ? ['met', 'Published English score met'] : ['below', 'Below the standard score for this test'];
    }
    if (minimum != null || !profile.english) return ['missing', 'Enter a score or level for a published English route'];
    return ['unscored', 'This evidence type has no score comparison for this route'];
  }

  function compareAcademic(rule, profile, result) {
    const minimum = rule.streamMinimum ? rule.streamMinimum[result?.stream] : rule.minimum;
    if (rule.academicText) return ['unscored', 'The programme assesses degree equivalency and academic standing'];
    if (rule.honours && result?.honours === 'No') return ['below', 'A Bachelor’s with Honours is listed'];
    if (minimum == null || result?.scale !== 4 || result.grade == null || (rule.honours && !result.honours)) {
      return ['missing', 'Enter the relevant degree and its CGPA on the published scale, plus stream and honours where applicable'];
    }
    if (result.grade >= minimum) return ['met', 'Published CGPA threshold met'];
    const experience = number(profile.experience);
    if ((rule.conditionalMinimum != null && result.grade >= rule.conditionalMinimum) ||
        (rule.experienceMinimum != null && result.grade >= rule.experienceMinimum &&
          (experience == null || experience >= rule.experienceYears)) || rule.conditionalExperience) {
      return ['conditional', 'Below standard entry · a published alternative route may apply'];
    }
    return ['below', 'Below the published CGPA benchmark for this route'];
  }

  function programmeCard(rule, profile) {
    const previous = profile.education.filter(row => row.credential === rule.previous);
    const result = previous.length === 1 ? previous[0] : null;
    const [academicState, academic] = compareAcademic(rule, profile, result);
    const [englishState, english] = compareEnglish(rule, profile);
    const academicRule = rule.streamMinimum
      ? Object.entries(rule.streamMinimum).map(([stream, score]) => stream + ' ' + score.toFixed(2) + '/4').join(' / ')
      : rule.academicText || rule.minimum + '/4';
    const englishRules = [...Object.entries(rule.english || {}).map(([test, score]) => test + ' ' + score)];
    if (rule.cefr) englishRules.push('CEFR ' + rule.cefr);
    const states = [academicState, englishState];
    const badge = states.includes('below') ? 'Standard benchmark not met'
      : states.includes('conditional') ? 'Alternative route available'
      : states.every(state => state === 'met') ? 'Published score benchmarks met'
      : states.includes('missing') ? 'Profile details needed' : 'Published criteria';
    const country=rule.country || 'Malaysia';
    const policy=window.ANStudyCountry?.policy?.[country];
    const plan=window.ANStudyCountry?.get?.(country);
    const intakeMismatch=profile.intake && rule.intakes?.length && !rule.intakes.includes(profile.intake);
    const visa = country==='Germany'
      ? 'Apply for a study visa with admission and proof of funds. Germany generally issues the initial study residence permit for two years. The 2026 blocked-account benchmark is €11,904, with other eligible proof options.'
      : country==='Malaysia' ? 'Apply for a Student Pass through the institution after admission. Duration depends on the approved pass and programme.' : '';
    const advice=[];
    if (intakeMismatch) advice.push('Selected intake unavailable for this programme. Published alternative: '+rule.intakes.join(' or ')+'.');
    else if (profile.intake && !rule.intakes?.length) advice.push('A&N has yet to record an intake for this programme.');
    if (rule.proposalRequired && profile.proposal!=='Ready') advice.push('Prepare a research proposal aligned with the faculty’s research areas.');
    if (Number(profile.gap)>0) advice.push('No study-gap cutoff is encoded for this programme. Your gap has not been used to reject your profile.');
    if (profile.experience && rule.alternative) advice.push('Document your role, dates and duties with an employer reference if you use an experience-based route.');
    const detail=(label,value)=>value ? '<dt>'+label+'</dt><dd>'+escape(value)+'</dd>' : '';
    return `<article class="an-elig-card"><small>${escape(country)} / ${escape(rule.institution)}</small><h3>${escape(rule.name)}</h3>
      <span class="an-elig-badge">${intakeMismatch ? 'Different intake available' : badge}</span>
      ${intakeMismatch ? '<p>'+escape(advice[0])+'</p>' : ''}
      <details class="an-elig-read"><summary>Read more <span aria-hidden="true">＋</span></summary>
      <dl><dt>Academic</dt><dd>Your profile: ${result?.grade != null ? escape(result.grade + ' / ' + (result.scale ?? 'scale needed')) : 'Add one relevant degree and grade'}.
        Published: ${escape(academicRule)}. <b>${escape(academic)}</b>.</dd>
      ${detail('Subject and additional conditions',rule.subject)}
      <dt>English</dt><dd>Your profile: ${escape((profile.english==='MOI' ? ['MOI / EMI',profile.issuer] : [profile.english,profile.englishScore]).filter(Boolean).join(' ') || 'No evidence entered')}.
        ${englishRules.length ? 'Published scores: ' + escape(englishRules.join(' / ')) + '. ' : ''}
        <b>${escape(english)}</b>. ${escape(rule.englishNotes || '')}</dd>
      ${detail('Intake',rule.intake)}
      ${detail('How to apply',rule.application)}
      ${detail('Application documents',rule.documents)}
      ${detail('Tuition and initial costs',rule.costs)}
      ${detail('Alternative admission route',rule.alternative)}
      </dl>
      ${advice.length ? '<h4>Next steps</h4><ul>'+advice.map(item=>'<li>'+escape(item)+'</li>').join('')+'</ul>' : ''}
      ${policy ? '<h4>Planning for '+escape(country)+'</h4><dl>'+detail('Student visa and duration',visa)+detail('Living costs',policy.living?.length ? policy.living.join('–')+' '+plan.currency+' per month · '+policy.livingType : '')+detail('Working during studies',policy.work)+detail('Dependants and spouse work',policy.spouse)+detail('Post-study routes and permanent residence',policy.pr)+'</dl>' : ''}
      <small>Published criteria reviewed ${escape(rule.checked)} · preliminary comparison of entered information</small>
      </details></article>`;
  }

  function institutionCard(entry) {
    return `<article class="an-elig-card"><small>${escape(entry.country)} · Catalogue listing</small><h3>${escape(entry.name)}</h3>
      <p>Programme requirements have yet to be added to the A&amp;N checker for this listing.</p>
      <a href="#/university/${encodeURIComponent(entry.id)}">University profile ↗</a></article>`;
  }

  function scholarshipCard(item, profile) {
    const rule = rules.scholarships[item.id];
    const secondary = profile.education.find(row => row.credential === 'HSC' && row.scale === 100);
    const comparison = rule?.minimum != null && secondary?.grade != null
      ? 'HSC marks entered: ' + secondary.grade + '%. Published minimum: ' + rule.minimum +
        '%. ' + (secondary.grade >= rule.minimum ? 'Published numeric benchmark met on the supplied scale.' : 'Below the published numeric benchmark on the supplied scale.')
      : rule?.minimum != null ? 'Published minimum: ' + rule.minimum + '% of maximum grade. Enter marks on the original percentage scale if available.' : '';
    const hours = number(profile.workHours);
    const work = rule?.workHours ? 'Post-Bachelor’s work experience: minimum ' + rule.workHours +
      ' hours. ' + (hours == null ? 'Enter your total hours.' :
        'You entered ' + hours + ' hours. ' + (hours >= rule.workHours ? 'Published hours threshold met.' : 'Below the published hours threshold.')) : '';
    const english = rule?.cefr ? 'English: CEFR ' + rule.cefr + ' minimum. ' + compareEnglish(rule, profile)[1] + '.' : '';
    return `<article class="an-elig-card"><small>${escape(item.country)} · ${escape(item.level)}</small><h3>${escape(item.name)}</h3>
      <span class="an-elig-badge">${rule ? 'A&amp;N score comparison' : 'Published award criteria'}</span>
      ${comparison ? '<p>' + escape(comparison) + '</p>' : ''}
      ${english ? '<p>' + escape(english) + '</p>' : ''}
      ${work ? '<p>' + escape(work) + '</p>' : ''}
      <p>${escape(item.eligibility || 'Award eligibility criteria are awaiting entry in the A&N catalogue.')}</p>
      ${item.deadline ? '<p><b>Application window</b> · ' + escape(item.deadline) + '</p>' : ''}
      ${item.coverage ? '<p>' + escape(item.coverage) + '</p>' : ''}
      <a href="#/scholarship/${encodeURIComponent(item.id)}">Scholarship details ↗</a></article>`;
  }

  function mount(root, entries, universityId) {
    const form = root.querySelector('#an-elig-profile');
    if (!form) return;
    const education = form.querySelector('#an-elig-education');
    const results = root.querySelector('#an-elig-results');
    const output = root.querySelector('#an-elig-output');
    const summary = root.querySelector('#an-elig-summary');
    const awards = [...new Map((window.ANScholarships?.items || []).map(item => [item.id, item])).values()];
    let section = universityId ? 'goal' : 'institutions';
    let profile;
    let catalogueReady = false;
    let limit = PAGE_SIZE;
    let search = '';
    let selected = entries.find(entry => entry.id === universityId);
    const catalogueText = entry => [entry.name, entry.short, entry.country, entry.city, ...(entry.programs || [])].join(' ');
    function refreshCountries() {
      selected ||= entries.find(entry => entry.id === universityId);
      const select = form.elements.country;
      const value = select.options.length === 1 ? selected?.country || '' : select.value;
      select.innerHTML = '<option value="">All destinations</option>' +
        options([...new Set(entries.map(entry => entry.country))].sort());
      select.value = value;
    }
    const review = form.querySelector('#an-elig-review');
    const confirmButton = review.querySelector('[data-confirm-results]');
    const intakeNote = form.querySelector('#an-elig-intake-note');
    const countryCodes = 'AF AL DZ AD AO AG AR AM AU AT AZ BS BH BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI KH CM CA CV CF TD CL CN CO KM CG CD CR CI HR CU CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IQ IE IL IT JM JP JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MR MU MX FM MD MC MN ME MA MZ MM NA NR NP NL NZ NI NE NG MK NO OM PK PW PS PA PG PY PE PH PL PT QA RO RU RW KN LC VC WS SM ST SA SN RS SC SL SG SK SI SB SO ZA SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TO TT TN TR TM TV UG UA AE GB US UY UZ VU VA VE VN YE ZM ZW'.split(' ');
    const countryNames = new Intl.DisplayNames(['en'], {type:'region'});
    const educationCountries = countryCodes.map(code=>({code,name:countryNames.of(code)})).sort((a,b)=>a.name.localeCompare(b.name));
    const countryOptions = educationCountries.map(({name})=>'<option>'+escape(name)+'</option>').join('');
    const nationalityOptions = educationCountries.map(({code,name})=>'<option value="'+code+'">'+escape(name)+'</option>').join('');
    form.elements.nationality.innerHTML = nationalityOptions;
    form.elements.nationality.value = 'BD';
    let draft;
    let activePicker;
    let subjectChoices = [];
    let institutionsByCountry = new Map();
    const aliases = {
      'Bangladesh Agricultural University':'BAU', 'University of Dhaka':'DU Dhaka University',
      'Bangladesh University of Engineering and Technology':'BUET', 'North South University':'NSU',
      'Universiti Putra Malaysia':'UPM', 'Universiti Malaya':'UM', 'Universiti Malaysia Terengganu':'UMT',
      'Kuala Lumpur University of Science and Technology':'KLUST IUKL Infrastructure University Kuala Lumpur'
    };
    const boards = ['Dhaka','Rajshahi','Cumilla','Jashore','Chattogram','Barishal','Sylhet','Dinajpur','Mymensingh'].map(name=>name+' Education Board')
      .concat(['Bangladesh Madrasah Education Board','Bangladesh Technical Education Board']);
    function rebuildChoices() {
      const buckets = new Map();
      const subjects = new Set(); // Only programmes recorded in the site directory, not generic international subject vocabularies.
      const add = (country,name,short) => {
        if (!name || !country) return;
        if (!buckets.has(country)) buckets.set(country,new Map());
        const bucket = buckets.get(country);
        const key = normalize(name).trim();
        if (!bucket.has(key)) bucket.set(key,{value:name, hint:country, query:name+' '+(short||'')+' '+(aliases[name]||'')+' '+country});
      };
      entries.forEach(entry=>{
        add(entry.country,entry.name,entry.short);
        if (Array.isArray(entry.programs)) entry.programs.forEach(name=>{if(typeof name==='string' && name.length < 120) subjects.add(name);});
      });
      Object.entries(window.ANEligibilityInstitutions || {}).forEach(([country,names])=>names.forEach(name=>add(country,name)));
      Object.keys(aliases).slice(0,4).forEach(name=>add('Bangladesh',name));
      add('Malaysia','Kuala Lumpur University of Science and Technology');
      boards.forEach(name=>add('Bangladesh',name));
      rules.programmes.forEach(rule=>subjects.add(rule.name.split(' · ').at(-1)==='Coursework' ? rule.name.split(' · ')[0] : rule.name.split(' · ').at(-1)));
      institutionsByCountry = new Map([...buckets].map(([country,bucket])=>[country,[...bucket.values()].sort((a,b)=>a.value.localeCompare(b.value))]));
      subjectChoices = [...subjects].sort((a,b)=>a.localeCompare(b)).map(value=>({value,query:value}));
    }
    function setIntakes() {
      const select = form.elements.intake;
      const previous = select.value;
      const destination = form.elements.country.value;
      const level = form.elements.level.value;
      const candidates = rules.programmes.filter(rule=>(!destination || rule.country===destination || (!rule.country && destination==='Malaysia')) && (!level || rule.level===level));
      const available = new Set(candidates.flatMap(rule=>rule.intakes || []));
      const ordered = monthNames.filter(name=>available.has(name));
      select.innerHTML = options(ordered, 'Any published intake');
      select.value = available.has(previous) ? previous : '';
      intakeNote.textContent = ordered.length ? 'Options reflect programme intakes recorded by A&N for this selection.' : 'A&N has no published intake dates recorded for this selection yet.';
    }
    function closePicker() {
      if (!activePicker) return;
      activePicker.querySelector('.an-elig-suggestions').hidden=true;
      activePicker.querySelector('input').setAttribute('aria-expanded','false');
      activePicker=null;
    }
    function showPicker(box) {
      if (activePicker !== box) closePicker();
      activePicker=box;
      const input=box.querySelector('input');
      const panel=box.querySelector('.an-elig-suggestions');
      const row=box.closest('[data-qualification]');
      const priority=row?.querySelector('[name=educationCountry]').value || countryNames.of(form.elements.nationality.value);
      const type=box.dataset.picker;
      const query=input.value;
      const preferred=institutionsByCountry.get(priority) || [];
      const institution=row?.querySelector('[name=institution]')?.value.trim();
      const matchedEntry=row && institution ? entries.find(entry=>normalize(entry.name)===normalize(institution) && entry.country===priority) : null;
      const verifiedPrograms=matchedEntry && Array.isArray(matchedEntry.programs) ? matchedEntry.programs.filter(p=>typeof p==='string' && p.length<120).map(value=>({value,query:value})) : [];
      const data=type==='subject' ? (row && ['SSC','HSC'].includes(row.dataset.qualification) && priority==='Bangladesh' ? bdGroups.map(value=>({value,query:value})) : row ? verifiedPrograms : subjectChoices) : type==='institution' ? preferred :
        [...preferred,...[...institutionsByCountry].filter(([country])=>country!==priority).flatMap(([,list])=>list)];
      const found=data.filter(item=>matches(query,item.query));
      const shown=found.slice(0,query ? 160 : type==='issuer' ? 120 : found.length);
      panel.innerHTML=shown.length ? shown.map(item=>`<button type="button" data-pick="${escape(item.value)}">${escape(item.value)}${item.hint ? '<small>'+escape(item.hint)+'</small>' : ''}</button>`).join('') : '<p>No verified programme listed for this institution yet. You may type your programme manually; it will not be treated as verified.</p>';
      panel.hidden=false;
      input.setAttribute('aria-expanded','true');
    }
    function syncEnglish() {
      const evidence=form.elements.english.value;
      const isMOI=evidence==='MOI';
      form.querySelectorAll('[data-english-score],[data-english-test]').forEach(label=>label.hidden=!evidence || isMOI);
      form.querySelector('[data-picker=issuer]').hidden=!isMOI;
    }
    function syncEducationCountry(row) {
      const country=row.querySelector('[name=educationCountry]').value;
      const secondary=['SSC','HSC','O-Level','A-Level'].includes(row.dataset.qualification);
      const bangladesh=country==='Bangladesh' && ['SSC','HSC'].includes(row.dataset.qualification);
      row.querySelector('[data-secondary-group]').hidden=!bangladesh;
      row.querySelector('[data-secondary-board]').hidden=!bangladesh;
      row.querySelector('[data-subject-wrap]').hidden=bangladesh;
      row.querySelector('[data-faculty-wrap]').hidden=secondary;
      row.querySelectorAll('[data-tertiary]').forEach(el=>el.hidden=secondary || ['Foundation','Diploma'].includes(row.dataset.qualification));
      row.querySelector('[data-mqa]').hidden=country!=='Malaysia' || secondary;
      if(bangladesh) {
        row.querySelector('[name=gradeScale]').value='5';
        row.querySelector('[name=subject]').value=row.querySelector('[name=group]').value;
      }
    }
    refreshCountries();
    rebuildChoices();
    setIntakes();
    function refreshDirectory(ready) {
      if (!form.isConnected) return;
      catalogueReady = ready;
      refreshCountries();
      rebuildChoices();
      setIntakes();
      if (profile) renderSection(section !== 'goal');
    }
    const directory = window.ANWorldDirectory;
    directory?.loadLocalSnapshot().then(async loaded => {
      refreshDirectory(false);
      await directory.loadPublicDirectory();
      const supplemented = window.ANWorldDirectoryStatus?.source === 'Hipo open directory';
      refreshDirectory(loaded || supplemented);
    });

    function renderSection(keepSearch = false) {
      results.querySelectorAll('[data-result]').forEach(button =>
        button.setAttribute('aria-pressed', String(button.dataset.result === section)));
      const eligibleRules = rules.programmes.filter(rule => rule.level === profile.level);
      const inCountry = entry => !profile.country || entry.country === profile.country;
      const ruleCountry = rule => rule.country || 'Malaysia';
      const goalRules = eligibleRules.filter(rule => (!selected || siteHost(selected.site) === rule.host)
        && (!profile.country || ruleCountry(rule) === profile.country)
        && matches(profile.goal, rule.name));
      const institutions = entries.filter(inCountry);
      const query = search.trim();
      const searching = item => matches(query, item);
      const byProgramme = eligibleRules.filter(rule => (!profile.country || ruleCountry(rule) === profile.country)
        && matches(profile.goal, rule.name) && searching(rule.name + ' ' + rule.institution));
      const rankIntake = list => list.sort((a,b)=>Number(Boolean(b.intakes?.includes(profile.intake)))-Number(Boolean(a.intakes?.includes(profile.intake))));
      rankIntake(goalRules);
      rankIntake(byProgramme);
      const byInstitution = institutions.filter(entry => searching(catalogueText(entry)));
      const goalInstitutions = profile.goal && !selected
        ? institutions.filter(entry => matches(profile.goal, catalogueText(entry))).slice(0, 6) : [];
      const byAward = awards.filter(item => inCountry(item) &&
        normalize(item.level).includes(normalize(profile.level)) &&
        searching(item.name + ' ' + item.country + ' ' + (item.universities || []).join(' ')));
      const resultsCount = section === 'institutions' ? byInstitution.length + byProgramme.length : byAward.length;
      summary.textContent = [profile.level, profile.country || 'All destinations', profile.goal, profile.intake].filter(Boolean).join(' · ');
      if (!keepSearch) output.innerHTML = section === 'goal'
        ? `<h3>${escape(profile.goal || selected?.name || 'Your chosen programme')}</h3>` +
          (goalRules.length ? '<div class="an-elig-cards">'+goalRules.map(rule => programmeCard(rule, profile)).join('')+'</div>'
            : '<p>A&amp;N has yet to add published entry criteria for this programme.</p>') +
          (goalRules.length ? '' : selected ? institutionCard(selected) : '<div class="an-elig-cards">'+goalInstitutions.map(institutionCard).join('')+'</div>')
        : `<label class="an-elig-search">${section === 'institutions' ? 'Search universities or programmes' : 'Search scholarships'}
            <input type="search" data-elig-search value="${escape(search)}"></label>
            <div data-elig-list></div>`;
      if (section !== 'goal') {
        const list = output.querySelector('[data-elig-list]');
        list.innerHTML = '<p role="status">' + (section === 'institutions'
          ? byInstitution.length + ' catalogue institutions · ' + byProgramme.length + ' programmes with checked criteria' +
            (catalogueReady ? '' : ' · Full directory may still be loading')
          : byAward.length + ' scholarships matching level and destination · ' + byAward.filter(item => rules.scholarships[item.id]).length + ' with automatic score comparison') + '</p><div class="an-elig-cards">' +
          (section === 'institutions' ? [...byProgramme.map(item => () => programmeCard(item, profile)),
            ...byInstitution.slice(0, limit).map(item => () => institutionCard(item))].slice(0, limit).map(render => render()).join('')
            : byAward.slice(0, limit).map(item => scholarshipCard(item, profile)).join('')) +
          '</div>' + (!resultsCount ? '<p>Try another search or select all destinations under Edit profile.</p>' : '') +
          (resultsCount > limit ? '<button type="button" class="an-elig-secondary" data-elig-more>Show more results</button>' : '');
      }
    }

    form.addEventListener('change', event => {
      const field=event.target;
      if (field.matches('[data-credential]')) {
        const existing=[...education.children].find(row=>row.dataset.qualification===field.value);
        if (field.checked && !existing) {
          const row=educationRow(field.value);
          const country=row.querySelector('[name=educationCountry]');
          country.innerHTML=countryOptions;
          country.value=countryNames.of(form.elements.nationality.value);
          syncEducationCountry(row);
          education.append(row);
        } else if (existing) existing.remove();
      }
      if (field.name==='country' || field.name==='level') setIntakes();
      if (field.name==='english') syncEnglish();
      if (field.name==='nationality') {
        for (const row of education.children) {
          const country=row.querySelector('[name=educationCountry]');
          if (!row.querySelector('[name=institution]').value) country.value=countryNames.of(field.value);
          syncEducationCountry(row);
        }
      }
      const row=field.closest('[data-qualification]');
      if (field.name==='educationCountry') {
        row.querySelector('[name=institution]').value='';
        syncEducationCountry(row);
      }
      if (field.name==='group') row.querySelector('[name=subject]').value=field.value;
      if (field.name==='institution' && row) { row.querySelector('[name=subject]').value=''; row.querySelector('[name=faculty]').value=''; }
      if (field.name==='gradeScale') row.querySelector('[data-custom-scale]').hidden=field.value!=='other';
      if (field.name==='confirmed') confirmButton.disabled=!field.checked;
    });
    form.addEventListener('focusin', event=>{
      const box=event.target.closest('[data-picker]');
      if (box && event.target.matches('input')) showPicker(box);
      else if (!box) closePicker();
    });
    form.addEventListener('input', event=>{
      const box=event.target.closest('[data-picker]');
      if (box) showPicker(box);
      if (event.target.name==='institution' && event.target.closest('[data-qualification]')) { const row=event.target.closest('[data-qualification]'); row.querySelector('[name=subject]').value=''; row.querySelector('[name=faculty]').value=''; }
      if (event.target.name!=='confirmed') {
        review.hidden=true;
        results.hidden=true;
        draft=null;
        profile=null;
      }
    });
    form.addEventListener('keydown', event=>{
      if (event.key==='Escape') closePicker();
      if (event.key==='ArrowDown' && event.target.matches('[data-picker] input')) {
        event.preventDefault();
        showPicker(event.target.closest('[data-picker]'));
        activePicker.querySelector('[data-pick]')?.focus();
      }
    });
    form.addEventListener('click', event=>{
      if (event.target.matches('[data-picker] input') && !activePicker) showPicker(event.target.closest('[data-picker]'));
      const option=event.target.closest('[data-pick]');
      if (option) {
        const input=option.closest('[data-picker]').querySelector('input');
        input.value=option.dataset.pick;
        input.focus();
        input.dispatchEvent(new Event('input',{bubbles:true}));
        closePicker();
        return;
      }
      if (event.target.closest('[data-review-edit]')) {
        review.hidden=true;
        form.elements.country.focus();
      }
      if (event.target.closest('[data-confirm-results]') && draft && form.elements.confirmed.checked) {
        profile=draft;
        section=profile.goal || selected ? 'goal' : 'institutions';
        limit=PAGE_SIZE;
        search='';
        results.hidden=false;
        renderSection();
        results.querySelector('h2').focus();
        results.scrollIntoView({block:'start'});
      }
    });
    form.addEventListener('submit', event=>{
      event.preventDefault();
      const rows=[...education.children].map(row=>{
        const fields=Object.fromEntries([...row.querySelectorAll('input,select')].map(field=>[field.name,field.value]));
        return {...fields,credential:row.dataset.qualification,grade:number(fields.grade),scale:number(fields.gradeScale==='other' ? fields.customScale : fields.gradeScale)};
      });
      const invalid=rows.findIndex(row=>row.grade!==null && (!Number.isFinite(row.scale) || row.scale<=0 || row.grade>row.scale));
      if (invalid>=0) {
        const field=education.children[invalid].querySelector('[name="grade"]');
        field.setCustomValidity('Choose a grading scale and enter a grade within its maximum.');
        field.reportValidity();
        field.setCustomValidity('');
        return;
      }
      const fields=Object.fromEntries(new FormData(form));
      draft={...fields,nationality:countryNames.of(fields.nationality),education:rows};
      const lines=[
        ['Destination and programme',[draft.country || 'All destinations',draft.level,draft.goal,draft.intake || 'Any published intake',draft.nationality].filter(Boolean).join(' · ')],
        ...rows.map(row=>[row.credential,[row.group || row.subject,row.board,row.faculty,row.institution,row.educationCountry,row.completion,row.year,row.grade!=null ? row.grade+' / '+row.scale : '',row.stream,row.honours ? 'Honours: '+row.honours : '',row.englishMedium ? 'English-taught: '+row.englishMedium : '',row.educationCountry==='Malaysia' && row.mqa ? 'MQA recognition: '+row.mqa : ''].filter(Boolean).join(' · ')]),
        ['English evidence',[draft.english,draft.english==='MOI' ? draft.issuer : [draft.englishScore,draft.bands,draft.testDate].filter(Boolean).join(' · ')].filter(Boolean).join(' · ')],
        ['Work and skills',[draft.jobTitle,draft.employer,draft.experience ? draft.experience+' years' : '',draft.relevance,draft.skills,draft.workHours ? draft.workHours+' post-degree work hours' : ''].filter(Boolean).join(' · ')],
        ['Research and supporting evidence',[draft.research,draft.proposal,draft.awards,draft.gap ? draft.gap+'-year study gap' : ''].filter(Boolean).join(' · ')]
      ];
      review.querySelector('[data-review-summary]').innerHTML='<dl>'+lines.map(([label,value])=>'<dt>'+escape(label)+'</dt><dd>'+escape(value||'Not provided')+'</dd>').join('')+'</dl>';
      form.elements.confirmed.checked=false;
      confirmButton.disabled=true;
      review.hidden=false;
      results.hidden=true;
      review.querySelector('h2').focus();
      review.scrollIntoView({block:'start'});
    });
    results.addEventListener('click', event => {
      const tab = event.target.closest('[data-result]');
      if (tab) {
        section = tab.dataset.result;
        limit = PAGE_SIZE;
        search = '';
        renderSection();
      }
      if (event.target.matches('[data-elig-more]')) {
        limit += PAGE_SIZE;
        renderSection();
        output.querySelector('[data-elig-more]')?.focus({ preventScroll: true });
      }
      if (event.target.closest('[data-edit-profile]')) {
        event.preventDefault();
        form.scrollIntoView({ block: 'start' });
        form.elements.level.focus({ preventScroll: true });
      }
    });
    results.addEventListener('input', event => {
      if (!event.target.matches('[data-elig-search]')) return;
      search = event.target.value;
      limit = PAGE_SIZE;
      renderSection(true);
    });
  }

  window.ANEligibility = { page, mount };
})();
