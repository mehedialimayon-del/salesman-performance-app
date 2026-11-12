(()=>{'use strict';const main=document.querySelector('main');if(!main)return;const master=document.getElementById('masterSearch')?.closest('.card');const entry=document.querySelector('.card.entry');const stats=document.querySelector('.stats')?.closest('.card');const downloads=document.getElementById('soaDownloads');const ledger=document.querySelector('.card.ledger');const importBox=document.getElementById('transactionImport');const paper=document.getElementById('paper');const preview=paper?.parentElement;if(!master||!entry||!stats||!downloads||!ledger||!preview)return;
const nav=document.createElement('nav');nav.id='soaMobileTabs';nav.setAttribute('aria-label','SOA sections');nav.innerHTML='<button type="button" data-soa-tab="entry" aria-selected="true">Entry</button><button type="button" data-soa-tab="ledger" aria-selected="false">Transactions</button><button type="button" data-soa-tab="report" aria-selected="false">SOA / Export</button>';
const root=document.createElement('div');root.id='soaMobilePanels';
const make=(id)=>{const el=document.createElement('section');el.className='soaMobilePanel';el.dataset.panel=id;root.appendChild(el);return el};
const a=make('entry'),b=make('ledger'),c=make('report');a.append(master,stats,entry);b.append(ledger,importBox);c.append(downloads,preview);
main.replaceChildren(nav,root);
function select(id){for(const el of root.children){el.classList.toggle('soaPanelActive',el.dataset.panel===id)}for(const btn of nav.querySelectorAll('button'))btn.setAttribute('aria-selected',String(btn.dataset.soaTab===id));try{sessionStorage.setItem('ffh_soa_mobile_tab',id)}catch{}}
const allowed=['entry','ledger','report'];let tab='entry';try{tab=sessionStorage.getItem('ffh_soa_mobile_tab')||'entry'}catch{}select(allowed.includes(tab)?tab:'entry');nav.addEventListener('click',e=>{const btn=e.target.closest('[data-soa-tab]');if(btn)select(btn.dataset.soaTab)});
const editButtons=ledger.querySelector('#rows');editButtons?.addEventListener('click',e=>{if(e.target.closest('[data-edit]'))select('entry')});
const watch=new MutationObserver(()=>{if(importBox&&!importBox.hidden)select('ledger')});if(importBox)watch.observe(importBox,{attributes:true,attributeFilter:['hidden']});
const style=document.createElement('style');style.textContent=`
@media(max-width:850px){
html,body{height:auto!important;min-height:100%;overflow-x:hidden!important;overflow-y:auto!important}
body{display:block;min-height:100vh}
body>header{flex:0 0 auto;padding:9px 14px}
body>header h1{font-size:15px}body>header small{font-size:10px}
main{width:100%;max-width:100%;min-height:0;display:block;overflow:visible;padding:7px!important}
#soaMobileTabs{position:sticky;top:0;z-index:10;background:#edf3fa;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;padding-bottom:6px}
#soaMobileTabs button{margin:0;padding:10px 3px;font-size:12px;background:#e2eaf4;color:#173456;font-weight:700}
#soaMobileTabs button[aria-selected=true]{background:#1262b5;color:white}
#soaMobilePanels{min-height:0;overflow:visible}
.soaMobilePanel{display:none;height:auto;min-height:0;overflow:visible;padding:2px 3px 18px}
.soaMobilePanel.soaPanelActive{display:block}
.soaMobilePanel .card{padding:11px;margin-bottom:8px;border-radius:10px}
.soaMobilePanel h3{font-size:15px;margin:3px 0 7px}
.soaMobilePanel label{font-size:12px;margin:5px 0}
.soaMobilePanel input,.soaMobilePanel select{padding:9px;margin-top:3px;font-size:14px}
.soaMobilePanel button{padding:9px 11px;font-size:12px}
.soaMobilePanel .stats{grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}
.soaMobilePanel .stat{padding:8px;font-size:10px;overflow-wrap:anywhere}
.soaMobilePanel .stat strong{font-size:14px;margin-top:4px}
.soaMobilePanel .note,#entryGuide{display:none}
.soaMobilePanel #paper{min-width:0;max-width:100%;font-size:10px;padding:8px;overflow-x:auto}
.soaMobilePanel .scroll{max-height:none;overflow:auto}
.soaMobilePanel #masterResult{font-size:11px;margin:5px 0}
.soaMobilePanel #masterCount{font-size:10px}
.soaMobilePanel #customerDetails[hidden],.soaMobilePanel [hidden]{display:none!important}
.soaMobilePanel .ledger table{min-width:530px}
}
@media(min-width:851px){#soaMobileTabs{display:none}.soaMobilePanel{display:contents}}
@media print{html,body{height:auto!important;overflow:visible!important;display:block!important}body>header,#soaMobileTabs{display:none!important}main,#soaMobilePanels{display:block!important;height:auto!important;overflow:visible!important}.soaMobilePanel{display:block!important;height:auto!important;overflow:visible!important}.soaMobilePanel:not([data-panel=report]){display:none!important}#soaDownloads{display:none!important}#paper{overflow:visible!important}}
`;document.head.append(style);
})();