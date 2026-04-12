# TGroup Full Codebase Audit Report

> Generated: 2026-04-11 | Audited by: 7 parallel agents | Branch: ai-develop

## Executive Summary

| Category | CRITICAL | HIGH | MEDIUM | LOW | Total |
|----------|----------|------|--------|-----|-------|
| Security | 3 | 8 | 6 | 4 | 21 |
| Backend API | 4 | 8 | 10 | 6 | 28 |
| Frontend Pages/Hooks | 1 | 5 | 10 | 8 | 24 |
| Frontend Components | 0 | 3 | 10 | 8 | 21 |
| API-Frontend Integration | 3 | 4 | 3 | 2 | 12 |
| Build/Types | 0 | 0 | 1 | 0 | 1 |
| **TOTAL (deduplicated)** | **~8** | **~15** | **~25** | **~20** | **~68** |

**Build Status:** TypeScript PASS (0 errors) | Vite Build PASS (1.36s)
**npm audit:** 0 known CVEs

---

## CRITICAL Issues (Must Fix Before Production)

### CRIT-1: Real Credentials Committed to Git
**OWASP:** A02 Cryptographic Failures
**Files:** `api/.env`, `docker-compose.yml:34`, `CLAUDE.md`
- JWT secrets (dev + production) committed in plaintext
- Google Places API key committed
- Hosoonline API key committed
- VPS root SSH password (`Tamyeu@234@234`) in CLAUDE.md
- DB password `postgres` hardcoded in docker-compose
**Fix:** Rotate ALL secrets immediately. Remove `api/.env` from git tracking. Use environment variables.

### CRIT-2: ~31 of 35 API Routes Have No Authentication
**OWASP:** A01 Broken Access Control
**Files:** All route files except auth.js(/me), externalCheckups.js, places.js, products.js(writes)
- Full CRUD on customers (PII), employees, payments, permissions completely unauthenticated
- `DELETE /api/Partners/:id/hard-delete` with no auth
- `PUT /api/Permissions/employees/:id` can elevate to admin with no auth
**Fix:** Add `requireAuth` as global middleware in `server.js` with explicit exceptions for login.

### CRIT-3: Services Route Crashes on Every Request
**Files:** `api/src/routes/services.js:40,61,96`
- `query()` helper returns `result.rows` (array), but code accesses `result.rows.map()` again
- `.rows` on an array is `undefined` -> TypeError crash
- `GET /api/Services` and `POST /api/Services` are completely broken
**Fix:** Change `result.rows.map()` to `result.map()`, `countResult.rows[0]` to `countResult[0]`.

### CRIT-4: Payments Void Endpoint Has Broken SQL
**File:** `api/src/routes/payments.js:337`
- Uses JavaScript double quotes inside SQL: `SET status = "voided"` 
- PostgreSQL interprets `"voided"` as a column name, not a string
- Endpoint crashes with `column "voided" does not exist`
**Fix:** Use single quotes: `SET status = 'voided'`

### CRIT-5: Payments Void Transaction Uses Wrong Connection Pattern
**File:** `api/src/routes/payments.js:330-349`
- Uses `query("BEGIN")` then `query("COMMIT")` via pool -- each may use different connections
- Transaction isolation is completely broken; partial updates possible
**Fix:** Use `pool.connect()` for a dedicated client, run all statements on that client.

### CRIT-6: JWT_SECRET Not Validated at Startup
**Files:** `api/src/routes/auth.js:114`, `api/src/middleware/auth.js:18`
- If `JWT_SECRET` env var is missing, `jsonwebtoken` uses empty string
- Any attacker can forge valid JWTs with empty key
**Fix:** Add startup validation: `if (!process.env.JWT_SECRET) process.exit(1)`

### CRIT-7: Partners GET Route Ignores companyId Filter
**Frontend:** `website/src/lib/api.ts:131` (sends `company_id`)
**Backend:** `api/src/routes/partners.js:11-140` (never reads it)
- Location filter on Customers page is completely non-functional
- Always returns ALL customers regardless of location selection
**Fix:** Add `company_id` extraction and WHERE clause in Partners GET handler.

