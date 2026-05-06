# TGroup Schema Map

> Database entity map: relationships, writers, readers, endpoints, and frontend surfaces.

## Legend

- **W** = Writer (INSERT/UPDATE/DELETE)
- **R** = Reader (SELECT)
- **E** = Endpoint exposing this entity
- **UI** = Frontend surface depending on this entity
- **Risk** = Shared DTO / type / serializer hazard level

---

## Core Entities

### dbo.companies (Locations / Branches)

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) |
| **Key Relationships** | Referenced by `partners.companyid`, `appointments.companyid`, `payments.companyid`, `products.companyid`, `saleorders.company_id`, `monthlyplans.companyid`, `dotkhams.companyid`, `feedback_attachments` (indirect), `employee_location_scope.company_id` |
| **W** | `api/src/routes/employees.js` (indirect via partner updates), `api/src/routes/stockPickings.js` |
| **R** | Nearly every route file; employee revenue export builder |
| **E** | `GET /api/Companies` |
| **UI** | LocationSelector, FilterByLocation, LocationDashboard, LocationCard, all page lists filtered by location |
| **Risk** | **High** — adding a required column without defaults breaks every INSERT across the app. |

### dbo.partners (Customers + Employees SMI)

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) |
| **Key Relationships** | FK `companyid` → companies; conceptually parent of `appointments.partnerid`, `appointments.doctorid`, `payments.partnerid`, `saleorders.partner_id`, `dotkhams.partnerid`, `dotkhams.doctorid`, `monthlyplans.partnerid`, `employee_permissions.employee_id`, `permission_overrides.employee_id`, `employee_location_scope.employee_id` |
| **Discriminator Columns** | `customer` (bool), `employee` (bool), `isdoctor` (bool), `isassistant` (bool), `isreceptionist` (bool) |
| **W** | `api/src/routes/partners.js`, `api/src/routes/employees.js`, `api/src/routes/auth.js` (password_hash, last_login), `api/src/routes/faceRecognition.js` (face_subject_id), `api/src/routes/permissions.js` (tier_id) |
| **R** | `partners.js`, `appointments.js`, `payments.js`, `reports.js`, `employees.js`, `auth.js`, `faceRecognition.js`, `dashboardReports.js`, `commissions.js`, employee revenue export builder |
| **E** | `GET/POST/PUT/PATCH/DELETE /api/Partners/*`, `GET/POST/PUT/DELETE /api/Employees/*`, `POST /api/Auth/login`, `GET /api/Auth/me`, `POST /api/Auth/change-password`, `POST /api/face/*` |
| **UI** | Customers page, Employees page, Login, Appointment forms, Payment forms, Service records, Reports, Face capture |
| **Risk** | **Critical** — recent breakage occurred when `password_hash` was missing and NOT NULL constraints were added without updating all INSERT paths. Customer phone is not unique identity and may overlap migrated refs/phones; UUID remains the durable key. |

### dbo.customer_face_embeddings

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) |
| **Foreign Keys** | `partner_id` → partners (customer), `created_by` → partners (employee) |
| **W** | `api/src/routes/faceRecognition.js` |
| **R** | `faceRecognition.js` |
| **E** | `POST /api/face/*` |
| **UI** | CustomerCameraWidget, PatientCheckIn, FaceCaptureModal |
| **Risk** | **High** — embedding dimension must match the model (128 for SFace). Changing the face model requires re-registering all embeddings. Soft-delete via `deleted_at` preserves audit history. |

### dbo.appointments

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) |
| **Foreign Keys** | `partnerid` → partners (customer), `doctorid` → partners (doctor), `companyid` → companies, `productid` → products |
| **W** | `api/src/routes/appointments.js` |
| **R** | `appointments.js`, `customerReceipts.js`, `reports.js`, `dashboardReports.js`, `dotKhams.js` |
| **E** | `GET/POST/PUT /api/Appointments` |
| **UI** | Calendar, Appointments page, TodaySchedule, AppointmentForm, EditAppointmentModal, CustomerProfile appointment history |
| **Risk** | **High** — `color` (string 0-7) and `status` (scheduled/arrived/cancelled) are hardcoded in frontend constants (`APPOINTMENT_CARD_COLORS`, `APPOINTMENT_STATUS_OPTIONS`). |

