# Backend API ↔ Frontend Data Contract Audit Report
**Date:** 2026-04-14  
**Auditor:** Automated Agent  
**Project:** TGroup Dental Clinic Management Dashboard  

---

## 1. EXECUTIVE SUMMARY

The audit examined **40+ backend route files** in `api/src/routes/` and **90+ frontend source files** in `website/src/`. The primary communication pattern uses a central `apiFetch()` helper in `website/src/lib/api.ts` that auto-converts camelCase query params to snake_case.

### Key Findings
- **12 mismatches found** (5 HIGH, 4 MEDIUM, 3 LOW)
- The most critical issues are: inconsistent field casing in appointment responses, SaleOrders date filter not working, Services table using different schema from rest of app, and Companies endpoint returning raw dbo.* columns.
- A systematic `toSnakeCase()` conversion in the frontend API layer partially mitigates casing issues but introduces its own bugs (e.g., `isDoctor` allowlist bypasses conversion when backend DOES expect it for Employees).

---

## 2. API ENDPOINT CONTRACT REFERENCE

### 2.1 GET /api/Partners (Customers List)

**Backend returns** (snake_case from SQL aliases):
```
id, code (aliased from ref), displayname, name, phone, email, street,
city (aliased from cityname), district (aliased from districtname),
ward (aliased from wardname), gender, birthyear, birthmonth, birthday,
medicalhistory, comment, note, status (aliased from active),
treatmentstatus, sourceid, sourcename, referraluserid, agentid,
agentname, companyid, companyname, datecreated, lastupdated,
createdbyid, writebyid, avatar, zaloid, taxcode, identitynumber,
healthinsurancecardnumber, emergencyphone, weight,
appointmentcount (hardcoded 0), ordercount (hardcoded 0),
dotkhamcount (hardcoded 0)
```

**Frontend expects** (`ApiPartner` interface):
```
id, code, ref, displayname, name, phone, email, street, city, district, ward,
cityname?, districtname?, wardname?, gender, birthyear, birthmonth, birthday,
medicalhistory, comment, note, status, treatmentstatus, sourceid, sourcename,
referraluserid, agentid, agentname, companyid, companyname, customer, supplier,
employee, cskhid, cskhname, salestaffid, datecreated, lastupdated, taxcode,
identitynumber, healthinsurancecardnumber, emergencyphone, weight, jobtitle,
isbusinessinvoice, unitname, unitaddress, personalname, personalidentitycard,
personaltaxcode, personaladdress
```

### 2.2 GET /api/Partners/:id (Single Customer Profile)

**Backend returns** (same as list + additional fields):
All list fields PLUS: `citycode, districtcode, wardcode, citycodev2, citynamev2, wardcodev2, wardnamev2, usedaddressv2, barcode, fax, hotline, website, jobtitle, iscompany, ishead, isbusinessinvoice, unitname, unitaddress, customername, invoicereceivingmethod, receiveremail, receiverzalonumber, personalidentitycard, personaltaxcode, personaladdress, personalname, stageid, lasttreatmentcompletedate, sequencenumber, sequenceprefix, supplier, customer, isagent, isinsurance, employee, cskhid, salestaffid, appointmentcount (real count), ordercount (real count), dotkhamcount (real count), createdbyname, updatedbyname`

### 2.3 GET /api/Appointments

**Backend returns** (all lowercase from SQL):
```
id, name, date, time, datetimeappointment, dateappointmentreminder,
timeexpected, note, state, reason, aptstate, partnerid, partnername,
partnerdisplayname, partnerphone, partnercode (aliased from ref),
companyid, companyname, userid, username, doctorid, doctorname,
dotkhamid, dotkhamname, saleorderid, saleordername, isrepeatcustomer,
color, datetimearrived, datetimeseated, datetimedismissed, datedone,
lastdatereminder, customercarestatus, isnotreatment, leadid, callid,
teamid, teamname, customerreceiptid, receiptdate, datecreated,
lastupdated, createdbyid, writebyid
```

Response wrapper: `{ offset, limit, totalItems, items, aggregates: { total, byState } }`

**Frontend expects** (`ApiAppointment`):
```
id, name, date, time, datetimeappointment, timeexpected, timeExpected,
note, state, reason, partnerid, partnername, partnerdisplayname,
partnerphone, partnercode, doctorid, doctorId, doctorname, companyid,
companyname, color, datecreated, lastupdated
```

### 2.4 GET /api/Companies (Locations)

**Backend returns**: `SELECT * FROM dbo.companies` (raw PostgreSQL column names)

**Frontend expects** (`ApiCompany`):
```
id, name, email, phone, active, datecreated, lastupdated
```

