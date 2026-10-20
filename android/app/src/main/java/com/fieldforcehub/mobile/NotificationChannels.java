package com.fieldforcehub.mobile;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.net.Uri;

final class NotificationChannels {
 static final String MESSAGES = "ffh_messages_v4";
 static void create(Context context) {
  NotificationManager manager = context.getSystemService(NotificationManager.class);
  if (manager.getNotificationChannel(MESSAGES) != null) return;
  NotificationChannel previous = manager.getNotificationChannel("ffh_messages_v3");
  // Preserve a muted/disabled old channel when migrating to the new bundled sound.
  int importance = previous == null ? NotificationManager.IMPORTANCE_HIGH : previous.getImportance();
  NotificationChannel channel = new NotificationChannel(MESSAGES, "FieldForce messages & tasks", importance);
  channel.setDescription("FieldForce signature sound for messages, tasks and work notifications");
  channel.enableVibration(previous == null || previous.shouldVibrate());
  Uri sound = previous != null && previous.getSound() == null ? null :
    Uri.parse("android.resource://" + context.getPackageName() + "/raw/ffh_notification");
  channel.setSound(sound, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION)
    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
  manager.createNotificationChannel(channel);
 }
}
