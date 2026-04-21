# TGroup Project Map — Definitive Reference

> Generated: 2026-04-11 | Version: 0.4.23 | Branch: ai-develop

## PROJECT OVERVIEW

**TG Clinic Management System** — Full-stack dental clinic management platform.

| Layer | Tech | Location |
|-------|------|----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS | `website/src/` |
| Backend | Express.js + PostgreSQL + JWT Auth | `api/src/` |
| Deploy | Docker Compose (nginx + node + postgres) | `docker-compose.yml` |

---

## 1. PAGES (13 Routes)

| Page | File | Key Hooks | Key Components |
|------|------|-----------|----------------|
| Dashboard | `pages/Overview.tsx` | `useOverviewAppointments`, `useLocationFilter`, `useLocations` | `PatientCheckIn`, `TodayServicesTable`, `TodayAppointments`, `EditAppointmentModal`, `WalkInForm` |
| Customers | `pages/Customers.tsx` | `useCustomers`, `useAuth`, `useLocationFilter`, `useAppointments`, `useServices`, `useDeposits`, `useCustomerPayments`, `useExternalCheckups` | `DataTable`, `SearchBar`, `StatusBadge`, `CustomerProfile`, `AddCustomerForm` |
| Calendar | `pages/Calendar.tsx` | `useCalendarData`, `useDragReschedule`, `useEmployees`, `useLocationFilter` | `DayView`, `WeekView`, `MonthView`, `EditAppointmentModal`, `FilterByDoctor` |
| Login | `pages/Login.tsx` | `useAuth`, `useNavigate` | Form inputs, gradient card |
| Payment | `pages/Payment.tsx` | `usePayment`, `useMonthlyPlans`, `useLocationFilter` | `DepositWallet`, `PaymentForm`, `OutstandingBalance`, `PaymentHistory`, `MonthlyPlanCreator` |
| Employees | `pages/Employees/index.tsx` | `useEmployees`, `useLocationFilter`, `useLocations` | `EmployeeTable`, `EmployeeProfile`, `TierSelector`, `RoleMultiSelect`, `EmployeeForm` |
| Locations | `pages/Locations.tsx` | `useLocations` | `LocationCard`, `LocationDashboard`, `LocationDetail` |
| Service Catalog | `pages/ServiceCatalog.tsx` | `useProducts`, `useLocationFilter` | Service management components |
| Settings | `pages/Settings/index.tsx` | — | `SystemPreferencesContent`, `IpAccessControl`, `TimezoneSelector`, `BankSettingsForm` |
| Services | `pages/Services/index.tsx` | `useServices`, `useLocationFilter` | `ServiceForm`, `ServiceHistoryList`, `MultiVisitTracker` |
| Appointments | `pages/Appointments/index.tsx` | `useAppointments`, `useLocationFilter` | `AppointmentForm`, `AppointmentDetailsModal` |
| Commission | `pages/Commission.tsx` | `useLocations` | Commission report components |
| Permissions | `pages/PermissionBoard.tsx` | `usePermissionBoard` | `PermissionMatrix`, `EntityRelationshipMap` |

---

## 2. COMPONENTS BY DIRECTORY

### appointments/
| Component | Purpose |
|-----------|---------|
| `AppointmentForm.tsx` | Create/edit appointment (customer/doctor/location/service selectors, color, status) |
| `CheckInFlow.tsx` | Patient check-in workflow with status transitions |
| `ConvertToService.tsx` | Appointment to Service conversion |
| `WaitTimer.tsx` | Waiting time tracker |

### calendar/
| Component | Purpose |
|-----------|---------|
| `DayView.tsx` | Single day hourly grid |
| `WeekView.tsx` | 7-day week view |
| `MonthView.tsx` | Month grid with status counts |
| `AppointmentCard.tsx` | Reusable card (uses APPOINTMENT_CARD_COLORS) |
| `AppointmentDetailsModal.tsx` | View-only details popup |
| `TimeSlot.tsx` | Individual time slot |

### customer/
| Component | Purpose |
|-----------|---------|
| `CustomerProfile.tsx` | Multi-tab details (Profile, Appointments, Records, Payment) |
| `AppointmentHistory.tsx` | Past appointments |
| `ServiceHistory.tsx` | Completed services |
| `DepositCard.tsx` | Wallet balance card |
| `PhotoGallery.tsx` | Patient photos |
| `HealthCheckupGallery.tsx` | External checkup images |

