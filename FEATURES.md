# FEATURES.md

> Reverse index: Business feature → exact files (frontend, backend, DB, tests)
> Based on codebase audit of worktree core-pillars-infra on 2026-04-18

---

## 1. Customer Management (Khách hàng)

| Layer | Files |
|-------|-------|
| **DB Tables** | `dbo.partners`, `dbo.customersources`, `dbo.employee_location_scope` |
| **Backend Routes** | `api/src/routes/partners.js`, `api/src/routes/customerBalance.js`, `api/src/routes/customerReceipts.js`, `api/src/routes/customerSources.js`, `api/src/routes/faceRecognition.js` |
| **Backend Middleware** | `api/src/middleware/auth.js` (permission: `customers.view/add/edit/delete/hard_delete`) |
| **Frontend Pages** | `website/src/pages/Customers.tsx`, `website/src/pages/Customers/index.tsx` |
| **Frontend Components** | `website/src/components/customer/CustomerProfile.tsx`, `website/src/components/customer/PhotoGallery.tsx`, `website/src/components/customer/ServiceHistory.tsx`, `website/src/components/customer/AppointmentHistory.tsx`, `website/src/components/customer/DepositCard.tsx`, `website/src/components/forms/AddCustomerForm/`, `website/src/components/shared/CustomerSelector.tsx`, `website/src/components/shared/FaceCaptureModal.tsx` |
| **Frontend Hooks** | `website/src/hooks/useCustomers.ts`, `website/src/hooks/useCustomerProfile.ts`, `website/src/hooks/useFaceRecognition.ts` |
| **API Clients** | `website/src/lib/api/partners.ts`, `website/src/lib/api/customerBalance.ts`, `website/src/lib/api/customerSources.ts` |
| **Types** | `website/src/types/customer.ts` |
| **E2E Tests** | `website/e2e/customer-create-save.spec.ts`, `website/e2e/customer-profile-crud.spec.ts`, `website/e2e/customer-persistence-sweep.spec.ts` |

---

## 2. Appointment & Calendar Scheduling (Lịch hẹn)

| Layer | Files |
|-------|-------|
| **DB Tables** | `dbo.appointments`, `dbo.partners` (customer + doctor), `dbo.companies`, `dbo.products`, `dbo.crmteams` |
| **Backend Routes** | `api/src/routes/appointments.js` |
| **Backend Middleware** | `api/src/middleware/auth.js` (permission: `appointments.view/add/edit`) |
| **Frontend Pages** | `website/src/pages/Calendar.tsx`, `website/src/pages/Appointments/index.tsx` |
| **Frontend Components** | `website/src/components/calendar/`, `website/src/components/appointments/AppointmentForm.tsx`, `website/src/components/appointments/CheckInFlow.tsx`, `website/src/components/appointments/ConvertToService.tsx`, `website/src/components/appointments/WaitTimer.tsx`, `website/src/components/shared/FilterByDoctor.tsx`, `website/src/components/shared/DoctorSelector.tsx`, `website/src/components/shared/AppointmentFormModal.tsx` |
| **Frontend Hooks** | `website/src/hooks/useAppointments.ts`, `website/src/hooks/useCalendarData.ts`, `website/src/hooks/useDragReschedule.ts`, `website/src/hooks/useOverviewAppointments.ts` |
| **API Clients** | `website/src/lib/api/appointments.ts` |
| **Types** | `website/src/types/appointment.ts` |
| **Constants** | `website/src/constants/index.ts` (`APPOINTMENT_CARD_COLORS`, `APPOINTMENT_STATUS_OPTIONS`) |
| **E2E Tests** | `website/e2e/team-alpha-appointments.spec.ts`, `website/e2e/appointment-status-persistence.spec.ts`, `website/e2e/calendar-april-seed-check.spec.ts` |

---

## 3. Payment & Deposit Wallet (Thu chi / Công nợ)

