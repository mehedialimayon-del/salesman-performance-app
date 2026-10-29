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
