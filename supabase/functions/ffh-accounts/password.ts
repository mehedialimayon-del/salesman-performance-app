export async function setAccountPassword(sb:any,authUserId:string,password:unknown){
 if(typeof password!=='string'||password.length<12)throw Error('Password needs at least 12 characters');
 const {data,error:readError}=await sb.auth.admin.getUserById(authUserId);if(readError||!data.user)throw readError||Error('Login account not found');
 const {error}=await sb.auth.admin.updateUserById(authUserId,{password,app_metadata:{...data.user.app_metadata,ffh_owner_password_nonce:crypto.randomUUID()}});if(error)throw error;
}
