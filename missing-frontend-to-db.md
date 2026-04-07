# Missing Frontend-to-Database Mapping Audit

**Date:** 2026-04-07  
**DB Tables Available:** `dbo.companies` (36 cols), `dbo.partners` (87 cols), `dbo.appointments` (36 cols)  
**Total DB records:** 7 companies, 37 partners, 120 appointments  
**Frontend Pages:** 14  
**API Endpoints:** /Partners, /Employees, /Appointments, /Companies, /Products, /SaleOrders, /DashboardReports

---

## Per-Page Status

### 1. Overview `/` — Dashboard

| UI Element | DB Source | API Connected? | Status |
|---|---|---|---|
| Stat cards (total customers, revenue, appointments, etc.) | Derived from all 3 tables | ❌ Uses `useDashboardStats` (mock) | **MOCK DATA** |
| Revenue chart | Aggregation needed | ❌ Uses `useOverviewData` (mock) | **MOCK DATA** |
| Today's schedule sidebar | `dbo.appointments` | ⚠️ `useTodaySchedule` uses mock, not real DB | **MOCK DATA** |
| Quick actions bar | N/A (UI only) | ✅ Pure navigation | ✅ OK |
| Notifications panel | No DB table | ❌ Hard-coded mock | **NO DB TABLE** |
| Location filter dropdown | `dbo.companies` | ⚠️ Uses `MOCK_LOCATIONS` (8 fake locations, not 7 DB companies) | **MISMATCH** |

**Missing:** Revenue aggregation, real-time dashboard metrics, notification system.

---

### 2. Calendar `/calendar`

| UI Element | DB Source | API Connected? | Status |
|---|---|---|---|
| Day/Week/Month views | `dbo.appointments` | ⚠️ `useCalendarData` uses mock data | **MOCK DATA** |
| Appointment cards | `dbo.appointments` | ⚠️ Mock appointments, not from DB | **MOCK DATA** |
| Appointment details modal | `dbo.appointments` | ❌ Shows mock extended fields | **MOCK DATA** |
| Doctor filter | `dbo.partners` (employee=true) | ❌ `FilterByDoctor` uses hardcoded list | **HARDCODED** |
| Drag-to-reschedule | `dbo.appointments` | ❌ `handleDragStart/Drop` no-op | **PLACEHOLDER** |

**Missing:** Real calendar data from DB, doctor list from DB, drag-reschedule API.

---

### 3. Customers `/customers`

| UI Element | DB Source | API Connected? | Status |
|---|---|---|---|
| Customer list table | `dbo.partners` (customer=true) | ✅ `useCustomers` calls `fetchPartners` | ✅ **CONNECTED** |
| Search by name/phone/email | `dbo.partners` | ✅ API supports `search` param | ✅ **CONNECTED** |
| Location filter | `dbo.companies` | ✅ Via `companyId` param | ✅ **CONNECTED** |
| Status filter (active/inactive/pending) | `dbo.partners.active` | ⚠️ API doesn't filter by status, done client-side | **PARTIAL** |
| "Add Customer" button + form | `dbo.partners` | ✅ `createPartner` called, fallback to local | ✅ **CONNECTED** |
| Customer profile view | `dbo.partners` columns: gender, birthday, medicalhistory, note, etc. | ❌ Uses `MOCK_CUSTOMER_PROFILE` (hardcoded) | **MOCK DATA** |
| Customer photos | No DB column | ❌ Uses `MOCK_CUSTOMER_PHOTOS` | **NO DB FIELD** |
| Customer deposit | No DB table | ❌ Uses `MOCK_CUSTOMER_DEPOSIT` | **NO DB TABLE** |
| Appointment history | `dbo.appointments` | ❌ Uses `MOCK_APPOINTMENT_HISTORY` | **MOCK DATA** |
| Service history | No DB table (services not in demo) | ❌ Uses `MOCK_SERVICE_HISTORY` | **NO DB TABLE** |
| Customer location display | `dbo.partners.companyid` → `dbo.companies` | ❌ Uses `MOCK_LOCATIONS` lookup, not DB | **MISMATCH** |

**What DB columns are UNUSED by frontend:** `partners` has 87 columns. Frontend uses: `name`, `phone`, `email`, `customer`, `active`, `companyid`, `lastupdated`. 
**~77 partner columns are unused:** ref, note, avatar, zaloid, birthday, birthmonth, birthyear, gender, medicalhistory, street, cityname, districtname, wardname, emergencyphone, identitynumber, taxcode, personaladdress, weight, treatmentstatus, potentiallevel, marketingstaffid, saleteamid, contactstatusid, customerstatus, customerthankstate, birthdaycustomerstate, etc.

