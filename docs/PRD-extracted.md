# Extracted PRD For TestSprite

Source scope: this file describes only behavior found in the code under `/Users/thuanle/Documents/TamTMV/Tgrouptest`. Every feature, route, backend endpoint, and business rule below cites the source file and line that exposes it. Anything that was missing, contradictory, placeholder-only, or stubbed is listed under `OPEN QUESTIONS` or `Known-broken list`.

Target TestSprite site: `https://tmv.2checkin.com` for NK3 Cosmetic runs. The code supports local API base `http://127.0.0.1:3000/api` by default through `VITE_API_URL` fallback (`website/src/lib/api/core.ts:6`) and routes Cosmetic API calls through `/api/cosmetic/*` when the API client receives `lob: 'cosmetic'` (`website/src/lib/api/core.ts:57`).

## Discovery Inventory

### Client/public routes

| Route | Entry-point file | Guard/source |
|---|---|---|
| `/login` | `website/src/pages/Login.tsx:42` | Public route in `website/src/App.tsx:174`; authenticated users redirect away in `website/src/App.tsx:134`. |
| `/welcome` | `website/src/pages/Landing/Landing.tsx:45` | Public route in `website/src/App.tsx:176`; booking modal opens from landing CTA in `website/src/pages/Landing/Landing.tsx:71`. |
| `/ctv/join` | `website/src/pages/CTV/JoinCtv.tsx:13` | Public route in `website/src/App.tsx:178`; resolves referral code in `website/src/pages/CTV/JoinCtv.tsx:32`. |
| `/test/address` | `website/src/components/shared/AddressAutocompleteTest.tsx:37` | Dev route in `website/src/App.tsx:179`; Google Places calls are inside `website/src/components/shared/AddressAutocomplete.tsx:107`. |
| `/ctv` | `website/src/pages/CTV/CtvDashboard.tsx:41` | CTV-only route in `website/src/App.tsx:372`; `CTVRouteGuard` requires auth and `user.isCtv` in `website/src/App.tsx:122`. |

### Admin routes

| Route | Entry-point file | Permission/source |
|---|---|---|
| `/` | `website/src/pages/Overview.tsx:24` | Route in `website/src/App.tsx:185`; permission `overview.view` in `website/src/constants/index.ts:122`. |
| `/calendar` | `website/src/pages/Calendar.tsx:26` | Route in `website/src/App.tsx:195`; permission `calendar.view` in `website/src/constants/index.ts:123`. |
| `/customers` | `website/src/pages/Customers.tsx:33` | Route in `website/src/App.tsx:206`; permission `customers.view` in `website/src/constants/index.ts:124`. |
| `/customers/:id` | `website/src/pages/Customers.tsx:33` | Route in `website/src/App.tsx:216`; same `customers.view` permission in `website/src/constants/index.ts:124`. |
| `/employees` | `website/src/pages/Employees/index.tsx:27` | Route in `website/src/App.tsx:227`; permission `employees.view` in `website/src/constants/index.ts:125`. |
| `/locations` | `website/src/pages/Locations.tsx:1` | Route in `website/src/App.tsx:237`; permission `locations.view` in `website/src/constants/index.ts:126`. |
| `/services` | `website/src/pages/Services/index.tsx:37` | Route in `website/src/App.tsx:247`; permission `customers.edit` in `website/src/constants/index.ts:127`. |
| `/service-catalog` | `website/src/pages/ServiceCatalog.tsx:29` | Route in `website/src/App.tsx:257`; permission `services.view` in `website/src/constants/index.ts:128`. |
| `/website` | `website/src/pages/Website.tsx:1` | Route in `website/src/App.tsx:267`; permission `website.view` in `website/src/constants/index.ts:129`. |
| `/settings` | `website/src/pages/Settings/index.tsx:28` | Route in `website/src/App.tsx:277`; permission `settings.view` in `website/src/constants/index.ts:140`. |
| `/relationships` | `website/src/pages/Relationships.tsx:1` | Route in `website/src/App.tsx:287`; permission `permissions.view` in `website/src/constants/index.ts:142`. |
| `/commission` | `website/src/pages/Commission.tsx:19` | Route in `website/src/App.tsx:297`; permission `commission.view` in `website/src/constants/index.ts:139`. |
| `/reports` | `website/src/pages/Reports.tsx:1` | Parent route in `website/src/App.tsx:307`; permission `reports.view` in `website/src/constants/index.ts:130`; index redirects to dashboard in `website/src/App.tsx:316`. |
| `/reports/dashboard` | `website/src/pages/reports/ReportsDashboard.tsx:1` | Child route in `website/src/App.tsx:317`; permission `reports.view` in `website/src/constants/index.ts:131`. |
| `/reports/revenue` | `website/src/pages/reports/ReportsRevenue.tsx:1` | Child route in `website/src/App.tsx:318`; permission `reports.view` in `website/src/constants/index.ts:132`. |
| `/reports/appointments` | `website/src/pages/reports/ReportsAppointments.tsx:1` | Child route in `website/src/App.tsx:319`; permission `reports.view` in `website/src/constants/index.ts:133`. |
| `/reports/doctors` | `website/src/pages/reports/ReportsDoctors.tsx:1` | Child route in `website/src/App.tsx:320`; permission `reports.view` in `website/src/constants/index.ts:134`. |
| `/reports/customers` | `website/src/pages/reports/ReportsCustomers.tsx:1` | Child route in `website/src/App.tsx:321`; permission `reports.view` in `website/src/constants/index.ts:135`. |
| `/reports/locations` | `website/src/pages/reports/ReportsLocations.tsx:1` | Child route in `website/src/App.tsx:322`; permission `reports.view` in `website/src/constants/index.ts:136`. |
| `/reports/services` | `website/src/pages/reports/ReportsServices.tsx:1` | Child route in `website/src/App.tsx:323`; permission `reports.view` in `website/src/constants/index.ts:137`. |
| `/reports/employees` | `website/src/pages/reports/ReportsEmployees.tsx:1` | Child route in `website/src/App.tsx:324`; permission `reports.view` in `website/src/constants/index.ts:138`. |
| `/notifications` | `website/src/pages/Notifications.tsx:1` | Route in `website/src/App.tsx:328`; permission `notifications.view` in `website/src/constants/index.ts:141`. |
| `/permissions` | `website/src/pages/PermissionBoard/PermissionBoard.tsx:16` | Route in `website/src/App.tsx:338`; permission `permissions.view` in `website/src/constants/index.ts:143`. |
| `/payment` | `website/src/pages/Payment.tsx:41` | Route in `website/src/App.tsx:348`; permission `payment.view` in `website/src/constants/index.ts:144`. |
| `/feedback` | `website/src/pages/Feedback.tsx:1` | Route in `website/src/App.tsx:358`; permission `permissions.view` in `website/src/constants/index.ts:145`. |
| Protected catch-all | `website/src/App.tsx:368` | Redirects to `/`; no feature entry. |

Navigation-only groups are not routes: `/clinic`, `/team`, and `/admin` are navigation group paths in `website/src/constants/index.ts:169`, `website/src/constants/index.ts:179`, and `website/src/constants/index.ts:204`.

### Backend endpoints

Full path = base/mount + suffix. Suffix `/` means the base path itself. Cosmetic mirror routes are conditional on `COSMETIC_LOB_ENABLED=true` and are additionally gated by `requireLobScope('cosmetic')`, `attachCosmeticDb`, `runWithLob`, and `requirePermission('cosmetic.access')` in `api/src/server.js:218` through `api/src/server.js:268`.

