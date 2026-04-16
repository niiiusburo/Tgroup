# TGroup Hooks Index

> All custom React hooks, what they depend on, and who uses them.

## Active Hooks (imported by components/pages)

### `useAppointments.ts`
- **Purpose:** Fetch and filter appointments list.
- **API Calls:** `GET /api/Appointments`
- **Consumers:**
  - `pages/Appointments/index.tsx`
  - `pages/Customers.tsx` (appointment history tab)

### `useBankSettings.ts`
- **Purpose:** Fetch and update bank/VietQR settings.
- **API Calls:** `GET /api/settings/bank`, `PUT /api/settings/bank`
- **Consumers:**
  - `components/payment/VietQrModal.tsx`
  - `components/settings/BankSettingsForm.tsx`
  - `hooks/useBankSettings.test.ts`

### `useCalendarData.ts`
- **Purpose:** Fetch appointments shaped for calendar views.
- **API Calls:** `GET /api/Appointments`
- **Consumers:**
  - `pages/Calendar.tsx`

### `useCustomerPayments.ts`
- **Purpose:** Fetch payments for a specific customer.
- **API Calls:** `GET /api/Payments`, `GET /api/CustomerBalance/:id`
- **Consumers:**
  - `components/customer/CustomerProfile.tsx`
  - `components/customer/ServiceHistory.tsx`
  - `pages/Customers.tsx`

### `useCustomerProfile.ts`
- **Purpose:** Fetch full customer profile and related data.
- **API Calls:** `GET /api/Partners/:id`, `GET /api/Partners/:id/GetKPIs`
- **Consumers:**
  - `components/customer/CustomerProfile.tsx`
  - `components/customer/CustomerProfile/ProfileHeader.tsx`
  - `pages/Customers.tsx`

### `useCustomers.ts`
- **Purpose:** Fetch paginated customer list with search/filters.
- **API Calls:** `GET /api/Partners`
- **Consumers:**
  - `components/appointments/AppointmentForm.tsx`
  - `components/modules/EditAppointmentModal.tsx`
  - `components/services/ServiceForm.tsx`
  - `pages/Customers.tsx`
  - `pages/Customers/CustomerColumns.tsx`
  - `hooks/__tests__/useCustomers.cskh.test.ts`
  - `hooks/__tests__/useCustomers.permissions.test.ts`

### `useDeposits.ts`
- **Purpose:** Fetch deposit transactions and usage for a customer.
- **API Calls:** `GET /api/Payments/deposits`, `GET /api/Payments/deposit-usage`
- **Consumers:**
  - `components/customer/CustomerProfile.tsx`
  - `components/payment/CustomerDeposits.tsx`
  - `components/payment/DepositHistory.tsx`
  - `components/payment/PaymentForm.tsx`
  - `pages/Customers.tsx`

### `useDragReschedule.ts`
- **Purpose:** Drag-and-drop appointment rescheduling logic.
- **API Calls:** `PUT /api/Appointments/:id`
- **Consumers:**
  - `pages/Calendar.tsx`

### `useEmployees.ts`
- **Purpose:** Fetch employee list and details.
- **API Calls:** `GET /api/Employees`
- **Consumers:**
  - `components/appointments/AppointmentForm.tsx`
  - `components/customer/CustomerAssignments.tsx`
  - `components/modules/EditAppointmentModal.tsx`
  - `components/services/ServiceForm.tsx`
  - `components/settings/PermissionGroupConfig.tsx`
  - `pages/Calendar.tsx`
  - `pages/Employees/index.tsx`

### `useExternalCheckups.ts`
- **Purpose:** Fetch external health checkup data.
- **API Calls:** `GET /api/ExternalCheckups/:customerCode`
- **Consumers:**
  - `pages/Customers.tsx`

### `useFaceRecognition.ts`
- **Purpose:** Face registration and recognition via Compreface.
- **API Calls:** `POST /api/face/recognize`, `POST /api/face/register`
- **Consumers:**
  - `components/customer/CustomerCameraWidget.tsx`
  - `components/forms/AddCustomerForm/useAddCustomerForm.ts`
  - `hooks/__tests__/useFaceRecognition.test.ts`

### `useFormValidation.ts`
- **Purpose:** Generic form validation utility hook.
- **Consumers:** (not individually traced; likely used by multiple form components)

### `useIpAccessControl.ts`
- **Purpose:** Manage IP whitelist settings.
- **API Calls:** `GET/PUT /api/SystemPreferences` (inferred)
- **Consumers:**
  - `components/settings/IpAccessControl.tsx`

### `useLocations.ts`
- **Purpose:** Fetch clinic locations/companies.
- **API Calls:** `GET /api/Companies`
- **Consumers:**
  - `components/appointments/AppointmentForm.tsx`
  - `components/Layout.tsx`
  - `components/modules/EditAppointmentModal.tsx`
  - `components/services/ServiceForm.tsx`
  - `pages/Customers.tsx`
  - `pages/Employees/index.tsx`
  - `pages/Locations.tsx`
  - `pages/Overview.test.tsx`
  - `pages/Reports.tsx`

### `useMonthlyPlans.ts`
- **Purpose:** Fetch and manage monthly installment plans.
- **API Calls:** `GET/POST/PUT/DELETE /api/MonthlyPlans`
- **Consumers:**
  - `pages/Payment.tsx`

