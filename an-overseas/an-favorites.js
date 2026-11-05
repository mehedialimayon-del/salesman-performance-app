/* A&N public favourites: private to the current browser until student authentication is enabled. */
(function(){
'use strict';
const STORAGE='an-overseas-saved-universities-v1';let temp=[];
const safe=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function read(){try{const list=JSON.parse(localStorage.getItem(STORAGE)||'[]');return Array.isArray(list)?list.filter(x=>typeof x==='string').slice(0,3000):temp;}catch{return temp;}}
function save(list){temp=list;try{localStorage.setItem(STORAGE,JSON.stringify(list));}catch{}}
function toggle(id){
 if(!id)return;
 const list=read(),position=list.indexOf(id);
 if(position<0)list.push(id);else list.splice(position,1);
 save(list);refresh();
 if(location.hash.split('?')[0]==='#/favorites')renderSaved();
}
function button(id){const checked=read().includes(id);return '<button type="button" class="an-favorite-heart'+(checked?' saved':'')+'" data-favorite-university="'+safe(id)+'" aria-pressed="'+checked+'" aria-label="'+(checked?'Remove from':'Save to')+' favourites" title="'+(checked?'Remove from favourites':'Save university')+'">'+(checked?'♥':'♡')+'</button>';}
function refresh(){
 const selected=new Set(read());
 document.querySelectorAll('[data-favorite-university]').forEach(el=>{
  const on=selected.has(el.dataset.favoriteUniversity);el.classList.toggle('saved',on);
  el.textContent=on?'♥':'♡';el.setAttribute('aria-pressed',String(on));
  el.title=on?'Remove from favourites':'Save university';
  el.setAttribute('aria-label',on?'Remove from favourites':'Save university to favourites');
 });
 document.querySelectorAll('[data-favorite-count]').forEach(el=>el.textContent=selected.size);
}
function profile(u){
 const banner=document.querySelector('.university-profile .profile-identity');
 if(banner&&!banner.querySelector('.an-profile-fav')){const wrap=document.createElement('span');wrap.className='an-profile-fav';wrap.innerHTML=button(u.id);banner.append(wrap);}
 refresh();
}
function page(){
 return '<section class="page-head"><div class="wrap"><div class="bread"><a href="#/universities">Universities</a> › Favourites</div><h1><span>Saved</span> Universities</h1><p>Your short-listed universities, with their same full profiles and Apply Through A&N links.</p></div></section><div class="wrap content university-catalogue an-favorite-page"><p class="an-favourite-notice">Saved on this browser. Until the student login system is active, favourites do not yet sync between phones or student accounts.</p><div class="an-favorite-head"><strong id="an-fav-count">0 saved universities</strong><a href="#/universities">+ Explore all universities ↗</a></div><div class="grid" id="an-saved-grid"></div></div>';
}
function renderSaved(){
 const list=read();const count=document.getElementById('an-fav-count');if(count)count.textContent=list.length+' saved universities';
 const root=document.getElementById('an-saved-grid');if(!root)return;
 const catalog=typeof U==='undefined'?[]:U,items=list.map(id=>catalog.find(u=>u.id===id)).filter(Boolean);
 root.innerHTML=items.length?items.map(u=>window.ANCatalogueExtras?.anNumberedCard?.(u)||card(u)).join(''):
 '<div class="empty"><h3>No favourites yet</h3><p>Tap ♡ on a university card to save it here for later.</p><a class="btn" href="#/universities">Browse universities ↗</a></div>';
 refresh();
}
document.addEventListener('click',e=>{const el=e.target.closest('[data-favorite-university]');if(!el)return;e.preventDefault();e.stopPropagation();toggle(el.dataset.favoriteUniversity);},true);
window.addEventListener('storage',e=>{if(e.key===STORAGE){refresh();renderSaved();}});
window.ANUniversityFavorites={page,renderSaved,profile,refresh,button,toggle,read};
})();