# TGroup Test Matrix

> Map of all test files to the domains, endpoints, components, and flows they cover.

## Traceability Convention

Feature coverage should cite the UC/WF IDs from `docs/USE-CASES.md` and `docs/WORKFLOWS.md`; contract coverage should cite compact route labels such as `CON-Reports-RevenueSummary`, `CON-Reports-CashFlowSummary`, `CON-Reports-ServicesBreakdown`, `CON-Exports-Preview`, and `CON-Exports-Download`.

## Unit Tests (`website/src/**/*.test.*`)

| Test File | Domain | What It Tests |
|-----------|--------|---------------|
| `__tests__/appointment-form-edit.test.tsx` | Appointments | Appointment form edit flow, state persistence |
| `__tests__/customer-deep-link.test.tsx` | Customers | Deep linking to customer profile from external URL |
| `__tests__/i18n-toggle.test.ts` | Settings/i18n | Language toggle logic and key resolution |
| `__tests__/ServiceCatalog.test.tsx` | Services | Service catalog listing and search |
| `__tests__/timezone.context.test.tsx` | Settings | TimezoneContext behavior |
| `__tests__/timezone.core.test.ts` | Settings | Core timezone conversion utilities |
| `__tests__/useVersionCheck.test.ts` | Settings | `useVersionCheck` polling and update prompt |
| `components/appointments/AppointmentForm.test.tsx` | Appointments | AppointmentForm validation and submission |
| `components/customer/__tests__/CustomerProfile.i18n.test.tsx` | Customers | CustomerProfile i18n label rendering |
| `components/customer/CustomerCameraWidget.test.tsx` | Integrations | Face capture camera widget UI and no-face capture retention |
| `components/customer/CustomerProfile.test.tsx` | Customers | CustomerProfile tabs and data display |
| `components/customer/AuthenticatedCheckupImage.test.tsx` | Integrations | Authenticated Hosoonline image proxy URL resolution |
| `components/customer/ServiceHistory.test.tsx` | Services | Service history list rendering |
| `components/forms/AddCustomerForm/AddCustomerForm.test.tsx` | Customers | Customer profile form excludes hidden customer source field |
| `components/modules/__tests__/appointment-hover-link.test.tsx` | Appointments | Appointment hover card deep-linking |
| `components/modules/__tests__/EditAppointmentModal.test.tsx` | Appointments | EditAppointmentModal state and actions |
| `components/modules/__tests__/patient-checkin-hover.test.tsx` | Appointments | Patient check-in hover interactions |
| `components/modules/__tests__/PatientCheckIn.i18n.test.tsx` | Appointments | PatientCheckIn i18n keys |
| `components/modules/PatientCheckIn.test.tsx` | Appointments | Check-in flow state transitions |
| `components/payment/__tests__/PaymentForm.submit.test.tsx` | Payments | PaymentForm submission logic |
| `components/payment/CustomerDeposits.test.tsx` | Payments | Customer deposit list rendering |
| `components/payment/PaymentHistory.test.tsx` | Payments | Payment history table and filters |
| `components/payment/VietQrModal.test.tsx` | Payments | VietQR modal generation and copy |
| `components/shared/CurrencyInput.test.tsx` | UI/Shared | CurrencyInput formatting and validation |
| `components/shared/DoctorSelector.test.tsx` | Employees | DoctorSelector search and selection |
| `components/shared/FaceCaptureModal.test.tsx` | Integrations | Face capture modal UI states and no-face camera lifetime |
| `components/shared/faceCaptureEngine.test.ts` | Integrations | Face capture scoring, no-face gating, and side-pose fallback behavior |
| `components/shared/GlobalFaceIdButton.test.tsx` | Integrations | Header Face ID recognition, camera lifetime, and no-face errors |
| `contexts/__tests__/appointment-hover.context.test.tsx` | Appointments | AppointmentHoverContext state |
| `hooks/__tests__/useCalendarData.pagination.test.ts` | Appointments | Calendar range fetch uses the optimized calendar-mode appointment API and groups appointments by date |
| `hooks/__tests__/useCustomers.cskh.test.ts` | Customers | `useCustomers` CSKH filtering |
| `hooks/__tests__/useCustomers.permissions.test.ts` | Auth | `useCustomers` permission-gated behavior |
| `hooks/__tests__/useFaceRecognition.test.ts` | Integrations | `useFaceRecognition` hook logic |
| `hooks/__tests__/useReportData.test.ts` | Reports | UC-013/WF-013: `useReportData` report POST payloads, all-location sentinel stripping, loading/error/refetch behavior; covers `CON-Reports-*` frontend bridge |
| `hooks/useBankSettings.test.ts` | Settings | `useBankSettings` fetch and update |
| `hooks/useOverviewAppointments.test.tsx` | Overview | `useOverviewAppointments` filtering |
| `i18n/__tests__/i18n-coverage.test.ts` | i18n | Namespace coverage and missing keys |
| `lib/allocatePaymentSources.test.ts` | Payments | `allocatePaymentSources` utility math |
| `lib/apiFetch.test.ts` | API/Core | `apiFetch` error handling and conversions |
| `lib/api/__tests__/apiFetch.lob.test.ts` | API/LOB | `apiFetch` LOB-aware routing v2.0: automatic path rewriting from `/api/X` to `/api/cosmetic/X` when `VITE_COSMETIC_LOB_ENABLED=true` and `tgclinic_lob='cosmetic'`; whitelisted routes bypass rewriting; feature flag and localStorage defaults tested |
| `components/ProtectedRoute/__tests__/protectedRoute.ctvRedirect.test.tsx` | Auth | AuthUser type extends with optional `is_ctv` and `lob_scope` fields; ProtectedRoute checks `is_ctv === true` and redirects CTV users to `/ctv` route; backward compatibility with undefined fields verified |
| `lib/formatting.test.ts` | Shared | Date/currency formatting utilities |
| `lib/utils.test.ts` | Shared | Generic utility functions |
| `lib/vietqr.test.ts` | Payments | VietQR URL generation logic |
| `pages/Calendar.click.test.tsx` | Appointments | Calendar week appointment click opens the edit modal without being hidden by range loading |
| `pages/Overview.test.tsx` | Overview | Overview page stats and schedule rendering |
| `pages/reports/__tests__/ReportsDashboard.test.tsx` | Reports | ReportsDashboard KPI cards |
| `pages/reports/__tests__/ReportsSubpages.test.tsx` | Reports | UC-013/UC-019/WF-013: reports sub-page routing, revenue recognition basis, cash-flow cards, employee revenue export controls, loading/error states, and report data rendering |

