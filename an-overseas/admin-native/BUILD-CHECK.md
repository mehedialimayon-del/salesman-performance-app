# A&N Overseas Admin APK — October 31, 2026

This separate Android app is built from `an-overseas/admin-native` by `.github/workflows/an-admin-apk.yml`.

Intended output: `AN-Overseas-Admin-TEST.apk` (debug-signed internal test package `com.anoverseas.admin`).

The app loads the secure existing admin portal, with persistent Supabase auth in Android WebView. Its student records are governed by existing Supabase RLS. Website and external links open outside the app. Foreground alerts use Android notification APIs; notifications while fully closed still need a push service.

Verification required: successful APK compilation, Android physical install/login, read/update website CMS, inbox chat, EMGS, and private document URL access. Do not label production release until these checks pass.
