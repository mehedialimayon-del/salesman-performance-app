package com.fieldforcehub.mobile;

import android.app.Activity;
import android.os.Bundle;
import android.widget.Toast;

/** Private notification target; resolves only files this app saved. */
public class DownloadOpenActivity extends Activity {
 @Override public void onCreate(Bundle state){super.onCreate(state);
  try{startActivity(DownloadNotifications.savedIntent(this,getIntent().getStringExtra("filename")));}
  catch(Exception error){Toast.makeText(this,"File saved. Open My Files → Downloads → FieldForce Hub, or install a viewer for this file.",Toast.LENGTH_LONG).show();}
  finish();
 }
}
