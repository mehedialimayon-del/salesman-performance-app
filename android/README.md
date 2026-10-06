# FieldForce native duty tracking

This replaces the earlier TWA source with a native Android WebView containing the existing hosted frontend. The dark/orange UI is unchanged. The only new home modules are Attendance, SR Tracking (authorized viewers) and Live Communication.

Attendance and messaging use the deployed `ffh_duty` RPC. Row-level policies protect attendance photos, locations and two-person message threads. Raw GPS and photos have 30-day retention. Server time controls daily attendance. Home location requires a separate explicit confirmation; alerts say "near home area", not "inside home".

Location runs only after the user accepts the work-hours disclosure and taps check-in/resume. Android shows an ongoing location notification with a stop action. Voice capture is explicit only: tap the microphone to open the system recognizer; no background microphone recording runs. Checkout, shift expiry, permission failure or app force-stop end tracking. Force-stop, battery restrictions, unavailable GPS and network gaps cannot be guaranteed away. Poor fixes and GPS gaps are not converted into stationary stops.

The native bridge uses origin-restricted WebMessageListener and accepts only the app's main frame. Tokens and buffered GPS points are encrypted with Android Keystore. OneSignal identity is bound only after authenticating against Supabase and finding the approved active staff profile. There are no server secrets in the Android source.

## Build
GitHub Actions builds the test APK on pushes to main or ffh-duty-communication that modify android source or the workflow. Production builds require the existing FFH_KEYSTORE_B64, FFH_KEYSTORE_PASS, FFH_KEY_ALIAS and FFH_KEY_PASS secrets. Never substitute a test signature for the stable production signing key.

## Deployment requirements and acceptance
- Configure Android FCM credentials for the existing OneSignal application before relying on native phone push. A working Chrome/web subscription does not prove Android FCM setup.
- Allow notifications on each phone, login, use Enable Phone Push, and verify a nonempty subscription ID. All active staff must have individual accounts; Sales Admin/Head of Sales appear in the directory when their approved accounts exist.
- On physical phones test manager/SR message in both directions with app foreground, background and screen locked; verify tap navigation, sound, icon and receipt. Provider acceptance is not proof a phone displayed a notification.
- Check attendance gate, precise-location permission, stop/resume, screen-off GPS, checkout, shift expiry, rejected mock locations and battery behavior. Verify home exit/re-entry alert only after separate home confirmation.
- Browser/PWA tracking is foreground-only. OneSignal web push uses the browser's notification sound; the packaged custom chime applies to the native Android notification channel. Users can mute or change it in system settings.
- This is an internal-test build until physical acceptance is completed. The original web frontend remains available for browser exports; native blob downloads require further acceptance.

## Alarms and file completion
Version 1.4 adds the clock alarm button, Malaysia-time exact alarms with system Alarms & reminders permission, boot restoration, notification STOP action, and opt-in manager assignments. A remote assignment must arrive and be scheduled on the recipient phone; force-stop/offline push is not guaranteed. File saves resolve only after SAF write success or report cancellation/failure. System voice recognition uses the phone provider and may need internet/language support.
