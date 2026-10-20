package com.fieldforcehub.mobile;

import static org.junit.Assert.*;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Application;
import android.content.Context;
import android.net.Uri;
import android.media.AudioAttributes;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(sdk=28, application=Application.class)
public class NotificationChannelsTest {
 @Test public void freshInstallUsesBundledSignatureSound() {
  Context c=RuntimeEnvironment.getApplication(); NotificationChannels.create(c);
  NotificationChannel channel=c.getSystemService(NotificationManager.class).getNotificationChannel(NotificationChannels.MESSAGES);
  assertEquals(NotificationManager.IMPORTANCE_HIGH,channel.getImportance());
  assertEquals("android.resource://"+c.getPackageName()+"/raw/ffh_notification",channel.getSound().toString());
  assertEquals(AudioAttributes.USAGE_NOTIFICATION,channel.getAudioAttributes().getUsage());
 }
 @Test public void upgradeFromOldDefaultUsesNewSound() {
  Context c=RuntimeEnvironment.getApplication();NotificationManager manager=c.getSystemService(NotificationManager.class);
  NotificationChannel previous=new NotificationChannel("ffh_messages_v3","Old messages",NotificationManager.IMPORTANCE_HIGH);
  previous.setSound(Uri.parse("android.resource://"+c.getPackageName()+"/raw/ffh_brand"),new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build());
  manager.createNotificationChannel(previous);NotificationChannels.create(c);
  assertTrue(manager.getNotificationChannel(NotificationChannels.MESSAGES).getSound().toString().endsWith("/raw/ffh_notification"));
 }
 @Test public void upgradeKeepsDisabledAndSilentChannelDisabledAndSilent() {
  Context c=RuntimeEnvironment.getApplication();NotificationManager manager=c.getSystemService(NotificationManager.class);
  NotificationChannel previous=new NotificationChannel("ffh_messages_v3","Muted",NotificationManager.IMPORTANCE_NONE);
  previous.setSound(null,null);manager.createNotificationChannel(previous);NotificationChannels.create(c);
  NotificationChannel channel=manager.getNotificationChannel(NotificationChannels.MESSAGES);
  assertEquals(NotificationManager.IMPORTANCE_NONE,channel.getImportance());assertNull(channel.getSound());
 }
 @Test public void laterAppStartsKeepUserChannelChoice() {
  Context c=RuntimeEnvironment.getApplication();NotificationManager manager=c.getSystemService(NotificationManager.class);
  NotificationChannel existing=new NotificationChannel(NotificationChannels.MESSAGES,"Messages",NotificationManager.IMPORTANCE_LOW);
  existing.setSound(null,null);manager.createNotificationChannel(existing);NotificationChannels.create(c);
  assertEquals(NotificationManager.IMPORTANCE_LOW,manager.getNotificationChannel(NotificationChannels.MESSAGES).getImportance());
  assertNull(manager.getNotificationChannel(NotificationChannels.MESSAGES).getSound());
 }
}
