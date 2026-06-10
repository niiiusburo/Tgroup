# TGroup Schema Map

> Database entity map: relationships, writers, readers, endpoints, and frontend surfaces.

> Migration inventory: 67 SQL files under `api/migrations/` as of 2026-06-06 local file inventory, through `058_audit_logs.sql`. Duplicate numeric prefixes exist, so treat filename order as inventory, not a strict linear version sequence. Legacy `008_data_migration_from_tdental*.sql` files are destructive manual reconstruction scripts and must be blocked by their break-glass guards on protected NK3/local DB names.
>
> 2026-06-06 crossref breadcrumb pass: canonical migration files received SQL comment breadcrumbs only. No schema DDL/DML, table shape, endpoint payload, reader, writer, or blast-radius mapping changed.

## Legend

- **W** = Writer (INSERT/UPDATE/DELETE)
- **R** = Reader (SELECT)
- **E** = Endpoint exposing this entity
- **UI** = Frontend surface depending on this entity
- **Risk** = Shared DTO / type / serializer hazard level

---

## Two-Database Topology — Cosmetic Line of Business (v2)

> Implemented per migration 047 (2026-05-19) + final handler + db factory code.
> Physical isolation: two separate Postgres databases (tdental_demo + tcosmetic_demo) on the same server (127.0.0.1:5433 both local and docker). Dual pools via api/src/db/index.js (getDentalPool / getCosmeticPool, getDb(lob), getQuery(req) for transparent handler reuse).
> Dental DB receives only additive changes (new nullable columns + new tables per 047). No existing rows, queries, or constraints altered.
> Cosmetic DB provisioned with same schema (partners as identity for 1:1 mirror reuse of all dental handlers); seeded empty for staff/companies.
> partners table is the canonical identity/auth source in BOTH DBs (lob_scope, is_ctv, referred_by_ctv_id added to partners; NO users table for LOB scope per explicit migration comment).
> earnings table (not commissions) chosen to avoid legacy name collision.
> No cross-DB JOINs at SQL; CTV aggregation + cross-view only in API layer (getDb calls).
> D13 recipient resolution implemented in commissionEngine against partners + earnings.
> **Per-environment physical DB names** (same logical pair everywhere; `getDb(lob)` resolves via `DATABASE_URL` / `COSMETIC_DATABASE_URL`):
> - Local dev + NK (`nk.2checkin.com`): `tdental_demo` + `tcosmetic_demo` (local: 127.0.0.1:5433 native or 55433 via `tgroup-db` docker).
> - NK3 (`tmv.2checkin.com`, `/opt/tgroup-nk3/.env.nk3`): `tdental_nk3` + `tcosmetic_nk3` (VPS 127.0.0.1:55433, container `tgroup-db`).
> Docs that say "tdental_demo" mean "the dental pool" — on NK3 apply migrations to `tdental_nk3`/`tcosmetic_nk3`, never to a `*_demo` name.

**Database layout (final implemented)**

```
postgres (127.0.0.1:5433)
├── tdental_demo (EXISTING — dental LOB, production data, additive only)
│   └── dbo
│       ├── ... (all pre-v2 tables unchanged in shape)
│       ├── partners (canonical auth/identity SMI for customers + staff + CTV)
│       │   + lob_scope TEXT[] NULL
│       │   + is_ctv BOOLEAN NULL DEFAULT FALSE   (backfilled to ARRAY['dental']; CTV may have empty)
│       │   + referred_by_ctv_id UUID NULL
│       ├── products
│       │   + commission_rate_percent NUMERIC(5,2) NULL DEFAULT 0
│       ├── earnings (NEW — append-only transactional attribution per D12/D13; recipient_partner_id → partners)
│       ├── payouts (NEW)
│       └── referral_locks (NEW — dental-internal 6-month locks)
│
└── tcosmetic_demo (NEW — cosmetic LOB, seeded empty)
    └── dbo
        ├── partners (identity for clients/staff; reused for mirror /api/cosmetic/Partners etc. via getQuery)
        │   + lob_scope / is_ctv / referred_by_ctv_id (additive per 047 for consistency)
        │   + consulting_staff_id support via relations
        ├── staff (employee flags via partners; seeded EMPTY per D16)
        ├── companies (cosmetic locations; seeded EMPTY)
        ├── employee_location_scope
        ├── appointments
        ├── products / services
        │   + commission_rate_percent NUMERIC(5,2) NULL DEFAULT 0
        ├── saleorders / saleorderlines
        │   + consultation_id FK on saleorderlines
        ├── payments / payment_allocations / monthlyplans / planinstallments
        ├── consultations (NEW — invisible backend attribution unit only; 6mo TTL)
        │   status: open | attached | converted | superseded | expired
        │   auto-managed on appt book
        ├── earnings (NEW — identical to dental; recipient_partner_id → partners)
        └── payouts (NEW)
```

