# TestSprite Task Ledger

When TestSprite runs, treat this file as the task list. For each relevant feature/edit below, execute the listed checks and change each execution item from `PENDING` to `PASS` or `FAIL` with one short evidence note. Use this format:

- [ ] PENDING: Check name.
- [x] PASS: Check name - evidence.
- [ ] FAIL: Check name - failure evidence or reproduction.

Do not remove failed checks until the defect is fixed and rerun.

---

# TestSprite Plan: TMV CTV Referral Flip Cards 0.32.53 2026-05-27
# TestSprite Plan: NK3 Cosmetic Catalog Sheet Import 2026-05-21

Feature/edit name: NK3 Cosmetic Catalog Sheet Import 2026-05-21

Changed URLs and resources:
- Target staging only: `https://nk3.2checkin.com` after NK3 is reachable.
- No NK or NK2 URL, database, route, or data change is in scope.
- New importer/extractor: `api/scripts/import-nk3-cosmetic-catalog.js`.
- New regression test: `api/tests/nk3CosmeticCatalogImport.test.js`.
- Extracted source files: `reports/nk3-cosmetic-catalog-extract/2026-05-21/services.csv`, `categories.csv`, `locations.csv`, `anomalies.json`, `summary.json`.
- Cosmetic API routes to verify after NK3 apply: `GET /api/cosmetic/Products`, `GET /api/cosmetic/ProductCategories`, `GET /api/cosmetic/Companies`.
- Cosmetic UI URLs to verify after NK3 apply: `/service-catalog`, `/calendar` service picker, `/appointments` service picker, and any location filter that reads `companies`.

Affected data flows:
- Google Sheet `Dịch vụ` tab -> local `tcosmetic_demo.dbo.productcategories` / `products`, or NK3 online `tcosmetic_smoketest.dbo.productcategories` / `products`.
- Google Sheet `Chi nhánh` tab -> local `tcosmetic_demo.dbo.companies` / `partners`, or NK3 online `tcosmetic_smoketest.dbo.companies` / `partners`.
- Import defaults to the cosmetic database only and refuses dental, NK, and NK2 targets; `tcosmetic_smoketest` is allowed only when `--target nk3`.
- Import is non-destructive: creates/updates matching rows, soft-inactivates active cosmetic demo services/categories not in the sheet, and never deletes rows.
- Search support keeps `namenosign` accent-insensitive, while service identity preserves Vietnamese tone differences such as `mắt` versus `mặt`.

User roles:
- Multi-LOB admin with cosmetic scope, expected login `t@clinic.vn` once NK3 staging is reachable.
- Staff with cosmetic service/catalog permissions should see the same uploaded catalog after admin verification.

Happy paths:
- NK3 Cosmetic service catalog shows 175 active services across 11 categories.
- NK3 Cosmetic location selectors show exactly 2 imported locations: `Thẩm mỹ Hà Nội` and `Thẩm mỹ Hồ Chí Minh`.
- Cosmetic service search remains accent-insensitive for Vietnamese names.
- Dental/NK/NK2 service catalogs remain unchanged.

Edge cases:
- Source row 66 is skipped because it has category `Dịch vụ khác` but blank service name and price 0.
- Distinct services that differ only by Vietnamese tone marks must both import, for example `Nâng cơ trẻ hóa vùng mắt Ultherapy` and `Nâng cơ trẻ hóa vùng mặt Ultherapy`.
- `--apply --target nk3` must fail unless `CONFIRM_NK3_COSMETIC_IMPORT=YES` is set.
- Any database URL containing `tdental_demo`, `nk2`, or `nk.2checkin.com` must be rejected; local target allows only `tcosmetic_demo`, NK3 target allows only `tcosmetic_demo` or `tcosmetic_smoketest`.

Regressions to prevent:
- Accidentally importing the cosmetic catalog into dental/NK/NK2.
- Collapsing tone-distinct Vietnamese service names into one row.
- Deleting legacy rows instead of soft-inactivating cosmetic-only demo rows.
- Applying the import before a fresh NK3 DB backup and explicit operator confirmation.

Setup and execution items:
- [x] PASS: Extract Google Sheet into local CSV/JSON artifacts - output directory `reports/nk3-cosmetic-catalog-extract/2026-05-21`.
- [x] PASS: Parse source workbook - `node scripts/import-nk3-cosmetic-catalog.js --parse-only --extract` reported 175 services, 11 categories, 2 locations, and 1 anomaly.
- [x] PASS: Focused importer unit tests - `npx jest --runTestsByPath api/tests/nk3CosmeticCatalogImport.test.js --runInBand`.
- [x] PASS: Local dry-run against `tcosmetic_demo` - plan would create 175 services, 11 categories, 2 locations; soft-inactivate 10 demo services and 2 demo categories.
- [x] PASS: Fresh NK3 `tcosmetic_smoketest` backup downloaded before remote apply - `backups/nk3/tcosmetic_smoketest-pre-catalog-20260521T222007.dump`.
- [x] PASS: Run NK3 apply only after explicit confirmation and `CONFIRM_NK3_COSMETIC_IMPORT=YES` - `docker exec -e CONFIRM_NK3_COSMETIC_IMPORT=YES tgroup-nk3-api node scripts/import-nk3-cosmetic-catalog.js --apply --target nk3` applied to `tcosmetic_smoketest`.
- [x] PASS: Verify NK3 `/service-catalog` with screenshot evidence after import - `reports/nk3-cosmetic-catalog-extract/2026-05-21/nk3-service-catalog-after-import.png` shows Cosmetic catalog with 175 services and imported Filler rows.
- [x] PASS: Verify NK/NK2 catalogs remain unchanged after NK3 apply - import ran only in `/opt/tgroup-nk3` against container `tgroup-nk3-api` and DB `tcosmetic_smoketest`; no NK/NK2 host, container, or database command was executed for the write.

---

# TestSprite Plan: Feature Catalog 2026-05-20

Feature/edit name: TMV CTV referral tracking flip cards with per-service detail.

Changed URLs and API routes:
- Live page to verify after deploy: `https://tmv.2checkin.com/ctv`.
- API routes: `GET /api/ctv/referrals`, `GET /api/ctv/commission-summary`.
- Frontend surfaces: CTV Tracking tab and CTV Referrals tab in the mobile CTV portal.

Affected data flows:
- CTV opens `/ctv`; frontend loads self-owned referrals from both dental and cosmetic DBs.
- Backend reads `dbo.partners.referred_by_ctv_id` and `dbo.earnings.recipient_partner_id`, then joins service-line/product names from `dbo.saleorderlines` / `dbo.products`.
- Each referral card keeps the front journey/status summary and flips on click/tap to reveal all attributed service rows.

Roles and setup state:
- CTV user on TMV with at least one referred client that has multiple earnings/service rows.
- Browser should start from a fresh session or hard refresh after deploy to avoid old CTV bundle cache.

Happy paths:
- CTV login redirects to `/ctv`; Tracking tab shows referral cards.
- Clicking/tapping a referral card flips it and shows every service name, amount, status, LOB, and earned date under that client.
- Clicking/tapping the card again returns to the journey side.
- Search must match Vietnamese names/services accent-insensitively, e.g. `thuan` matches `Thuần`.

Edge cases:
- Referral with no earnings shows the no-service empty state and remains clickable.
- Referral with dental and cosmetic rows keeps both LOB pills and merges services without losing totals.
- Long service names truncate without overlapping amounts or timeline labels.

Regressions to check:
- CTV Home, Commission, Referrals, and Me tabs still load.
- `GET /api/ctv/client-journeys` and booking/recruit sheets still work.
- Admin routes remain blocked for CTV users; non-CTV users cannot open `/ctv`.
- No calls should hit `nk.2checkin.com` or `nk2.2checkin.com` during TMV verification.

Verification state:
- [x] PASS: Local API test confirms `GET /api/ctv/referrals` returns `services[]` and `service_count` - `npx jest --runInBand src/routes/__tests__/ctvReferrals.test.js ...` passed 5 suites / 30 tests.
- [x] PASS: Local CTV component tests confirm card flip and accent-insensitive search - `npm --prefix website test -- src/__tests__/ProtectedRoute.ctv.test.tsx src/lib/api/__tests__/ctv.booking.test.ts src/components/ctv/ReferralFlipCard.test.tsx src/pages/CTV/tabs/CtvTrackingTab.test.tsx` passed 4 files / 10 tests.
- [x] PASS: Build passes with CTV i18n keys in English and Vietnamese - JSON parse check passed and `npm --prefix website run build` completed for 0.32.53.
- [ ] PENDING: Live TMV screenshot shows `/ctv` route on version `0.32.53` after deploy.

# TestSprite Plan: NK3 Cosmetic Employee Login Account 0.32.52 2026-05-26

Feature/edit name: NK3 live Cosmetic employee account login and production API origin restore.

Changed URLs and API routes:
- Live page to verify after deploy: `https://tmv.2checkin.com/login`.
- Live page to verify after deploy: `https://tmv.2checkin.com/employees?lob=cosmetic`.
- API routes: `POST /api/Auth/login`, `GET /api/Auth/me`, `GET /api/me/lob-scope`, `POST /api/Auth/change-password`, `POST /api/cosmetic/Employees`, and permission middleware for `/api/cosmetic/*`.
- Web API fallback: production `VITE_API_URL` fallback must be same-origin `/api`, never `localhost` or `127.0.0.1`.

Affected data flows:
- Admin creates a Cosmetic employee with password through the Employees form.
- Employee row, password hash, `lob_scope=['cosmetic']`, and optional tier remain in `tcosmetic_demo`.
- Login searches the employee account across LOB auth sources and stamps `auth_lob='cosmetic'` into the token/user payload.
- `/api/Auth/me`, `/api/me/lob-scope`, password change, and `requirePermission()` resolve permissions under the token source LOB.

Roles and setup state:
- Admin user with both dental and cosmetic LOB scope.
- Disposable Cosmetic employee account with known temporary password.
- Start from a fresh browser context or hard reload to avoid old cached web bundles.

Happy paths:
- Login as existing CTV/admin accounts should call `https://tmv.2checkin.com/api/Auth/login` and must not call localhost.
- Create a Cosmetic employee account, clear session, and log in as that employee through the real login form.
- After login, `/api/Auth/me` and `/api/me/lob-scope` must return `lob_scope` containing `cosmetic` and `auth_lob`/`lob_context` set to `cosmetic`.

Edge cases:
- A Cosmetic employee row with null/empty `lob_scope` from the pre-fix period should still fall back to the source auth LOB for login visibility.
- Wrong password still returns 401 and counts toward the existing rate limiter.
- Dental employees continue to authenticate against Dental and do not gain Cosmetic scope.

Regressions to check:
- `ctv@clinic.vn` login still redirects to `/ctv`.
- Live JS bundle must not contain `http://localhost:3002/api` or `http://127.0.0.1:3000/api`.
- Cosmetic employee creation still writes only Cosmetic and does not leak to Dental.

Verification state:
- [x] PASS: Emergency live login restore rebuilt the NK3 web container with `VITE_API_URL=/api`; browser automation logged in as `ctv@clinic.vn`, ended on `/ctv`, saw `POST https://tmv.2checkin.com/api/Auth/login` return 200, and recorded zero localhost API calls. Evidence: `output/live-verification/nk3-live-login-restored-20260526T074600Z/report.json`, screenshot `output/live-verification/nk3-live-login-restored-20260526T074600Z/nk3-live-login-restored.png`, video `output/live-verification/nk3-live-login-restored-20260526T074600Z/page@4f231c3e989d3bc74a616c2173c23d36.webm`.
- [x] PASS: Pre-fix live employee-login reproduction created `NK3 EMP LOGIN 20260526060559` through the real UI, confirmed the row existed only in `tcosmetic_smoketest`, and captured `POST /api/Auth/login -> 401 Invalid email or password`.
- [x] PASS: After deploying 0.32.52, real browser video created Cosmetic employee account `NK3 EMP LOGIN 20260526075607`, logged out, logged in as that employee through the website, and saw `POST /api/Auth/login -> 200`. Evidence: `output/live-verification/nk3-employee-login-fixed-20260526T075600Z/nk3-employee-login-fixed-report.json`, screenshot `output/live-verification/nk3-employee-login-fixed-20260526T075600Z/nk3-employee-login-fixed-final.png`, MP4 `output/live-verification/nk3-employee-login-fixed-20260526T075600Z/nk3-employee-login-fixed.mp4`.

# TestSprite Plan: NK3 Live Cosmetic Employee Create Verification 2026-05-26

Feature/edit name: NK3 live UI employee create verification for reported Cosmetic staff creation issue.

Changed URLs and API routes:
- Live page verified: `https://tmv.2checkin.com/employees?lob=cosmetic`.
- Isolation page verified: `https://tmv.2checkin.com/employees?lob=dental`.
- API route observed from the browser UI: `POST /api/cosmetic/Employees`.

Affected data flows:
- Admin opens the Employees page with the header LOB set to Cosmetic.
- Employee create form submits through `createEmployee(data, currentLOB)` and writes the Cosmetic DB route.
- Cosmetic employee search should show the created staff record; Dental employee search should not show it.

Roles and setup state:
- Admin user with both dental and cosmetic LOB scope.
- Live NK3 version `0.32.51` commit `52286e9`.

Verification state:
- [x] PASS: Live UI screen recording created `NK3 EMP VIDEO 20260526053809` through the Employees form with `POST /api/cosmetic/Employees` returning 201.
- [x] PASS: Created employee appeared in Cosmetic employee search with 1 visible match.
- [x] PASS: Switching to Dental and searching the same employee returned 0 visible matches.
- [x] PASS: MP4 handoff artifact generated at `output/live-verification/nk3-employee-create-video-20260526T053500Z/nk3-employee-create-verification.mp4`; report at `output/live-verification/nk3-employee-create-video-20260526T053500Z/nk3-employee-create-report.json`; final screenshot at `output/live-verification/nk3-employee-create-video-20260526T053500Z/nk3-employee-create-final.png`.

# TestSprite Plan: NK3 Cosmetic Feedback Hotfix 0.32.50 2026-05-25

Feature/edit name: NK3 Cosmetic feedback hotfix for the five reported broken admin flows.

Changed URLs and API routes:
- Live page to verify after deploy: `https://tmv.2checkin.com/customers?lob=cosmetic`.
- Live page to verify after deploy: `https://tmv.2checkin.com/calendar?lob=cosmetic`.
- Live page to verify after deploy: `https://tmv.2checkin.com/permissions?lob=cosmetic`.
- API routes: `POST/PUT/PATCH/DELETE /api/cosmetic/Partners`, `GET /api/cosmetic/Partners/:id`, `GET /api/cosmetic/Partners/resolve`, `GET/POST/PUT /api/cosmetic/Appointments`, `GET/POST/PUT/DELETE /api/cosmetic/Payments`, `GET /api/cosmetic/CustomerBalance/:id`, `GET/PUT /api/cosmetic/Permissions/*`, `GET/POST/PATCH /api/cosmetic/SaleOrders`, `GET/DELETE /api/cosmetic/SaleOrderLines`.

Affected data flows:
- Cosmetic customer create/edit/delete and customer-code resolve must stay in `tcosmetic_demo`.
- Cosmetic appointment list/create/edit/reschedule must stay in `tcosmetic_demo`.
- Cosmetic customer profile must fetch customer detail, appointment history, sale-order lines, and balance from Cosmetic routes.
- Cosmetic deposit/payment screens must create payments and then refresh `GET /api/cosmetic/CustomerBalance/:id`.
- Permission Board under Cosmetic must load groups/employees and save employee permission changes through `/api/cosmetic/Permissions/*`.

Roles and setup state:
- Admin user with both dental and cosmetic LOB scope, e.g. NK3 admin `t@clinic.vn`.
- Start on `https://tmv.2checkin.com`, switch header LOB to Cosmetic, and keep Cosmetic selected for all checks.
- Use disposable live QA names/phones only.

Happy paths:
- Add a Cosmetic customer and verify the customer remains visible after refresh/search.
- Add a Cosmetic appointment for that customer and verify it appears on Calendar and customer profile.
- Add an advance/deposit for that customer and verify the wallet/advance balance increases without a 404.
- Record a Cosmetic payment and verify it appears in the customer payment list.
- Change an employee permission group/location scope under Cosmetic and verify save succeeds and reloading keeps the change.

Edge cases:
- Dental isolation: the new Cosmetic customer ID must not resolve through legacy `/api/Partners/:id`.
- Customer profile deep links and non-UUID customer-code resolution must use the active Cosmetic LOB.
- Calendar drag/drop reschedule must call `/api/cosmetic/Appointments/:id` while Cosmetic is active.
- Service create/update/delete from a Cosmetic customer profile must not hit dental sale-order routes.

Regressions to check:
- Dental customer, appointment, payment, and permission flows still use legacy `/api/*` routes.
- CTV `/ctv` portal and admin CTV commission routes from 0.32.49 still load.
- `version.json` updates to `0.32.50` after deploy.

Verification state:
- [x] PASS: Pre-fix live API regression on `https://tmv.2checkin.com` showed customer create PASS, appointment create PASS, payment record PASS, permission save PASS, dental isolation PASS, and customer balance FAIL with `Route not found: GET /api/cosmetic/CustomerBalance/:id`; evidence screenshot `output/live-verification/nk3-feedback-regression-20260525T170000Z/nk3-feedback-regression-customers-page.png`.
- [x] PASS: Local targeted tests passed 5 frontend files / 23 tests for customer/profile/service/permission LOB routing.
- [x] PASS: Local backend cosmetic guard test passed 15 tests and now asserts `/api/cosmetic/CustomerBalance` remains mounted.
- [x] PASS: After deploy, live NK3 `https://tmv.2checkin.com` served `0.32.50` commit `931de63`, and the five-bug regression passed with `Origin: https://tmv.2checkin.com`: customer create, appointment create, deposit balance refresh, payment record, and staff permission save. Evidence: `output/live-verification/nk3-feedback-regression-0.32.50-20260525T172500Z/regression-report.json`, screenshot `output/live-verification/nk3-feedback-regression-0.32.50-20260525T172500Z/nk3-feedback-regression-live.png`, video `output/live-verification/nk3-feedback-regression-0.32.50-20260525T172500Z/nk3-feedback-regression-live-video.webm`.

# TestSprite Plan: NK3 Cosmetic Appointment UI LOB Routing 0.32.51 2026-05-26

Feature/edit name: NK3 live UI appointment submit must keep the active Cosmetic LOB.

Changed URLs and API routes:
- Live page to verify after deploy: `https://tmv.2checkin.com/calendar?lob=cosmetic`.
- Live page to verify after deploy: `https://tmv.2checkin.com/customers/:id?lob=cosmetic`.
- API routes: `POST /api/cosmetic/Appointments`, `PUT /api/cosmetic/Appointments/:id`, and dental regressions for `POST/PUT /api/Appointments`.

Affected data flows:
- Shared `useAppointmentForm` create/update submits now pass `BusinessUnitContext.currentLOB` into the appointment API client.
- Cosmetic Calendar and customer-profile appointment forms write `tcosmetic_demo.dbo.appointments`.
- Dental Calendar and profile appointment forms keep legacy `/api/Appointments` behavior.

Roles and setup state:
- Admin user with both dental and cosmetic LOB scope.
- Start on `https://tmv.2checkin.com`, switch header LOB to Cosmetic, and create only disposable live QA customer/appointment records.

Happy paths:
- Create a Cosmetic customer through the UI.
- Create a Cosmetic appointment through the Calendar UI for that customer and verify the UI network call is `POST /api/cosmetic/Appointments`.
- Create or edit a Cosmetic appointment from customer profile and verify the UI network call stays under `/api/cosmetic/Appointments`.