## E2E Tests (`website/e2e/*.spec.ts`)

| Test File | Domain | What It Tests |
|-----------|--------|---------------|
| `accent-insensitive-search.spec.ts` | Customers | Partner search with Vietnamese accents |
| `address-autocomplete.spec.ts` | Settings | Google Places address autocomplete |
| `appointment-status-persistence.spec.ts` | Appointments | Appointment status survives refresh |
| `auth-setup.spec.ts` | Auth | Login flow, token storage, auth state seeding |
| `bank-selector.spec.ts` | Payments | Bank dropdown selection in settings |
| `brand-rename.spec.ts` | UI/Shared | App name rebranding consistency |
| `brand-storage-keys.spec.ts` | UI/Shared | LocalStorage keys after rebrand |
| `bug-fixes-wave-1.spec.ts` | Cross-domain | Regression suite for wave 1 fixes |
| `calendar-april-seed-check.spec.ts` | Appointments | Calendar seeded data visibility |
| `check_arch_search_focus.spec.ts` | UI/Shared | Search input focus behavior |
| `check_arch_search.spec.ts` | UI/Shared | Search architecture consistency |
| `check_employees_page.spec.ts` | Employees | Employee list rendering and navigation |
| `clinic-7-fixes.spec.ts` | Cross-domain | Regression suite for clinic-7 fixes |
| `customer-create-save.spec.ts` | Customers | End-to-end customer creation |
| `customer-persistence-sweep.spec.ts` | Customers | Customer data survives edits/refresh |
| `customer-profile-crud.spec.ts` | Customers | Customer profile full CRUD |
| `debug-login-network.spec.ts` | Auth | Login network request inspection |
| `deep-audit-verification.spec.ts` | Cross-domain | Deep audit of data consistency |
| `employee-save.spec.ts` | Employees | Employee create/edit persistence |
| `export-downloads.spec.ts` | Reports/Exports | UC-013/WF-005: operational Excel downloads for customers, calendar, services, payments, and service catalog; validates workbook sheets, headers, dates, and numeric cells for `CON-Exports-Download` |
| `filter-location-dropdown.spec.ts` | Locations | Location filter dropdown behavior |
| `location-filter-appointments.spec.ts` | Appointments | Location filter applied to appointments |
| `login-and-settings.spec.ts` | Auth + Settings | Login + settings page smoke test |
| `overview-appointments.spec.ts` | Overview | Today’s appointments on dashboard |
| `permissions-check.spec.ts` | Auth | Permission gate smoke tests |
| `permissions-matrix.spec.ts` | Auth | Permission matrix UI accuracy |
| `permissions-tooltips.spec.ts` | Auth | Permission tooltip rendering |
| `phase2-quick-features.spec.ts` | Cross-domain | Phase 2 feature regression |
| `phase3-architecture-shifts.spec.ts` | Cross-domain | Phase 3 structural regression |
| `quick-page-check.spec.ts` | Cross-domain | All-page load smoke test |
| `team-alpha-appointments.spec.ts` | Appointments | Team Alpha appointment flows |
| `team-bravo-records.spec.ts` | Services | Team Bravo service record flows |
| `team-charlie-payments.spec.ts` | Payments | Team Charlie payment flows |
| `verify-timezone-local.spec.ts` | Settings | Timezone behavior in local dev |
| `version-display.spec.ts` | Settings | Version badge display |
| `version-update.spec.ts` | Settings | Version update prompt flow |
| `vietqr-payment.spec.ts` | Payments | VietQR generation in payment flow |
| `vps-all-pages-check.spec.ts` | Cross-domain | VPS deployment page smoke test |
| `vps-date-check.spec.ts` | Settings | VPS server date verification |
| `vps-debug-blank-page.spec.ts` | UI/Shared | VPS blank page debugging |
| `vps-final-verification.spec.ts` | Cross-domain | VPS final smoke test |
| `vps-overview-appointments.spec.ts` | Overview | VPS overview appointments check |
| `vps-payment-history.spec.ts` | Payments | VPS payment history check |
| `vps-sync-smoke.spec.ts` | Cross-domain | VPS database sync smoke test |
| `vps-tier-verification.spec.ts` | Auth | VPS permission tier check |
| `vps-timezone-check.spec.ts` | Settings | VPS timezone verification |
| `vps-verification.spec.ts` | Cross-domain | General VPS verification suite |

