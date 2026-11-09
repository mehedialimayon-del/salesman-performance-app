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
  const official = (url, label) => /^https?:\/\//i.test(text(url))
    ? '<a href="' + escape(url) + '" target="_blank" rel="noopener noreferrer">' + escape(label) + ' ↗</a>' : '';
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
          <p>আপনার পছন্দের প্রোগ্রামে কী লাগবে, আর বর্তমান যোগ্যতায় কোথায় আবেদন করতে পারবেন, এক জায়গায় দেখুন।</p>
          <nav aria-label="Related student tools"><a href="#/universities">Explore Universities ↗</a><a href="#/scholarships">Explore Scholarships ↗</a></nav>
        </header>
        <form id="an-elig-profile" class="an-elig-panel">
          <h2>Your Current Profile</h2>
          <p>যা জানা আছে দিন। স্কোরের সঙ্গে মূল স্কেল দিন। এই ফর্মের তথ্য এই পেজেই থাকে।</p>
          <fieldset><legend>01 · Study goal</legend><div class="an-elig-grid">
            <label>Study level<select name="level" required>${options(['Foundation','Diploma','Bachelor','Master','PhD'], 'Choose level')}</select></label>
            <label>Desired programme or subject<input name="goal" placeholder="e.g. Aquaculture"></label>
            <label>Destination<select name="country"><option value="">All destinations</option></select></label>
            <label>Preferred intake<input name="intake" type="month"></label>
            <label>Nationality<input name="nationality" value="Bangladesh" autocomplete="country-name"></label>
          </div></fieldset>
          <fieldset><legend>02 · Academic history</legend>
            <p>আপনার ক্ষেত্রে প্রযোজ্য শিক্ষাগত যোগ্যতাগুলো যোগ করুন।</p>
            <div id="an-elig-education"></div><button type="button" class="an-elig-secondary" data-add-education>Add qualification +</button>
          </fieldset>
          <fieldset><legend>03 · English and achievements</legend><div class="an-elig-grid">
            <label>English evidence<select name="english">${options(['IELTS','TOEFL iBT','PTE Academic','MUET','CEFR','MOI','Other'], 'Select evidence')}</select></label>
            <label>Overall score or level<input name="englishScore" placeholder="e.g. 6.5 or B2"></label>
            <label>Individual bands<input name="bands" placeholder="Listening, Reading, Writing, Speaking"></label>
            <label>Test date<input name="testDate" type="date"></label>
            <label>MOI issuer / other English evidence<input name="issuer"></label>
            <label>Relevant experience (years)<input name="experience" type="number" min="0" step="0.1"></label>
            <label>Research, publications and work<input name="research"></label>
            <label>Awards, training and certificates<input name="awards"></label>
          </div></fieldset>
          <button type="submit" class="an-elig-primary">Check My Eligibility →</button>
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
          <p>MOI, গ্রেডের সমমান, স্কলারশিপ বা আবেদন নিয়ে A&amp;N টিমের সঙ্গে কথা বলুন।</p>
          <a class="an-elig-primary" href="#/contact">Contact A&amp;N →</a>
        </aside>
      </div>`;
  }

  function educationRow() {
    const row = document.createElement('div');
    row.className = 'an-elig-grid an-elig-education-row';
    row.innerHTML = `
      <label>Qualification<select name="credential">${options(['SSC','HSC','Foundation','Diploma','Bachelor','Master','PhD','Other'], 'Select qualification')}</select></label>
      <label>Subject or group<input name="subject"></label>
      <label>Institution / board<input name="institution"></label>
      <label>Passing year<input name="year" type="number" min="1900" max="2100"></label>
      <label>Grade<input name="grade" type="number" min="0" step="any"></label>
      <label>Maximum grade<input name="scale" type="number" min="0.01" step="any" placeholder="4, 5 or 100"></label>
      <button type="button" class="an-elig-secondary" data-remove-education>Remove qualification</button>`;
    return row;
  }

  function evaluate(rule, profile) {
    const previous = profile.education.filter(row => row.credential === rule.previous);
    const result = previous.length === 1 ? previous[0] : null;
    const comparable = result?.scale === 4 && result.grade !== null;
    const academic = comparable
      ? result.grade >= rule.minimum ? 'Published CGPA threshold met' : 'Below standard CGPA threshold · review alternate entry'
      : 'Qualification or CGPA equivalency needs review';
    const requirement = rule.english?.[profile.english];
    const score = number(profile.englishScore);
    let english = 'Check applicable English evidence with the university';
    if (requirement != null && Number.isFinite(score) && profile.englishScore.trim()) {
      english = score >= requirement ? 'Published overall threshold met · confirm validity' : 'Below the published threshold for this test';
    } else if (profile.english === 'MOI' && rule.moi) {
      english = 'Published waiver route · evidence needs review';
    }
    return { result, comparable, academic, english };
  }

  function programmeCard(rule, profile) {
    const { result, academic, english } = evaluate(rule, profile);
    const englishRule = rule.english
      ? [...Object.entries(rule.english).map(([test, score]) => test + ' ' + score), 'CEFR ' + rule.cefr].join(' / ')
      : 'Confirm the international entry policy';
    return `<article class="an-elig-card"><small>${escape(rule.institution)}</small><h3>${escape(rule.name)}</h3>
      <span class="an-elig-badge">Needs Verification</span>
      <dl><dt>Academic</dt><dd>Your profile: ${result?.grade != null ? escape(result.grade + ' / ' + (result.scale ?? 'scale needed')) : 'Provide the relevant qualification and grade'}.
        Published: ${rule.minimum}/4 · ${escape(rule.thresholdScope || 'standard entry')}. <b>${escape(academic)}</b>.</dd>
      <dt>Subject</dt><dd>Your profile: ${escape(result?.subject || 'Provide your subject')}. Published: ${escape(rule.subject)}.</dd>
      <dt>English</dt><dd>Your profile: ${escape([profile.english, profile.englishScore].filter(Boolean).join(' ') || 'Provide your English evidence')}.
        Published: ${escape(englishRule)}. <b>${escape(english)}</b>.</dd>
      <dt>Intake</dt><dd>Check the official application window${profile.intake ? ' for ' + escape(profile.intake) : ''}.</dd></dl>
      <p>${escape(rule.alternative)} ${profile.english === 'MOI' ? escape(rule.moi || '') : ''}</p>
      ${official(rule.source, 'Official programme requirements')}${official(rule.academicSource, 'Graduate school entry policy')} <small>Reviewed ${escape(rule.checked)}</small></article>`;
  }

  function institutionCard(entry) {
    return `<article class="an-elig-card"><small>${escape(entry.country)} · Catalogue listing</small><h3>${escape(entry.name)}</h3>
      <span class="an-elig-badge">Needs Verification</span>
      <p>Review the institution’s official programme and international entry requirements.</p>
      <a href="#/university/${encodeURIComponent(entry.id)}">University profile ↗</a>
      ${official(entry.site, 'Official website')}</article>`;
  }

  function scholarshipCard(item, profile) {
    const rule = rules.scholarships[item.id];
    const secondary = profile.education.find(row => row.credential === 'HSC' && row.scale === 100);
    const comparison = rule && secondary?.grade != null
      ? 'HSC marks entered: ' + secondary.grade + '%. Published minimum: ' + rule.minimum +
        '%. ' + (secondary.grade >= rule.minimum ? 'Numeric threshold met. Confirm accepted equivalency.' : 'Below the published numerical threshold for this route.')
      : rule ? 'Published minimum: ' + rule.minimum + '% of maximum grade. Confirm official grade equivalence.' : '';
    return `<article class="an-elig-card"><small>${escape(item.country)} · ${escape(item.level)}</small><h3>${escape(item.name)}</h3>
      <span class="an-elig-badge">Needs Verification</span>
      <p>${escape(comparison)}</p><p>${escape(item.eligibility || 'Check the current official award criteria.')}</p>
      <p><b>Application window</b> · ${escape(item.deadline || 'Check the latest official call.')}</p>
      ${item.coverage ? '<p>' + escape(item.coverage) + '</p>' : ''}
      <a href="#/scholarship/${encodeURIComponent(item.id)}">Scholarship details ↗</a>
      ${official(item.source, 'Official award source')}</article>`;
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
    refreshCountries();
    education.append(educationRow());
    function refreshDirectory(ready) {
      if (!form.isConnected) return;
      catalogueReady = ready;
      refreshCountries();
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
      const programmeHost = rule => entries.find(entry => siteHost(entry.site) === rule.host);
      const goalRules = eligibleRules.filter(rule => (!selected || siteHost(selected.site) === rule.host)
        && (!profile.country || programmeHost(rule)?.country === profile.country)
        && matches(profile.goal, rule.name));
      const institutions = entries.filter(inCountry);
      const query = search.trim();
      const searching = item => matches(query, item);
      const byProgramme = eligibleRules.filter(rule => (!profile.country || programmeHost(rule)?.country === profile.country)
        && matches(profile.goal, rule.name) && searching(rule.name + ' ' + rule.institution));
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
          (goalRules.length ? goalRules.map(rule => programmeCard(rule, profile)).join('')
            : '<p>Search the catalogue for your university and use its official programme link to confirm entry requirements with A&amp;N.</p>') +
          (selected ? institutionCard(selected) : goalInstitutions.map(institutionCard).join(''))
        : `<label class="an-elig-search">${section === 'institutions' ? 'Search universities or programmes' : 'Search scholarships'}
            <input type="search" data-elig-search value="${escape(search)}"></label>
            <div data-elig-list></div>`;
      if (section !== 'goal') {
        const list = output.querySelector('[data-elig-list]');
        list.innerHTML = '<p role="status">' + (section === 'institutions'
          ? byInstitution.length + ' catalogue institutions · ' + byProgramme.length + ' programmes with checked criteria' +
            (catalogueReady ? '' : ' · Full directory may still be loading')
          : byAward.length + ' scholarships matching level and destination') + '</p><div class="an-elig-cards">' +
          (section === 'institutions' ? [...byProgramme.map(item => () => programmeCard(item, profile)),
            ...byInstitution.slice(0, limit).map(item => () => institutionCard(item))].slice(0, limit).map(render => render()).join('')
            : byAward.slice(0, limit).map(item => scholarshipCard(item, profile)).join('')) +
          '</div>' + (!resultsCount ? '<p>Try another search or select all destinations under Edit profile.</p>' : '') +
          (resultsCount > limit ? '<button type="button" class="an-elig-secondary" data-elig-more>Show more results</button>' : '');
      }
    }

    form.addEventListener('click', event => {
      if (event.target.matches('[data-add-education]')) education.append(educationRow());
      const row = event.target.closest('.an-elig-education-row');
      if (row && event.target.matches('[data-remove-education]')) row.remove();
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      const rows = [...education.children].map(row =>
        Object.fromEntries([...row.querySelectorAll('input,select')].map(field => [field.name, field.value])));
      const invalid = rows.findIndex(row => number(row.grade) !== null && number(row.scale) !== null &&
        number(row.grade) > number(row.scale));
      if (invalid >= 0) {
        const field = education.children[invalid].querySelector('[name="grade"]');
        field.setCustomValidity('Grade must be within the original grading scale.');
        field.reportValidity();
        field.addEventListener('input', () => field.setCustomValidity(''), { once: true });
        education.children[invalid].querySelector('[name="scale"]').addEventListener('input',
          () => field.setCustomValidity(''), { once: true });
        return;
      }
      profile = Object.fromEntries(new FormData(form));
      profile.education = rows.map(row => ({ ...row, grade: number(row.grade), scale: number(row.scale) }));
      section = profile.goal || selected ? 'goal' : 'institutions';
      limit = PAGE_SIZE;
      search = '';
      results.hidden = false;
      renderSection();
      results.querySelector('h2').focus();
      results.scrollIntoView({ block: 'start' });
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