Edge cases:
- Appointment forms embedded in multiple surfaces must share the same LOB routing behavior.
- Cosmetic customer UUIDs must not be submitted to legacy dental `/api/Appointments`.

Regressions to check:
- Dental appointment create/edit still uses `/api/Appointments`.
- The previous NK3 hotfix flows still work: customer create, deposit balance refresh, service payment, and permission save.

Verification state:
- [x] PASS: Pre-fix live UI reproduction failed on NK3 `0.32.50` while header LOB was Cosmetic; Calendar/Profile appointment submit raised `Partner with given partnerId does not exist` and did not call `/api/cosmetic/Appointments`. Evidence: `output/live-verification/nk3-ui-bugfix-video-20260526T020000Z/nk3-ui-bugfix-error.png`.
- [x] PASS: Unit regression `npm --prefix website test -- src/components/appointments/unified/__tests__/useAppointmentForm.test.ts` passed 1 file / 7 tests, including Cosmetic create/edit LOB routing.
- [x] PASS: After deploy, live NK3 UI video on `https://tmv.2checkin.com` showed 7/7 website-driven checks passing on version `0.32.51` (`ebaeb73`): Cosmetic customer create, Calendar appointment create via `POST /api/cosmetic/Appointments`, deposit, service payment, permission save, and Dental isolation. Video: `output/live-verification/nk3-ui-bugfix-video-20260526T020000Z/nk3-ui-bugfix-verification.webm`; report: `output/live-verification/nk3-ui-bugfix-video-20260526T020000Z/nk3-ui-bugfix-report.json`; final screenshot: `output/live-verification/nk3-ui-bugfix-video-20260526T020000Z/nk3-ui-bugfix-final.png`.

# TestSprite Plan: NK3 CTV Portal Tracking Refresh 2026-05-25

Feature/edit name: NK3 CTV self portal refresh and Tracking tab.

Changed URLs and routes:
- Live page to verify after deploy: `https://tmv.2checkin.com/ctv`.
- Local page during development: `/ctv`.
- API routes: `GET /api/ctv/commission-summary`, `GET /api/ctv/referrals`, `GET /api/ctv/client-journeys`, `GET /api/ctv/me`, `GET /api/ctv/network`, `POST /api/ctv`, `POST /api/ctv/clients`, `POST /api/ctv/bookings`.

Affected data flows:
- Authenticated CTV users are hard-routed to `/ctv`; non-CTV users cannot render the CTV portal.
- `GET /api/ctv/client-journeys` composes self-owned referred clients from both `tdental_smoketest` and `tcosmetic_smoketest` through API code, not cross-DB SQL joins.
- `POST /api/ctv/bookings` writes only to the selected LOB database, creates/updates the referred client claim, writes the Referral Start card, and creates the appointment.
- Booking conflict errors keep `B_CLIENT_CLAIMED` with both camelCase and snake_case owner/expiry fields for UI compatibility.

Roles and setup state:
- CTV user: `ctv-demo@clinic.vn` on NK3 live when available; verify read-only routes first.
- Admin users should be redirected away from `/ctv` or shown the normal admin app rather than the CTV portal.
- TestSprite should avoid creating live clients/bookings unless a disposable phone/name and explicit live-write approval are provided.

Happy paths:
- CTV logs in, lands on `/ctv`, and sees Home, Commission, Tracking, Referrals, and Me bottom tabs.
- Tracking tab loads client journeys with LOB badges, stage progress, and earned/estimated commission values.
- Commission and Referrals tabs still load with existing CTV data.
- `+ Client` booking sheet handles `B_CLIENT_CLAIMED` with a clear already-owned message.

Edge cases:
- No referred clients: Tracking tab shows a useful empty state without crashing.
- Referred client appears in both LOBs: UI deduplicates/merges LOB badges and keeps the highest progress stage.
- CTV has only dental or only cosmetic data: totals and journey cards stay scoped and visible.
- API rows missing optional visit/service/payment fields: cards render without undefined text.

Regressions to check:
- ProtectedRoute still honors both `is_ctv` and `isCtv`.
- CTV users cannot access admin routes such as `/customers`, `/calendar`, or `/commission`.
- Admin Commission CTV tab and referral-claim booking tests still pass.
- NK3 live target stays `https://tmv.2checkin.com` and uses `tdental_smoketest` + `tcosmetic_smoketest`; do not touch legacy `nk.2checkin.com` or `tdental_demo`.

Verification state:
- [x] PASS: `npm --prefix website test -- src/__tests__/ProtectedRoute.ctv.test.tsx src/lib/api/__tests__/ctv.booking.test.ts` passed 2 files / 7 tests.
- [x] PASS: `npx jest --runInBand src/routes/__tests__/ctvBookings.test.js src/services/__tests__/referralClaim.test.js src/services/__tests__/referralCard.test.js src/services/__tests__/commissionEngine.test.js` passed 4 suites / 29 tests.
- [x] PASS: `npm --prefix website run build` produced the 0.32.49 production bundle.
- [x] PASS: `/opt/homebrew/bin/semgrep scan --config p/default --metrics=off --no-git-ignore ...` scanned 19 files with 0 findings.
- [x] PASS: Local `/ctv` screenshot evidence: `website/output/local-verification/nk3-ctv-portal-0.32.49/01-local-ctv-home-mobile.png`, `02-local-ctv-tracking-mobile.png`, `03-local-ctv-tracking-desktop.png`.
- [x] PASS: NK3 live `/ctv` read-only verification on `https://tmv.2checkin.com` after deploy: `/api/ctv/commission-summary`, `/api/ctv/referrals`, `/api/ctv/client-journeys`, and `/api/ctv/me` all returned 200 as `ctv-demo@clinic.vn`; screenshot evidence: `output/live-verification/nk3-ctv-portal-0.32.49-20260525/01-live-ctv-home-mobile.png`, `02-live-ctv-tracking-mobile.png`, `03-live-ctv-tracking-desktop.png`.

# TestSprite Plan: NK3 CTV Cosmetic Employee Location LOB Fix 2026-05-22

Feature/edit name: NK3/CTV Cosmetic LOB employee branch isolation fix.

Changed URLs and API routes:
- Live URL to verify: `https://ctv.2checkin.com/employees`.
- Cosmetic branch lookup must use `GET /api/cosmetic/Companies?offset=0&limit=50`.
- Cosmetic employee create/update must use `POST /api/cosmetic/Employees` and `PUT /api/cosmetic/Employees/:id`.
- Dental employee flows must continue using legacy `GET /api/Companies` and `/api/Employees`.

Affected data flows:
- `EmployeeForm` loads location dropdown choices from the active LOB instead of the default dental pool.
- `EmployeeForm` passes the active LOB into create/update employee API calls.
- `EmployeeProfile` resolves employee branch names from the active LOB so profile display does not map cosmetic employee location IDs through dental branches.

Roles and login state:
- Admin user with `lob_scope` containing both `dental` and `cosmetic`.
- Start on CTV/NK3 live domain, switch to Cosmetic LOB, then open Employees.

Happy paths:
- Cosmetic LOB: click `Thêm nhân viên`; the branch dropdown shows only cosmetic branches such as `Thẩm mỹ Hà Nội` and `Thẩm mỹ Hồ Chí Minh`.
- Cosmetic LOB: creating a test employee sends the save request to `/api/cosmetic/Employees`.
- Dental LOB: add/edit employee still shows Tấm Dentist dental branches and saves to legacy `/api/Employees`.

Edge cases:
- Switching LOBs while on `/employees` must refresh branch choices before opening a new modal.
- Existing cosmetic employee profile branch names must resolve against cosmetic companies.
- Unassigned employees should still support an empty primary branch and optional location scope.

Regressions to prevent:
- Cosmetic employee modal showing dental `Tấm Dentist ...` locations.
- Cosmetic employee create/update writing to the dental partners table.
- Employee profile resolving cosmetic branch IDs as raw IDs or dental branch names.

Setup and execution items:
- [ ] PENDING: Log in at `https://ctv.2checkin.com/login` as an Admin with dental+cosmetic LOB scope.
- [ ] PENDING: Switch to Cosmetic LOB, open `/employees`, click `Thêm nhân viên`, and confirm dropdown contains cosmetic branches only.
- [ ] PENDING: Confirm the browser network log includes `GET /api/cosmetic/Companies?offset=0&limit=50` and does not use plain `/api/Companies` for the open modal state.
- [ ] PENDING: Create or dry-run a safe cosmetic employee save and confirm `POST /api/cosmetic/Employees`.
- [ ] PENDING: Switch back to Dental LOB and confirm dental branch choices still appear for employee add/edit.
- [ ] PENDING: Run `npm test -- --run src/components/employees/__tests__/EmployeeForm.lob.test.tsx src/lib/api/__tests__/employees.lob.test.ts`.

---

# TestSprite Plan: Feature Catalog 2026-05-20
# TestSprite Plan: CTV Referral Flip Card Service Ledger (2026-05-27)

Feature/edit name: CTV Referral Flip Card Service Ledger

Changed URLs and API routes:
- `/ctv` CTV self portal referral tracking page.
- `GET /api/ctv/referrals`
- `GET /api/ctv/commission-summary`
- `GET /api/ctv/me`

Affected data flows:
- CTV portal loads current CTV profile, commission summary, and referred clients from the CTV-only API.
- Referral cards now flip to show all `earnings` service rows tied to the referred client and current CTV.
- Frontend search uses accent-insensitive `normalizeText()` across customer names, phones, and service names.

User roles:
- CTV user with `is_ctv=true`.
- Non-CTV admin/staff must not access `/api/ctv/*`; admin routes must remain blocked for CTV users.

Happy paths:
- Login as a CTV user and land on `/ctv`.
- Search by customer name without Vietnamese accents and keep the correct referral visible.
- Click a referral card and confirm every service row appears with service name, amount, status, LOB pill, and earned date.
- Click back or the card again and confirm the journey progress front returns.

Edge cases:
- Referred client with no services shows the no-service journey state and an empty service back.
- Referred client with multiple services keeps the service list scrollable inside the flipped card.
- Mixed Dental/Cosmetic rows show both LOB labels without merging amounts incorrectly.
- Pending, paid, and reversed service statuses stay readable in Vietnamese and English.

Regressions:
- CTV `/ctv` route bypasses the admin layout, while non-CTV users receive access denied.
- `/ctv` API requests bypass Cosmetic LOB rewriting and remain CTV self-scoped.
- Existing admin pages and Cosmetic `/api/cosmetic/*` routes are unchanged.

Setup data and login state:
- Use a local or staging CTV account with at least one referred client and multiple `earnings` rows in dental and/or cosmetic DBs.
- Keep screenshot evidence for `/ctv` front state and flipped service-list state.

TestSprite execution items:
- [ ] PENDING: `/ctv` loads for a CTV account and redirects/denies non-CTV users.
- [ ] PENDING: Accent-insensitive search finds Vietnamese customer names and service names.
- [ ] PENDING: Clicking a referral card flips to all service rows and returns to the journey front.
- [ ] PENDING: Multi-service and empty-service referrals render without overflow or text overlap on mobile.

---

# TestSprite Plan: TMV Cosmetic Feedback Sweep 2026-05-24

Feature/edit name: TMV Cosmetic Feedback Sweep 2026-05-24

Changed URLs and API routes:
- `https://tmv.2checkin.com/feedback?lob=cosmetic`
- `https://tmv.2checkin.com/permissions?lob=cosmetic`
- `https://tmv.2checkin.com/customers?lob=cosmetic`
- `https://tmv.2checkin.com/employees?lob=cosmetic`
- `https://tmv.2checkin.com/calendar?lob=cosmetic`
- `GET /api/Feedback/all?source=auto&host=tmv.2checkin.com`
- `GET /api/cosmetic/Permissions/groups`
- `GET/PUT /api/cosmetic/Permissions/employees`
- `GET /api/cosmetic/CustomerBalance/:customerId`
- `GET/POST /api/cosmetic/Payments`
- `GET/POST/PUT /api/cosmetic/Partners`
- `GET/POST/PUT /api/cosmetic/Employees`
- `GET/POST/PUT /api/cosmetic/Appointments`

Affected data flows:
- Cosmetic appointment create/edit keeps the active LOB from form submission through appointment hooks.
- Cosmetic customer add/edit, CSKH/sales/branch selectors, employee add/edit, and permission-board calls load and write through Cosmetic mirrors.
- Cosmetic deposits, payment history, wallet top-ups, payment void/delete, and customer balance reads use Cosmetic mirrors.
- Feedback Auto-detected Errors defaults to the current host, while User Feedback remains manual/global.

User roles:
- Admin with both Dental and Cosmetic LOB access.
- Cosmetic staff with customer, calendar, payment, employee, permission, and feedback access according to their role.

Happy paths:
- Open Cosmetic permissions and verify no `GET /Permissions/employees` 404 appears.
- Open Cosmetic employee add/edit and verify branch and permission group dropdowns load.
- Open Cosmetic customer add/edit and verify branch, CSKH, sales, and referrer selectors load from Cosmetic data.
- Create or edit a Cosmetic appointment and verify the request uses `/api/cosmetic/Appointments`.
- Open a Cosmetic customer with deposits and verify `CustomerBalance` returns 200 and the payment modal can see available deposit.
- Open Feedback Auto-detected Errors and verify the first request includes `source=auto&host=tmv.2checkin.com`; toggle All hosts and verify `host` is omitted.

Edge cases:
- Dental-only users must still be blocked from Cosmetic mirrors by the LOB gate.
- Dental mode must continue to use top-level `/api/*` routes.
- Empty/unknown feedback host should preserve all-host auto-error behavior.
- Manual feedback must not disappear when the auto host filter is active.

Regressions:
- Existing Dental appointment, customer, employee, permission, and payment workflows must still pass.
- Cosmetic `/api/cosmetic/CustomerBalance/:id` must remain mounted after deploy.
- Feedback detail, reply, status, delete, unread count, and attachment flows remain unchanged.

Setup data and login state:
- Live TMV: `https://tmv.2checkin.com`.
- Use an admin with Dental + Cosmetic access.
- Keep `?lob=cosmetic` or persisted `tgclinic_lob=cosmetic`.
- Verify against real Cosmetic customers with posted deposits when testing payment modal behavior.

TestSprite execution items:
- [ ] PENDING: Verify Cosmetic permissions page loads employees/groups without 404 and screenshot the page.
- [ ] PENDING: Verify Cosmetic employee add/edit loads branch and permission group dropdowns from Cosmetic routes.
- [ ] PENDING: Verify Cosmetic customer add/edit assignment selectors load from Cosmetic routes.
- [ ] PENDING: Verify Cosmetic appointment create/edit posts to `/api/cosmetic/Appointments`.
- [ ] PENDING: Verify Cosmetic payment modal sees non-zero posted deposit through `/api/cosmetic/CustomerBalance/:id`.
- [ ] PENDING: Verify Feedback Auto-detected Errors current-host and all-host toggles with screenshots.

---

# TestSprite Plan: TMV Feedback Host Hygiene

Feature/edit name: TMV Feedback Host Hygiene

Changed URLs and API routes:
- `https://tmv.2checkin.com/feedback?lob=cosmetic`
- `GET /api/Feedback/all?source=auto&host=tmv.2checkin.com`
- `GET /api/Feedback/all?source=auto`
- `GET /api/Feedback/all?source=manual`

Affected data flows:
- Auto-detected feedback reads remain global feedback data, but the admin queue can now narrow auto-errors to the current browser host using `error_events.metadata.url` or `feedback_threads.page_url`.
- Manual employee feedback remains unfiltered by host and visible from the User Feedback tab.
- The all-host auto-error view remains available for cleanup of stale hosts such as `ctv.2checkin.com`, `nk2.2checkin.com`, `76-13-16-68.sslip.io`, and raw IP origins.

User roles:
- Admin or staff with effective settings feedback/admin access that can open the feedback settings page.

Happy paths:
- Open `https://tmv.2checkin.com/feedback?lob=cosmetic`, switch to Auto-detected Errors, and verify the default request includes `source=auto&host=tmv.2checkin.com`.
- Toggle All hosts and verify the request keeps `source=auto` but omits `host`.
- Switch back to User Feedback and verify manual feedback loads with `source=manual` and no host filter.

Edge cases:
- Hosts submitted with a scheme or path normalize to the hostname before filtering.
- Empty host keeps the old all-host behavior.
- Auto rows without `metadata.url` can still match `feedback_threads.page_url` when that stores a full URL.

Regressions:
- Existing `/api/Feedback/all?source=manual` and `/api/Feedback/all?source=auto` callers still work.
- Feedback detail, reply, status, delete, unread count, and attachment flows remain unchanged.
- Feedback is still not routed through `/api/cosmetic/Feedback`.

Setup data and login state:
- Live TMV: `https://tmv.2checkin.com`.
- Use a logged-in admin with feedback/settings access.
- Keep Cosmetic context via `?lob=cosmetic` only for page context; feedback remains global.

TestSprite execution items:
- [ ] PENDING: Verify Auto-detected Errors defaults to current-host TMV filtering and screenshot the queue count.
- [ ] PENDING: Verify All hosts mode shows stale-host cleanup scope without losing auto-error fields.
- [ ] PENDING: Verify User Feedback still lists manual employee feedback without host filtering.

---

# TestSprite Plan: TMV Cosmetic Feedback Fixes

Feature/edit name: TMV Cosmetic Feedback Fixes

Changed URLs and API routes:
- `https://tmv.2checkin.com/permissions?lob=cosmetic`
- `https://tmv.2checkin.com/customers/:id?lob=cosmetic`
- `GET /api/cosmetic/Permissions/employees`
- `GET/PUT /api/cosmetic/Permissions/employees/:employeeId`
- `GET /api/cosmetic/Permissions/groups`
- `GET /api/cosmetic/Permissions/resolve/:employeeId`
- `POST/PATCH /api/cosmetic/SaleOrders`

Affected data flows:
- PermissionBoard under Cosmetic reads and writes permission assignments through the request-scoped Cosmetic permissions mirror.
- Cosmetic customer add-service submits service records through `/api/cosmetic/SaleOrders`.
- Service save failures stay visible in the modal instead of only logging to the console.

User roles:
- Admin with both Dental and Cosmetic LOB access plus `permissions.view`, `permissions.edit`, `customers.edit`, and `services.view`.
- Cosmetic staff/admin creating staff accounts and customer services.

Happy paths:
- Open Cosmetic `/permissions` and verify employee permission assignments load without a 404.
- Create or edit a Cosmetic employee and verify the permission group selector can load groups/employees.
- Open a Cosmetic customer profile, add a service, and verify the request uses `/api/cosmetic/SaleOrders`.
- If save fails, verify the modal displays the error above the footer and remains open.

Edge cases:
- Dental-only users calling `/api/cosmetic/Permissions/employees` receive the LOB gate, not Dental data.
- Missing `permissions.view` still returns a permission failure.
- A stale/invalid service payload produces a visible submit error instead of a silent no-op.

Regressions:
- Dental `/permissions` still uses top-level `/api/Permissions/*`.
- Dental customer service creation still uses top-level `/api/SaleOrders`.
- Existing Cosmetic customer, source, service, and payment route mirrors remain available.

Setup data and login state:
- Live TMV: `https://tmv.2checkin.com`.
- Use an admin account with both Dental and Cosmetic LOB access.
- Keep `tgclinic_lob=cosmetic` or open with `?lob=cosmetic`.