### CRIT-8: Plaintext Password Stored in localStorage
**File:** `website/src/pages/Login.tsx:36-43`
- Raw password saved via `localStorage.setItem('savedPassword', password)`
- Any XSS or browser extension can read it
**Fix:** Remove password storage. Use HttpOnly refresh tokens instead.

---

## HIGH Issues (Should Fix Soon)

### HIGH-1: Wildcard CORS Configuration
**File:** `api/src/server.js:44`
- `cors({ origin: true, credentials: true })` allows any website to make authenticated requests
**Fix:** Restrict to `['http://localhost:5174', 'http://76.13.16.68:5174']`

### HIGH-2: No Rate Limiting on Login
**Files:** `api/src/routes/auth.js`, `api/src/routes/account.js`
- Unlimited credential attempts; password is `123456`
**Fix:** Add `express-rate-limit` on login endpoint.

### HIGH-3: No Security Headers (No Helmet)
**File:** `api/src/server.js`
**Fix:** `npm install helmet && app.use(helmet())`

### HIGH-4: JWT Stored in localStorage (XSS Risk)
**File:** `website/src/contexts/AuthContext.tsx:60,85,96`
- XSS leads directly to token theft
**Fix:** Use HttpOnly cookies instead.

### HIGH-5: Dev Permission Bypass via Non-UUID employeeId
**File:** `api/src/middleware/auth.js:40-43`
- Non-UUID employeeId in JWT gets superuser access
**Fix:** Remove bypass or gate behind `NODE_ENV === 'development'`.

### HIGH-6: Hardcoded Admin Credentials in Account Route
**File:** `api/src/routes/account.js:12-18`
- `admin` / `admin123` accepted with no environment guard
**Fix:** Remove legacy endpoint or gate behind dev-only check.

### HIGH-7: Error Messages Leak Internal Details
**Files:** `auth.js:129`, `permissions.js`, `monthlyPlans.js`, ~15 more
- `res.status(500).json({ error: err.message })` exposes DB schema
**Fix:** Return `'Internal server error'`; log details server-side only.

### HIGH-8: Default DB Credentials + Port Exposed
**File:** `docker-compose.yml:8-10,33`
- `postgres`/`postgres` in production, port 55433 exposed on all interfaces
**Fix:** Random credentials + bind to `127.0.0.1:55433:5432`.

### HIGH-9: Stale Closure in usePayment -- Location Filter Broken
**File:** `website/src/hooks/usePayment.ts:105,121`
- `fetchPayments` has empty `[]` dependency array but uses `selectedLocationId`
- Payment page location filter never updates
**Fix:** Add `selectedLocationId` to useCallback deps.

### HIGH-10: Silent Error Creates Phantom Customers
**File:** `website/src/hooks/useCustomers.ts:186-199`
- Failed API call creates fake local customer with `id: cust-${Date.now()}`
- Subsequent operations on this fake record all fail
**Fix:** Remove fake customer fallback; show error to user.

### HIGH-11: Race Condition in EditAppointmentModal Service Matching
**File:** `website/src/components/modules/EditAppointmentModal.tsx:214-256`
- Service fetch and form sync effects race; services empty on first open
- Re-run when services load resets all form fields
**Fix:** Split service-matching into its own useEffect that only sets serviceId.

### HIGH-12: EditAppointmentModal Always Sets Date to Today
**File:** `website/src/components/modules/EditAppointmentModal.tsx:219-220`
- Date hardcoded to `new Date()` instead of appointment's actual date
- Saving will silently change the appointment date
**Fix:** Use `appointment.date || todayFormatted`.

### HIGH-13: createExternalCheckup Always Fails (401)
**File:** `website/src/lib/api.ts:1112-1137`
- Uses raw `fetch()` instead of `apiFetch()` -- no Bearer token sent
- Backend requires `requireAuth` -> always rejected
**Fix:** Add `Authorization: Bearer ${token}` header.

### HIGH-14: Appointments/SaleOrders Ignore doctorId and companyId Filters
**Frontend:** `api.ts:284,447` (sends filters)
**Backend:** `appointments.js`, `saleOrders.js` (never reads them)
- Doctor filter and location filter on calendar/appointments are non-functional
**Fix:** Add `doctor_id` and `company_id` extraction to both GET handlers.

