import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {setAccountPassword} from './password.ts';
const cors={'Access-Control-Allow-Origin':'https://mehedialimayon-del.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Content-Type':'application/json'};
Deno.serve(async(req:Request)=>{
 const out=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:cors});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return out({error:'POST required'},405);
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!token)return out({error:'Sign in required'},401);
 const {data:auth,error:ae}=await sb.auth.getUser(token);if(ae||!auth.user)return out({error:'Sign in required'},401);
 const {data:actor}=await sb.from('ffh_profiles').select('staff_id,active,login_approved,can_manage,owner_access').eq('auth_user_id',auth.user.id).maybeSingle();
 const rootOwner=actor?.staff_id==='M21954';if(!actor?.active||!actor.login_approved||(!rootOwner&&!(actor.can_manage&&actor.owner_access)))return out({error:'Account administrator access required'},403);
 const ownerDb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});
 try{
 const p=await req.json();const action=p.action;
 if(action==='zone'){const id=String(p.zone_id||'').trim().toUpperCase(),name=String(p.name||'').trim();if(!/^[A-Z0-9_-]{1,40}$/.test(id)||!name||name.length>150)throw Error('Zone ID and name required');const {error}=await ownerDb.from('ffh_zones').upsert({id,name,active:true});if(error)throw error;return out({saved:true});}
 if(action==='list'){const {data:profiles,error}=await ownerDb.from('ffh_profiles').select('staff_id,full_name,role,active,login_approved,monthly_target,can_manage,can_sell,zone_id,owner_access,business_title,access_all_zones,accessible_zones,team_name,route_name').order('full_name');if(error)throw error;const {data:zones,error:ze}=await ownerDb.from('ffh_zones').select('*');if(ze)throw ze;return out({profiles,zones});}
 const id=String(p.staff_id||'').trim().toUpperCase();if(!/^[A-Z][A-Z0-9_-]{2,29}$/.test(id))throw Error('Use a valid staff ID');
 const {data:existing,error:ee}=await ownerDb.from('ffh_profiles').select('auth_user_id,staff_id,company_staff_id,target_pending,login_alias,full_name,can_sell,can_manage').eq('staff_id',id).maybeSingle();if(ee)throw ee;
 if(!rootOwner&&(id==='M21954'||id===actor.staff_id||id==='PERVES_HIRA'))return out({error:'Only Ayon can change owner or administrator own account'},403);
 if(action==='delete_preview'){
  if(!rootOwner)return out({error:'Only Ayon can preview staff account deletion'},403);
  if(!existing)throw Error('Staff account not found');
  const {data,error}=await ownerDb.rpc('ffh_owner_staff_delete_preview',{target:id});
  if(error)throw Error(error.message);
  return out(data);
 }
 if(action==='delete_staff'){
  if(!rootOwner)return out({error:'Only Ayon may permanently delete a staff account'},403);
  if(!existing||id==='M21954')throw Error('Select a non-owner staff account');
  const confirmation=String(p.confirm_staff_id||'').trim().toUpperCase();
  if(confirmation!==String(existing.company_staff_id||id).trim().toUpperCase())throw Error('Type the exact login Staff ID to confirm deletion');
  // Atomic database removal with owner-only row archive. A database error rolls
  // back the entire deletion; no Auth/Storage cleanup runs in that case.
  const {data:deleted,error:dbError}=await ownerDb.rpc('ffh_owner_staff_delete',{target:id,confirm_staff:confirmation});
  if(dbError)throw Error('Staff records were not deleted: '+dbError.message);
  if(!deleted?.database_deleted)throw Error('Database deletion was not confirmed');
  const assets=Array.isArray(deleted.storage_assets)?deleted.storage_assets:[];
  const groups=new Map<string,string[]>();
  for(const item of assets){
   if(typeof item.bucket!=='string'||typeof item.name!=='string')continue;
   if(!groups.has(item.bucket))groups.set(item.bucket,[]);
   groups.get(item.bucket)!.push(item.name);
  }
  const cleanupErrors:string[]=[];
  for(const [bucket,paths] of groups){
   for(let n=0;n<paths.length;n+=100){
    const {error}=await sb.storage.from(bucket).remove(paths.slice(n,n+100));
    if(error)cleanupErrors.push('Storage '+bucket+': '+error.message);
   }
  }
  const storageDeleted=cleanupErrors.length===0;
  let authDeleted=!deleted.auth_user_id;
  if(deleted.auth_user_id){
   const {error:removeError}=await sb.auth.admin.deleteUser(deleted.auth_user_id);
   if(removeError){
    cleanupErrors.push('Auth: '+removeError.message);
    const {error:banError}=await sb.auth.admin.updateUserById(deleted.auth_user_id,{ban_duration:'876000h'});
    if(banError)cleanupErrors.push('Auth suspension: '+banError.message);
   }else authDeleted=true;
  }
  const {error:statusError}=await ownerDb.rpc('ffh_owner_staff_delete_cleanup',{
   event_id:deleted.deletion_id,files_ok:storageDeleted,auth_ok:authDeleted
  });
  if(statusError)cleanupErrors.push('History status: '+statusError.message);
  return out({saved:true,database_deleted:true,archive_id:deleted.deletion_id,
   record_count:deleted.record_count,storage_deleted:storageDeleted,auth_deleted:authDeleted,
   cleanup_warnings:cleanupErrors});
 }
 if(action==='password'){if(!rootOwner)return out({error:'Only Ayon changes passwords'},403);if(!existing?.auth_user_id)throw Error('Account not found');await setAccountPassword(sb,existing.auth_user_id,p.password);const {error}=await ownerDb.from('ffh_profiles').update({must_change_password:false}).eq('staff_id',id);if(error)throw error;return out({saved:true,password_changed:true});}

 if(action==='replace_sr'){
  // Owner-only handover: keep the route identity and all staff-ID-linked operational records.
  if(!rootOwner)return out({error:'Only Ayon can replace an SR account'},403);
  if(id==='M21954'||!existing||existing.can_sell!==true||existing.can_manage===true)throw Error('Select an existing SR route account. Managers and the owner cannot be replaced.');
  const incomingId=String(p.new_staff_id||'').trim().toUpperCase();
  const incomingName=String(p.full_name||'').trim();
  const incomingPassword=String(p.password||'');
  if(!/^[A-Z][A-Z0-9_-]{2,29}$/.test(incomingId))throw Error('Enter the new SR Staff ID');
  if(!incomingName||incomingName.length>150)throw Error('Enter the new SR full name');
  if(incomingPassword.length<6)throw Error('Password needs at least 6 characters');
  if(incomingId===id||incomingId===String(existing.company_staff_id||'').toUpperCase())throw Error('Use the NEW SR Staff ID to revoke the departing employee login. For ordinary edits use Edit.');
  const {data:conflicts,error:lookupError}=await sb.from('ffh_profiles').select('staff_id,full_name').or('staff_id.eq.'+incomingId+',company_staff_id.eq.'+incomingId).neq('staff_id',id).limit(1);
  if(lookupError)throw Error('Staff ID availability check failed. Nothing changed.');
  if(conflicts?.length)throw Error('Staff ID '+incomingId+' already belongs to '+conflicts[0].full_name+' ('+conflicts[0].staff_id+'). Choose an unused ID; existing accounts and sales cannot be silently overwritten.');
  const outgoingAuthId=existing.auth_user_id;
  const {data:created,error:createError}=await sb.auth.admin.createUser({email:incomingId.toLowerCase()+'@fieldforce.app',password:incomingPassword,email_confirm:true});
  if(createError||!created?.user)throw createError||Error('Could not create the new SR login');
  // New Auth identity means the outgoing staff's sessions no longer map to this profile.
  const replacement={company_staff_id:incomingId,login_alias:incomingId.toLowerCase(),full_name:incomingName,auth_user_id:created.user.id,photo_url:null,active:true,login_approved:true,must_change_password:false,updated_at:new Date().toISOString()};
  const {error:saveError}=await ownerDb.from('ffh_profiles').update(replacement).eq('staff_id',id);
  if(saveError){
   await sb.auth.admin.deleteUser(created.user.id);
   throw Error(saveError.code==='23505'?'New Staff ID is already assigned. No account was replaced.':'Replacement failed. Original SR route and login were left unchanged: '+saveError.message);
  }
  let oldLoginBanned=true;
  if(outgoingAuthId&&outgoingAuthId!==created.user.id){
   const {error:banError}=await sb.auth.admin.updateUserById(outgoingAuthId,{ban_duration:'876000h'});
   oldLoginBanned=!banError;
  }
  return out({saved:true,staff_id:id,login_id:incomingId,route_preserved:true,old_login_detached:true,old_login_banned:oldLoginBanned});
 }
 if(!['create','update'].includes(action))throw Error('Unknown account action');
 if(id==='M21954')throw Error('Owner permissions cannot be changed here');
 if(action==='create'&&existing)throw Error('Staff ID already exists');if(action==='update'&&!existing)throw Error('Account not found');
 const companyRequested=Object.prototype.hasOwnProperty.call(p,'company_staff_id');if(companyRequested&&!rootOwner)return out({error:'Only Ayon changes company Staff ID'},403);const companyId=companyRequested?(String(p.company_staff_id||'').trim().toUpperCase()||null):(action==='create'?id:existing?.company_staff_id);if(companyId&&!/^[A-Z][A-Z0-9_-]{2,29}$/.test(companyId))throw Error('Use a valid company Staff ID');
 if(companyId){const {data:used,error:usedError}=await sb.from('ffh_profiles').select('staff_id,full_name,company_staff_id').or('staff_id.eq.'+companyId+',company_staff_id.eq.'+companyId).neq('staff_id',id).limit(1);if(usedError)throw Error('Could not verify Staff ID availability. No changes were made.');if(used?.length)throw Error('Staff ID '+companyId+' is already assigned to '+(rootOwner?(used[0].full_name+' ('+used[0].staff_id+')'):'another staff account')+'. Open and edit the existing account instead. No changes were made.');}
 const name=String(p.full_name||'').trim();if(!name||name.length>150)throw Error('Full name required');const title=String(p.business_title||p.role||'SR').trim();if(!['SR','MANAGER','SALES_ADMIN','HEAD_OF_SALES','MD','ACCOUNTS'].includes(title))throw Error('Choose a valid role');const manager=title!=='SR';const zone=String(p.zone_id||'PRIMARY').trim().toUpperCase();if(!/^[A-Z0-9_-]{1,40}$/.test(zone))throw Error('Invalid zone');
 const {data:z}=await ownerDb.from('ffh_zones').select('id').eq('id',zone).maybeSingle();if(!z)throw Error('Choose an existing zone');
 const accessible=Array.isArray(p.accessible_zones)?[...new Set(p.accessible_zones.map(String))]:[];if(accessible.some(x=>!(/^[A-Z0-9_-]{1,40}$/.test(x))))throw Error('Invalid zone access');if(accessible.length){const {data:allowed,error:ze}=await ownerDb.from('ffh_zones').select('id');if(ze||accessible.some(x=>!allowed?.some(z=>z.id===x)))throw Error('Choose valid zones');}
 const selling=!manager||p.can_sell!==false;const target=selling?Number(p.monthly_target??50000):0;if(!Number.isFinite(target)||(selling&&target<50000&&!(existing?.target_pending&&target===0)))throw Error('Own SR route target minimum RM 50,000');
 if(!rootOwner&&(p.owner_access===true||p.password!==undefined&&action==='update'))return out({error:'Only Ayon changes passwords or delegates administrator authority'},403);
 const row={staff_id:id,...(companyRequested||action==='create'?{company_staff_id:companyId}:{}),target_pending:selling&&target===0&&existing?.target_pending===true,full_name:name,role:manager?'MANAGER':'SR',business_title:title,display_title:String(p.display_title||'').trim().slice(0,150),team_name:String(p.team_name||'').trim().slice(0,150),route_name:String(p.route_name||'').trim().slice(0,150),access_all_zones:manager&&p.access_all_zones===true,accessible_zones:manager?accessible:[],can_manage:manager,can_sell:manager?p.can_sell!==false:true,zone_id:zone,...(rootOwner?{owner_access:manager&&p.owner_access===true}:{}),active:p.active!==false,login_approved:true,monthly_target:target,updated_at:new Date().toISOString()};
 if(action==='update'&&!existing?.auth_user_id){
 if(!rootOwner)return out({error:'Only Ayon enables a pending login'},403);
 if(!p.password){const {error}=await ownerDb.from('ffh_profiles').update(row).eq('staff_id',id);if(error)throw error;return out({saved:true,staff_id:id,login_pending:true});}
 if(String(p.password||'').length<6)throw Error('Set an initial password of at least 6 characters');
 const {data:created,error:ce}=await sb.auth.admin.createUser({email:(companyId||existing?.login_alias||id).toLowerCase()+'@fieldforce.app',password:p.password,email_confirm:true});if(ce||!created.user)throw ce||Error('Login creation failed');
 const {error}=await ownerDb.from('ffh_profiles').update({...row,auth_user_id:created.user.id,must_change_password:false}).eq('staff_id',id);
 if(error){await sb.auth.admin.deleteUser(created.user.id);throw Error('Login setup rolled back; profile could not save');}
 return out({saved:true,staff_id:id,password_changed:true});
 }
 if(action==='update'){if(p.password!==undefined&&String(p.password).length<6)throw Error('Password needs at least 6 characters');if(companyRequested&&companyId&&companyId!==existing.company_staff_id){const oldAuth=await sb.auth.admin.getUserById(existing.auth_user_id);const {error}=await sb.auth.admin.updateUserById(existing.auth_user_id,{email:companyId.toLowerCase()+'@fieldforce.app',email_confirm:true});if(error)throw Error('Staff ID login could not update: '+error.message);const saved=await ownerDb.from('ffh_profiles').update({company_staff_id:companyId}).eq('staff_id',id);if(saved.error){if(oldAuth.data?.user?.email)await sb.auth.admin.updateUserById(existing.auth_user_id,{email:oldAuth.data.user.email});throw Error(saved.error.code==='23505'?'Staff ID '+companyId+' has just been assigned to another account. Open that existing account instead.':'Staff ID update failed: '+saved.error.message);}}if(p.password!==undefined)await setAccountPassword(sb,existing.auth_user_id,p.password);const {error}=await ownerDb.from('ffh_profiles').update({...row,...(p.password!==undefined?{must_change_password:false}:{})}).eq('staff_id',id);if(error)throw Error(p.password!==undefined?'Password changed, but profile update failed; retry profile save.':'Profile update failed');return out({saved:true,staff_id:id,password_changed:p.password!==undefined});}
 if(String(p.password||'').length<6)throw Error('Password needs at least 6 characters');
 const {data:newAuth,error:ce}=await sb.auth.admin.createUser({email:(companyId||existing?.login_alias||id).toLowerCase()+'@fieldforce.app',password:p.password,email_confirm:true});if(ce||!newAuth.user)throw ce||Error('Login creation failed');
 const {error:pe}=await ownerDb.from('ffh_profiles').insert({...row,auth_user_id:newAuth.user.id,must_change_password:false});
 if(pe){await sb.auth.admin.deleteUser(newAuth.user.id);throw Error('Profile creation failed; new login rolled back');}
 return out({saved:true,staff_id:id});
 }catch(e){return out({error:e instanceof Error?e.message:'Account operation failed'},400);}
});
