# Combined FieldForce 1.12 verification — 18 October 2026

The current release combines the previous page's company access work with the Contacts update. Source baseline: `82235db373a68652b63ac2b2f9de4619eab9f653`. Continues the installed 1.11 app and its hosted code.

## Completed work

- Shared company Contacts at the bottom of Home, readable by all approved staff before attendance. Owner-only photo/name/designation/contact editing, optional details, serial insertion, delete/undo and persistent restoration to the original position.
- Owner staff management: SR, Manager, Sales Admin, Head of Sales, MD and Accounts; home zone, reporting manager, team/route, additional zones or All Zones; independent Edit/Upload/Delete. Password and permission administration remain owner-only.
- Company-wide cloud change history and Trash Bin, monthly owner history, requests, safe restore/purge, and recovery of soft removals. Local-only private notepad data and deleted external file bytes are outside this record-recovery guarantee.
- Owner is management-only; route transfer tools preserve original historical sales. No replacement staff identity was guessed.
- Incentives support dated/daily sales, SKU/combo, order count and outlet coverage, with delivered or keyed-in basis. Base salary is counted once. CPO editing/expiry and readable notification/date controls are included.
- Android email/WhatsApp intent handling is included in the 1.12 native build.

## Verified

- 28 local Node/DOM suites passed on the combined source, including Contacts, staff governance, permissions, income, session recovery, exports and attendance gates.
- Main CI `39098310950` passed web regression, actual Chromium at mobile size with controlled cloud fixtures, native unit tests and APK compilation. Earlier Contacts integration CI `39096907578` also passed. This is not physical handset acceptance.
- Combined production database transaction passed: zone isolation/multiple/All Zones; independent edit/delete/upload; escalation rejection; requests and revocation; audited delete/restore with delivery timestamp preserved; scoped CPO/incentive/notice/notification totals; catalogue soft restore/purge. All fixture writes were rolled back; no QA profiles remain.
- A real database state call found ambiguous PL/pgSQL aliases in `ffh_private.governance`, which blocked Staff Management. Zone/grant aliases were disambiguated and deployed. Afterward, actual owner state/history/trash and SR state/directory reads passed; SR global history/trash access was denied.
- Live browser login reached Emon's SR Home. Opening Daily Sales without attendance correctly opened Attendance; no fabricated attendance/sales were submitted. Subsequent refreshed-page observation became restricted by secure credential handling, so the new live frontend and owner form were not certified through that browser.

## Remaining phone acceptance

Real microphone recognition, screen-off GPS, closed-app push arrival/sound/icon/tap, hardware Back, installed-app export opening, and actual WhatsApp/email handoff require the Android phone. A complete owner/SR UI save session and live photo upload also remain to be observed.

No claim of 100% physical-device testing is made.