TestSprite execution items:
- [x] PASS: Reproduced pre-fix live `GET /api/cosmetic/Permissions/employees` 404 from TMV Cosmetic permissions screenshot - direct API returned 404 while top-level `/api/Permissions/employees` returned 200.
- [x] PASS: After deploy, verify Cosmetic permissions page has no `API GET /Permissions/employees failed (404)` and screenshot the page - `output/playwright/tmv-cosmetic-feedback-20260523T1657Z/01-permissions-cosmetic-after.png`; final network audit recorded 0 permission 404s.
- [x] PASS: After deploy, verify `GET /api/cosmetic/Permissions/employees` returns 200 - direct API returned 200 with 103 employee rows.
- [x] PASS: After deploy, verify Cosmetic customer add-service posts to `/api/cosmetic/SaleOrders`; if save fails, visible submit error is shown - Playwright intercepted `POST https://tmv.2checkin.com/api/cosmetic/SaleOrders` and screenshot `output/playwright/tmv-cosmetic-feedback-20260523T1657Z/02-service-save-error-visible-after.png` shows the footer-level error; final network audit recorded 0 Cosmetic feedback/permissions 404s.
- [x] PASS: Local branch `codex/nk3-feedback-fixes` — `permissions.js` migrated from bare `query` to `getQuery(req)`; all 21 DB calls now route through the request-scoped cosmetic pool. Backend `JWT_SECRET=test npx jest --runInBand` passes 662/669 (7 pre-existing failures unrelated to this change). Website `npm run build` passes. `npm run lint` passes (0 errors).

---

# TestSprite Plan: TMV Cosmetic Money Isolation Regression

Feature/edit name: TMV Cosmetic Money Isolation Regression

Changed URLs and API routes:
- `https://tmv.2checkin.com/customers/fcee66e3-0e1b-4527-825d-1fdd171d12ee?lob=cosmetic`
- `GET /api/cosmetic/Partners?search=0989460997`
- `GET /api/cosmetic/CustomerBalance/:id`
- `GET /api/cosmetic/Payments/deposits?customerId=:id`
- `POST /api/cosmetic/Payments/:id/void`
- Control checks against top-level Dental `GET /api/Partners?search=T163752` and `GET /api/CustomerBalance/:id`

Affected data flows:
- Cosmetic customer profile balance reads must come only from `tcosmetic_smoketest.dbo.payments`.
- Cosmetic deposit history must filter by the Cosmetic customer UUID, not by shared phone and not by Dental rows.
- Cross-LOB badge is allowed as a phone-match indicator only; it must not merge Dental money, appointments, services, or profile balances into Cosmetic.
- False Cosmetic deposit `05923eda-0813-481d-9b15-63236f54c84c` for customer `fcee66e3-0e1b-4527-825d-1fdd171d12ee` was backed up and voided, preserving audit history while removing active balance.

User roles:
- Admin with both Dental and Cosmetic LOB access and `payment.view` / `payment.void`.
- Cosmetic staff with customer/payment view permissions should see the corrected 0 đ active deposit balance.

Happy paths:
- Open the Cosmetic customer profile for `thuan le` phone `0989460997` and verify the header shows `Deposit Balance 0 đ`.
- Keep the `also a dental client` badge visible when the cross-view phone probe finds Dental matches.
- Verify `/api/cosmetic/CustomerBalance/fcee66e3-0e1b-4527-825d-1fdd171d12ee` returns `deposit_balance: 0`.
- Verify `/api/cosmetic/Payments/deposits?customerId=fcee66e3-0e1b-4527-825d-1fdd171d12ee` returns only rows for that Cosmetic customer and no posted active deposits.

Edge cases:
- A Dental-only customer UUID must return 404 under `/api/cosmetic/CustomerBalance/:id`.
- A Dental ref such as `T163752` must be absent from `/api/cosmetic/Partners` while still present in top-level Dental `/api/Partners`.
- Voided Cosmetic deposit rows may remain visible for audit, but must not contribute to active deposit balance.
- Same phone in both LOBs must not be treated as a shared financial identity.

Regressions:
- Dental mode must still show the Dental customer rows and balances through top-level `/api/*`.
- Cosmetic pages must not fire top-level `/api/Partners`, `/api/CustomerBalance`, `/api/Payments`, `/api/Appointments`, `/api/Products`, `/api/Employees`, `/api/Reports`, `/api/settings`, or `/api/face` calls while Cosmetic is selected.
- Existing Cosmetic customer, appointment, service, employee, report, source, bank, face, HSO, and export mirrors must remain available.

Setup data and login state:
- Live TMV: `https://tmv.2checkin.com`.
- Cosmetic customer: `fcee66e3-0e1b-4527-825d-1fdd171d12ee`, name `thuan le`, phone `0989460997`.
- Voided false deposit: `05923eda-0813-481d-9b15-63236f54c84c`, amount `1,000,000`, now `status='voided'`.
- Live backup before correction: `/var/backups/tgroup-nk3/tmv-cosmetic-false-deposit-20260523T105515Z/`.
- Evidence artifacts: `output/playwright/tmv-cosmetic-lob-isolation-20260523T1055Z/`.

TestSprite execution items:
- [x] PASS: Verify false Cosmetic deposit row was backed up before correction - `/var/backups/tgroup-nk3/tmv-cosmetic-false-deposit-20260523T105515Z/payment-before.tsv` and `customer-before.tsv`.
- [x] PASS: Verify Cosmetic false deposit was voided through `/api/cosmetic/Payments/:id/void` - API response returned `voidSuccess=true`, `beforeBalance=1000000`, `afterBalance=0`.
- [x] PASS: Verify Cosmetic customer profile browser screenshot shows `Deposit Balance 0 đ` - `output/playwright/tmv-cosmetic-lob-isolation-20260523T1055Z/01-thuan-le-cosmetic-balance-zero.png`.
- [x] PASS: Verify live browser network on the profile had no bad top-level Dental data calls - `browser-profile-network.json` recorded 19 API calls, 16 Cosmetic calls, 0 bad top-level calls, 0 errors.
- [x] PASS: Verify live API LOB isolation checks - `cosmetic-lob-isolation-api.json` recorded 15 checks and 0 failures.
- [x] PASS: Verify Cosmetic DB integrity checks for payments/appointments/saleorders/dotkhams missing Cosmetic customers and active `thuan le` deposits - `cosmetic-lob-isolation-db.tsv` recorded all zero counts.

---

# TestSprite Plan: TMV Cosmetic LOB Redo

Feature/edit name: TMV Cosmetic LOB Redo

Changed URLs and API routes:
- `https://tmv.2checkin.com`
- Cosmetic-mode `/dashboard`
- Cosmetic-mode `/customers` and `/customers/:id`
- Cosmetic-mode `/calendar`
- Cosmetic-mode `/payment`
- Cosmetic-mode `/services`
- Cosmetic-mode `/service-catalog`
- Cosmetic-mode `/employees`
- Cosmetic-mode `/reports/revenue`
- `GET/POST/PUT /api/cosmetic/Partners`
- `GET/POST/PUT /api/cosmetic/Appointments`
- `GET/POST/PATCH/DELETE /api/cosmetic/Payments`
- `GET/POST/PUT/PATCH /api/cosmetic/Products`
- `GET/POST/PATCH /api/cosmetic/Employees`
- `GET/POST/PUT/DELETE /api/cosmetic/CustomerSources`
- `GET /api/cosmetic/DotKhams`
- `GET/PUT /api/cosmetic/settings/bank`
- `GET/POST /api/cosmetic/ExternalCheckups`
- `POST /api/cosmetic/face/recognize`, `POST /api/cosmetic/face/register`, `POST /api/cosmetic/face/re-register`, `GET /api/cosmetic/face/status/:id`
- `GET /api/cosmetic/Exports/*`

Affected data flows:
- Business Unit selection initializes from `?lob=cosmetic` or persisted `tgclinic_lob=cosmetic` before customer, appointment, employee, service, payment, report, and dashboard data hooks fire.
- Customer add/edit, assignment searches, uniqueness checks, face-ID rescue searches, profile reads, service actions, monthly plans, DotKham history, HSO/checkups, customer sources, and bank settings pass the active Cosmetic LOB to API clients.
- Cosmetic mirror routes now include customer sources, DotKhams, bank settings, external checkups, face-ID, and exports so Cosmetic callers do not hit dental/global endpoints.

User roles:
- Admin with both Dental and Cosmetic LOB access, including `kien@clinic.vn` after the live DB permission repair.
- Cosmetic staff/admin users with `cosmetic.access` and the relevant workflow permissions.

Happy paths:
- Open `https://tmv.2checkin.com/?lob=cosmetic` and confirm the first dashboard/customer/calendar/payment/service/employee/report data requests use `/api/cosmetic/*`.
- Add and edit a Cosmetic customer, including CSKH/sales assignment searches and uniqueness checks.
- Add and edit a Cosmetic appointment for a Cosmetic customer.
- Add a Cosmetic payment/deposit and confirm reload/balance routes stay Cosmetic.
- Add/edit Cosmetic service catalog records and sale-order/service lines.
- Use Face ID rescue/register flows in Cosmetic mode without calling top-level `/api/face` or top-level `/api/Partners`.
- Load customer sources, bank settings, DotKham/medical-history tooltip, HSO/checkup gallery/upload, and exports through Cosmetic mirrors.

Edge cases:
- Persisted `tgclinic_lob=cosmetic` must beat the default Dental value on first render.
- `?lob=cosmetic` must deep-link into Cosmetic mode without a first-render Dental fetch.
- Switching back to Dental must keep legacy top-level `/api/*` behavior.
- Non-admin or single-LOB staff must not get unauthorized Cosmetic switching from localStorage/query attempts.
- Cosmetic customer searches must remain accent-insensitive.

Regressions:
- Dental mode must still use top-level `/api/*` and Dental data.
- CTV routes must remain CTV-only; admin `GET /api/ctv/me` should stay forbidden.
- Revenue must still exclude deposits/refunds/usage/voids while including direct posted service payments.
- Payment/customer balance and sale-order-line changes must not double-count allocations.

Setup data and login state:
- Use live TMV: `https://tmv.2checkin.com`.
- Use an admin with both LOBs (`t@clinic.vn` verified for full browser/API sweep; `kien@clinic.vn` live DB row now has `{dental,cosmetic}` but still needs the real password for browser login proof).
- Keep `COSMETIC_LOB_ENABLED=true` and `VITE_COSMETIC_LOB_ENABLED=true`.
- Preserve screenshot evidence for every browser-visible checked page under `output/playwright/`.

TestSprite execution items:
- [x] PASS: Verify Cosmetic first-render request audit has zero top-level `/api/Employees`, `/api/Appointments`, `/api/Partners`, `/api/Payments`, `/api/Products`, `/api/face`, or `/api/settings` calls after selecting/persisting Cosmetic - live browser artifact `output/playwright/tmv-cosmetic-after-deploy-20260523T1033Z/cosmetic-browser-after-deploy-results.json` recorded 50 `/api/cosmetic/*` calls and 0 bad top-level data calls.
- [x] PASS: Verify Cosmetic dashboard screenshot on `https://tmv.2checkin.com/?lob=cosmetic` - `output/playwright/tmv-cosmetic-after-deploy-20260523T1033Z/01-cosmetic-dashboard.png`.
- [x] PASS: Verify Cosmetic customers add/edit and customer-list screenshot - API mutation artifact created/edited customer `47b6d6d0-ce04-4723-8dcf-688639944c64`; screenshots `02-cosmetic-customers.png` and `09-cosmetic-created-customer.png`.
- [x] PASS: Verify Cosmetic appointment add/edit and calendar screenshot - API mutation artifact created/edited appointment `ef1fdadf-cff3-4e30-b2a4-905351eb9808`; screenshot `03-cosmetic-calendar.png`.
- [x] PASS: Verify Cosmetic payment/deposit add/reload and payment screenshot - API mutation artifact created deposit `ebda1ef8-adaf-4e42-bdb3-5c8847de2df0`, reloaded payments/deposits/balance; screenshot `04-cosmetic-payment.png`.
- [x] PASS: Verify Cosmetic service/service-catalog add/edit and screenshots - API mutation artifact created/edited service `5144f944-a4ab-49b6-a22d-f3cb721eb154`; screenshots `05-cosmetic-services.png` and `06-cosmetic-service-catalog.png`.
- [x] PASS: Verify Cosmetic employees list/add/edit and employee screenshot - API mutation artifact created/edited employee `e3550ab6-6886-4b0c-9250-20baa753b185`; screenshot `07-cosmetic-employees.png`.
- [x] PASS: Verify Cosmetic revenue report screenshot and revenue paid/deposit exclusion behavior - `/api/cosmetic/Reports/revenue/summary` returned 200 in artifact `cosmetic-api-after-deploy-results.json`; screenshot `08-cosmetic-reports-revenue.png`.
- [x] PASS: Verify Cosmetic support mirrors for customer sources, DotKhams, bank settings, HSO/checkups, face-ID, and exports return non-5xx and stay LOB-scoped - artifact `cosmetic-api-after-deploy-results.json` covered `/api/cosmetic/CustomerSources`, `/DotKhams`, `/settings/bank`, `/ExternalCheckups`, `/face/status`, and `/Exports/types` with no failures.
- [x] PASS: Verify Dental mode still uses Dental/top-level routes after switching back - API artifact confirmed the Cosmetic-created customer is absent from top-level Dental `/api/Partners/:id` with 404, preserving DB separation.

---

# TestSprite Plan: NK3 Cosmetic LOB Feedback Fixes

Feature/edit name: NK3 Cosmetic LOB Feedback Fixes

Changed URLs and API routes:
- `https://76-13-16-68.sslip.io/reports/revenue`
- `https://76-13-16-68.sslip.io/feedback` (source of triage only; no feedback code changed)
- Cosmetic-mode `/employees`
- Cosmetic-mode `/calendar` and appointment create/edit surfaces
- Cosmetic-mode `/customers` and `/customers/:id`
- Cosmetic-mode `/payment` and customer deposit/payment panels
- `GET/POST/PUT /api/cosmetic/Partners`
- `GET/POST/PUT /api/cosmetic/Appointments`
- `GET/POST/PATCH/DELETE /api/cosmetic/Employees`
- `GET/POST/PATCH/DELETE /api/cosmetic/Payments`
- `GET /api/cosmetic/Payments/deposits`
- `GET /api/cosmetic/Payments/deposit-usage`
- `GET /api/cosmetic/CustomerBalance/:id`
- `GET /api/cosmetic/SaleOrderLines`
- `POST /api/cosmetic/Reports/revenue/summary`
- `POST /api/cosmetic/Reports/revenue/trend`
- `POST /api/cosmetic/Reports/revenue/by-location`
- API CORS allowlist for `https://76-13-16-68.sslip.io`
- `Dockerfile.web` Vite build args for `VITE_COSMETIC_LOB_ENABLED`

Affected data flows:
- Cosmetic UI create/update/read hooks now pass the active `currentLOB` to API clients so `apiFetch` uses `/api/cosmetic/*` mirror routes.
- Employee form branch list and employee save use cosmetic `companies` and `partners` rows instead of dental rows.
- Customer create/update and customer selectors use cosmetic partners and cosmetic companies, preventing dental FK validation against cosmetic company IDs.
- Customer form company, employee assignment, and referrer selectors pass the active Cosmetic LOB to `fetchCompanies`, `fetchEmployees`, `fetchPartners`, and selected-referrer lookup calls.
- Appointment create/update uses cosmetic appointments and cosmetic partners, preventing `Partner with given partnerId does not exist` when the selected customer exists only in `tcosmetic_demo`.
- Cosmetic deposit list, usage history, customer balance, customer profile, and payment mutations use the cosmetic mirror so deposit history and summary cards read the same DB.
- Revenue summary, trend, and by-location include posted direct `payment_category = 'payment'` receipts with no allocation rows, including imported cosmetic receipts whose `service_id` is blank; by-location shows an unassigned row for paid receipts with no company, while excluding deposits, refunds, deposit usage, and voided payments.

User roles:
- Admin with both Dental and Cosmetic LOB access.
- Cosmetic staff/admin users with `cosmetic.access`, relevant customer/appointment/employee/payment/report permissions, and Cosmetic selected in the business-unit selector.

Happy paths:
- In Cosmetic mode, `/employees` branch dropdown lists cosmetic branches only, and creating/updating an employee posts to `/api/cosmetic/Employees`.
- In Cosmetic mode, creating/updating an appointment with a cosmetic customer succeeds through `/api/cosmetic/Appointments`.
- In Cosmetic mode, creating/updating a customer with a cosmetic branch succeeds through `/api/cosmetic/Partners`.
- In Cosmetic mode, adding a customer deposit shows the row in deposit history and updates summary cards through `/api/cosmetic/CustomerBalance/:id`.
- On `/reports/revenue` in Cosmetic mode, `Tổng đã thu`, trend, and location cards include posted direct payment-category service receipts even when imported rows have no `service_id` or company assignment yet.

Edge cases:
- Deposit-category wallet/customer advances without `service_id` must not be counted as revenue and must remain in deposit/cash-flow reporting.
- Deposits, refunds, deposit usage, and voided payments must remain excluded from revenue paid totals.
- Switching between Dental and Cosmetic must not leave stale dental customer, employee, sale-order-line, payment, or balance data in cosmetic screens.
- Cosmetic customer selectors must remain accent-insensitive for Vietnamese names.

Regressions:
- Dental routes must continue using legacy `/api/*` paths when the active LOB is Dental.
- Existing payment allocation revenue must still use capped allocation math and not double-count direct receipts that already have payment allocations.
- Customer profile service/payment tabs should keep loading after the LOB-aware sale-order-line and balance changes.
- `website/package.json` version is bumped to `0.32.35-cosmetic-lob`.

Setup data and login state:
- Use NK3: `https://76-13-16-68.sslip.io`.
- Log in with an admin/staff account that can select Cosmetic LOB.
- Use a cosmetic branch, cosmetic customer, cosmetic employee, a posted direct `payment_category = 'payment'` receipt with no allocation row, and a deposit-category advance row.
- Keep `COSMETIC_LOB_ENABLED=true` and verify the cosmetic mirror API is mounted.
- Verify browser-origin API calls from `https://76-13-16-68.sslip.io` do not fail CORS.
- Verify the deployed web bundle has `VITE_COSMETIC_LOB_ENABLED=true` so the Business Unit selector can enter Cosmetic mode.

TestSprite execution items:
- [ ] PENDING: Verify Cosmetic `/employees` lists cosmetic branches and employee create/update does not show dental branches or save to dental.
- [ ] PENDING: Verify Cosmetic customer add/edit branch, sales staff, CSKH, and referrer selectors request Cosmetic companies/employees/customers and never show Dental-only selector rows.
- [ ] PENDING: Verify Cosmetic appointment create/update succeeds with a cosmetic-only customer and does not return `Partner with given partnerId does not exist`.
- [ ] PENDING: Verify Cosmetic customer create/update succeeds with a cosmetic company ID and does not hit the dental companies FK.
- [ ] PENDING: Verify Cosmetic deposit add/reload shows the deposit row and updates summary cards through `/api/cosmetic/CustomerBalance/:id`.
- [ ] PENDING: Verify Cosmetic `/reports/revenue` `Tổng đã thu`, trend, and by-location totals include direct posted payment-category receipts with no allocation row, including rows whose `service_id` or company assignment is blank.
- [ ] PENDING: Verify deposit-category advances, refunds, deposit usage, and voided payments are excluded from revenue.
- [ ] PENDING: Verify live NK3 browser requests from `https://76-13-16-68.sslip.io` do not trigger CORS failures.
- [ ] PENDING: Verify live NK3 Docker web build forwards `VITE_COSMETIC_LOB_ENABLED=true` and does not compile the Cosmetic selector as disabled.
- [ ] PENDING: Verify Dental mode still uses dental data for customers, employees, appointments, payments, customer balance, sale-order lines, and revenue.

---

# TestSprite Plan: NK2 Responsive Population Audit

Feature/edit name: NK2 Responsive Population Audit