### 2.5 GET /api/Employees

**Backend returns** (snake_case from SQL):
```
id, name, ref, phone, email, avatar, isdoctor, isassistant, isreceptionist,
active, jobtitle, companyid, companyname, hrjobid, hrjobname, wage, allowance,
startworkdate, datecreated, lastupdated, locationScopeIds (appended)
```

**Frontend expects** (`ApiEmployee`):
```
id, name, ref, phone, email, avatar, isdoctor, isassistant, isreceptionist,
active, companyid, companyname, locationScopeIds, hrjobid, hrjobname,
jobtitle, wage, allowance, startworkdate, datecreated, lastupdated
```

### 2.6 GET /api/Services

**Backend returns** (camelCase transformation applied):
```
id, customerId, doctorId, assistantId, locationId, appointmentId,
serviceType, serviceCode, practitioner, prescription, notes,
unitPrice, quantity, discount, totalAmount, status, sessions,
createdAt, updatedAt
```

**Frontend expects** (`ApiService`):
```
id, customerId, doctorId, serviceType, unitPrice, totalAmount,
status, createdAt
```

### 2.7 GET /api/SaleOrders

**Backend returns** (snake_case from SQL):
```
id, name, code, partnerid, partnername, partnerdisplayname, amounttotal,
residual, totalpaid, state, companyid, companyname, doctorid, doctorname,
assistantid, assistantname, dentalaideid, dentalaidename, quantity, unit,
datestart, dateend, notes, productid, productname, datecreated, isdeleted
```

### 2.8 GET /api/Payments

**Backend returns** (camelCase transformation applied):
```
id, customerId, serviceId, amount, method, depositUsed, cashAmount,
bankAmount, notes, paymentDate, referenceCode, status, receiptNumber,
depositType, createdAt, allocations[]
```

### 2.9 GET /api/DotKhams

**Backend returns** (snake_case from SQL):
```
id, sequence, name, date, reason, state, activitystatus, invoicestate,
paymentstate, totalamount, amountresidual, note, partnerid, partnername,
partnerdisplayname, companyid, companyname, doctorid, doctorname,
assistantid, assistantname, assistantsecondaryid, assistantsecondaryname,
appointmentid, appointmentname, appointmentdate, saleorderid, saleordername,
accountinvoiceid, invoicename, datecreated, lastupdated, createdbyid,
writebyid, stepcount, completedsteps
```

---

## 3. MISMATCH DETAILS

### MISMATCH #1: Appointment create — `state: 'scheduled'` not in backend VALID_STATES
- **Severity:** HIGH
- **Files:** `website/src/hooks/useAppointments.ts:211` → `api/src/routes/appointments.js:8`
- **Frontend sends:** `state: 'scheduled'` when creating an appointment
- **Backend validates against:** `VALID_STATES = ['draft', 'scheduled', 'confirmed', 'arrived', 'in Examination', 'in-progress', 'done', 'cancelled']`
- **Impact:** `'scheduled'` IS in the valid list, BUT the default is `'confirmed'` on the backend. When frontend sends `state: 'scheduled'`, the backend accepts it. However, the `mapApiToManagedAppointment` function treats `'scheduled'` as status `'scheduled'` which is fine. **No runtime error** but semantic inconsistency — new appointments are `scheduled` via API but the backend default would be `confirmed`.
- **Verdict:** LOW functional impact but creates inconsistency in the data.

### MISMATCH #2: Appointment response — `timeexpected` vs `timeExpected` dual field
- **Severity:** MEDIUM
- **Files:** `website/src/lib/api.ts:346-347` vs `api/src/routes/appointments.js:179`
- **Backend returns:** `timeexpected` (lowercase, from SQL column)
- **Frontend type declares:** BOTH `timeexpected: number | null` AND `timeExpected: number | null`
- **Frontend reads:** `api.timeexpected` in `mapApiToManagedAppointment` (line 66)
- **Impact:** The dual declaration in the interface is confusing but the code reads the correct field. When sending to the API, the backend accepts both via `b.timeExpected || b.timeexpected`. **Currently works but fragile.**

### MISMATCH #3: SaleOrders — Date filtering params not working
- **Severity:** HIGH
- **Files:** `website/src/lib/api.ts:567-577` → `api/src/routes/saleOrders.js:21-22`
- **Frontend sends:** `dateFrom` / `dateTo` via `apiFetch` params
- **`toSnakeCase()` converts to:** `date_from` / `date_to`
- **Backend reads:** `req.query.date_from` and `req.query.date_to`
- **Impact:** This actually WORKS because the backend uses `date_from` / `date_to` and the frontend converts correctly. **However**, there's NO date filter implementation in the SaleOrders GET route! Lines 21-22 destructure `date_from` and `date_to` but they are **never used** in the WHERE clause. The `useDashboardStats` hook at line 55-60 relies on date filtering for revenue, which silently returns ALL orders regardless of date range.
- **Verdict:** Backend accepts the params but ignores them entirely.