| Base / mount | Methods + suffixes |
|---|---|
| `/api/IrConfigParameters` (`api/src/server.js:166`) | `GET /GetParam` (`api/src/routes/config.js:5`); `POST /GetParam` (`api/src/routes/config.js:9`). |
| `/api/Companies` (`api/src/server.js:167`) | `GET /` (`api/src/routes/companies.js:7`). |
| `/api/Partners` (`api/src/server.js:168`) | `GET /` (`api/src/routes/partners.js:12`); `GET /check-unique` (`api/src/routes/partners.js:14`); `GET /resolve` (`api/src/routes/partners.js:15`); `GET /:id` (`api/src/routes/partners.js:16`); `GET /:id/GetKPIs` (`api/src/routes/partners.js:17`); `POST /` (`api/src/routes/partners.js:18`); `PUT /:id` (`api/src/routes/partners.js:19`); `PATCH /:id/soft-delete` (`api/src/routes/partners.js:20`); `DELETE /:id/hard-delete` (`api/src/routes/partners.js:21`). |
| `/api/SaleOrders` (`api/src/server.js:169`) | `GET /` (`api/src/routes/saleOrders.js:17`); `GET /lines` (`api/src/routes/saleOrders.js:174`); `GET /:id` (`api/src/routes/saleOrders.js:335`); `POST /` (`api/src/routes/saleOrders.js:342`); `PATCH /:id/state` (`api/src/routes/saleOrders.js:349`); `PATCH /:id` (`api/src/routes/saleOrders.js:351`). |
| `/api/Appointments` (`api/src/server.js:170`) | `GET /` (`api/src/routes/appointments.js:10`); `GET /:id` (`api/src/routes/appointments.js:11`); `POST /` (`api/src/routes/appointments.js:12`); `PUT /:id` (`api/src/routes/appointments.js:13`). |
| `/api/CustomerReceipts` (`api/src/server.js:171`) | `GET /` (`api/src/routes/customerReceipts.js:13`); `GET /:id` (`api/src/routes/customerReceipts.js:153`). |
| `/api/DotKhams` (`api/src/server.js:172`) | `GET /` (`api/src/routes/dotKhams.js:12`); `GET /:id` (`api/src/routes/dotKhams.js:167`). |
| `/api/AccountPayments` (`api/src/server.js:173`) | `GET /` (`api/src/routes/accountPayments.js:13`); `GET /:id` (`api/src/routes/accountPayments.js:187`). |
| `/api/CashBooks` (`api/src/server.js:174`) | `GET /GetDetails` (`api/src/routes/cashbooks.js:14`); `GET /GetSumary` (`api/src/routes/cashbooks.js:167`); `GET /:id` (`api/src/routes/cashbooks.js:243`). |
| `/api/Receipts` (`api/src/server.js:175`) | `GET /` (`api/src/routes/receipts.js:14`); `GET /:id` (`api/src/routes/receipts.js:183`); `GET /:id/GetPayments` (`api/src/routes/receipts.js:250`). |
| `/api/AccountJournals` (`api/src/server.js:176`) | `GET /` (`api/src/routes/journals.js:14`); `GET /:id` (`api/src/routes/journals.js:96`); `GET /:id/GetBalance` (`api/src/routes/journals.js:150`). |
| `/api/StockPickings` (`api/src/server.js:177`) | `GET /` (`api/src/routes/stockPickings.js:18`); `GET /:id` (`api/src/routes/stockPickings.js:202`); `POST /` (`api/src/routes/stockPickings.js:269`); `PUT /:id` (`api/src/routes/stockPickings.js:329`); `DELETE /:id` (`api/src/routes/stockPickings.js:380`). |
| `/api/Commissions` (`api/src/server.js:179`) | `GET /` (`api/src/routes/commissions.js:15`); `GET /SaleOrderLinePartnerCommissions` (`api/src/routes/commissions.js:138`); `GET /:id` (`api/src/routes/commissions.js:235`); `GET /:id/Histories` (`api/src/routes/commissions.js:297`). |
| `/api/CommissionConfig` (`api/src/server.js:180`) | `GET /` (`api/src/routes/commissionConfig.js:31`); `PUT /` (`api/src/routes/commissionConfig.js:51`). |
| `/api/Ctvs` (`api/src/server.js:181`) | `GET /` (`api/src/routes/ctvs.js:34`); `GET /options` (`api/src/routes/ctvs.js:85`); `GET /:id/hierarchy` (`api/src/routes/ctvs.js:123`); `PATCH /:id` (`api/src/routes/ctvs.js:145`); `PUT /:id` (`api/src/routes/ctvs.js:185`). |
| `/api/Earnings` (`api/src/server.js:182`) | `GET /` (`api/src/routes/earnings.js:107`). |
| `/api/Payouts` (`api/src/server.js:183`) | `GET /` (`api/src/routes/payouts.js:138`); `POST /` (`api/src/routes/payouts.js:177`); `POST /upload-receipt` (`api/src/routes/payouts.js:248`); `PATCH /:id` (`api/src/routes/payouts.js:262`). |
| `/api/NewClients` (`api/src/server.js:184`) | `GET /` (`api/src/routes/newClients.js:30`). |
| `/api/HrPayslips` (`api/src/server.js:185`) | `GET /` (`api/src/routes/hrPayslips.js:14`); `GET /Runs` (`api/src/routes/hrPayslips.js:197`); `GET /Structures` (`api/src/routes/hrPayslips.js:247`); `GET /:id` (`api/src/routes/hrPayslips.js:282`). |
| `/api/Employees` (`api/src/server.js:186`) | `GET /` (`api/src/routes/employees.js:16`); `GET /:id` (`api/src/routes/employees.js:137`); `POST /` (`api/src/routes/employees/mutations.js:14`); `PUT /:id` (`api/src/routes/employees/mutations.js:133`); `DELETE /:id` (`api/src/routes/employees/mutations.js:290`). |
| `/api/Products` (`api/src/server.js:187`) | `GET /` (`api/src/routes/products.js:50`); `GET /:id` (`api/src/routes/products.js:176`); `POST /` (`api/src/routes/products.js:229`); `PUT /:id` (`api/src/routes/products.js:268`); `DELETE /:id` (`api/src/routes/products.js:334`). |
| `/api/ProductCategories` (`api/src/server.js:188`) | `GET /` (`api/src/routes/productCategories.js:19`); `POST /` (`api/src/routes/productCategories.js:96`); `PUT /:id` (`api/src/routes/productCategories.js:133`); `DELETE /:id` (`api/src/routes/productCategories.js:193`). |
| `/api/SaleOrderLines` (`api/src/server.js:189`) | `GET /` (`api/src/routes/saleOrderLines.js:20`); `DELETE /:id` (`api/src/routes/saleOrderLines.js:231`). |
| `/api/DashboardReports` (`api/src/server.js:190`) | `POST /GetSumary` (`api/src/routes/dashboardReports.js:58`). |
| `/api/Permissions` (`api/src/server.js:191`) | `GET /groups` (`api/src/routes/permissions.js:11`); `POST /groups` (`api/src/routes/permissions.js:44`); `PUT /groups/:groupId` (`api/src/routes/permissions.js:92`); `GET /employees` (`api/src/routes/permissions.js:151`); `PUT /employees/:employeeId` (`api/src/routes/permissions.js:253`); `GET /resolve/:employeeId` (`api/src/routes/permissions.js:386`). |
| `/api/Auth` (`api/src/server.js:192`) | `POST /login` (`api/src/routes/auth.js:84`); `GET /me` (`api/src/routes/auth.js:195`); `POST /change-password` (`api/src/routes/auth.js:239`). |
| `/api/Payments` (`api/src/server.js:193`) | `GET /` (`api/src/routes/payments.js:17`); `GET /deposits` (`api/src/routes/payments.js:18`); `GET /deposit-usage` (`api/src/routes/payments.js:19`); `GET /:id` (`api/src/routes/payments.js:20`); `POST /` (`api/src/routes/payments.js:23`); `POST /refund` (`api/src/routes/payments.js:192`); `PATCH /:id` (`api/src/routes/payments.js:251`); `DELETE /:id` (`api/src/routes/payments.js:310`); `POST /:id/void` (`api/src/routes/payments.js:392`); `POST /:id/proof` (`api/src/routes/payments.js:470`). |
| `/api/CustomerBalance` (`api/src/server.js:196`) | `GET /:id` (`api/src/routes/customerBalance.js:10`). |
| `/api/MonthlyPlans` (`api/src/server.js:197`) | `GET /` (`api/src/routes/monthlyPlans.js:13`); `GET /:id` (`api/src/routes/monthlyPlans.js:126`); `POST /` (`api/src/routes/monthlyPlans.js:174`); `PUT /:id` (`api/src/routes/monthlyPlans.js:270`); `DELETE /:id` (`api/src/routes/monthlyPlans.js:410`); `PUT /:id/installments/:installmentId/pay` (`api/src/routes/monthlyPlans.js:421`). |
| `/api/CustomerSources` (`api/src/server.js:198`) | `GET /` (`api/src/routes/customerSources.js:12`); `GET /:id` (`api/src/routes/customerSources.js:67`); `POST /` (`api/src/routes/customerSources.js:95`); `PUT /:id` (`api/src/routes/customerSources.js:120`); `DELETE /:id` (`api/src/routes/customerSources.js:161`). |
| `/api/Places` (`api/src/server.js:199`) | `GET /autocomplete` (`api/src/routes/places.js:9`); `GET /details` (`api/src/routes/places.js:41`). |
| `/api/SystemPreferences` (`api/src/server.js:200`) | `GET /` (`api/src/routes/systemPreferences.js:12`); `GET /:key` (`api/src/routes/systemPreferences.js:65`); `POST /` (`api/src/routes/systemPreferences.js:84`); `PUT /:key` (`api/src/routes/systemPreferences.js:115`); `DELETE /:key` (`api/src/routes/systemPreferences.js:156`); `POST /bulk` (`api/src/routes/systemPreferences.js:167`). |
| `/api/WebsitePages` (`api/src/server.js:201`) | `GET /` (`api/src/routes/websitePages.js:13`); `GET /:id` (`api/src/routes/websitePages.js:64`); `POST /` (`api/src/routes/websitePages.js:83`); `PUT /:id` (`api/src/routes/websitePages.js:119`); `DELETE /:id` (`api/src/routes/websitePages.js:201`). |
| `/api/settings/bank` (`api/src/server.js:202`) | `GET /` (`api/src/routes/bankSettings.js:12`); `PUT /` (`api/src/routes/bankSettings.js:46`). |
| `/api/ExternalCheckups` (`api/src/server.js:203`) | `GET /images/:imageName` (`api/src/routes/externalCheckups.js:27`); `GET /:customerCode` (`api/src/routes/externalCheckups.js:72`); `POST /:customerCode/patient` (`api/src/routes/externalCheckups.js:150`); `POST /:customerCode/health-checkups` (`api/src/routes/externalCheckups.js:175`). |
| `/api/face` (`api/src/server.js:204`) | `POST /recognize` (`api/src/routes/faceRecognition.js:42`); `POST /register` (`api/src/routes/faceRecognition.js:73`); `GET /status/:partnerId` (`api/src/routes/faceRecognition.js:212`). |
| `/api/Feedback` (`api/src/server.js:205`) | `GET /unread-count` (`api/src/routes/feedback/userRoutes.js:29`); `POST /` (`api/src/routes/feedback/userRoutes.js:72`); `GET /my` (`api/src/routes/feedback/userRoutes.js:132`); `GET /my/:threadId` (`api/src/routes/feedback/userRoutes.js:163`); `POST /my/:threadId/reply` (`api/src/routes/feedback/userRoutes.js:214`); `GET /all` (`api/src/routes/feedback/adminRoutes.js:56`); `GET /all/:threadId` (`api/src/routes/feedback/adminRoutes.js:111`); `POST /all/:threadId/reply` (`api/src/routes/feedback/adminRoutes.js:184`); `PATCH /all/:threadId/status` (`api/src/routes/feedback/adminRoutes.js:250`); `DELETE /all/:threadId` (`api/src/routes/feedback/adminRoutes.js:279`). |
| `/api/Reports` (`api/src/server.js:206`) | `POST /dashboard` (`api/src/routes/reports/dashboard.js:15`); `POST /appointments/summary` (`api/src/routes/reports/appointments.js:10`); `POST /appointments/trend` (`api/src/routes/reports/appointments.js:52`); `POST /customers/summary` (`api/src/routes/reports/customers.js:10`); `POST /doctors/performance` (`api/src/routes/reports/doctors.js:11`); `POST /employees/overview` (`api/src/routes/reports/employeesOverview.js:10`); `POST /locations/comparison` (`api/src/routes/reports/locationsComparison.js:11`); `POST /services/breakdown` (`api/src/routes/reports/servicesBreakdown.js:18`); `POST /revenue/summary` (`api/src/routes/reports/revenue.js:41`); `POST /revenue/trend` (`api/src/routes/reports/revenue.js:127`); `POST /revenue/by-location` (`api/src/routes/reports/revenue.js:209`); `POST /revenue/rules` (`api/src/routes/reports/cashFlow.js:165`); `POST /cash-flow/summary` (`api/src/routes/reports/cashFlow.js:169`); `POST /revenue/by-doctor` (`api/src/routes/reports/revenueBreakdowns.js:21`); `POST /revenue/by-category` (`api/src/routes/reports/revenueBreakdowns.js:68`); `POST /revenue/by-source` (`api/src/routes/reports/revenueBreakdowns.js:130`); `POST /revenue/payment-plans` (`api/src/routes/reports/revenueBreakdowns.js:208`). |
| `/api/telemetry` (`api/src/server.js:207`) | Authenticated `POST /errors` (`api/src/routes/telemetry.js:51`); `GET /errors` (`api/src/routes/telemetry.js:146`); `PUT /errors/:id` (`api/src/routes/telemetry.js:181`); `POST /errors/:id/fix-attempts` (`api/src/routes/telemetry.js:224`); `GET /stats` (`api/src/routes/telemetry.js:245`); `POST /version` (`api/src/routes/telemetry.js:266`). |
| `/api/IpAccess` (`api/src/server.js:208`) | `GET /settings` (`api/src/routes/ipAccess.js:22`); `PUT /settings` (`api/src/routes/ipAccess.js:36`); `GET /entries` (`api/src/routes/ipAccess.js:67`); `POST /entries` (`api/src/routes/ipAccess.js:88`); `PUT /entries/:id` (`api/src/routes/ipAccess.js:134`); `DELETE /entries/:id` (`api/src/routes/ipAccess.js:193`); `GET /check` (`api/src/routes/ipAccess.js:211`). |
| `/api/Exports` (`api/src/server.js:209`) | `POST /:type/preview` (`api/src/routes/exports.js:39`); `POST /:type/download` (`api/src/routes/exports.js:77`); `GET /types` (`api/src/routes/exports.js:115`). |
| `/api/ctv-public` (`api/src/server.js:143`) | `GET /client-lookup` (`api/src/routes/ctvPublic.js:89`); `GET /services` (`api/src/routes/ctvPublic.js:136`); `POST /bookings` (`api/src/routes/ctvPublic.js:170`); `GET /refcode/:code` (`api/src/routes/ctvPublic.js:346`); `GET /ctv-lookup` (`api/src/routes/ctvPublic.js:358`); `POST /join` (`api/src/routes/ctvPublic.js:377`). |
| `/api/ctv` (`api/src/server.js:281`) | `GET /me` (`api/src/routes/ctvProfile.js:37`); `PATCH /me` (`api/src/routes/ctvProfile.js:46`); `POST /me/password` (`api/src/routes/ctvProfile.js:55`); `GET /commission-summary` (`api/src/routes/ctv.js:52`); `GET /referrals` (`api/src/routes/ctv.js:163`); `GET /client-journeys` (`api/src/routes/ctv.js:385`); duplicate `GET /me` (`api/src/routes/ctv.js:537`); `POST /` (`api/src/routes/ctv.js:557`); `POST /clients` (`api/src/routes/ctv.js:667`); `GET /network` (`api/src/routes/ctv.js:773`); `GET /hierarchy` (`api/src/routes/ctv.js:816`); `GET /client-lookup` (`api/src/routes/ctv.js:836`); `GET /services` (`api/src/routes/ctv.js:880`); `POST /bookings` (`api/src/routes/ctv.js:919`). |
| Direct/static | Public `POST /api/telemetry/errors` (`api/src/server.js:140`, `api/src/routes/publicTelemetryErrors.js:23`); `GET /api/health` (`api/src/server.js:284`); static `/uploads/feedback` (`api/src/server.js:318`); static `/uploads/payouts` (`api/src/server.js:321`); `GET /api/web/Image2` (`api/src/server.js:324`). |

Conditional Cosmetic mirror endpoints:

