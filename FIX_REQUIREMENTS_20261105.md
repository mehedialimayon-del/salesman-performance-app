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
- Android Back/gesture: when no photo viewer is active, show an explicit No / Yes Exit confirmation even from a module page, leaving that page unchanged while waiting.
- NO keeps the current screen in place; YES invokes the app exit command. Pressing the Android Home button remains a normal OS action.
- Do not minimize, silently exit, or return to another module merely from Android Back; the only automatic close is a photo viewer's own Back action.
- Maintain the history-based back guard for legacy native wrappers that still call history.back() directly.

## Team / zone filter
- Remove the duplicate "Team Filter > Filter" accordion arrangement; show the existing zone and SR selectors directly and together.
- Label them SELECT ZONE and SELECT SR; keep combined SR totals within the selector.
- Present internal zone code PRIMARY as KL ZONE in the UI without changing database keys or historical records.
- Apply this to every module that shares the existing ffScopeFilter component and to Zone picker labels.

## APK acceptance
- Signed production APK using the existing release certificate; matching package ID and increased versionCode.
- Verify APK signature and checksums; APK installs and launches via adb on a fresh Android emulator, and regression tests pass.
- Test a same-certificate upgrade without deleting staff app data. A Play Protect / Install unknown apps system warning cannot be programmatically disabled.
- Only after production signing and physical-phone acceptance, package the actual installable .apk inside a WhatsApp-shareable ZIP.

## Current status
- The target corrections live in an isolated branch, not the main deployed version.
- JavaScript parse checks passed; full mobile/browser regression and a signed APK build have not yet been completed.

## Screenshot-led mobile follow-ups (05 November, 22:54 MYT)
- Dashboard: one selected manager/SR identity alongside Dashboard title; restored portrait is inside the small circular percentage badge, while Performance Command Center text and KPI calculations are unchanged.
- AI: preserve the user's drag position on every page; animation originates at the exact orb position and closes back into it on second click, rather than moving the orb to top right. Existing composer/send/microphone remain functional.
- Proposal artwork: all retailer posters share the same 3:1 artwork viewport. Image fills that viewport; do not add a second dark frame behind it or remove existing Create/Download/Edit actions.
- Assign Task: dialog width and all descendants fit narrow Samsung viewports. Android Back closes the task editor into Tasks; it must not accidentally exit the app.
- Zero Sales: scrollable outlet rows extend to the fixed bottom navigation, not a half-height panel. Never add fictitious outlet rows or change the zero-sales count.
- Contact cards: preserve photo, name, designation, department, WhatsApp and email; show Salesmen/Routes in two compact statistic cards and full-width KL zone. Optional names can expand on demand.
- Munnaf (M22328): database confirms manager_id=M21954 and zone_id=PRIMARY; the mixed person/zone picker must not claim "MANAGER NOT ASSIGNED" when staff is selected. Do not create a new assignment or duplicate photo.
- Staff access: can_sell=true permits baseline SR work even when ffh_access_grants has no extra rows. Show checked, non-editable role-included rights separately from real extra Edit/Upload/Delete grants. Do not falsely mark a grant checked or silently revoke baseline access.
- Manager scope, Head of Sales permissions, private data and RLS remain unchanged unless a separate, tested backend permission change is deliberately authorized.
- Consolidate overlapping correction scripts; load only november-mobile-fixes.js / november-mobile-fixes.css once.
- Verify targeted automated tests and physical-install acceptance before any production release; do not distribute a debug-signed APK as an update to an already signed production app.
