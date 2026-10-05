# FieldForce Hub verification — 6 October 2026

## Published changes
- Owner/delegated work commands use deterministic free parsing for notice, task, adjustment, target, catalogue, incentive and CPO; no paid provider calls from this interface.
- Work preview precedes execution; database permissions, approval and idempotency still apply.
- Explicit Bengali dictation can run for up to ten minutes where SpeechRecognition is supported; keyboard microphone fallback otherwise.
- Browser viewing may defer phone permissions. Native attendance permission gate remains intact.
- Meeting scheduling/editing and new task reminder inputs use Malaysia time independently of the device timezone. Already zoned timestamps retain their instant.
- Full workbook export waits for its asynchronous save and reports save failures.

## Verification evidence
14 automated suites passed: income-regression, duty-dom, claims-ai-dom, earnings-dom, briefings-dom, earnings-core, duty-core, notification-read, catalogue-voice, ai-work-core, claim-pdf, free-mode, task-time, workbook.
Task and meeting time tests passed under UTC, America/New_York and/or Asia/Kuala_Lumpur.
Workbook test generated and reopened a real XLSX with 15 sheets and verified Bengali text and numeric cells. PDF tests verify generated content with a canvas stub, not physical device rendering.
Three live database transaction/rollback suites previously passed: earnings-cloud.sql, duty-window-cloud.sql, claims-ai-cloud.sql. These cover financial permissions/refunds, expiry, receipt privacy, reviewer deductions, learned replies and work idempotency.
Authenticated manager browser check saved an owner-only meeting and cloud minutes and opened the follow-up task form. The temporary meeting was archived; no staff task was sent.
Free-mode edge deployment retains JWT verification and unauthenticated requests returned 401. Pages deployment for commit 75cb13c1601f4072e4b3861b24aa05ef4e302243 succeeded.

## Unverified or not implemented as requested
- Arbitrary rambling ten-minute audio uploads, main-theme extraction, and generative answers/drafts are not provided by this deterministic free mode. It handles supported commands and owner-saved knowledge; there is no unlimited free generative provider configured.
- Physical Android locked-phone push, sound, GPS/background lifecycle, microphone recognition, finger signature and native file-save behavior remain unverified. Android WebView may require keyboard dictation.
- Browser export/SR acceptance could not continue after the browser runtime's credential protection blocked further interaction. XLSX byte-level verification does not replace physical download verification.
- Owner self-approval of claims is deliberately blocked; own claims need a distinct eligible manager reviewer.
- The available FieldForce-Hub-1.3-TEST.apk is an internal test shell that loads hosted updates. It is not a new production-signed release.

The project must not be described as 100% complete or final production on this evidence.