| Base / mount | Methods + suffixes |
|---|---|
| `/api/cosmetic/Partners` (`api/src/server.js:241`) | Same Partner suffixes as `/api/Partners`; handlers `api/src/routes/partners.js:12` through `api/src/routes/partners.js:21`. |
| `/api/cosmetic/Employees` (`api/src/server.js:242`) | `GET /` (`api/src/routes/employees.js:16`); `GET /:id` (`api/src/routes/employees.js:137`); `POST /` (`api/src/routes/employees/mutations.js:14`); `PUT /:id` (`api/src/routes/employees/mutations.js:133`); `DELETE /:id` (`api/src/routes/employees/mutations.js:290`). |
| `/api/cosmetic/Products` (`api/src/server.js:243`) | Same Product suffixes as `/api/Products`; handlers `api/src/routes/products.js:50`, `api/src/routes/products.js:176`, `api/src/routes/products.js:229`, `api/src/routes/products.js:268`, `api/src/routes/products.js:334`. |
| `/api/cosmetic/ProductCategories` (`api/src/server.js:244`) | Same ProductCategories suffixes as `/api/ProductCategories`; handlers `api/src/routes/productCategories.js:19`, `api/src/routes/productCategories.js:96`, `api/src/routes/productCategories.js:133`, `api/src/routes/productCategories.js:193`. |
| `/api/cosmetic/SaleOrders` (`api/src/server.js:245`) | Same SaleOrders suffixes as `/api/SaleOrders`; handlers `api/src/routes/saleOrders.js:17`, `api/src/routes/saleOrders.js:174`, `api/src/routes/saleOrders.js:335`, `api/src/routes/saleOrders.js:342`, `api/src/routes/saleOrders.js:349`, `api/src/routes/saleOrders.js:351`. |
| `/api/cosmetic/SaleOrderLines` (`api/src/server.js:246`) | `GET /` (`api/src/routes/saleOrderLines.js:20`); `DELETE /:id` (`api/src/routes/saleOrderLines.js:231`). |
| `/api/cosmetic/Appointments` (`api/src/server.js:247`) | Same Appointments suffixes as `/api/Appointments`; handlers `api/src/routes/appointments.js:10` through `api/src/routes/appointments.js:13`. |
| `/api/cosmetic/Payments` (`api/src/server.js:248`) | Same Payments suffixes as `/api/Payments`; handlers `api/src/routes/payments.js:17`, `api/src/routes/payments.js:18`, `api/src/routes/payments.js:19`, `api/src/routes/payments.js:20`, `api/src/routes/payments.js:23`, `api/src/routes/payments.js:192`, `api/src/routes/payments.js:251`, `api/src/routes/payments.js:310`, `api/src/routes/payments.js:392`, `api/src/routes/payments.js:470`. |
| `/api/cosmetic/Companies` (`api/src/server.js:249`) | `GET /` (`api/src/routes/companies.js:7`). |
| `/api/cosmetic/Reports` (`api/src/server.js:250`) | Same Reports suffixes as `/api/Reports`; handlers in `api/src/routes/reports/*.js` listed above. |
| `/api/cosmetic/DashboardReports` (`api/src/server.js:251`) | `POST /GetSumary` (`api/src/routes/dashboardReports.js:58`). |
| `/api/cosmetic/CustomerBalance` (`api/src/server.js:252`) | `GET /:id` (`api/src/routes/customerBalance.js:10`). |
| `/api/cosmetic/CustomerReceipts` (`api/src/server.js:253`) | `GET /` (`api/src/routes/customerReceipts.js:13`); `GET /:id` (`api/src/routes/customerReceipts.js:153`). |
| `/api/cosmetic/CustomerSources` (`api/src/server.js:254`) | Same CustomerSources suffixes as `/api/CustomerSources`; handlers `api/src/routes/customerSources.js:12`, `api/src/routes/customerSources.js:67`, `api/src/routes/customerSources.js:95`, `api/src/routes/customerSources.js:120`, `api/src/routes/customerSources.js:161`. |
| `/api/cosmetic/CommissionConfig` (`api/src/server.js:255`) | `GET /` (`api/src/routes/commissionConfig.js:31`); `PUT /` (`api/src/routes/commissionConfig.js:51`). |
| `/api/cosmetic/Ctvs` (`api/src/server.js:256`) | Same Ctvs suffixes as `/api/Ctvs`; handlers `api/src/routes/ctvs.js:34`, `api/src/routes/ctvs.js:85`, `api/src/routes/ctvs.js:123`, `api/src/routes/ctvs.js:145`, `api/src/routes/ctvs.js:185`. |
| `/api/cosmetic/Permissions` (`api/src/server.js:257`) | Same Permissions suffixes as `/api/Permissions`; handlers `api/src/routes/permissions.js:11`, `api/src/routes/permissions.js:44`, `api/src/routes/permissions.js:92`, `api/src/routes/permissions.js:151`, `api/src/routes/permissions.js:253`, `api/src/routes/permissions.js:386`. |
| `/api/cosmetic/AccountPayments` (`api/src/server.js:258`) | `GET /` (`api/src/routes/accountPayments.js:13`); `GET /:id` (`api/src/routes/accountPayments.js:187`). |
| `/api/cosmetic/DotKhams` (`api/src/server.js:260`) | `GET /` (`api/src/routes/dotKhams.js:12`); `GET /:id` (`api/src/routes/dotKhams.js:167`). |
| `/api/cosmetic/MonthlyPlans` (`api/src/server.js:261`) | Same MonthlyPlans suffixes as `/api/MonthlyPlans`; handlers `api/src/routes/monthlyPlans.js:13`, `api/src/routes/monthlyPlans.js:126`, `api/src/routes/monthlyPlans.js:174`, `api/src/routes/monthlyPlans.js:270`, `api/src/routes/monthlyPlans.js:410`, `api/src/routes/monthlyPlans.js:421`. |
| `/api/cosmetic/settings/bank` (`api/src/server.js:262`) | `GET /` (`api/src/routes/bankSettings.js:12`); `PUT /` (`api/src/routes/bankSettings.js:46`). |
| `/api/cosmetic/ExternalCheckups` (`api/src/server.js:263`) | Same ExternalCheckups suffixes as `/api/ExternalCheckups`; handlers `api/src/routes/externalCheckups.js:27`, `api/src/routes/externalCheckups.js:72`, `api/src/routes/externalCheckups.js:150`, `api/src/routes/externalCheckups.js:175`. |
| `/api/cosmetic/face` (`api/src/server.js:264`) | `POST /recognize` (`api/src/routes/faceRecognition.js:42`); `POST /register` (`api/src/routes/faceRecognition.js:73`); `GET /status/:partnerId` (`api/src/routes/faceRecognition.js:212`). |
| `/api/cosmetic/Exports` (`api/src/server.js:265`) | Same Exports suffixes as `/api/Exports`; handlers `api/src/routes/exports.js:39`, `api/src/routes/exports.js:77`, `api/src/routes/exports.js:115`. |

### Config-as-data sources

| Area | Source | Behavior keys |
|---|---|---|
| SPA routes and route permissions | `website/src/constants/index.ts:90`; `website/src/constants/index.ts:121` | `ROUTES`, `ROUTE_PERMISSIONS`. |
| Navigation sections | `website/src/constants/index.ts:165` | `NAVIGATION_ITEMS`, including route paths and grouping. |
| Appointment types, time slots, card colors, and status options | `website/src/constants/index.ts:222`; `website/src/constants/index.ts:267`; `website/src/constants/index.ts:312`; `website/src/constants/index.ts:400` | `APPOINTMENT_TYPE_LABELS`, `TIME_SLOTS`, `APPOINTMENT_CARD_COLORS`, `APPOINTMENT_STATUS_OPTIONS`. |
| Appointment API status contract | `contracts/appointment.ts:12`; `website/src/lib/appointmentStatusMapping.ts:1` | `VALID_STATES` plus UI phase mapping to API states. |
| Tiers / permission groups | `api/src/services/permissionService.js:73`; `api/src/services/permissionService.js:105` | `partners.tier_id`, `permission_groups`, group permissions, grants/revokes, location scopes. |
| Permission board catalog | `website/src/pages/PermissionBoard/constants.ts:3` | UI module/action permission labels including Payment, Commission, Customers, Employees. |
| Business-unit / LOB routing | `website/src/contexts/BusinessUnitContext.tsx:40`; `website/src/contexts/BusinessUnitContext.tsx:100`; `api/src/server.js:218` | `VITE_DEFAULT_LOB`, `tgclinic_lob`, `COSMETIC_LOB_ENABLED`, `lob_scope`. |
| Cosmetic API mirror | `api/src/server.js:222`; `api/src/server.js:241` | `/api/cosmetic/*` mirror list, `requireLobScope('cosmetic')`, `cosmetic.access`. |
| Payment method/status/deposit config | `contracts/payment.ts:4`; `contracts/payment.ts:11`; `contracts/payment.ts:15`; `contracts/payment.ts:19` | allowed methods, status, deposit types, allocation fields. |
| Referral claim window | `api/src/services/referralClaim.js:5`; `api/src/services/referralClaim.js:29` | six-month window and latest CTV-bearing appointment/service owner selection. |
| CTV hierarchy fallback rates | `api/src/services/ctvNetwork.js:3`; `api/src/services/ctvNetwork.js:103` | fallback shares, configured enabled commission levels, depth. |
| Commission levels | `api/src/routes/commissionConfig.js:31`; `api/src/routes/commissionConfig.js:59` | `commission_level_config(level,label,enabled,share_percent)`, sum cap. |
| Referral start product | `api/src/routes/ctvPublic.js:273`; `api/src/routes/ctv.js:989` | `commission_settings.referral_start_product_id`. |
| Offer/catalog nearest runtime source | `api/src/routes/products.js:50`; `api/src/routes/products.js:229` | product/service `type`, `active`, `listprice`, `saleprice`, category, company, `commission_rate_percent`. |
| Payout/settlement | `api/src/routes/payouts.js:31`; `api/src/routes/payouts.js:196` | `commissions.payout.run`, pending earnings only, `payout_id`, receipt URL. |
| System preferences | `api/src/routes/systemPreferences.js:12`; `api/src/routes/systemPreferences.js:84` | arbitrary preference `key`/value rows. |
| Bank settings | `api/src/routes/bankSettings.js:12`; `api/src/routes/bankSettings.js:46` | bank account settings through `/api/settings/bank`. |
| IP access modes | `api/src/middleware/ipAccess.js:48`; `api/src/routes/ipAccess.js:22` | `allow_all`, `block_all`, `whitelist_only`, `blacklist_block`, entries. |

### Auth inventory

| Role / guard | Behavior source |
|---|---|
| Public API paths | Exact public paths are login variants, `/api/IpAccess/check`, and `/api/health` in `api/src/server.js:145`; pre-auth CTV public routes mount in `api/src/server.js:143`; public telemetry mounts in `api/src/server.js:140`. |
| API auth | All other `/api/*` paths pass `requireAuth` in `api/src/server.js:155`; bearer token validation is in `api/src/middleware/auth.js:11`. |
| Permission guard | `requirePermission(permission)` resolves effective permissions and returns 403 without the permission or `*` in `api/src/middleware/auth.js:33`. |
| LOB guard | `requireLobScope(lob)` rejects CTV-only or missing-scope users with `S_LOB_FORBIDDEN` in `api/src/middleware/auth.js:69`. |
| CTV guard | `requireCtvUser` rejects non-CTV users with `S_CTV_ONLY` in `api/src/routes/ctv.js:35`. |
| Login role payload | Login identifies CTVs, LOB scope, admin scope, and `redirectTo: '/ctv'` in `api/src/routes/auth.js:140` through `api/src/routes/auth.js:182`. |
| Built-in self permissions | CTV users without a group get CTV self permissions in `api/src/services/permissionService.js:89`. |
| Admin permission state | Admin group detection and wildcard `*` grant are in `api/src/services/permissionService.js:25` and `api/src/services/permissionService.js:89`. |

### Known-broken or stubbed in code

| Surface | Source-backed issue |
|---|---|
| Avatar selection | No avatar picker route or upload flow is present. Employee avatar is display/fallback only in `website/src/hooks/useEmployees.ts:58`; collapsed sidebar initials button calls logout in `website/src/components/Layout.tsx:396`; backend avatar image endpoint returns 204 in `api/src/server.js:323`. |
| Face capture instead of avatar selection | The implemented image-adjacent flow is face recognition/registration, not avatar selection, through `website/src/components/shared/GlobalFaceIdButton.tsx:55`, `website/src/components/shared/GlobalFaceIdButton.tsx:111`, and `api/src/routes/faceRecognition.js:42`. |
| `/api/Services` | Import/mount is removed/commented as dead in `api/src/server.js:44` and `api/src/server.js:194`; route file warns to use products/sale orders instead in `api/src/routes/services.js:1`. |
| `/api/CrmTasks` | Import/mount is commented as dead because the route queries non-existent `dbo.crmtasks` in `api/src/server.js:32` and `api/src/server.js:178`. |
| Legacy account/session routes | `/api/Account` and `/Web/Session` are commented out in `api/src/server.js:162`; legacy Account returns 410 if mounted in `api/src/routes/account.js:1`. |
| Cosmetic LOB disabled | `/api/cosmetic/*` returns 503 `COSMETIC_LOB_DISABLED` if flag is false in `api/src/server.js:270`. |
| Duplicate `GET /api/ctv/me` | `ctvProfile` and `ctv` both register `GET /me`; `ctvProfile` mounts first in `api/src/server.js:281`, handlers in `api/src/routes/ctvProfile.js:37` and `api/src/routes/ctv.js:537`. |
| Duplicate telemetry POST | Public `POST /api/telemetry/errors` mounts before auth in `api/src/server.js:140`; authenticated telemetry POST also exists in `api/src/routes/telemetry.js:51`. |
| Notifications page | Static placeholder behavior in `website/src/pages/Notifications.tsx:1`; no API wiring found. |
| Locations create | Add-location submit only closes the modal in `website/src/pages/Locations.tsx:193`; metrics are unavailable/null in `website/src/hooks/useLocations.ts:123`. |
| Today services | Overview today-services module is placeholder-only in `website/src/components/modules/TodayServicesTable.tsx:1`. |
| Website services/add page | Website service listings are local-only/default empty in `website/src/hooks/useWebsiteData.ts:21`; Add Page button has no handler in `website/src/pages/Website.tsx:66`. |
| Service visit/cancel actions | Visit status and cancel mutate local state only in `website/src/hooks/useServices.ts:232` and `website/src/hooks/useServices.ts:255`. |
| Payment wallets | Wallet rows are initialized empty and wallet stats are hardcoded zero in `website/src/hooks/usePayment.ts:125` and `website/src/hooks/usePayment.ts:247`. |
| Customer camera quick-add | Uses mock data and timers in `website/src/components/customer/CustomerCameraWidget.tsx:51` and `website/src/components/customer/customerCameraMockData.ts:3`. |
| Address autocomplete dependency | Missing `VITE_GOOGLE_PLACES_API_KEY` surfaces a warning/error in `website/src/components/shared/AddressAutocomplete.tsx:88`; backend also returns 500 without `GOOGLE_PLACES_API_KEY` in `api/src/routes/places.js:17`. |
| External checkup dependency | Endpoints return 503 or empty data when external config is missing in `api/src/routes/externalCheckups.js:27`, `api/src/routes/externalCheckups.js:78`, and `api/src/routes/externalCheckups.js:175`. |
| Drag reschedule comment | `useDragReschedule` still says the actual mutation is a stub in `website/src/hooks/useDragReschedule.ts:4`, but Calendar passes a real `updateAppointment` handler in `website/src/pages/Calendar.tsx:104`. |
| Report placeholder | Customer report keeps `sources: []` placeholder in `api/src/routes/reports/customers.js:23`. |
| Sale-order-line placeholder fields | Response includes placeholder null fields in `api/src/routes/saleOrderLines.js:192`. |