### dbo.products (Service Catalog)

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) |
| **Foreign Keys** | `categid` → productcategories, `companyid` → companies |
| **Semantic Note** | Legacy Odoo table name; holds dental services (type = 'service'). |
| **W** | `api/src/routes/products.js` |
| **R** | `products.js`, `appointments.js`, `reports.js`, `saleOrderLines.js`, `dotKhams.js` |
| **E** | `GET/POST/PUT/DELETE /api/Products` |
| **UI** | ServiceCatalog, ServiceForm, ServiceCatalogSelector, AppointmentForm service picker, Reports services breakdown |
| **Risk** | **High** — `listprice`, `saleprice`, `laboprice` are exposed directly; delete is blocked by FK checks in `saleorderlines` and `dotkhamsteps`. |

### dbo.productcategories

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) |
| **Self-Ref FK** | `parentid` → productcategories |
| **W** | `api/src/routes/productCategories.js` |
| **R** | `products.js` (JOIN for categname), `reports.js` |
| **E** | `GET/POST/PUT/DELETE /api/ProductCategories` |
| **UI** | ServiceCatalog category filters (duplicate migrated display names are grouped by API), ServiceForm category dropdown |
| **Risk** | **Medium** — deleting a category without reassigning `products.categid` will orphan products or break list queries. |

### dbo.saleorders (Treatment Plans / Orders)

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) |
| **Foreign Keys** | `partner_id` → partners, `company_id` → companies |
| **W** | `api/src/routes/saleOrders.js` |
| **R** | `saleOrders.js`, `saleOrderLines.js`, `payments.js` (allocations), `reports.js`, `partners.js` (KPIs), `appointments.js`, employee revenue export builder |
| **E** | `GET/POST/PATCH /api/SaleOrders` |
| **UI** | Services patient records, Payment allocations, CustomerProfile service history, Reports |
| **Risk** | **High** — state transitions (`draft` → `confirmed` → `done` → `cancelled`) are logged in `saleorder_state_logs` and drive payment residual calculations. |

### dbo.saleorderlines

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) |
| **Foreign Keys** | `saleorderid` → saleorders, `productid` → products |
| **W** | `api/src/routes/saleOrderLines.js` (indirect via sale order patches) |
| **R** | `saleOrderLines.js`, `reports.js`, `products.js` (delete guard), employee revenue export builder |
| **E** | `GET /api/SaleOrderLines` |
| **UI** | ServiceHistoryList, Reports |
| **Risk** | **Medium** — `toothrange`, `toothtype`, `discounttype`, `isrewardline` are Odoo-specific and sparsely typed in frontend. |

### dbo.payments

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) |
| **Foreign Keys** | `partnerid` → partners, `companyid` → companies |
| **W** | `api/src/routes/payments.js`, `api/src/routes/accountPayments.js` |
| **R** | `payments.js`, `reports.js`, `dashboardReports.js`, `customerBalance.js`, `receipts.js`, `partners.js` (KPIs), employee revenue export builder |
| **E** | `GET/POST/PATCH/DELETE /api/Payments`, `GET /api/AccountPayments` |
| **UI** | Payment page, PaymentHistory, DepositWallet, CustomerProfile payments tab, Reports revenue |
| **Risk** | **Critical** — `method` enum (`cash` | `bank_transfer` | `deposit` | `mixed`) is mirrored in `website/src/types/payment.ts`. Mismatches break type guards and allocation logic. |

> Import note: `dbo.accountpayments` can be a non-writable legacy placeholder view in local demo schemas. New TDental import flows should populate `dbo.payments` and `dbo.payment_allocations`, and use `accountpayments` only as a read fallback when present.

