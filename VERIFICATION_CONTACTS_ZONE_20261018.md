# Contacts and zone access — review checkpoint, 18 October 2026

Continues main commit `5b12eeab73edee1d9bac9f5072b40d65d80f067b` and installed APK 1.11. This is not certification that all earlier requested features are finished.

## Changes

- Contacts button is last on Home for managers and SRs, available before attendance.
- Shared company directory with owner-only create/edit/delete, photo replacement/removal, serial insertion, undo and persistent deleted-contact restore. Empty optional fields are hidden. WhatsApp and email links have distinct icons.
- Contacts cloud writes compare versions to reject stale simultaneous saves. Access policies permit active approved staff in every zone to read and only M21954 to update.
- Account creation supports SR, Manager, Sales Admin, Head of Sales, MD and Accounts; optional team/route labels, All Zones and extra assigned zones. These labels do not imply newly implemented independent team membership: current report scope is zone based.
- Account errors now remain on a visible retry screen. Owner-only password reset remains enforced in the service.
- Zone selection filters the accessible team on report/dashboard scope controls. Changing read scope does not grant account administration or business edit permissions.
- Incentive groups can count delivered sales or keyed/submitted orders. Date windows and cancelled-order exclusions remain enforced.
- Month/date-only legacy CPO records now expire at month end instead of appearing perpetually active. Date/month selectors and premium popup controls receive readable colors.
- Android email links use ACTION_SENDTO; HTTPS/WhatsApp links use ACTION_VIEW; missing external apps show an error instead of crashing.

## Verified before release review

- Contacts DOM flows: create/edit/reorder, optional field visibility, escaped text, links, delete/undo/restore, SR read-only controls, offline failures and stale-version rejection.
- Account service and UI regression: owner-only provisioning/password changes, extended role mapping, zone validation and preservation of existing password when blank.
- Real production database transaction with rollback: owner contact save; SR directory read/write denial; cross-zone denial; extra-zone grant; All Zones grant; immediate revocation.
- Existing manager/SR attendance-gate/chat/map DOM checks and income/commission tests pass.
- Further workflow and browser results must be assessed from the commit's CI run; a local Chromium download was unavailable.

## Still outstanding from the previous request

- Full application-wide owner audit history/trash, separate edit/delete grants and request/approval UI have not been implemented in this checkpoint. Contacts undo/trash is limited to Contacts; existing financial reversal/history remains separate.
- Staff transfers, inactive staff and historical zone attribution need complete acceptance; there is no automatic route reassignment.
- The owner said he now has no SR route. No route/name/sales records were reassigned without the replacement staff identity; the owner's role transition needs review while preserving historical sales.
- Full live owner and SR browser sessions are needed to exercise saves and reports end-to-end. A browser login page was reached, not an authenticated business flow.
- Physical Android microphone, GPS/background service, notification receipt/sound/tap, hardware Back, file opening and WhatsApp/email handoff remain unverified without a connected device.

No physical-device or 100% final-release claim is made.
