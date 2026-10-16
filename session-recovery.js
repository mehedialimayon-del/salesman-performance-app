/* Keep network/profile failures separate from a confirmed signed-out session. */
window.FFH_RESTORE_SESSION = async ({auth, profile, ready, signedOut, unavailable}) => {
  const result = await auth.getSession();
  if(result.error){
    const error=result.error;
    if(error.name==='AuthRetryableFetchError'||!error.status||error.status>=500){unavailable(error);return;}
    signedOut();return;
  }
  const session=result.data?.session;
  if(!session?.user){signedOut();return;}
  let account;
  try{account=await profile(session.user.id);}catch(error){unavailable(error);return;}
  if(!account || account.active===false || account.login_approved===false){
    await auth.signOut();signedOut();return;
  }
  await ready(account);
};