### employees/
| Component | Purpose |
|-----------|---------|
| `EmployeeTable.tsx` | Staff list with search/filters |
| `EmployeeProfile.tsx` | Staff details (roles, tier, schedule) |
| `EmployeeForm.tsx` | Create/edit staff form |
| `EmployeeCard.tsx` | Staff info card |
| `TierSelector.tsx` | Role tier dropdown |
| `RoleMultiSelect.tsx` | Multi-select roles |
| `ScheduleCalendar.tsx` | Staff availability |
| `LinkedEmployees.tsx` | Related staff |
| `ReferralCodeDisplay.tsx` | Referral code viewer |

### payment/
| Component | Purpose |
|-----------|---------|
| `PaymentForm.tsx` | Payment entry (Cash/Bank/VietQR) |
| `DepositWallet.tsx` | Top-up wallet display |
| `DepositHistory.tsx` | Transaction list |
| `OutstandingBalance.tsx` | Debt summary |
| `PaymentHistory.tsx` | Payment records table |
| `VietQrModal.tsx` | VietQR payment popup |
| `MonthlyPlan/MonthlyPlanCreator.tsx` | Create installment plans |
| `MonthlyPlan/PaymentSchedule.tsx` | Schedule visualization |
| `MonthlyPlan/InstallmentTracker.tsx` | Progress tracking |

### services/
| Component | Purpose |
|-----------|---------|
| `ServiceForm.tsx` | Create/edit service record |
| `ServiceHistoryList.tsx` | Service list with filtering |
| `MultiVisitTracker.tsx` | Visit progress tracking |

### shared/
| Component | Purpose |
|-----------|---------|
| `DataTable.tsx` | Sortable, paginated table |
| `SearchBar.tsx` | Global search input |
| `FilterByLocation.tsx` | Location dropdown (synced via LocationContext) |
| `FilterByDoctor.tsx` | Doctor/staff filter |
| `QuickAddAppointmentButton.tsx` | Fast appointment creation |
| `CustomerSelector.tsx` | Searchable customer dropdown |
| `DoctorSelector.tsx` | Active doctors dropdown |
| `LocationSelector.tsx` | Location dropdown |
| `ServiceCatalogSelector.tsx` | Service catalog dropdown |
| `StatusBadge.tsx` | Status indicator badge |
| `VersionDisplay.tsx` | App version footer |
| `ComboboxInput.tsx` | Autocomplete input |
| `AddressAutocomplete.tsx` | Google Places integration |

### modules/
| Component | Purpose |
|-----------|---------|
| `TodayAppointments.tsx` | Master appointment list with check-in actions |
| `PatientCheckIn.tsx` | Reception check-in interface |
| `TodayServicesTable.tsx` | Services scheduled for today |
| `EditAppointmentModal.tsx` | Edit appointment with color picker |
| `StatCardModule.tsx` | Metric cards |
| `RevenueChartModule.tsx` | Revenue visualization |

### forms/
| Component | Purpose |
|-----------|---------|
| `AddCustomerForm/AddCustomerForm.tsx` | **GOLD STANDARD** modal form |
| `WalkInForm.tsx` | Quick walk-in patient form |

### settings/
| Component | Purpose |
|-----------|---------|
| `SystemPreferencesContent.tsx` | General system settings |
| `BankSettingsForm.tsx` | Bank account config |
| `IpAccessControl.tsx` | IP whitelist management |
| `RoleConfig.tsx` | Role definitions |
| `PermissionGroupConfig.tsx` | Permission group management |
| `ServiceCatalogSettings.tsx` | Service catalog admin |
| `CustomerSourcesConfig.tsx` | Customer source config |
| `TimezoneSelector.tsx` | Timezone picker |

---

## 3. HOOKS (27)