### dbo.payment_allocations

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) |
| **Foreign Keys** | `payment_id` → payments; `invoice_id` → saleorders when allocated to a treatment order; `dotkham_id` is supported without FK because demo `dotkhams` can be a view |
| **W** | `api/src/routes/payments.js`, `api/scripts/tdental-import/database.js`, archived migration/import scripts |
| **R** | `payments.js`, `saleOrders.js`, `customerBalance.js`, `api/src/lib/saleOrderTotals.js`, TDental validation scripts, employee revenue export builder |
| **E** | Exposed through `/api/Payments`, `/api/SaleOrders`, and `/api/CustomerBalance` payload calculations; no standalone CRUD route |
| **UI** | Payment allocations, customer balance, service residual display, deposit/payment classification |
| **Risk** | **Critical** — deleting, double-counting, or greedily reconstructing allocations changes residuals and paid totals. TDental imports should be relation-driven where source relations exist. |

### dbo.monthlyplans + dbo.monthlyplan_items + dbo.planinstallments

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) on `monthlyplans` |
| **Foreign Keys** | `partnerid` → partners, `companyid` → companies |
| **W** | `api/src/routes/monthlyPlans.js` |
| **R** | `monthlyPlans.js`, `reports.js`, `payments.js` |
| **E** | `GET/POST/PUT/DELETE /api/MonthlyPlans`, `PUT /api/MonthlyPlans/:id/installments/:installmentId/pay` |
| **UI** | MonthlyPlanCreator, InstallmentTracker, PaymentSchedule |
| **Risk** | **Medium** — plan items and installments are split across three tables; schema changes must cascade to all three. |

### dbo.dotkhams (Medical Records) + dbo.dotkhamsteps

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) on `dotkhams` |
| **Foreign Keys** | `partnerid` → partners, `doctorid` → partners, `companyid` → companies; `dotkhamsteps.dotkhamid` → dotkhams, `dotkhamsteps.productid` → products |
| **W** | `api/src/routes/dotKhams.js` (read-only in current UI; writes may happen via Odoo sync) |
| **R** | `dotKhams.js`, `customerReceipts.js`, `reports.js`, `partners.js` |
| **E** | `GET /api/DotKhams` |
| **UI** | CustomerProfile health records, ServiceHistory (indirect) |
| **Risk** | **Medium** — `products.js` delete guard checks `dotkhamsteps` linkage. |

---

## Permission Entities

### dbo.permission_groups

| Attribute | Value |
|-----------|-------|
| **W** | `api/src/routes/permissions.js` |
| **R** | `permissions.js`, `auth.js`, `auth.js` route, `feedback.js` (requireAdmin check) |
| **E** | `GET/POST/PUT /api/Permissions/groups` |
| **UI** | PermissionBoard, Settings RoleConfig, TierSelector |
| **Risk** | **High** — `is_system` flag prevents deletion; frontend should honor it. |

### dbo.group_permissions

| Attribute | Value |
|-----------|-------|
| **W** | `api/src/routes/permissions.js` (replaced on group PUT) |
| **R** | `permissions.js`, `auth.js` middleware, `auth.js` route |
| **E** | Via `/api/Permissions/groups` and `/api/Permissions/resolve/*` |
| **UI** | PermissionMatrix, PermissionBoard |
| **Risk** | **High** — permission strings are free text; typos in backend seeding or frontend checks cause silent 403s. |

### dbo.employee_permissions

| Attribute | Value |
|-----------|-------|
| **W** | `api/src/routes/permissions.js` (upsert on employee PUT) |
| **R** | `permissions.js`, `auth.js` middleware (via `partners.tier_id` mainly) |
| **E** | `GET/PUT /api/Permissions/employees` |
| **UI** | PermissionBoard EmployeeCard, Settings RoleConfig |
| **Risk** | **Medium** — kept for backward compat; primary assignment is now `partners.tier_id`. |

### dbo.permission_overrides

