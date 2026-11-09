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
  const serviceIcons = [
    'M2 9l10-5 10 5-10 5z M6 11v6c4 3 8 3 12 0v-6',
    'M6 3h9l4 4v14H6z M14 3v5h5 M9 14l2 2 5-5',
    'M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
    'M4 4h15v16H4z M8 4v16 M11 9h5 M11 13h5',
    'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20v-2a6 6 0 0 1 12 0v2 M16 6a3 3 0 0 1 0 6 M21 20v-2a5 5 0 0 0-4-5',
    'M3 11l9-8 9 8 M5 10v10h14V10 M10 20v-6h4v6',
    'M3 13l8 2 6 5 2-1-3-6 5-7a1.5 1.5 0 0 0-2-2l-7 5-7-2-2 2 6 4z',
    'M6 7h12v14H6z M9 7V4h6v3 M9 11v6 M15 11v6',
    'M3 5h5l4 2 4-2h5v14h-5l-4 2-4-2H3z M12 7v14',
    'M3 8h18v12H3z M8 8V4h8v4 M3 12l9 3 9-3',
    'M5 5h14v15H5z M9 3v4 M15 3v4 M8 11h8 M8 15h5 M8 18h3',
    'M4 6h16v12H4z M4 9l8 5 8-5'
  ];
  function cardIcon(path) {
    return '<svg class="an2-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>';
  }
  function cardTitle(accent, rest) {
    return '<span class="an2-card-accent">'+esc(accent)+'</span> <span class="an2-card-white">'+esc(rest)+'</span>';
  }
  const futureGraphics = {
    mission: {
      outline: 'M11 39c9-3 18-1 25 5 7-6 16-8 25-5v20c-10-3-18-1-25 4-7-5-15-7-25-4z M36 44v19 M18 46l11 3 M18 52l11 3 M43 49l11-3 M43 55l11-3',
      accent: 'M16 23 36 13l20 10-20 10z M24 27v8c7 5 17 5 24 0v-8 M56 23v11 M7 28h5 M9.5 25.5v5 M61 15h5 M63.5 12.5v5'
    },
    vision: {
      outline: 'M15 36a21 21 0 1 1 42 0 21 21 0 0 1-42 0z M15 36h42 M36 15c-13 12-13 30 0 42 13-12 13-30 0-42 M19 25c11 5 23 5 34 0 M19 47c11-5 23-5 34 0',
      accent: 'M23 13 36 6l13 7-13 7z M46 15v7 M8 46c2 11 14 18 28 18s26-7 28-18 M10 47l-2-4-4 4 M61 46l3-3 4 4'
    },
    road: {
      outline: 'M43 24 55 16l12 8z M46 26v10 M55 26v10 M64 26v10 M43 39h24 M13 43h10v12H13z M12 56h12 M16 47h4 M16 51h4',
      accent: 'M19 64h14c9 0 12-10 5-14l-7-4c-6-4-3-13 5-13h6 M24 18 35 12l11 6-11 6z M28 21v5c4 3 10 3 14 0v-5 M8 28h7 M11.5 24.5v7'
    }
  };
  function futureGraphic(topic) {
    const {outline, accent} = futureGraphics[topic];
    return '<svg class="an2-future-graphic" viewBox="0 0 72 72" aria-hidden="true" focusable="false">'
      +'<circle class="an2-graphic-halo" cx="36" cy="36" r="34"/>'
      +'<path class="an2-graphic-outline" d="'+outline+'"/>'
      +'<path class="an2-graphic-accent" d="'+accent+'"/></svg>';
  }
  function steps() {
    return serviceItems.map((item, index) => '<article class="an2-service"><span class="an2-service-num">'+item[0]+cardIcon(serviceIcons[index])+'</span><div><h3><span class="an2-title-accent">'+esc(item[1].split(' ')[0])+'</span> <span class="an2-title-rest">'+esc(item[1].split(' ').slice(1).join(' '))+'</span></h3><p>'+esc(item[2])+'</p><a href="#/'+item[3]+'">EXPLORE SERVICE <span aria-hidden="true">↗</span></a></div></article>').join('');
  }
  function currentDirectory() {
    const list = typeof U !== 'undefined' && Array.isArray(U) ? U : [];
    const destinations = new Set(list.map(x => x.country).filter(Boolean));
    const fullyLoaded = ['Hipo open directory','Hipo local snapshot'].includes(window.ANWorldDirectoryStatus?.source);
    return {universities: fullyLoaded ? list.length : null, countries: destinations.size};
  }
  function refreshDirectoryMetric() {
    const total = typeof U !== 'undefined' && Array.isArray(U) ? U.length : 0;
    const source = window.ANWorldDirectoryStatus?.source;
    const complete = ['Hipo open directory','Hipo local snapshot'].includes(source);
    const local = source === 'Curated local list';
    for (const number of document.querySelectorAll('[data-an-story-university-total], #an2-directory-entry-count')) {
      number.textContent = complete || local ? total.toLocaleString('en-US') : 'Loading…';
      number.title = complete ? 'Current complete searchable directory' : local ? 'Currently available local directory' : '';
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
  // SVG displacement creates real ripples within each stationary country flag.
  const wavingFlagFilter='<svg class="an2-wave-filter-defs" aria-hidden="true" width="0" height="0" focusable="false" xmlns="http://www.w3.org/2000/svg"><defs><filter id="an2-flags-fabric-ripple" x="-14%" y="-20%" width="128%" height="140%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.024 0.075" numOctaves="1" seed="8" result="fabricNoise"><animate attributeName="baseFrequency" values="0.024 0.075;0.035 0.095;0.018 0.08;0.024 0.075" dur="3.2s" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="fabricNoise" scale="3.8" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>';

  // The front grid and Read More overlay use the same approved artwork crops.
  const founderArtworkSource='https://d2ol7oe51mr4n9.cloudfront.net/user_3J7eLpAsZ71YVjJWQaNzcGsV3TY/adcc9b9f-f11c-4a3a-a811-b209ce412fbe.png';
  const founderFlagBounds=[
    [104,744,94,56],[213,749,71,50],[293,745,70,55],[381,749,63,52],
    ...[810,859,906,954,1001,1048,1094].flatMap(y=>
      [[102,60],[172,60],[241,62],[312,61],[381,65]].map(([x,w])=>[x,y,w,43])),
    [102,1140,61,42],[173,1140,62,42]
  ];
  function founderFlagTiles(inArtwork=false){
    return founderFlagBounds.map(([x,y,w,h],i)=>{
      // Read More overlays the crops on an 828 × 1156 window at (18, 235).
      const position=inArtwork
        ? `left:${((x-18)/828*100).toFixed(5)}%;top:${((y-235)/1156*100).toFixed(5)}%;width:${(w/828*100).toFixed(5)}%;height:${(h/1156*100).toFixed(5)}%`
        : `aspect-ratio:${w}/${h}`;
      const bgWidth=(864/w*100).toFixed(5),bgHeight=(1536/h*100).toFixed(5);
      const bgX=(x/(864-w)*100).toFixed(5),bgY=(y/(1536-h)*100).toFixed(5);
      const duration=(2.8+(i%5)*.23).toFixed(2);
      const delay=(-((i%8)*.37)).toFixed(2);
      return `<span class="an2-native-cloth-flag" style="${position};background-image:url(${founderArtworkSource});background-size:${bgWidth}% ${bgHeight}%;background-position:${bgX}% ${bgY}%;--wave-duration:${duration}s;--wave-delay:${delay}s"></span>`;
    }).join('');
  }
  function approvedFounderArtwork(){
    const src=founderArtworkSource;
    const image='<image href="'+src+'" x="0" y="0" width="864" height="1536" />';
    const flagTiles=founderFlagTiles(true);
    return '<div class="an2-approved-reference-hero" aria-label="A&N Overseas founder message from the approved reference artwork">'
      +'<img class="an2-approved-reference-source" src="'+src+'" alt="A&N Overseas founder artwork with study-destination flags and Nusrat Nasrin" loading="eager" decoding="async">'
      +'<div class="an2-native-cloth-layer" aria-hidden="true">'+flagTiles+'</div>'
      +'<figure class="an2-mobile-complete-quote"><span class="an2-mobile-open-quote" aria-hidden="true">“</span><blockquote><strong>International education should never be a privilege reserved for the few.</strong> It should be a bridge between potential and possibility—where trustworthy guidance, the right opportunities and meaningful support turn uncertainty into confidence. At A&amp;N Overseas, we do more than help students cross borders; we stand beside them as they discover what they can become. From your first dream to your first confident step abroad, we are committed to walking this journey with you. <span class="an2-mobile-close-quote" aria-hidden="true">”</span></blockquote></figure>'
      // IMPORTANT: no flag overlay. The original artwork is the single source of truth.
      // Earlier SVG layers redraw the flags as enormous polygons on Android.
      +'<svg class="an2-approved-reference-sharp" viewBox="18 235 828 1156" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">'
      +'<defs><clipPath id="an2-approved-portrait-sharp-area" clipPathUnits="userSpaceOnUse"><rect x="452" y="684" width="378" height="638" rx="2"/></clipPath>'
      +'<filter id="an2-approved-portrait-sharp-filter" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">'
      +'<feConvolveMatrix order="3" kernelMatrix="0 -0.2 0 -0.2 1.8 -0.2 0" edgeMode="duplicate" preserveAlpha="true"/></filter></defs>'
      +'<g clip-path="url(#an2-approved-portrait-sharp-area)"><g filter="url(#an2-approved-portrait-sharp-filter)">'+image+'</g></g>'
      +'</svg></div>';
  }
  document.addEventListener('error',event=>{
    if(event.target?.classList?.contains('an2-approved-reference-source')){
      event.target.closest('.an2-founder-hero')?.classList.add('an2-approved-source-error');
    }
  },true);
  function founderHero(){
    return '<header class="an2-founder-hero">'+
        approvedFounderArtwork()+
        '<div class="an2-founder-brand"><span class="an2-graduate-globe" role="img" aria-label="Animated colourful globe with graduation cap"><span class="an2-globe-world" aria-hidden="true">🌎</span><span class="an2-globe-cap" aria-hidden="true">🎓</span></span><span>ESTABLISHED 2024 · MALAYSIA & BANGLADESH</span><strong>ROOTED IN EXPERIENCE.<br><em>BUILT FOR YOUR FUTURE.</em></strong></div>'+
        '<div class="an2-founder-quote"><span class="an2-quote-mark" aria-hidden="true">“</span><blockquote>Global education opens doors to new opportunities and meaningful support turn uncertainty into confidence. At A&amp;N Overseas, we do more than help students cross borders; we stand beside them as they discover what they can become. From your first dream to your first confident step abroad, we are committed to walking this journey with you. <span class="an2-end-quote" aria-label="End of quote">”</span></blockquote><div class="an2-quote-footer"><div class="an2-quote-sign"><div class="an2-flags-journey" aria-label="Bangladesh and Malaysia, with featured global study destinations"><span class="an2-flags-overline">FROM HOME TO THE WORLD <span class="an2-plane-mark" aria-hidden="true">✈</span></span><div class="an2-floating-flags">'+journeyFlags()+'</div>'+wavingFlagFilter+'<small>Bangladesh · Malaysia · Global possibilities</small></div><span class="an2-founder-message-label"><span class="an2-founder-msg-orange">FOUNDER’S MESSAGE</span> <span class="an2-founder-msg-white">· A&amp;N OVERSEAS</span></span></div><figure class="an2-founder-person"><img src="https://d2ol7oe51mr4n9.cloudfront.net/user_3J7eLpAsZ71YVjJWQaNzcGsV3TY/910707ad-d082-4cf5-8410-0bf049fdc75b.png" alt="Nusrat Nasrin — Founder, A&N Overseas" loading="eager" decoding="async"></figure></div></div>'+
      '</header>';
  }
  function renderStory(){
    const directory = currentDirectory();
    const uniCount = directory.universities == null ? 'Loading…' : directory.universities.toLocaleString('en-US');
    setTimeout(loadDirectoryCount, 0);
    const countryCount = directory.countries.toLocaleString('en-US');
    return '<main class="an2-story wrap" id="an2-story">'+
      '<div class="an2-topline"><a href="#/about" class="an2-back">← ABOUT US</a><span>THE PEOPLE · THE PURPOSE · THE PROMISE</span></div>'+
      founderHero()+
      '<section class="an2-mobile-overview" aria-label="A&N Overseas at a glance"><h1>Explore Global Education</h1><div class="an2-overview-metrics">'+
        '<div>'+cardIcon('M3 9l9-5 9 5H3z M5 19h14 M7 10v7 M12 10v7 M17 10v7')+'<strong data-an-story-university-total>'+uniCount+'</strong><span>Universities</span></div>'+
        '<div>'+cardIcon('M3 9l9-5 9 5-9 5-9-5z M7 11v5q5 4 10 0v-5 M21 9v7')+'<strong>'+(window.ANScholarships?.items?.length?.toLocaleString('en-US') ?? '—')+'</strong><span>Scholarships</span></div>'+
        '<div>'+cardIcon('M3 5h18v14H3z M3 9h18 M7 13h4 M7 16h10')+'<strong>One site</strong><span>Study abroad resources</span></div>'+
      '</div></section>'+
      '<nav class="an2-nav" aria-label="Explore the A&N story">'+
        '<a href="#/aboutdetails" data-an-about-jump="an2-origins">Our Beginning</a><a href="#/aboutdetails" data-an-about-jump="an2-purpose">Why We Began</a><a href="#/aboutdetails" data-an-about-jump="an2-platform">Global Directory</a><a href="#/aboutdetails" data-an-about-jump="an2-services">What We Do</a><a href="#/aboutdetails" data-an-about-jump="an2-future">Our Vision</a>'+
      '</nav>'+
      '<section class="an2-intro-section" id="an2-origins"><div class="an2-section-label">CHAPTER 01 <i></i> THE BEGINNING</div><div class="an2-chapter-layout"><div><h1>Two people. <em>One journey.</em><br><em class="an2-story-highlight">A bigger purpose.</em></h1><p>In <strong class="an2-story-highlight">2024</strong>, <strong class="an2-story-highlight">Nusrat Nasrin</strong> and her husband, <strong class="an2-story-highlight">Mehedi Alim Ayon</strong>, arrived in Malaysia to begin a new chapter of academic and personal growth. Like many international students, they faced unfamiliar systems, important choices, everyday responsibilities and the challenge of making a new country feel like home.</p><p>Through perseverance, study and first-hand experience, they learned to navigate Malaysia’s higher-education landscape. <strong class="an2-story-highlight">Mehedi</strong> pursued <strong class="an2-story-highlight">postgraduate studies in Communication</strong> at <strong class="an2-story-highlight">Kuala Lumpur University of Science and Technology (KLUST)</strong>, while <strong class="an2-story-highlight">Nusrat</strong> continued her own higher-education and research journey, including at <strong class="an2-story-highlight">Universiti Putra Malaysia (UPM)</strong>. Their academic paths made them more aware of the questions families ask before sending a loved one abroad.</p><p class="an2-shared-mission"><strong>What began as an individual education journey gradually became a shared mission.</strong> Our purpose is to make the process clearer, more transparent and more human for the students who would come next.</p></div><aside class="an2-origin-aside"><img src="assets/malaysia-skyline-clean.jpg" alt="Kuala Lumpur skyline" loading="lazy"><div><span>OUR FIRST HOME ABROAD</span><strong>KUALA LUMPUR</strong><p>Physical guidance, real local experience and a commitment that continues after arrival.</p></div></aside></div></section>'+
      '<section class="an2-story-chapter" id="an2-purpose"><div class="an2-section-label">CHAPTER 02 <i></i> THE REASON WE STARTED</div><h2>When information is unclear,<br><em>ambition pays the price.</em></h2><div class="an2-prose-columns"><p>They saw how confusing study-abroad decisions could become: incomplete information, unrealistic promises, unclear charges and, in some cases, students being misled by intermediaries. Such experiences can damage a family’s trust and turn an exciting opportunity into unnecessary anxiety. Their answer was not to make louder promises. It was to offer clearer information and more accountable support.</p><p>They also discovered that, for some students, Malaysia could offer recognised programmes, international exposure and a comparatively manageable combination of tuition and living costs. It is not the cheapest or best choice for everyone—each case deserves a realistic comparison—but it can open a door for families who thought overseas education was beyond their means. <strong class="an2-story-highlight">This realisation inspired A&amp;N Overseas Education &amp; Consultancy in 2024.</strong></p></div><div class="an2-promise-line"><span>OUR BELIEF</span><strong>A family’s budget should shape a sensible plan—not silence a student’s dream.</strong></div></section>'+
      '<section class="an2-platform" id="an2-platform"><div class="an2-platform-copy"><div class="an2-section-label">CHAPTER 03 <i></i> A DIGITAL HOME FOR BIG DREAMS</div><h2>Thousands of universities.<br><em>One starting point.</em></h2><p>Students often know they want to study abroad before they know which university to choose, what a qualification means or how to apply. The A&N online directory brings institutions, programme discovery, portfolio pages and links to published or official sources together in one place.</p><p>Building a searchable platform of this scale took sustained research and development. The directory continues to grow and improve; its purpose is to help families discover options, compare routes and know where to verify important admissions details—not to suggest that every listed institution is an A&N partner.</p><div class="an2-metrics"><div><strong id="an2-directory-entry-count">'+uniCount+'</strong><span>DIRECTORY ENTRIES</span></div><div><strong>'+countryCount+'</strong><span>COUNTRIES LISTED</span></div><div><strong>2024</strong><span>JOURNEY BEGAN</span></div></div><a class="an2-primary" href="#/universities">EXPLORE THE UNIVERSITY DIRECTORY ↗</a></div><div class="an2-platform-visual"><span>DISCOVER</span><strong>ONE PLATFORM.<br>MORE POSSIBILITIES.</strong><div><small>COMPARE</small><small>VERIFY</small><small>PREPARE</small></div></div></section>'+
      '<section class="an2-story-chapter" id="an2-family"><div class="an2-section-label">CHAPTER 04 <i></i> TRUST STARTS CLOSE TO HOME</div><h2>They believed in this path<br><em>enough to share it with family.</em></h2><p>The confidence in Malaysia as a study destination was not only something they recommended to others. Mehedi also encouraged members of his own family—including his younger brother Wasi Ishraq, his cousin Jihad Hossain Jami and another relative, Sariyar Alam—to explore their own opportunities in Malaysia. Personal examples like these are part of why the team understands how seriously a family takes the decision to send a student abroad.</p><p>For A&N, support is not meant to end after an offer letter. Subject to the individual arrangement, it may include practical pre-departure planning, airport coordination, helping students find their bearings and staying available when questions arise. Every applicant deserves a clear explanation of what is included, what has a fee and which decisions belong to universities and government authorities.</p></section>'+
      '<section class="an2-all-services" id="an2-services"><div class="an2-section-label">CHAPTER 05 <i></i> END-TO-END GUIDANCE</div><h2>Not only an admission.<br><em>A better-supported journey.</em></h2><p class="an2-lead">From the first university search to adjusting to life abroad, A&N’s service areas are designed around the real questions students and families ask.</p><div class="an2-service-grid">'+steps()+'</div></section>'+
      '<section class="an2-story-chapter" id="an2-trust"><div class="an2-section-label">CHAPTER 06 <i></i> TRANSPARENCY & TRACKING</div><h2>Know the next step.<br><em>Know where you stand.</em></h2><div class="an2-trust-grid"><article><b>01'+cardIcon('M3 5h18v14H3z M7 15c0-3 5-3 5 0 M9.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M15 9h3 M15 13h3')+'</b><h3>'+cardTitle('Visible', 'Identity')+'</h3><p>We make our people, locations and service information easier to find, so students know whom they are dealing with.</p></article><article><b>02'+cardIcon('M6 20V5 M6 5h12l-3 4 3 4H6 M3 20h6')+'</b><h3>'+cardTitle('Trackable', 'Milestones')+'</h3><p>The platform explains important application milestones. Private case-specific tracking requires a securely connected service; official university and immigration records remain authoritative.</p></article><article><b>03'+cardIcon('M12 3l8 3v5c0 5-3 8-8 10-5-2-8-5-8-10V6z M8.5 12l2.5 2.5 4.5-5')+'</b><h3>'+cardTitle('Honest', 'Outcomes')+'</h3><p>Admission, scholarship and visa decisions belong to the issuing institution or authority. We do not promise approvals that are outside our control.</p></article></div></section>'+
      '<section class="an2-future" id="an2-future"><div class="an2-section-label">CHAPTER 07 <i></i> OUR MISSION & FUTURE</div><h2>From Malaysia to the world.<br><em>From guidance to lasting trust.</em></h2><div class="an2-future-grid"><article>'+futureGraphic('mission')+'<h3>'+cardTitle('Our', 'Mission')+'</h3><p>To make international education understandable, accessible and accountable through verified information, realistic planning and human support—especially for students who need a financially sensible path forward.</p></article><article>'+futureGraphic('vision')+'<h3>'+cardTitle('Our', 'Vision')+'</h3><p>To be a trusted name for students across destinations, building a connected community of learners and expanding responsible admission and visa-assistance services as our expertise grows.</p></article><article>'+futureGraphic('road')+'<h3>'+cardTitle('The Road', 'Ahead')+'</h3><p>To improve the university directory, digital case updates and student resources; strengthen physical support; and gradually broaden student, dependent and tourist visa guidance in line with the relevant rules.</p></article></div><p class="an2-future-note">They envision a future in which students from Bangladesh and beyond can find dependable guidance wherever their academic ambitions lead—not just through a website, but through an enduring relationship built on trust.</p></section>'+
      '<footer class="an2-closing"><img src="assets/approved-reference-crest-20261107.svg" alt="A&N Overseas crest" loading="lazy"><div><span>YOUR DREAM. OUR COMMITMENT.</span><h2>Wherever your opportunity is waiting,<br><em>we hope to help you reach it.</em></h2><p>We are grateful for every family that places its trust in A&N Overseas. May your educational journey lead you to knowledge, opportunity and a meaningful future. With sincerity and dedication, we remain committed to standing beside our students, Insha’Allah.</p><div class="an2-cta"><a href="#/apply">BEGIN YOUR JOURNEY ↗</a><a href="#/contact">SPEAK TO OUR TEAM</a><a href="#/about">← ABOUT US</a></div><small>Published university information is a discovery resource. Fees, recognition, eligibility, intake and approvals must be confirmed with the institution or relevant authority. The directory is not a representation of institutional partnerships.</small></div></footer>'+
    '</main>';
  }
  // Public route renderer: loaded before the SPA router so direct links work on first paint.
  window.ANAboutFounderStory = renderStory;
  window.ANAboutJourneyFlags = journeyFlags;
  window.ANAboutFounderFlagTiles = founderFlagTiles;
  // Route function is defined in index.html. Replacing it preserves the existing hash router.
  if (typeof aboutDetailsPage === 'function') aboutDetailsPage = renderStory;
  function ensureFounderPage() {
    const route=location.hash.split('?')[0];
    const app=document.querySelector('#app');
    if(route!=='#/aboutdetails'||!app||app.querySelector('.an2-story'))return;
    app.innerHTML=renderStory();
  }
  const mobileAbout = matchMedia('(max-width:800px)');
  function fitMobileOpening(opening) {
    const top = opening.getBoundingClientRect().top;
    const height = window.visualViewport?.height ?? window.innerHeight;
    const available = Math.max(0, height - Math.max(0, top + window.scrollY));
    opening.style.setProperty('--an-about-opening-height', available + 'px');
    const art = opening.querySelector('.an-about-mobile-art');
    const hero = art.firstElementChild;
    const button = opening.querySelector('.an-about-mobile-readmore');
    const openingStyle = getComputedStyle(opening);
    const reserved = button.offsetHeight + parseFloat(openingStyle.paddingBottom) + parseFloat(openingStyle.rowGap);
    const availableArtHeight = Math.max(0, available - reserved - 2);
    const portrait = matchMedia('(orientation:portrait)').matches;
    const artWidth = portrait ? art.clientWidth : Math.min(390, art.clientWidth);
    hero.style.setProperty('--an-about-art-width', artWidth + 'px');
    hero.style.zoom = '';
    const naturalHeight = hero.offsetHeight;
    if (!naturalHeight) return;
    const scale = Math.min(1, Math.max(portrait ? .8 : .15, availableArtHeight / naturalHeight));
    hero.style.setProperty('--an-about-art-scale-y', portrait ? scale : 1);
    art.style.minHeight = naturalHeight * scale + 'px';
    hero.style.zoom = portrait ? '' : scale;
  }
  function renderMobileOpening(intro) {
    if (!mobileAbout.matches) return;
    let opening = intro.previousElementSibling;
    if (!opening?.classList.contains('an-about-mobile-opening')) {
      opening = document.createElement('section');
      opening.className = 'an-about-mobile-opening';
      opening.setAttribute('aria-label', 'About A&N Overseas');
      opening.innerHTML = '<div class="an-about-mobile-art">'+founderHero()+'</div>'+
        '<a class="an-about-mobile-readmore" href="#/aboutdetails">READ MORE <span aria-hidden="true">↗</span></a>';
      intro.before(opening);
    }
    fitMobileOpening(opening);
  }
  function relocateReadMore() {
    // READ MORE belongs to the overall A&N story, BELOW the two separate
    // About and Our Vision sections, not inside the Vision content panel.
    if (location.hash.split('?')[0] !== '#/about') return;
    const intro = document.querySelector('#an-about-fixed .an-about-intro-panel');
    const vision = intro?.querySelector('.an-vision-inline');
    if (!intro || !vision) return;
    renderMobileOpening(intro);
    const button = intro.querySelector('.an-about-readmore');
    if (!button) return;
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
    let row = intro.querySelector(':scope > .an2-readmore-separate');
    if (!row) {
      row = document.createElement('div');
      row.className = 'an2-readmore-separate';
      intro.appendChild(row);
    }
    if (button.parentElement !== row) row.appendChild(button);
    button.href = '#/aboutdetails';
    button.setAttribute('aria-label', 'Read more about A&N Overseas overall story and consultancy');
    if (button.textContent.trim() !== 'READ MORE ↗') button.textContent = 'READ MORE ↗';
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
    window.addEventListener('resize', relocateReadMore, {passive:true});
    window.visualViewport?.addEventListener('resize', relocateReadMore, {passive:true});
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(relocateReadMore);
      for (const selector of ['header.top', '#an-global-ticker']) {
        const element = document.querySelector(selector);
        if (element) observer.observe(element);
      }
    }
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