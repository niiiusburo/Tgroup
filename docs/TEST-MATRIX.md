# TGroup Clinic — Test Matrix

> "If you change X, run test suite Y." Maps modules → regression tests. Includes coverage requirements.

**Cosmetic LOB v2 Sync (2026-05-21):** Phase-1 complete (LOB isolation, CTV earnings aggregation, D13 engine, migrate-rollback). Phase-2 Task-1: `api/src/__tests__/adminLobPermissions.test.js` (9 tests: migration 048 structure, idempotency, admin UUID, permissions). Phase-2 Task-2: `api/src/__tests__/cosmeticTransactionalSeed.test.js` (15 tests: seed-cosmetic-lob-transactional.js structure, CTV referrer, D13 source='ctv', refund reversals, --dry-run). All 24 tests passing. See product-map/domains/earnings-commissions.yaml + ctv.yaml + v2 spec Testing Strategy.



## Traceability IDs

Use UC/WF IDs from `docs/USE-CASES.md` and `docs/WORKFLOWS.md` for feature traceability. Contract IDs in this matrix are compact route labels, for example `CON-Reports-RevenueSummary` = `POST /api/Reports/revenue/summary`, `CON-Reports-CashFlowSummary` = `POST /api/Reports/cash-flow/summary`, `CON-Reports-ServicesBreakdown` = `POST /api/Reports/services/breakdown`, `CON-Exports-Preview` = `POST /api/Exports/:type/preview`, and `CON-Exports-Download` = `POST /api/Exports/:type/download`.

Current governance note: when changing `contracts/payment.ts`, `website/src/hooks/useDeposits.ts`, or `/reports/revenue` payment totals together, run the contracts build plus the focused payment and reports tests before treating the method enum or revenue-recognition behavior as safe.

## Coverage Requirements by Domain

| Domain | Minimum Coverage | Test Types Required |
|---|---|---|
| Auth | 80% | Unit (backend), E2E (frontend), rate limiter |
| Appointments | 75% | Unit (frontend + backend), E2E, integration |
| Customers & Partners | 75% | Unit (frontend + backend), E2E, search filters |
| Payments & Deposits | 80% | Unit (allocation math), backend route, E2E |
| Services Catalog | 70% | Unit (frontend), backend route, delete guards |
| Reports & Exports | 60% | Backend export builders, E2E downloads, workbook verification |
| Settings & System | 70% | Unit (timezone, version check), E2E |
| Integrations | 60% | Face recognition API, Hosoonline proxy, telemetry auth |

## Module → Test Mapping