## Testable Features

### AUTH-1

- ID: AUTH-1
- Slice/Domain: Authentication and session.
- Route(s) + entry file: `/login` in `website/src/App.tsx:174`, entry `website/src/pages/Login.tsx:42`; APIs `POST /api/Auth/login` (`api/src/routes/auth.js:84`), `GET /api/Auth/me` (`api/src/routes/auth.js:195`), `POST /api/Auth/change-password` (`api/src/routes/auth.js:239`).
- Trigger: User submits identifier/password in the login form (`website/src/pages/Login.tsx:64`) or changes password through the shared modal (`website/src/components/shared/ChangePasswordModal.tsx:1`).
- Preconditions: No token required for login because `/api/Auth/login` is public in `api/src/server.js:145`; all other API paths require bearer auth through `api/src/server.js:155`.
- Expected observable behavior: Successful login stores the token and user in AuthContext (`website/src/contexts/AuthContext.tsx:97`); CTV users redirect to `/ctv` (`website/src/contexts/AuthContext.tsx:110`); non-CTV users stay in admin shell (`website/src/App.tsx:106`).
- Business rules / invariants: Login accepts email, CTV phone, or referral code as identifier (`api/src/routes/auth.js:77`); dental is searched first and cosmetic only when the flag is enabled (`api/src/routes/auth.js:34`); admin users get both LOB scopes (`api/src/routes/auth.js:142`); JWT expires in 24 hours (`api/src/routes/auth.js:168`); password change requires old password, new password, and at least six characters (`api/src/routes/auth.js:239`).
- Edge / failure cases the code handles (and how): Missing/invalid token clears local auth state on 401 (`website/src/lib/api/core.ts:93`); missing login fields return validation errors (`api/src/routes/auth.js:90`); weak new password returns 400 (`api/src/routes/auth.js:249`).
- Data dependencies: `/api/Auth/login`, `/api/Auth/me`, `/api/Auth/change-password`; token key `tgclinic_token` (`website/src/contexts/AuthContext.tsx:23`).
- STATUS: working

### SHELL-1

- ID: SHELL-1
- Slice/Domain: Admin shell, route gating, LOB switch, location filter.
- Route(s) + entry file: All protected admin routes under `ProtectedRoute` in `website/src/App.tsx:183`; layout entry `website/src/components/Layout.tsx:275`.
- Trigger: Authenticated user opens any admin route or switches LOB/location in the layout.
- Preconditions: User is authenticated (`website/src/App.tsx:99`), not a CTV (`website/src/App.tsx:106`), and has the route permission required by `ROUTE_PERMISSIONS` (`website/src/App.tsx:111`).
- Expected observable behavior: Layout filters nav items by permission (`website/src/components/Layout.tsx:275`); multi-LOB users see an LOB toggle (`website/src/components/Layout.tsx:438`); single-location users do not see the location filter (`website/src/components/Layout.tsx:448`); the routed page subtree is keyed by current LOB (`website/src/components/Layout.tsx:475`).
- Business rules / invariants: Current LOB is initialized from query/localStorage/default (`website/src/contexts/BusinessUnitContext.tsx:55`); admin/multi-scope users can have both LOBs (`website/src/contexts/BusinessUnitContext.tsx:100`); non-admin users are restricted to normalized `lob_scope` or dental fallback (`website/src/contexts/BusinessUnitContext.tsx:113`).
- Edge / failure cases the code handles (and how): Unauthenticated users redirect to `/login` (`website/src/App.tsx:99`); CTVs redirect from admin routes to `/ctv` (`website/src/App.tsx:106`); missing route permission renders AccessDenied (`website/src/App.tsx:111`).
- Data dependencies: `ROUTE_PERMISSIONS` (`website/src/constants/index.ts:121`), `BusinessUnitContext` storage/query/default keys (`website/src/contexts/BusinessUnitContext.tsx:26`, `website/src/contexts/BusinessUnitContext.tsx:40`), layout user/location contexts (`website/src/components/Layout.tsx:438`).
- STATUS: working

### OVERVIEW-1

- ID: OVERVIEW-1
- Slice/Domain: Overview dashboard and check-in.
- Route(s) + entry file: `/` in `website/src/App.tsx:185`, entry `website/src/pages/Overview.tsx:24`; appointment APIs through `website/src/hooks/useOverviewAppointments.ts:1` and `website/src/hooks/useOverviewData.ts:24`.
- Trigger: Staff opens Overview, searches today appointments, or clicks appointment/check-in actions.
- Preconditions: Authenticated admin user with `overview.view` (`website/src/constants/index.ts:122`); LOB and optional location context selected (`website/src/hooks/useOverviewData.ts:26`).
- Expected observable behavior: Overview renders quick add, check-in zone, today services zone, and appointments zone (`website/src/pages/Overview.tsx:85`, `website/src/pages/Overview.tsx:89`, `website/src/pages/Overview.tsx:105`, `website/src/pages/Overview.tsx:114`); appointment edits open a modal (`website/src/pages/Overview.tsx:125`).
- Business rules / invariants: Appointment arrival updates call `updateAppointment` with `state: 'arrived'` and current LOB (`website/src/hooks/useOverviewAppointments.ts:346`); overview data fetches appointments and sale orders using current LOB (`website/src/hooks/useOverviewData.ts:26`, `website/src/hooks/useOverviewData.ts:54`).
- Edge / failure cases the code handles (and how): Failed overview loads empty data rather than crashing (`website/src/hooks/useOverviewData.ts:1`); today-services table is placeholder-only and not API-backed (`website/src/components/modules/TodayServicesTable.tsx:1`).
- Data dependencies: `/api/Appointments`, `/api/SaleOrders`, `/api/Companies`; frontend hooks `useOverviewAppointments`, `useOverviewData`.
- STATUS: partial

### CALENDAR-1

- ID: CALENDAR-1
- Slice/Domain: Appointment calendar.
- Route(s) + entry file: `/calendar` in `website/src/App.tsx:195`, entry `website/src/pages/Calendar.tsx:26`; APIs `GET/POST/PUT /api/Appointments` in `api/src/routes/appointments.js:10`.
- Trigger: Staff opens Calendar, changes view/date/filter, creates/edits an appointment, marks arrived, drags/reschedules, or exports.
- Preconditions: Authenticated admin user with `calendar.view` (`website/src/constants/index.ts:123`); add/edit actions require `appointments.add` and `appointments.edit` in page permission checks (`website/src/pages/Calendar.tsx:96`).
- Expected observable behavior: Calendar fetches all appointments in the visible date range (`website/src/hooks/useCalendarData.ts:119`); search is accent-insensitive across customer, phone, code, dentist, and service (`website/src/hooks/useCalendarData.ts:145`); drag reschedule calls `updateAppointment` (`website/src/pages/Calendar.tsx:104`); export uses the viewed date filters (`website/src/pages/Calendar.tsx:144`).
- Business rules / invariants: Calendar fetch uses up to 3000 rows in calendar mode (`website/src/hooks/useCalendarData.ts:15`); backend validates offset/limit and date fields (`api/src/routes/appointments/readHandlers.js:45`, `api/src/routes/appointments/readHandlers.js:63`); appointment create requires date, partner, company (`api/src/routes/appointments/mutationHandlers.js:31`); timeExpected must be 1-480 minutes (`api/src/routes/appointments/mutationHandlers.js:64`); appointment names are `AP` plus six digits (`api/src/routes/appointments/mutationHandlers.js:83`).
- Edge / failure cases the code handles (and how): Invalid state/date/company/doctor return structured errors (`api/src/routes/appointments/readHandlers.js:63`, `api/src/routes/appointments/readHandlers.js:71`, `api/src/routes/appointments/mutationHandlers.js:55`); the drag hook comment says stub but the Calendar page passes a real API update (`website/src/hooks/useDragReschedule.ts:4`, `website/src/pages/Calendar.tsx:104`).
- Data dependencies: `/api/Appointments`, `/api/Exports/:type/preview`, `/api/Exports/:type/download`, `APPOINTMENT_CARD_COLORS`, `APPOINTMENT_STATUS_OPTIONS`, `TIME_SLOTS`.
- STATUS: working

### CUSTOMERS-1

- ID: CUSTOMERS-1
- Slice/Domain: Customer list, deep link, profile, and delete.
- Route(s) + entry file: `/customers` and `/customers/:id` in `website/src/App.tsx:206` and `website/src/App.tsx:216`, entry `website/src/pages/Customers.tsx:33`; APIs `/api/Partners` in `api/src/routes/partners.js:12`.
- Trigger: Staff searches customers, opens a customer profile route, creates/edits a customer, or deletes a customer.
- Preconditions: Authenticated admin user with `customers.view`; write/delete actions require `customers.add`, `customers.edit`, `customers.delete`, or `customers.hard_delete` from the backend route bindings (`api/src/routes/partners.js:18`, `api/src/routes/partners.js:19`, `api/src/routes/partners.js:20`, `api/src/routes/partners.js:21`).
- Expected observable behavior: Non-UUID `/customers/:id` is resolved through the partner resolver and redirected to the UUID route (`website/src/pages/Customers.tsx:64`, `website/src/pages/Customers.tsx:90`, `website/src/pages/Customers.tsx:94`); profile data loads partner details, appointments, and balance (`website/src/hooks/useCustomerProfile.ts:100`, `website/src/hooks/useCustomerProfile.ts:152`, `website/src/hooks/useCustomerProfile.ts:185`); delete supports soft and hard paths (`website/src/pages/Customers.tsx:235`).
- Business rules / invariants: Backend list/search uses `customers.view` (`api/src/routes/partners.js:12`); create/update validate contracts before mutation (`api/src/routes/partners.js:18`, `api/src/routes/partners.js:19`); customer balance excludes voided payments and clamps deposit balance/outstanding to nonnegative (`api/src/routes/customerBalance.js:21`, `api/src/routes/customerBalance.js:58`).
- Edge / failure cases the code handles (and how): Missing or unresolved route key exits resolver state (`website/src/pages/Customers.tsx:64`); hard delete requires `customers.hard_delete` (`api/src/routes/partners.js:21`); face re-register is a separate face flow, not an avatar picker (`website/src/components/customer/CustomerProfile/index.tsx:55`).
- Data dependencies: `/api/Partners`, `/api/Partners/resolve`, `/api/Partners/:id/GetKPIs`, `/api/Appointments`, `/api/CustomerBalance/:id`, `/api/face/status/:partnerId`.
- STATUS: working

### SERVICES-1

- ID: SERVICES-1
- Slice/Domain: Service records / sale orders.
- Route(s) + entry file: `/services` in `website/src/App.tsx:247`, entry `website/src/pages/Services/index.tsx:37`; APIs `/api/SaleOrders` (`api/src/routes/saleOrders.js:17`) and `/api/SaleOrderLines` (`api/src/routes/saleOrderLines.js:20`).
- Trigger: Staff opens Services, searches/filters service records, creates/edits service records, changes sale-order state, or deletes a service line from a customer profile.
- Preconditions: `/services` route requires `customers.edit` in `website/src/constants/index.ts:127`; sale-order reads require `services.view` (`api/src/routes/saleOrders.js:17`); sale-order create requires backend route `POST /api/SaleOrders` (`api/src/routes/saleOrders.js:342`); service-line delete requires `customers.edit` and `payment.void` (`api/src/routes/saleOrderLines.js:231`).
- Expected observable behavior: Services list loads sale orders with search, location, partner, and LOB filters (`website/src/hooks/useServices.ts:76`); create/update maps service form fields to sale-order payload (`website/src/hooks/useServices.ts:170`, `website/src/hooks/useServices.ts:202`); service-line delete refreshes sale-order lines/profile/services (`website/src/pages/Customers/useCustomerServiceActions.ts:133`).
- Business rules / invariants: Sale-order create requires a partner and nonnegative amount/quantity, generates `SO-{year}-{seq}`, and sets residual equal to amount total (`api/src/routes/saleOrders/createSaleOrder.js:30`, `api/src/routes/saleOrders/createSaleOrder.js:55`, `api/src/routes/saleOrders/createSaleOrder.js:66`); sale-order CTV assignment updates customer referrer (`api/src/routes/saleOrders/createSaleOrder.js:101`); deleting a service line soft-deletes it and may soft-delete the last-line parent order (`api/src/routes/saleOrderLines.js:226`).
- Edge / failure cases the code handles (and how): Service reversal blocks paid-out commissions, mixed allocations, and multi-line invoice cases (`api/src/services/serviceReversal.js:82`, `api/src/services/serviceReversal.js:103`, `api/src/services/serviceReversal.js:119`); visit status and cancel controls are local-only state mutations (`website/src/hooks/useServices.ts:232`, `website/src/hooks/useServices.ts:255`).
- Data dependencies: `/api/SaleOrders`, `/api/SaleOrders/:id`, `/api/SaleOrders/:id/state`, `/api/SaleOrderLines`, `/api/SaleOrderLines/:id`, `/api/Products`, `/api/Ctvs/options`.
- STATUS: partial