---

### 4. Appointments `/appointments`

| UI Element | DB Source | API Connected? | Status |
|---|---|---|---|
| Appointment list | `dbo.appointments` | ✅ `useAppointments` calls `fetchAppointments` | ✅ **CONNECTED** |
| Search by name/phone/doctor/service | `dbo.appointments` | ✅ API `search` param | ✅ **CONNECTED** |
| Date filter | `dbo.appointments.date` | ⚠️ Client-side filter only | **PARTIAL** |
| Status tabs (scheduled/confirmed/in-progress/completed/cancelled) | `dbo.appointments.state` | ⚠️ Client-side filter only | **PARTIAL** |
| Stats cards (Today Total, Waiting, In Treatment, Completed) | `dbo.appointments` | ✅ Derived from fetched data | ✅ **CONNECTED (approx)** |
| "New Appointment" form | `dbo.appointments` | ✅ `createAppointment` calls API | ✅ **CONNECTED** |
| Check-in flow | `dbo.appointments` datetimearrived, datetimeseated | ⚠️ Local state only, never writes to DB | **LOCAL ONLY** |
| Wait timer | `dbo.appointments.datetimearrived` | ⚠️ Uses local `arrivalTime` string, not DB timestamps | **LOCAL ONLY** |
| Convert to Service | No DB table (services) | ⚠️ Local state only (`convertToServiceId`) | **LOCAL ONLY** |
| Expandable detail panel | `dbo.appointments` note, state | ⚠️ Mixed mock + API data | **PARTIAL** |

**Missing:** Appointment type, doctor name, customer name resolution (needs JOINs), check-in state persistence.

---

### 5. Services `/services`

| UI Element | DB Source | API Connected? | Status |
|---|---|---|---|
| Service records list | No "services" table demo DB | ❌ Uses `useServices` (all mock) | **MOCK DATA** |
| Stats (Active, Planned, Completed, Outstanding) | Aggregation needed | ❌ Mock totals | **MOCK DATA** |
| Status tabs | No DB field | ❌ Mock statuses | **NO DB FIELD** |
| Category filter | No "service categories" table | ❌ Mock categories | **NO DB TABLE** |
| "New Service" form | No services table | ❌ Mock-only creation | **NO DB TABLE** |
| Multi-visit tracker | No DB structure | ❌ Mock data | **NO DB TABLE** |

**Missing:** Entire services table (service records, treatment plans, multi-visit tracking). The demo DB has no `services`, `service_records`, `treatments`, or `procedures` tables.

---

### 6. Payment `/payment`

| UI Element | DB Source | API Connected? | Status |
|---|---|---|---|
| Payment history | `dbo.saleorder` (via API) | ❌ `usePayment` uses `mockPayment` entirely | **MOCK DATA** |
| Deposit wallets | No DB table | ❌ Uses `MOCK_WALLETS` | **NO DB TABLE** |
| Outstanding balances | `dbo.saleorder.residual` (potentially) | ❌ Uses `MOCK_OUTSTANDING` | **MOCK DATA** |
| "New Payment" form | No payments table | ❌ Mock-only | **NO DB TABLE** |
| Installment plans tab | No DB table | ❌ Uses `useMonthlyPlans` (mock) | **NO DB TABLE** |
| Monthly plan creator | No DB table | ❌ Mock-only | **NO DB TABLE** |
| Payment schedule detail | No DB table | ❌ Mock `PlanInstallment` objects | **NO DB TABLE** |
| Stats (Total Revenue, Wallet Balance, Outstanding, Active Plans) | Aggregation needed | ❌ All mock | **MOCK DATA** |

**Missing:** `payments`, `wallets`, `deposit_transactions`, `installment_plans`, `plan_installments` tables. SaleOrders API endpoint exists but frontend Payment page does not use it.

---

### 7. Employees `/employees`

