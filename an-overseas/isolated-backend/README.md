# A&N Overseas — Independent Student Portal (staging only)

## Deployment isolation
The current live website uses Supabase project `svpgjrxeqnluipsgjywk`, shared with FieldForce Hub. **Do not run migration 001 on that project.** Create a separate project explicitly owned/approved for A&N Overseas before configuring any client or executing this SQL. The live website remains unchanged until the isolated project is created, seeded, tested, and switched over.

## Intended public application flow
1. Visitor enters full name, contact email, phone, desired country, university and programme — **no password**. An inquiry record is created; this is **not** an authenticated student account and must not expose personal records. Require CAPTCHA/rate limiting prior to public launch.
2. Management dashboard lists new inquiries, can search by email/name/mobile, and changes review or payment status only after independently verifying the student and payment.
3. After confirmation, an **authenticated, admin-only Edge Function** uses the server-side Supabase Auth Admin API to create a student Auth user and student ID (such as ANO-100001), with a temporary randomly generated password. Store only the Auth user ID and student ID in Postgres; never store the temporary password, old password, token, or hash in application tables. Show the temporary password **once** for a verified private handoff, then require changing it on first login.
4. A student's ID + password should authenticate via a rate-limited secure server endpoint that maps ID to the Auth email internally, then calls Supabase Auth. Avoid a public ID->email lookup. Only that authenticated student sees their own applications and documents, enforced by RLS.
5. A student who forgets their password sends a **Password Help** request. The admin sees it in a searchable history, confirms identity through an independent contact channel, and issues a **new temporary password** via the privileged server endpoint. The old password cannot be recovered or read. Keep an audit record with actor, student ID, date, verification status and action, but no password.
6. Never treat knowledge of a name/email/mobile alone as proof of identity for a private dashboard. Inquiries can be public, but private documents, statuses and payments require a verified authenticated session.
7. Admin's own login uses a separately verified owner account in the new project. Do not bootstrap the account or its credentials by exposing passwords in GitHub/JS/SQL or a chat transcript. Create an owner account securely in the new Auth dashboard and grant its authenticated user ID in `an_admins`. Revoke previous admin permissions after successful testing.

## Files
- `001_student_portal.sql`: starter isolated database tables + RLS for the passwordless public inquiry, admin/paid student account registry, password-help queue and audit trail. Does **not** create credentials.
- **Not implemented yet:** new-project creation, media/content migration, admin-only account issuance Edge Function, private student ID sign-in endpoint, client forms, server-side CAPTCHA/rate limiting, notification delivery, and end-to-end tests.

## Migration precautions
- Existing FieldForce Hub database, Auth, SMTP and storage must not be changed.
- Existing A&N legacy data contains student profiles; do not delete the old project. Copy only records authorized for migration and rebind to new Auth identities after verified enrollment.
- When selecting an organization, obtain quoted cost before creating the new project and confirm it with the owner if nonzero.
- Before production, verify actual student registration, anti-enumeration, invoice/payment checks, admin-only authorization, reset identity checks, and authenticated private file retrieval.

## Business note
Payment confirmation must be a verified admin action; customer form input cannot mark itself paid. The audit trail must log a *password-reset action*, not the password itself.