### PAYMENT-1

- ID: PAYMENT-1
- Slice/Domain: Payments, deposit wallet, refunds, void/delete, customer balance.
- Route(s) + entry file: `/payment` in `website/src/App.tsx:348`, entry `website/src/pages/Payment.tsx:41`; APIs `/api/Payments` in `api/src/routes/payments.js:17` and `/api/CustomerBalance/:id` in `api/src/routes/customerBalance.js:10`.
- Trigger: Staff opens Payment, searches payments, tops up a deposit wallet, records/refunds/voids/deletes payments, or uploads proof.
- Preconditions: Route requires `payment.view` (`website/src/constants/index.ts:144`); export button requires `payments.export` (`website/src/pages/Payment.tsx:43`); backend payment edit/delete/void routes are permission-gated at route bindings (`api/src/routes/payments.js:23`, `api/src/routes/payments.js:251`, `api/src/routes/payments.js:310`, `api/src/routes/payments.js:392`).
- Expected observable behavior: Payment page loads sale-order payments and canonical payments, falling back to sale orders if payment fetch fails (`website/src/hooks/usePayment.ts:142`); deposit top-up creates a payment with `depositType: 'deposit'` and maps `vietqr` to `bank_transfer` (`website/src/hooks/usePayment.ts:273`); payment stats render VND values (`website/src/pages/Payment.tsx:137`).
- Business rules / invariants: Allowed methods are `cash`, `bank_transfer`, `deposit`, and `mixed` (`contracts/payment.ts:11`); payment creation requires customer, positive amount, and method (`api/src/routes/payments.js:28`); deposit/payment category is inferred from allocation/deposit fields (`api/src/routes/payments.js:40`); allocation over residual is rejected beyond `0.01` tolerance (`api/src/routes/payments/helpers.js:52`); receipt numbers are `TUKH/{VietnamYear}/{00000}` (`api/src/routes/payments/helpers.js:37`); refunds insert negative deposit payments and can write negative commission reversals (`api/src/routes/payments.js:192`, `api/src/routes/payments.js:219`); delete/void blocks paid-out earnings with `B_COMMISSION_PAID_OUT` (`api/src/routes/payments.js:321`, `api/src/routes/payments.js:401`).
- Edge / failure cases the code handles (and how): Proof upload requires data image string (`api/src/routes/payments.js:470`); delete API defaults soft when `hard` query is absent (`api/src/routes/payments.js:316`), while frontend client defaults `hard=true` (`website/src/lib/api/payments.ts:185`); wallet rows and wallet stats are currently empty/zero in the page hook (`website/src/hooks/usePayment.ts:125`, `website/src/hooks/usePayment.ts:247`).
- Data dependencies: `/api/Payments`, `/api/Payments/deposits`, `/api/Payments/deposit-usage`, `/api/Payments/refund`, `/api/Payments/:id/void`, `/api/Payments/:id/proof`, `/api/CustomerBalance/:id`, `/api/SaleOrders`.
- STATUS: partial

### PAYMENT-2

- ID: PAYMENT-2
- Slice/Domain: Monthly payment plans.
- Route(s) + entry file: `/payment` in `website/src/App.tsx:348`, entry `website/src/pages/Payment.tsx:41`; APIs `/api/MonthlyPlans` in `api/src/routes/monthlyPlans.js:13`.
- Trigger: Staff switches to the plans tab, creates a monthly plan, links invoices, updates/deletes a plan, or marks an installment paid.
- Preconditions: Route requires `payment.view` (`website/src/constants/index.ts:144`); create/update/delete/pay APIs require `payment.edit` (`api/src/routes/monthlyPlans.js:174`, `api/src/routes/monthlyPlans.js:270`, `api/src/routes/monthlyPlans.js:410`, `api/src/routes/monthlyPlans.js:421`).
- Expected observable behavior: Payment page exposes payments/plans tabs and plan creation button (`website/src/pages/Payment.tsx:166`, `website/src/pages/Payment.tsx:116`); monthly plan hook creates plans and marks installments paid (`website/src/pages/Payment.tsx:63`, `website/src/pages/Payment.tsx:79`).
- Business rules / invariants: Create requires customer, total, installment count, and start date (`api/src/routes/monthlyPlans.js:182`); down payment must be nonnegative and less than total (`api/src/routes/monthlyPlans.js:186`); installment count must be at least 1 and installment sum must match remaining amount within tolerance (`api/src/routes/monthlyPlans.js:192`, `api/src/routes/monthlyPlans.js:195`); first installment is `upcoming` and later installments are `pending` (`api/src/routes/monthlyPlans.js:218`); deleting a plan with paid installments returns 409 (`api/src/routes/monthlyPlans.js:367`); paying the final installment completes the plan and advances the next pending installment (`api/src/routes/monthlyPlans.js:439`, `api/src/routes/monthlyPlans.js:453`).
- Edge / failure cases the code handles (and how): Missing create fields return 400 (`api/src/routes/monthlyPlans.js:182`); no update fields returns 400 (`api/src/routes/monthlyPlans.js:300`); missing plan/installment returns 404 (`api/src/routes/monthlyPlans.js:314`, `api/src/routes/monthlyPlans.js:435`).
- Data dependencies: `/api/MonthlyPlans`, `/api/MonthlyPlans/:id`, `/api/MonthlyPlans/:id/installments/:installmentId/pay`, linked sale-order invoice IDs.
- STATUS: working

### CATALOG-1

- ID: CATALOG-1
- Slice/Domain: Service catalog / products and categories.
- Route(s) + entry file: `/service-catalog` in `website/src/App.tsx:257`, entry `website/src/pages/ServiceCatalog.tsx:29`; APIs `/api/Products` (`api/src/routes/products.js:50`) and `/api/ProductCategories` (`api/src/routes/productCategories.js:19`).
- Trigger: Staff opens Service Catalog, searches categories/products, filters active/inactive, creates a category, creates/edits/toggles/deletes a service, or exports catalog data.
- Preconditions: Route requires `services.view` (`website/src/constants/index.ts:128`); edit controls require `services.edit` (`website/src/pages/ServiceCatalog.tsx:32`); export requires `products.export` (`website/src/pages/ServiceCatalog.tsx:34`).
- Expected observable behavior: Page loads categories, companies, and products scoped to current LOB (`website/src/pages/ServiceCatalog.tsx:60`, `website/src/pages/ServiceCatalog.tsx:67`); category search is accent-insensitive (`website/src/pages/ServiceCatalog.tsx:95`); create/update/toggle/delete call product APIs and refresh lists (`website/src/pages/ServiceCatalog.tsx:139`, `website/src/pages/ServiceCatalog.tsx:145`, `website/src/pages/ServiceCatalog.tsx:161`, `website/src/pages/ServiceCatalog.tsx:176`, `website/src/pages/ServiceCatalog.tsx:183`).
- Business rules / invariants: Product list supports search/category/company/active filters (`api/src/routes/products.js:50`); public/CTV service pickers expose only active products (`api/src/routes/ctvPublic.js:136`, `api/src/routes/ctv.js:880`); product fields include price/category/company and `commission_rate_percent` (`api/src/routes/products.js:134`, `api/src/routes/products.js:232`).
- Edge / failure cases the code handles (and how): Page catches failed category/company/product loads by emptying arrays (`website/src/pages/ServiceCatalog.tsx:81`); Supplies and Medicine tabs are UI-only in this entry page (`website/src/pages/ServiceCatalog.tsx:206`, `website/src/pages/ServiceCatalog.tsx:209`).
- Data dependencies: `/api/Products`, `/api/ProductCategories`, `/api/Companies`, `/api/Exports/service-catalog/*`.
- STATUS: partial

### EMPLOYEES-1

- ID: EMPLOYEES-1
- Slice/Domain: Employee/staff management.
- Route(s) + entry file: `/employees` in `website/src/App.tsx:227`, entry `website/src/pages/Employees/index.tsx:27`; APIs `/api/Employees` in `api/src/routes/employees.js:16` and permission groups in `api/src/routes/permissions.js:11`.
- Trigger: Staff opens Employees, searches/filters staff, creates/edits employee, selects an employee profile, or changes tier/roles in the form.
- Preconditions: Route requires `employees.view` (`website/src/constants/index.ts:125`); add/edit controls require `employees.edit` (`website/src/pages/Employees/index.tsx:31`); backend mutations bind to employee route files (`api/src/routes/employees/mutations.js:14`, `api/src/routes/employees/mutations.js:133`, `api/src/routes/employees/mutations.js:290`).
- Expected observable behavior: Page fetches employees scoped by location/search/LOB (`website/src/hooks/useEmployees.ts:124`); filters include status, tier, and role (`website/src/pages/Employees/index.tsx:184`, `website/src/pages/Employees/index.tsx:220`, `website/src/pages/Employees/index.tsx:226`); edit form maps selected employee to form fields including tier/location scope (`website/src/pages/Employees/index.tsx:80`).
- Business rules / invariants: Role derivation is single-role from DB flags and job title (`website/src/hooks/useEmployees.ts:22`); employee permissions/tier come from permission groups (`website/src/pages/Employees/index.tsx:72`); employee avatar is only a field/fallback display (`website/src/hooks/useEmployees.ts:58`).
- Edge / failure cases the code handles (and how): Failed employee fetch sets error and leaves loading false (`website/src/hooks/useEmployees.ts:151`); avatar selection is not implemented as a picker/upload flow (`website/src/hooks/useEmployees.ts:58`, `api/src/server.js:323`).
- Data dependencies: `/api/Employees`, `/api/Permissions/groups`, `/api/Companies`.
- STATUS: partial

### LOCATIONS-1

- ID: LOCATIONS-1
- Slice/Domain: Locations/companies.
- Route(s) + entry file: `/locations` in `website/src/App.tsx:237`, entry `website/src/pages/Locations.tsx:1`; API `/api/Companies` in `api/src/routes/companies.js:7`.
- Trigger: Staff opens Locations, filters/searches locations, or clicks add location.
- Preconditions: Route requires `locations.view` (`website/src/constants/index.ts:126`).
- Expected observable behavior: Page uses the locations hook (`website/src/pages/Locations.tsx:22`); hook fetches companies (`website/src/hooks/useLocations.ts:64`).
- Business rules / invariants: Location metrics are unavailable and returned as null (`website/src/hooks/useLocations.ts:123`); Add-location submit closes the modal without API persistence (`website/src/pages/Locations.tsx:193`).
- Edge / failure cases the code handles (and how): Fetch failures are caught in the locations hook (`website/src/hooks/useLocations.ts:64`); create is placeholder/local only.
- Data dependencies: `/api/Companies`.
- STATUS: partial

### PERMISSIONS-1

- ID: PERMISSIONS-1
- Slice/Domain: Permission board and relationship graph.
- Route(s) + entry file: `/permissions` in `website/src/App.tsx:338`, entry `website/src/pages/PermissionBoard/PermissionBoard.tsx:16`; `/relationships` in `website/src/App.tsx:287`, entry `website/src/pages/Relationships.tsx:1`; APIs `/api/Permissions` in `api/src/routes/permissions.js:11`.
- Trigger: Staff opens permission architecture/matrix/flow views, toggles a group permission, updates employee permission assignment, or opens relationship graph.
- Preconditions: Routes require `permissions.view` (`website/src/constants/index.ts:142`, `website/src/constants/index.ts:143`); edit controls require `permissions.edit` (`website/src/pages/PermissionBoard/PermissionBoard.tsx:18`).
- Expected observable behavior: Permission board loads groups, employee permissions, and companies (`website/src/hooks/usePermissionBoard.ts:31`); group permission toggles persist through `updatePermissionGroup` (`website/src/hooks/usePermissionBoard.ts:66`); employee group/location/overrides persist through `updateEmployeePermission` (`website/src/hooks/usePermissionBoard.ts:48`).
- Business rules / invariants: Effective permission = group permissions plus grant overrides minus revoke overrides (`website/src/hooks/usePermissionBoard.ts:57`); backend resolves permissions from `partners.tier_id`, permission group rows, overrides, and location scope (`api/src/services/permissionService.js:73`, `api/src/services/permissionService.js:105`); CTVs without a group get self permissions (`api/src/services/permissionService.js:89`).
- Edge / failure cases the code handles (and how): Permission load failure renders retry UI (`website/src/pages/PermissionBoard/PermissionBoard.tsx:37`); `usePermissionGroups` still contains a create-group TODO, but PermissionBoard itself updates existing groups (`website/src/hooks/usePermissionBoard.ts:66`, `website/src/hooks/usePermissionGroups.ts:204`).
- Data dependencies: `/api/Permissions/groups`, `/api/Permissions/employees`, `/api/Permissions/resolve/:employeeId`, `/api/Companies`.
- STATUS: partial