## API Tests (`api/tests/*.test.js`)

| Test File | Domain | What It Tests |
|-----------|--------|---------------|
| `loginRateLimiter.test.js` | Auth | Login rate limiter counts failed attempts only and scopes account lockout by email plus IP |
| `faceRecognition.test.js` | Integrations | Face register/recognize/re-register API in local and CompreFace provider modes |
| `src/services/__tests__/comprefaceClient.test.js` | Integrations | CompreFace REST client, native multipart uploads, auth header, subject/example calls, and health check |
| `src/services/__tests__/comprefaceFaceProvider.test.js` | Integrations | CompreFace provider mapping from subjects to customer records, registration status, and `NO_FACE` error normalization |
| `src/routes/appointments/__tests__/readHandlers.test.js` | Appointments | Calendar-mode appointment list allows large week ranges while skipping count/aggregate queries; normal lists remain capped |
| `src/routes/__tests__/externalCheckups.test.js` | Integrations | Hosoonline auth header, v2 patient search path, generated patient code, and migrated ref lookup behavior |
| `src/routes/partners/__tests__/mutationHandlers.test.js` | Customers | Customer edit allows phone values to overlap customer refs/phones while keeping UUID as identity |
| `src/routes/partners/__tests__/readHandlers.test.js` | Customers | Customer uniqueness helper treats phone as non-blocking and keeps email duplicate checks active |
| `src/routes/partners/__tests__/searchFilters.test.js` | Customers | Customer search matches related appointment and service order numbers |
| `saleOrders.test.js` | Services/Payments | Sale order edits recalculate residual display from `payment_allocations` |
| `tdentalImport.test.js` | Data/Money | TDental import mapping, payment status, local-only payment cleanup, CSV date parsing, and anomaly policy |
| `tdentalDryRun.test.js` | Data/Migration | Full-export dry-run staff/product matching and compact import planning |
| `telemetry.test.js` | Settings/Telemetry | Telemetry error ingestion, deduplication, management updates, fix attempts, and stats |
| `telemetryAuth.test.js` | Settings/Telemetry | Public-only error ingestion, auto-feedback Lark alert queueing, and auth-required telemetry management routes |
| `src/services/__tests__/larkNotifier.test.js` | Feedback/Integrations | Lark custom bot webhook URL validation, signed payload construction, and manual/auto feedback alert text |
| `readRoutePermissions.test.js` | Auth/Permissions | Backend route permission declarations, including scoped feedback admin actions |
| `src/routes/reports/__tests__/cashFlow.test.js` | Reports/Payments | UC-013/WF-013: `CON-Reports-CashFlowSummary`; cash-flow aggregation rules for service collections, deposits, refunds, deposit usage, voided rows, timezone-safe date buckets, route mounting, and scoped location rejection |
| `src/routes/reports/__tests__/revenueRecognition.test.js` | Reports/Payments | UC-013/WF-013: `CON-Reports-RevenueSummary` plus trend/doctor/category revenue; posted service payment allocations, deposit exclusion, allocation proration, and payment-date recognition |
| `src/routes/reports/__tests__/servicesBreakdown.test.js` | Reports/Services | UC-013/WF-013: `CON-Reports-ServicesBreakdown`; category/source revenue from posted payment allocations instead of listed service prices or raw order totals |
| `src/services/reports/__tests__/canonicalRevenue.test.js` | Reports/Exports | UC-013/WF-013: canonical revenue SQL mirrors the Excel `revenue-flat` export WHERE/JOIN topology, allocation capping expression, saleorder attribution, and payment-date bucketing |
| `src/services/exports/__tests__/legacyFlatReportsExport.test.js` | Reports/Exports | UC-013/WF-005: `revenue-flat` and `deposit-flat` registry, workbook templates, SO-code column mapping, posted service-payment filters, allocation proration SQL, deposit top-up filtering, and row-limit error |
| `src/services/exports/__tests__/reportSalesEmployeesExport.test.js` | Reports/Exports | UC-019/WF-005: `report-sales-employees` preview/download filters, location scope, employee-type SQL attribution, grouped workbook rows, and out-of-scope location rejection |
| `src/services/__tests__/referralClaim.test.js` | Commission/Referrals | `computeClaim` pure function: anchor date selection (latest of referral card date and last paid service date), 6-month expiration window, active/inactive state transitions; `getReferralClaimStatus` database queries: owner lookup via `referred_by_ctv_id`, referral product card date, last paid service date from `dbo.payments` with `customer_id` and `payment_date` columns, supports both direct DB and transaction context |

