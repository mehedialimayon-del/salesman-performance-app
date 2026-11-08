/* Countries: location-specific photos, proper flag images and conditional immigration indicators. */
(function(){
'use strict';
const flags={'Malaysia':'my','United Kingdom':'gb','Canada':'ca','Australia':'au','South Korea':'kr','China':'cn','Japan':'jp','Germany':'de','United States':'us','New Zealand':'nz','Ireland':'ie','France':'fr','Italy':'it','Netherlands':'nl','Sweden':'se','Finland':'fi','Singapore':'sg','United Arab Emirates':'ae','Turkey':'tr','Thailand':'th','Austria':'at','Belgium':'be','Czech Republic':'cz','Denmark':'dk','Greece':'gr','Hungary':'hu','Luxembourg':'lu','Norway':'no','Poland':'pl','Portugal':'pt','Spain':'es','Switzerland':'ch'};
const specificPhotos={
 'Austria':'https://unsplash.com/photos/5SjAaqqCCmY/download?w=900',
 'Belgium':'https://unsplash.com/photos/v5j_fxYUwaI/download?w=900',
 'Czech Republic':'https://unsplash.com/photos/LH5ZMJlrfMY/download?w=900',
 'Denmark':'https://images.unsplash.com/photo-1611515905024-d6530366c87c?w=900&q=80&fit=crop',
 'Greece':'https://unsplash.com/photos/XlqtaOxrxMY/download?w=900',
 'Hungary':'https://images.unsplash.com/photo-1698839958974-fe4825e89aa2?w=900&q=80&fit=crop',
 'Luxembourg':'https://unsplash.com/photos/eAAneqmKIQ8/download?w=900',
 'Norway':'https://unsplash.com/photos/egnGwjQc1hc/download?w=900',
 'Poland':'https://unsplash.com/photos/f8lkGwLzOak/download?w=900',
 'Portugal':'https://unsplash.com/photos/jF_7Fr2izAQ/download?w=900',
 'Spain':'https://unsplash.com/photos/PAKlGZNVUQM/download?w=900',
 'Switzerland':'https://unsplash.com/photos/YlNlzM4rC9g/download?w=900'
};
const pr=new Set(['United Kingdom','Canada','Australia','Germany','New Zealand','France','Italy','Netherlands','Sweden','Finland','Austria','Belgium','Czech Republic','Greece','Hungary','Luxembourg','Poland','Portugal','Spain','Norway']);
const spouse=new Set(['Malaysia','United Kingdom','Canada','Australia','South Korea','China','Japan','Germany','United States','New Zealand','France','Italy','Netherlands','Sweden','Finland','Austria','Belgium','Czech Republic','Denmark','Greece','Hungary','Luxembourg','Norway','Poland','Portugal','Spain','Switzerland']);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validPhoto=x=>/^https:\/\//i.test(String(x||''))?String(x):String(x||'').startsWith('photo-')?'https://images.unsplash.com/'+x+'?w=900&q=82&auto=format&fit=crop':'';
const pic=(name,source)=>specificPhotos[name]&&(!source||source==='photo-1513635269975-59663e0ac1ad')?specificPhotos[name]:validPhoto(source)||specificPhotos[name]||'';
function render(country){
 const name=String(country.name||''),iso=flags[name],flag=country.flag||'🌐';if(!name)return '';
 const hasPr=pr.has(name),hasSpouse=spouse.has(name),bg=pic(name,country.img);
 const safeLink='#/universities?country='+encodeURIComponent(name);
 const badge=(type,label,hint)=>'<span class="an-country-benefit '+type+'" title="'+esc(hint)+'" aria-label="'+esc(hint)+'">'+label+'</span>';
 const prTitle='Potential PR / long-term settlement route with separate work, residence and other conditions — studying does not grant PR.';
 const spouseTitle='Spouse / partner route may be available for eligible visa holders and courses. Restrictions and work rights vary.';
 const flagsHtml=iso?'<img class="an-country-flag-img" src="https://flagcdn.com/w80/'+iso+'.png" alt="'+esc(name)+' flag" loading="lazy" decoding="async" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'inline\'">'
  +'<span class="an-country-flag-fallback" aria-hidden="true">'+esc(flag)+'</span>':'<span class="an-country-flag-fallback" style="display:inline" aria-hidden="true">'+esc(flag)+'</span>';
 const imgHtml=bg?'<img class="an-country-backdrop" src="'+esc(bg)+'" alt="'+esc(name)+' destination landscape" loading="lazy" decoding="async" onerror="this.style.display=\'none\'">':'';
 const split=name.indexOf(' ');
 const heading=split<0?esc(name):esc(name.slice(0,split))+' <span>'+esc(name.slice(split+1))+'</span>';
 const count=Number.isFinite(country.count)?'<span class="an-country-count">'+country.count.toLocaleString('en-US')+' universities</span> · ':'';
 return '<a class="country an-country-card an-country-enriched" href="'+safeLink+'" aria-label="Explore '+esc(name)+' universities">'+imgHtml+
  '<span class="an-country-metadata"><span class="an-country-flag">'+flagsHtml+'</span>'+
  (hasPr?badge('is-pr','🏡 PR',prTitle):'')+(hasSpouse?badge('is-spouse','💍 Spouse',spouseTitle):'')+'</span>'+
  '<strong>'+heading+'</strong><small>'+count+'<span class="an-country-explore">Explore universities</span> <span aria-hidden="true">↗</span></small></a>';
}
window.ANCountryCards={render,flags,pr,spouse,specificPhotos};
})();