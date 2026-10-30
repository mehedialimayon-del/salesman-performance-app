# A&N Overseas Admin — Separate Android APK

This is a **separate**, installable Android WebView package `com.anoverseas.admin`.
It loads the existing secure hosted admin PWA:
https://mehedialimayon-del.github.io/salesman-performance-app/an-overseas/admin-app/

- Uses Supabase session persistence through Android WebView DOM storage and the existing secure admin authorization checks. The password is never placed in the APK.
- Can edit live site settings, read enquiries, answer registered-student chats, review applications/documents, EMGS updates and open the public website.
- Links to the public website, WhatsApp, mail and private signed document URLs open externally.
- Android-native local notifications can show when the app is active and realtime web events arrive and permission is granted.
- **No background push service when Android has killed/closed the app**. Configuring FCM/OneSignal + secure device registration is separate.
- Android device functional testing, hosted production student journeys and database access to all relevant modules remain necessary. The APK does not fix missing backend RLS policies.
- Does not modify the existing FieldForce APK/package.

## Building

The GitHub Actions workflow `.github/workflows/an-admin-apk.yml` builds a debug-signed APK, then stores it in a workflow artifact and attempts to publish it as
`an-overseas/admin-app/download/AN-Overseas-Admin-TEST.apk`.

This **debug-signed test APK** is installable but not a production-signed Play Store release; preserve a single production signing key before publishing stable future updates.