| Attribute | Value |
|-----------|-------|
| **W** | `api/src/routes/permissions.js` |
| **R** | `permissions.js`, `auth.js` middleware, `auth.js` route |
| **E** | Via `/api/Permissions/employees` and `/api/Permissions/resolve/*` |
| **UI** | PermissionBoard overrides panel |
| **Risk** | **Medium** — `override_type` enum (`grant` | `revoke`) must stay in sync with backend logic. |

### dbo.employee_location_scope

| Attribute | Value |
|-----------|-------|
| **W** | `api/src/routes/permissions.js`, `api/src/routes/employees.js` |
| **R** | `permissions.js`, `auth.js` route, `employees.js` |
| **E** | Via `/api/Permissions/employees` and `/api/Auth/me` |
| **UI** | FilterByLocation (locks when single location), LocationSelector |
| **Risk** | **High** — empty scope currently treated as "all" or "none" depending on consumer; logic must stay consistent. |

---

## Config / Meta Entities

### dbo.systempreferences

| Attribute | Value |
|-----------|-------|
| **W** | `api/src/routes/systemPreferences.js` |
| **R** | `systemPreferences.js`, `config.js` (legacy) |
| **E** | `GET/POST/PUT/DELETE /api/SystemPreferences` |
| **UI** | SystemPreferencesContent, TimezoneSelector |
| **Risk** | **Low** — key/value store; consumers must handle missing keys gracefully. |

### dbo.company_bank_settings

| Attribute | Value |
|-----------|-------|
| **W** | `api/src/routes/bankSettings.js` |
| **R** | `bankSettings.js`, `payments.js` (VietQR generation) |
| **E** | `GET/PUT /api/settings/bank` |
| **UI** | BankSettingsForm, VietQrModal |
| **Risk** | **Medium** — `bank_bin`, `bank_number`, `bank_account_name` are used to build VietQR URLs. |

### dbo.websitepages

| Attribute | Value |
|-----------|-------|
| **W** | `api/src/routes/websitePages.js` |
| **R** | `websitePages.js` |
| **E** | `GET/POST/PUT/DELETE /api/WebsitePages` |
| **UI** | Website CMS at `/website`, PageList, PageEditor, SEOManager. Service catalog is now routed separately at `/service-catalog`. |
| **Risk** | **Low** — isolated table. |

### dbo.exports_audit

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) |
| **W** | `api/src/routes/exports.js` logs preview and download attempts |
| **R** | Operational audit queries only; no user-facing route yet |
| **E** | Indirect via `POST /api/Exports/:type/preview` and `POST /api/Exports/:type/download` |
| **UI** | No direct UI surface; supports auditability for operational Excel exports |
| **Risk** | **Medium** — audit writes are non-blocking/catch-and-log in the route, so export success does not guarantee an audit row exists unless explicitly verified. |

### dbo.feedback_threads + feedback_messages + feedback_attachments

| Attribute | Value |
|-----------|-------|
| **W** | `api/src/routes/feedback.js` |
| **R** | `feedback.js` |
| **E** | `GET/POST/PATCH/DELETE /api/Feedback/*` |
| **UI** | FeedbackWidget, FeedbackAdminContent |
| **Risk** | **Medium** — attachments are stored on disk in `api/uploads/feedback/` with metadata in `feedback_attachments`. Moving storage requires nginx + backend path updates. |

---


### dbo.ip_access_settings + ip_access_entries

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) on both tables |
| **Key Relationships** | `ip_access_entries.created_by` → partners(id) |
| **W** | `api/src/routes/ipAccess.js` |
| **R** | `ipAccess.js`, middleware |
| **E** | `GET/POST/DELETE /api/ip-access/*` |
| **UI** | IPAccessControlContent |
| **Risk** | **Medium** — `mode` enum values must match frontend dropdowns. |

