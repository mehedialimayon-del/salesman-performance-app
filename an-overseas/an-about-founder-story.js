/* A&N Overseas — founder story experience. Standalone, safe to load after the main SPA. */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const serviceItems = [
    ['01','University Discovery & Shortlisting','Compare countries, institutions, programme levels, academic requirements and career directions without having to know every university name in advance.','universities'],
    ['02','Admission & Offer Support','Understand intakes, prepare transcripts, certificates and personal statements, review university-specific requirements and follow up on offers.','services'],
    ['03','Scholarships & Cost Planning','Evaluate published scholarships, tuition offers and total costs, including registration fees, accommodation and living expenses, before making a decision.','services'],
    ['04','Student Visa & EMGS Guidance','Get help preparing Malaysian student-pass documentation and understanding authorised university and EMGS milestones; approvals remain with the responsible authorities.','services'],
    ['05','Dependent & Family Guidance','Explore available dependent-pass routes, eligibility and official documentation requirements appropriate to the destination and visa category.','services'],
    ['06','Accommodation & Settling In','Discuss safe accommodation options, rental terms, deposits, commuting and practical support when moving to a new city.','services'],
    ['07','Airport Pickup & Arrival Support','Plan arrival documents, airport meeting arrangements, transport, local orientation and the first steps after landing.','services'],
    ['08','Pre-Departure & Student Assistance','Receive checklists for travel, academic reporting, health screening where required, local services and important contacts.','services'],
    ['09','Research & Academic Preparation','Guidance on preparing a research direction, understanding admission expectations and organising a strong, truthful academic application.','services'],
    ['10','Career & Student-Life Guidance','Explore career resources, skill-building opportunities and lawful work-related guidance subject to the student’s visa conditions.','services'],
    ['11','Application Tracking & Updates','Understand which application milestones to monitor and use official portals for confirmed status. Private case-specific live tracking will become available only after secure activation.','tracking'],
    ['12','Tourist & Wider Visa Guidance','Our long-term service vision includes tourist and other lawful visa categories as capacity, permissions and official requirements allow.','services']
  ];
  function steps() {
    return serviceItems.map(item => '<article class="an2-service"><span class="an2-service-num">'+item[0]+'</span><div><h3>'+esc(item[1])+'</h3><p>'+esc(item[2])+'</p><a href="#/'+item[3]+'">EXPLORE SERVICE <span aria-hidden="true">↗</span></a></div></article>').join('');
  }
  function currentDirectory() {
    const list = typeof U !== 'undefined' && Array.isArray(U) ? U : [];
    const destinations = new Set(list.map(x => x.country).filter(Boolean));
    const fullyLoaded = ['Hipo open directory','Hipo local snapshot'].includes(window.ANWorldDirectoryStatus?.source);
    return {universities: fullyLoaded ? list.length : null, countries: destinations.size};
  }
  function refreshDirectoryMetric() {
    const number = document.getElementById('an2-directory-entry-count');
    if (!number) return;
    const total = typeof U !== 'undefined' && Array.isArray(U) ? U.length : 0;
    const status = window.ANWorldDirectoryStatus;
    if (['Hipo open directory','Hipo local snapshot'].includes(status?.source)) {
      number.textContent = total.toLocaleString('en-US');
      number.title = 'Current complete searchable directory';
    } else if (status?.source === 'Curated local list') {
      number.textContent = total.toLocaleString('en-US');
      number.title = 'Currently available local directory; external university list could not load';
    } else {
      number.textContent = 'Loading…';
    }
  }
  function loadDirectoryCount() {
    // About Details must load the same catalogue used by the Universities page.
    // Never display the 809 local seed entries as the complete global total.
    if (typeof window.ANWorldDirectory?.loadPublicDirectory !== 'function') return;
    Promise.resolve().then(() => window.ANWorldDirectory.loadLocalSnapshot?.())
      .then(refreshDirectoryMetric, refreshDirectoryMetric);
    Promise.resolve().then(() => window.ANWorldDirectory.loadPublicDirectory())
      .then(refreshDirectoryMetric, refreshDirectoryMetric);
  }
  // Use the exact published Countries page list, not a hand-maintained flag list.
  // Bangladesh is the origin, then Asian destinations, European destinations, and others.
  function journeyFlags() {
    const destinationRows = typeof countries !== 'undefined' && Array.isArray(countries) ? countries : [];
    const asia = new Set(['Malaysia','China','Japan','South Korea','Singapore','Thailand','United Arab Emirates','Turkey']);
    const elsewhere = new Set(['Canada','United States','Australia','New Zealand']);
    const groups = [[],[],[]], seen = new Set(['Bangladesh']);
    destinationRows.forEach(row => {
      const name = String(row && row[0] || '');
      if (!name || seen.has(name)) return;
      seen.add(name);
      const bucket = asia.has(name) ? 0 : elsewhere.has(name) ? 2 : 1;
      groups[bucket].push({ name, flag:String(row[1] || '🌐') });
    });
    const ordered = [{name:'Bangladesh',flag:'🇧🇩',home:true}].concat(...groups);
    return ordered.map((item,i) => {
      // Native flag emoji are shown as two-letter country codes on Windows Chrome.
      // Convert their Unicode regional indicators to real, platform-independent flag pictures.
      const regional = Array.from(item.flag).map(ch => ch.codePointAt(0))
        .filter(cp => cp >= 0x1F1E6 && cp <= 0x1F1FF);
      const iso = regional.length === 2
        ? String.fromCharCode(regional[0] - 0x1F1E6 + 97, regional[1] - 0x1F1E6 + 97)
        : '';
      const image = iso
        ? '<img class="an2-flag-image" src="https://flagcdn.com/w80/'+iso+'.png" alt="" loading="eager" decoding="async">'
        : '';
      return '<span class="an2-flag-unit'+(item.home?' an2-flag-unit--home':'')+'" title="'+esc(item.name)+'">'+
        '<span class="an2-static-star" aria-hidden="true">✦</span>'+
        '<span class="an2-flag'+(item.home?' an2-flag-origin':'')+'" role="img" aria-label="'+esc(item.name)+' flag" style="--flag-index:'+i+'">'+
          '<span class="an2-flag-emoji" aria-hidden="true">'+esc(item.flag)+'</span>'+image+
        '</span>'+
      '</span>';
    }).join('');
  }
  function renderStory(){
    const directory = currentDirectory();
    const uniCount = directory.universities == null ? 'Loading…' : directory.universities.toLocaleString('en-US');
    setTimeout(loadDirectoryCount, 0);
    const countryCount = directory.countries.toLocaleString('en-US');
    return '<main class="an2-story wrap" id="an2-story">'+
      '<div class="an2-topline"><a href="#/about" class="an2-back">← ABOUT US</a><span>THE PEOPLE · THE PURPOSE · THE PROMISE</span></div>'+
      '<header class="an2-founder-hero">'+
        '<div class="an2-founder-brand"><img src="assets/brand-logo.jpg" alt="A&N Overseas Education & Consultancy brand logo"><span>ESTABLISHED 2024 · MALAYSIA & BANGLADESH</span><strong>ROOTED IN EXPERIENCE.<br><em>BUILT FOR YOUR FUTURE.</em></strong></div>'+
        '<div class="an2-founder-quote"><span class="an2-quote-mark" aria-hidden="true">“</span><blockquote>International education should never be a privilege reserved for the few. It should be a bridge between potential and possibility—where trustworthy guidance, the right opportunities and meaningful support turn uncertainty into confidence. At A&amp;N Overseas, we do more than help students cross borders; we stand beside them as they discover what they can become. From your first dream to your first confident step abroad, we are committed to walking this journey with you. <span class="an2-end-quote" aria-label="End of quote">”</span></blockquote><div class="an2-quote-footer"><div class="an2-quote-sign"><div class="an2-flags-journey" aria-label="Bangladesh and Malaysia, with featured global study destinations"><span class="an2-flags-overline">FROM HOME TO THE WORLD <span class="an2-plane-mark" aria-hidden="true">✈</span></span><div class="an2-floating-flags">'+journeyFlags()+'</div><small>Bangladesh · Malaysia · Global possibilities</small></div><span class="an2-founder-message-label">FOUNDER’S MESSAGE · A&N OVERSEAS</span></div><figure class="an2-founder-person"><img src="https://d2ol7oe51mr4n9.cloudfront.net/user_3J7eLpAsZ71YVjJWQaNzcGsV3TY/910707ad-d082-4cf5-8410-0bf049fdc75b.png" alt="Nusrat Nasrin — Founder, A&N Overseas" loading="eager" decoding="async"></figure></div></div>'+
      '</header>'+
      '<nav class="an2-nav" aria-label="Explore the A&N story">'+
        '<a href="#/aboutdetails" data-an-about-jump="an2-origins">Our Beginning</a><a href="#/aboutdetails" data-an-about-jump="an2-purpose">Why We Began</a><a href="#/aboutdetails" data-an-about-jump="an2-platform">Global Directory</a><a href="#/aboutdetails" data-an-about-jump="an2-services">What We Do</a><a href="#/aboutdetails" data-an-about-jump="an2-future">Our Vision</a>'+
      '</nav>'+
      '<section class="an2-intro-section" id="an2-origins"><div class="an2-section-label">CHAPTER 01 <i></i> THE BEGINNING</div><div class="an2-chapter-layout"><div><h1>Two people. One journey.<br><em>A bigger purpose.</em></h1><p>In 2024, Nusrat Nasrin and her husband, Mehedi Alim Ayon, arrived in Malaysia to begin a new chapter of academic and personal growth. Like many international students, they faced unfamiliar systems, important choices, everyday responsibilities and the challenge of making a new country feel like home.</p><p>Through perseverance, study and first-hand experience, they learned to navigate Malaysia’s higher-education landscape. Mehedi pursued postgraduate studies in Communication at Kuala Lumpur University of Science and Technology, while Nusrat continued her own higher-education and research journey, including at Universiti Putra Malaysia (UPM). Their academic paths made them more aware of the questions families ask before sending a loved one abroad.</p><p>What began as an individual education journey gradually became a shared mission: to make the process clearer, more transparent and more human for the students who would come next.</p></div><aside class="an2-origin-aside"><img src="assets/malaysia-skyline-clean.jpg" alt="Kuala Lumpur skyline" loading="lazy"><div><span>OUR FIRST HOME ABROAD</span><strong>KUALA LUMPUR</strong><p>Physical guidance, real local experience and a commitment that continues after arrival.</p></div></aside></div></section>'+
      '<section class="an2-story-chapter" id="an2-purpose"><div class="an2-section-label">CHAPTER 02 <i></i> THE REASON WE STARTED</div><h2>When information is unclear,<br><em>ambition pays the price.</em></h2><div class="an2-prose-columns"><p>They saw how confusing study-abroad decisions could become: incomplete information, unrealistic promises, unclear charges and, in some cases, students being misled by intermediaries. Such experiences can damage a family’s trust and turn an exciting opportunity into unnecessary anxiety. Their answer was not to make louder promises. It was to offer clearer information and more accountable support.</p><p>They also discovered that, for some students, Malaysia could offer recognised programmes, international exposure and a comparatively manageable combination of tuition and living costs. It is not the cheapest or best choice for everyone—each case deserves a realistic comparison—but it can open a door for families who thought overseas education was beyond their means. This realisation inspired A&N Overseas Education & Consultancy in 2024.</p></div><div class="an2-promise-line"><span>OUR BELIEF</span><strong>A family’s budget should shape a sensible plan—not silence a student’s dream.</strong></div></section>'+
      '<section class="an2-platform" id="an2-platform"><div class="an2-platform-copy"><div class="an2-section-label">CHAPTER 03 <i></i> A DIGITAL HOME FOR BIG DREAMS</div><h2>Thousands of universities.<br><em>One starting point.</em></h2><p>Students often know they want to study abroad before they know which university to choose, what a qualification means or how to apply. The A&N online directory brings institutions, programme discovery, portfolio pages and links to published or official sources together in one place.</p><p>Building a searchable platform of this scale took sustained research and development. The directory continues to grow and improve; its purpose is to help families discover options, compare routes and know where to verify important admissions details—not to suggest that every listed institution is an A&N partner.</p><div class="an2-metrics"><div><strong id="an2-directory-entry-count">'+uniCount+'</strong><span>DIRECTORY ENTRIES</span></div><div><strong>'+countryCount+'</strong><span>COUNTRIES LISTED</span></div><div><strong>2024</strong><span>JOURNEY BEGAN</span></div></div><a class="an2-primary" href="#/universities">EXPLORE THE UNIVERSITY DIRECTORY ↗</a></div><div class="an2-platform-visual"><span>DISCOVER</span><strong>ONE PLATFORM.<br>MORE POSSIBILITIES.</strong><div><small>COMPARE</small><small>VERIFY</small><small>PREPARE</small></div></div></section>'+
      '<section class="an2-story-chapter" id="an2-family"><div class="an2-section-label">CHAPTER 04 <i></i> TRUST STARTS CLOSE TO HOME</div><h2>They believed in this path<br><em>enough to share it with family.</em></h2><p>The confidence in Malaysia as a study destination was not only something they recommended to others. Mehedi also encouraged members of his own family—including his younger brother Wasi Ishraq, his cousin Jihad Hossain Jami and another relative, Sariyar Alam—to explore their own opportunities in Malaysia. Personal examples like these are part of why the team understands how seriously a family takes the decision to send a student abroad.</p><p>For A&N, support is not meant to end after an offer letter. Subject to the individual arrangement, it may include practical pre-departure planning, airport coordination, helping students find their bearings and staying available when questions arise. Every applicant deserves a clear explanation of what is included, what has a fee and which decisions belong to universities and government authorities.</p></section>'+
      '<section class="an2-all-services" id="an2-services"><div class="an2-section-label">CHAPTER 05 <i></i> END-TO-END GUIDANCE</div><h2>Not only an admission.<br><em>A better-supported journey.</em></h2><p class="an2-lead">From the first university search to adjusting to life abroad, A&N’s service areas are designed around the real questions students and families ask.</p><div class="an2-service-grid">'+steps()+'</div></section>'+
      '<section class="an2-story-chapter" id="an2-trust"><div class="an2-section-label">CHAPTER 06 <i></i> TRANSPARENCY & TRACKING</div><h2>Know the next step.<br><em>Know where you stand.</em></h2><div class="an2-trust-grid"><article><b>01</b><h3>Visible Identity</h3><p>We make our people, locations and service information easier to find, so students know whom they are dealing with.</p></article><article><b>02</b><h3>Trackable Milestones</h3><p>The platform explains important application milestones. Private case-specific tracking requires a securely connected service; official university and immigration records remain authoritative.</p></article><article><b>03</b><h3>Honest Outcomes</h3><p>Admission, scholarship and visa decisions belong to the issuing institution or authority. We do not promise approvals that are outside our control.</p></article></div></section>'+
      '<section class="an2-future" id="an2-future"><div class="an2-section-label">CHAPTER 07 <i></i> OUR MISSION & FUTURE</div><h2>From Malaysia to the world.<br><em>From guidance to lasting trust.</em></h2><div class="an2-future-grid"><article><span>OUR MISSION</span><p>To make international education understandable, accessible and accountable through verified information, realistic planning and human support—especially for students who need a financially sensible path forward.</p></article><article><span>OUR VISION</span><p>To be a trusted name for students across destinations, building a connected community of learners and expanding responsible admission and visa-assistance services as our expertise grows.</p></article><article><span>THE ROAD AHEAD</span><p>To improve the university directory, digital case updates and student resources; strengthen physical support; and gradually broaden student, dependent and tourist visa guidance in line with the relevant rules.</p></article></div><p class="an2-future-note">They envision a future in which students from Bangladesh and beyond can find dependable guidance wherever their academic ambitions lead—not just through a website, but through an enduring relationship built on trust.</p></section>'+
      '<footer class="an2-closing"><img src="assets/brand-logo.jpg" alt="A&N Overseas logo"><div><span>YOUR DREAM. OUR COMMITMENT.</span><h2>Wherever your opportunity is waiting,<br><em>we hope to help you reach it.</em></h2><p>We are grateful for every family that places its trust in A&N Overseas. May your educational journey lead you to knowledge, opportunity and a meaningful future. With sincerity and dedication, we remain committed to standing beside our students, Insha’Allah.</p><div class="an2-cta"><a href="#/apply">BEGIN YOUR JOURNEY ↗</a><a href="#/contact">SPEAK TO OUR TEAM</a><a href="#/about">← ABOUT US</a></div><small>Published university information is a discovery resource. Fees, recognition, eligibility, intake and approvals must be confirmed with the institution or relevant authority. The directory is not a representation of institutional partnerships.</small></div></footer>'+
    '</main>';
  }
  // Public route renderer: loaded before the SPA router so direct links work on first paint.
  window.ANAboutFounderStory = renderStory;
  // Route function is defined in index.html. Replacing it preserves the existing hash router.
  if (typeof aboutDetailsPage === 'function') aboutDetailsPage = renderStory;
  function ensureFounderPage() {
    const route=location.hash.split('?')[0];
    const app=document.querySelector('#app');
    if(route!=='#/aboutdetails'||!app||app.querySelector('.an2-story'))return;
    app.innerHTML=renderStory();
  }
  function relocateReadMore() {
    if (!location.hash.startsWith('#/about') || location.hash.startsWith('#/aboutdetails')) return;
    const intro = document.querySelector('#an-about-fixed .an-about-intro-panel');
    const vision = intro && intro.querySelector('.an-vision-inline');
    const button = vision && vision.querySelector('.an-about-readmore');
    if (!intro || !vision || !button) return;
    if (!intro.querySelector('.an2-about-box')) {
      const eyebrow = intro.querySelector(':scope > .an-about-eyebrow');
      const heading = intro.querySelector(':scope > #an-about-title');
      const paragraph = intro.querySelector(':scope > #an-about-intro');
      if (eyebrow && heading && paragraph) {
        const aboutBox = document.createElement('section');
        aboutBox.className = 'an2-about-box';
        intro.insertBefore(aboutBox, eyebrow);
        aboutBox.append(eyebrow, heading, paragraph);
      }
    }
    let row = intro.querySelector('.an2-readmore-separate');
    if (!row) {
      row = document.createElement('div');
      row.className = 'an2-readmore-separate';
      row.innerHTML = '<span>THE STORY BEHIND A&amp;N</span>';
      vision.insertAdjacentElement('afterend', row);
    }
    row.appendChild(button);
    button.setAttribute('aria-label','Read our full story, mission and vision');
  }
  // Gracefully fall back to the original emoji when a flag image cannot load.
  document.addEventListener('error', event => {
    const node = event.target;
    if (node && node.classList && node.classList.contains('an2-flag-image')) {
      node.classList.add('an2-flag-image-error');
    }
  }, true);
  function setup() {
    ensureFounderPage();
    relocateReadMore();
    const app=document.getElementById('app');
    if (app) new MutationObserver(() => {
      if(location.hash.split('?')[0]==='#/aboutdetails')ensureFounderPage();
      else relocateReadMore();
    }).observe(app,{childList:true,subtree:true});
    window.addEventListener('hashchange',()=>requestAnimationFrame(()=>{
      ensureFounderPage();
      relocateReadMore();
    }));
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',setup,{once:true}); else setup();
})();