### Auth & Permissions

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/middleware/auth.js` | `api/tests/loginRateLimiter.test.js`, `api/tests/readRoutePermissions.test.js`, all E2E auth specs | Single point of failure for all protected routes. |
| `api/src/routes/auth.js` | Same as above + `website/e2e/auth-setup.spec.ts`; include the cosmetic-only employee case in `api/tests/loginRateLimiter.test.js` when `COSMETIC_LOB_ENABLED=true` | Login payload shape changes break frontend AuthContext; TMV Cosmetic employees may exist only in the Cosmetic identity DB. |
| `api/src/services/permissionService.js` | `api/tests/readRoutePermissions.test.js`, `website/e2e/permissions-*.spec.ts` | Effective permission divergence causes 403s. |
| `api/src/server.js` CORS / `/api/ctv` mounts | `api/src/__tests__/nk3CorsOrigin.test.js`, `api/src/__tests__/ctvRouteGating.test.js` | TMV/NK3 browser origins must be allowed without reopening an unguarded CTV route mount. |
| `api/src/routes/ctv.js` self-dashboard reads | `api/src/__tests__/ctvRouteGating.test.js`, live `GET /api/ctv/me` as admin must return 403 `S_CTV_ONLY` | CTV commission/referral/profile reads are cross-DB and must remain CTV-only even when admins have broad permissions. |
| `api/src/routes/ctv.js` referral booking writes and `api/src/services/ctvBookingCompany.js` | `api/src/routes/__tests__/ctvBookings.test.js`, `api/src/services/__tests__/ctvBookingCompany.test.js`, `api/src/services/__tests__/referralClaim.test.js`, `website/src/components/ctv/CtvReferModal.test.tsx`, admin `/customers?lob=cosmetic` search smoke for the accepted client after deploy | CTV booking can reclaim an existing partner row; accepted clients must be marked `customer=true` so admin customer search finds them without duplicate identities. Booking must resolve non-null `appointments.companyid`, prefer real clinic fallback companies over QA/test fixtures, create an appointment only, never a saleorder/service card; omitted service metadata defaults to Referral Start when configured, and phone lookup may prefill the name only for an available existing client. |
| `api/src/routes/ctvs.js`, `website/src/components/commission/CtvManagementTab.tsx`, `website/src/lib/api/ctv.ts` | `api/src/__tests__/cosmeticLobGuards.test.js`, website build/typecheck, live `/commission` CTV tab screenshot after deployment/import | Admin CTV management must be available in Dental and Cosmetic mode, and legacy imports must show a visible source marker. |
| `api/src/services/loginIdentifier.js`, `api/src/services/legacyCtvPassword.js`, `api/src/routes/auth.js`, `website/src/pages/Login.tsx` | `api/src/services/__tests__/loginIdentifier.test.js`, `api/src/services/__tests__/legacyCtvPassword.test.js`, CTV login smoke after legacy import | Imported legacy CTV phone/ref-code login and salted-SHA256 hashes are accepted only for rows marked `legacy_ctv_import*`, then migrated to bcrypt on successful login. |
| `api/scripts/import-legacy-ctvs.js` | `node api/scripts/import-legacy-ctvs.js --dry-run --out artifacts/ctv-import/20260528-legacy-source/legacy-ctv-import-plan.json`, live count checks before/after confirmed import | Legacy CTV identity imports must remain deterministic, skip ambiguous partner matches, mirror Dental/Cosmetic rows with the same UUID, and produce an audit before any write. |
| NK3 `dbo.partners` rows marked `legacy_ctv_import*` or legacy CTV hierarchy repair data | Fresh source/target backups, dry-run artifact review, live Dental/Cosmetic counts, orphan-upline count, admin `GET /api/Ctvs` + `GET /api/cosmetic/Ctvs`, and CTV `GET /api/ctv/hierarchy` smoke for a known root CTV | Live CTV data repairs must preserve copied legacy password hashes, avoid duplicate partner rows, attach every resolvable upline/downline in both databases, and leave root CTVs with no upline. |
| `website/src/contexts/AuthContext.tsx` | `website/e2e/auth-setup.spec.ts`, `website/e2e/permissions-check.spec.ts` | Auth state hydration affects every protected page. |
| `website/src/contexts/BusinessUnitContext.tsx` | `website/src/contexts/__tests__/BusinessUnitContext.test.tsx`, live Cosmetic browser request audit | Active LOB must initialize from persisted/query Cosmetic before child effects fetch, or Cosmetic pages can leak first-render Dental/global requests. |
| `website/src/constants/index.ts` (ROUTE_PERMISSIONS) | All E2E specs that navigate protected routes | Route guard changes may hide/show pages incorrectly. |
| `website/src/App.tsx` (`AppRoutes`, `<Routes key={currentLOB}>`) and `website/src/contexts/BusinessUnitContext.tsx` | `website/src/__tests__/App.remount.test.tsx` (4 assertions, incl. source-level grep for `<Routes key={currentLOB}>`), `website/src/contexts/__tests__/BusinessUnitContext.test.tsx` | LOB toggle relies on `<Routes>` being keyed by `currentLOB` so the subtree unmounts+remounts and stale dental data does not flash when switching to cosmetic. Spec §"LOB Toggle Behavior" line ~195. |
| `website/src/lib/api/core.ts` (`apiFetch` lobPrefix line) | `website/src/lib/api/__tests__/apiFetch.lob.test.ts` (5 vitest assertions) | Phase-1 gap B. `apiFetch({ lob: 'cosmetic' })` must prepend `/cosmetic` to every endpoint, otherwise cosmetic data hooks silently fall back to dental endpoints and leak cross-LOB data. |
| `website/src/App.tsx` (`ProtectedRoute` `is_ctv` gate) | `website/src/__tests__/ProtectedRoute.ctv.test.tsx` (4 vitest assertions, incl. source-level grep for `is_ctv` and `<Navigate to="/ctv" replace />`) | Phase-1 gap C. Spec D14: users with `is_ctv === true` (or legacy `isCtv === true`) must never enter admin routes — every `ProtectedRoute` redirects them to `/ctv` first. |
| `api/src/server.js` `/api/cosmetic/*` mount + `api/src/middleware/auth.js` `requireLobScope` | `api/src/__tests__/cosmeticLobGuards.test.js` (13 jest assertions, incl. structural regex on `server.js`) | Phase-1 gap D. Flag off → 503 `COSMETIC_LOB_DISABLED`; flag on + missing scope or CTV → 403 `S_LOB_FORBIDDEN`; flag on + scope → gate cleared. Catches deletion of the flag check, the 503 branch, the `requireLobScope('cosmetic')` call, the `app.use('/api/cosmetic', ...)` mount, or the `/CommissionConfig` + `/Ctvs` cosmetic admin mirrors required by `/commission` after LOB rewrite. |
| `api/migrations/048_grant_lob_permissions_to_admin.sql` (Phase-2 Task-1) | `api/src/__tests__/adminLobPermissions.test.js` (9 jest assertions: migration file presence, naming, permission keys cosmetic.access/dental.access/lob.crossview, idempotency ON CONFLICT DO NOTHING, admin group UUID 11111111-0000-0000-0000-000000000001, rollback comments, atomic VALUES clause) | Phase-2 Task-1. Auto-grants cosmetic.access, dental.access, lob.crossview to Admin group. Enables multi-scope admin access to /api/dental/* and /api/cosmetic/* without manual PermissionBoard. Idempotent, applies to both tdental_demo and tcosmetic_demo. Catches deletion of migration file, permission key typos, missing rollback notes, or idempotency pattern breakage. |
| `api/scripts/seed-cosmetic-lob-transactional.js` (Phase-2 Task-2) | `api/src/__tests__/cosmeticTransactionalSeed.test.js` (15 jest assertions: script existence, shebang, INSERT INTO appointments/payments/earnings, source='ctv' for earnings, refund reversals, CTV referrer check, idempotency ON CONFLICT DO NOTHING, consultations table graceful fallback, --dry-run mode, function exports, per-customer earnings loops) | Phase-2 Task-2. Populates tcosmetic_demo with 2-3 customers + 3-5 appointments (past/today/future) + 3-5 payments + earnings with source='ctv' (D13 attribution) + refund reversals (negative amounts, append-only validation). Validates CTV referrer existence, sets referred_by_ctv_id on customers, handles optional consultations table. Critical path "Make CTV real". Catches missing INSERT statements, missing CTV validation, missing refund logic, or broken idempotency. |

### CTV & Commission

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/ctv.js`, `api/src/routes/ctvActions.js`, `api/src/routes/ctvClientJourneys.js`, `api/src/routes/ctvHelpers.js`, `website/src/pages/CTV/CtvDashboard.tsx` | `npx jest --runInBand src/routes/__tests__/ctvBookings.test.js src/services/__tests__/referralClaim.test.js src/services/__tests__/referralCard.test.js src/services/__tests__/commissionEngine.test.js`; `npm --prefix website test -- src/pages/CTV/CtvDashboard.test.tsx src/pages/CTV/tabs/CtvTrackingTab.test.tsx src/__tests__/ProtectedRoute.ctv.test.tsx src/lib/api/__tests__/ctv.booking.test.ts`; live/read-only smoke `GET /api/ctv/commission-summary`, `/api/ctv/referrals`, `/api/ctv/client-journeys`, `/api/ctv/me` as a CTV user | CTV routes are the approved cross-DB composition surface. Booking writes must preserve the referral-claim gate, appointment-only booking behavior, selected LOB DB routing, and one non-duplicated Tracking/Theo dõi bottom-nav destination. |
| `website/src/pages/CTV/*`, `website/src/components/ctv/*`, `website/src/lib/api/ctv.ts`, `website/src/lib/i18n/ctv.ts`, `website/src/i18n/locales/*/ctv.json` | `npm --prefix website test -- src/components/ctv/CtvReferModal.test.tsx src/__tests__/ProtectedRoute.ctv.test.tsx src/lib/api/__tests__/ctv.booking.test.ts src/pages/CTV/CtvDashboard.test.tsx src/pages/CTV/tabs/CtvTrackingTab.test.tsx`; `npm --prefix website run build`; live `/ctv` desktop and mobile screenshots after deploy | CTV users bypass the admin shell and rely on a dedicated mobile-first portal. The Tracking tab depends on `/api/ctv/client-journeys`; booking-sheet errors depend on `B_CLIENT_CLAIMED` compatibility fields; the refer-client date defaults to Vietnam today; language toggle and nullable display fallbacks must remain EN/VI-safe. |

### Appointments & Calendar

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/appointments.js` | `api/src/routes/appointments/__tests__/readHandlers.test.js`, `website/e2e/team-alpha-appointments.spec.ts` | Calendar data shape changes break all views. |
| `website/src/components/appointments/unified/useAppointmentForm.ts` | `website/src/components/appointments/unified/__tests__/useAppointmentForm.test.ts` | Locks appointment create/update payload shape and active-LOB routing for `/api/cosmetic/Appointments`. |
| `api/src/routes/appointments/mutationHandlers.js` and `website/src/components/appointments/unified/appointmentForm.mapper.ts` | `api/src/routes/appointments/__tests__/mutationHandlers.test.js` (covers companyId valid-UUID write, `400 INVALID_COMPANY_ID` on malformed UUID, `404 COMPANY_NOT_FOUND` on missing FK), `website/src/components/appointments/unified/__tests__/appointmentForm.mapper.test.ts` (covers locationId → payload.companyid + AppointmentUpdateSchema parse) | Appointment edit saves must persist changed clinic/location (`companyid`) and still preserve explicit null staff clears. |
| `api/src/services/exports/builders/appointmentsExport.js` | `api/src/services/exports/__tests__/appointmentsExport.test.js`, `api/src/services/exports/__tests__/timezone.test.js` | Appointment exports must use the calendar `appointments.date` value, preserve date/time boundaries, and match phone searches such as `922403152`. |
| `website/src/pages/Calendar.tsx` | `website/e2e/team-alpha-appointments.spec.ts`, `website/src/pages/Calendar.click.test.tsx` | Core scheduling surface. |
| `website/src/components/calendar/*.tsx` | Component unit tests + `website/e2e/team-alpha-appointments.spec.ts` | Drag-to-reschedule, filter chips, status badges. |
| `website/src/components/calendar/CalendarToolbar.tsx` and `CalendarDateNavigator.tsx` | `website/src/components/calendar/__tests__/CalendarToolbar.test.tsx`, `/calendar` 1024x768, 1280x720, and 1366x768 screenshot checks | Tablet and laptop toolbar wrapping must keep view tabs, date navigation, search, export, filter, and quick-add visible while appointments populate. |
| Appointment late-reminder messaging (`api/src/routes/appointments*`, future `api/src/routes/notifications*`, `api/src/workers/messagingWorker.js`, `/calendar`, `/notifications`) | Late-candidate query tests, notification permission tests, provider dry-run tests, idempotency tests, branch/location-scope tests, provider webhook signature tests, `/calendar` and `/notifications` TestSprite screenshot checks | UC-005/WF-002 planned extension. Late reminders must not duplicate sends, leak medical detail, ignore opt-out state, spoof provider status, bypass branch scope, or treat `partners.phone` as a unique identity. |
| `contracts/appointment.ts` | All appointment-related unit and E2E tests | Schema change cascades to both runtimes. |