| Layer | Files |
|-------|-------|
| **DB Tables** | `dbo.payments`, `dbo.company_bank_settings`, `dbo.monthlyplans`, `dbo.monthlyplan_items`, `dbo.planinstallments`, `dbo.saleorders`, `dbo.dotkhams` |
| **Backend Routes** | `api/src/routes/payments.js`, `api/src/routes/bankSettings.js`, `api/src/routes/monthlyPlans.js`, `api/src/routes/accountPayments.js`, `api/src/routes/customerBalance.js` |
| **Backend Middleware** | `api/src/middleware/auth.js` (permission: `payment.view/edit`) |
| **Frontend Pages** | `website/src/pages/Payment.tsx` |
| **Frontend Components** | `website/src/components/payment/PaymentForm.tsx`, `website/src/components/payment/PaymentHistory.tsx`, `website/src/components/payment/DepositWallet.tsx`, `website/src/components/payment/CustomerDeposits.tsx`, `website/src/components/payment/DepositHistory.tsx`, `website/src/components/payment/OutstandingBalance.tsx`, `website/src/components/payment/ServicePaymentCard.tsx`, `website/src/components/payment/VietQrModal.tsx`, `website/src/components/payment/MonthlyPlan/` |
| **Frontend Hooks** | `website/src/hooks/usePayment.ts`, `website/src/hooks/useDeposits.ts`, `website/src/hooks/useCustomerPayments.ts`, `website/src/hooks/useMonthlyPlans.ts`, `website/src/hooks/useBankSettings.ts` |
| **API Clients** | `website/src/lib/api/payments.ts`, `website/src/lib/api/monthlyPlans.ts` |
| **Types** | `website/src/types/payment.ts`, `website/src/types/monthlyPlans.ts` |
| **E2E Tests** | `website/e2e/payment-allocation-persistence.spec.ts` (implied by domain YAML) |

---

## 4. Service Catalog & Treatment Records (Dịch vụ / Điều trị)

| Layer | Files |
|-------|-------|
| **DB Tables** | `dbo.products`, `dbo.productcategories`, `dbo.saleorders`, `dbo.saleorderlines`, `dbo.dotkhams`, `dbo.dotkhamsteps` |
| **Backend Routes** | `api/src/routes/products.js`, `api/src/routes/productCategories.js`, `api/src/routes/saleOrders.js`, `api/src/routes/saleOrderLines.js`, `api/src/routes/dotKhams.js` |
| **Backend Middleware** | `api/src/middleware/auth.js` (permission: `services.view/add/edit/delete`) |
| **Frontend Pages** | `website/src/pages/ServiceCatalog.tsx`, `website/src/pages/Services/index.tsx` |
| **Frontend Components** | `website/src/components/services/ServiceForm.tsx`, `website/src/components/services/ServiceHistoryList.tsx`, `website/src/components/services/MultiVisitTracker.tsx`, `website/src/components/services/ToothPickerModal.tsx`, `website/src/components/shared/ServiceCatalogSelector.tsx` |
| **Frontend Hooks** | `website/src/hooks/useProducts.ts` |
| **API Clients** | `website/src/lib/api/products.ts`, `website/src/lib/api/saleOrders.ts` |
| **Types** | `website/src/types/service.ts` |
| **E2E Tests** | `website/e2e/service-form-save.spec.ts` (implied) |

---

## 5. Employee & Permission Management (Nhân sự / Phân quyền)

| Layer | Files |
|-------|-------|
| **DB Tables** | `dbo.partners` (employee flags), `dbo.permission_groups`, `dbo.group_permissions`, `dbo.employee_permissions`, `dbo.permission_overrides`, `dbo.employee_location_scope` |
| **Backend Routes** | `api/src/routes/employees.js`, `api/src/routes/permissions.js`, `api/src/routes/auth.js` (resolvePermissions) |
| **Backend Middleware** | `api/src/middleware/auth.js` (permission: `employees.edit`, `settings.admin`) |
| **Frontend Pages** | `website/src/pages/Employees/index.tsx`, `website/src/pages/PermissionBoard/index.tsx` |
| **Frontend Components** | `website/src/components/employees/EmployeeTable.tsx`, `website/src/components/employees/EmployeeForm.tsx`, `website/src/components/employees/EmployeeProfile.tsx`, `website/src/components/employees/ScheduleCalendar.tsx`, `website/src/components/employees/TierSelector.tsx`, `website/src/components/employees/RoleMultiSelect.tsx`, `website/src/components/settings/PermissionGroupConfig.tsx`, `website/src/components/settings/RoleConfig.tsx` |
| **Frontend Hooks** | `website/src/hooks/useEmployees.ts`, `website/src/hooks/usePermissions.ts`, `website/src/hooks/usePermissionGroups.ts`, `website/src/hooks/usePermissionBoard.ts` |
| **API Clients** | `website/src/lib/api/employees.ts`, `website/src/lib/api/permissions.ts` |
| **Types** | `website/src/types/employee.ts`, `website/src/types/permissions.ts` |
| **Constants** | `website/src/constants/index.ts` (`ROUTE_PERMISSIONS`, `ROLE_TO_DB_FLAGS`) |
| **E2E Tests** | `website/e2e/employee-crud.spec.ts`, `website/e2e/permission-board.spec.ts` (implied) |

