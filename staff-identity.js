/* Staff IDs are identities; names are display text only. */
(()=>{
 let people=[];
 const id=p=>String(p?.staff_id||p?.id||'');
 const find=value=>people.find(p=>id(p)===String(value||'').replace(/^STAFF:/,''));
 window.FFH_STAFF_LABEL=value=>{
  const p=typeof value==='object'?value:find(value);if(!p)return '';
  const sid=id(p),name=p.full_name||p.name||sid,managerId=p.manager_id,manager=find(managerId),route=p.route_name||p.route,canSell=p.can_sell;
  const role=canSell?(route?'SR + Route: '+route:'SR'):(p.designation||p.role||'Staff').replaceAll('_',' ');
  return sid+' · '+name+' (Manager: '+(manager?(id(manager)+' · '+(manager.full_name||manager.name)):managerId||'Not assigned')+') · '+role;
 };
 const update=()=>{if(!window.document)return;for(const option of document.querySelectorAll('select option')){const p=find(option.value);if(!p)continue;const text=window.FFH_STAFF_LABEL(p);if(option.textContent!==text)option.textContent=text;}};
 window.FFH_SET_STAFF=rows=>{people=rows||[];update();document.dispatchEvent(new Event('ffh-staff-updated'));};
 window.FFH_STAFF_ITEM=item=>{const p=find(item.value);return p?{...item,label:window.FFH_STAFF_LABEL(p),detail:item.detail||p.zone_id||p.zone||''}:item;};
 new MutationObserver(update).observe(document.body,{subtree:true,childList:true});
})();