### Customers & Partners

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/partners.js` | `api/src/routes/partners/__tests__/*.test.js` | Customer CRUD, search, uniqueness logic. |
| `contracts/partner.ts` | `npm --prefix contracts run build`, `api/src/routes/partners/__tests__/partnerValidation.test.js` | Shared customer create/update validation must continue accepting migrated optional DOB fields without blocking unrelated profile edits. |
| Cosmetic mirror mounts in `api/src/server.js` | Cosmetic API smoke for `/CustomerSources`, `/Permissions`, `/DotKhams`, `/settings`, `/ExternalCheckups`, `/face`, `/Exports`; `api/src/__tests__/cosmeticAdminMirrors.test.js` | Frontend Cosmetic callers must have request-scoped mirror routes and must not fall back to dental/global endpoints. |
| `api/src/routes/customerBalance.js` | `api/src/routes/__tests__/customerBalance.lob.test.js`, `api/src/__tests__/cosmeticCustomerBalanceMount.test.js`, `website/src/hooks/useDeposits.test.tsx` | Locks request-scoped customer balance reads so Cosmetic deposit summary cards use `/api/cosmetic/CustomerBalance/:id`, count deposit-category advances instead of unallocated service collections, and exclude soft-deleted saleorders from outstanding debt. |
| `website/src/hooks/useCustomers.ts` and `website/src/lib/api/partners.ts` | `website/src/hooks/__tests__/useCustomers.lob.test.ts` | Customer create/update must pass active LOB so cosmetic company FKs validate against cosmetic `dbo.companies`. |
| `website/src/components/forms/AddCustomerForm/` | `AddCustomerForm.test.tsx`, `website/e2e/customer-create-save.spec.ts` | New-customer intake is high-frequency workflow. |
| `website/src/components/customer/CustomerProfile/` | `CustomerProfile.test.tsx`, `website/e2e/customer-profile-crud.spec.ts` | Profile tabs (appointments, services, payments, photos). |
| `api/src/routes/faceRecognition.js` | `api/tests/faceRecognition.test.js` | Face registration, re-registration, recognition, and provider routing. |

### Services Catalog

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/products.js` service create/edit | `api/src/__tests__/productsNormalizeImport.test.js`, live `POST/PUT /api/Products` and `/api/cosmetic/Products` smoke | Product writes populate `namenosign` through `normalizeVietnamese`; missing imports break service creation for both Dental and Cosmetic. |
| `website/src/pages/ServiceCatalog.tsx` / service catalog hooks | Service catalog component tests, `/service-catalog` screenshots for Dental and Cosmetic | Service catalog is a shared Dental/Cosmetic workflow and must keep category filters, active toggles, and delete guards working. |
| `website/src/components/services/ServiceForm.tsx`, `ServiceSourceSelector.tsx`, `website/src/hooks/useServices.ts`, `website/src/hooks/useSettings.ts`, or `website/src/lib/api/saleOrders.ts` service source handling | `npm --prefix website test -- src/hooks/useServices.payment-state.test.tsx src/hooks/useSettings.customerSources.test.tsx`; browser screenshot of Cosmetic customer add-service on `https://tmv.2checkin.com/customers/:id?lob=cosmetic` | Locks `sourceid` as an active-LOB UUID-only value so fallback/stale Dental customer-source chips cannot block `/api/cosmetic/SaleOrders` creation. |

### Employees & HR

| If you change... | Run these tests... | Why |
|---|---|---|
| `website/src/components/employees/EmployeeForm.tsx`, `EmployeeProfile.tsx`, or `website/src/lib/api/employees.ts` LOB handling | `website/src/components/employees/__tests__/EmployeeForm.lob.test.tsx`, `website/src/lib/api/__tests__/employees.lob.test.ts`, live `/employees` Cosmetic LOB add-employee screenshot check | NK3/CTV Cosmetic LOB employee workflows must load branch choices from `/api/cosmetic/Companies` and save via `/api/cosmetic/Employees`, never dental `/api/Companies` locations. |
| `website/src/components/employees/EmployeeTable.tsx` | `website/src/components/employees/__tests__/EmployeeTable.test.tsx`, `/employees` 1280x720, 1366x768, and 1440x900 screenshot checks | Long role/location labels must not push the edit action offscreen on desktop workstations. |
| `website/src/components/employees/EmployeeForm.tsx` and `website/src/lib/api/employees.ts` | `website/src/components/employees/EmployeeForm.lob.test.tsx` | Locks cosmetic branch loading and employee create/update routing through `/api/cosmetic/Companies` and `/api/cosmetic/Employees`. |
| `website/src/components/shared/DataTable.tsx` sticky-column behavior | Component tests for each table using `sticky: 'right'`, plus the affected route screenshot check | Sticky action cells are shared table infrastructure and must not introduce page-level horizontal overflow or hide row actions. |

### Payments & Deposits

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/payments.js` | `api/tests/readRoutePermissions.test.js`, `website/e2e/team-charlie-payments.spec.ts`, `website/src/lib/allocatePaymentSources.test.ts` | Money logic is high-risk. |
| `website/src/hooks/useDeposits.ts`, `website/src/hooks/useCustomerPayments.ts`, `website/src/hooks/usePayment.ts`, and `website/src/lib/api/payments.ts` | `website/src/hooks/useDeposits.test.tsx`, `website/src/hooks/__tests__/useCustomerPayments.lob.test.ts` | Locks cosmetic payment/deposit creates, deposit list, deposit usage, void/delete/update, and balance refresh against cosmetic payment routes. |
| `api/src/routes/payments/helpers.js` | `website/src/lib/allocatePaymentSources.test.ts`, payment backend tests | Allocation math, receipt generation, residual validation. |
| `website/src/components/payment/PaymentForm.tsx` | `PaymentForm.submit.test.tsx`, `website/e2e/vietqr-payment.spec.ts` | Payment entry and mixed-method breakdown. |
| `contracts/payment.ts` | `npm --prefix contracts run build`, `website/src/hooks/useDeposits.test.tsx`, `website/src/components/payment/PaymentHistory.test.tsx`, `website/src/components/payment/CustomerDeposits.test.tsx`, `website/e2e/team-charlie-payments.spec.ts`, `website/e2e/vietqr-payment.spec.ts` | Schema change cascades into payment method labels, deposit history, VietQR-as-bank-transfer entry, reports/export grouping, and shared package consumers. |
| `api/src/routes/monthlyPlans.js` | `website/e2e/team-charlie-payments.spec.ts` | Installment plan payments. |

### Reports & Exports

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/exports.js` | `website/e2e/export-downloads.spec.ts`, `api/src/services/exports/__tests__/legacyFlatReportsExport.test.js`, `api/src/services/exports/__tests__/reportSalesEmployeesExport.test.js` | UC-013/UC-019, WF-005. Locks `CON-Exports-Preview` and `CON-Exports-Download` as current `POST /api/Exports/:type/...` contracts plus workbook generation. |
| `api/src/services/exports/builders/*.js` COLUMNS arrays | `api/src/services/exports/__tests__/featureCatalog.crosscheck.test.js` (40 assertions) | **Feature Catalog Lock**: If you modify any export builder's COLUMNS, DATA_COLUMNS, REVENUE_COLUMNS, or DEPOSIT_COLUMNS arrays, the Jest cross-check test validates that `product-map/features/exports/*.yaml` specifications match code exactly (keys and headers, order-sensitive). Update the YAML file in lockstep with builder code changes. All 8 exports (appointments, customers, payments, services, service-catalog, report-sales-employees, revenue-flat, deposit-flat) use this pattern. Land 2026-05-21 on `fix/feedback-reports` — additive test only, does not touch builder code. |
| `api/src/services/exports/builders/legacyFlatReportsExport*.js` | `api/src/services/exports/__tests__/legacyFlatReportsExport.test.js`, `website/e2e/export-downloads.spec.ts` | UC-013, WF-005. Locks `revenue-flat` and `deposit-flat` workbook templates, SO-code column mapping, payment/deposit note columns, revenue source precedence, deposit cash/bank split fallback, posted service-payment filters, allocation proration SQL, row-limit errors, and deposit top-up filtering. |
| `api/src/services/exports/builders/reportSalesEmployeesExport.js` | `api/src/services/exports/__tests__/reportSalesEmployeesExport.test.js`, `website/src/pages/reports/__tests__/ReportsSubpages.test.tsx` | UC-019, WF-005. Locks `report-sales-employees` preview/download filters, location scope, employee-type attribution, grouped workbook rows, and `/reports/revenue` export controls. |
| `api/src/routes/reports/revenue*.js` | `api/src/routes/reports/__tests__/revenueRecognition.test.js`, `api/src/services/reports/__tests__/canonicalRevenue.test.js` | UC-013, WF-013. Locks `CON-Reports-RevenueSummary`, revenue trend, doctor/category/location/source paid revenue, canonical Excel-matching WHERE/JOIN topology, payment-date bucketing, and allocation capping. |
| `api/src/routes/reports/revenueRecognition.js` direct receipt rules | `api/src/routes/reports/__tests__/revenueRecognition.test.js` | Locks direct posted `payment_category = 'payment'` receipts with no allocation rows into summary/trend/location paid totals, including imported cosmetic receipts with blank `service_id`; by-location must expose unassigned paid receipts instead of dropping them while excluding deposits, refunds, usage, and voided rows. |
| `api/src/routes/reports/cashFlow.js` | `api/src/routes/reports/__tests__/cashFlow.test.js` | UC-013, WF-013. Locks `CON-Reports-CashFlowSummary`, service collections vs deposits/refunds/deposit usage/voided rows, route mounting, timezone-safe date buckets, and scoped location rejection. |
| `api/src/routes/reports/servicesBreakdown.js` | `api/src/routes/reports/__tests__/servicesBreakdown.test.js` | UC-013, WF-013. Locks `CON-Reports-ServicesBreakdown` so service/category/source revenue comes from posted payment allocations instead of listed service prices or raw order totals. |
| `website/src/hooks/useReportData.ts` | `website/src/hooks/__tests__/useReportData.test.ts` | UC-013, WF-013. Locks report API calls as POST payloads and strips the all-location sentinel from request bodies. |
| `website/src/pages/reports/ReportsRevenue.tsx` and other `website/src/pages/reports/*` subpages | `website/src/pages/reports/__tests__/ReportsSubpages.test.tsx`, `website/e2e/export-downloads.spec.ts` | UC-013/UC-019, WF-013. Locks visible revenue recognition basis, cash-flow cards, employee export controls, loading/error states, and report subpage routing. |
| `nginx.conf` or `nginx.docker.conf` | `website/e2e/export-downloads.spec.ts` (large dataset) | Timeout behavior for long-running exports. |

### Settings & System

| If you change... | Run these tests... | Why |
|---|---|---|
| `website/src/contexts/TimezoneContext.tsx` | `website/src/__tests__/timezone.context.test.tsx`, `website/src/__tests__/timezone.core.test.ts` | Timezone conversion affects all date displays. |
| `website/src/hooks/useVersionCheck.ts` | `website/src/__tests__/useVersionCheck.test.ts` | Version polling and update prompt. |
| `api/src/routes/telemetry.js` | `api/tests/telemetry.test.js`, `api/tests/telemetryAuth.test.js` | Public vs auth-required telemetry routes. |
| `api/src/routes/feedback/*.js` or `api/src/routes/feedback/attachments.js` | `api/tests/feedbackAttachments.test.js`, live `/feedback` screenshot check after any production restore | Feedback proof images cross DB rows and `/uploads/feedback` files; failures can leave broken resolution evidence. |
| `api/src/middleware/ipAccess.js` | `website/e2e/login-and-settings.spec.ts` | IP whitelist enforcement. |

### Integrations

| If you change... | Run these tests... | Why |
|---|---|---|
| `api/src/routes/externalCheckups.js` | `api/src/routes/__tests__/externalCheckups.test.js` | Hosoonline auth, patient search, image proxy. |
| `website/src/components/shared/FaceCaptureModal.tsx` / `website/src/components/shared/useFaceCaptureController.ts` / `website/src/components/shared/faceCaptureEngine.ts` | `website/src/components/shared/FaceCaptureModal.test.tsx`, `website/src/components/shared/faceCaptureEngine.test.ts`, `website/src/components/customer/CustomerCameraWidget.test.tsx`, `website/src/components/shared/GlobalFaceIdButton.test.tsx`, `website/src/hooks/__tests__/useFaceRecognition.test.ts` | Camera lifetime, no-face messaging, auto-capture gating, and caller error propagation. |
| `api/src/routes/faceRecognition.js` | `api/tests/faceRecognition.test.js` | Face register/re-register/recognize API contract in local and CompreFace modes. |
| `api/src/services/comprefaceClient.js` / `api/src/services/comprefaceFaceProvider.js` | `api/src/services/__tests__/comprefaceClient.test.js`, `api/src/services/__tests__/comprefaceFaceProvider.test.js` | CompreFace multipart file upload, subject/example calls, health check, no-face normalization, and partner subject mapping. |
| Future SMS/Zalo provider adapters and messaging provider env (`api/src/services/messaging*`, `api/src/providers/sms*`, `api/src/providers/zalo*`) | Provider contract tests with dry-run, failed response, invalid phone, template rejection, delivery status, and retry/backoff cases | External messaging providers must remain optional, auditable, and safe to disable without blocking appointment/calendar workflows. |
| `face-service/` Python code | `api/tests/faceRecognition.integration.test.js`, manual face-service health check | Local-provider model inference and embedding generation. |

### Infrastructure

| If you change... | Run these tests... | Why |
|---|---|---|
| `docker-compose.yml` | `docker compose config`, local smoke test | Service topology and env var shape. |
| `scripts/deploy-tbot.sh` | `bash -n scripts/deploy-tbot.sh` | Syntax validation. |
| `Dockerfile.api` or `Dockerfile.web` | Local build: `docker build -f Dockerfile.api .` | Build breakage detection. |

## Coverage Gaps (Known)

| Domain | Missing Coverage | Risk |
|---|---|---|
| **Payments (backend allocation/void/refund)** | No backend unit tests for allocation edge cases, void logic, or refund math | **High** — money correctness relies on manual testing. |
| **Auth (backend permission resolution)** | No backend tests for `requirePermission` or `resolvePermissions` divergence | **High** — silent 403s or unauthorized access. |
| **Reports (legacy reconciliation)** | Targeted tests now cover current revenue recognition, cash-flow classification, services breakdown, and canonical revenue SQL, but there is still no automated full reconciliation against legacy Odoo/TDental audit exports | **Medium** — financial data can still drift outside the covered route formulas. |
| **Exports route shell** | Builder tests cover `legacyFlatReportsExport` and `reportSalesEmployeesExport`, but `/api/Exports/:type/preview` and `/api/Exports/:type/download` route-level permission filtering, audit-failure behavior, and row-limit response handling still need direct route tests | **Medium** — route wrapper behavior can drift while builder tests pass. |
| **Commission calculation** | No E2E or unit tests | **Medium** — unknown auto-calc trigger. |
| **Monthly plan installments** | No tests for `PUT /api/MonthlyPlans/:id/installments/:installmentId/pay`, plan completion, or next-installment advancement | **Medium** — plan status may miscalculate and the current route does not create a payments ledger row. |
| **Feedback moderation attachments** | Permission declarations are covered indirectly, but no E2E covers admin reply upload, attachment persistence, deletion, or orphan-file cleanup | **Low** — partial UI/permission coverage exists. |
| **IP Access backend enforcement** | Frontend component/types/validation tests exist, but middleware and `/api/IpAccess/*` route behavior lack focused backend integration tests | **Medium** — lockout and fail-open behavior are operationally sensitive. |

## Test Commands Quick Reference

```bash
# Frontend unit tests
npm --prefix website test

# Frontend lint
npm --prefix website run lint

# Frontend build
npm --prefix website run build

# API tests
npm --prefix api test

# Contracts build
npm --prefix contracts run build

# E2E tests
npm --prefix website run test:e2e

# Specific E2E spec
npm --prefix website run test:e2e -- e2e/export-downloads.spec.ts

# Deploy script syntax check
bash -n scripts/deploy-tbot.sh

# Docker compose validation
docker compose config

# Face ID engine (Global Face ID button, customer camera, AddCustomerForm)
# Validate: open via top-bar Face ID button → auto-capture in 5-15s on any browser
# Validate: 5-frame burst → sharpest sent to /api/face/recognize
# Validate: 15s force-capture safety net fires on poor light
# Validate: profile-mode 3-pose registration unchanged
# Tests: npm --prefix website run test -- shared/FaceCaptureModal shared/faceCaptureEngine shared/GlobalFaceIdButton customer/CustomerCameraWidget hooks/useFaceRecognition

# External-checkup gallery (Hosoonline) — HealthCheckupGallery + HealthCheckupEmptyState
# Validate: customer with patientExists:false → empty state shows checkupEmptyPatientMissing VN/EN guidance and Tạo bệnh nhân HSO CTA (requires external_checkups.upload)
# Validate: customer with patientExists:true and no checkups → checkupEmptyNoImages, points at Thêm lịch khám
# Validate: source=hosoonline-auth-failed|unavailable|not-configured → amber warning string from i18n, not hardcoded English
# Validate: clicking Tạo bệnh nhân HSO → emerald createExternalPatientSuccess notice, then upload button appears after refresh
# Regression: customer with checkups + images still renders gallery normally (e.g. /api/ExternalCheckups/T6281 returns 2 checkups; image proxy /api/ExternalCheckups/images/<name> returns 200 + JPEG)
# Tests: npm --prefix website run test -- customer/HealthCheckupGallery customer/HealthCheckupEmptyState customer/AuthenticatedCheckupImage
```

| `scripts/require-clean-tree.sh`, `Dockerfile.web` GIT_SHA arg, `api/src/services/exports/__tests__/allBuilderColumns.lock.test.js` | bash smoke test on dirty tree; `/version.json` curl; `npx jest src/services/exports/__tests__/allBuilderColumns.lock.test.js` | 2026-05-20 defense-in-depth additions: refuse dirty builds (Layer 1), stamp real git SHA into version.json (Layer 2), lock 6 more export column registries (Layer 4). |
| `website/src/components/shared/FeedbackWidget.tsx`, `website/src/contexts/AuthContext.tsx`, `website/src/components/reports/BarChart.tsx`, `website/src/pages/reports/ReportsRevenue.tsx` | Playwright login + visual check: hint "Có vấn đề?" renders next to MessageSquare icon on fresh login; clicking × dismisses; reload preserves dismissal; logout+login again re-shows hint. Reports → Revenue → Xu hướng dòng tiền chart: confirm labels render rotated -90° (computed transform = `matrix(0, -1, 1, 0, 0, …)`) and dates "22 thg 4", "23 thg 4", … are fully visible (no "4..." truncation). | 2026-05-21 v0.32.37 — login feedback hint + BarChart auto-vertical labels (>=8 bars) plus explicit `labelOrientation="vertical"` on cash-flow trend. |