### HIGH-15: Route Ordering Shadows Literal Paths
**Files:** `commissions.js:133,251`, `crmTasks.js:187,261,288`, `hrPayslips.js:190,272,322`
- `/:id` routes defined before `/SaleOrderLinePartnerCommissions`, `/Categories`, `/Types`, `/Runs`, `/Structures`
- All literal path endpoints are unreachable
**Fix:** Move literal routes BEFORE `/:id` routes.

---

## MEDIUM Issues (25 items -- fix in next sprint)

### Backend
1. **Partners PUT can't clear fields to null** -- `COALESCE($N, column)` keeps old value (`partners.js:429`)
2. **SaleOrders count query missing JOIN for search** -- crashes when search used (`saleOrders.js:82`)
3. **Cashbooks count query missing JOIN for search** -- same pattern (`cashbooks.js:111`)
4. **Employees PUT checks `result.length` wrong** -- should be `result.rows.length` (`employees.js:376`)
5. **Race condition in customer code generation** -- `Math.random()` can duplicate (`partners.js:360`)
6. **Appointment name sequence not atomic** -- SELECT MAX then INSERT (`appointments.js:402`)
7. **Companies route swallows all errors silently** -- returns 200 OK even on DB failure (`companies.js:8`)
8. **No input validation on any write route** -- no schema validation with zod/joi
9. **SaleOrders aggregates computed from current page only** -- not full dataset (`saleOrders.js:88`)
10. **Dynamic SQL column names** -- structural injection risk in employees update (`employees.js:341`)

### Frontend
11. **Dead code: void expressions** in EditAppointmentModal (`EditAppointmentModal.tsx:306`)
12. **Silent error swallowing** in AddCustomerForm/WalkInForm data fetches
13. **VietQrModal resets form** on parent re-render with same props
14. **PaymentForm cross-tab allocation bug** -- ignores selections from inactive tab
15. **useCallback missing apiKey dep** in AddressAutocomplete
16. **Double API call on mount** in useAppointments
17. **Hardcoded dashboard percentages** -- `'+12.5%'` etc. are static strings, not real data
18. **Missing UTC-to-local date conversion** in useTodaySchedule
19. **Error state not exposed** in useOverviewData hook
20. **toSnakeCase breaks isDoctor/isAssistant** -- Employees filter silently non-functional
21. **Google API key bundled in frontend** via VITE_ prefix
22. **No HTTPS enforcement** -- credentials transmitted in plaintext
23. **File upload has no size/type limits** (`externalCheckups.js:130`)
24. **Upstream error details forwarded to client** (`externalCheckups.js:105`)
25. **console.log statements** in production code (6 instances)

---

## LOW Issues (20 items -- optional cleanup)

1. Index used as React key in dynamic lists (11 instances)
2. Minimal accessibility (only 5/90 components use aria-*)
3. No debounce cleanup on unmount in AddressAutocomplete
4. EmployeeForm doesn't reset when switching edit->create mode
5. Missing `require()` at top of file (uuid, bcryptjs inside handlers)
6. Inconsistent dbo. schema prefix across routes
7. Dead `customers-calendar.js` route never registered in server.js
8. Dead `fetchDashboardReports` function in api.ts
9. Dead pageSize UI selector in ServiceCatalog
10. 15 dead backend endpoints with no frontend callers
11. Partners/:id/GetKPIs endpoint exists but unused by frontend
12. Redundant client-side filtering after server-side filtering
13. console.error in production hooks
14. useBankSettings uses raw fetch instead of apiFetch
15. Customers.tsx at 733 lines exceeds 400-line guideline
16. No JWT revocation mechanism
17. Reports page has hardcoded data
18. localStorage read per appointment in mapping function (performance)
19. Overly broad console.log in request logger
20. Bundle size 721KB exceeds 500KB warning threshold

---

## Positive Observations

### Frontend
- TypeScript compilation: 0 errors (excellent discipline)
- No `dangerouslySetInnerHTML` anywhere (good XSS prevention)
- No `as any` in component files (strong type discipline)
- Consistent design system (gold standard AddCustomerForm pattern)
- Immutable state updates throughout
- Readonly props enforced at type level
- Good cancellation patterns in PaymentForm
- Single source of truth for constants