## Coverage Gaps

| Domain | Missing Test Coverage |
|--------|----------------------|
| **Payments (backend)** | No backend tests for payment allocation, void, refund, or deposit logic |
| **Exports (backend)** | `legacyFlatReportsExport` and `reportSalesEmployeesExport` have focused builder coverage; route-level gaps remain for `POST /api/Exports/:type/preview`, `POST /api/Exports/:type/download`, permission filtering, row-limit HTTP responses, and `exports_audit` failure behavior |
| **Auth (backend)** | No backend tests for `requirePermission` or `resolvePermissions` divergence |
| **Appointments (backend)** | Calendar list optimization is covered; no backend tests for appointment create/update/delete validation |
| **Reports** | Current revenue recognition, cash-flow classification, services breakdown, and canonical revenue SQL have targeted tests; missing full reconciliation against legacy Odoo/TDental audit exports |
| **Commission** | No E2E or unit tests for commission calculation |
| **Monthly Plans** | No tests for `PUT /api/MonthlyPlans/:id/installments/:installmentId/pay`, completed-plan status, or next pending installment advancement |
| **Feedback** | Attachment upload rendering has partial UI coverage through admin moderation route permission checks; admin reply upload, file storage/deletion, orphan-file cleanup, and live Lark delivery screenshot/proof still need E2E or manual production coverage |
| **IP Access** | Frontend component/type/validation coverage exists; backend middleware and `/api/IpAccess/*` route integration tests are still missing |
| **Website CMS** | No tests for page CRUD |
| **Permissions** | No backend tests for permission override edge cases |