### REPORTS-1

- ID: REPORTS-1
- Slice/Domain: Reports dashboard and exports.
- Route(s) + entry file: `/reports/*` in `website/src/App.tsx:307`, entry `website/src/pages/Reports.tsx:1`; APIs `/api/Reports/*` in `api/src/routes/reports.js:5` and exports in `api/src/routes/exports.js:39`.
- Trigger: Staff opens reports dashboard/revenue/appointments/doctors/customers/locations/services/employees, changes filters, previews/downloads exports.
- Preconditions: All report routes require `reports.view` in `website/src/constants/index.ts:130`; route handlers require `reports.view` (`api/src/routes/reports/dashboard.js:15`, `api/src/routes/reports/revenue.js:41`).
- Expected observable behavior: Reports shell loads locations (`website/src/pages/Reports.tsx:33`); each child page posts to its report endpoint, for example dashboard (`website/src/pages/reports/ReportsDashboard.tsx:23`), appointments (`website/src/pages/reports/ReportsAppointments.tsx:30`), revenue (`website/src/pages/reports/ReportsRevenue.tsx:66`), and exports use `useExport` (`website/src/pages/reports/ReportsRevenue.tsx:81`).
- Business rules / invariants: Reports are POST-based endpoint modules mounted under `/api/Reports` (`api/src/routes/reports.js:5`); revenue/cash-flow rule endpoints exist (`api/src/routes/reports/cashFlow.js:165`, `api/src/routes/reports/cashFlow.js:169`); exports support preview and download by type (`api/src/routes/exports.js:39`, `api/src/routes/exports.js:77`).
- Edge / failure cases the code handles (and how): `/reports` and unknown report children redirect to dashboard (`website/src/App.tsx:316`, `website/src/App.tsx:325`); customer report keeps a placeholder source array (`api/src/routes/reports/customers.js:23`).
- Data dependencies: `/api/Reports/dashboard`, `/api/Reports/revenue/*`, `/api/Reports/appointments/*`, `/api/Reports/doctors/performance`, `/api/Reports/customers/summary`, `/api/Reports/locations/comparison`, `/api/Reports/services/breakdown`, `/api/Reports/employees/overview`, `/api/Exports/:type/preview`, `/api/Exports/:type/download`.
- STATUS: partial

### COMMISSION-1

- ID: COMMISSION-1
- Slice/Domain: Commission config, CTV admin, earnings, payout settlement.
- Route(s) + entry file: `/commission` in `website/src/App.tsx:297`, entry `website/src/pages/Commission.tsx:19`; APIs `/api/CommissionConfig`, `/api/Ctvs`, `/api/NewClients`, `/api/Earnings`, `/api/Payouts`.
- Trigger: Admin opens Commission, edits levels, manages CTVs, reviews new clients/earnings, creates a payout, uploads/attaches payout receipt.
- Preconditions: Route requires `commission.view` (`website/src/constants/index.ts:139`); config save requires backend admin check (`api/src/routes/commissionConfig.js:51`); payouts require admin or `commissions.payout.run` (`api/src/routes/payouts.js:31`, `api/src/routes/payouts.js:56`); earnings list requires admin or `commissions.view.team` (`api/src/routes/earnings.js:107`).
- Expected observable behavior: Commission page has five tabs: config, CTVs, new clients, earnings, payouts (`website/src/pages/Commission.tsx:31`); config loads/saves by current LOB (`website/src/pages/Commission.tsx:59`, `website/src/pages/Commission.tsx:181`); payout APIs create payout rows and upload receipt files (`website/src/lib/api/commission.ts:101`, `website/src/lib/api/commission.ts:105`, `website/src/lib/api/commission.ts:115`).
- Business rules / invariants: Commission config is levels-only and reads `commission_level_config` fields (`api/src/routes/commissionConfig.js:31`); enabled share sum must be <= 100 or returns `B_LEVEL_SUM_EXCEEDS_100` (`api/src/routes/commissionConfig.js:69`); engine is pay-as-paid, per-service, explicit `ctv_id` only, append-only, and idempotent (`api/src/services/commissionEngine.js:4`); upline traversal caps at five levels and guards cycles (`api/src/services/commissionEngine.js:60`); refunds write negative earnings reversals (`api/src/services/commissionEngine.js:159`); payouts lock selected pending earnings, total their amounts, insert a payout, and mark earnings paid with `payout_id` (`api/src/routes/payouts.js:196`, `api/src/routes/payouts.js:215`, `api/src/routes/payouts.js:218`, `api/src/routes/payouts.js:227`).
- Edge / failure cases the code handles (and how): Non-admin config PUT returns 403 (`api/src/routes/commissionConfig.js:51`); non-pending payout earnings return 409 `B_EARNINGS_NOT_PAYABLE` (`api/src/routes/payouts.js:203`); receipt upload validates image MIME and 5 MB max (`api/src/routes/payouts.js:89`, `api/src/routes/payouts.js:100`); product `commission_rate_percent` still exists in product API while engine says product commission rate is removed/unused (`api/src/routes/products.js:134`, `api/src/services/commissionEngine.js:8`).
- Data dependencies: `/api/CommissionConfig`, `/api/Ctvs`, `/api/NewClients`, `/api/Earnings`, `/api/Payouts`, `/api/Payouts/upload-receipt`, `commission_level_config`, `earnings`, `payouts`.
- STATUS: partial

### CTV-1

- ID: CTV-1
- Slice/Domain: Authenticated CTV portal.
- Route(s) + entry file: `/ctv` in `website/src/App.tsx:372`, entry `website/src/pages/CTV/CtvDashboard.tsx:41`; APIs `/api/ctv/*` mounted in `api/src/server.js:281`.
- Trigger: CTV logs in and opens the portal; switches tabs; opens refer-client or recruit-CTV modal; updates profile/password.
- Preconditions: Authenticated user must be CTV (`website/src/App.tsx:122`); backend `/api/ctv` requires `ctv.dashboard.view` at mount (`api/src/server.js:281`) and CTV-only checks inside CTV routes (`api/src/routes/ctv.js:35`).
- Expected observable behavior: Dashboard loads referrals, commission summary, and profile in parallel (`website/src/pages/CTV/CtvDashboard.tsx:58`); network tab lazy-loads hierarchy (`website/src/pages/CTV/CtvDashboard.tsx:82`); refer modal opens from quick action (`website/src/pages/CTV/CtvDashboard.tsx:204`); recruit modal opens from quick action (`website/src/pages/CTV/CtvDashboard.tsx:212`); account tab renders profile update area (`website/src/pages/CTV/CtvDashboard.tsx:247`).
- Business rules / invariants: CTV commission summary reads pending/paid earnings across dental and cosmetic (`api/src/routes/ctv.js:52`); referrals compute journey stages from paid/service/visit/referred activity (`api/src/routes/ctv.js:187`); CTV hierarchy reads both LOBs in API layer and caps depth (`api/src/services/ctvNetwork.js:103`); create CTV is allowed for CTV or admin with `ctv.manage`, always includes dental in LOB scope, checks duplicate phone/email across both DBs, and writes cosmetic row only when scoped (`api/src/routes/ctv.js:557`, `api/src/routes/ctv.js:587`, `api/src/routes/ctv.js:597`, `api/src/routes/ctv.js:627`).
- Edge / failure cases the code handles (and how): Non-CTV gets 403 `S_CTV_ONLY` (`api/src/routes/ctv.js:35`); duplicate CTV/client phone/email are blocked (`api/src/routes/ctv.js:597`, `api/src/routes/ctv.js:701`); `GET /api/ctv/me` has duplicate route handlers and profile router mounts first (`api/src/server.js:281`, `api/src/routes/ctvProfile.js:37`, `api/src/routes/ctv.js:537`).
- Data dependencies: `/api/ctv/referrals`, `/api/ctv/commission-summary`, `/api/ctv/me`, `/api/ctv/hierarchy`, `/api/ctv/network`, `/api/ctv/client-lookup`, `/api/ctv/services`, `/api/ctv/bookings`, `/api/ctv/clients`, `/api/ctv`.
- STATUS: partial

### CTV-2

- ID: CTV-2
- Slice/Domain: CTV booking and referral claim.
- Route(s) + entry file: Authenticated modal in `website/src/components/ctv/CtvReferModal.tsx:47`; public landing modal in `website/src/pages/Landing/Landing.tsx:108`; APIs `POST /api/ctv/bookings` (`api/src/routes/ctv.js:919`) and `POST /api/ctv-public/bookings` (`api/src/routes/ctvPublic.js:170`).
- Trigger: CTV/staff submits refer-client booking from portal or visitor submits landing booking from `/welcome`.
- Preconditions: Authenticated booking requires CTV/admin gate (`api/src/routes/ctv.js:920`); public booking requires `ctvPhone` (`api/src/routes/ctvPublic.js:189`); both require phone and date (`api/src/routes/ctv.js:941`, `api/src/routes/ctvPublic.js:189`).
- Expected observable behavior: Modal debounces phone lookup and auto-fills name for unclaimed existing clients (`website/src/components/ctv/CtvReferModal.tsx:64`, `website/src/components/ctv/CtvReferModal.tsx:81`); service catalog loads by selected LOB and resets service on LOB change (`website/src/components/ctv/CtvReferModal.tsx:124`, `website/src/components/ctv/CtvReferModal.tsx:232`); successful submit creates one appointment and closes after success state (`website/src/components/ctv/CtvReferModal.tsx:185`, `website/src/components/ctv/CtvReferModal.tsx:190`).
- Business rules / invariants: Referral claim window is six months (`api/src/services/referralClaim.js:5`); owner is the latest non-cancelled CTV appointment/service and service wins ties (`api/src/services/referralClaim.js:29`, `api/src/services/referralClaim.js:71`, `api/src/services/referralClaim.js:82`); active claimed clients return `B_CLIENT_CLAIMED` (`api/src/routes/ctv.js:958`, `api/src/routes/ctvPublic.js:221`); booking validates same-LOB product or falls back to `commission_settings.referral_start_product_id` (`api/src/routes/ctv.js:989`, `api/src/routes/ctvPublic.js:265`); booking creates appointment with `state='confirmed'`, `color='1'`, `timeexpected=30`, and `ctv_id` (`api/src/routes/ctv.js:1010`, `api/src/routes/ctvPublic.js:307`).
- Edge / failure cases the code handles (and how): Modal blocks submit while CTV phone lookup is pending or missing in public mode (`website/src/components/ctv/CtvReferModal.tsx:163`); backend returns `P_CTV_NOT_FOUND` for public CTV phone misses (`api/src/routes/ctvPublic.js:196`); note text is capped at 2000 chars (`website/src/components/ctv/CtvReferModal.tsx:318`, `api/src/routes/ctvPublic.js:204`); booking does not create sale orders in the mounted routes (`api/src/routes/ctv.js:913`, `api/src/routes/ctvPublic.js:166`).
- Data dependencies: `/api/ctv/client-lookup`, `/api/ctv/services`, `/api/ctv/bookings`, `/api/ctv-public/client-lookup`, `/api/ctv-public/ctv-lookup`, `/api/ctv-public/services`, `/api/ctv-public/bookings`, `commission_settings.referral_start_product_id`.
- STATUS: working

### PUBLIC-1