### Backend
- Parameterized queries throughout (prevents SQL injection)
- Sort field whitelisting (prevents ORDER BY injection)
- Thorough validation in appointments route (model for others)
- Proper transaction usage in employees route
- Soft-delete + hard-delete pattern for partners
- Limit capping on list endpoints (`Math.min(limit, 500)`)

---

## Fix Priority Plan

### Phase 1: Security Emergency (Day 1)
1. Rotate all exposed secrets (JWT, API keys, VPS password)
2. Remove `api/.env` from git, purge history
3. Add global `requireAuth` in server.js
4. Remove hardcoded admin credentials
5. Validate JWT_SECRET at startup
6. Restrict CORS origins
7. Remove plaintext password from localStorage

### Phase 2: Broken Features (Day 2-3)
8. Fix services.js `.rows` crash
9. Fix payments.js void SQL + transaction
10. Add companyId filter to Partners GET
11. Add doctorId + companyId to Appointments GET
12. Add date/company filters to SaleOrders GET
13. Fix createExternalCheckup auth token
14. Fix route ordering (commissions, crmTasks, hrPayslips)
15. Fix usePayment stale closure

### Phase 3: Data Integrity (Day 4-5)
16. Remove phantom customer creation fallback
17. Fix EditAppointmentModal date-always-today bug
18. Fix EditAppointmentModal service matching race condition
19. Fix toSnakeCase breaking isDoctor/isAssistant filter
20. Fix employees.js result.length check
21. Fix saleOrders/cashbooks count query JOIN

### Phase 4: Hardening (Week 2)
22. Add express-rate-limit
23. Add helmet security headers
24. Add input validation (zod/joi) on write routes
25. Move JWT to HttpOnly cookies
26. Bind DB port to 127.0.0.1 only
27. Add error handling to remaining silent-swallow patterns
28. Fix remaining MEDIUM issues

### Phase 5: Polish (Week 3+)
29. Code-split bundle (React.lazy)
30. Add accessibility (aria-* attributes)
31. Remove dead code/endpoints
32. Address LOW items as encountered

---

## Cross-Reference: Issue -> File Lookup

| Issue | Primary File | Related Files |
|-------|-------------|---------------|
| No auth on routes | `api/src/server.js` | All 35 route files |
| Services crash | `api/src/routes/services.js:40,61` | `api/src/db.js:11` |
| Payments void broken | `api/src/routes/payments.js:337` | — |
| Partners no location filter | `api/src/routes/partners.js:11-140` | `website/src/lib/api.ts:131` |
| Appointments no doctor filter | `api/src/routes/appointments.js:38-241` | `website/src/lib/api.ts:284` |
| SaleOrders no date filter | `api/src/routes/saleOrders.js:11-113` | `website/src/lib/api.ts:447` |
| Plaintext password | `website/src/pages/Login.tsx:36-43` | — |
| usePayment stale closure | `website/src/hooks/usePayment.ts:105,121` | — |
| Phantom customers | `website/src/hooks/useCustomers.ts:186-199` | — |
| EditModal date bug | `website/src/components/modules/EditAppointmentModal.tsx:219` | — |
| EditModal race condition | `website/src/components/modules/EditAppointmentModal.tsx:214-256` | — |
| External checkup 401 | `website/src/lib/api.ts:1112-1137` | `api/src/routes/externalCheckups.js:130` |
| isDoctor filter broken | `website/src/lib/api.ts:22-24` | `api/src/routes/employees.js:19` |
| Route ordering shadows | `api/src/routes/commissions.js:133,251` | `crmTasks.js:187`, `hrPayslips.js:190` |
| JWT in localStorage | `website/src/contexts/AuthContext.tsx:60,85` | `website/src/lib/api.ts:46` |
| CORS wildcard | `api/src/server.js:44` | — |
| Error message leak | `api/src/routes/auth.js:129` | 15+ route files |
| Dev permission bypass | `api/src/middleware/auth.js:40-43` | — |
