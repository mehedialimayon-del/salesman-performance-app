package com.fieldforcehub.mobile;
import android.app.Application;
import android.util.Base64;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk=28,application=Application.class)
public class SessionRotationTest {
 private JSONObject tokens(String session,String refresh)throws Exception{return new JSONObject().put("access_token","e30."+Base64.encodeToString(new JSONObject().put("session_id",session).toString().getBytes("UTF-8"),Base64.URL_SAFE|Base64.NO_WRAP|Base64.NO_PADDING)+".signature").put("refresh_token",refresh);}
 @Test public void foregroundUsesLatestBackgroundRotation()throws Exception{JSONObject saved=tokens("session-a","rotation-7"),stale=tokens("session-a","rotation-1");assertEquals("rotation-7",DutyApi.refreshSource(saved,stale).getString("refresh_token"));}
 @Test public void delayedBindCannotRestoreSpentRefreshToken()throws Exception{JSONObject saved=tokens("session-a","rotation-7"),stale=tokens("session-a","rotation-1").put("attendance_id","shift-1");JSONObject update=DutyApi.identityUpdate(saved,stale);assertFalse(update.has("access_token"));assertFalse(update.has("refresh_token"));assertEquals("shift-1",update.getString("attendance_id"));}
 @Test public void accountSwitchKeepsNewAuthentication()throws Exception{JSONObject saved=tokens("session-a","old"),login=tokens("session-b","new");assertEquals("new",DutyApi.refreshSource(saved,login).getString("refresh_token"));assertEquals("new",DutyApi.identityUpdate(saved,login).getString("refresh_token"));}
 @Test public void malformedTokensNeverShareIdentity()throws Exception{assertFalse(DutyApi.sameSession(new JSONObject().put("access_token","invalid"),new JSONObject().put("access_token","invalid")));}
}