| UI Element | DB Source | API Connected? | Status |
|---|---|---|---|
| Employee list table | `dbo.partners` (employee=true) | ✅ `useEmployees` calls `fetchEmployees` | ✅ **CONNECTED** |
| Search by name/email | `dbo.partners` | ✅ API `search` param | ✅ **CONNECTED** |
| Status filter (active/on-leave/inactive) | `dbo.partners.active` | ⚠️ On-leave has no DB field; client-side only | **PARTIAL** |
| Tier filter (director/lead/senior/mid) | Derived from `hrjobname` | ✅ Derived from `jobtitle`/`hrjobname` | ✅ **DERIVED** |
| Role filter (dentist/assistant/receptionist/manager) | Derived from DB flags | ✅ From `isdoctor`/`isassistant`/`isreceptionist` | ✅ **DERIVED** |
| Employee profile panel | `dbo.partners` columns | ⚠️ Shows derived fields; many DB cols unused | **PARTIAL** |
| "Add Employee" button | `dbo.partners` | ❌ No handler, just a button | **PLACEHOLDER** |
| Linked employees | No DB relationship | ❌ Uses `linkedEmployeeIds` (hardcoded empty array) | **NO DB FIELD** |
| Referral code display | `dbo.partners.ref` | ⚠️ Component exists but `ref` may be empty | **PARTIAL** |
| Schedule calendar | No employee_schedule table | ❌ Mock schedule data | **NO DB TABLE** |

**Missing:** Employee schedules, commission rates, linked employee relationships, attendance, payroll.

---

### 8. Locations `/locations`

| UI Element | DB Source | API Connected? | Status |
|---|---|---|---|
| Location cards grid | `dbo.companies` | ✅ `useLocations` calls `fetchCompanies` | ✅ **CONNECTED** |
| Location search | `dbo.companies.name` | ✅ Client-side filter | ✅ **CONNECTED** |
| Status filter (active/renovation/closed) | `dbo.companies.active` | ⚠️ Renovation has no DB field; mapped to "closed" | **PARTIAL** |
| Summary stats (branches, staff, customers, revenue) | Aggregation needed | ❌ Metrics hardcoded to 0 | **MOCK DATA** |
| Location detail view | `dbo.companies` columns | ⚠️ Maps basic fields; missing tax info, parent hierarchy | **PARTIAL** |
| "Add Location" modal | `dbo.companies` | ❌ Placeholder text: "will be implemented" | **PLACEHOLDER** |

**DB columns UNUSED by frontend:** `companies.reportheader`, `reportfooter`, `logo`, `taxbankaccount`, `taxbankname`, `taxcode`, `taxphone`, `taxunitaddress`, `taxunitname`, `medicalfacilitycode`, `parentid`, `parentpath`, `currencyid`, `defaulthouseholdid`, `einvoiceaccountid`, etc.

**MISMATCH:** Mock data has 8 locations with different names/addresses. DB has 7 actual locations. Frontend doesn't use the real DB company names.

---

### 9. Service Catalog `/website` (route was renamed from Website)

| UI Element | DB Source | API Connected? | Status |
|---|---|---|---|
| Service catalog display | `data/serviceCatalog.ts` (static file) | ❌ Not using `/Products` API | **MOCK DATA** |
| Service categories | Static `SERVICE_CATEGORIES` | ❌ Hardcoded 11 categories | **HARDCODED** |
| Service search | Static data | ❌ Client-side only | **LOCAL FILTER** |
| Category filter | Static data | ❌ Client-side only | **LOCAL FILTER** |
| "Add Service" button | Products table (via API) | ❌ No handler | **PLACEHOLDER** |
| Stats (Total Services, Categories, Avg Price, Lab Orderable) | Static file | ❌ Computed from `SERVICE_CATALOG_DATA` | **MOCK DATA** |
| Price display | Static file | ❌ Not synced with DB prices | **MISMATCH** |

**Note:** The `/website` route renders `ServiceCatalog` component, not actual website CMS. Products API exists (`fetchProducts`) but is never used.

**DB columns available (not in demo):** `products` table has: `id`, `name`, `defaultcode`, `type`, `type2`, `listprice`, `saleprice`, `categid`, `uomname`, `active`, etc. — none mapped.

---

### 10. Settings `/settings`

| UI Element | DB Source | API Connected? | Status |
|---|---|---|---|
| Service Catalog tab | Products table | ❌ `ServiceCatalogSettings` uses `mockSettings` | **MOCK DATA** |
| Roles & Permissions tab | No permissions table | ❌ `RoleConfig` uses `mockPermissions` | **NO DB TABLE** |
| Customer Sources tab | `dbo.partners.sourceid` (UUID) | ❌ `CustomerSourcesConfig` uses mock sources | **MOCK DATA** |
| System Preferences tab | No settings table | ❌ `SystemPreferences` uses mock prefs | **NO DB TABLE** |

