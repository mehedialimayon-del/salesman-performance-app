(() => {
  'use strict';

  const root = document.getElementById('app');
  const vectors = {
    sync: 'M6 18a4 4 0 0 1-.8-7.9 6 6 0 0 1 11.6-1.4A4.7 4.7 0 0 1 18 18M9 19v-6m-2 2 2-2 2 2m4-1v7m-2-2 2 2 2-2',
    approval: 'M13 5H5a2 2 0 0 0-2 2v13a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-8M7 12l4 4L22 4',
    calendar: 'M3 6h18v15H3zM3 10h18M7 3v5m10-5v5m-9 7 3 3 5-5',
    chat: 'M4 4h16a2 2 0 0 1 2 2v11h-5l-4 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 7h.1m4.9 0h.1m4.9 0h.1',
    tasks: 'M8 5H5a1 1 0 0 0-1 1v15h16V6a1 1 0 0 0-1-1h-3M9 3h6v5H9zM7 12l1 1 2-2m2 2h5m-10 4 1 1 2-2m2 2h5',
    meeting: 'M3 6h18v15H3zM3 9h18M7 3v5m10-5v5M8 14h4l5-2v7l-5-2H8z',
    pin: 'M19 9c0 5-7 10-7 10S5 14 5 9a7 7 0 1 1 14 0ZM12 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM4 14l-3 7 6-1 5 2 5-2 6 1-3-7',
    sales: 'M2 21h20M4 21v-5h3v5m3 0v-8h3v8m3 0V10h3v11M3 11l6-5 4 2 7-6m-4 0h4v4',
    bars: 'M2 21h20M5 19v-5h2v5m3 0V9h2v10m3 0V5h2v14m3 0V2h2v17',
    target: 'M12 2v5m0 10v5M2 12h5m10 0h5m-2 0a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-4 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    route: 'M9 8c0 2-3 4-3 4S3 10 3 8a3 3 0 1 1 6 0Zm12-3c0 2-3 4-3 4s-3-2-3-4a3 3 0 1 1 6 0ZM6 12c-5 5-2 9 1 9 8 0 1-9 10-9',
    report: 'M14 2H4v20h10m0-20v6h6m-6-6 6 6v3M7 8h3m-3 4h6m-6 4h4m12 2a5 5 0 1 1-10 0 5 5 0 0 1 10 0Zm-5-3v3l2 1',
    shop: 'M2 9l3-6h14l3 6M3 9h18v3c-2 2-4 2-6 0-2 2-4 2-6 0-2 2-4 2-6 0ZM5 14v7h14v-7m-9 7v-5h4v5',
    tag: 'M3 12 13 2h8v8L11 21zM17 6h.1m-6 9 5-5m-6 1h.1m5 4h.1',
    coins: 'M22 5c0 2-3 3-7 3s-7-1-7-3 3-3 7-3 7 1 7 3ZM8 5v5m14-5v10c0 2-4 3-7 3m7-8c0 2-4 3-7 3m0 1c0 2-3 3-7 3s-7-1-7-3 3-3 7-3 7 1 7 3ZM1 14v5c0 2 3 3 7 3s7-1 7-3v-5m0 2c0 2-3 3-7 3s-7-1-7-3',
    folder: 'M3 7V4h7l2 3h9v3M3 21l2-10h17l-2 10ZM14 4h4v3',
    book: 'M12 5C9 2 5 2 2 3v17c4-1 7 0 10 2 3-2 6-3 10-2V3c-3-1-7-1-10 2Zm0 0v17',
    contacts: 'M2 4h20v16H2zM10 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm-5 6c0-3 6-3 6 0m3-7h5m-5 5h5',
    settings: 'M10 2h4l1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3L1 9l2-4 3 1 3-1ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    soa: 'M5 2h10l5 5v15H5zM15 2v5h5M8 12h9v7H8zm0 3h9m-6-3v7m3-7v7',
    home: 'M2 11 12 2l10 9h-3v10h-5v-6h-4v6H5V11z',
    dashboard: 'M3 3h18v18H3zM7 16v-5m5 5V7m5 9v-7',
    check: 'm4 12 5 6L21 5',
    notice: 'M5 3h14v18H5zm3 5h8m-8 4h8m-8 4h8',
    bell: 'M3 18h18l-3-3V9a6 6 0 0 0-12 0v6zM9 21c1 2 5 2 6 0',
    headset: 'M4 15V11a8 8 0 0 1 16 0v4m-16-2H2v6h5v-6zm16 0h2v6h-5v-6zm0 6c0 3-4 3-7 3',
    search: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6',
    refresh: 'M20 9a8 8 0 1 0 0 7m1-13v7h-7',
    dots: 'M12 5h.1M12 12h.1M12 19h.1',
    clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 6v6l4 3',
    logo: 'M2 21v-6h3v6zm5 0V11h3v10zm5 0V6h3v15zm5-12 5-6m-4 0h4v4'
  };
  const modules = {
    offlineSync:'sync', approvals:'approval', attendance:'calendar', communication:'chat',
    tasks:'tasks', briefings:'meeting', tracking:'pin', sales:'sales', dashboard:'bars',
    zero:'target', route:'route', reports:'report', outletHistory:'shop', cpo:'tag',
    income:'coins', proposals:'folder', catalogue:'book', contacts:'contacts', control:'settings', access:'soa'
  };
  const navigation = {bh:'home',bs:'bars',bo:'dashboard',bt:'check',bnotice:'notice',bn:'bell',br:'headset'};
  const icon = name => `<svg class="ffNeonIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${vectors[name]}" fill="${name === 'logo' || name === 'home' ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function paint() {
    const app = root.querySelector(':scope > .app');
    if (!app || app.dataset.neonReady) return;
    app.dataset.neonReady = '1';
    for (const [id, name] of Object.entries(navigation)) {
      const glyph = app.querySelector(`#${id} > i`);
      if (glyph) glyph.innerHTML = icon(name);
    }
    const buttons = {bell:'bell',globalSearchBtn:'search',refresh:'refresh',dots:'dots'};
    for (const [id, name] of Object.entries(buttons)) {
      const button = app.querySelector(`#${id}`);
      if (!button) continue;
      for (const node of [...button.childNodes]) {
        if (node.nodeType === Node.TEXT_NODE || node.matches?.('.topBellSvg')) node.remove();
      }
      button.insertAdjacentHTML('afterbegin',icon(name));
      if (id === 'dots') button.setAttribute('aria-label','More options');
    }
    const logo = app.querySelector('.ffMiniLogo');
    if (logo) logo.innerHTML = icon('logo');

    const navPage = localStorage.getItem('ffh_last_page');
    const navId = {
      home:'bh', sales:'bs', dashboard:'bo', tasks:'bt', notices:'bnotice',
      notifications:'bn', communication:'br'
    }[navPage];
    if (navId) app.querySelector(`nav.bottom > #${navId}`)?.setAttribute('aria-current','page');

    const grid = app.querySelector('.homeGrid');
    if (!grid) return;

    const soa = grid.querySelector('[data-page="access"]');
    if (soa && typeof window.FFH_SOA_OPEN === 'function') {
      soa.id = 'ffhSoaLaunch';
      soa.dataset.ffhSoaReplaced = '1';
      soa.querySelector('.moduleTitle').textContent = 'SOA';
      soa.onclick = () => window.FFH_SOA_OPEN();
    }

    const english = localStorage.getItem('ffh_lang') !== 'bn';
    const artworkOrder = Object.keys(modules);
    for (const tile of grid.querySelectorAll('.module')) {
      const page = tile.dataset.page;
      const name = modules[page];
      if (!name || (page === 'access' && tile.id !== 'ffhSoaLaunch')) continue;
      tile.querySelector('.mi').innerHTML = icon(name);
      if (!english) continue;
      const slot = artworkOrder.indexOf(page);
      tile.style.setProperty('--home-art-x', `${(slot % 4) / 3 * 100}%`);
      tile.style.setProperty('--home-art-y', `${Math.floor(slot / 4) * 25}%`);
      tile.dataset.homeArtwork = '';
    }

    const ai = document.createElement('button');
    ai.type = 'button';
    ai.id = 'ffHomeAskAI';
    ai.textContent = 'AYON AI';
    ai.onclick = () => {
      app.querySelector('#drop').classList.remove('show');
      app.querySelector('#orb').click();
    };
    app.querySelector('#drop')?.prepend(ai);

    const hero = app.querySelector('.ffIdentityHero');
    if (hero) {
      const [clock, alarm, date, credit] = ['#ffHomeClock','#ffHomeAlarm','.heroDate','.ffIdentityCredit'].map(selector => hero.querySelector(selector));
      if (clock && alarm && date && credit) {
        const info = document.createElement('div');
        info.className = 'ffNeonInfo';
        const time = document.createElement('div');
        time.className = 'ffNeonTime';
        alarm.innerHTML = icon('clock');
        time.append(alarm,clock);
        info.append(time,date,credit);
        hero.append(info);
      }
    }
  }
  new MutationObserver(paint).observe(root,{childList:true});
  paint();

  // Leave the current DOM and any in-progress form on screen during a refresh.
  // A newly published shell still gets picked up when refreshing from Home.
  const shellResources = doc => [...doc.querySelectorAll('script[src],link[rel="stylesheet"]')]
    .map(el => el.getAttribute('src') || el.getAttribute('href'))
    .filter(path => path && !/^(?:[a-z]+:|\/\/)/i.test(path)).join('|');
  const loadedResources = shellResources(document);
  let refreshing = false;
  root.addEventListener('click',async event => {
    const button = event.target.closest('#refresh');
    if (!button) return;
    event.stopImmediatePropagation();
    if (refreshing) return;
    refreshing = true;
    button.setAttribute('aria-busy','true');
    const onHome = !!root.querySelector('.homeGrid');
    try {
      ffhRefreshCloudData();
      const announcements = root.querySelector('#ffTicker');
      if (announcements) ffHomeStatus.refresh().catch(console.warn);
      if (onHome) {
        const response = await fetch(location.pathname,{cache:'no-store',signal:AbortSignal.timeout(7000)});
        if (response.ok && root.querySelector('.homeGrid')) {
          const latest = new DOMParser().parseFromString(await response.text(),'text/html');
          if (latest.title === document.title && shellResources(latest) !== loadedResources) location.reload();
        }
      }
    } catch (error) {
      console.warn('FieldForce refresh:',error);
    } finally {
      refreshing = false;
      button.removeAttribute('aria-busy');
    }
  },true);
})();