### Key new / altered tables (detailed shapes — final per 047)

#### tdental_demo.dbo.earnings
- PK: id UUID
- FKs: client_id → partners(id), recipient_partner_id → partners(id), payment_id → payments(id), service_line_id → saleorderlines(id), payout_id → payouts(id)
- Columns: source TEXT CHECK ('ctv'|'consultation'|'salestaff'), amount NUMERIC(14,2) (negative on reversal), status ('pending'|'paid'|'reversed'), earned_at, created_at
- Notes: Append-only. D13 resolution in commissionEngine. Real FKs on dental. Refunds = negative reversal rows.

#### tdental_demo.dbo.payouts
- Same shape in both DBs: id, cycle_label, paid_at, total_amount, notes, created_by_partner_id, created_at

#### tdental_demo.dbo.referral_locks
- Dental-internal only. 6-month TTL engine (not exposed in v1 UI).

#### tdental_demo.dbo.partners (additive columns — canonical identity)
- lob_scope TEXT[] — hard gate for LOB access (replaces early 'users' concept)
- is_ctv BOOLEAN — CTV partners bypass admin UI entirely, land on /ctv
- referred_by_ctv_id — first-class CTV attribution
- created_via / ref / signature_image — import/source metadata; legacy CTV imports use `created_via LIKE 'legacy_ctv_import%'` and `ref = ma_ctv` so admin CTV pages can show source badges without changing identity keys.

#### tdental_demo.dbo.products (additive)
- commission_rate_percent — per-product rate; 0% default means no behavior change for dental today

#### tcosmetic_demo.dbo.partners
- Reused for client/identity rows (enables exact mirror of all /Partners, /Employees etc. handlers via getQuery(req) + attachCosmeticDb).
- Same additive columns as dental (lob_scope etc.) + relations for consulting_staff.
- Phone match for optional admin "also a dental client" badge (lob.crossview) only.

#### tcosmetic_demo.dbo.consultations
- Backend-only commission attribution surface. Auto-created when cosmetic appointment booked with consulting_staff_id.
- Superseded by subsequent card; never rendered in admin UI. 6mo TTL.

#### tcosmetic_demo.dbo.earnings
- Identical columns/shape to dental earnings.
- recipient_partner_id is a soft reference (no cross-DB FK); API + engine validate on write via getDb.

#### tcosmetic_demo.dbo.staff / companies / employee_location_scope
- Mirror dental employee + location scoping tables. Cosmetic staff table intentionally empty at bootstrap (D16); populated by admins via reused Employees UI.

