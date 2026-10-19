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
 const {data:existing,error:ee}=await ownerDb.from('ffh_profiles').select('auth_user_id,staff_id').eq('staff_id',id).maybeSingle();if(ee)throw ee;
 if(!rootOwner&&(id==='M21954'||id===actor.staff_id))return out({error:'Only Ayon can change owner or administrator own account'},403);
 if(action==='password'){if(!rootOwner)return out({error:'Only Ayon changes passwords'},403);if(!existing?.auth_user_id)throw Error('Account not found');await setAccountPassword(sb,existing.auth_user_id,p.password);const {error}=await ownerDb.from('ffh_profiles').update({must_change_password:false}).eq('staff_id',id);if(error)throw error;return out({saved:true,password_changed:true});}
 if(!['create','update'].includes(action))throw Error('Unknown account action');
 if(id==='M21954')throw Error('Owner permissions cannot be changed here');
 if(action==='create'&&existing)throw Error('Staff ID already exists');if(action==='update'&&!existing)throw Error('Account not found');
 const name=String(p.full_name||'').trim();if(!name||name.length>150)throw Error('Full name required');const title=String(p.business_title||p.role||'SR').trim();if(!['SR','MANAGER','SALES_ADMIN','HEAD_OF_SALES','MD','ACCOUNTS'].includes(title))throw Error('Choose a valid role');const manager=title!=='SR';const zone=String(p.zone_id||'PRIMARY').trim().toUpperCase();if(!/^[A-Z0-9_-]{1,40}$/.test(zone))throw Error('Invalid zone');
 const {data:z}=await ownerDb.from('ffh_zones').select('id').eq('id',zone).maybeSingle();if(!z)throw Error('Choose an existing zone');
 const accessible=Array.isArray(p.accessible_zones)?[...new Set(p.accessible_zones.map(String))]:[];if(accessible.some(x=>!(/^[A-Z0-9_-]{1,40}$/.test(x))))throw Error('Invalid zone access');if(accessible.length){const {data:allowed,error:ze}=await ownerDb.from('ffh_zones').select('id');if(ze||accessible.some(x=>!allowed?.some(z=>z.id===x)))throw Error('Choose valid zones');}
 const selling=!manager||p.can_sell!==false;const target=selling?Number(p.monthly_target??50000):0;if(!Number.isFinite(target)||(selling&&target<50000))throw Error('Own SR route target minimum RM 50,000');
 if(!rootOwner&&(p.owner_access===true||p.password!==undefined&&action==='update'))return out({error:'Only Ayon changes passwords or delegates administrator authority'},403);
 const row={staff_id:id,full_name:name,role:manager?'MANAGER':'SR',business_title:title,display_title:String(p.display_title||'').trim().slice(0,150),team_name:String(p.team_name||'').trim().slice(0,150),route_name:String(p.route_name||'').trim().slice(0,150),access_all_zones:manager&&p.access_all_zones===true,accessible_zones:manager?accessible:[],can_manage:manager,can_sell:manager?p.can_sell!==false:true,zone_id:zone,...(rootOwner?{owner_access:manager&&p.owner_access===true}:{}),active:p.active!==false,login_approved:true,monthly_target:target,updated_at:new Date().toISOString()};
 if(action==='update'){if(p.password!==undefined&&String(p.password).length<12)throw Error('Password needs at least 12 characters');if(p.password!==undefined)await setAccountPassword(sb,existing.auth_user_id,p.password);const {error}=await ownerDb.from('ffh_profiles').update({...row,...(p.password!==undefined?{must_change_password:false}:{})}).eq('staff_id',id);if(error)throw Error(p.password!==undefined?'Password changed, but profile update failed; retry profile save.':'Profile update failed');return out({saved:true,staff_id:id,password_changed:p.password!==undefined});}
 if(String(p.password||'').length<12)throw Error('Password needs at least 12 characters');
 const {data:newAuth,error:ce}=await sb.auth.admin.createUser({email:id.toLowerCase()+'@fieldforce.app',password:p.password,email_confirm:true});if(ce||!newAuth.user)throw ce||Error('Login creation failed');
 const {error:pe}=await ownerDb.from('ffh_profiles').insert({...row,auth_user_id:newAuth.user.id,must_change_password:false});
 if(pe){await sb.auth.admin.deleteUser(newAuth.user.id);throw Error('Profile creation failed; new login rolled back');}
 return out({saved:true,staff_id:id});
 }catch(e){return out({error:e instanceof Error?e.message:'Account operation failed'},400);}
});
