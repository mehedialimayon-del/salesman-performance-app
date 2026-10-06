package com.fieldforcehub.mobile;
import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.content.Intent;
import com.onesignal.OneSignal;
public class FieldForceApplication extends Application {
 @Override public void onCreate(){super.onCreate();NotificationManager nm=getSystemService(NotificationManager.class);NotificationChannel chat=new NotificationChannel("ffh_messages_v3","FieldForce messages & tasks",NotificationManager.IMPORTANCE_HIGH);chat.setDescription("Live communication, task and work notifications");chat.enableVibration(true);chat.setSound(Uri.parse("android.resource://"+getPackageName()+"/"+R.raw.ffh_brand),new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build());nm.createNotificationChannel(chat);nm.createNotificationChannel(new NotificationChannel("ffh_duty","Duty location tracking",NotificationManager.IMPORTANCE_LOW));OneSignal.initWithContext(this,"b867a503-3728-411a-977d-cad4bd9b2440");OneSignal.getNotifications().addClickListener(event->{org.json.JSONObject d=event.getNotification().getAdditionalData();String page=d==null?"notifications":d.optString("ffh_page","notifications");Intent i=new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("ffh_page",page);startActivity(i);});}
}
