/* Catalogue campaign visibility: read-only viewer, using existing cloud-managed CPO / Promotion and Incentive campaigns. */
(function(){
  'use strict';
  var state={promotions:[],rewards:[],promotionsReady:false,rewardsReady:false,loading:false,lastRead:0};
  var currentGrid=null,scheduled=false,previousFocus=null;
  function normal(v){return String(v==null?'':v).normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');}
  function malaysiaDay(){
    var parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    var data={};parts.forEach(function(p){data[p.type]=p.value;});
    return data.year+'-'+data.month+'-'+data.day;
  }
  function live(x,day){
    if(!x||x.active===false)return false;
    var a=String(x.startDate||x.start_date||x.date||'').slice(0,10);
    var b=String(x.endDate||x.end_date||'').slice(0,10);
    return !!(a&&b&&a<=day&&b>=day);
  }
  function equalsSku(candidate,product){
    var v=normal(candidate);
    if(!v||v==='all'||v==='all products')return false;
    return v===normal(product.sku)||v===normal(product.id)||v===normal(product.name);
  }
  function promoSku(c,p){
    var items=Array.isArray(c.productSkus)?c.productSkus:[];
    if(items.length)return items.some(function(v){return equalsSku(v,p);});
    if(c.allProducts===true||normal(c.product)==='all products')return true;
    return String(c.product||'').split(/\s+\+\s+/).some(function(v){return equalsSku(v,p);});
  }
  function rewardSku(r,p){
    return (Array.isArray(r.groups)?r.groups:[]).some(function(g){
      var skus=Array.isArray(g.skus)?g.skus:(g.sku?[g.sku]:[]);
      return skus.some(function(v){return equalsSku(v,p);});
    });
  }
  function current(p){
    var day=malaysiaDay();
    var campaigns=state.promotions.filter(function(c){return live(c,day)&&promoSku(c,p);});
    var direct=state.rewards.filter(function(r){return live(r,day)&&rewardSku(r,p);});
    var extra=campaigns.filter(function(c){return Number(c.incentiveAmount||0)>0;});
    return {promotions:campaigns,incentives:direct.concat(extra),direct:direct};
  }
  function productOf(card){
    var label=card.querySelector('.ffProductName');
    var identity=card.querySelector('.ffFavoriteAdd[data-code]');
    var name=label?label.textContent.trim():'';
    var code=identity?identity.getAttribute('data-code'):'';
    if(!code)card.querySelectorAll('.ffSkuIdentity>div').forEach(function(row){
      if(normal(row.querySelector('span')&&row.querySelector('span').textContent)==='item code')
        code=String(row.querySelector('strong')&&row.querySelector('strong').textContent||'').trim();
    });
    return {sku:code,name:name,id:card.getAttribute('data-id')||''};
  }
  function putStatus(button,enabled,ready){
    var value=ready?(enabled?'ON':'OFF'):'SYNC';
    if(button.dataset.status===value)return;
    button.dataset.status=value;button.disabled=!enabled;
    button.setAttribute('aria-disabled',String(!enabled));
    button.querySelector('.ffSkuOfferState').textContent=value;
  }
  function render(){
    var cards=document.querySelectorAll('#skuList .ffPremiumSku');
    cards.forEach(function(card){
      // Force the requested orange labels and pure-white numbers directly on each
      // catalogue field. Older app.js styles inject later with !important and can
      // override a head stylesheet. Inline-important wins without changing theme.
      card.querySelectorAll('.ffSkuFour .ffSkuChip small, .ffSkuIdentity span').forEach(function(label){
        label.style.setProperty('color','#ff7a17','important');
        label.style.setProperty('font-weight','900','important');
      });
      card.querySelectorAll('.ffSkuFour .ffSkuChip strong, .ffSkuIdentity strong').forEach(function(value){
        value.style.setProperty('color','#ffffff','important');
        value.style.setProperty('font-weight','950','important');
      });
      var area=card.querySelector('.ffSkuOfferStack');
      if(!area){
        area=document.createElement('div');area.className='ffSkuOfferStack';
        ['promotion','incentive'].forEach(function(kind){
          var b=document.createElement('button');b.type='button';b.className='ffSkuOffer';b.dataset.kind=kind;
          var label=document.createElement('span');label.className='ffSkuOfferLabel';label.textContent=kind==='promotion'?'PROMOTION':'INCENTIVE';
          var value=document.createElement('span');value.className='ffSkuOfferState';value.textContent='SYNC';
          b.appendChild(label);b.appendChild(value);area.appendChild(b);
        });
        var details=card.querySelector('.ffViewDetails');
        if(details)details.insertAdjacentElement('afterend',area);
        else card.appendChild(area);
      }
      var p=productOf(card),matching=current(p);
      var promo=area.querySelector('[data-kind="promotion"]'),incentive=area.querySelector('[data-kind="incentive"]');
      putStatus(promo,matching.promotions.length>0,state.promotionsReady);
      putStatus(incentive,matching.incentives.length>0,state.rewardsReady&&state.promotionsReady);
      promo.setAttribute('aria-label','Promotion '+(promo.dataset.status||'SYNC')+' for '+p.name);
      incentive.setAttribute('aria-label','Incentive '+(incentive.dataset.status||'SYNC')+' for '+p.name);
    });
  }
  function queueRender(){if(scheduled)return;scheduled=true;requestAnimationFrame(function(){scheduled=false;render();});}
  async function refresh(){
    var sb=window.FFH_SUPABASE;
    if(!sb||state.loading||!document.querySelector('#skuList .ffPremiumSku'))return;
    state.loading=true;
    try{
      var values=await Promise.allSettled([sb.rpc('ffh_campaign_state'),sb.rpc('ffh_earnings',{action:'state',payload:{}})]);
      if(values[0].status==='fulfilled'&&!values[0].value.error&&Array.isArray(values[0].value.data)){
        state.promotions=values[0].value.data;state.promotionsReady=true;
      }
      if(values[1].status==='fulfilled'&&!values[1].value.error&&Array.isArray(values[1].value.data&&values[1].value.data.offers)){
        state.rewards=values[1].value.data.offers;state.rewardsReady=true;
      }
      state.lastRead=Date.now();
    }catch(err){console.warn('Catalogue campaign status unavailable',err);}
    finally{state.loading=false;queueRender();}
  }
  function inspect(){
    var grid=document.querySelector('#skuList.ffReferenceProducts');
    if(grid&&grid!==currentGrid){currentGrid=grid;queueRender();refresh();}
    else if(!grid){currentGrid=null;}
    else queueRender();
  }
  function el(tag,klass,value){
    var x=document.createElement(tag);if(klass)x.className=klass;
    if(value!=null)x.textContent=String(value);return x;
  }
  function addLine(parent,label,value){
    if(value==null||String(value).trim()==='')return;
    var row=el('div','ffSkuOfferInfo');row.appendChild(el('b','',label));row.appendChild(el('span','',value));parent.appendChild(row);
  }
  function openDetails(kind,card,origin){
    var p=productOf(card),items=current(p);
    var choices=kind==='promotion'?items.promotions:items.incentives;
    if(!choices.length)return;
    previousFocus=origin;
    var overlay=el('div','ffSkuOfferOverlay');overlay.setAttribute('role','presentation');
    var panel=el('section','ffSkuOfferPanel');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
    panel.setAttribute('aria-label',(kind==='promotion'?'Promotion':'Incentive')+' details');
    var header=el('div','ffSkuOfferHeader'),back=el('button','ffSkuOfferBack','← BACK'),head=el('div','');
    back.type='button';head.appendChild(el('small','',p.sku?'SKU '+p.sku:'PRODUCT DETAILS'));
    head.appendChild(el('h2','',kind==='promotion'?'ACTIVE PROMOTIONS':'ACTIVE INCENTIVES'));
    header.appendChild(back);header.appendChild(head);panel.appendChild(header);
    panel.appendChild(el('p','ffSkuOfferProductName',p.name));
    choices.forEach(function(item){
      var box=el('article','ffSkuOfferEntry');
      var heading=el('h3','',item.title||item.name||'Campaign');box.appendChild(heading);
      addLine(box,'Type',item.type||item.campaign_type||(item.groups?'Incentive':'Promotion'));
      addLine(box,'Valid',String(item.startDate||item.start_date||'')+' → '+String(item.endDate||item.end_date||''));
      if(item.productMode==='combo')addLine(box,'Offer','Combo products');
      if(item.comboQty)addLine(box,'Buy quantity',item.comboQty);
      if(item.incentiveAmount)addLine(box,'Extra incentive','RM '+item.incentiveAmount+(item.incentiveTarget?' / target '+item.incentiveTarget:''));
      var picture=item.image||item.poster_url||'';
      if(/^https:\/\//i.test(picture)){var photo=el('img','ffSkuOfferPhoto');photo.src=picture;photo.loading='lazy';photo.alt='Campaign poster';box.appendChild(photo);}
      var details=item.details||item.description||'';
      if(details)box.appendChild(el('p','ffSkuOfferDescription',details));
      if(Array.isArray(item.groups)){
        item.groups.filter(function(g){return (g.skus||[]).some(function(v){return equalsSku(v,p);});}).forEach(function(g){
          var info=el('div','ffSkuOfferRule');
          info.appendChild(el('b','',g.name||'SKU incentive rule'));
          addLine(info,'Target',String(g.target||'')+' '+(g.mode==='sales'?'RM':'cartons'));
          addLine(info,'Reward','RM '+String(g.reward||0));
          box.appendChild(info);
        });
      }
      panel.appendChild(box);
    });
    panel.appendChild(el('p','ffSkuOfferReadOnly','This catalogue view is read-only. Campaigns are published in CPO / Promotion / Incentives by authorized staff.'));
    overlay.appendChild(panel);document.body.appendChild(overlay);
    function close(){overlay.remove();document.removeEventListener('keydown',key);if(previousFocus&&previousFocus.isConnected)previousFocus.focus();}
    function key(e){if(e.key==='Escape')close();}
    back.addEventListener('click',close);
    overlay.addEventListener('click',function(e){if(e.target===overlay)close();});
    document.addEventListener('keydown',key);back.focus();
  }
  document.addEventListener('click',function(e){
    var btn=e.target.closest&&e.target.closest('.ffSkuOffer[data-kind]');
    if(!btn||btn.dataset.status!=='ON')return;
    var card=btn.closest('.ffPremiumSku');if(card)openDetails(btn.dataset.kind,card,btn);
  });
  new MutationObserver(inspect).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('focus',function(){if(document.querySelector('#skuList .ffPremiumSku'))refresh();});
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&document.querySelector('#skuList .ffPremiumSku'))refresh();});
  window.setInterval(function(){if(document.querySelector('#skuList .ffPremiumSku')&&Date.now()-state.lastRead>100000)refresh();},120000);
  inspect();
  window.FFH_CATALOGUE_CAMPAIGN_RULES={live:live,promoSku:promoSku,rewardSku:rewardSku};
})();
