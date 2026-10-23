/* Keep network/profile failures separate from a confirmed signed-out session. */
window.FFH_RESTORE_SESSION = async ({auth, profile, ready, signedOut, unavailable}) => {
  const result = await auth.getSession();
  if(result.error){
    const error=result.error;
    if(error.name==='AuthRetryableFetchError'||!error.status||error.status>=500){unavailable(error);return;}
    if(['refresh_token_not_found','refresh_token_already_used','session_not_found','session_expired','invalid_refresh_token','user_banned','user_not_found'].includes(error.code)){signedOut();return;}
    unavailable(error);return;
  }
  const session=result.data?.session;
  if(!session?.user){signedOut();return;}
  let account;
  try{account=await profile(session.user.id);}catch(error){unavailable(error);return;}
  if(!account || account.active===false || account.login_approved===false){
    await auth.signOut({scope:'local'});signedOut();return;
  }
  await ready(account);
};
