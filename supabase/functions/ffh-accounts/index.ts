import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
const cors={'Access-Control-Allow-Origin':'https://mehedialimayon-del.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Content-Type':'application/json'};
Deno.serve(async(req:Request)=>{
 const out=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:cors});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return out({error:'POST required'},405);
 const sb=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!token)return out({error:'Sign in required'},401);
 const {data:auth,error:ae}=await sb.auth.getUser(token);if(ae||!auth.user)return out({error:'Sign in required'},401);
 const {data:actor}=await sb.from('ffh_profiles').select('staff_id,active,login_approved').eq('auth_user_id',auth.user.id).maybeSingle();
 if(actor?.staff_id!=='M21954'||!actor.active||!actor.login_approved)return out({error:'Only Ayon can provision or delegate accounts'},403);
 try{
 const p=await req.json();const action=p.action;
 if(action==='list'){const {data:profiles,error}=await sb.from('ffh_profiles').select('staff_id,full_name,role,active,login_approved,monthly_target,can_manage,can_sell,zone_id,owner_access').order('full_name');if(error)throw error;const {data:zones}=await sb.from('ffh_zones').select('*');return out({profiles,zones});}
 const id=String(p.staff_id||'').trim().toUpperCase();if(!/^[A-Z][A-Z0-9_-]{2,29}$/.test(id))throw Error('Use a valid staff ID');
 const {data:existing,error:ee}=await sb.from('ffh_profiles').select('auth_user_id,staff_id').eq('staff_id',id).maybeSingle();if(ee)throw ee;
 if(action==='password'){if(!existing?.auth_user_id)throw Error('Account not found');if(String(p.password||'').length<12)throw Error('Password needs at least 12 characters');const {error}=await sb.auth.admin.updateUserById(existing.auth_user_id,{password:p.password});if(error)throw error;await sb.from('ffh_profiles').update({must_change_password:true}).eq('staff_id',id);return out({saved:true});}
 if(!['create','update'].includes(action))throw Error('Unknown account action');
 if(id==='M21954')throw Error('Owner permissions cannot be changed here');
 if(action==='create'&&existing)throw Error('Staff ID already exists');if(action==='update'&&!existing)throw Error('Account not found');
 const name=String(p.full_name||'').trim();if(!name||name.length>150)throw Error('Full name required');const manager=p.role==='MANAGER';const zone=String(p.zone_id||'PRIMARY').trim().toUpperCase();if(!/^[A-Z0-9_-]{1,40}$/.test(zone))throw Error('Invalid zone');
 const {data:z}=await sb.from('ffh_zones').select('id').eq('id',zone).maybeSingle();if(!z)throw Error('Choose an existing zone');
 const target=Number(p.monthly_target||50000);if(!Number.isFinite(target)||target<50000)throw Error('Actual target minimum RM 50,000');
 const row={staff_id:id,full_name:name,role:manager?'MANAGER':'SR',can_manage:manager,can_sell:manager?p.can_sell!==false:true,zone_id:zone,owner_access:manager&&p.owner_access===true,active:p.active!==false,login_approved:true,monthly_target:target,updated_at:new Date().toISOString()};
 if(action==='update'){const {error}=await sb.from('ffh_profiles').update(row).eq('staff_id',id);if(error)throw error;return out({saved:true,staff_id:id});}
 if(String(p.password||'').length<12)throw Error('Password needs at least 12 characters');
 const {data:newAuth,error:ce}=await sb.auth.admin.createUser({email:id.toLowerCase()+'@fieldforce.app',password:p.password,email_confirm:true});if(ce||!newAuth.user)throw ce||Error('Login creation failed');
 const {error:pe}=await sb.from('ffh_profiles').insert({...row,auth_user_id:newAuth.user.id,must_change_password:true});
 if(pe){await sb.auth.admin.deleteUser(newAuth.user.id);throw Error('Profile creation failed; new login rolled back');}
 return out({saved:true,staff_id:id});
 }catch(e){return out({error:e instanceof Error?e.message:'Account operation failed'},400);}
});