---

## 6. Reports & Analytics (Báo cáo)

| Layer | Files |
|-------|-------|
| **DB Tables** | `dbo.saleorders`, `dbo.saleorderlines`, `dbo.payments`, `dbo.appointments`, `dbo.partners`, `dbo.companies`, `dbo.products` |
| **Backend Routes** | `api/src/routes/reports.js`, `api/src/routes/dashboardReports.js` |
| **Backend Middleware** | `api/src/middleware/auth.js` (permission: `reports.view`) |
| **Frontend Pages** | `website/src/pages/Reports.tsx`, `website/src/pages/reports/` |
| **Frontend Components** | `website/src/components/reports/BarChart.tsx`, `website/src/components/reports/DonutChart.tsx`, `website/src/components/reports/KPICard.tsx`, `website/src/components/reports/ReportsFilters.tsx`, `website/src/components/reports/ReportError.tsx` |
| **Frontend Hooks** | `website/src/hooks/useReportData.ts`, `website/src/hooks/useDashboardStats.ts` |
| **API Clients** | `website/src/lib/api/` (uses generic `core.ts` for report endpoints) |
| **E2E Tests** | None dedicated (noted as gap in `unknowns.md`) |

---

## 7. Overview Dashboard (Tổng quan)

| Layer | Files |
|-------|-------|
| **DB Tables** | `dbo.appointments`, `dbo.payments`, `dbo.saleorders`, `dbo.partners` (read-only aggregates) |
| **Backend Routes** | `api/src/routes/dashboardReports.js` |
| **Frontend Pages** | `website/src/pages/Overview.tsx` |
| **Frontend Components** | `website/src/components/modules/StatCardModule.tsx`, `website/src/components/modules/RevenueChartModule.tsx`, `website/src/components/shared/QuickActionsBar.tsx`, `website/src/components/shared/NotificationsPanel.tsx`, `website/src/components/shared/FilterByLocation.tsx` |
| **Frontend Hooks** | `website/src/hooks/useDashboardStats.ts`, `website/src/hooks/useOverviewData.ts`, `website/src/hooks/useOverviewAppointments.ts` |
| **E2E Tests** | `website/src/__tests__/Overview.test.tsx` |

---

## 8. Location / Branch Management (Chi nhánh)

| Layer | Files |
|-------|-------|
| **DB Tables** | `dbo.companies` |
| **Backend Routes** | `api/src/routes/companies.js`, `api/src/routes/stockPickings.js` |
| **Frontend Pages** | `website/src/pages/Locations.tsx` |
| **Frontend Components** | `website/src/components/locations/`, `website/src/components/shared/LocationSelector.tsx`, `website/src/components/shared/FilterByLocation.tsx` |
| **Frontend Hooks** | `website/src/hooks/useLocations.ts` |
| **API Clients** | `website/src/lib/api/companies.ts` |
| **Types** | `website/src/types/location.ts` |
| **Contexts** | `website/src/contexts/LocationContext.tsx` |

---

## 9. Feedback & CMS (Phản hồi / Website CMS)

| Layer | Files |
|-------|-------|
| **DB Tables** | `dbo.feedback_threads`, `dbo.feedback_messages`, `dbo.feedback_attachments`, `dbo.websitepages` |
| **Backend Routes** | `api/src/routes/feedback.js`, `api/src/routes/websitePages.js` |
| **Frontend Pages** | `website/src/pages/Feedback.tsx`, `website/src/pages/Website.tsx` |
| **Frontend Components** | `website/src/components/shared/FeedbackWidget.tsx`, `website/src/components/settings/FeedbackAdminContent.tsx` |
| **API Clients** | `website/src/lib/api/feedback.ts`, `website/src/lib/api/websitePages.ts` |
| **Types** | `website/src/types/feedback.ts`, `website/src/types/website.ts` |

---

## 10. IP Access Control (Bảo mật truy cập)

| Layer | Files |
|-------|-------|
| **DB Tables** | `dbo.ip_access_control` (migration `037_ip_access_control.sql` — NOT in schema-map yet) |
| **Backend Routes** | `api/src/routes/ipAccess.js` |
| **Backend Middleware** | `api/src/middleware/ipAccess.js` |
| **Frontend Components** | `website/src/components/settings/IpAccessControl.tsx` |
| **Frontend Hooks** | `website/src/hooks/useIpAccessControl.ts` |
| **API Clients** | `website/src/lib/api/ipAccess.ts` |
| **Types** | `website/src/types/ipAccessControl.ts` |