Changed URLs and API routes:
- Full NK2 route sweep across authenticated app pages.
- No API routes changed by this QA pass.

Affected data flows:
- Authenticated page hydration from NK2 staging APIs.
- Route-level list/detail/report data population across phone, tablet, and desktop viewport classes.
- Browser console, network, overflow, and empty-state detection for visible app surfaces.

User roles:
- Authenticated NK2 admin/staff session used for broad route access.

Happy paths:
- Verify each primary route loads populated content or an intentional empty state on iPhone, iPad, and desktop widths.
- Verify core navigation remains reachable on each device family.
- Verify responsive wrapping prevents controls, filters, tabs, and action buttons from clipping offscreen.

Edge cases:
- Long Vietnamese labels, dense data tables, report tabs, modals, and side navigation must not overlap at iPhone or iPad widths.
- Pages with low or missing data must show deliberate empty/loading/error states rather than blank panels.
- API failures or unauthorized responses must not leave a false "populated" page.

Regressions:
- `/calendar` iPad toolbar wrapping must remain fixed while the broader app sweep runs.
- Desktop layouts must not degrade while mobile/tablet wrapping is corrected.
- Report/dashboard/customer/payment/service pages should not introduce page-level horizontal overflow.

Setup data and login state:
- Use NK2 staging: `https://nk2.2checkin.com`.
- Use an authenticated admin/staff session with access to the main navigation.
- Collect screenshot evidence for every checked device family and every failure.

TestSprite execution items:
- [x] PASS: Sweep iPhone representative widths across all primary authenticated routes for population, console errors, and horizontal overflow - 92 checks completed under `reports/responsive-qa/iphone`; no blank/unpopulated pages, console errors, failed network requests, or true page-wide overflow.
- [x] PASS: Sweep iPad portrait/landscape representative widths across all primary authenticated routes for population, console errors, and horizontal overflow - 92 checks completed under `reports/responsive-qa/ipad`; `/feedback` visible "Auto-detected Errors" was confirmed as a tab label, not a runtime error.
- [x] PASS: Sweep desktop representative widths across all primary authenticated routes for population, console errors, and horizontal overflow - 92 checks completed under `reports/responsive-qa/desktop`; true layout blockers isolated to `/calendar` toolbar controls and `/employees` edit action visibility.
- [x] PASS: Record all failed routes with screenshot path, viewport, visible symptom, and suspected data/UI category - consolidated in `reports/responsive-qa/desktop/report.md`, `reports/responsive-qa/ipad/report.md`, and `reports/responsive-qa/iphone/report.md`.
- [x] PASS: Recheck `/calendar` at 1280x720 and 1366x768 after the 0.32.32 toolbar breakpoint fix; export, filter, and quick-add controls are visible - evidence: `output/playwright/responsive-qa/fixed/laptop-1280x720__calendar__after-0.32.32.png`, `output/playwright/responsive-qa/fixed/laptop-1366x768__calendar__after-0.32.32.png`.
- [x] PASS: Recheck `/employees` at 1280x720, 1366x768, and 1440x900 after the 0.32.32 sticky action/table text fix; edit action is visible and long location text is truncated - evidence: `output/playwright/responsive-qa/fixed/laptop-1280x720__employees__after-0.32.32.png`, `output/playwright/responsive-qa/fixed/laptop-1366x768__employees__after-0.32.32.png`, `output/playwright/responsive-qa/fixed/desktop-1440x900__employees__after-0.32.32.png`.

---

# TestSprite Plan: Calendar iPad Toolbar Wrapping

Feature/edit name: Calendar iPad Toolbar Wrapping

Changed URLs and API routes:
- `/calendar`
- No API routes changed.

Affected data flows:
- Calendar appointment data still loads through `GET /api/Appointments` with calendar-mode pagination.
- The responsive toolbar layout now wraps at tablet widths instead of forcing one row, so view mode tabs, date navigation, search, export, filters, and quick-add remain visible while appointment cards populate below.
- No appointment DTO, status, export, or mutation payload changed.

User roles:
- Admin and staff with `appointments.view`.
- Staff with `appointments.add`, `appointments.edit`, or `appointments.export` should see the same controls without clipping when those permissions are granted.

Happy paths:
- Open `/calendar` at iPad landscape width (`1024x768`) and verify Ngày/Tuần/Tháng, date navigation, search, export, filter, and quick-add controls are all visible and non-overlapping.
- Verify day-view appointment cards populate below the toolbar with the expected count for the selected day.
- Switch between day, week, and month at tablet width and confirm controls stay reachable.

Edge cases:
- Long Vietnamese date labels such as `Thứ Hai, 18 tháng 5, 2026` must not overlap the view tabs.
- Permission combinations that hide export or quick-add should not leave awkward empty toolbar space.
- Search suggestions should still open below the search input after the toolbar wraps.

Regressions:
- Desktop wide layout should still use a single-row toolbar.
- Mobile and narrow tablet layouts should keep controls wrapped instead of introducing horizontal page overflow.
- Export date-range modal, smart filter drawer, and quick-add appointment modal should still open from `/calendar`.

Setup data and login state:
- Use an authenticated local or NK2 admin session.
- Use a calendar day with multiple appointments, such as `2026-05-18` in local seeded data.

TestSprite execution items:
- [ ] PENDING: Verify `/calendar` at `1024x768` shows all toolbar controls without overlap or right-edge clipping.
- [ ] PENDING: Verify day-view appointment cards populate below the toolbar after calendar data finishes loading.
- [ ] PENDING: Verify day/week/month switching at tablet width keeps the toolbar wrapped and reachable.
- [ ] PENDING: Verify search, export menu, filter drawer, and quick-add controls still open from the wrapped tablet toolbar.
- [ ] PENDING: Verify wide desktop keeps the single-row toolbar with no visual regression.

---

# TestSprite Plan: Payment Method Contract Alignment

Feature/edit name: Payment Method Contract Alignment

Changed URLs and API routes:
- `/payment`
- `/customers/:id` payment/deposit surfaces
- `GET /api/Payments`
- `GET /api/Payments/:id`
- `POST /api/Payments`
- `PATCH /api/Payments/:id`
- `POST /api/Payments/:id/proof`
- No new API routes added.

Affected data flows:
- Frontend deposit/payment display labels now align with the live payment contract methods: `cash`, `bank_transfer`, `deposit`, and `mixed`.
- `contracts/dist` is rebuilt from `contracts/payment.ts`, so package consumers no longer see stale card/e-wallet enum values.
- VietQR remains a frontend entry alias that sends `bank_transfer` to the backend; it is not stored as a separate payment method.

User roles:
- Admin or payment staff with `payment.view` and `payment.add`.
- Customer-profile staff using deposit history and payment tabs.

Happy paths:
- Open `/payment` and verify existing cash, bank-transfer, deposit, and mixed payment rows display readable method labels.
- Open a customer profile payment/deposit surface and verify deposit history displays `bank_transfer` as a bank-transfer label, not the raw key.
- Create or edit a payment using cash/bank/deposit/mixed flows and confirm the backend receives only live method codes.

Edge cases:
- Legacy rows with unknown method strings should fall back to the raw method string instead of crashing.
- VietQR top-up flows should still map to `bank_transfer`.
- English and Vietnamese payment labels should both have `bank_transfer` and `deposit` keys.

Regressions:
- Payment history, deposit history, refunds, void/delete actions, payment proof uploads, and report/export payment-method grouping still work.
- No card/e-wallet methods should appear as accepted live payment methods in contracts, docs, or payment UI labels.

Setup data and login state:
- Use an authenticated admin/staff session with payment permissions.
- Use any customer with deposit/payment rows containing cash, bank transfer, deposit usage, or mixed payments.

TestSprite execution items:
- [ ] PENDING: Verify `/payment` renders live payment method labels without card/e-wallet options.
- [ ] PENDING: Verify `/customers/:id` deposit history renders `bank_transfer` and `deposit` labels in English and Vietnamese locales.
- [ ] PENDING: Verify VietQR top-up still posts `bank_transfer` to `POST /api/Payments`.
- [ ] PENDING: Verify `contracts/dist/payment.d.ts` and `contracts/payment.ts` expose the same live method enum.

---

# TestSprite Plan: Documentation Traceability And Governance Sync

Feature/edit name: Documentation Traceability And Governance Sync

Changed URLs and API routes:
- No user-facing URLs changed.
- No runtime API behavior changed.
- Documentation coverage updated for `/api/Partners/resolve`, `/api/Feedback/unread-count`, `/api/IpAccess/*`, `/api/DotKhams`, `POST /api/Exports/:type/preview`, `POST /api/Exports/:type/download`, `/api/Reports/*`, `GET /api/SaleOrders/lines`, `PATCH /api/SaleOrders/:id`, `DELETE /api/SaleOrderLines/:id`, `PATCH /api/Payments/:id`, and `POST /api/Payments/:id/proof`.

Affected data flows:
- Feature work should now be traceable across use case, workflow, contract, data model, product-map domain, permission registry, and test matrix entries.
- Deployment docs use `api/migrations/` as the canonical migration path and mark `api/src/db/migrations/` as supplemental stragglers needing explicit review.
- `scripts/verify-docs.sh` now enforces docs, changelog, and TestSprite ledger updates for contract/schema/API/frontend/backend-data-flow changes.
- Local `.husky/pre-commit`, root `npm run verify:docs` / `npm run verify:governance`, and PR checks now run the governance gate so future changes cannot rely on optional manual memory.
- Authority docs no longer embed generated memory blocks, and `scripts/sync-claude-mem.sh` strips accidental generated-memory blocks from `AGENTS.md` while keeping the real memory mirror in `.claude/memory.md`.

User roles:
- Architecture and product agents checking feature blast radius before implementation.
- Frontend, backend, data, QA, and release agents using the authority stack.
- TestSprite verification agent reading this ledger after a feature/edit.

Happy paths:
- Pick a report/export feature and confirm the route appears in `docs/CONTRACTS.md`, `product-map/contracts/api-index.md`, `docs/USE-CASES.md`, `docs/WORKFLOWS.md`, and a test matrix entry.
- Run `bash scripts/verify-docs.sh` with the current diff and confirm it passes when docs, changelog, and `testbright.md` are present.
- Check `docs/RUNBOOK.md` and `docs/runbooks/DEPLOYMENT.md`; both should point canonical VPS migration application to `/opt/tgroup/api/migrations/*.sql`.

Edge cases:
- Docs-only governance edits still require `docs/CHANGELOG.md`.
- Frontend, feature, contract, product-map, and backend data-flow edits require `testbright.md`.
- Supplemental migrations under `api/src/db/migrations/` must not be silently assumed to run with the canonical migration loop.
- Authority docs must not contain `<claude-mem-context>` blocks.

Regressions:
- Existing Revenue Report Excel Reconciliation TestSprite plan remains intact.
- Existing production database backup, Hosoonline, Face ID, export, and search TestSprite plans remain intact.
- Runtime behavior, API responses, and website routes should not change from this docs/governance sync alone.

Setup data and login state:
- No login state required for docs/script verification.
- Use repository root `/Users/thuanle/Documents/TamTMV/Tgrouptest`.

TestSprite execution items:
- [x] PASS 2026-05-17: `bash scripts/verify-docs.sh` passes through `npm run verify:governance` with this synchronized docs/changelog/testbright diff.
- [x] PASS 2026-05-17: `.husky/pre-commit` runs `bash scripts/verify-docs.sh` before website version checks.
- [x] PASS 2026-05-17: `.github/workflows/pr-checks.yml` includes a `doc-governance` job that runs documentation governance against the PR base SHA.
- [x] PASS 2026-05-17: `npm run verify:governance` runs the docs gate plus whitespace diff checks.
- [x] PASS 2026-05-17: Generated-memory marker grep returns no matches outside `docs/runbooks/VERIFICATION.md`.
- [x] PASS 2026-05-17: `bash scripts/sync-claude-mem.sh` does not leave generated-memory markers in `AGENTS.md`.
- [ ] PENDING: Verify `docs/RUNBOOK.md` and `docs/runbooks/DEPLOYMENT.md` both use `/opt/tgroup/api/migrations/*.sql` as the canonical deploy loop.
- [ ] PENDING: Verify `docs/DATA-MODEL.md` and `docs/MIGRATIONS.md` document 53 canonical root migrations and 2 supplemental migrations.
- [ ] PENDING: Verify payment methods in docs/contracts are `cash`, `bank_transfer`, `deposit`, and `mixed`, with no unsupported card/e-wallet methods described as live.
- [ ] PENDING: Verify key live routes above are represented in `docs/CONTRACTS.md` and `product-map/contracts/api-index.md`.

---

# TestSprite Plan: Prompt-Level Authority Gate

Feature/edit name: Prompt-Level Authority Gate

Changed URLs and API routes:
- No user-facing URLs changed.
- No runtime API routes changed.

Affected data flows:
- Each new agent prompt in Claude-compatible local tooling now runs `scripts/prompt-authority-check.sh` through `.claude/settings.json` `UserPromptSubmit`.
- The prompt gate verifies core authority files exist, strips accidental generated-memory blocks from `AGENTS.md`, checks that generated memory markers did not leak into other authority docs, and prints prompt-matched docs/domains for agents to read before edits.
- Root `npm run verify:prompt` provides the manual fallback for agents/tools that do not execute `.claude/settings.json` prompt hooks.
- Root `npm run verify:governance` now includes the prompt authority gate before doc-update and whitespace checks.

User roles:
- Architecture, product, frontend, backend, data, QA, and release agents starting or continuing project work.
- TestSprite verification agent checking that prompt-start governance is visible before implementation.

Happy paths:
- Submit a prompt mentioning payments/revenue and verify the prompt gate points to money-flow, invariants, payment domain, and payment-allocation docs.
- Submit a prompt mentioning frontend UI and verify the prompt gate points to `website/agents.md`, `website/design.md`, behavior/use-case/workflow/test docs, and `testbright.md`.
- Run `npm run verify:prompt` from the repository root and verify it passes without stdin.

Edge cases:
- If authority docs are missing, the prompt gate must fail before work starts.
- If generated memory markers leak into non-`AGENTS.md` authority docs, the prompt gate must fail and print the matching file/line.
- If generated memory markers are appended to `AGENTS.md`, the prompt gate should strip them before checking so the next prompt is not blocked by memory-tool output.
- If the active agent does not support `UserPromptSubmit`, the fallback is manual `npm run verify:prompt` at prompt start.

Regressions:
- Existing commit/PR documentation governance must still run after the prompt gate.
- The hook output must stay compact enough that prompt checking does not become token-heavy.
- Runtime app behavior should not change from this governance hook.

Setup data and login state:
- No app login required.
- Use repository root `/Users/thuanle/Documents/TamTMV/Tgrouptest`.

TestSprite execution items:
- [x] PASS 2026-05-17: `npm run verify:prompt` passes with no stdin and prints the compact authority reminder.
- [x] PASS 2026-05-17: Payment/revenue prompt text surfaces money-flow, invariants, payment domain, payment allocation, reports, and test matrix docs.
- [x] PASS 2026-05-17: Frontend prompt text surfaces website frontend/design docs, behavior, use-case, workflow, test matrix, and `testbright.md`.
- [x] PASS 2026-05-17: `.claude/settings.json` contains a `UserPromptSubmit` hook that runs `bash scripts/prompt-authority-check.sh`.
- [x] PASS 2026-05-17: `package.json` `verify:governance` runs the prompt authority gate before docs and whitespace checks.
- [x] PASS 2026-05-18: Prompt gate stripped an accidental `<claude-mem-context>` block from `AGENTS.md`, then `npm run verify:prompt` passed and marker grep returned clean.

---

# TestSprite Plan: Revenue Report Excel Reconciliation

Feature/edit name: Revenue Report Excel Reconciliation

Changed URLs and API routes:
- `/reports/revenue`
- `POST /api/Reports/revenue/summary`
- `POST /api/Reports/revenue/by-location`
- `POST /api/Exports/revenue-flat/preview`
- `POST /api/Exports/revenue-flat/download`
- `POST /api/Exports/report-sales-employees/preview`
- `POST /api/Exports/report-sales-employees/download`

Affected data flows:
- Revenue page `Tổng đã thu` uses posted payment-method totals from `/api/Reports/revenue/summary`, matching the revenue-flat Excel collected total.
- `/api/Reports/revenue/summary` keeps paid-only sale-order states instead of dropping payments whose sale order was created outside the selected report date.
- Employee revenue Excel applies the same posted allocation, deposit/refund/usage exclusion rules as revenue-flat.
- Branch revenue breakdown now honors the selected branch filter; all-location remains all branches.
- Cash-flow cards still show raw cash movement and should not be used as the Excel paid-revenue comparison.

User roles:
- Admin or manager with `reports.view`.
- Staff with `payments.export` for `revenue-flat` export.
- Staff with `reports.export` for employee revenue export.
- Scoped branch manager with assigned-location reporting access.

Happy paths:
- On `/reports/revenue`, select `2026-05-16` to `2026-05-16` and all locations; `Tổng đã thu` should equal `revenue-flat` preview `Tổng tiền` and downloaded workbook column `Số tiền`.
- Select a specific branch; revenue summary, revenue by branch, and revenue-flat preview should all use the same branch scope.
- Preview and download `Báo cáo doanh thu theo nhân viên`; deposits, refunds, deposit usage, and voided payments must not appear in employee revenue totals.

Edge cases:
- Payments collected in the selected date range for sale orders created before the selected date must still count in `Tổng đã thu`.
- A branch/date range with paid revenue but no new sale orders should still show collected revenue.
- `companyId: "all"` from any report caller should behave like no branch filter in frontend report payloads.
- Deposit top-ups and internal deposit usage remain visible only in cash-flow or deposit reports, not recognized paid revenue.

Regressions:
- Existing revenue trend, payment method donut, doctor/category breakdowns, and export preview modal still render.
- `Báo cáo doanh thu` workbook columns and filename stay unchanged.
- Existing cash-flow summary still separates money in, money out, net cash flow, and internal deposit usage.

Setup data and login state:
- Use an authenticated NK2 or local admin session with report/export permissions.
- For live reproduction, NK2 evidence used all-location filter `{ "dateFrom": "2026-05-16", "dateTo": "2026-05-16" }`.
- Download workbook and sum column `Số tiền`; do not compare dashboard `Tổng đã thu` to workbook `Tổng tiền phiếu`.

TestSprite execution items:
- [x] PRE-DEPLOY FAIL 2026-05-18: Live NK2 `/reports/revenue` for `2026-05-16` all locations still showed `Tổng đã thu` around `318.537.157 ₫`, while the posted-payment report API total was `533.697.000 ₫`; screenshot proof: `output/playwright/2026-05-18T04-48-03-856Z-feedback-06892fc6-revenue-total-fixed.png`.
- [x] PASS 2026-05-18: After NK2 web-only deploy to `v0.32.24`, `/reports/revenue` for `2026-05-16` all locations shows `Tổng đã thu 533.697.000 ₫`, matching `POST /api/Reports/revenue/summary` posted-payment total; proof screenshots: `output/playwright/2026-05-18T04-55-02-553Z-feedback-06892fc6-revenue-total-resolved-stable.png` and `output/playwright/2026-05-18T04-57-35-499Z-feedback-06892fc6-status-resolved-via-page.png`.
- [ ] PENDING: Verify `/reports/revenue` `Tổng đã thu` equals `POST /api/Exports/revenue-flat/preview` summary `Tổng tiền` for the same date/branch filters.
- [ ] PENDING: Verify downloaded `Báo cáo doanh thu` workbook column `Số tiền` equals the page `Tổng đã thu`.
- [ ] PENDING: Verify paid revenue from old sale orders inside the payment date range is not dropped from `Tổng đã thu`.
- [ ] PENDING: Verify selecting a branch scopes summary, branch breakdown, and revenue-flat preview consistently.
- [ ] PENDING: Verify employee revenue export excludes deposit, refund, deposit usage, and voided payment rows.
- [ ] PENDING: Verify cash-flow cards still show raw cash movement separately and are not mislabeled as Excel paid revenue.

