# A&N Overseas Education & Consultancy

Responsive 16-screen website preview in `index.html`. The site uses a dark/orange design and includes the homepage, countries, university catalogue with search/filter, university details, four-step application preview, login/register preview, dashboard preview, document upload preview, EMGS milestone preview, accommodation, payments, success stories, services, about, and contact.

## Current build status
- Frontend created and locally smoke-tested at mobile and desktop sizes.
- The pages can be browsed without a backend. University images are illustrative remote images.
- Login/registration, sensitive document upload, message submission, payment and actual EMGS tracking **are not active**. Do not enter real personal documents or accept production applications until secure backend integration.
- Do not publish invented admission, visa, fees, or success statistics.

## Preview hosting
If GitHub Pages deploys from `main` branch, the expected URL is:
https://mehedialimayon-del.github.io/salesman-performance-app/an-overseas/

Code upload does not guarantee that Pages hosting has been enabled. Check repository Settings → Pages and ensure this path loads.

## Custom domain
This directory is isolated from FieldForce. **Do not** add a CNAME to the existing FieldForce repository. To use the recovered A&N custom domain as the root site, move the directory to the purchased web hosting root or a dedicated GitHub Pages repository, set domain and www DNS correctly, and enable HTTPS. Navigation uses hash routes so link handling is portable.

## Backend
Use a separate secure Supabase project or another private backend for student authentication, private files, application status, offer letters and invoices. An initial `backend-schema.sql` proposal is included with the downloadable preview ZIP; it is not deployed and must undergo technical review.


## October 29, 2026 catalogue and responsive updates
- All non-home page headings are shortened; the laptop homepage action/summary area is also more compact.
- The Malaysia catalogue contains 50 institutions: 20 public and 30 private. These are a curated directory, **not** a published top-50 ranking. The eight original researched Malaysian institutions have detailed, sourced profile pages. Newly added schools intentionally display a basic official-site profile until their course fees and photographs are verified.
- Desktop and laptop university cards use four columns; tablets and phones use smaller responsive layouts.
- University filters: destination, public/private, study level, field, tuition budget by published **programme examples**, entry requirement keyword and sort order. Costs differ by qualification and duration; the budget filter is not a guarantee of any student's final fee.
- `site-content.json` holds owner-editable **public** site copy, management cards and additional universities. Edit using `owner-studio.html`: drafts remain on the device until the exported JSON file is committed via the authenticated GitHub account.
- Studio URL: https://mehedialimayon-del.github.io/salesman-performance-app/an-overseas/owner-studio.html
- Neither `owner-studio.html` nor the public website is a password-protected administrator system. Do not store student records or private files there. Secure student account login, confidential document handling and automatic CMS publishing still require a protected backend and permissions.

## October 30, 2026 — Dedicated Admin App (installable PWA)

URL: https://mehedialimayon-del.github.io/salesman-performance-app/an-overseas/admin-app/

Files: `admin-app/index.html`, `app.js`, `style.css`, `manifest.webmanifest`, `sw.js`, `icon.svg`.

- Dedicated private admin interface using existing Supabase project, verified Supabase Auth and RLS-protected `an_admins` authorization.
- Login persists on the device; no service-role keys are embedded. Only the registered administrator is allowed access.
- Inbox: enquiry management, mail/WhatsApp follow-up shortcuts, registered-student chat replies.
- Applications: existing leads, application status, EMGS progress, private document signed links (90-second expiry).
- CMS: homepage settings, ticker, university overrides, public management profiles and service-request progress.
- Public website now loads `an-live-content.js`, which reads public `an_site_content` data. The public contact form can submit to `an_enquiries` using anon INSERT privileges under RLS. No private student data is fetched publicly.
- Persistent bottom navigation has an explicit Website shortcut. Use Android Chrome's **Add to Home screen** / **Install app**.
- Foreground/in-app notifications and periodic refresh are implemented. Background push while the app is completely closed is NOT configured.
- Technical caveats: this is a PWA, not a compiled APK. Live browser login, Android installation and real application messaging still need owner-device smoke tests. The static public site still contains some preview-only student journeys, which are outside the scope of this Admin App.