### dbo.version_events

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (serial) |
| **W** | `api/src/routes/telemetry.js` (frontend version tracking) |
| **R** | `telemetry.js` |
| **E** | `POST /api/telemetry/version` |
| **UI** | VersionDisplay (forces reload on stale version) |
| **Risk** | **Low** — isolated telemetry table. |

### dbo.error_events + dbo.error_fix_attempts

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) on both tables |
| **W** | `api/src/server.js` public telemetry error ingestion, `api/src/routes/telemetry.js`, `api/src/middleware/errorHandler.js` |
| **R** | `api/src/routes/telemetry.js`, `scripts/auto-fixer.js` |
| **E** | `POST /api/telemetry/errors` public ingestion; authenticated `GET/PUT /api/telemetry/errors`, `POST /api/telemetry/errors/:id/fix-attempts`, `GET /api/telemetry/stats` |
| **UI** | ErrorBoundary/ErrorReporter and auto-created Feedback threads |
| **Risk** | **Medium** — ingestion is intentionally public and rate-limited; management endpoints must remain behind auth. |

### dbo.accountinvoices

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) |
| **W** | TDental delta sync (external system) |
| **R** | `api/src/routes/dotKhams.js` (LEFT JOIN) |
| **E** | None directly — referenced via dotKhams |
| **UI** | DotKham detail views |
| **Risk** | **Medium** — table must exist or dotKhams queries 500. Populated by external sync, not app UI. |

## Shared DTO / Type / Serializer Risks

| Type / DTO | Files Using It | Risk |
|------------|----------------|------|
| `ApiPartner` | `lib/api/partners.ts`, `useCustomers.ts`, `CustomerForm`, `CustomerSelector` | **High** — mixes read aliases (`city`) with write columns (`cityname`). |
| `ApiAppointment` | `lib/api/appointments.ts`, `Calendar`, `AppointmentForm` | **High** — dual camelCase (`doctorId`) and snake_case (`doctorid`) keys for API passthrough. |
| `ApiPayment` | `lib/api/payments.ts`, `PaymentForm`, `DepositWallet` | **High** — `method` enum must match DB + backend + frontend. |
| `Permission` / `Role` | `types/permissions.ts`, `PermissionMatrix`, `PermissionBoard` | **Medium** — permission strings are not generated from a shared source. |
| `Employee` | `types/employee.ts`, `EmployeeForm`, `EmployeeTable` | **Medium** — `ROLE_TO_DB_FLAGS` duplicates flag mappings in both camelCase and snake_case. |
| `PaginatedResponse<T>` | `lib/api/core.ts`, all list API modules | **Medium** — shape `{offset, limit, totalItems, items}` is expected by all DataTable consumers. |

---

## Schema Change Blast Radius Summary

| If you change this table... | You must also review... |
|-----------------------------|--------------------------|
| `dbo.partners` | Auth routes, Employee routes, Face Recognition, Payments, Appointments, Reports, E2E tests |
| `dbo.customer_face_embeddings` | Face Recognition routes (register, recognize, status), customer profile Face ID tab |
| `dbo.appointments` | Calendar components, AppointmentForm, constants (colors/status), Reports, E2E tests |
| `dbo.products` | ServiceCatalog, ProductCategories, AppointmentForm, SaleOrders, Reports, delete guards |
| `dbo.payments` | PaymentForm, DepositWallet, Reports, VietQR, CustomerProfile payment tab |
| `dbo.payment_allocations` | Payments, SaleOrders residuals, CustomerBalance, TDental import scripts, service history paid/residual display |
| `dbo.saleorders` | Service records UI, Payments (allocations), Reports, CustomerProfile |
| `dbo.exports_audit` | Export route audit behavior, operational compliance checks |
| `dbo.error_events` / `dbo.error_fix_attempts` | Telemetry ingestion, Feedback auto-thread creation, AutoDebugger scripts |
| `dbo.permission_groups` / `group_permissions` | Auth middleware, PermissionBoard, Settings RoleConfig |
| `dbo.company_bank_settings` | BankSettingsForm, VietQrModal, `lib/vietqr.ts` |
