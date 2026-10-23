package com.fieldforcehub.mobile;
import android.content.Context;
import org.json.JSONObject;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
final class DutyApi {
 static final String BASE="https://svpgjrxeqnluipsgjywk.supabase.co",KEY="sb_publishable_eR5TZxv2aWndxdwzU0RIUA_mXWcBcO3";
 static String http(String path,String token,String body)throws Exception {HttpURLConnection c=(HttpURLConnection)new URL(BASE+path).openConnection();c.setConnectTimeout(12000);c.setReadTimeout(12000);c.setRequestProperty("apikey",KEY);c.setRequestProperty("Authorization","Bearer "+token);c.setRequestProperty("Content-Type","application/json");try{if(body!=null){c.setRequestMethod("POST");c.setDoOutput(true);try(java.io.OutputStream o=c.getOutputStream()){o.write(body.getBytes(StandardCharsets.UTF_8));}}int code=c.getResponseCode();InputStream stream=code<400?c.getInputStream():c.getErrorStream();String text=stream==null?"":readText(stream);if(code>=400)throw new ApiException(code,text);return text;}finally{c.disconnect();}}
 static String readText(InputStream s)throws Exception {try(InputStream input=s;java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream()){byte[] b=new byte[4096];int n;while((n=input.read(b))!=-1)out.write(b,0,n);return out.toString("UTF-8");}}
 // Never let a delayed foreground bind overwrite tokens rotated by background GPS.
 static String sessionId(String access){try{return new JSONObject(new String(android.util.Base64.decode(access.split("\\.")[1],android.util.Base64.URL_SAFE),StandardCharsets.UTF_8)).optString("session_id");}catch(Exception e){return "";}}
 static boolean sameSession(JSONObject a,JSONObject b){String id=sessionId(a.optString("access_token"));return !id.isEmpty()&&id.equals(sessionId(b.optString("access_token")));}
 static JSONObject refreshSource(JSONObject saved,JSONObject supplied){return sameSession(saved,supplied)?saved:supplied;}
 static JSONObject identityUpdate(JSONObject saved,JSONObject incoming)throws Exception{JSONObject update=new JSONObject(incoming.toString());if(sameSession(saved,incoming)){update.remove("access_token");update.remove("refresh_token");}return update;}
 static synchronized void mergeIdentity(Context c,JSONObject incoming)throws Exception {
  JSONObject update=identityUpdate(SecureStore.read(c),incoming);
  SecureStore.merge(c,update);
 }
 static synchronized JSONObject refreshAuth(Context c,JSONObject supplied)throws Exception {
  JSONObject saved=SecureStore.read(c),source=refreshSource(saved,supplied);
  JSONObject result=new JSONObject(http("/auth/v1/token?grant_type=refresh_token",KEY,new JSONObject().put("refresh_token",source.getString("refresh_token")).toString()));
  // When switching accounts, bindIdentity validates and installs the new identity.
  // A refresh for a different session must not replace a running GPS identity.
  if(sameSession(saved,source))SecureStore.merge(c,new JSONObject().put("access_token",result.getString("access_token")).put("refresh_token",result.getString("refresh_token")));
  return result;
 }
 static synchronized JSONObject rpc(Context context,String action,JSONObject payload)throws Exception {
  JSONObject s=SecureStore.read(context);String body=new JSONObject().put("action",action).put("payload",payload).toString();
  try{return parse(http("/rest/v1/rpc/ffh_duty",s.getString("access_token"),body));}
  catch(ApiException e){if(e.code!=401)throw e;JSONObject r=refreshAuth(context,s);return parse(http("/rest/v1/rpc/ffh_duty",r.getString("access_token"),body));}
 }
 static JSONObject parse(String text)throws Exception{return new JSONObject(text);}
 static final class ApiException extends Exception{final int code;final String body;ApiException(int c,String text){super("Cloud request failed ("+c+")");code=c;body=text;}}
}