---

# TestSprite Plan: TGClinic Orange Butterfly Favicon

Feature/edit name: TGClinic Orange Butterfly Favicon

Changed URLs and API routes:
- `/`
- All website routes that inherit `website/index.html`
- Static asset: `/favicon.svg`
- No API routes changed.

Affected data flows:
- Browser loads the SVG favicon from `website/public/favicon.svg`.
- Vite serves the icon through the app shell defined in `website/index.html`.
- No backend, database, auth, or user-record data flow changed.

User roles:
- Any authenticated or unauthenticated browser visitor.
- Admin, receptionist, dentist, and manager roles should see the same browser-tab icon.

Happy paths:
- Open the local website and confirm the browser tab loads the orange butterfly favicon.
- Fetch `/favicon.svg` and confirm it returns SVG content.
- Navigate between routes and confirm the favicon remains stable because the app shell owns it.

Edge cases:
- Browser cache may keep the old Vite icon until hard refresh or cache clear.
- SVG favicon should remain legible at 16x16 and 32x32 browser-tab sizes.
- Missing favicon should not block app startup or route rendering.

Regressions:
- `website/index.html` still loads `/src/main.tsx`.
- Existing page title and version bootstrap script remain unchanged.
- No API route or permission behavior changes.

Setup data and login state:
- No special data or login state required.
- Use the normal local website dev server.

TestSprite execution items:
- [ ] PENDING: Verify `GET /favicon.svg` returns the orange butterfly SVG asset.
- [ ] PENDING: Verify the browser tab icon changes from the default Vite icon to the orange butterfly on `/`.
- [ ] PENDING: Verify a nested app route keeps the same favicon after navigation.
- [ ] PENDING: Verify the app shell still mounts and renders the React app.

---

# TestSprite Plan: NK Production Database Daily Backup Rotation

Feature/edit name: NK Production Database Daily Backup Rotation

Changed URLs and API routes:
- No user-facing URLs changed.
- No API routes changed.
- VPS target: `https://nk.2checkin.com`
- VPS script: `/opt/tgroup/scripts/backup-nk-db.sh`
- Backup directory: `/opt/tgroup/backups/nk-db-daily/`

Affected data flows:
- `pg_dump` reads the production `tdental_demo` database from Docker container `tgroup-db`.
- The backup job writes compressed PostgreSQL custom-format dump files and `.sha256` checksums.
- Retention keeps only the latest 3 `nk-tdental_demo-*.dump` files after a successful new backup.

User roles:
- Infra/Release operator with root SSH access to the VPS.
- Clinic users should see no product behavior change.

Happy paths:
- Manual run of `/opt/tgroup/scripts/backup-nk-db.sh` creates a non-empty dump and checksum.
- `sha256sum -c` passes for the newest dump.
- `pg_restore -l` can list the dump table of contents through `tgroup-db`.
- Root crontab contains one daily entry scheduled for 12:00 Vietnam time.

Edge cases:
- If `tgroup-db` is missing or unhealthy, the script exits before writing a successful backup.
- If `pg_dump` creates an empty temp file, the temp file is removed and no retention cleanup runs.
- Retention cleanup should only remove older matching NK dump/checksum pairs after a successful backup.
- The VPS currently uses UTC, so the cron expression is `0 5 * * *`.

Regressions:
- Existing `tgroup-api`, `tgroup-web`, and `tgroup-db` containers must remain running.
- Existing `/opt/tgroup/backups/db-sync/` backups must not be touched.
- No database restore, sync, import, export to local, or schema migration should run as part of this job.

Setup data and login state:
- Use SSH alias `dokploy` or `root@76.13.16.68`.
- Use app path `/opt/tgroup`, container `tgroup-db`, database `tdental_demo`.

TestSprite execution items:
- [ ] PENDING: Verify the newest backup file exists in `/opt/tgroup/backups/nk-db-daily/` and is non-empty.
- [ ] PENDING: Verify the newest `.sha256` file passes `sha256sum -c`.
- [ ] PENDING: Verify `docker exec -i tgroup-db pg_restore -l < newest.dump` lists `tdental_demo` archive contents.
- [ ] PENDING: Verify `crontab -l` contains exactly one `backup-nk-db.sh` entry scheduled for `0 5 * * *`.
- [ ] PENDING: Verify the retained matching `.dump` count is not greater than 3 after future daily runs.

---

# TestSprite Plan: NK Hosoonline Session-Token Image Hotfix

Feature/edit name: NK Hosoonline Session-Token Image Hotfix

Changed URLs and API routes:
- `/customers/61d6759f-f2e2-4443-8d5b-b3a7003ab7c5`
- `/customers/:id`
- `GET /api/ExternalCheckups/:customerCode`
- `GET /api/ExternalCheckups/images/:imageName`
- `POST /api/ExternalCheckups/:customerCode/health-checkups`

Affected data flows:
- Hosoonline checkup list still loads through `GET /api/ExternalCheckups/:customerCode`.
- Proxied Hosoonline image and upload fetches now send the TGClinic bearer token from either local storage or session storage.
- Non-remembered NK login sessions should no longer get `401 {"error":"No token"}` for checkup thumbnails.

User roles:
- Authenticated admin or clinic staff with `external_checkups.view`.
- Staff with `external_checkups.upload` for upload regression coverage.

Happy paths:
- Log into NK without Remember Me, open `/customers/61d6759f-f2e2-4443-8d5b-b3a7003ab7c5`, and verify Health Checkup Images thumbnails render.
- Verify `GET /api/ExternalCheckups/images/:imageName` requests include `Authorization: Bearer ...` and return image bytes.
- With upload permission, verify add-checkup upload still sends auth to `POST /api/ExternalCheckups/:customerCode/health-checkups`.

Edge cases:
- Remember Me sessions that store the token in local storage should continue to render images.
- Missing or expired sessions should still receive 401 and trigger the existing failed-image state.
- Hosoonline `http://` media URLs should still be normalized through the existing HTTPS/proxy path.

Regressions:
- Customer profile loading, profile tabs, and the checkup list must still render.
- Existing `external_checkups.view` permission gate must continue to protect image bytes.
- Existing upload form behavior and error parsing must remain unchanged.

Setup data and login state:
- Use NK production login state.
- Use customer `T056733` from `/customers/61d6759f-f2e2-4443-8d5b-b3a7003ab7c5`, which currently has Hosoonline image records.

TestSprite execution items:
- [ ] PENDING: Verify non-remembered NK session renders Hosoonline thumbnails on `/customers/61d6759f-f2e2-4443-8d5b-b3a7003ab7c5`.
- [ ] PENDING: Verify image requests include Authorization and return `image/*`, not 401 JSON.
- [ ] PENDING: Verify remembered/local-storage sessions still render Hosoonline thumbnails.
- [ ] PENDING: Verify the upload form still sends Authorization when staff has `external_checkups.upload`.

---

# TestSprite Plan: Reporting And Permission Feedback Completion

Feature/edit name: Revenue Recognition Reports, Cash Flow Report, Payment Permission Split, and Ho so Online Upload Gate

Changed URLs and API routes:
- `/reports/revenue`
- `/reports/services`
- `/customers/:id`
- `/permissions`
- `POST /api/Reports/revenue/summary`
- `POST /api/Reports/revenue/trend`
- `POST /api/Reports/revenue/by-location`
- `POST /api/Reports/revenue/by-doctor`
- `POST /api/Reports/revenue/by-category`
- `POST /api/Reports/services/breakdown`
- `POST /api/Reports/cash-flow/summary`
- `POST /api/Payments`
- `POST /api/Payments/refund`
- `DELETE /api/Payments/:id`
- `POST /api/Payments/:id/void`
- `GET /api/ExternalCheckups/:customerCode`
- `POST /api/ExternalCheckups/:customerCode/patient`
- `POST /api/ExternalCheckups/:customerCode/health-checkups`

Affected data flows:
- Revenue report paid totals now come from posted `payment_allocations` linked to treatment invoices instead of unpaid sale-order totals or deposits.
- Deposits, refunds, deposit usage, and voided payments stay in cash-flow reporting and are excluded from revenue recognition.
- Cash-flow summary is mounted through `/api/Reports/cash-flow/summary`.
- Service/category/source report revenue uses posted payment allocations instead of listed service prices or unpaid order values.
- Payment creation, refunds, and destructive void/delete actions use separate permission strings: `payment.add`, `payment.refund`, and `payment.void`.
- Ho so Online view, patient creation, and image upload are split into `external_checkups.view`, `external_checkups.create`, and `external_checkups.upload`; the customer profile hides create/upload controls for view-only staff.

User roles:
- Super Admin/Admin with full reporting and permission access.
- Receptionist or clinic staff with payment add/view but without destructive payment void permission.
- Dentist or other view-only clinic role with `external_checkups.view` but no upload permission.
- Dental Assistant/Assistant role with assigned-location customer access and `external_checkups.upload`.
- Reporting staff with `reports.view`.

TestSprite execution items:
- [ ] PENDING: On `/reports/revenue`, verify summary paid totals match posted treatment payment allocations and do not count customer deposits.
- [ ] PENDING: On `/reports/revenue`, verify trend, location, doctor, and category breakdowns show paid service revenue by payment date.
- [ ] PENDING: On `/reports/services`, verify source/category revenue excludes unpaid listed treatment value and deposits.
- [ ] PENDING: Call `POST /api/Reports/cash-flow/summary` and verify deposits, refunds, deposit usage, voided payments, money in/out, and net cash-flow are separated.
- [ ] PENDING: With a user lacking `payment.void`, verify payment delete/void actions fail with 403 or are hidden where the UI has permission context.
- [ ] PENDING: With a user lacking `external_checkups.upload`, open `/customers/:id` and verify Ho so Online images can be viewed but the add-checkup upload button is hidden.
- [ ] PENDING: With a user that has `external_checkups.upload`, verify the add-checkup upload button appears and upload submits to `POST /api/ExternalCheckups/:customerCode/health-checkups`.
- [ ] PENDING: With a Dental Assistant/Assistant role, verify customer search/profile/Hồ sơ online upload works, while treatment, deposit, and payment creation remain blocked.
- [ ] PENDING: Open `/permissions` and verify `payment.void` and `external_checkups.upload` are visible permission options with descriptions.

Edge cases:
- Partial payments split across multiple sale-order lines.
- Overallocated imported payment allocation rows should not exceed the posted payment amount in service/person export-style calculations.
- Deposit usage with `method = deposit` should not increase revenue.
- Voided payments should stay out of recognized revenue and appear only as cash-flow adjustments.
- Ho so Online patient missing state should not show create/upload controls unless the user has the matching permission.

Regressions:
- Existing `/reports/revenue` chart/table shapes remain compatible with the frontend.
- Payment history, deposit list, and customer profile payment tabs still load for `payment.view` users.
- Existing Hosoonline image proxy remains protected by `external_checkups.view`.
- Existing permission-board role editing still saves unknown/new permission strings.

Setup data and login state:
- Use an authenticated admin session for full checks.
- Use at least one scoped clinic role without `payment.void` and without `external_checkups.upload`.
- Use customers with existing payments, deposits, and Ho so Online images.

---

# TestSprite Plan: Overview Wait Timer Arrival Timestamp Repair

Feature/edit name: Overview Wait Timer Arrival Timestamp Repair

Changed URLs and API routes:
- `/`
- `PUT /api/Appointments/:id`

Affected data flows:
- Marking an appointment `arrived` writes `datetimearrived` as Vietnam wall-clock time instead of a DB-session-dependent double timezone conversion.
- Overview `PatientCheckInCard` keeps the full `datetimearrived` timestamp through `useOverviewAppointments` and `WaitTimer` instead of comparing only time-of-day.
- In-treatment and done transitions continue stamping `datetimeseated` and `datedone` from the same Vietnam timestamp source.

User roles:
- Admin and clinic staff with `appointments.edit` and `overview.view`.

Happy paths:
- Mark a scheduled appointment as arrived from `/`, wait 3-5 seconds, and confirm the card timer counts upward instead of staying at `0s`.
- Refresh `/` after marking arrived and confirm the timer uses the persisted `datetimearrived` timestamp.
- Move the same appointment to `Đang khám` and confirm the waiting timer becomes static using the treatment start time.

Edge cases:
- Existing arrived rows with bad historical timestamps should not block new check-ins from getting correct timestamps after this fix.
- Local DB sessions with a non-Vietnam `current_setting('TimeZone')` should still stamp Vietnam wall-clock appointment timestamps.
- Persisted timestamps whose date differs from today should not clamp to `0s` only because their clock time is later than the current clock time.
- Check-in timers should not regress to whole-minute-only display after the first minute.

Regressions:
- Appointment creation still populates `datecreated` and `lastupdated`.
- Staff clear/save behavior on `PUT /api/Appointments/:id` remains intact.
- Calendar appointment listing and overview today-only filtering remain unchanged.

Setup data and login state:
- Use an authenticated admin session.
- Use any today appointment that is still scheduled or confirmed.
- For backend verification, assert the update SQL contains `NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh'` and does not contain the double `UTC` timezone conversion.

---

# TestSprite Plan: Customer Appointment Start Time

Feature/edit name: Customer Appointment Start Time

Changed URLs and API routes:
- `/customers/:id`
- `GET /api/Appointments?partner_id=...`

Affected data flows:
- Customer profile appointment history now preserves a start time from `dbo.appointments.date` when the legacy `time` column is null.
- The profile hook still normalizes appointment dates to the selected timezone for date badges.
- Duration continues to use `timeexpected`.

User roles:
- Authenticated admin or clinic staff with customer profile access.

Happy paths:
- Open `/customers/9a358608-c0c2-47e5-88c0-b361006ddb39`.
- Go to `Lịch sử lịch hẹn`.
- Rows such as `AP244803` with `time = null` and timestamped `date` should show the local start time instead of `--:--`.
- Rows with explicit `time`, such as `09:00`, should keep that explicit time.

Edge cases:
- Plain `YYYY-MM-DD` dates without a time component should still show `--:--` if `time` is null.
- ISO timestamps should display in the selected app timezone, defaulting to `Asia/Ho_Chi_Minh`.

Regressions:
- Date badges must not shift one day.
- Customer profile appointment counts, doctor/team display, status badges, and edit buttons should continue to render.

Setup data and login state:
- Use an authenticated admin session.
- Use the current production customer URL `/customers/9a358608-c0c2-47e5-88c0-b361006ddb39` or another customer with migrated appointments where `time` is null and `date` contains a timestamp.

---

# TestSprite Plan: Appointment Export Time Preservation

Feature/edit name: Appointment Export Time Preservation

Changed URLs and API routes:
- `/calendar`
- `/appointments`
- `/reports/appointments`
- `POST /api/Exports/:type/preview`
- `POST /api/Exports/:type/download`

Affected data flows:
- Appointment operational Excel exports now preserve the full appointment timestamp from `dbo.appointments.date` when the legacy `time` column is empty.
- Export filename and workbook date formatting should continue to use Vietnam time.
- The API runtime should run with `TZ=Asia/Ho_Chi_Minh` so PostgreSQL timestamp parsing matches the clinic UI.

User roles:
- Authenticated admin or clinic staff with export access for calendar, appointments, or reports surfaces.

Happy paths:
- Export appointments where `date` contains a full timestamp and `time` is null; the exported workbook should show the stored appointment hour, not `00:00`.
- Export appointments where both `date` and `time` are present; the explicit legacy time should still win.
- Preview and download should return the same row count for the same filters.

Edge cases:
- Null appointment date returns a blank export date instead of crashing.
- ISO string dates and plain `YYYY-MM-DD` strings still produce valid workbook dates.
- Large date-range downloads should complete behind the production `/api` proxy timeout.

Regressions:
- Existing export types must still register and download.
- Appointment calendar display should not shift by one day or lose appointment hours.
- Export audit behavior should continue to record preview/download attempts.

Setup data and login state:
- Use an authenticated admin session, preferably `website/.auth/admin.json` if valid.
- Use appointments with `dbo.appointments.date` values containing afternoon times and null `time` values.

---

# TestSprite Plan: Accent-Insensitive Search

Feature/edit name: Accent-Insensitive Search

Changed URLs and API routes:
- `/`
- `/calendar`
- `/appointments`
- `/customers`
- `/employees`
- `/services`
- `/service-catalog`
- `/payment`
- `/permissions`
- `/api/Appointments?search=...`
- `/api/Partners?search=...`
- `/api/Employees?search=...`
- `/api/Products?search=...`
- `/api/ProductCategories?search=...`
- `/api/SaleOrders?search=...`
- Other API list searches that accept `search`, including cash books, receipts, CRM tasks, monthly plans, stock pickings, journals, payslips, commissions, and website pages.

Affected data flows:
- Overview staff search within `Lịch trình ngày` and `Lịch hẹn hôm nay` normalizes both the query and appointment text before matching.
- Overview `Today's Services / Activity` search is currently a placeholder with no service rows to filter; when service rows are added, the same accent-insensitive rule applies.
- Staff type unaccented Vietnamese search terms into frontend search inputs.
- Frontend-only list filters normalize both the query and displayed row text.
- API-backed searches send the raw query; backend SQL compares both raw and accent-stripped forms.
- Customer code, phone, appointment number, sale order number, and receipt/reference searches must still work.

User roles:
- Admin user with access to customers, calendar, appointments, employees, services, payment, settings/permissions, and reporting-style operational lists.
- Scoped clinic staff should see only data allowed by existing route permissions and location filters.

Happy paths:
- On `/`, searching `nguyen`, `thoai`, or `duong` in the Overview appointment searches finds matching accented customer, doctor, assistant, TLBS, location, or note text when matching rows exist.
- On `/`, typing into the `Lịch trình ngày` search must not change the `Lịch hẹn hôm nay` search, and typing into `Lịch hẹn hôm nay` must not change `Lịch trình ngày`.
- Searching `quyen` finds records containing `Quyền`.
- Searching `nguyen` finds records containing `Nguyễn`.
- Searching `my han` finds records containing `Mỹ Hân`.
- Existing accented searches such as `quyền` still find the same records.
- Numeric and alphanumeric searches such as phone numbers, `T8250`, `AP...`, and `SO...` still return the expected records.

Edge cases:
- Mixed case search terms.
- Extra leading/trailing spaces.
- Empty search term should return the normal unfiltered list.
- Vietnamese `đ`/`Đ` should match `d`.
- Search counts and pagination totals should match the visible filtered rows.

Regressions:
- Customer search must not fall back to phone-digit matching for alphanumeric customer codes.
- Calendar day search, Today Appointments search, payment search, service catalog category search, and permission-board employee search should not require accents.
- Backend count/aggregate queries must not fail when search uses joined display fields.

Setup data and login state:
- Use an authenticated admin session, preferably `website/.auth/admin.json` if it is still valid.
- Seed or pick records containing accented Vietnamese names such as `Phạm Thị Thảo Quyền`, `Nguyễn Thị Mỹ Hân`, and a customer code like `T8250`.

---

# TestSprite Plan: Guided Face Profile Capture

Feature/edit name: Guided Face Profile Capture

Changed URLs and API routes:
- `/customers`
- `/customers/:id`
- `POST /api/face/register`
- `GET /api/face/status/:partnerId`

Affected data flows:
- Add-customer face capture now guides staff through straight, left, and right customer head positions.
- New customers with a saved no-match face scan register all captured profile samples after the customer record is created.
- Existing customer face registration stores multiple profile samples through the existing face-register endpoint.
- Face status sample count should increase by the number of accepted profile samples.