**Missing:** `settings`, `roles`, `permissions`, `customer_sources` tables. Frontend has no CRUD operations for any settings.

---

### 11. Relationships `/relationships`

| UI Element | DB Source | API Connected? | Status |
|---|---|---|---|
| Permission Matrix | No permissions table | ❌ Uses `mockPermissions` | **NO DB TABLE** |
| Entity Relationship Map | No entity table | ❌ Uses `mockRelationships` | **NO DB TABLE** |
| Role selection toggle | No roles table | ❌ Mock roles (Admin, Manager, Dentist, etc.) | **NO DB TABLE** |
| Stats (Roles, Entities, Connections) | N/A | ❌ Mock counts | **MOCK DATA** |

**Missing:** Complete RBAC system. No `roles`, `permissions`, `role_permissions`, `user_roles` tables in demo DB.

---

### 12. Commission `/commission` — **FULL PLACEHOLDER**

| UI Element | DB Source | API Connected? | Status |
|---|---|---|---|
| Stat cards (Total MTD, Eligible Employees, Avg Rate) | No commission data | ❌ Hardcoded values | **HARDCODED** |
| Commission records table | No commission tables | ❌ "Coming soon" | **PLACEHOLDER** |
| "Configure Rules" button | No commission_rules table | ❌ No handler | **PLACEHOLDER** |

**Missing:** `commissions`, `commission_rules`, `commission_rates`, `employee_commissions` tables. Entire page is a stub.

---

### 13. Reports `/reports` — **FULL PLACEHOLDER**

| UI Element | DB Source | API Connected? | Status |
|---|---|---|---|
| Stat cards (Revenue MTD, Appointments, New Customers, Avg/Visit) | Aggregation | ❌ Hardcoded values | **HARDCODED** |
| Revenue Trend chart | Aggregation | ❌ Mock bar chart | **MOCK DATA** |
| Service Breakdown | Aggregation | ❌ Mock percentages | **MOCK DATA** |
| Detailed Reports table | Aggregation | ❌ "Coming soon" | **PLACEHOLDER** |
| "Export Data" button | Export system | ❌ No handler | **PLACEHOLDER** |

**Missing:** Report generation engine, date range filters, export functionality, aggregation queries.

---

### 14. Notifications `/notifications` — **FULL PLACEHOLDER**

| UI Element | DB Source | API Connected? | Status |
|---|---|---|---|
| Channel cards (Email, SMS, Push) | No notification_channels table | ❌ Hardcoded | **HARDCODED** |
| Notification templates | No notification_templates table | ❌ Hardcoded list | **HARDCODED** |
| "New Template" button | No templates table | ❌ No handler | **PLACEHOLDER** |
| Full notification management | No notifications table | ❌ "Coming soon" | **PLACEHOLDER** |

**Missing:** Email/SMS integration, notification queues, templates, delivery tracking. No `notifications` table in demo DB.

---

## Summary: What Is Connected vs Missing

### ✅ Connected (uses real API/DB)
- **Customers list** — `fetchPartners` → `dbo.partners` (name, phone, email, companyid, active)
- **Appointments list** — `fetchAppointments` → `dbo.appointments` (name, date, time, state, note)
- **Employees list** — `fetchEmployees` → `dbo.partners` (employee=true)
- **Locations list** — `fetchCompanies` → `dbo.companies` (name, phone, email, active)
- **Customer create** — `createPartner` → POST to API
- **Appointment create** — `createAppointment` → POST to API
- **Search** — Works on Customers and Appointments via API `search` param

### ⚠️ Partially Connected
- **Status filters** — Client-side only, API doesn't support server-side status filtering
- **Location metrics** — Fetched from DB but employee counts, customer counts, revenue are all 0
- **Check-in flow** — Data comes from API but state changes are local-only (never written back to DB)
- **Check-in timestamps** — `datetimearrived`, `datetimeseated`, `datetimedismissed` exist in DB but not mapped

