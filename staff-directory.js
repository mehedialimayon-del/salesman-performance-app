(function(global){
  'use strict';
  const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase().trim();
  const fallbackEscape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const zoneLabel = (zone, id) => {
    if(id==='PRIMARY') return 'KL ZONE';
    if(id==='HEAD_OFFICE') return 'HEAD OFFICE';
    const label=String(zone?.name || id || 'UNASSIGNED').trim();
    return (/\b(team|zone|office)\b/i.test(label)?label:label+' TEAM').toLocaleUpperCase();
  };
  function buildGroups(profiles, zones, owner) {
    const byZone = new Map();
    for(const p of profiles || []) {
      const id=String(p.zone_id||'UNASSIGNED');
      if(!byZone.has(id))byZone.set(id,[]);
      byZone.get(id).push(p);
    }
    const zoneLookup = new Map((zones||[]).map(z=>[String(z.id),z]));
    const groups = [...byZone].map(([id,members])=>{
      const label=zoneLabel(zoneLookup.get(id),id);
      members.sort((a,b)=>{
        const order=p=>owner&&p.staff_id==='M21954'?0:p.can_manage?1:2;
        return order(a)-order(b)||String(a.full_name||'').localeCompare(String(b.full_name||''),'en');
      });
      return {id,label,members};
    });
    groups.sort((a,b)=>{
      const rank=g=>g.id==='PRIMARY'?0:g.id==='HEAD_OFFICE'?2:1;
      return rank(a)-rank(b)||a.label.localeCompare(b.label,'en');
    });
    return groups;
  }
  function render({profiles=[],zones=[],owner=false,admin=false,viewerId='',escape:fallback=fallbackEscape}={}){
    const E=fallback;
    const allPeople = profiles || [];
    const byId = new Map(allPeople.map(p=>[p.staff_id,p]));
    const groups=buildGroups(allPeople,zones,owner);
    const staffRow=p=>{
      const own=owner&&p.staff_id==='M21954';
      const manager=!!p.can_manage;
      const managerName=byId.get(p.manager_id)?.full_name||'';
      const publicId=p.company_staff_id??(Object.hasOwn(p,'company_staff_id')?'Staff ID pending':p.staff_id);
      const role=String(p.designation||p.role||(manager?'MANAGER':'SR')).replace(/_/g,' ');
      const searchable=normalize([p.full_name,p.staff_id,p.company_staff_id,role,p.zone_id,p.team_name,managerName].filter(Boolean).join(' '));
      const canEdit=admin&&!own&&(owner||(p.staff_id!==viewerId&&p.staff_id!=='PERVES_HIRA'));
      const initials=String(p.full_name||p.staff_id||'?').trim().charAt(0).toLocaleUpperCase();
      return '<article class="ffTeamPerson" data-ff-staff-item data-staff-search="'+E(searchable)+'">'
        +'<div class="ffTeamIdentity"><span class="ffTeamAvatar" aria-hidden="true">'+E(initials)+'</span>'
        +'<div class="ffTeamInfo"><strong>'+E(p.full_name||p.staff_id)+'</strong>'
        +'<div class="ffTeamDetails"><span class="ffStaffPublicId">'+E(publicId)+'</span> · '+E(role)
        +' · '+(p.active===false?'INACTIVE':'ACTIVE')+(p.can_sell?' · SR ROUTE':'')+'</div>'
        +(own?'<small class="ffTeamOwnLabel">OWNER · MY ACCOUNT</small>':manager?'<small class="ffTeamManagerLabel">TEAM MANAGEMENT</small>':(managerName?'<small>Manager: '+E(managerName)+'</small>':''))
        +(p.team_name&&(!managerName||manager)?'<small>'+E(p.team_name)+'</small>':'')
        +'</div></div><div class="ffTeamActions">'
        +(own?'<button type="button" class="secondary ffOwnerOwnPassword">CHANGE PASSWORD</button>':'')
        +(canEdit?'<button type="button" class="secondary ffEditAccount" data-id="'+E(p.staff_id)+'">EDIT</button>':'')
        +(owner&&!manager&&p.can_sell?'<button type="button" class="primary ffReplaceAccount" data-id="'+E(p.staff_id)+'">REPLACE SR</button>':'')
        +(owner&&!own?'<button type="button" class="danger ffDeleteStaff" data-id="'+E(p.staff_id)+'">DELETE</button>':'')
        +'</div></article>';
    };
    return '<section class="ffStaffDirectory" aria-label="Staff directory by zone">'
      +'<div class="card ffStaffDirectorySearch"><label for="ffStaffSearch"><strong>FIND TEAM / STAFF</strong></label>'
      +'<input id="ffStaffSearch" type="search" enterkeyhint="search" autocomplete="off" placeholder="Search name, Staff ID or zone…" aria-label="Search staff by name, ID, or zone">'
      +'<p id="ffStaffSearchCount" role="status" aria-live="polite"></p></div>'
      +'<div id="ffStaffDirectoryTeams">'+groups.map(g=>
        '<section class="card ffTeamZone" data-ff-team data-zone-search="'+E(normalize(g.label+' '+g.id))+'" data-zone-id="'+E(g.id)+'">'
        +'<header class="ffTeamZoneHeader"><h3>'+E(g.label)+'</h3><span>'+g.members.length+' STAFF</span></header>'
        +'<div class="ffTeamZonePeople">'+g.members.map(staffRow).join('')+'</div></section>'
      ).join('')+'</div>'
      +'<p id="ffStaffNoMatches" class="card ffStaffNoMatches" hidden>No staff found. Try another name, Staff ID or zone.</p>'
      +'</section>';
  }
  function bindSearch(root=document){
    const input=root.querySelector('#ffStaffSearch');
    if(!input)return;
    const zones=Array.from(root.querySelectorAll('[data-ff-team]'));
    const count=root.querySelector('#ffStaffSearchCount');
    const empty=root.querySelector('#ffStaffNoMatches');
    const refresh=()=>{
      const words=normalize(input.value).split(/\s+/).filter(Boolean);
      let people=0,visibleZones=0;
      zones.forEach(zone=>{
        const z=zone.dataset.zoneSearch||'';
        const rows=zone.querySelectorAll('[data-ff-staff-item]');
        let countInZone=0;
        rows.forEach(row=>{
          const text=(row.dataset.staffSearch||'')+' '+z;
          const visible=words.every(word=>text.includes(word));
          row.hidden=!visible;
          if(visible)countInZone++;
        });
        zone.hidden=countInZone===0;
        if(countInZone)visibleZones++;
        people+=countInZone;
      });
      if(count)count.textContent=people+' staff · '+visibleZones+' team'+(visibleZones===1?'':'s');
      if(empty)empty.hidden=people!==0;
    };
    input.addEventListener('input',refresh);
    input.addEventListener('search',refresh);
    refresh();
  }
  global.FFH_STAFF_DIRECTORY={render,bindSearch,buildGroups};
})(window);