| Hook | API Endpoints | Returns |
|------|---------------|---------|
| `useCustomers` | `GET/POST/PUT /Partners` | `customers[]`, `createPartner()`, `updatePartner()`, `softDeletePartner()` |
| `useAppointments` | `GET/POST/PUT /Appointments` | `appointments[]`, `createAppointment()`, `updateAppointment()`, `markArrived()` |
| `useLocations` | `GET /Companies` | `allLocations[]`, `getLocationById()`, `selectedLocationId` |
| `useEmployees` | `GET/POST/PUT /Employees` | `employees[]`, `selectedEmployee`, `tierFilter`, `roleFilter` |
| `useServices` | `GET/POST /SaleOrders` | `allRecords[]`, `createServiceRecord()`, `updateVisitStatus()` |
| `usePayment` | `GET/POST /Payments`, `/AccountPayments` | `payments[]`, `wallets[]`, `outstandingBalances[]` |
| `useMonthlyPlans` | `GET/POST /MonthlyPlans` | `plans[]`, `createPlan()`, `markInstallmentPaid()` |
| `useCustomerProfile` | `GET /Partners/{id}` | `profile`, `appointments[]`, `services[]`, `deposits[]` |
| `useCustomerPayments` | `GET /Payments?partnerId=...` | `payments[]` with allocations |
| `useDeposits` | `GET/POST /AccountPayments` | `transactions[]`, `addDeposit()`, `walletBalance` |
| `useCalendarData` | Combines appointments + employees | `viewMode`, `currentDate`, `getAppointmentsForDate()` |
| `useDragReschedule` | `PUT /Appointments` | `handleDragStart()`, `handleDrop()` |
| `useOverviewAppointments` | `GET /Appointments` | Zone1/Zone3 appointments, counts |
| `useDashboardStats` | Dashboard reports API | `stats`, `refresh()` |
| `usePermissions` | Auth context | `hasPermission()`, `effectivePermissions[]` |
| `usePermissionBoard` | `GET /Permissions` | `permissionMatrix`, `groups[]` |
| `usePermissionGroups` | `GET /api/PermissionGroups` | `groups[]`, `createGroup()` |
| `useIpAccessControl` | `GET /api/IpAccessControl` | `whitelist[]`, `addIp()`, `removeIp()` |
| `useBankSettings` | `GET /api/settings/bank` | `bankAccounts[]`, `updateBankAccount()` |
| `useSettings` | `GET /api/SystemPreferences` | `settings`, `updateSettings()` |
| `useExternalCheckups` | `GET /api/ExternalCheckups` | `checkupData`, `refetch()` |
| `useProducts` | `GET /Products` | `products[]`, `searchProducts()` |
| `useFormValidation` | — | `validateEmail()`, `validatePhone()` |
| `useVersionCheck` | `GET /version.json` | `currentVersion`, `latestVersion`, `isOutdated` |

---

## 4. CONTEXTS (4 Global Providers)

| Context | Shape | Used By |
|---------|-------|---------|
| `AuthContext` | `{ user, permissions, isAuthenticated, login(), logout(), hasPermission() }` | All protected pages |
| `LocationContext` | `{ selectedLocationId, setSelectedLocationId, allowedLocations }` | 10+ pages with location filter |
| `TimezoneContext` | `{ timezone, formatDate(), formatTime() }` | Date displays |
| `AppointmentHoverContext` | Hover state | Appointment lists |

---

## 5. API BACKEND ROUTES (37 files in `api/src/routes/`)

| Route File | Endpoint | Methods |
|-----------|----------|---------|
| `auth.js` | `/api/Auth` | POST /login, GET /me |
| `appointments.js` | `/api/Appointments` | GET, POST, PUT, DELETE |
| `customers.js` | `/api/Partners` | GET, POST, PUT, DELETE |
| `employees.js` | `/api/Employees` | GET, POST, PUT |
| `partners.js` | `/api/Partners` | GET, POST, PUT |
| `companies.js` | `/api/Companies` | GET, POST, PUT |
| `payments.js` | `/api/Payments` | GET, POST, PUT |
| `accountPayments.js` | `/api/AccountPayments` | GET, POST |
| `services.js` | `/api/Services` | GET, POST, PUT |
| `saleOrders.js` | `/api/SaleOrders` | GET, POST, PUT |
| `products.js` | `/api/Products` | GET, POST, PUT |
| `permissions.js` | `/api/Permissions` | GET, POST, PUT, DELETE |
| `monthlyPlans.js` | `/api/MonthlyPlans` | GET, POST, PUT |
| `bankSettings.js` | `/api/settings` | GET, POST, PUT |
| `dashboardReports.js` | `/api/DashboardReports` | GET |
| `customerBalance.js` | `/api/CustomerBalance` | GET |
| `customerReceipts.js` | `/api/CustomerReceipts` | GET |
| `customerSources.js` | `/api/CustomerSources` | GET, POST |
| `dotKhams.js` | `/api/DotKhams` | GET, POST, PUT |
| `externalCheckups.js` | `/api/ExternalCheckups` | GET |
| `places.js` | `/api/Places` | GET |
| `cashbooks.js` | `/api/CashBooks` | GET, POST |
| `receipts.js` | `/api/Receipts` | GET, POST |
| `commissions.js` | `/api/Commissions` | GET |
| `hrPayslips.js` | `/api/HrPayslips` | GET |
| `journals.js` | `/api/accountjournals` | GET, POST |
| `stockPickings.js` | `/api/StockPickings` | GET, POST |
| `websitePages.js` | `/api/WebsitePages` | GET, POST, PUT, DELETE |
| `systemPreferences.js` | `/api/SystemPreferences` | GET, PUT |
| `crmTasks.js` | `/api/CrmTasks` | GET, POST, PUT |

