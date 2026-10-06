# FieldForce Hub 1.4 release verification

Production release APK, versionCode 5, versionName 1.4-alarms-accounts. Built from native commit 66c356c1d2fcd18eebd4d6a7d1d23b8b03625e82, GitHub run 37393953860. Signed privately with the new persistent owner release key, not a debug key. Key backup saved privately; no private signing material is in this repository.

APK SHA-256: c063130bcf657b38b3a44fb909b31b47104aad8950a59458a555685b9c38a19d
Signer certificate SHA-256: b8bf91d5cfb1a5cddaa4d9e887a5c67f3976515df63c4abff3dd092488c5dbb5
Android APK v2 and v3 signatures verify. Archive integrity passes. Release manifest has no debuggable flag. Packaged WAV bytes match the repository notification sound. Android minimum 8.0/API26, target API35.

## Implemented
- Genuine cloud auth/profile account provisioning, manager/SR roles, zones, active state and full business access delegation; only Ayon administers accounts and delegation. Accounts automatically consume shared catalogue and approved knowledge. Manager-only accounts can log in by their own staff ID. Server role overrides stale local role.
- Clock-side alarm button; daily or one-time Malaysia-time alarms; exact-alarm system permission; boot restoration; ringing service with STOP action; manager assignments delivered by push and synchronized when recipient opens the app. Recipient explicitly enables assigned alarms. Logout cancels local alarms.
- Explicit foreground native dictation with successive speech segments, ten-minute limit, manual stop and background/navigation cleanup. Catalogue and work commands preview before saving. Phone speech provider/language support may require internet.
- Native document save resolves after successful write and reports cancellation/failure.
- Branded runner/chart silhouette for Android status notifications, OneSignal default fallback replaced; packaged custom chime retained.

## Passed verification
17 JavaScript suites: baseline 14 plus native-bridge, accounts-api and manager-login. Account API tests use isolated auth mocks; they do not create live staff credentials.
8 Android Robolectric tests on API28: three alarm save/cancel/restore guards, two speech segment/failure guards, three GPS stop/expiry/accuracy guards. Release and debug compile succeeded.
4 live database rollback suites: earnings-cloud, duty-window-cloud, claims-ai-cloud and alarms-cloud. They verify privacy, actual/planning targets, rewards/expiry, financial approval/refund history, checkout location rejection, learned replies, alarm sender/recipient scope, full manager delegation, self-escalation denial and deactivation. No test financial records or staff alarms remain.
Unauthenticated accounts endpoint returns 401. Owner-provisioning permission is enforced server-side.

## Practical limits
Robolectric is a simulated Android runtime, not a physical phone. There is no connected Android handset here; actual GPS fixes, microphone recognition, locked-screen push/sound and OEM battery behavior have not been physically verified. Fresh browser runtime is signed out, so authenticated live browser acceptance has not been repeated in this phase.
Arbitrary rambling audio-file uploads and generative main-theme reasoning are not implemented by the free deterministic command parser. Supported instructions, live dictation and owner-saved knowledge work without a paid AI provider.
Remote alarms need notification delivery, exact-alarm permission and recipient opt-in. Offline/force-stopped phones, disabled notifications, muted alarm volume or OEM restrictions cannot be guaranteed away.
The new production key differs from internal test signatures. Installing over an old TEST APK can fail; sync cloud data and remove the test installation before the first production installation. Future release updates must use this same private key.
GitHub automated production signing still needs the private key secrets configured; unsigned release artifacts can be signed privately with the saved owner backup. Main-branch CI remains verification/unsigned-release output.
