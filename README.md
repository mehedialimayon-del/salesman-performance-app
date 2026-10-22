# HomeForce — Ayon Family

A Bengali household app for six people, using Sites-hosted ChatGPT identity, D1 records and private R2 proof photos. Orange/navy responsive design with installable web manifest.

## Included

- Six member dashboards, three editable teams, owner-controlled member emails and writing permissions.
- Four-week meal roster transcribed from the supplied sheet: morning rice by 08:30, lunch by 14:00, dinner by 23:00, individual daytime cooks and team dinner assignments.
- Sunday-only cleaning: team 1, team 2, team 3, Ayon + Shahriar, anchored 2026-10-25.
- Add/reassign tasks, proof photo upload, submit/approve/reopen and dated audit trail.
- Shopping list with quantity and assigned shopper; expenses entered separately.
- Exact-cent equal/custom splits, loan and repayment ledger, settlement suggestions, void-with-reason history.
- Fixed per-person bill templates with explicit posting after payment; duplicate-month protection.
- Notices, read/unread inbox, in-app reminders, optional browser reminders while open.
- Month-based report, Excel-compatible UTF-8 CSV, browser print/PDF.
- 15-second refresh, revision-based conflict detection. Financial entries are not queued offline.

## Access and operational limits

The Site starts owner-private. The first authorized owner starts the household. Other members need their own email assigned and Site viewer access; dashboard preview selection does not impersonate a member or create a login. Platform authentication is enforced on every API and image request. A development-only identity allows local QA; production does not use it.

The app is a hosted web/PWA app, not a compiled Android APK. Closed-app push scheduling and native APK packaging are not included. Browser notifications require the page open and permission granted. Device-local notification deduplication stores only reminder IDs. No offline private-data cache is used.

## Validation

`node node_modules/typescript/bin/tsc --noEmit`

`node --experimental-strip-types tests/ledger.mts`

Run the Sites build helper and deploy through the source workflow. Schema migration lives under `drizzle/`. Local QA data is separate from hosted production records.
