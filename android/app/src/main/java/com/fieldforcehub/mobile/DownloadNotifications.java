package com.fieldforcehub.mobile;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import org.json.JSONObject;

/** Receipts are recorded only after a successful file write/finalization. */
final class DownloadNotifications {
 static final String CHANNEL="ffh_downloads_v1";
 static Intent fileIntent(Context context,Uri uri,String filename,String mime){
  Intent view=new Intent(Intent.ACTION_VIEW).setDataAndType(uri,mime).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
  view.setClipData(ClipData.newUri(context.getContentResolver(),filename,uri));return view;
 }
 static void completed(Context context,Uri uri,String filename,String mime){
  try{
   JSONObject receipt=new JSONObject().put("uri",uri.toString()).put("mime",mime);
   context.getSharedPreferences("ffh_download_receipts",0).edit().putString(filename,receipt.toString()).apply();
   NotificationManager manager=context.getSystemService(NotificationManager.class);
   manager.createNotificationChannel(new NotificationChannel(CHANNEL,"File downloads",NotificationManager.IMPORTANCE_DEFAULT));
   Intent open=new Intent(context,DownloadOpenActivity.class).setData(uri).putExtra("filename",filename);
   PendingIntent tap=PendingIntent.getActivity(context,0,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
   java.text.SimpleDateFormat formatter=new java.text.SimpleDateFormat("dd MMM yyyy, HH:mm:ss",java.util.Locale.ENGLISH);formatter.setTimeZone(java.util.TimeZone.getTimeZone("Asia/Kuala_Lumpur"));String time=formatter.format(new java.util.Date());
   Notification n=new Notification.Builder(context,CHANNEL).setSmallIcon(android.R.drawable.stat_sys_download_done)
    .setContentTitle("✓ Download complete").setContentText(filename).setSubText(time+" MYT")
    .setStyle(new Notification.BigTextStyle().bigText(filename+"\n"+time+" MYT · Tap to open"))
    .setContentIntent(tap).setAutoCancel(true).setShowWhen(true).setWhen(System.currentTimeMillis())
    .setCategory(Notification.CATEGORY_STATUS).build();
   manager.notify(filename,0,n);
  }catch(SecurityException denied){android.util.Log.w("FFHDownloads","Notification permission unavailable; file remains saved");}
   catch(Exception error){android.util.Log.w("FFHDownloads","Download notification unavailable",error);}
 }
 static Intent savedIntent(Context context,String filename)throws Exception{
  String value=context.getSharedPreferences("ffh_download_receipts",0).getString(filename,null);
  if(value==null)throw new java.io.IOException("This saved file is not available. Download it again.");
  JSONObject receipt=new JSONObject(value);Uri uri=Uri.parse(receipt.getString("uri"));
  if(!"content".equals(uri.getScheme()))throw new java.io.IOException("Invalid saved file.");
  return fileIntent(context,uri,filename,receipt.getString("mime"));
 }
}
