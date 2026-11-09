/* A&N country university directory, 2026-11-05.
   Named institutions and domains are a discovery directory, not proof of accreditation or a partnership.
   Hipo university-domains-list (MIT) may expand coverage when available; not exhaustive. */
(function(){
'use strict';
const grouped={
'Canada':"McGill University|mcgill.ca;McMaster University|mcmaster.ca;University of Alberta|ualberta.ca;University of Calgary|ucalgary.ca;University of Waterloo|uwaterloo.ca;York University|yorku.ca;Western University|uwo.ca;Queen's University|queensu.ca;University of Ottawa|uottawa.ca;Simon Fraser University|sfu.ca;Dalhousie University|dal.ca;Concordia University|concordia.ca;University of Manitoba|umanitoba.ca;University of Saskatchewan|usask.ca;Memorial University of Newfoundland|mun.ca;University of Victoria|uvic.ca;Carleton University|carleton.ca;University of Guelph|uoguelph.ca;Toronto Metropolitan University|torontomu.ca;University of New Brunswick|unb.ca",
'Australia':"University of Sydney|sydney.edu.au;University of New South Wales|unsw.edu.au;Australian National University|anu.edu.au;University of Queensland|uq.edu.au;University of Western Australia|uwa.edu.au;University of Technology Sydney|uts.edu.au;RMIT University|rmit.edu.au;Deakin University|deakin.edu.au;Queensland University of Technology|qut.edu.au;Curtin University|curtin.edu.au;Macquarie University|mq.edu.au;La Trobe University|latrobe.edu.au;Griffith University|griffith.edu.au;University of Wollongong|uow.edu.au;University of Newcastle|newcastle.edu.au;Victoria University|vu.edu.au;Swinburne University of Technology|swinburne.edu.au;Flinders University|flinders.edu.au;Bond University|bond.edu.au;University of Tasmania|utas.edu.au",
'South Korea':"Korea Advanced Institute of Science and Technology|kaist.ac.kr;Yonsei University|yonsei.ac.kr;Korea University|korea.ac.kr;Pohang University of Science and Technology|postech.ac.kr;Sungkyunkwan University|skku.edu;Hanyang University|hanyang.ac.kr;Kyung Hee University|khu.ac.kr;Ewha Womans University|ewha.ac.kr;Sogang University|sogang.ac.kr;Chung-Ang University|cau.ac.kr;University of Ulsan|ulsan.ac.kr;Pusan National University|pusan.ac.kr;Kyungpook National University|knu.ac.kr;Ulsan National Institute of Science and Technology|unist.ac.kr;Gwangju Institute of Science and Technology|gist.ac.kr;Inha University|inha.ac.kr;Konkuk University|konkuk.ac.kr;Ajou University|ajou.ac.kr",
'China':"Peking University|pku.edu.cn;Fudan University|fudan.edu.cn;Shanghai Jiao Tong University|sjtu.edu.cn;Zhejiang University|zju.edu.cn;University of Science and Technology of China|ustc.edu.cn;Nanjing University|nju.edu.cn;Wuhan University|whu.edu.cn;Tongji University|tongji.edu.cn;Xi'an Jiaotong University|xjtu.edu.cn;Harbin Institute of Technology|hit.edu.cn;Sun Yat-sen University|sysu.edu.cn;Beihang University|buaa.edu.cn;Sichuan University|scu.edu.cn;Southeast University|seu.edu.cn;Beijing Normal University|bnu.edu.cn",
'Japan':"University of Tokyo|u-tokyo.ac.jp;Kyoto University|kyoto-u.ac.jp;Osaka University|osaka-u.ac.jp;Tohoku University|tohoku.ac.jp;Nagoya University|nagoya-u.ac.jp;Kyushu University|kyushu-u.ac.jp;Hokkaido University|hokudai.ac.jp;Waseda University|waseda.jp;Keio University|keio.ac.jp;University of Tsukuba|tsukuba.ac.jp;Hiroshima University|hiroshima-u.ac.jp;Institute of Science Tokyo|isct.ac.jp;Kobe University|kobe-u.ac.jp;Ritsumeikan University|ritsumei.ac.jp;Sophia University|sophia.ac.jp",
'United States':"Harvard University|harvard.edu;Massachusetts Institute of Technology|mit.edu;Stanford University|stanford.edu;Yale University|yale.edu;Princeton University|princeton.edu;Columbia University|columbia.edu;University of Chicago|uchicago.edu;University of Pennsylvania|upenn.edu;Cornell University|cornell.edu;California Institute of Technology|caltech.edu;University of California Berkeley|berkeley.edu;University of California Los Angeles|ucla.edu;University of California San Diego|ucsd.edu;University of Michigan|umich.edu;Johns Hopkins University|jhu.edu;Northwestern University|northwestern.edu;Carnegie Mellon University|cmu.edu;Duke University|duke.edu;University of Texas at Austin|utexas.edu;University of Washington|washington.edu;University of Illinois Urbana-Champaign|illinois.edu;New York University|nyu.edu;Boston University|bu.edu;University of Southern California|usc.edu",
'New Zealand':"University of Auckland|auckland.ac.nz;University of Otago|otago.ac.nz;Victoria University of Wellington|wgtn.ac.nz;University of Canterbury|canterbury.ac.nz;Massey University|massey.ac.nz;University of Waikato|waikato.ac.nz;Lincoln University|lincoln.ac.nz;Auckland University of Technology|aut.ac.nz",
'Singapore':"National University of Singapore|nus.edu.sg;Nanyang Technological University|ntu.edu.sg;Singapore Management University|smu.edu.sg;Singapore University of Technology and Design|sutd.edu.sg;Singapore Institute of Technology|singaporetech.edu.sg;Singapore University of Social Sciences|suss.edu.sg",
'United Arab Emirates':"Khalifa University|ku.ac.ae;United Arab Emirates University|uaeu.ac.ae;Abu Dhabi University|adu.ac.ae;University of Sharjah|sharjah.ac.ae;American University of Sharjah|aus.edu;Zayed University|zu.ac.ae;Ajman University|ajman.ac.ae;Mohamed bin Zayed University of Artificial Intelligence|mbzuai.ac.ae;New York University Abu Dhabi|nyuad.nyu.edu",
'Turkey':"Bogazici University|boun.edu.tr;Middle East Technical University|metu.edu.tr;Istanbul Technical University|itu.edu.tr;Koc University|ku.edu.tr;Sabanci University|sabanciuniv.edu;Bilkent University|bilkent.edu.tr;Istanbul University|istanbul.edu.tr;Ankara University|ankara.edu.tr;Hacettepe University|hacettepe.edu.tr;Ege University|ege.edu.tr;Marmara University|marmara.edu.tr;Yildiz Technical University|yildiz.edu.tr",
'Thailand':"Chulalongkorn University|chula.ac.th;Mahidol University|mahidol.ac.th;Chiang Mai University|cmu.ac.th;Thammasat University|tu.ac.th;Kasetsart University|ku.ac.th;Khon Kaen University|kku.ac.th;Prince of Songkla University|psu.ac.th;King Mongkut's University of Technology Thonburi|kmutt.ac.th;Bangkok University|bu.ac.th"
};
const aliases={'United States of America':'United States',USA:'United States','Republic of Korea':'South Korea','Korea, Republic of':'South Korea','Korea (South)':'South Korea',Turkiye:'Turkey',Türkiye:'Turkey'};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
const seeds=[];
Object.keys(grouped).forEach(country=>grouped[country].split(';').forEach(entry=>{
 const [name,domain]=entry.split('|');if(!name||!domain)return;
 seeds.push({id:'an-global-'+domain.replace(/[^a-z0-9]/gi,'-').toLowerCase(),name,short:name,country,city:country,kind:'University',programs:[],site:'https://'+domain,photo:'',source:'A&N institutional website directory'});
}));
function addUnique(target,items){
 const names=new Set(),hosts=new Set();
 target.forEach(u=>{names.add(norm(u.country)+'|'+norm(u.name));
   try{hosts.add(norm(u.country)+'|'+new URL(u.site).hostname.replace(/^www\./,''));}catch{}
 });
 let added=0;
 items.forEach(u=>{
  const key=norm(u.country)+'|'+norm(u.name);
  let host='';try{host=new URL(u.site).hostname.replace(/^www\./,'');}catch{}
  const hkey=norm(u.country)+'|'+host;
  if(names.has(key)||(host&&hosts.has(hkey)))return;
  names.add(key);if(host)hosts.add(hkey);target.push(u);added++;
 });
 return added;
}
let loading=null,loaded=false;
let localSnapshotPromise=null;
function loadLocalSnapshot(){
 if(localSnapshotPromise)return localSnapshotPromise;
 const packed=window.ANWorldDirectorySnapshotGzip;
 if(!packed||typeof DecompressionStream!=='function')return Promise.resolve(false);
 localSnapshotPromise=(async()=>{
  try{
   const bytes=Uint8Array.from(atob(packed),ch=>ch.charCodeAt(0));
   const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
   const rows=await new Response(stream).json();
   if(!Array.isArray(rows)||rows.length<1000||typeof U==='undefined'||!Array.isArray(U))return false;
   const items=[];
   rows.forEach(row=>{
    if(!Array.isArray(row)||row.length!==4)return;
    const [name,country,city,site]=row;
    if(!name||!country||!site)return;
    let hostname;try{hostname=new URL(site).hostname;}catch{return;}
    items.push({id:'an-h-dir-'+norm(country)+'-'+norm(hostname),name,short:name,country,
      city:city||country,kind:'University',programs:[],site,photo:'',
      source:'Hipo public university domains list (recognition unverified)'});
   });
   const added=addUnique(U,items);
   if(!loaded)window.ANWorldDirectoryStatus={source:'Hipo local snapshot',added,records:rows.length};
   window.dispatchEvent(new CustomEvent('an-world-directory-updated',{detail:{count:U.length,source:'snapshot'}}));
   if(location.hash.startsWith('#/universities')&&typeof renderResults==='function')renderResults();
   if(location.hash.startsWith('#/countries')&&typeof render==='function')render();
   return true;
  }catch(error){window.ANWorldDirectorySnapshotError=String(error);return false;}
 })();
 return localSnapshotPromise;
}
function enrich(){
 if(typeof U==='undefined'||!Array.isArray(U))return;
 addUnique(U,seeds);
}
async function loadPublicDirectory(){
 if(loaded||loading)return loading;
 if(typeof U==='undefined'||!Array.isArray(U))return;
 loading=(async()=>{
   try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),17000);
    let response;
    try{response=await fetch('https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json',{signal:controller.signal,mode:'cors'});}finally{clearTimeout(timeout);}
    if(!response.ok)throw Error('supplement unavailable');
    const rows=await response.json();if(!Array.isArray(rows))throw Error('invalid dataset');
    const allow=new Set(typeof countries==='undefined'?[]:countries.map(x=>x[0]));
    // Malaysia retains the original owner-curated catalogue; do not flood it with unaudited college-directory records.
    allow.delete('Malaysia');
    const items=[];
    rows.forEach(row=>{
     if(!row||!row.name||!row.country)return;
     const country=aliases[row.country]||row.country;if(!allow.has(country))return;
     const link=(row.web_pages||[]).find(s=>/^https?:\/\//i.test(s));if(!link)return;
     let site;try{const u=new URL(link);u.protocol='https:';site=u.origin+'/';}catch{return;}
     const name=String(row.name).trim();if(name.length<5||name.length>130)return;
     // French regional "Académie de …" education authorities are not universities.
     // Hipo lists some as universities: exclude instead of presenting repeated state seals as school logos.
     if(country==='France'&&/^Acad[eé]mie de\s/i.test(name))return;
     // Asian University / Asian University of Science and Technology are aliases of one institution
     // formally closed in August 2017. Do not offer new admissions to defunct institutions.
     if(country==='Thailand'&&/^Asian University(?: of Science and Technology)?$/i.test(name))return;
     items.push({id:'an-h-dir-'+norm(country)+'-'+norm(new URL(site).hostname),name,short:name,country,city:row['state-province']||country,kind:'University',programs:[],site,photo:'',source:'Hipo directory (unverified recognition)'});
    });
    const added=addUnique(U,items);loaded=true;
    window.ANWorldDirectoryStatus={source:'Hipo open directory',added,records:rows.length};
    // Do not allocate full detail profiles for every imported directory row on mobile.
    if(location.hash.startsWith('#/universities')&&typeof renderResults==='function')renderResults();
    if(location.hash.startsWith('#/countries')&&typeof render==='function')render();
    if(location.hash.startsWith('#/favorites'))window.ANUniversityFavorites?.renderSaved?.();
   }catch(err){window.ANWorldDirectoryStatus={source:'Curated local list',added:0,note:'Supplement unavailable'};}
 })();return loading;
}
function maybeLoad(){
 const profile=location.hash.match(/^#\/university\/([^?/#]+)/);
 if(profile&&typeof U!=='undefined'&&!U.some(u=>u.id===profile[1])){
  const route=location.hash;
  const hasProfile=()=>U.some(u=>u.id===profile[1]);
  loadLocalSnapshot().then(async()=>{
   if(location.hash!==route)return;
   if(!hasProfile())await loadPublicDirectory();
   if(location.hash===route&&hasProfile()&&typeof render==='function')render();
  });
  return;
 }
 if(!/^#\/(universities|countries|favorites)\b/.test(location.hash))return;
 enrich();
 loadLocalSnapshot();
 loadPublicDirectory();
}
/* Live, auditable field coverage. Directory-only rows are not completed profiles. */
function coverageReport(target=typeof U!=='undefined'&&Array.isArray(U)?U:[]){
 const total=target.length;
 const usable=v=>v!==undefined&&v!==null&&v!==''&&(!Array.isArray(v)||v.length>0);
 const fields={
  identity:u=>usable(u.name)&&usable(u.country),
  officialWebsite:u=>/^https:\/\//i.test(String(u.site||'')),
  programmeList:u=>Array.isArray(u.programs)&&u.programs.length>0,
  faculty:u=>usable(u.faculty)||usable(u.faculties),
  tuition:u=>usable(u.tuition)&&usable(u.tuitionSource),
  ranking:u=>usable(u.ranking)&&usable(u.rankingSource),
  intake:u=>usable(u.intake)&&usable(u.intakeSource),
  deadline:u=>usable(u.deadline)&&usable(u.deadlineSource),
  entryRequirements:u=>usable(u.entry)&&usable(u.entrySource)
 };
 const counts=Object.fromEntries(Object.entries(fields).map(([name,test])=>[name,target.filter(test).length]));
 const complete=target.filter(u=>Object.values(fields).every(test=>test(u))).length;
 return {target:6210,loaded:total,remainingToTarget:Math.max(0,6210-total),fullyComplete:complete,incomplete:total-complete,fields:counts,updatedAt:new Date().toISOString(),note:'Counts reflect loaded university records, not externally verified university admissions. Directory-only entries are incomplete.'};
}
window.ANUniversityCoverageReport=coverageReport;
window.ANWorldUniCatalogSeeds=seeds;
window.ANWorldDirectory={addUnique,loadPublicDirectory,loadLocalSnapshot,maybeLoad,enrich};
window.addEventListener('hashchange',maybeLoad);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',maybeLoad,{once:true});
else setTimeout(maybeLoad,0);
})();