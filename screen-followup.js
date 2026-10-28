/* Requested category artwork and compact, plain contact typography. */
(()=>{'use strict';const app=document.getElementById('app');let queued=false;
function update(){queued=false;const nuts=[...app.querySelectorAll('.categoryFolder[data-cat]')].find(el=>decodeURIComponent(el.dataset.cat)==='Nuts, Dates & Pulses');const photo=nuts?.querySelector('img');if(photo&&!photo.dataset.ffDarkBanner){photo.dataset.ffDarkBanner='1';photo.src='category-assets/nuts-dark.webp?v=20261023-1';}
const competitor=app.querySelector('#ffCompetitorFindings');if(competitor&&!competitor.querySelector('.ffCompetitorArt')){const img=document.createElement('img');img.className='ffCompetitorArt';img.src='category-assets/competitor-dark.webp?v=20261023-1';img.alt='';img.decoding='async';competitor.prepend(img);}
app.querySelectorAll('.ffMoney').forEach(el=>{const value=el.querySelector('.ffMoneyValue'),parent=el.parentElement;if(!value||!parent||!parent.clientWidth)return;value.style.removeProperty('font-size');const width=el.getBoundingClientRect().width,limit=parent.clientWidth-4;if(width>limit&&limit>25){const size=parseFloat(getComputedStyle(value).fontSize);value.style.setProperty('font-size',Math.max(10,size*limit/width*.94)+'px','important');}});
app.querySelectorAll('.ffContactTags b').forEach(el=>{if(el.dataset.ffFitted===el.textContent)return;el.style.fontSize='11px';for(let size=11;el.scrollWidth>el.clientWidth+1&&size>8;){el.style.fontSize=(--size)+'px';}el.dataset.ffFitted=el.textContent;});}
function schedule(){if(!queued){queued=true;requestAnimationFrame(update);}}new MutationObserver(schedule).observe(app,{childList:true,subtree:true});window.addEventListener('resize',schedule);schedule();})();

/* Upgrade the popup DOM: its opener is private to app.js. */
(()=>{'use strict';
function enhance(){const popup=document.getElementById('aiPopup'),grid=popup?.querySelector('.aiQuickGrid');if(!grid||popup.querySelector('.aiQuestionPicker'))return;
const picker=document.createElement('details');picker.id='aiQuestionPicker';picker.className='aiQuestionPicker';const summary=document.createElement('summary'),questions=[...grid.querySelectorAll('.aiQuick')],bangla=questions.some(b=>/[\u0980-\u09ff]/.test(b.textContent));summary.append(`💡 ${bangla?'প্রশ্ন':'Questions'} (${questions.length}) `);const arrow=document.createElement('span');arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');summary.append(arrow);const heading=grid.previousElementSibling;if(heading?.tagName==='H3')heading.remove();grid.before(picker);picker.append(summary,grid);
const close=()=>{picker.open=false;};grid.addEventListener('click',e=>{if(e.target.closest('.aiQuick'))close();},true);popup.addEventListener('click',e=>{if(!picker.contains(e.target))close();},true);popup.addEventListener('keydown',e=>{if(e.key==='Escape'&&picker.open){close();summary.focus();e.stopPropagation();}});const chat=popup.querySelector('#aiPopupChat');if(chat)new MutationObserver(close).observe(chat,{childList:true});popup.classList.add('aiQuestionsReady');
}
new MutationObserver(enhance).observe(document.body,{childList:true});enhance();
})();