- ID: PUBLIC-1
- Slice/Domain: Public landing and public CTV self-signup.
- Route(s) + entry file: `/welcome` in `website/src/App.tsx:176`, entry `website/src/pages/Landing/Landing.tsx:45`; `/ctv/join` in `website/src/App.tsx:178`, entry `website/src/pages/CTV/JoinCtv.tsx:13`; APIs `/api/ctv-public/*` in `api/src/routes/ctvPublic.js:89`.
- Trigger: Public visitor opens `/welcome`, opens booking CTA, clicks Join CTV, uses referral link `?ref=CTV-*`, or submits CTV signup by upline phone.
- Preconditions: No auth; ctv-public routes mount before auth gate (`api/src/server.js:143`).
- Expected observable behavior: `/welcome?book=1` opens booking immediately (`website/src/pages/Landing/Landing.tsx:47`); Join CTV resolves referral code, debounces upline phone lookup, validates required fields/password, and submits join (`website/src/pages/CTV/JoinCtv.tsx:26`, `website/src/pages/CTV/JoinCtv.tsx:44`, `website/src/pages/CTV/JoinCtv.tsx:66`, `website/src/pages/CTV/JoinCtv.tsx:90`).
- Business rules / invariants: Referral code is `CTV-` plus hex prefix of upline partner id (`api/src/routes/ctvPublic.js:13`, `api/src/routes/ctvPublic.js:45`); dental row is authoritative for resolving upline code/phone (`api/src/routes/ctvPublic.js:52`, `api/src/routes/ctvPublic.js:66`); join requires name, phone, email, password, and referral code or upline phone (`api/src/routes/ctvPublic.js:392`, `api/src/routes/ctvPublic.js:398`); password must be at least six characters (`api/src/routes/ctvPublic.js:395`); duplicate phone/email checks span both DBs (`api/src/routes/ctvPublic.js:416`); new CTV inherits upline LOB scope and always includes dental (`api/src/routes/ctvPublic.js:430`).
- Edge / failure cases the code handles (and how): Invalid referral code returns `U_INVALID_CODE` (`api/src/routes/ctvPublic.js:346`); missing upline phone/code returns `U_UPLINE_REQUIRED` (`api/src/routes/ctvPublic.js:398`); duplicate phone/email return `U_DUPLICATE_PHONE` or `U_DUPLICATE_EMAIL` (`api/src/routes/ctvPublic.js:423`, `api/src/routes/ctvPublic.js:426`).
- Data dependencies: `/api/ctv-public/refcode/:code`, `/api/ctv-public/ctv-lookup`, `/api/ctv-public/join`, `/api/ctv-public/client-lookup`, `/api/ctv-public/services`, `/api/ctv-public/bookings`.
- STATUS: working

### FEEDBACK-1

- ID: FEEDBACK-1
- Slice/Domain: User/admin feedback and auto error threads.
- Route(s) + entry file: `/feedback` in `website/src/App.tsx:358`, entry `website/src/pages/Feedback.tsx:1`; Settings feedback tab in `website/src/pages/Settings/index.tsx:19`; APIs `/api/Feedback` in `api/src/routes/feedback/userRoutes.js:29` and `api/src/routes/feedback/adminRoutes.js:56`.
- Trigger: User submits feedback with optional files; user replies to own thread; admin opens all feedback, replies, changes status, or deletes a thread; frontend telemetry posts auto errors.
- Preconditions: `/feedback` route requires `permissions.view` (`website/src/constants/index.ts:145`); admin feedback edit UI requires `permissions.edit` (`website/src/pages/Feedback.tsx:17`); user feedback endpoints require auth (`api/src/routes/feedback/userRoutes.js:29`); admin routes require `requireAdmin` (`api/src/routes/feedback/adminRoutes.js:56`).
- Expected observable behavior: Unread count is polled for badge behavior (`api/src/routes/feedback/userRoutes.js:29`); user submit creates a thread and first message (`api/src/routes/feedback/userRoutes.js:72`); admin list/detail includes user metadata and error event metadata for auto source (`api/src/routes/feedback/adminRoutes.js:56`, `api/src/routes/feedback/adminRoutes.js:111`).
- Business rules / invariants: Feedback content or file is required (`api/src/routes/feedback/userRoutes.js:76`); uploads allow up to five files per submit/reply (`api/src/routes/feedback/userRoutes.js:72`, `api/src/routes/feedback/adminRoutes.js:184`); admin unread count excludes auto errors and counts pending user-submitted threads (`api/src/routes/feedback/userRoutes.js:34`).
- Edge / failure cases the code handles (and how): Empty content/no file returns 400 (`api/src/routes/feedback/userRoutes.js:79`); missing thread returns 404 (`api/src/routes/feedback/userRoutes.js:183`, `api/src/routes/feedback/adminRoutes.js:153`); delete removes attachment records and stored files (`api/src/routes/feedback/adminRoutes.js:301`).
- Data dependencies: `/api/Feedback`, `/api/Feedback/unread-count`, `/api/Feedback/my`, `/api/Feedback/my/:threadId/reply`, `/api/Feedback/all`, `/api/Feedback/all/:threadId`, `/api/Feedback/all/:threadId/status`, public `/api/telemetry/errors`.
- STATUS: working

### SETTINGS-1

- ID: SETTINGS-1
- Slice/Domain: Settings, bank settings, IP access, system preferences.
- Route(s) + entry file: `/settings` in `website/src/App.tsx:277`, entry `website/src/pages/Settings/index.tsx:28`; APIs `/api/SystemPreferences`, `/api/settings/bank`, `/api/IpAccess`.
- Trigger: Staff opens Settings, changes system preferences, bank account settings, IP access mode/entries, timezone UI, or feedback admin tab.
- Preconditions: Route requires `settings.view` (`website/src/constants/index.ts:140`); edit controls require `settings.edit` (`website/src/pages/Settings/index.tsx:32`); feedback tab is visible only for users with `permissions.view` and editable with `permissions.edit` (`website/src/pages/Settings/index.tsx:31`, `website/src/pages/Settings/index.tsx:33`).
- Expected observable behavior: Settings tabs render system, bank, IP, and admin feedback where allowed (`website/src/pages/Settings/index.tsx:21`, `website/src/pages/Settings/index.tsx:34`); system preferences and bank/IP hooks call their backend APIs (`website/src/hooks/useSettings.ts:338`, `website/src/hooks/useBankSettings.ts:25`, `website/src/hooks/useIpAccessControl.ts:48`).
- Business rules / invariants: IP modes are `allow_all`, `block_all`, `whitelist_only`, and `blacklist_block` (`api/src/middleware/ipAccess.js:48`); `/api/IpAccess/*` management routes bypass the IP gate (`api/src/middleware/ipAccess.js:89`); `SystemPreferences` stores arbitrary key rows through CRUD/bulk routes (`api/src/routes/systemPreferences.js:12`, `api/src/routes/systemPreferences.js:167`).
- Edge / failure cases the code handles (and how): Invalid/missing preference keys are handled by route-level CRUD status responses (`api/src/routes/systemPreferences.js:65`, `api/src/routes/systemPreferences.js:156`); IP management route failures are surfaced by hooks (`website/src/hooks/useIpAccessControl.ts:48`).
- Data dependencies: `/api/SystemPreferences`, `/api/SystemPreferences/:key`, `/api/SystemPreferences/bulk`, `/api/settings/bank`, `/api/IpAccess/settings`, `/api/IpAccess/entries`, `/api/IpAccess/check`.
- STATUS: working

### WEBSITE-1

- ID: WEBSITE-1
- Slice/Domain: Website content pages.
- Route(s) + entry file: `/website` in `website/src/App.tsx:267`, entry `website/src/pages/Website.tsx:1`; API `/api/WebsitePages` in `api/src/routes/websitePages.js:13`.
- Trigger: Staff opens Website, edits content pages, or attempts to add a page.
- Preconditions: Route requires `website.view` (`website/src/constants/index.ts:129`).
- Expected observable behavior: Website data hook fetches website pages and supports create/update/delete page APIs (`website/src/hooks/useWebsiteData.ts:77`, `website/src/hooks/useWebsiteData.ts:159`, `website/src/hooks/useWebsiteData.ts:180`).
- Business rules / invariants: WebsitePages backend supports list, detail, create, update, and delete (`api/src/routes/websitePages.js:13`, `api/src/routes/websitePages.js:64`, `api/src/routes/websitePages.js:83`, `api/src/routes/websitePages.js:119`, `api/src/routes/websitePages.js:201`).
- Edge / failure cases the code handles (and how): Website service listing data is local-only and defaults empty (`website/src/hooks/useWebsiteData.ts:21`, `website/src/hooks/useWebsiteData.ts:38`); Add Page button has no handler in the page entry (`website/src/pages/Website.tsx:66`).
- Data dependencies: `/api/WebsitePages`.
- STATUS: partial

### INTEGRATIONS-1

- ID: INTEGRATIONS-1
- Slice/Domain: Face recognition, address autocomplete, external checkups.
- Route(s) + entry file: Global face button in `website/src/components/shared/GlobalFaceIdButton.tsx:55`; customer face profile flow in `website/src/components/customer/CustomerProfile/index.tsx:55`; dev address route `/test/address` in `website/src/App.tsx:179`; APIs `/api/face`, `/api/Places`, `/api/ExternalCheckups`.
- Trigger: Staff clicks face ID, registers/re-registers a face, types address in dev route, or loads external checkup images/data from a customer profile.
- Preconditions: Face and external checkup API paths require auth unless under public paths (`api/src/server.js:155`); Places backend requires `GOOGLE_PLACES_API_KEY` (`api/src/routes/places.js:17`); External checkups require external service config (`api/src/routes/externalCheckups.js:27`).
- Expected observable behavior: Face recognition navigates to a matched customer (`website/src/components/shared/GlobalFaceIdButton.tsx:55`, `website/src/components/shared/GlobalFaceIdButton.tsx:59`); face registration posts captured image (`website/src/components/shared/GlobalFaceIdButton.tsx:111`); address autocomplete calls Places endpoints (`website/src/components/shared/AddressAutocomplete.tsx:107`, `website/src/components/shared/AddressAutocomplete.tsx:159`).
- Business rules / invariants: Face routes expose recognize/register/re-register/status (`api/src/routes/faceRecognition.js:42`, `api/src/routes/faceRecognition.js:73`, `api/src/routes/faceRecognition.js:137`, `api/src/routes/faceRecognition.js:212`); Places returns 500 when API key missing (`api/src/routes/places.js:17`); external checkup image/upload endpoints return 503 when config missing (`api/src/routes/externalCheckups.js:27`, `api/src/routes/externalCheckups.js:175`).
- Edge / failure cases the code handles (and how): Places component warns on missing Vite key (`website/src/components/shared/AddressAutocomplete.tsx:88`); external lookup returns empty checkups when unconfigured (`api/src/routes/externalCheckups.js:78`).
- Data dependencies: `/api/face/recognize`, `/api/face/register`, `/api/face/re-register`, `/api/face/status/:partnerId`, `/api/Places/autocomplete`, `/api/Places/details`, `/api/ExternalCheckups/*`.
- STATUS: partial

### AVATAR-1

- ID: AVATAR-1
- Slice/Domain: Avatar selection.
- Route(s) + entry file: No route entry found; avatar-adjacent display is in employee/profile/layout components (`website/src/hooks/useEmployees.ts:58`, `website/src/components/Layout.tsx:396`); backend image endpoint is `GET /api/web/Image2` in `api/src/server.js:323`.
- Trigger: Avatar-like employee/profile/sidebar surfaces render display-only initials/avatar fields or face-registration controls; no avatar picker/upload action is present in source.
- Preconditions: None found for avatar selection because no picker/upload flow exists.
- Expected observable behavior: Employee avatar field is mapped from API or empty fallback (`website/src/hooks/useEmployees.ts:58`); collapsed layout initials button logs out, not expand/avatar select (`website/src/components/Layout.tsx:396`); `/api/web/Image2` returns 204 no-content (`api/src/server.js:323`).
- Business rules / invariants: No avatar selection business rule exists in source. The implemented image-adjacent feature is face recognition/registration (`website/src/components/shared/GlobalFaceIdButton.tsx:55`, `api/src/routes/faceRecognition.js:42`).
- Edge / failure cases the code handles (and how): Avatar image requests receive no content from the stub endpoint (`api/src/server.js:323`).
- Data dependencies: None for avatar selection; `/api/web/Image2` stub and face endpoints are separate.
- STATUS: broken

## Auth & Roles Matrix

| Role / permission state | Accessible routes / APIs |
|---|---|
| Public visitor | `/login`, `/welcome`, `/ctv/join`, `/test/address` client routes (`website/src/App.tsx:173`); public API paths are login variants, `/api/IpAccess/check`, `/api/health`, public telemetry, and `/api/ctv-public/*` (`api/src/server.js:140`, `api/src/server.js:143`, `api/src/server.js:145`). |
| Authenticated non-CTV staff | Admin routes only when `ROUTE_PERMISSIONS[path]` is satisfied (`website/src/App.tsx:111`, `website/src/constants/index.ts:121`); CTV route redirects away unless `user.isCtv` (`website/src/App.tsx:122`). |
| CTV user | `/ctv` route only from client guard (`website/src/App.tsx:122`); admin routes redirect to `/ctv` (`website/src/App.tsx:106`); CTV self permissions are assigned when no permission group exists (`api/src/services/permissionService.js:89`). |
| Admin permission state | Admin group names/IDs are detected and get `*` (`api/src/services/permissionService.js:25`, `api/src/services/permissionService.js:89`); admin login payload gets both LOB scopes (`api/src/routes/auth.js:142`). |
| Cosmetic-scoped staff | `/api/cosmetic/*` only when `COSMETIC_LOB_ENABLED=true`, `lob_scope` includes cosmetic, and user has `cosmetic.access` (`api/src/server.js:218`, `api/src/server.js:222`, `api/src/server.js:236`). |
| Route-level permissions | `overview.view`, `calendar.view`, `customers.view`, `employees.view`, `locations.view`, `customers.edit`, `services.view`, `website.view`, `reports.view`, `commission.view`, `settings.view`, `notifications.view`, `permissions.view`, `payment.view` are route gates in `website/src/constants/index.ts:121`. |

## Config-as-data Map

