# FieldForce company access update — 18 October 2026

This release updates the hosted app used by the existing Android 1.11 WebView. It does not replace or re-sign that APK.

## Staff and access

Owner M21954 can create SR, Manager, Sales Admin, Head of Sales and MD accounts. Each account has a home zone, optional reporting manager and team, additional permitted zones or All Zones, and independent Edit, Upload and Delete grants per module. Assigning a management position gives a scoped dashboard; it does not grant business edits. Common catalogue, proposals and AI content stay shared. Password and permission administration remain owner-only.

The owner is management-only. Use Transfer Route to assign the owner's existing outlets to a new SR. Past sales keep their original staff ID. A manager can also have a personal SR route. Base salary is counted once, with own-route and team variable earnings shown separately. Zone visibility follows the current staff assignment.

## Changes, requests and recovery

Cloud business tables have immutable change records with actor, name, zone, timestamp and original/new values. Monthly history supports pagination. Deletes enter Trash Bin; the owner can restore the original key or purge the recovery data. Restoration does not silently overwrite a newer record with the same ID. Related records can require the parent to be restored first. Password values are never copied into business history.

SRs can correct their own sales. Delete needs a separate permission. Staff can submit edit/delete requests to the owner. Account deactivation prevents server access; grants last until revoked. Existing local-only private notepad data is outside the cloud change history.

## Incentives and communications

Rules support sales amount, SKU/combo cartons, order entries and unique outlet coverage; delivery or keyed-in basis; daily or one reward across a date window. Reward estimates use the actual qualifying event date in Malaysia. Later key-ins/deliveries outside the window do not qualify. Incentives and approved adjustments update the live estimated income, rather than issuing a bank payment.

Campaigns support editing, expiry labels, scoped visibility, independent deletion and undo. Notice assignment can target permitted zones or individuals. Morning team summaries and incentive-gap notifications use the recipient's permitted scope. Notification banners use a light background with dark text, and selectable dates/months have highlighted controls.

## Verification

- 12 Node/DOM regression suites pass, including account forms, password preservation, actual Auth/profile-linkage mocks, income approval/refund, own/team income, notices, session recovery and duty logic.
- Rollback-only tests on the connected database verify zone isolation, multiple-zone and All Zones viewing, edit/delete/upload separation, escalation denial, revocation, audited deletion/undo, scoped CPO publication/undo, offer publishing and scoped notification totals/recipients. No QA fixture is retained.
- Native APK code was not changed. Microphone, screen-off GPS, notification arrival/sound/icon with a closed app, and physical Android navigation were not tested on the user's phone in this session. DOM/database checks do not establish those outcomes.

This is not a claim that every module and every physical-device scenario has passed. The Edge Function message in the supplied migration screenshot has not been reproduced in the user's signed-in phone session.
