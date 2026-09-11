# Sales Performance Hub

A mobile-first PWA prototype for four Sales Representatives + one Manager.

## What already works in demo mode
- Individual SR login (demo PINs)
- Manager can switch between SRs
- Daily sales entry
- Manual Last Month Same Day, Active Order and PPR for Trip
- SKU/carton entry
- Monthly outlet target + targeted SKU planning
- Automatic achievement / shortfall / growth calculation
- Outlet-wise push list
- Incentive progress (sold / target / remaining / reward)
- Manager special tasks
- Excel-style summary board
- CSV export that opens in Excel
- Installable PWA shell / mobile app-like UI
- Data stored in browser localStorage for demo

## Demo users
- manager / 2468
- sayem / 1111
- bappi / 2222
- wasif / 3333
- jamil / 4444

## Put your actual data in
Edit `app.js` > `CONFIG`:
1. Replace the four salesman names.
2. Replace `outlets` with your outlet list.
3. Replace sample products with your actual 65 SKUs.
4. Put product images inside `assets/products/` and set each product `image`, e.g. `assets/products/mango.png`.
5. Set incentive target and RM reward per product.

## Publish free on GitHub Pages
Create a new repository such as `sales-performance-app`, upload these files, then Settings > Pages > deploy from the main branch/root.

Do NOT store private sales data, PINs, passwords, API secrets or Google credentials in the GitHub repository. GitHub Pages is a public static frontend. Keep real data and authorization in the backend.

## Google Sheets backend
The `backend/Code.gs` file is a starter Apps Script backend.

1. Open the Google Sheet that should become the master database.
2. Extensions > Apps Script.
3. Paste `backend/Code.gs`.
4. Run `setupWorkbook()` once and authorize.
5. Deploy > New deployment > Web app.
6. Configure access only as broadly as your chosen authentication design requires.
7. Copy the `/exec` URL.
8. Paste it into `CONFIG.apiUrl` in `app.js`.
9. Wire the frontend `save...` functions to the included `api()` helper before using real data.

### Production security note
The included frontend logins are only a UI demo. Before real use, move authentication and authorization to the server. Every backend request must verify which SR is signed in and must only return that SR's records. The manager role may return all four.

## True push notifications
The current prototype has in-app task badges. If you need notifications while the app is completely closed, add Firebase Cloud Messaging (FCM) or another Web Push service and save one push token per SR.

## Excel by email
The backend contains `emailXlsx_()` showing how the Apps Script owner can export the current Google Sheet as `.xlsx` and email it as an attachment. Restrict this function to authorized users before production.
