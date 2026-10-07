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
 const {data:actor}=await sb.from('ffh_profiles').select('staff_id,active,login_approved,can_manage,zone_id').eq('auth_user_id',auth.user.id).maybeSingle();
 if(!actor?.active||!actor.login_approved)return out({error:'Active account required'},403);
 const owner=actor.staff_id==='M21954';const {data:actorGrants}=await sb.from('ffh_access_grants').select('module,can_edit').eq('staff_id',actor.staff_id);const allowed=(module:string)=>owner||(actor.can_manage&&(actorGrants||[]).some(g=>g.module===module&&g.can_edit));
 try{
 const p=await req.json();const action=p.action;if(!owner&&!allowed(action==='create'?'accounts_create':'accounts_edit')&&action!=='list')return out({error:'Account edit permission required'},403);if(action==='list'&&!owner&&!allowed('accounts_create')&&!allowed('accounts_edit'))return out({error:'Account access denied'},403);
 if(action==='zone'){if(!owner)return out({error:'Only Ayon can create zones'},403);const id=String(p.zone_id||'').trim().toUpperCase(),name=String(p.name||'').trim();if(!/^[A-Z0-9_-]{1,40}$/.test(id)||!name||name.length>150)throw Error('Zone ID and name required');const {error}=await sb.from('ffh_zones').upsert({id,name,active:true});if(error)throw error;return out({saved:true});}
 if(action==='list'){const {data:profiles,error}=await sb.from('ffh_profiles').select('staff_id,full_name,role,active,login_approved,monthly_target,can_manage,can_sell,zone_id,owner_access,photo_url').order('full_name');if(error)throw error;const {data:zones}=await sb.from('ffh_zones').select('*');const {data:grants,error:ge}=await sb.from('ffh_access_grants').select('*');if(ge)throw ge;const {data:outlets,error:oe}=await sb.from('ffh_outlets').select('id,sr_id,outlet_code,outlet_name,active').order('outlet_name').limit(10000);if(oe)throw oe;const visible=owner?profiles:(profiles||[]).filter(x=>x.role==='SR'&&x.zone_id===actor.zone_id);const visibleIds=new Set((visible||[]).map(x=>x.staff_id));return out({owner,profiles:visible,zones:owner?zones:(zones||[]).filter(z=>z.id===actor.zone_id),grants:owner?grants:[],outlets:owner?outlets:(outlets||[]).filter(o=>visibleIds.has(o.sr_id))});}
 const id=String(p.staff_id||'').trim().toUpperCase();if(!/^[A-Z][A-Z0-9_-]{2,29}$/.test(id))throw Error('Use a valid staff ID');
 const {data:existing,error:ee}=await sb.from('ffh_profiles').select('auth_user_id,staff_id,role,zone_id,can_sell,owner_access').eq('staff_id',id).maybeSingle();if(ee)throw ee;
 if(action==='password'){if(!owner)return out({error:'Only Ayon can reset passwords'},403);if(!existing?.auth_user_id)throw Error('Account not found');await setAccountPassword(sb,existing.auth_user_id,p.password);const {error}=await sb.from('ffh_profiles').update({must_change_password:false}).eq('staff_id',id);if(error)throw error;return out({saved:true,password_changed:true});}
 if(!['create','update'].includes(action))throw Error('Unknown account action');
 if(id==='M21954')throw Error('Owner permissions cannot be changed here');
 if(action==='create'&&existing)throw Error('Staff ID already exists');if(action==='update'&&!existing)throw Error('Account not found');
 if(!owner&&(p.role!=='SR'||p.zone_id!==actor.zone_id||existing&&(existing.role!=='SR'||existing.zone_id!==actor.zone_id)||p.owner_access===true||p.permissions!==undefined||action==='update'&&p.password!==undefined))return out({error:'Only Ayon can change manager permissions or passwords'},403);
 const name=String(p.full_name||'').trim();if(!name||name.length>150)throw Error('Full name required');const manager=p.role==='MANAGER';const zone=String(p.zone_id||'PRIMARY').trim().toUpperCase();if(!/^[A-Z0-9_-]{1,40}$/.test(zone))throw Error('Invalid zone');
 const {data:z}=await sb.from('ffh_zones').select('id').eq('id',zone).maybeSingle();if(!z)throw Error('Choose an existing zone');
 const target=Number(p.monthly_target||50000);if(!Number.isFinite(target)||target<50000)throw Error('Actual target minimum RM 50,000');
 const photo=String(p.photo_url||'').trim();if(photo&&!/^https:\/\//i.test(photo))throw Error('Photo URL must use https');
 const row={photo_url:photo,staff_id:id,full_name:name,role:manager?'MANAGER':'SR',can_manage:manager,can_sell:manager?p.can_sell!==false:true,zone_id:zone,owner_access:manager&&p.owner_access===true,active:p.active!==false,login_approved:true,monthly_target:target,updated_at:new Date().toISOString()};
 const saveAccess=async()=>{if(!owner)return;if(p.permissions===undefined&&p.route_outlet_ids===undefined)return;const {error}=await sb.rpc('ffh_account_access',{target:id,permissions:p.permissions||[],route_ids:p.route_outlet_ids||[]});if(error)throw Error('Profile saved, but permissions / route were not saved: '+error.message);};
 if(action==='update'){if(p.password!==undefined&&String(p.password).length<12)throw Error('Password needs at least 12 characters');if(p.password!==undefined)await setAccountPassword(sb,existing.auth_user_id,p.password);const {error}=await sb.from('ffh_profiles').update({...row,...(p.password!==undefined?{must_change_password:false}:{})}).eq('staff_id',id);if(error)throw Error(p.password!==undefined?'Password changed, but profile update failed; retry profile save.':'Profile update failed');await saveAccess();return out({saved:true,staff_id:id,password_changed:p.password!==undefined});}
 if(String(p.password||'').length<12)throw Error('Password needs at least 12 characters');
 const {data:newAuth,error:ce}=await sb.auth.admin.createUser({email:id.toLowerCase()+'@fieldforce.app',password:p.password,email_confirm:true});if(ce||!newAuth.user)throw ce||Error('Login creation failed');
 const {error:pe}=await sb.from('ffh_profiles').insert({...row,auth_user_id:newAuth.user.id,must_change_password:false});
 if(pe){await sb.auth.admin.deleteUser(newAuth.user.id);throw Error('Profile creation failed; new login rolled back');}
 await saveAccess();return out({saved:true,staff_id:id});
 }catch(e){return out({error:e instanceof Error?e.message:'Account operation failed'},400);}
});
