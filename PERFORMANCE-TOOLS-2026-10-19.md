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
- Local Chromium download was unavailable. Hosted CI/mobile Chromium result must be recorded separately; no physical Android handset acceptance is claimed.