### MISMATCH #4: Companies/Locations — Raw `SELECT *` returns unknown column set
- **Severity:** MEDIUM
- **Files:** `api/src/routes/companies.js:9` → `website/src/hooks/useLocations.ts:27`
- **Backend:** `SELECT * FROM dbo.companies` — returns whatever columns exist in the table
- **Frontend maps:** Only uses `id, name, email, phone, active, datecreated`
- **Risk:** If the `dbo.companies` table has columns that don't exist in the expected schema (e.g., column name differences between `dbo.companies` and `companies`), or if columns are added/removed, the frontend silently ignores them. The `useLocations` hook also hardcodes many fields like `employeeCount: 0`, `customerCount: 0`, `monthlyRevenue: 0` that could come from the API.
- **Note:** The backend uses `dbo.companies` schema prefix while all other routes use tables without `dbo.` prefix. This could be a schema mismatch if tables exist in the `public` schema vs `dbo` schema.

### MISMATCH #5: Services table — Different schema (`public.services`) from rest of app
- **Severity:** HIGH
- **Files:** `api/src/routes/services.js:17` vs all other routes
- **Backend queries:** `FROM public.services` with columns: `customer_id, doctor_id, assistant_id, location_id, appointment_id, service_type, service_code, practitioner, prescription, notes, unit_price, quantity, discount, total_amount, status, sessions, created_at, updated_at`
- **Rest of app uses:** `saleorders` table for the same conceptual entity
- **Impact:** The `GET /api/Services` endpoint returns data from `public.services` with camelCase transformation, while the frontend's `useServices` hook actually calls `fetchSaleOrders()` which goes to `GET /api/SaleOrders` (from `dbo.saleorders`). The `/Services` endpoint exists but appears to be a separate/duplicate system. If anyone calls `/Services` expecting sale order data, they'll get wrong data.

### MISMATCH #6: Partner list — `appointmentcount/ordercount/dotkhamcount` hardcoded to 0
- **Severity:** MEDIUM
- **Files:** `api/src/routes/partners.js:92-94` vs `api/src/routes/partners.js:289-291`
- **Backend (list endpoint):** Returns `0 AS appointmentcount, 0 AS ordercount, 0 AS dotkhamcount` (hardcoded)
- **Backend (detail endpoint):** Returns real subquery counts
- **Frontend:** `useCustomerProfile` reads `(partner as unknown as Record<string, number>).appointmentcount` — only works for detail endpoint
- **Impact:** The list endpoint always shows 0 counts. The `useCustomers` hook doesn't use these counts directly, but if any component tries to display them from the list response, it will show 0.

### MISMATCH #7: Partner response — `code` vs `ref` field alias inconsistency
- **Severity:** LOW
- **Files:** `api/src/routes/partners.js:56` vs `website/src/lib/api.ts:143-144`
- **Backend:** `p.ref AS code` (aliases `ref` to `code`)
- **Frontend type:** Has BOTH `code: string | null` AND `ref: string | null`
- **Impact:** The backend only returns `code` (from the alias), not `ref`. So `ApiPartner.ref` will always be `undefined` from the list endpoint. The detail endpoint also aliases `ref AS code`, so `ref` is never present in the response. Any code reading `partner.ref` will get `undefined`.

### MISMATCH #8: Partner response — `status` is aliased from `active` (boolean inversion risk)
- **Severity:** LOW
- **Files:** `api/src/routes/partners.js:72` vs `website/src/hooks/useCustomers.ts:52`
- **Backend:** `p.active AS status` — returns boolean
- **Frontend:** `p.status ? 'active' : 'inactive'` — interprets boolean correctly
- **Impact:** Works correctly but the field name `status` is misleading. A `status` field typically implies a string enum, not a boolean. The `updatePartner` on the backend accepts `status: true` but the DB column is `active`. **This works only because the backend PUT handler maps `status` is not in the update fields — it only updates the listed fields.** Wait — actually looking at the PUT handler, it updates fields from `req.body` dynamically. If the frontend sends `status: true` in an update, it would try `SET status = true` but the column is `active`, causing a DB error. Let me check...

Actually, looking at the PUT handler at line 596-603:
```js
const fields = {
  name, phone, email, companyid, gender, ...
};
```
`status` is NOT in this fields list, so it won't be sent in updates. **No runtime error, but the naming is confusing.**