### `useOverviewAppointments.ts`
- **Purpose:** Fetch today’s appointments for the Overview dashboard.
- **API Calls:** `GET /api/Appointments` (with date filter)
- **Consumers:**
  - `components/modules/EditAppointmentModal.tsx`
  - `components/modules/PatientCheckIn.tsx`
  - `components/modules/TodayAppointments.tsx`
  - `pages/Calendar.tsx`
  - `pages/Overview.test.tsx`
  - `pages/Overview.tsx`
  - `hooks/useOverviewAppointments.test.tsx`

### `useOverviewData.ts`
- **Purpose:** Fetch aggregated Overview dashboard stats.
- **API Calls:** `POST /api/DashboardReports/GetSumary` (inferred)
- **Consumers:** (not individually traced)

### `usePayment.ts`
- **Purpose:** Fetch and manage payments.
- **API Calls:** `GET /api/Payments`, `POST /api/Payments`, etc.
- **Consumers:**
  - `pages/Payment.tsx`

### `usePermissionBoard.ts`
- **Purpose:** Fetch data for the PermissionBoard visualization.
- **API Calls:** `GET /api/Permissions/employees`, `GET /api/Permissions/groups`
- **Consumers:**
  - `pages/PermissionBoard/PermissionBoard.tsx`

### `usePermissionGroups.ts`
- **Purpose:** Fetch permission groups for settings.
- **API Calls:** `GET /api/Permissions/groups`
- **Consumers:**
  - `components/settings/PermissionGroupConfig.tsx`

### `usePermissions.ts`
- **Purpose:** Fetch resolved permissions (legacy or detail view).
- **API Calls:** `GET /api/Permissions/resolve/:employeeId`
- **Consumers:**
  - `components/locations/LocationDetail.tsx`

### `useProducts.ts`
- **Purpose:** Fetch product/service catalog.
- **API Calls:** `GET /api/Products`
- **Consumers:**
  - `components/appointments/AppointmentForm.tsx`
  - `components/services/ServiceForm.tsx`

### `useRelationshipsData.ts`
- **Purpose:** Fetch entity relationship graph data.
- **API Calls:** Various read endpoints
- **Consumers:**
  - `pages/Relationships.tsx`

### `useReportData.ts`
- **Purpose:** Fetch report data for all report sub-pages.
- **API Calls:** `POST /api/Reports/*`
- **Consumers:**
  - `pages/reports/ReportsAppointments.tsx`
  - `pages/reports/ReportsCustomers.tsx`
  - `pages/reports/ReportsDashboard.tsx`
  - `pages/reports/ReportsDoctors.tsx`
  - `pages/reports/ReportsEmployees.tsx`
  - `pages/reports/ReportsLocations.tsx`
  - `pages/reports/ReportsRevenue.tsx`
  - `pages/reports/ReportsServices.tsx`
  - `hooks/__tests__/useReportData.test.ts`

### `useServices.ts`
- **Purpose:** Fetch patient service records (sale orders).
- **API Calls:** `GET /api/SaleOrders`
- **Consumers:**
  - `components/services/ServiceForm.tsx`
  - `pages/Customers.tsx`
  - `pages/Services/index.tsx`

### `useSettings.ts`
- **Purpose:** Fetch system settings and configs.
- **API Calls:** `GET /api/SystemPreferences`, `GET /api/CustomerSources`
- **Consumers:**
  - `components/customer/CustomerAssignments.tsx`
  - `components/forms/AddCustomerForm/useAddCustomerForm.ts`
  - `components/settings/CustomerSourcesConfig.tsx`
  - `components/settings/RoleConfig.tsx`
  - `components/settings/ServiceCatalogSettings.tsx`
  - `components/settings/SystemPreferences.tsx`
  - `components/settings/SystemPreferencesContent.tsx`

### `useTodaySchedule.ts`
- **Purpose:** Fetch today’s schedule data.
- **API Calls:** `GET /api/Appointments` (date filtered)
- **Consumers:** (not individually traced)

### `useUniqueCheck.ts`
- **Purpose:** Generic uniqueness check hook.
- **Consumers:** (not individually traced)

### `useUniqueFieldCheck.ts`
- **Purpose:** Field-level uniqueness validation.
- **Consumers:**
  - `components/forms/AddCustomerForm/useAddCustomerForm.ts`

### `useVersionCheck.ts`
- **Purpose:** Poll `version.json` and prompt users to refresh.
- **API Calls:** `GET /version.json`
- **Consumers:**
  - `components/shared/VersionDisplay.tsx`

### `useWebsiteData.ts`
- **Purpose:** Fetch CMS website pages.
- **API Calls:** `GET /api/WebsitePages`
- **Consumers:**
  - `pages/Website.tsx`

## Orphan / Low-Usage Hooks

| Hook | Status | Note |
|------|--------|------|
| `useClientIp.ts` | **Orphan** | No non-test imports found. May be unused or imported dynamically. |
| `useFormValidation.ts` | **Hidden usage** | No direct component imports traced; may be used via barrel or copied inline. |
| `useOverviewData.ts` | **Hidden usage** | Not directly imported by traced components; may be dead or used via wrapper. |
| `useTodaySchedule.ts` | **Hidden usage** | Not directly imported by traced components. |
| `useUniqueCheck.ts` | **Hidden usage** | No direct component imports traced. |

## Test-Only Hooks

| Hook | Note |
|------|------|
| `useBankSettings.test.ts` | Companion test file for `useBankSettings.ts` |
| `useOverviewAppointments.test.tsx` | Companion test file for `useOverviewAppointments.ts` |