User roles:
- Admin or clinic staff with `customers.view` and `customers.edit`.

Happy paths:
- Opening the customer add form and using face scan shows the three-step guide: straight, left, right.
- A no-match customer add stores the pending profile samples and registers them after Save.
- Editing an existing customer and pressing Register Face stores three samples without leaving the modal stuck in processing.

Edge cases:
- Camera denied shows the existing permission error.
- Staff can still switch camera before scanning.
- Manual Capture during a profile step advances to the next pose.
- Closing the modal clears pending profile samples.

Regressions:
- Quick Face ID recognition still opens from the header and can recognize or cancel.
- Existing single-image face recognition APIs remain compatible with `FaceCaptureModal` callers.
- Failed post-save face registration must not block the created customer record.

Setup data and login state:
- Use an authenticated admin session with camera permission enabled.
- Use fake camera media for browser automation, or a real local camera for manual verification.
- Use a test customer that can be safely edited for `/customers/:id` face registration checks.

---

# TestSprite Plan: CompreFace Face ID Provider

Feature/edit name: CompreFace Face ID Provider

Changed URLs and API routes:
- `/customers`
- `/customers/:id`
- Header Quick Face ID button on all authenticated routes
- `POST /api/face/recognize`
- `POST /api/face/register`
- `POST /api/face/re-register`
- `GET /api/face/status/:partnerId`
- `GET /api/health`

Affected data flows:
- Browser camera still captures the JPEG through `FaceCaptureModal`.
- Backend Face ID provider is selected by `FACE_RECOGNITION_PROVIDER=local|compreface`.
- CompreFace mode registers subjects with `partners.id`, uploads face examples to CompreFace, maps recognition subjects back to `dbo.partners`, and updates `partners.face_subject_id` / `face_registered_at`.
- Local mode continues to use `face-service` embeddings in `dbo.customer_face_embeddings`.

User roles:
- Admin or clinic staff with `customers.view` for recognition.
- Admin or clinic staff with `customers.edit` for registration/re-registration.

Happy paths:
- With `FACE_RECOGNITION_PROVIDER=compreface`, `/api/health` reports `faceProvider: "compreface"` and `checks.faceService: true` when CompreFace is reachable with a valid key.
- Registering a customer face creates or reuses a CompreFace subject and returns `{ success, partnerId, sampleId, sampleCount, faceRegisteredAt }`.
- Re-registering from `/customers/:id` replaces the CompreFace subject examples and returns all sample IDs.
- Quick Face ID recognition maps a CompreFace subject back to the correct customer and opens `/customers/:id`.

Edge cases:
- Missing or invalid `COMPREFACE_API_KEY` degrades Face ID health without blocking unrelated customer pages.
- Existing CompreFace subject returns 409 and registration still adds a new example.
- Deleted/missing CompreFace subject during re-register is ignored before recreating it.
- Unknown CompreFace subjects are ignored instead of linking to the wrong customer.
- Low-confidence results return candidates or no-match, not an automatic customer jump.
- Browser sessions without native `FaceDetector` support must not auto-capture a center face from frame quality alone.
- CompreFace recognize/register requests must send a native multipart `file` part; provider responses like "Required part file is missing" indicate the upload client is broken.
- `NO_FACE` from local or CompreFace providers must keep the camera modal open and show "Không phát hiện khuôn mặt" / "Face not detected".
- CompreFace no-face responses must return HTTP 422 with `error: "NO_FACE"`, not a generic engine error.

Regressions:
- `FACE_RECOGNITION_PROVIDER=local` still uses `face-service` and `dbo.customer_face_embeddings`.
- Single-image capture callers still work with `POST /api/face/register`.
- Guided profile capture still sends three images for re-registration.
- Manual customer search fallback still works after no-match.
- Header Quick Face ID, customer camera widget, and profile re-registration all keep capture open on no-face failures until staff manually closes it.

Setup data and login state:
- Use an authenticated admin session with camera permission enabled.
- Use fake camera media for automation or a real local camera for manual checks.
- Start CompreFace with `docker compose up -d compreface-postgres-db compreface-api compreface-core`.
- Set a valid `COMPREFACE_API_KEY` for the recognition service and set `FACE_RECOGNITION_PROVIDER=compreface`.
- Use a safe test customer whose Face ID can be replaced.

Execution checklist for the no-face fix:
- [ ] PENDING: With the camera pointed away or covered, verify the capture modal shows "Không phát hiện khuôn mặt" and remains open until cancel/close.
- [ ] PENDING: Trigger CompreFace no-face on `POST /api/face/re-register` and verify HTTP 422 `NO_FACE`, not `ENGINE_ERROR`.
- [ ] PENDING: Trigger Header Quick Face ID no-face and verify it keeps capture open without opening the no-match rescue popover.
- [ ] PENDING: Trigger customer profile re-registration no-face and verify no success toast appears until a valid face is captured.

---

# TestSprite Plan: Customer Service Quantity Save

Feature/edit name: Customer Service Quantity Save

Changed URLs and API routes:
- `/customers/:id`
- `/api/SaleOrders/:id`
- `/api/SaleOrders/lines?partner_id=...`

Affected data flows:
- Staff opens a customer profile and goes to `Phiếu khám`.
- Staff edits an existing service line quantity/unit such as `1 răng`.
- The edit form saves through the parent sale order route.
- The backend must update both `saleorders.quantity` and the rendered `saleorderlines.productuomqty`.
- The customer profile reloads sale-order lines and shows the saved quantity without a manual page reload.

User roles:
- Admin or clinic staff with `customers.edit` and service-record access.

Happy paths:
- Open a customer with at least one service line showing `1 răng`.
- Edit that service and change quantity to another value, for example `3`.
- Save the form.
- Reopen the same customer `Phiếu khám` row and confirm the quantity column shows `3 răng`.
- Reopen the edit modal and confirm the quantity field still shows the saved value.

Edge cases:
- Existing migrated rows where the line quantity differs from the parent order quantity.
- Quantity-only edits with the same price, doctor, service, and tooth values.
- Edits that also change service price, doctor, assistant, TLBS, tooth notes, or unit.

Regressions:
- Payment totals and remaining balance must not duplicate across multi-line orders.
- Delete service still targets the sale-order line id.
- Payment still targets the parent sale order id.
- Existing tooth label such as `manual` remains visible unless staff intentionally changes it.

Setup data and login state:
- Use an authenticated admin session.
- Prefer the current customer URL `/customers/f72f8c86-34e9-4377-b59c-b414002ec20c` if seeded locally.
- Use disposable or already-known QA service data when changing quantity.

## Fix Implemented (2026-05-07)

**Root cause:** `ServiceForm.tsx` stored `quantity` as a string, which caused React controlled-input reconciliation issues with `type="number"` — the browser's native number parsing conflicted with React's string value, making the input appear frozen/uneditable.

**Changes:**
- `website/src/components/services/ServiceForm.tsx`:
  - Changed `quantity` state from `string` to `number` (`initialData?.quantity ?? 1`)
  - Fixed `onChange` to parse to number: `setQuantity(v === '' ? 1 : Number(v))`
  - Simplified submit: `quantity || 1` (no more `Number()` coercion needed)
- `website/src/hooks/useServices/mapSaleOrderToServiceRecord.ts`:
  - Fixed `parseFloat("0")` being falsy: changed `order.quantity ? parseFloat(...) : 1` → `order.quantity != null ? parseFloat(...) : 1`

---

# TestSprite Plan: Customer Initial Load Performance

Feature/edit name: Customer Initial Load Performance

Changed URLs and API routes:
- `/customers`
- `/customers/:id`
- `/api/Appointments?offset=0&limit=200`
- `/api/Employees?offset=0&limit=500&active=all`
- `/api/SaleOrders?offset=0&limit=500`

Affected data flows:
- Customer list initial render after login.
- Customer profile hooks that share appointment, employee, and service data.
- Empty-search state for appointments, employees, and services.

User roles:
- Authenticated admin or clinic staff with customer access.

Happy paths:
- Open `/customers` after login and confirm the customer table renders.
- Initial customer-list load should not request profile-only appointments, employees, or sale orders.
- Opening `/customers/:id` should still request profile-specific employees and service data.
- Searching appointments, employees, or services still triggers the debounced search request after typing.

Edge cases:
- Clearing a non-empty search term should reload the unfiltered data once.
- Switching selected customer profile should still load profile-specific services.
- Location-scoped views should still pass the selected location filter.

Regressions:
- Creating or updating appointments and services should still update local state.
- Employee filters and service filters should still work after the initial fetch.
- Version display and guided face capture should continue to load.

Setup data and login state:
- Use an authenticated admin session.
- Capture browser network requests for `/customers` and compare duplicate initial API calls before and after the change.

---

# TestSprite Plan: Staff Selector Clear Option

Feature/edit name: Staff Selector Clear Option

Changed URLs and API routes:
- `/appointments`
- `/calendar`
- `/services`
- `/customers/:id` through the service edit modal
- No API route shape changed; existing appointment and sale-order save routes should receive `null`/empty staff values when staff is cleared.

Affected data flows:
- Appointment edit/add form doctor, assistant, and dental-aide selectors.
- Service edit/add form doctor, assistant, and dental-aide selectors.
- Shared `DoctorSelector` clear action now emits `null` instead of an empty string.

User roles:
- Admin or clinic staff allowed to add/edit appointments and patient service records.

Happy paths:
- Open an appointment or service with a selected doctor, assistant, or TLBS.
- Open the staff dropdown and click `Không chọn (None)`.
- Save and reopen the record; the cleared field should stay empty.
- Select another staff member after clearing and save successfully.

Edge cases:
- Clear only one staff role while leaving the other two selected.
- Clear all three staff selectors and save.
- Use search inside the dropdown, then clear the current selection.

Regressions:
- Staff search remains accent-insensitive.
- Staff dropdown still filters by the correct role: doctor, assistant, and doctor-assistant.
- Calendar/service edit saves still close normally and refresh visible records after success.

Setup data and login state:
- Use an authenticated admin session.
- Use any appointment or service record that already has doctor, assistant, or TLBS selected.

Fix implemented:
- The shared staff selector now shows the `Không chọn (None)` clear row whenever clearing is enabled, even if the current record has a stale selected id that does not resolve in the active staff list.

---

# TestSprite Plan: Customer Payment Identity Reconciliation

Feature/edit name: Customer Payment Identity Reconciliation

Changed URLs and API routes:
- `/payment`
- `/customers/:id`
- `GET /api/Payments`
- `GET /api/Payments?customerId=...&type=payments`
- `GET /api/Payments/deposits`
- `GET /api/Payments/deposit-usage`
- `GET /api/Payments/:id`

Affected data flows:
- Canonical payment rows now include the linked customer name, phone, and location name from `dbo.partners` / `dbo.companies`.
- `/payment` history maps canonical `dbo.payments` rows into visible customer payment rows without losing customer identity.
- Payment search can match customer names and phones on canonical payment rows, including accent-insensitive searches like `ma van thanh`.
- Customer profile payment tabs and service history still use the same payment and allocation IDs.

User roles:
- Admin or clinic staff with `payment.view`.
- Staff with customer profile access when checking `/customers/:id` payment history.

Happy paths:
- Open `/payment`, search `ma van thanh`, and confirm payments for `MÃ VĂN THÀNH - UP` remain visible.
- Search `0985227087` and confirm both duplicate customer profiles can be reconciled from visible payment identity.
- Open `T050559` customer profile and confirm orthodontic payments total `14.801.000 ₫` against `SO45244`.
- Open `T058004` customer profile and confirm the two `700.000 ₫` payments remain separate on the QL profile.

Edge cases:
- Payment rows with missing partner records should still render without crashing.
- Legacy `accountpayments` fallback rows should include customer identity when fallback is used.
- Voided payments should keep existing status behavior.
- Deposit and deposit-usage endpoints should still return the same rows and counts.

Regressions:
- `/payment` all-location history should not lose receipt/reference code display.
- Outstanding balance cards should still derive from sale orders and not double-count canonical payment rows.
- Customer profile service residual display should still use sale order residual and allocation data.
- Existing accent-insensitive search behavior across payment text fields should remain intact.

Setup data and login state:
- Use an authenticated admin session with `payment.view`.
- Use local customer records `T050559` (`MÃ VĂN THÀNH - UP`) and `T058004` (`MÃ VĂN THÀNH - QL`), both phone `0985227087`.
- Use local sale order `SO45244` and payment references `CUST.IN/2026/103918`, `CUST.IN/2026/103919`, and `CUST.IN/2026/102219` as verification anchors.

---

# TestSprite Plan: Customer Service Paid Total Reconciliation

Feature/edit name: Customer Service Paid Total Reconciliation

Changed URLs and API routes:
- `/customers/:id`
- `GET /api/SaleOrders/lines`

Affected data flows:
- Customer service rows derive the paid total from posted payment amounts when imported payment allocation rows overstate the receipt amount.
- Expanded service payment history remains tied to canonical `dbo.payments` rows and should match the service row total.
- Residual display recalculates from the corrected paid amount and imported sale-order total.

User roles:
- Admin or clinic staff with `services.view`.
- Staff reviewing customer service history and payment history on a customer profile.

Happy paths:
- Open customer `T050557` / sale order `SO45243` and expand the payment history.
- Confirm the 8 history rows add to `15.400.000 ₫`.
- Confirm the collapsed service row shows paid `15.400.000 ₫` and residual `4.400.000 ₫` for total `19.800.000 ₫`.
- Confirm direct posted service payments without allocation rows still count in service paid totals.

Edge cases:
- Imported allocation rows where one payment is duplicated above its real posted amount.
- Payments split across more than one invoice should be proportionally capped only when the total allocation exceeds the real payment.
- Voided or non-payment category records should not increase the service paid total.

Regressions:
- Customer service rows with no overallocated imports should keep the same paid and residual totals.
- Service history sorting and product/doctor/dental-aide fields should remain unchanged.
- Payment button and expanded payment-history drawer should still render for partially paid services.

Setup data and login state:
- Use an authenticated admin session with `services.view`.
- Use local customer `T050557` and sale order `SO45243`.
- Verification anchor receipts: `CUST.IN/2025/80040`, `CUST.IN/2025/80041`, `CUST.IN/2025/84122`, `CUST.IN/2025/88698`, `CUST.IN/2025/92961`, `CUST.IN/2026/99621`, `CUST.IN/2026/102814`, `CUST.IN/2026/106326`.

---

# TestSprite Plan: Employee Sales Export Payment Reconciliation

Feature/edit name: Employee Sales Export Payment Reconciliation

Changed URLs and API routes:
- `/reports`
- Operational export preview/download route for the employee sales report builder.

Affected data flows:
- Employee sales report/export rows normalize overallocated imported `payment_allocations` rows before splitting payment amount across service lines.
- Report totals should match actual posted payment amounts instead of duplicated imported allocation amounts.

User roles:
- Admin or reporting staff with report/export permission.

Happy paths:
- Preview and export employee sales revenue for a date range that includes a fully paid imported service.
- Confirm the report total does not exceed the underlying posted payment amount when allocation rows are duplicated.
- Confirm line-level splitting still works for services with multiple active sale-order lines.

Edge cases:
- Payment allocations whose total exceeds the posted payment amount.
- Multi-line service orders where a normalized allocation needs to be split by line price.
- Location-scoped report users should keep the same permission behavior.

Regressions:
- Normal report filters for date, company, employee type, and employee ID still apply.
- Export workbook grouping and summary totals remain unchanged for non-overallocated data.

Setup data and login state:
- Use an authenticated admin/reporting session.
- Use a date range containing known overallocated imported sale orders such as `SO45243` or high-delta examples from the audit query.

---

# TestSprite Plan: NK2 Feedback Bug Triage

Feature/edit name: NK2 Feedback Bug Triage

Changed URLs and API routes:
- `https://nk2.2checkin.com/feedback`
- `GET /api/Feedback/all`
- `GET /api/Feedback/all/:threadId`

Affected data flows:
- Feedback admin page lists pending staff-submitted bug reports from `feedback_threads`.
- Feedback verification API returns manual staff reports plus auto-detected API/frontend error threads.
- Report artifacts are written under `reports/feedback-extract/`.

User roles:
- Admin with feedback moderation access.
- QA/TestSprite reviewer reading pending bug reports and auto-error clusters.

Happy paths:
- Log into NK2 as an admin and open `/feedback`.
- Confirm the page lists all pending manual staff reports.
- Fetch `GET /api/Feedback/all` with the same admin session and confirm the manual count matches the visible table.
- Confirm the generated report separates manual staff bugs from auto-detected 401/403 noise, backend 500 clusters, and frontend errors.

Edge cases:
- Expired or missing admin token should redirect to `/login` and not expose feedback data.
- Auto-detected 401/403 threads should be treated as auth/session noise unless tied to a confirmed workflow.
- Backend 500 clusters should preserve endpoint, status, latest timestamp, and occurrence count.
- Manual reports from NK and NK2 URLs should keep the original page URL for reproduction.

Regressions:
- `/feedback` table filtering, status labels, and `View` actions should still work.
- Login should still return to the authorized admin surface after authentication.
- Release notes toast should not block access to the feedback table.

Setup data and login state:
- Use NK2 admin login from `.agents/live-site.env`.
- Latest audit report: `reports/feedback-extract/2026-05-16T12-21-43-239Z-feedback-verification.md`.

TestSprite execution items:
- [ ] PENDING: Verify `/feedback` shows the 8 pending manual staff reports.
- [ ] PENDING: Verify `GET /api/Feedback/all` returns 345 pending feedback threads on NK2.
- [ ] PENDING: Verify manual staff reports are prioritized above auto-error clusters.
- [ ] PENDING: Verify auth/permission noise is not mixed into the manual bug list.

## Face Lab auto-capture reliability (2026-05-18)
- URL: `/face`
- API: `POST /api/face/recognize`
- Verify all 4 modules complete auto-capture within ~15s on browsers without native FaceDetector (Safari, Firefox, Chrome with flag off).
- Verify forced-capture safety net fires at 15s using best frame seen.
- Verify adaptive threshold relaxes after 6s and 10s of scanning.
- Verify "Capture now" button immediately triggers capture using best frame.

## Face Lab inline registration (2026-05-18)
- URL: `/face`
- API: `POST /api/face/register` (multipart partnerId + image)
- Verify: activate Burst module, capture face, no_match result shows "Register this face to a customer" button
- Verify: clicking opens search panel; typing 2+ chars calls `GET /api/Partners?search=...`
- Verify: clicking a customer registers the captured blob; success badge shows partner name
- Re-running the lab against same face should now return a match

## Face Lab recognize-failed recovery (2026-05-18)
- URL: `/face` (iPhone Safari especially)
- Verify: if `POST /api/face/recognize` times out or fails, the lab still shows the captured frame and the Register-face panel
- Verify: camera stops as soon as capture completes (LED off before upload)
- Verify: Register-face still works against captured blob after a recognize failure

## Face ID engine swap (2026-05-18)
- Surface: Global Face ID button (top bar), CustomerCameraWidget, AddCustomerForm
- Verify: opening Face ID and holding face captures within 5-15s on Safari, Firefox, iOS
- Verify: 5-frame burst — best of 5 sent to /api/face/recognize (check captured-blob size > 30 KB)
- Verify: profile-mode 3-pose registration on customer profile still works
- Regression: /face URL returns 404 (lab removed)

