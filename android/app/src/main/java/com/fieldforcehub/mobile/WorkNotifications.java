package com.fieldforcehub.mobile;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

final class WorkNotifications {
 static final int TEST_ID = 7103;
 static void test(Context context) {
  NotificationManager manager = context.getSystemService(NotificationManager.class);
  if ((Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
      || !manager.areNotificationsEnabled()) throw new IllegalStateException("Allow FieldForce notifications in phone settings, then retry.");
  NotificationChannels.create(context);
  if (manager.getNotificationChannel(NotificationChannels.MESSAGES).getImportance() == NotificationManager.IMPORTANCE_NONE)
   throw new IllegalStateException("Enable FieldForce messages & tasks in phone notification settings, then retry.");
  manager.notify(TEST_ID, build(context));
 }
 static Notification build(Context context) {
  PendingIntent open = PendingIntent.getActivity(context, TEST_ID,
    new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP)
      .putExtra("ffh_page", "notifications"), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
  return new Notification.Builder(context, NotificationChannels.MESSAGES)
    .setSmallIcon(R.drawable.ic_stat_ffh).setColor(0xffff9f43)
    .setContentTitle("FieldForce test notification")
    .setContentText("Your FieldForce notification sound is ready. Tap to open the inbox.")
    .setContentIntent(open).setAutoCancel(true).setCategory(Notification.CATEGORY_REMINDER).build();
 }
}
