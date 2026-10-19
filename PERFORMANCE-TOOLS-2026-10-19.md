# Performance helpers — 19 October 2026

Home now includes Offline Sync, Approval Inbox and Outlet History. These reuse existing performance records; no additional SR daily form, inventory or collections module is introduced.

## Access and workflow

- Offline Sync stores new order submissions in a separate per-account local outbox before sending. Foreground reconnect, app return and existing refresh ticks retry transient failures. Permission/attendance/validation failures stay visible as Needs attention and require manual retry after resolving the cause. Only cloud-confirmed submissions join Sales. Existing online delivery confirmation, attendance, proof upload and decisions remain online. Offline sign-in/app cold-start is not added.
- Order IDs use UUIDs. An insert retry after a lost response compares the existing payload and preserves later delivery state; it never overwrites a different correction. Account changes never show or replay another account's outbox. Clearing app data can erase unsent orders.
- Approval Inbox combines server-scoped task proof, access/correction requests, existing incentive/penalty requests and existing private claims. Direct task approval requires current Manager access and Tasks Edit, a pending record, allowed SR scope and a conditional server update. Other decisions open their existing review workflows. Existing income approver delegation and claim reviewer restrictions are preserved. An approved access request is a decision record, not an automatic permission grant.
- Outlet History refreshes assignments and displays orders/deliveries, named outlet tasks and campaign proof within permitted SR scope. Search and From/To filters are available. SR + outlet code identifies sales/campaign records; task names are matched only when unique within that SR's assignments. No shelf-stock, collection or inferred visit records are created. Partial fetch failures display an incomplete-history warning.
- New routes participate in browser/native page restoration and Back navigation.

## Verification

- New DOM/unit regression: offline persistence and recovery; online retry; blocked automatic retries; account and SR isolation; no SR self-approval; grant/refresh failure hides direct review; outlet code shared by different SRs stays isolated; date validation; partial history failures; lost-response duplicate reconciliation and correction conflict.
- Existing local Node/DOM regression scripts passed, including five integrated owner/manager/SR sessions, attendance gate, reports, income, catalogue, contacts and messaging. Updated mobile Chromium CI scenario opens all three modules, exercises Back and checks outlet history mobile width.
- Live read-only database verification: sales/tasks/outlets/campaign executions all have RLS enabled; task proof/reviewer columns and current delegated task-review guard present; production sales count remained 0. No production staff grants or business rows were changed.
- Standard local Chromium download was unavailable. An alternate Chromium executable ran the complete mobile fixture scenarios for Manager before/after attendance and SR: all passed, including the three new tools, Back, mobile width, preserved dashboard charts, chat and actual report/PDF downloads. These are controlled browser tests, not production-role phone sessions. No physical Android handset acceptance is claimed.
- Initial hosted mobile checks identified Home grid alignment and history input overflow. Compact separate shortcuts and constrained responsive filters fixed both.
- Final live hosted index/app/module/CSS byte comparison passed. Final source commit: 24031963db7f54e07e085e1abef9b9066b23d2d1.
- Live transactional database regression passed: delegated Manager task review, foreign-zone denial, immediate grant revocation and SR self-approval denial. All temporary profiles/tasks/zones rolled back; follow-up readback found zero fixtures and production sales remained 0.

## Final hosted evidence

- Web regression and actual mobile Chromium job: https://github.com/mehedialimayon-del/salesman-performance-app/actions/runs/39190151091/job/117860964872 — success.
- Pages deployment: https://github.com/mehedialimayon-del/salesman-performance-app/actions/runs/39190150610 — success.
- All 41 Node/DOM regression scripts and controlled mobile SR/Manager scenarios passed on the final source commit. Existing signed APK can load the hosted change; no new production APK is distributed by this change.
