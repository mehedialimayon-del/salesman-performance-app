# FieldForce Hub — no-redesign correction requirements (2026-11-05)

## Design and data freeze
- Preserve the previously accepted black / deep-orange / pure-white theme, logo, live ticker, bottom navigation, existing cards, typography, user roles and data.
- Do not alter targets, sales calculation, permissions, staff records, notifications or modules as part of this correction.
- Preserve the established APK package identifier and persistent signing certificate, and increment versionCode on each installable update.

## Screenshot 1: Zone selection
- Exactly one round profile photo per assigned manager, or one initial-circle fallback when no approved photo exists.
- Manager name, Staff ID and designation remain legible; tapping the portrait opens the full photo.
- Search field must remain above the list and never overlap a zone row, including when scrolling / using keyboard.
- Image viewer Back must close the image and return to the same Zone selector.

## Screenshot 2: Dashboard
- Restore a circular percentage indicator with the real selected staff/zone manager portrait inside the circle, not just a detached percentage on the right.
- Keep the previous dashboard tabs and six KPI cards unchanged. For combined SRs within a specific zone, show that zone's actual manager portrait.
- Do not fabricate percentage values, delivered sales or previous-month history. Never show a fake photo.

## AI floating button
- Opening or closing the AI window must never reposition the floating button. If the user drags it, preserve its saved coordinates.
- Press the same button a second time to close the AI window.
- Composer and Send must remain usable; make space for input controls rather than moving the floating button.

## Navigation and exit
- Android Back/gesture: first close a photo or modal, then navigate to the previous internal page.
- On Home, display a clear Cancel / Exit confirmation; dismissing it keeps the app open.
- No accidental exit when pressing the background, or when using Android Back on a normal page.

## APK acceptance
- Signed production APK using the existing release certificate; matching package ID and increased versionCode.
- Verify APK signature and checksums; APK installs and launches via adb on a fresh Android emulator, and regression tests pass.
- Test a same-certificate upgrade without deleting staff app data. A Play Protect / Install unknown apps system warning cannot be programmatically disabled.
- Only after production signing and physical-phone acceptance, package the actual installable .apk inside a WhatsApp-shareable ZIP.

## Current status
- The target corrections live in an isolated branch, not the main deployed version.
- JavaScript parse checks passed; full mobile/browser regression and a signed APK build have not yet been completed.
