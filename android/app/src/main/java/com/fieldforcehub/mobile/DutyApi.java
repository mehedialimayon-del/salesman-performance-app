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
 static synchronized JSONObject rpc(Context context,String action,JSONObject payload)throws Exception {JSONObject s=SecureStore.read(context);String body=new JSONObject().put("action",action).put("payload",payload).toString();try{return parse(http("/rest/v1/rpc/ffh_duty",s.getString("access_token"),body));}catch(ApiException e){if(e.code!=401)throw e;JSONObject r=new JSONObject(http("/auth/v1/token?grant_type=refresh_token",KEY,new JSONObject().put("refresh_token",s.getString("refresh_token")).toString()));SecureStore.merge(context,new JSONObject().put("access_token",r.getString("access_token")).put("refresh_token",r.getString("refresh_token")));return parse(http("/rest/v1/rpc/ffh_duty",r.getString("access_token"),body));}}
 static JSONObject parse(String text)throws Exception{return new JSONObject(text);}
 static final class ApiException extends Exception{final int code;ApiException(int c,String text){super("Cloud request failed ("+c+")");code=c;}}
}