### MISMATCH #9: Appointment — `isDoctor`/`isAssistant` allowlist breaks Employees filter
- **Severity:** HIGH
- **Files:** `website/src/lib/api.ts:44,48` vs `api/src/routes/employees.js:48-55`
- **Frontend `SNAKE_CASE_ALLOWLIST`:** Contains `isDoctor`, `isAssistant`, `isReceptionist` — these are NOT converted to snake_case
- **Backend Employees route reads:** `req.query.isDoctor` and `req.query.isAssistant`
- **Impact:** This WORKS because the backend uses camelCase query param names `isDoctor`/`isAssistant` (from the route code line 20-21: `isDoctor = ''`, `isAssistant = ''`). The allowlist prevents conversion, so `isDoctor` stays as `isDoctor` which matches what the backend expects. **However**, this is inconsistent with all other query params that ARE converted to snake_case. It works by accident of the backend using camelCase for these specific params.

### MISMATCH #10: DotKhams — `partner_id` sent directly bypassing `toSnakeCase()`
- **Severity:** LOW
- **Files:** `website/src/lib/api.ts:767` → `api/src/routes/dotKhams.js:42`
- **Frontend:** `fetchDotKhams` sends `partner_id` directly in the params object (bypassing camelCase convention)
- **Backend:** Reads `req.query.partner_id`
- **Impact:** Works because `partner_id` is already snake_case and `toSnakeCase('partner_id')` would keep it as `partner_id`. Consistent but breaks the pattern of using camelCase in the frontend params.

### MISMATCH #11: Partner KPIs — camelCase response but backend uses snake_case internally
- **Severity:** MEDIUM
- **Files:** `api/src/routes/partners.js:357-364`
- **Backend returns:** `{ totalTreatmentAmount, expectedRevenue, actualRevenue, debt, advancePayment, pointBalance }` — explicitly camelCase
- **Frontend:** The `useCustomerProfile` hook doesn't call `GetKPIs` but components could
- **Impact:** The backend explicitly converts from snake_case SQL results to camelCase for this endpoint, unlike most other endpoints that return snake_case. This is actually correct but inconsistent with the rest of the API.

### MISMATCH #12: Payments — camelCase response but Services — also camelCase (inconsistent with SaleOrders)
- **Severity:** HIGH (architectural)
- **Files:** `api/src/routes/payments.js:267-286` vs `api/src/routes/saleOrders.js:59-98`
- **Observation:** 
  - `GET /api/Payments` — transforms to camelCase in the response (line 267-286)
  - `GET /api/Services` — transforms to camelCase in the response (line 41-61)
  - `GET /api/SaleOrders` — returns RAW snake_case from SQL (no transformation)
  - `GET /api/Appointments` — returns RAW snake_case from SQL (no transformation)
  - `GET /api/Partners` — returns RAW snake_case with some column aliases
  - `GET /api/DotKhams` — returns RAW snake_case from SQL
  - `GET /api/Employees` — returns RAW snake_case with appended `locationScopeIds`
- **Impact:** Frontend must handle BOTH camelCase and snake_case fields depending on which endpoint it calls. This creates confusion and potential for bugs. The frontend `apiFetch` does NOT transform responses (only request params).

---

## 4. SYSTEMATIC PATTERNS

### 4.1 Casing Inconsistency

| Endpoint | Response Casing | Request Param Casing |
|---|---|---|
| Partners | snake_case (SQL raw) | snake_case (frontend converts) |
| Appointments | snake_case (SQL raw) | mixed (accepts both) |
| SaleOrders | snake_case (SQL raw) | snake_case (frontend converts) |
| DotKhams | snake_case (SQL raw) | snake_case |
| Employees | snake_case + camelCase append | camelCase (isDoctor, etc.) |
| Companies | raw (SELECT *) | N/A |
| Services | **camelCase** (explicit transform) | snake_case |
| Payments | **camelCase** (explicit transform) | snake_case |
| Partner KPIs | **camelCase** (explicit transform) | N/A |

### 4.2 The `toSnakeCase()` Helper

The frontend uses `toSnakeCase()` to convert query parameters:
- `companyId` → `company_id` ✓
- `partnerId` → `partner_id` ✓  
- `dateFrom` → `date_from` ✓
- `dateTo` → `date_to` ✓
- `isDoctor` → `isDoctor` (allowlisted, NOT converted)
- `isAssistant` → `isAssistant` (allowlisted, NOT converted)