| Key/source | What it controls |
|---|---|
| `ROUTES` (`website/src/constants/index.ts:90`) | Client route path constants. |
| `ROUTE_PERMISSIONS` (`website/src/constants/index.ts:121`) | Admin route access checks in `ProtectedRoute`. |
| `NAVIGATION_ITEMS` (`website/src/constants/index.ts:165`) | Sidebar groups/items and nav-only group paths. |
| `APPOINTMENT_TYPE_LABELS` (`website/src/constants/index.ts:222`) | Appointment/service category labels. |
| `TIME_SLOTS` (`website/src/constants/index.ts:267`) | Calendar time grid slots from 08:00 through 19:30. |
| `APPOINTMENT_CARD_COLORS` (`website/src/constants/index.ts:312`) | Calendar appointment color IDs and labels. |
| `APPOINTMENT_STATUS_OPTIONS` (`website/src/constants/index.ts:400`) | UI status filter/dropdown options. |
| `VALID_STATES` / phase map (`contracts/appointment.ts:12`, `website/src/lib/appointmentStatusMapping.ts:1`) | Backend appointment status contract and UI phase-to-API mapping. |
| `tgclinic_token` (`website/src/contexts/AuthContext.tsx:23`) | Local auth token key. |
| `tgclinic_lob`, `VITE_DEFAULT_LOB` (`website/src/contexts/BusinessUnitContext.tsx:26`, `website/src/contexts/BusinessUnitContext.tsx:40`) | Current LOB persistence and deployment default. |
| `COSMETIC_LOB_ENABLED` (`api/src/server.js:218`) | Enables `/api/cosmetic/*` mirror. |
| `partners.tier_id`, `permission_groups`, overrides (`api/src/services/permissionService.js:73`, `api/src/services/permissionService.js:105`) | Effective permission/role state. |
| `PaymentBaseSchema.method/status/deposit_type` (`contracts/payment.ts:11`, `contracts/payment.ts:15`, `contracts/payment.ts:19`) | Payment method/status/deposit-type domain. |
| `commission_level_config` (`api/src/routes/commissionConfig.js:31`) | Commission level labels, enabled state, and share percentages. |
| `commission_settings.referral_start_product_id` (`api/src/routes/ctvPublic.js:273`, `api/src/routes/ctv.js:989`) | Default product attached to referral-start appointments when no service is selected. |
| `STANDARD_OVERRIDE_SHARES` (`api/src/services/ctvNetwork.js:3`) | CTV hierarchy fallback override percentages only when configured level rows are unavailable. |
| Product catalog fields (`api/src/routes/products.js:50`, `api/src/routes/products.js:229`) | Nearest runtime source for offers/services: active flag, price, category, company, type. |
| IP mode (`api/src/middleware/ipAccess.js:48`) | IP gate mode behavior. |

## Money / Format & Invariant Rules

| Rule | Source |
|---|---|
| VND display truncates decimals, groups with dot separators, and appends ` ₫`. | `website/src/lib/formatting.ts:12`. |
| Payment methods are `cash`, `bank_transfer`, `deposit`, `mixed`; statuses are `posted`, `voided`; deposit types are `deposit`, `refund`, `usage`. | `contracts/payment.ts:11`, `contracts/payment.ts:15`, `contracts/payment.ts:19`. |
| Payment creation requires customer, amount > 0, and method. | `api/src/routes/payments.js:28`. |
| Deposit/payment category is inferred from allocations, deposit fields, method, service id, and amount. | `api/src/routes/payments.js:40`. |
| Receipt numbers are `TUKH/{VietnamYear}/{00000}`. | `api/src/routes/payments/helpers.js:37`. |
| Allocation over residual is rejected beyond 0.01 tolerance. | `api/src/routes/payments/helpers.js:52`. |
| Payment allocations decrement sale-order or dotkham residuals using `GREATEST(0, residual - amount)`. | `api/src/routes/payments.js:92`, `api/src/routes/payments.js:116`. |
| Deposit balance equals deposited minus used minus refunded, excludes voided payments, and is clamped to >= 0. | `api/src/routes/customerBalance.js:21`, `api/src/routes/customerBalance.js:50`, `api/src/routes/customerBalance.js:52`. |
| Outstanding balance sums non-cancelled sale-order residuals and dotkham residuals, clamped to >= 0. | `api/src/routes/customerBalance.js:58`, `api/src/routes/customerBalance.js:75`. |
| Refunds insert negative deposit payments and can write negative commission reversals. | `api/src/routes/payments.js:192`, `api/src/routes/payments.js:219`. |
| Payment delete/void is blocked after related earnings are paid or have `payout_id`. | `api/src/routes/payments.js:321`, `api/src/routes/payments.js:401`. |
| Monthly plan down payment must be nonnegative and less than total; installments count must be >= 1. | `api/src/routes/monthlyPlans.js:186`, `api/src/routes/monthlyPlans.js:192`. |
| Monthly plan cannot be deleted if any installment is paid. | `api/src/routes/monthlyPlans.js:367`. |
| Commission is explicit-CTV, per-service, pay-as-paid, append-only, and idempotent per payment/service/recipient/level. | `api/src/services/commissionEngine.js:4`. |
| Enabled commission share sum must be <= 100%. | `api/src/routes/commissionConfig.js:69`. |
| Commission upline depth caps at five levels and guards cycles. | `api/src/services/commissionEngine.js:60`. |
| Refund commission reversal writes negative earnings and preserves level/source linkage. | `api/src/services/commissionEngine.js:159`. |
| Payout settlement locks selected pending earnings, creates a payout total equal to selected earning amounts, and marks those earnings paid. | `api/src/routes/payouts.js:196`, `api/src/routes/payouts.js:215`, `api/src/routes/payouts.js:227`. |
| Payout receipt uploads accept jpeg/png/gif/webp, max 5 MB, and non-GIF images compress to 1920px JPEG quality 80. | `api/src/routes/payouts.js:89`, `api/src/routes/payouts.js:100`, `api/src/routes/payouts.js:109`. |
| No USDT-only funding rule exists in this codebase. | No `USDT` references found in source during extraction; see `OPEN QUESTIONS`. |

## Known-broken List

1. Avatar selection is not implemented: no picker/upload route found; employee avatar is display-only (`website/src/hooks/useEmployees.ts:58`), collapsed sidebar initials button logs out (`website/src/components/Layout.tsx:396`), and `/api/web/Image2` returns 204 (`api/src/server.js:323`). STATUS: broken.
2. `/api/Services` is removed/dead (`api/src/server.js:44`, `api/src/server.js:194`). STATUS: broken if tested directly.
3. `/api/CrmTasks` is removed/dead (`api/src/server.js:32`, `api/src/server.js:178`). STATUS: broken if tested directly.
4. Legacy `/api/Account` and `/Web/Session` are commented out (`api/src/server.js:162`). STATUS: broken/legacy.
5. Duplicate `GET /api/ctv/me` handlers exist (`api/src/server.js:281`, `api/src/routes/ctvProfile.js:37`, `api/src/routes/ctv.js:537`). STATUS: partial/ambiguous.
6. Duplicate telemetry POST surfaces exist (`api/src/server.js:140`, `api/src/routes/telemetry.js:51`). STATUS: partial/ambiguous.
7. Notifications page is placeholder/static (`website/src/pages/Notifications.tsx:1`). STATUS: partial.
8. Locations create only closes modal (`website/src/pages/Locations.tsx:193`); location metrics are unavailable (`website/src/hooks/useLocations.ts:123`). STATUS: partial.
9. Overview Today Services table is placeholder-only (`website/src/components/modules/TodayServicesTable.tsx:1`). STATUS: partial.
10. Website Add Page has no handler (`website/src/pages/Website.tsx:66`) and website services are local-only/default empty (`website/src/hooks/useWebsiteData.ts:21`). STATUS: partial.
11. Service visit status and cancel are local-only state updates (`website/src/hooks/useServices.ts:232`, `website/src/hooks/useServices.ts:255`). STATUS: partial.
12. Payment wallet rows/stats are empty/zero in frontend hook (`website/src/hooks/usePayment.ts:125`, `website/src/hooks/usePayment.ts:247`). STATUS: partial.
13. Customer camera quick-add uses mock data/timers (`website/src/components/customer/CustomerCameraWidget.tsx:51`, `website/src/components/customer/customerCameraMockData.ts:3`). STATUS: partial.
14. Google Places and External Checkups depend on missing/available env/config (`api/src/routes/places.js:17`, `api/src/routes/externalCheckups.js:27`). STATUS: unknown until environment is verified.
15. Customer report `sources` field is placeholder (`api/src/routes/reports/customers.js:23`). STATUS: partial.

## OPEN QUESTIONS

1. Appointment status truth is split: the UI status options include `scheduled`, `arrived`, `cancelled` (`website/src/constants/index.ts:400`) while the contract/phase mapping includes more states (`contracts/appointment.ts:12`, `website/src/lib/appointmentStatusMapping.ts:1`). Which set is canonical for TestSprite assertions?
2. Offers are not a distinct runtime config surface. The nearest live source is product/service catalog pricing (`api/src/routes/products.js:50`, `api/src/routes/products.js:229`). Is there another offers module outside this repo for TestSprite coverage?
3. Product `commission_rate_percent` is still exposed by product APIs (`api/src/routes/products.js:134`, `api/src/routes/products.js:232`), but the active commission engine says product commission rate is removed/unused (`api/src/services/commissionEngine.js:8`). Are product-level commission rate assertions out of scope?
4. Payment update route uses `payment.add` in backend binding (`api/src/routes/payments.js:251`) while the permission catalog has separate `payment.edit` semantics (`website/src/pages/PermissionBoard/constants.ts:43`). Which permission is intended for editing an existing payment?
5. Payment delete semantics differ: backend defaults to soft delete if `hard` is absent (`api/src/routes/payments.js:316`) while frontend delete client defaults `hard=true` (`website/src/lib/api/payments.ts:185`). Which behavior is the canonical TestSprite expectation?
6. Legacy `ctvActions.js` creates a Referral Start saleorder card, but the mounted CTV booking routes explicitly create appointments only (`api/src/routes/ctv.js:913`, `api/src/routes/ctvPublic.js:166`). Is `ctvActions.js` stale and out of scope?
7. Payout `GET`/`PATCH` default to Cosmetic when `lob` is omitted (`api/src/routes/payouts.js:137`, `api/src/routes/payouts.js:261`). Do direct API tests include omitted-LOB behavior or always send `lob`?
8. `GET /api/ctv/me` is duplicated in two routers (`api/src/server.js:281`, `api/src/routes/ctvProfile.js:37`, `api/src/routes/ctv.js:537`). Is the older handler removable, or is `ctvProfile` authoritative for tests?
9. Public and authenticated telemetry both define `POST /api/telemetry/errors` (`api/src/server.js:140`, `api/src/routes/telemetry.js:51`). Does TestSprite verify only the public pre-auth behavior?
10. Avatar selection is absent and `/api/web/Image2` returns 204 (`api/src/server.js:323`). Is avatar selection expected in NK3, or does TestSprite assert this as broken/missing?
11. Notification behavior is placeholder/static (`website/src/pages/Notifications.tsx:1`). Is a notification API planned elsewhere?
12. Locations create closes the modal without API persistence (`website/src/pages/Locations.tsx:193`). Is location create excluded or logged as failing?
13. Overview Today Services is placeholder-only (`website/src/components/modules/TodayServicesTable.tsx:1`). Are today-service assertions skipped in Overview tests?
14. Website Add Page has no handler (`website/src/pages/Website.tsx:66`). Do Website tests cover edit existing pages only?
15. Service visit/cancel controls are local-only (`website/src/hooks/useServices.ts:232`, `website/src/hooks/useServices.ts:255`). Does TestSprite avoid asserting persistence after reload?
16. Payment wallet stats are hardcoded zero and wallet rows empty (`website/src/hooks/usePayment.ts:125`, `website/src/hooks/usePayment.ts:247`) while deposit top-up API exists (`website/src/hooks/usePayment.ts:273`). Is `/payment` wallet summary intentionally disabled?
17. Customer camera quick-add uses mock data (`website/src/components/customer/CustomerCameraWidget.tsx:51`). Is this excluded from live tests?
18. Google Places and External Checkups require env/config (`api/src/routes/places.js:17`, `api/src/routes/externalCheckups.js:27`). Are those configured on `tmv.2checkin.com`?
19. No USDT/funding source exists in this codebase; all money rules found here are VND/payments/deposits (`website/src/lib/formatting.ts:12`, `contracts/payment.ts:11`). Are crypto/funding tests out of scope for NK3?
20. Settlement split is implemented as commission levels and payouts (`api/src/routes/commissionConfig.js:31`, `api/src/routes/payouts.js:196`), not a separate settlement module. Is “settlement” in TestSprite expected to mean payout settlement?
21. Cosmetic route availability depends on `COSMETIC_LOB_ENABLED` (`api/src/server.js:218`). Does TestSprite first assert flag-on behavior on `tmv.2checkin.com` before running Cosmetic flows?
22. Report accuracy is code-backed by report endpoints, but not validated against Odoo/source-of-truth data in this extraction (`api/src/routes/reports.js:5`). What source defines expected report totals?
