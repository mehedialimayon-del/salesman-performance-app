package com.fieldforcehub.mobile;
import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import org.json.JSONObject;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
/** Tokens and offline GPS queue are encrypted with a non-exportable Android Keystore key. */
final class SecureStore {
 private static SecretKey key() throws Exception {KeyStore k=KeyStore.getInstance("AndroidKeyStore");k.load(null);if(!k.containsAlias("ffh_duty_v1")){KeyGenerator g=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");g.init(new KeyGenParameterSpec.Builder("ffh_duty_v1",KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());g.generateKey();}return ((KeyStore.SecretKeyEntry)k.getEntry("ffh_duty_v1",null)).getSecretKey();}
 static synchronized JSONObject read(Context c)throws Exception {String v=c.getSharedPreferences("ffh_secure",0).getString("state",null);if(v==null)return new JSONObject();String[] p=v.split(":");Cipher x=Cipher.getInstance("AES/GCM/NoPadding");x.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Base64.decode(p[0],0)));return new JSONObject(new String(x.doFinal(Base64.decode(p[1],0)),java.nio.charset.StandardCharsets.UTF_8));}
 static synchronized void write(Context c,JSONObject v)throws Exception {Cipher x=Cipher.getInstance("AES/GCM/NoPadding");x.init(Cipher.ENCRYPT_MODE,key());String data=Base64.encodeToString(x.getIV(),Base64.NO_WRAP)+":"+Base64.encodeToString(x.doFinal(v.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)),Base64.NO_WRAP);if(!c.getSharedPreferences("ffh_secure",0).edit().putString("state",data).commit())throw new Exception("Secure storage failed");}
 static synchronized void merge(Context c,JSONObject v)throws Exception {JSONObject current=read(c);java.util.Iterator<String> keys=v.keys();while(keys.hasNext()){String k=keys.next();current.put(k,v.get(k));}write(c,current);}
 static synchronized void clear(Context c){c.getSharedPreferences("ffh_secure",0).edit().clear().commit();}
}