## External-checkup empty state + Create success notice (2026-05-18, v0.32.31)
- URL: `/customers/<UUID>` for any customer with no Hosoonline patient yet (e.g. `T056483`)
- API: `GET /api/ExternalCheckups/:code`, `POST /api/ExternalCheckups/:code/patient`
- Verify (patient missing): empty gallery shows `checkupEmptyPatientMissing` VN text "Khách hàng chưa có hồ sơ trên Hosoonline. Bấm 'Tạo bệnh nhân HSO' để bắt đầu tải ảnh lên." and the "Tạo bệnh nhân HSO" button is visible (requires `external_checkups.upload` perm)
- Verify (patient exists, no images): empty gallery shows `checkupEmptyNoImages` VN text "Chưa có ảnh khám nào trên Hosoonline. Bấm 'Thêm lịch khám' để tải ảnh lên."
- Verify (auth failed): shows amber `checkupEmptyAuthFailed` warning instead of generic gray text
- Verify (create success): clicking "Tạo bệnh nhân HSO" shows emerald success notice "Đã tạo hồ sơ Hosoonline. Bạn có thể tải ảnh khám lên ngay." and the gallery refreshes so the upload button becomes available
- Verify (i18n): switch language to EN; all 6 empty-state variants render English strings (no hardcoded fallbacks)
- Regression: customer with existing checkups + images still renders the gallery normally (e.g. customer code `T6281` returns 2 checkups with images that load through `/api/ExternalCheckups/images/...`)

---

# TestSprite Plan: SMS/Zalo Appointment Messaging Research

Feature/edit name: SMS/Zalo Appointment Messaging Research

Changed URLs and API routes:
- Research only; no runtime URL or API route changed.
- Future implementation plan covers `/notifications`, `/calendar`, `/customers/:id`, Overview today queue.
- Future API plan covers `GET /api/Notifications/templates`, `POST /api/Notifications/templates`, `PUT /api/Notifications/templates/:id`, `POST /api/Notifications/preview`, `POST /api/Notifications/send`, `GET /api/Notifications/messages`, `GET /api/Notifications/messages/:id`, `POST /api/Notifications/messages/:id/retry`, `GET /api/Notifications/late-appointments`, `POST /api/Notifications/appointments/:id/late-reminder`, and customer contact-preference endpoints.

Affected data flows:
- Appointment lateness detection from appointment schedule fields, appointment state, and `datetimearrived`.
- Customer contact routing through `partners.id`, `phone`, `zaloid`, and `receiverzalonumber`; phone must not be treated as unique.
- Future append-only messaging outbox, attempt log, template, provider-account, and contact-preference tables.
- Provider adapter flow for dry-run, Vietnam SMS Brandname, and later Zalo ZBS/ZNS.

User roles:
- Reception/front desk with appointment view and future `notifications.send`.
- Manager/admin with future `notifications.view`, `notifications.edit`, `notifications.send`, and `notifications.admin`.
- Staff without notification permissions must not see send/retry/admin controls.
- Location-scoped staff must not see or send reminders for another branch/location.

Happy paths:
- Open `/notifications` and verify templates, outbox statuses, provider status, and message detail history render after implementation.
- Open `/calendar` on a day with a late eligible appointment and verify the manual late-reminder action is visible.
- Send one late reminder and verify the message row records queued/sent status, rendered body snapshot, provider response, actor, channel, and appointment/customer links.
- Open customer profile and verify communication preferences and recent message history are visible without assuming phone uniqueness.
- Verify dry-run provider records the full send flow locally without contacting a real provider.

Edge cases:
- Missing phone, invalid phone, opted-out customer, duplicate phone across customers, missing appointment time, timezone boundary around midnight, already arrived, cancelled, done, in-progress, provider outage, provider timeout, rejected template, quiet-hours block, duplicate click, and worker race.
- SMS copy must avoid treatment names, health details, balances, URLs, and phone numbers unless provider/legal approval explicitly allows them.
- Zalo route must use approved template IDs and handle customers who do not have Zalo eligibility.

Regressions:
- `/notifications` existing route guard must continue to require notification permission.
- Calendar appointment load, check-in, cancel, and quick-add flows must not change when the messaging controls are hidden.
- Customer profile contact edits must not change the durable partner identity invariant.
- Existing appointment reminder fields must not be silently repurposed as the only audit trail.
- Provider webhook callbacks must require signature/shared-secret verification or remain internal polling only; unsigned callbacks must not update message status.

Setup data and login state:
- Use authenticated admin/manager and receptionist/staff sessions.
- Seed at least one scheduled/confirmed appointment 15+ minutes late today, one arrived appointment, one cancelled appointment, one other-branch late appointment, one customer with no phone, one duplicate-phone customer pair, one opted-out customer, and one dry-run provider config.
- Collect screenshot evidence for `/notifications`, `/calendar` late appointment state, and customer communication history when browser-visible verification runs.

TestSprite execution items:
- [ ] PENDING: Verify `/notifications` messaging dashboard renders templates, outbox statuses, failed/skipped states, and retry details.
- [ ] PENDING: Verify `/calendar` exposes manual late-reminder action only for eligible late appointments.
- [ ] PENDING: Verify a manual late reminder creates one outbox row and one provider attempt with an idempotency key.
- [ ] PENDING: Verify duplicate send attempts for the same appointment/template/customer do not create duplicate successful messages.
- [ ] PENDING: Verify missing/invalid/opted-out contact cases create skipped or blocked states, not crashes.
- [ ] PENDING: Verify customer profile communication preferences and message history key by `partners.id`, not phone number.
- [ ] PENDING: Verify staff without `notifications.send` cannot send or retry reminders.
- [ ] PENDING: Verify staff without `notifications.edit` cannot create/edit templates or provider settings.
- [ ] PENDING: Verify staff without `notifications.admin` cannot access provider/admin configuration.
- [ ] PENDING: Verify location-scoped staff cannot view or send reminders for another branch/location.
- [ ] PENDING: Verify unsigned or invalid provider webhook callbacks do not update message status.

## 2026-05-19 — Feedback Attachment Persistence / Revenue Proof Restore

Feature/edit name:
- Feedback attachment transaction hardening and NK revenue-resolution proof-image restore.

Changed URLs and API routes:
- Browser-visible: `https://nk.2checkin.com/feedback`, affected thread `06892fc6-5ccc-4c22-ad00-fed55199e9ad` on `/reports/revenue`.
- Upload/static route: `/uploads/feedback/:storedName`.
- API routes: `POST /api/Feedback`, `POST /api/Feedback/my/:threadId/reply`, `POST /api/Feedback/all/:threadId/reply`, `DELETE /api/Feedback/all/:threadId`.

Affected data flows:
- User/admin file upload -> `uploads/feedback/*` -> `feedback_messages` -> `feedback_attachments` -> `/uploads/feedback/*` static serving -> `/feedback` image preview.
- Thread deletion -> DB attachment/message/thread delete commit -> physical file cleanup after commit.

User roles:
- Admin/manager viewing all feedback and replying with resolution proof images.
- Staff creating feedback or replying to their own feedback with screenshots.

Happy paths:
- Admin opens `/feedback`, selects the May 17 revenue-report resolved thread, and sees the restored proof image load without a broken image/empty thumbnail.
- Admin reply with text plus image succeeds and the returned attachment URL loads with HTTP 200.
- Staff creates file-only feedback and staff/admin file-only replies succeed with empty message content plus a valid image attachment.
- Admin deletes a feedback thread and attached files disappear only after the DB delete succeeds.

Edge cases:
- Reply with no text and no file returns 400 without creating rows or files.
- Reply with uploaded file to a missing thread returns 404 and removes the uploaded file.
- Attachment DB insert/enrichment failure rolls back message/thread updates and removes the uploaded file.
- Delete-route DB failure before commit must not delete physical files that still have DB rows.

Regressions:
- Existing text-only feedback creation/reply behavior remains unchanged.
- Existing feedback list/detail endpoints still populate messages and attachments.
- `/uploads/feedback/*` continues to serve JPEG/PNG/GIF/WebP files through production nginx/API routing.

Setup data and login state:
- Use an authenticated admin session for `t@clinic.vn` on NK production.
- Use feedback thread `06892fc6-5ccc-4c22-ad00-fed55199e9ad` and restored file `c51c44c8-8b39-4fdc-b881-6c70711160ca.jpg` as regression evidence.
- Orphan-row backup for unrecoverable stale attachments: `/opt/tgroup/backups/feedback-orphan-attachments-20260519T0249Z.csv`.
- Capture screenshot evidence of the loaded proof image in `/feedback` after deployment.

TestSprite execution items:
- [ ] PENDING: Verify `/feedback` thread `06892fc6-5ccc-4c22-ad00-fed55199e9ad` loads the restored revenue proof image.
- [ ] PENDING: Verify new admin reply with image returns a `/uploads/feedback/*` URL that loads HTTP 200.
- [ ] PENDING: Verify file-only staff feedback and file-only staff/admin replies do not crash.
- [ ] PENDING: Verify missing-thread file replies clean up uploaded files and do not create `feedback_attachments` rows.
- [ ] PENDING: Verify delete rollback simulation does not remove physical files before DB commit.

## 2026-05-24 — Cosmetic Deposit And Payment LOB Routing

Feature/edit name:
- Cosmetic deposit wallet and customer payment API routing.

Changed URLs and API routes:
- Browser-visible surfaces: customer profile payment modal/deposit wallet, `/payment`.
- Dental API routes remain top-level: `/api/Payments`, `/api/Payments/deposits`, `/api/Payments/deposit-usage`, `/api/CustomerBalance/:id`.
- Cosmetic API routes must be used when active LOB is Cosmetic: `/api/cosmetic/Payments`, `/api/cosmetic/Payments/deposits`, `/api/cosmetic/Payments/deposit-usage`, `/api/cosmetic/Payments/:id/void`, `/api/cosmetic/Payments/:id`, `/api/cosmetic/Payments/refund`, `/api/cosmetic/CustomerBalance/:id`.

Affected data flows:
- `BusinessUnitContext.currentLOB` -> deposit hooks/customer payment hooks -> `website/src/lib/api/payments.ts` and `customerBalance.ts` -> `apiFetch` cosmetic prefix -> isolated cosmetic DB payment and balance rows.
- Cosmetic deposit creation, refund, void, update, delete, deposit usage, and service payment creation must not read or mutate dental payment rows.

User roles:
- Admin or staff with Cosmetic LOB access and payment permissions.
- Dental users and Dental active LOB remain on legacy top-level payment routes.

Happy paths:
- In Cosmetic LOB, opening a customer deposit wallet fetches deposits, deposit usage, and balance from `/api/cosmetic/*`.
- In Cosmetic LOB, creating a deposit makes the balance visible in the same payment modal/customer wallet refresh.
- In Cosmetic LOB, creating a service payment with deposit usage posts through `/api/cosmetic/Payments`.
- Dental LOB still fetches and mutates the legacy `/api/Payments*` and `/api/CustomerBalance/:id` routes.

Edge cases:
- Cosmetic customer has deposit history but zero dental balance; UI must show the cosmetic balance, not dental 0.
- Mixed/cash/bank payments with `deposit_used` must stay in the active LOB.
- Void/delete/update/refund actions must refresh from the same active LOB after mutation.
- LOB toggle changes must not keep stale dental customer payment/deposit state in Cosmetic.

Regressions:
- Dental customer payment history, wallet top-up, refund, void, delete, update, and balance display remain unchanged.
- Payment history fallback from sale orders remains unchanged for Dental and Cosmetic.
- Existing permission handling for payment add/refund/void/delete remains backend-owned and unchanged.

Setup data and login state:
- Use a dual-scope admin session with active LOB set to Cosmetic.
- Use at least one Cosmetic customer with a posted 500,000 VND deposit and one service invoice/dotkham eligible for deposit usage.
- Repeat with active LOB Dental for a known dental customer to confirm legacy route behavior.

TestSprite execution items:
- [ ] PENDING: Verify Cosmetic customer wallet opens and calls `/api/cosmetic/Payments/deposits`, `/api/cosmetic/Payments/deposit-usage`, and `/api/cosmetic/CustomerBalance/:id`.
- [ ] PENDING: Verify Cosmetic deposit creation posts to `/api/cosmetic/Payments` and refreshes the cosmetic balance in the payment modal.
- [ ] PENDING: Verify Cosmetic service payment creation with deposit usage posts to `/api/cosmetic/Payments`.
- [ ] PENDING: Verify Cosmetic deposit refund, void, delete, and update actions stay on `/api/cosmetic/Payments*`.
- [ ] PENDING: Verify Dental payment/deposit flows still use top-level `/api/Payments*` and `/api/CustomerBalance/:id`.

## 2026-05-24 — Cosmetic Appointment Save LOB Routing

Feature/edit name:
- Cosmetic appointment create/update API routing from calendar and customer-profile appointment forms.

Changed URLs and API routes:
- Browser-visible: `/calendar`, `/customers/:id` appointment create/edit surfaces.
- API routes: Cosmetic saves must call `POST /api/cosmetic/Appointments` and `PUT /api/cosmetic/Appointments/:id`; Dental saves must continue calling `POST /api/Appointments` and `PUT /api/Appointments/:id`.

Affected data flows:
- `BusinessUnitContext.currentLOB` -> `useAppointmentForm` -> `createAppointment` / `updateAppointment`.
- `BusinessUnitContext.currentLOB` -> `useAppointments` -> list/search/create/update/status/cancel appointment API calls.
- `apiFetch` receives `lob: 'cosmetic'` so it prefixes `/api/cosmetic/*`; Dental remains legacy top-level.

User roles:
- Admin or scoped staff using the Cosmetic LOB calendar/customer profile.
- Dental staff using the existing Dental appointment flows.

Happy paths:
- With active LOB Cosmetic, calendar appointment create saves through `/api/cosmetic/Appointments`.
- With active LOB Cosmetic, customer-profile appointment edit saves through `/api/cosmetic/Appointments/:id`.
- With active LOB Dental, appointment create/edit continues to use legacy `/api/Appointments`.

Edge cases:
- Switching LOB before saving must use the current active LOB, not stale state.
- Appointment search/list refreshes must use the selected LOB.
- Check-in advance, status update, and cancel actions must use the selected LOB.

Regressions:
- Dental appointment form validation, duration mapping, and appointment update behavior must remain unchanged.
- Calendar list/search filters by selected location must still work.
- Cosmetic saves must not write into Dental appointments.

Setup data and login state:
- Use an authenticated admin with both `dental` and `cosmetic` LOB access.
- Seed or create one Cosmetic customer, one Cosmetic location, and one Cosmetic service.
- Use one existing Dental appointment as a regression comparison.

TestSprite execution items:
- [ ] PENDING: `npx jest api/src/services/exports/__tests__/featureCatalog.crosscheck.test.js` passes 40/40.
- [ ] PENDING: Hand-edit one column header in any builder COLUMNS array and confirm the cross-check fails with a clear key/header mismatch message. Revert the edit.

## 2026-05-21 — Cosmetic LOB Phase-1 gap A: keyed remount of <Routes> on LOB toggle

Feature/edit name:
- App.tsx now keys the entire <Routes> subtree by currentLOB so toggling dental ↔ cosmetic forces React to unmount + remount everything beneath it. Prevents "flash of dental data" when switching LOBs.

Changed URLs and API routes:
- None. Frontend-only structural change inside `website/src/App.tsx`.

Affected data flows:
- Any data-fetching hook that reads from the LOB-aware API client will now see a fresh component instance on LOB switch, dropping in-memory state (selected rows, scroll position, partial form input). React Query / SWR caches survive because they live outside the subtree.

User roles:
- Admin users whose `partners.lob_scope` array has length ≥ 2 (the only users who can toggle).

Happy paths:
- Multi-LOB admin logs in, navigates to /customers, toggles header LOB dropdown from dental → cosmetic. Customers list reloads from cosmetic DB; no stale dental rows flicker.
- Admin toggles back to dental. Customers list reloads from dental DB; no stale cosmetic rows flicker.

Edge cases:
- Single-LOB user: header toggle never renders (gated by isMultiLOBUser); App still works because `currentLOB` stays constant and the key never changes.
- LOB switch mid-network-request: in-flight request resolves into an unmounted component; the keyed remount discards its state. Caches handle the staleness on the new key's mount.
- localStorage hydration after a hard refresh: `currentLOB` initializes from `tgclinic_lob` key in BusinessUnitContext, so the first paint already uses the correct LOB and no remount fires.

Regressions:
- Do not remove `key={currentLOB}` from `<Routes>` — `website/src/__tests__/App.remount.test.tsx` has a source-level grep assertion that fails immediately if anyone deletes it.
- Do not move the `useBusinessUnit()` call back into the legacy `<App>` body; it MUST be inside `<BusinessUnitProvider>`. The new `AppRoutes` component is where it lives.

Setup data and login state:
- Local dev: `http://127.0.0.1:5175`, login `t@clinic.vn / 123123` (Tgrouptest demo DB).
- Multi-LOB admin requires `partners.lob_scope = '{dental,cosmetic}'` on the t@clinic.vn row (migration 047 + seed already in place on feat/cosmetic-lob-nk3).

TestSprite execution items:
- [ ] PENDING: `npx vitest run src/__tests__/App.remount.test.tsx` passes 4/4 (covers smoke render, context access, source-level key prop lock, and provider hierarchy).
- [ ] PENDING: Live-browser check on `http://127.0.0.1:5175` with `t@clinic.vn` — open /customers, note a row count, toggle header LOB to cosmetic, confirm row count changes (different DB), toggle back, confirm dental rows return. No flash of opposite-LOB data during the transition. Screenshot evidence required.
- [x] DONE 2026-05-21: Live-browser verified on feat/cosmetic-lob-nk3 HEAD `1297b40e` — 20 dental → 8 cosmetic → 20 dental, no flash, no console errors. Screenshots at `docs/audits/2026-05-21-phase1-gap-a/`.

## 2026-05-21 — Cosmetic LOB Phase-1 gap B: apiFetch LOB-aware routing

Feature/edit name:
- `website/src/lib/api/core.ts` already prepends `/cosmetic` to every endpoint when `apiFetch` is called with `{ lob: 'cosmetic' }`. This test commit adds the missing regression lock so the line cannot be silently deleted.

Changed URLs and API routes:
- None modified. Existing rewrite verified: `/api/Partners` → `/api/cosmetic/Partners` when `lob === 'cosmetic'`.

Affected data flows:
- Every `useXxx` hook that passes the active LOB into `apiFetch` (e.g. via `useBusinessUnit().currentLOB`).

User roles:
- Multi-LOB admins (users with both 'dental' and 'cosmetic' in `partners.lob_scope`).

Happy paths:
- `apiFetch('/Partners', { lob: 'cosmetic' })` resolves to `http://127.0.0.1:3000/api/cosmetic/Partners` (or whatever `API_URL` is on the environment).
- `apiFetch('/Partners', { lob: 'dental' })` and `apiFetch('/Partners')` resolve to `http://127.0.0.1:3000/api/Partners`.

Edge cases:
- Query params land AFTER the LOB prefix: `apiFetch('/Partners', { lob: 'cosmetic', params: { offset: 0 } })` → `/api/cosmetic/Partners?offset=0`.
- Path params (e.g. `/Appointments/:id`) survive the prefix intact.

Regressions:
- Do NOT remove `const lobPrefix = lob === 'cosmetic' ? '/cosmetic' : '';` from `core.ts` apiFetch — the new vitest fails immediately.

TestSprite execution items:
- [ ] PENDING: `npx vitest run src/lib/api/__tests__/apiFetch.lob.test.ts` passes 5/5.

## 2026-05-21 — Cosmetic LOB Phase-1 gap C: ProtectedRoute is_ctv → /ctv redirect

Feature/edit name:
- `ProtectedRoute` in `website/src/App.tsx` already redirects authenticated users with `is_ctv === true` (or legacy camelCase `isCtv === true`) to `/ctv` before any admin route renders. This test commit adds the missing regression lock.

Changed URLs and API routes:
- None modified. Existing behavior verified.

