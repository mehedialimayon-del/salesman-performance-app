package com.fieldforcehub.mobile;
import androidx.annotation.Keep;import com.onesignal.notifications.*;import org.json.*;
@Keep public class NotificationServiceExtension implements INotificationServiceExtension {
 @Override public void onNotificationReceived(INotificationReceivedEvent event){event.getNotification().setExtender(builder->builder.setChannelId("ffh_messages_v3").setSmallIcon(R.drawable.ic_stat_ffh).setColor(0xffff9f43));JSONObject data=event.getNotification().getAdditionalData();if(data==null||!data.has("ffh_alarm"))return;android.content.Context c=event.getContext();try{JSONObject alarm=data.getJSONObject("ffh_alarm");if(!alarm.optString("staff_id").equals(SecureStore.read(c).optString("staff_id")))return;if(!alarm.optBoolean("enabled",true)){AlarmStore.remove(c,alarm.getString("id"));return;}if(!c.getSharedPreferences("ffh_alarm_options",0).getBoolean("remote",true))return;alarm.put("remote",true);AlarmStore.save(c,alarm);}catch(Exception ignored){} }
}