All other cosmetic tables (appointments, payments, saleorders, etc.) are structural mirrors of their dental counterparts and are accessed exclusively via the /api/cosmetic/* route family.

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
| **Risk** | **High** — in local provider mode, embedding dimension must match the model (128 for SFace). Changing the local face model requires re-registering all local embeddings. CompreFace mode stores examples in CompreFace and uses `partners.face_subject_id` for status. Soft-delete via `deleted_at` preserves local audit history. |

### dbo.appointments

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) |
| **Foreign Keys** | `partnerid` → partners (customer), `doctorid` → partners (doctor), `companyid` → companies, `productid` → products |
| **W** | `api/src/routes/appointments.js`, `api/src/routes/ctv.js` (`POST /api/ctv/bookings`, appointment-only with resolved non-null `companyid`) |
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
| **Risk** | **High** — state transitions (`draft` → `confirmed` → `done` → `cancelled`) are logged in `saleorder_state_logs` and drive payment residual calculations. Soft-deleted saleorders must not count toward `/api/CustomerBalance/:id` outstanding debt. `sourceid` is UUID-typed and must come from the active LOB's `customersources`; fallback UI ids are not valid writes. |

### dbo.saleorderlines

| Attribute | Value |
|-----------|-------|
| **Primary Key** | `id` (uuid) |
| **Foreign Keys** | `saleorderid` → saleorders, `productid` → products |
| **W** | `api/src/routes/saleOrderLines.js` soft-delete endpoint; sale order patches update rendered line fields |
| **R** | `saleOrderLines.js`, `saleOrders.js` (`/lines`), `reports.js`, `products.js` (delete guard), employee revenue export builder |
| **E** | `GET /api/SaleOrderLines`, `DELETE /api/SaleOrderLines/:id`, `GET /api/SaleOrders/lines` |
| **UI** | ServiceHistoryList, Reports |
| **Risk** | **Medium** — `toothrange`, `toothtype`, `discounttype`, `isrewardline` are Odoo-specific and sparsely typed in frontend. Deleting the last active line also soft-deletes the parent sale order. |

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
| **W** | Odoo/TDental sync owns records; `api/src/routes/payments.js` updates `amountresidual` when allocations are applied/reversed |
| **R** | `dotKhams.js`, `customerReceipts.js`, `reports.js`, `partners.js`, `payments.js` allocation target reads |
| **E** | `GET /api/DotKhams`, `GET /api/DotKhams/:id` |
| **UI** | CustomerProfile health records, ServiceHistory (indirect) |
| **Risk** | **Medium** — `products.js` delete guard checks `dotkhamsteps` linkage; payment allocation changes can move `amountresidual` without a DotKhams write route. |

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
| **W** | `api/src/routes/exports.js` logs preview and download attempts; created by `api/migrations/043_add_exports_audit.sql` |
| **R** | Operational audit queries only; no user-facing route yet |
| **E** | Indirect via `POST /api/Exports/:type/preview` and `POST /api/Exports/:type/download` for customers, appointments, services, payments, service-catalog, report-sales-employees, revenue-flat, and deposit-flat |
| **UI** | No direct UI surface; supports auditability for operational Excel exports |
| **Risk** | **Medium** — audit writes are non-blocking/catch-and-log in the route, so export success does not guarantee an audit row exists unless explicitly verified. |

### dbo.feedback_threads + feedback_messages + feedback_attachments

| Attribute | Value |
|-----------|-------|
| **W** | `api/src/routes/feedback/userRoutes.js`, `api/src/routes/feedback/adminRoutes.js`, telemetry auto-thread creation in `api/src/server.js` |
| **R** | `feedback/userRoutes.js`, `feedback/adminRoutes.js` |
| **E** | `GET /api/Feedback/unread-count`, user `/api/Feedback/my*`, admin `/api/Feedback/all*`, and `POST /api/Feedback` |
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
| **E** | `GET /api/IpAccess/check`, `GET/PUT /api/IpAccess/settings`, `GET/POST/PUT/DELETE /api/IpAccess/entries*` |
| **UI** | IPAccessControlContent |
| **Risk** | **Medium** — `ip_access_settings` is treated as one global mode row (`SELECT ... LIMIT 1` / `UPDATE` all rows, seed if missing); mode enum values `allow_all`, `block_all`, `whitelist_only`, and `blacklist_block` must match frontend dropdowns. `/api/IpAccess/check` is public allowlisted before global auth; all settings/entry management routes require settings permissions. |

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