Affected data flows:
- Every protected admin route (`/customers`, `/calendar`, `/payments`, etc.) — CTV-flagged users see the CTV dashboard instead.

User roles:
- Partners with `partners.is_ctv = true`.

Happy paths:
- A `is_ctv: true` user on `/customers` is redirected and the CTV dashboard renders.
- A legacy `isCtv: true` user on `/calendar` is redirected the same way.
- A normal admin user (is_ctv false) sees the requested admin route.

Edge cases:
- Both `is_ctv` (snake_case from the API) and `isCtv` (legacy camelCase from older code paths) are honored — the OR condition `user?.is_ctv || user?.isCtv` handles either.

Regressions:
- Do NOT delete the `is_ctv` gate or the `<Navigate to="/ctv" replace />` JSX — source-level grep in the vitest fails immediately.

TestSprite execution items:
- [ ] PENDING: `npx vitest run src/__tests__/ProtectedRoute.ctv.test.tsx` passes 4/4.
- [ ] PENDING: Live-browser check on `http://127.0.0.1:5175` — set `partners.is_ctv = true` on a test user, log in, confirm hard redirect to `/ctv` from any admin URL. Screenshot evidence required.

## 2026-05-21 — Cosmetic LOB Phase-1 gap D: /api/cosmetic/* mount guards (503 + 403)

Feature/edit name:
- `api/src/server.js` already gates the `/api/cosmetic/*` mount: when `COSMETIC_LOB_ENABLED !== 'true'` the entire family returns 503 `COSMETIC_LOB_DISABLED`; when on, `requireLobScope('cosmetic')` returns 403 `S_LOB_FORBIDDEN` for any user missing the cosmetic scope or flagged `is_ctv`. This test commit adds the missing regression lock.

Changed URLs and API routes:
- None modified. Existing gate composition verified.

Affected data flows:
- Every cosmetic mirror route mounted via the cosmetic router (`/Partners`, `/Appointments`, `/Payments`, `/Employees`, `/Products`, `/SaleOrders`, etc.).

User roles:
- Admin partners with `partners.lob_scope ∋ 'cosmetic'` clear the gate.
- Dental-only admins and CTV-flagged users are blocked at the gate.

Happy paths:
- Flag off + any user → 503 `COSMETIC_LOB_DISABLED` on any cosmetic endpoint.
- Flag on + dental-only admin → 403 `S_LOB_FORBIDDEN` with `required='cosmetic'` and `has=['dental']`.
- Flag on + CTV user (regardless of scope) → 403 `S_LOB_FORBIDDEN` with `is_ctv=true`.
- Flag on + dental+cosmetic admin → request clears the gate.

Edge cases:
- Test does not load `api/src/server.js` because the jest haste map collides across sibling worktrees sharing the `@tgroup/contracts` package name (tooling, not code). A structural regex on `server.js` catches deletion of the flag check, the 503 branch, the `requireLobScope('cosmetic')` call, or the `app.use('/api/cosmetic', ...)` mount.

Regressions:
- Do NOT remove `COSMETIC_LOB_ENABLED === 'true'` check, the 503 fallback, the `requireLobScope('cosmetic')` call, or the `/api/cosmetic` mount from server.js.

TestSprite execution items:
- [ ] PENDING: `npx jest --testPathPatterns=cosmeticLobGuards` passes 9/9.
- [ ] PENDING: With `COSMETIC_LOB_ENABLED=false` set in `api/.env`, restart API and `curl http://127.0.0.1:3002/api/cosmetic/Partners` — expect 503 `COSMETIC_LOB_DISABLED`. With flag=true and a dental-only user token, expect 403 `S_LOB_FORBIDDEN`.

---

# TestSprite Plan: Cosmetic LOB v2 Phase 2

Feature/edit name: Cosmetic LOB v2 Phase 2 — Admin Permissions + Transactional Seed (2026-05-21)

Changed files:
- `api/migrations/048_grant_lob_permissions_to_admin.sql` — New migration that grants cosmetic.access, dental.access, and lob.crossview to the Admin group (UUID 11111111-0000-0000-0000-000000000001).
- `api/scripts/seed-cosmetic-lob-transactional.js` — New seed script that populates tcosmetic_demo with 2-3 customers, 3-5 appointments (past/today/future), 3-5 payments, earnings rows with source='ctv', and refund reversals.
- `api/src/__tests__/adminLobPermissions.test.js` — New Jest test file (9 assertions) verifying migration 048 structure, naming, permission keys, idempotency, admin UUID, and rollback instructions.
- `api/src/__tests__/cosmeticTransactionalSeed.test.js` — New Jest test file (15 assertions) verifying seed script structure, INSERT statements, CTV referrer validation, source='ctv' attribution, refund logic, and --dry-run support.
- `docs/MIGRATIONS.md` — Updated migration index to include 048 and updated header sync note.
- `docs/TEST-MATRIX.md` — Updated header note and added Phase 2 test entries.
- `docs/CHANGELOG.md` — Added Phase-2 Task-1 and Task-2 entries with full descriptions and test counts.

Affected data flows:
- Admin login now receives cosmetic.access permission (grants /api/cosmetic/* route access) and lob.crossview permission (enables "also a cosmetic client" badge).
- tcosmetic_demo seeded with transactional data for CTV dashboard: customers with referred_by_ctv_id set (D13 path), appointments, payments, and earnings rows with source='ctv' and refund reversals.
- Both migrations are idempotent (ON CONFLICT DO NOTHING) and safe to re-run.

User roles:
- Multi-LOB Admin (lob_scope=['dental','cosmetic']) receives cosmetic.access via migration 048 and can now access /api/cosmetic/* routes.
- CTV users with is_ctv=true see CTV earnings attributed by D13 recipient-resolution algorithm.

Happy paths:
- Both Jest test suites pass: `npx jest api/src/__tests__/{adminLobPermissions,cosmeticTransactionalSeed}.test.js` → 24/24 tests passing.
- Migration 048 can be applied to both tdental_demo and tcosmetic_demo without errors.
- Seed script can be run with `node api/scripts/seed-cosmetic-lob-transactional.js` (creates data) or `node ... --dry-run` (validates structure only).
- Admin user gets cosmetic.access, dental.access, and lob.crossview permissions after migration 048 is applied.
- tcosmetic_demo receives transactional data with 2-3 customers, 3-5 appointments/payments/earnings, and at least one refund reversal.

Edge cases:
- CTV referrer (ctv-demo@clinic.vn) must exist in cosmetic DB before seed script runs; script validates and fails gracefully with error message.
- Consultations table may not exist in tcosmetic_demo schema; seed script handles with try/catch and continues without consulting cards.
- Refund reversals are negative-amount earnings rows, testing append-only ledger pattern.

Regressions to prevent:
- Do NOT remove migration 048 from api/migrations/ or delete the two test files.
- Do NOT change the permission keys (cosmetic.access, dental.access, lob.crossview) without updating all three locations (migration, permission-registry, tests).
- Do NOT remove the CTV referrer validation or refund reversal logic from the seed script.
- Do NOT remove idempotency (ON CONFLICT DO NOTHING) from migration or seed script.

Setup data and login state:
- Local dev environment with api/migrations/ and api/scripts/ accessible.
- Homebrew Postgres running on 127.0.0.1:5433 with tdental_demo and tcosmetic_demo databases.
- npm/node with Jest installed in api/ directory.

TestSprite execution items:
- [x] PASS: `npm --prefix api test -- api/src/__tests__/adminLobPermissions.test.js` passes 9/9 tests - migration 048 structure verified.
- [x] PASS: `npm --prefix api test -- api/src/__tests__/cosmeticTransactionalSeed.test.js` passes 15/15 tests - seed script structure verified.
- [x] PASS: Both test suites combined pass 24/24 tests - `npm --prefix api test -- api/src/__tests__/{adminLobPermissions,cosmeticTransactionalSeed}.test.js`.
- [ ] PENDING: Apply migration 048 to local tdental_demo — `PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo < api/migrations/048_grant_lob_permissions_to_admin.sql` completes without errors.
- [ ] PENDING: Apply migration 048 to local tcosmetic_demo — same as above but target tcosmetic_demo.
- [ ] PENDING: Run seed script with `cd api && node scripts/seed-cosmetic-lob-transactional.js` — creates appointments, payments, earnings, and refund reversals in tcosmetic_demo without errors.
- [ ] PENDING: Run seed script with `cd api && node scripts/seed-cosmetic-lob-transactional.js --dry-run` — validates script structure and exits with code 0 without requiring DB connection.
- [ ] PENDING: Query tcosmetic_demo to verify transactional data — `SELECT COUNT(*) FROM appointments WHERE created_at > NOW() - INTERVAL '1 hour'` shows 2-3 new appointments.
- [ ] PENDING: Query tcosmetic_demo earnings table — `SELECT COUNT(*) FROM earnings WHERE source='ctv'` shows 3-5 CTV earnings; `SELECT COUNT(*) FROM earnings WHERE amount < 0` shows >=1 refund reversals.
- [ ] PENDING: Verify admin partner has new permissions after migration 048 — `SELECT permission FROM group_permissions WHERE group_id='11111111-0000-0000-0000-000000000001' ORDER BY permission` includes cosmetic.access, dental.access, lob.crossview.
- [x] DONE 2026-05-21: Sent a signed no-customer-data live webhook smoke test through `api/src/services/larkNotifier.js`; Lark `T-Group` displayed the `TGroup Feedback` bot message with `/feedback` link.
- [ ] PENDING: Submit manual feedback from any authenticated page and confirm a new message appears in Lark `T-Group`.
- [ ] PENDING: Submit manual feedback with an image and confirm Lark shows the file count while the attachment still renders from `/feedback`.
- [ ] PENDING: Trigger a safe frontend telemetry error in a test environment and confirm the auto-detected thread plus Lark alert appear.
- [ ] PENDING: Temporarily unset the webhook env in a local/test environment and confirm `POST /api/Feedback` still returns `201`.
- [x] DONE 2026-05-21: `npm test -- --runInBand tests/feedbackAttachments.test.js tests/telemetryAuth.test.js src/services/__tests__/larkNotifier.test.js tests/envExampleValidation.test.js` passed from `api/` (Jest ran 54 suites, 703 tests).

---

# TestSprite Plan: Feedback Login Hint + Vertical Chart Labels (2026-05-21, v0.32.37)

Feature/edit name: FeedbackWidget login hint + BarChart vertical labels

Changed URLs and resources:
- No API routes changed.
- Frontend: `website/src/components/shared/FeedbackWidget.tsx` (new login-hint bubble), `website/src/contexts/AuthContext.tsx` (clears `sessionStorage.tg_feedback_hint_dismissed` on login), `website/src/components/reports/BarChart.tsx` (new `labelOrientation` prop, auto-vertical when bar count >= 8), `website/src/pages/reports/ReportsRevenue.tsx` (cashFlowTrend explicitly `labelOrientation="vertical"`).
- i18n keys added: `feedback.loginHintTitle`, `feedback.loginHintBody`, `feedback.loginHintDismiss` (EN + VI).

Data flow:
- AuthContext.login → removes `sessionStorage['tg_feedback_hint_dismissed']`.
- FeedbackWidget mount (after `user` becomes truthy) → reads sessionStorage, sets `showLoginHint=true` when key absent.
- User clicks X or clicks the feedback icon → writes `sessionStorage['tg_feedback_hint_dismissed']='1'`, hides hint.
- Next logout → fresh login resets the flag, hint shows again.

Roles affected: all authenticated users (any role with access to the dashboard chrome).

URL paths in scope: `/` (Overview) and any authenticated page that renders the Layout (the header is global). `/reports/revenue` for the chart verification.

Edge cases:
- Reload mid-session must NOT re-show the hint (sessionStorage survives reload).
- Closing the tab + reopening: hint shows again (sessionStorage cleared by tab close).
- Logout + login in same tab: hint shows again (AuthContext.login clears the key).
- BarChart with `data.length < 8` keeps horizontal labels.
- BarChart with `data.length >= 8` rotates labels -90°.
- BarChart with explicit `labelOrientation="vertical"` rotates regardless of data length.

Regressions to monitor:
- FeedbackWidget unread badge still works.
- FeedbackWidget panel still opens on icon click.
- Other BarChart consumers (ReportsAppointments weeklyTrend, ReportsDashboard months, ReportsRevenue trendMonths) render correctly with auto-detection.
- Chart height with vertical labels extends by 56px to reserve the label slot — confirm no card overflow.

Setup data: any account with auth (e.g. `t@clinic.vn / 123123` on local/staging/prod).

TestSprite execution items:
- [x] DONE 2026-05-21: Local browser verified VI hint shows on fresh login (screenshot: feedback-hint-local-vi.png).
- [x] DONE 2026-05-21: Local browser verified Xu hướng dòng tiền chart labels are rotated -90° (computed transform = `matrix(0, -1, 1, 0, 0, 4)`) with full text "22 thg 4" etc.; screenshot: cashflow-chart-verified.png.
- [ ] PENDING: After deploy to NK2 / NK, log in as t@clinic.vn, confirm hint shows in EN locale too.
- [ ] PENDING: After deploy, click X, reload, confirm hint stays dismissed.
- [ ] PENDING: After deploy, logout + log back in, confirm hint reappears.
- [ ] PENDING: After deploy, open /reports/revenue, confirm cash flow chart dates readable on production data (will have ~30 bars there).
- [ ] PENDING: Regression on /reports/appointments weekly trend — confirm labels readable when data spans many weeks.

## Feature: CTV signup + MLM commission config (feat/ctv-mlm-commission, 2026-05-22)

- [x] PASS: Migration 049 applies cleanly to tdental_demo + tcosmetic_demo; level config seeded 72.7/14.5/7.3/3.6/1.8, settings default 20% — evidence: psql apply + seed select.
- [x] PASS: commissionEngine unit tests (9 jest) — CTV chain split 70/30, salestaff single full-pool row, refund reversal — evidence: jest 9/9 green.
- [x] PASS: TMV/NK3 live `/commission` error reproduced before fix: Cosmetic LOB requested `GET /api/cosmetic/CommissionConfig` and received 404. Screenshot: `output/playwright/tmv-commission-error-20260523/commission-live.png`.
- [x] PASS: After live hotfix, TMV/NK3 `/commission` under Cosmetic LOB loads Config without error and `GET /api/cosmetic/CommissionConfig` returns 200. Screenshot: `output/playwright/tmv-commission-error-20260523/commission-live-after.png`.
- [x] PASS: After live hotfix, TMV/NK3 `/commission` → CTVs tab loads and `GET /api/cosmetic/Ctvs` returns 200, not 404. Screenshot: `output/playwright/tmv-commission-error-20260523/commission-live-ctvs-after.png`.
- [x] PASS: Full api jest suite + website depcruise + tsc + vite build all green (no regression) — evidence: background runs exit 0.
- [ ] PENDING (NK3 live, https://76-13-16-68.sslip.io): log in t@clinic.vn, open /commission → Config tab, change a level %, set enabled sum >100 → Save blocked with B_LEVEL_SUM_EXCEEDS_100; set ≤100 → saves.
- [ ] PENDING (NK3 live): /commission → CTVs tab, click "+ Add CTV", create one, confirm it appears in the list; suspend then reactivate.
- [ ] PENDING (NK3 live): log in as a CTV, /ctv header "+ Client" → refer a customer (success); "+ CTV" → recruit (success), confirm new CTV can log in (employee=true).
- [ ] PENDING (NK3 live): collect a payment on a service with a referral % for a CTV-referred client; confirm earnings rows split across the upline per config.
- [ ] PENDING (NK3 live): confirm NK + NK2 untouched (no deploy there).

## Feature: CTV referral claim + eligibility (feat/ctv-mlm-commission, 2026-05-23)

- [x] PASS: api jest full suite green; web tsc + depcruise + vite build green — evidence: exit 0 across all.
- [x] PASS: engine credits CTV only while claim active (lapsed → falls through, no credit); 11 engine + 14 claim-helper jest cases.
- [x] PASS: POST /api/ctv/bookings unit tests — block (B_CLIENT_CLAIMED) + new-client create — 2 jest cases.
- [ ] PENDING (NK3 live): set commission_settings.referral_start_product_id to a created "Referral Start" product on the smoketest DB(s).
- [ ] PENDING (NK3 live, Origin header): CTV books a new client → client created + Referral Start card + appointment; profile shows "Người giới thiệu (CTV)".
- [ ] PENDING (NK3 live): a second CTV booking the same active client → 400 B_CLIENT_CLAIMED.
- [ ] PENDING: Verify Cosmetic `/calendar` appointment create sends `POST /api/cosmetic/Appointments` and appears after refresh under Cosmetic only.
- [ ] PENDING: Verify Cosmetic `/calendar` appointment update sends `PUT /api/cosmetic/Appointments/:id`.
- [ ] PENDING: Verify Cosmetic `/customers/:id` appointment save uses `/api/cosmetic/Appointments`.
- [ ] PENDING: Verify Dental `/calendar` appointment create/update still uses top-level `/api/Appointments`.
- [ ] PENDING: Verify Cosmetic appointment search/list, check-in advance, status update, and cancel actions stay inside `/api/cosmetic/Appointments`.

## 2026-05-22 — Cosmetic LOB write-isolation sweep (25+ paths)

Feature/edit name:
- Thread the active LOB through every cosmetic-mirrorable write/read in the frontend so cosmetic-mode operations hit /api/cosmetic/* (cosmetic DB) instead of /api/* (dental DB).

Changed URLs and API routes:
- No new routes on the dental side. Backend `api/src/server.js` now ALSO mounts under the cosmetic router: `/DotKhams`, `/CustomerBalance`, `/CustomerSources`, `/ExternalCheckups`, `/settings` (bank). Frontend writes/reads now send `lob` so apiFetch routes to `/api/cosmetic/*` when LOB=cosmetic.

Affected data flows:
- Appointments create/update/check-in/status/cancel; partners create/update/soft+hard-delete/resolve/check-unique; employees create/update/delete; customer profile reads (partner, appointments, balance); external checkups (patient + checkup upload); customer sources CRUD; sale orders create/update/state/delete-line/fetch-lines; monthly plans create/update/delete/mark-paid; dotKhams read; bank settings read+write; payment-proof upload.

User roles:
- Multi-LOB admins (lob_scope ∋ 'cosmetic'); cosmetic staff.

Happy paths:
- In Cosmetic mode, creating/editing an appointment, customer, employee, service record, payment, deposit, monthly-plan installment, customer source, or bank setting persists to tcosmetic_smoketest, not tdental_smoketest.
- Switching to Dental mode performs the same operations against the dental DB.

Edge cases:
- Permissions, system preferences, and website pages are intentionally LOB-global (one shared system) — they do NOT thread lob.
- The cross-LOB "also a X client" badge probe is intentionally cross-DB and unchanged.
- External checkup upload uses a raw multipart fetch; it now manually prepends /cosmetic when LOB=cosmetic to mirror apiFetch.

Regressions:
- Do not remove the trailing `lob` arg from any payment/partner/employee/appointment/saleOrder/monthlyPlan write — cosmetic-mode writes would silently hit dental and FK-error or corrupt data.
- Global vitest setup (`src/test/setup.ts`) now mocks BusinessUnitContext by default; per-file mocks still override.

TestSprite execution items:
- [ ] PENDING: `npx tsc --noEmit` clean (verified locally).
- [ ] PENDING: `npx vitest run src/hooks src/lib/api/__tests__ src/__tests__/App.remount.test.tsx src/__tests__/ProtectedRoute.ctv.test.tsx` — affected hook/API suites green (verified: 43/43 on the touched files).
- [ ] PENDING: Live on NK3 — in Cosmetic mode create a customer, an appointment, and a payment; query tcosmetic_smoketest to confirm the rows landed there and tdental_smoketest is unchanged.