### ❌ Fully Missing / Mock Data
- **Dashboard/Overview** stats, charts, notifications
- **Calendar** data and appointment details
- **Customer profile** view (photos, deposit, appointment history, service history)
- **Services page** — entire page is mock (no services table in demo DB)
- **Payment** — wallets, payments, outstanding balances, installment plans (no tables)
- **Service Catalog** page — uses static file, not `/Products` API
- **Settings** — all 4 tabs use mock data (no settings tables)
- **Relationships** — permission matrix and entity map (no RBAC tables)
- **Commission** — full placeholder
- **Reports** — full placeholder
- **Notifications** — full placeholder
- **Add Employee** — button with no handler
- **Add Location** — modal with placeholder text

### 🚫 No DB Tables (need to be created or pulled from full production DB)
| Feature | Missing Tables Needed |
|---|---|
| Payment/Wallet | `payments`, `wallets`, `deposit_transactions`, `payment_methods` |
| Installment Plans | `installment_plans`, `plan_installments` |
| Services/Treatments | `service_records`, `treatment_plans`, `procedure_logs` |
| Notifications | `notifications`, `notification_templates`, `notification_channels` |
| Commission | `commissions`, `commission_rules`, `commission_rates` |
| Settings | `system_settings`, `roles`, `permissions`, `role_permissions`, `user_roles` |
| Customer Photos | `customer_photos` (or use external storage) |
| Customer Deposits | `deposits`, `deposit_transactions` |
| Employee Schedules | `employee_schedules`, `time_off` |
| Reports engine | Materialized views or aggregation layer |

---

## DB Column Usage Map

### `dbo.companies` (36 columns) — Used: 4

| Column | Used? | Frontend Field |
|---|---|---|
| `id` | ✅ | location.id |
| `name` | ✅ | location.name |
| `active` | ✅ | location.status |
| `phone` | ✅ | location.phone |
| `email` | ✅ | location.email |
| `datecreated` | ✅ | location.openingDate |
| `lastupdated` | ✅ | (mapped) |
| All other 30 columns | ❌ | — |

### `dbo.partners` (87 columns) — Used: 12

| Column | Used? | Frontend Field |
|---|---|---|
| `id` | ✅ | customer.id, employee.id, appointment.partnerid |
| `name` | ✅ | customer.name, employee.name |
| `phone` | ✅ | customer.phone, employee.phone |
| `email` | ✅ | customer.email, employee.email |
| `customer` | ✅ | Filter for customer list |
| `active` | ✅ | status mapping |
| `employee` | ✅ | Filter for employee list |
| `companyid` | ✅ | locationId |
| `datecreated` | ✅ | hireDate fallback |
| `lastupdated` | ✅ | lastVisit |
| `companyname` | ✅ | display text |
| `gender` | ✅ | Customer profile extra |
| All other ~75 columns | ❌ | — |

### `dbo.appointments` (36 columns) — Used: 9

| Column | Used? | Frontend Field |
|---|---|---|
| `id` | ✅ | appointment.id |
| `name` | ✅ | serviceName display |
| `date` | ✅ | appointment.date |
| `time` | ✅ | appointment.startTime |
| `datetimeappointment` | ✅ | Time fallback |
| `timeexpected` | ✅ | Duration for endTime calc |
| `note` | ✅ | notes |
| `state` | ✅ | status mapping |
| `partnerid` | ✅ | customerId |
| `companyid` | ✅ | locationId |
| `partnername` | ✅ | customerName |
| `partnerphone` | ✅ | customerPhone |
| `doctorid` | ✅ | doctorId |
| `doctorname` | ✅ | doctorName |
| `companyname` | ✅ | locationName |
| All other 21 columns | ❌ | — |

---

## Next Steps (Priority Order)

1. **Wire Calendar to API** — Replace `useCalendarData` mock with `fetchAppointments`  
2. **Wire Dashboard Stats to API** — Build aggregation queries from existing 3 tables  
3. **Wire Customer Profile to DB** — Map `partners` extended fields (birthday, gender, medicalhistory, note, etc.)  
4. **Wire Service Catalog to `/Products` API** — Already exists in `api.ts`, just not used  
5. **Wire Payment to `/SaleOrders` API** — Endpoint exists, page doesn't use it  
6. **Wire Check-in State to DB** — Persist `datetimearrived`, `datetimeseated`, `state` updates  
7. **Fix Location Mismatch** — Use real DB company names, not mock locations  
8. **Build Placeholder Pages** — Commission, Reports, Notifications (need new DB tables from full production dump)
9. **Build Settings/Relationships** — Need `roles`, `permissions`, `system_settings` tables