---

## 6. KEY CONSTANTS (`constants/index.ts`)

| Constant | Description |
|----------|-------------|
| `APPOINTMENT_CARD_COLORS` | 8 color codes (0-7) — bg/border/text/dot/gradient |
| `APPOINTMENT_STATUS_OPTIONS` | 3 statuses: scheduled, arrived, cancelled |
| `THEME_COLORS` | Brand orange (#F97316) + palette |
| `ROUTES` | All route path constants |
| `NAVIGATION_ITEMS` | Sidebar menu structure |
| `TIME_SLOTS` | 30-min intervals 08:00-19:30 |
| `STATUS_COLORS` | Generic status colors |
| `PAYMENT_STATUS_COLORS` | Payment-specific colors |

---

## 7. TYPE DEFINITIONS (14 files in `/types`)

| File | Key Types |
|------|-----------|
| `customer.ts` | `Customer`, `CustomerFormData`, `CustomerStatus`, `CustomerProfileData` |
| `employee.ts` | `Employee`, `EmployeeFormData`, `EmployeeRole`, `EmployeeTier` |
| `appointment.ts` | `Appointment`, `AppointmentFormData`, `AppointmentStatus` |
| `service.ts` | `ServiceRecord`, `ServiceCatalogItem`, `VisitStatus` |
| `payment.ts` | `Payment`, `PaymentFormData`, `PaymentMethod`, `DepositTransaction` |
| `monthlyPlans.ts` | `MonthlyPlan`, `Installment`, `PlanStatus` |
| `location.ts` | `Location`, `LocationBranch`, `LocationMetrics` |
| `permissions.ts` | `AuthUser`, `AuthPermissions`, `Permission`, `PermissionGroup` |
| `settings.ts` | `SystemPreferences`, `BankAccount` |

---

## 8. HIGH-IMPACT FILES (Change with Caution)

| File | Imported By | Impact |
|------|-------------|--------|
| `constants/index.ts` | 99+ files | Colors, statuses, routes, navigation |
| `lib/api.ts` | 70+ files | All API communication |
| `types/customer.ts` | 40+ files | Customer data shape |
| `contexts/AuthContext.tsx` | 35+ files | Auth, permissions |
| `contexts/LocationContext.tsx` | 20+ pages | Global location filter |
| `App.tsx` | Entry point | All routing, permission gates |
| `Layout.tsx` | All pages | Sidebar, header, navigation |

---

## 9. DOCKER SERVICES

| Service | Port | Image | Purpose |
|---------|------|-------|---------|
| `db` | 55433 | postgres:16-alpine | PostgreSQL database |
| `api` | 3002 | Custom (Dockerfile.api) | Express API server |
| `web` | 5175 | Custom (Dockerfile.web) | React app via nginx |

---

## 10. QUICK LOOKUP

| I need to... | Go to... |
|-------------|----------|
| Add a new page | `pages/` + register in `App.tsx` + export from `pages/index.ts` |
| Add a component | `components/<feature>/` + import in page |
| Add a hook | `hooks/` + use in components |
| Add an API endpoint | `api/src/routes/` + register in `server.js` |
| Change colors/statuses | `constants/index.ts` (SINGLE SOURCE OF TRUTH) |
| Copy form style | Follow `AddCustomerForm.tsx` pattern exactly |
| Check permissions | `AuthContext.tsx` + `ROUTE_PERMISSIONS` in `App.tsx` |
| Add type definitions | `types/<feature>.ts` |
| Test credentials | `tg@clinic.vn` / `123456` |