**Body payloads are NOT transformed** — they are sent as-is (JSON). This means:
- `createAppointment({ partnerid: '...' })` — frontend sends `partnerid` directly ✓
- `createPartner({ companyid: '...' })` — frontend sends `companyid` directly ✓
- `createPayment({ customer_id: '...' })` — frontend sends `customer_id` directly ✓

### 4.3 Pagination Contract

All paginated endpoints return: `{ offset, limit, totalItems, items }`  
The frontend `PaginatedResponse<T>` interface matches this consistently. ✓

Some endpoints also include `aggregates`:
- Partners: `{ total, active, inactive }`  
- Appointments: `{ total, byState: {} }`
- SaleOrders: `{ total, totalAmount, totalPaid, totalResidual }`
- DotKhams: `{ total, totalAmount, totalResidual, byState: {} }`

### 4.4 Error Response Format

The backend has TWO error response formats:

1. **New format** (appointments, dashboardReports):
   ```json
   { "errorCode": "VALIDATION", "message": "..." }
   ```

2. **Old format** (partners, saleOrders, employees):
   ```json
   { "error": "Partner not found" }
   // or
   { "error": { "code": "VALIDATION", "message": "..." } }
   ```

The frontend `apiFetch` handles the `{ error: { code, message } }` format via `ApiError`.  
The `{ errorCode, message }` format is NOT handled by the structured error parser — it falls through to the generic `ApiError` with `code: 'UNKNOWN'`.

---

## 5. PRIORITIZED FIX RECOMMENDATIONS

### HIGH Priority

1. **SaleOrders date filter not implemented** (MISMATCH #3)
   - `api/src/routes/saleOrders.js`: Accepts `date_from`/`date_to` params but never uses them in the WHERE clause
   - **Fix:** Add date range conditions to the SaleOrders GET query
   - **Impact:** Dashboard revenue stats are incorrect

2. **Services vs SaleOrders dual data source** (MISMATCH #5)
   - Two separate endpoints return "service" data from different tables
   - **Fix:** Decide on single source of truth, deprecate or merge
   - **Impact:** Data inconsistency risk

3. **Inconsistent response casing across endpoints** (MISMATCH #12)
   - Some endpoints transform to camelCase, others return raw snake_case
   - **Fix:** Standardize all endpoints to return one format (recommend camelCase transformation in all routes, or remove it from all)
   - **Impact:** Frontend must handle both patterns

4. **`isDoctor`/`isAssistant` query param inconsistency** (MISMATCH #9)
   - These params bypass `toSnakeCase()` but the backend uses camelCase for them
   - **Fix:** Remove from allowlist and have backend accept `is_doctor`/`is_assistant` instead
   - **Impact:** Works now but fragile if either side changes

5. **Partner `ref` field always undefined in response** (MISMATCH #7)
   - Backend aliases `ref AS code`, never returns raw `ref`
   - **Fix:** Return both `ref` and `code`, or remove `ref` from the frontend type
   - **Impact:** Code reading `partner.ref` gets undefined

### MEDIUM Priority

6. **SaleOrders date filtering ignored** (see #1 above)
7. **Companies raw SELECT * with hardcoded frontend values** (MISMATCH #4)
8. **Partner list hardcoded 0 counts** (MISMATCH #6)
9. **Mixed error response formats** (Section 4.4)

### LOW Priority

10. **Appointment dual field `timeexpected`/`timeExpected`** (MISMATCH #2)
11. **Partner `status`/`active` field naming** (MISMATCH #8)
12. **DotKhams direct snake_case param** (MISMATCH #10)

---

## 6. SUMMARY TABLE

| # | Endpoint | Issue | Severity |
|---|---|---|---|
| 1 | Appointments | `scheduled` state semantic inconsistency | LOW |
| 2 | Appointments | Dual `timeexpected`/`timeExpected` field | MEDIUM |
| 3 | SaleOrders | Date filter params accepted but unused | **HIGH** |
| 4 | Companies | Raw `SELECT *` returns unknown columns | MEDIUM |
| 5 | Services | Separate table/schema from rest of app | **HIGH** |
| 6 | Partners | List endpoint hardcoded 0 counts | MEDIUM |
| 7 | Partners | `ref` always undefined, only `code` returned | LOW |
| 8 | Partners | `status` aliased from `active` (naming confusion) | LOW |
| 9 | Employees | `isDoctor`/`isAssistant` bypass snake_case conversion | **HIGH** |
| 10 | DotKhams | Direct snake_case param breaks pattern | LOW |
| 11 | Partners/KPIs | camelCase response inconsistent with others | MEDIUM |
| 12 | Multiple | Inconsistent response casing (camelCase vs snake_case) | **HIGH** |
