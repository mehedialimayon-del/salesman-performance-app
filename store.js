/* Shared storage service — isolated from page/module UI */
window.FFHStore = (() => {
  const KEY = "ffh-v2-store";
  const defaults = {
    sales: [],
    cpo: [],
    dpo: [],
    routes: [],
    incentives: [],
    incomeSetup: {},
    targets: {},
    month: new Date().toISOString().slice(0,7)
  };
  function load(){
    try { return {...defaults, ...(JSON.parse(localStorage.getItem(KEY)) || {})}; }
    catch(e){ return {...defaults}; }
  }
  let data = load();
  function save(){ localStorage.setItem(KEY, JSON.stringify(data)); }
  return {
    get: () => data,
    set: (key,value) => { data[key]=value; save(); return value; },
    push: (key,value) => { if(!Array.isArray(data[key])) data[key]=[]; data[key].push(value); save(); return value; },
    reset: () => { data={...defaults}; save(); }
  };
})();