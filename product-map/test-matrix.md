# TGroup Test Matrix

> Map of all test files to the domains, endpoints, components, and flows they cover.

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
| `components/customer/CustomerCameraWidget.test.tsx` | Integrations | Face capture camera widget UI |
| `components/customer/CustomerProfile.test.tsx` | Customers | CustomerProfile tabs and data display |
| `components/customer/ServiceHistory.test.tsx` | Services | Service history list rendering |
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
| `components/shared/FaceCaptureModal.test.tsx` | Integrations | Face capture modal UI states |
| `contexts/__tests__/appointment-hover.context.test.tsx` | Appointments | AppointmentHoverContext state |
| `hooks/__tests__/useCustomers.cskh.test.ts` | Customers | `useCustomers` CSKH filtering |
| `hooks/__tests__/useCustomers.permissions.test.ts` | Auth | `useCustomers` permission-gated behavior |
| `hooks/__tests__/useFaceRecognition.test.ts` | Integrations | `useFaceRecognition` hook logic |
| `hooks/__tests__/useReportData.test.ts` | Reports | `useReportData` aggregation formatting |
| `hooks/useBankSettings.test.ts` | Settings | `useBankSettings` fetch and update |
| `hooks/useOverviewAppointments.test.tsx` | Overview | `useOverviewAppointments` filtering |
| `i18n/__tests__/i18n-coverage.test.ts` | i18n | Namespace coverage and missing keys |
| `lib/allocatePaymentSources.test.ts` | Payments | `allocatePaymentSources` utility math |
| `lib/apiFetch.test.ts` | API/Core | `apiFetch` error handling and conversions |
| `lib/formatting.test.ts` | Shared | Date/currency formatting utilities |
| `lib/utils.test.ts` | Shared | Generic utility functions |
| `lib/vietqr.test.ts` | Payments | VietQR URL generation logic |
| `pages/Overview.test.tsx` | Overview | Overview page stats and schedule rendering |
| `pages/reports/__tests__/ReportsDashboard.test.tsx` | Reports | ReportsDashboard KPI cards |
| `pages/reports/__tests__/ReportsSubpages.test.tsx` | Reports | Reports sub-page routing and data |

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
| `faceRecognition.test.js` | Integrations | Compreface face register/recognize API |

## Coverage Gaps

| Domain | Missing Test Coverage |
|--------|----------------------|
| **Payments (backend)** | No backend tests for payment allocation, void, refund, or deposit logic |
| **Auth (backend)** | No backend tests for `requirePermission` or `resolvePermissions` divergence |
| **Appointments (backend)** | No backend tests for appointment CRUD or validation |
| **Reports** | No automated accuracy tests for SQL aggregations |
| **Commission** | No E2E or unit tests for commission calculation |
| **Monthly Plans** | No tests for installment payment flows |
| **External Checkups** | No tests for Hosoonline integration |
| **Feedback** | No tests for attachment upload or admin moderation |
| **Website CMS** | No tests for page CRUD |
| **Permissions** | No backend tests for permission override edge cases |
