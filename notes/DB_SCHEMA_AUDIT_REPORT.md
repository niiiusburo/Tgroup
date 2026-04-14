# Database Schema <-> Backend Queries Consistency Audit

**Date:** 2026-04-14
**Scope:** api/src/routes/*.js — all SQL queries cross-referenced against the known database schema

---

## Executive Summary

Found **27 issues** across 10 files. The most critical pattern is a **systematic column naming mismatch**: the code uses `partnerid`, `companyid`, `doctorid` (no underscores) and `state`/`datecreated`/`lastupdated` throughout, while the known schema defines `partner_id`, `company_id`, `doctor_id` (with underscores), `status`, `created_at`, `updated_at` for appointments, saleorders, customerreceipts, and services. Additionally, `services.js` references a completely different schema than what is documented. The `employees` table is queried but does not exist in the known schema.

---

## ISSUE 1 — CRITICAL: appointments table uses `companyid` (code) but schema says `company_id`

**Files:** api/src/routes/appointments.js (lines 131, 189, 220, 303, 440, 462, 471, 612)
**Code:**
```sql
-- Line 131 (WHERE filter)
a.companyid = $${paramIdx}

-- Line 189 (SELECT)
a.companyid

-- Line 220 (JOIN)
LEFT JOIN companies c ON c.id = a.companyid

-- Line 440 (INSERT)
INSERT INTO appointments (..., companyid, ...)
```
**What's wrong:** The known schema says `appointments.company_id` (with underscore). The IMPORTANT note confirms: "The appointments table uses 'company_id' (with underscore)." But the code uses `companyid` (no underscore) everywhere.
**What it should be:** All references to `a.companyid` should be `a.company_id`. All INSERT columns `companyid` should be `company_id`.
**Severity:** CRITICAL — Every appointment query with a company filter silently returns 0 results. INSERT would fail on column not found.

---

## ISSUE 2 — CRITICAL: appointments table uses `partnerid` but schema says `partner_id`

**File:** api/src/routes/appointments.js (lines 116, 162, 184, 219, 289, 440, 458, 608)
**Code:**
```sql
a.partnerid = $${paramIdx}   -- line 116
a.partnerid                   -- line 184 (SELECT)
LEFT JOIN partners p ON p.id = a.partnerid   -- line 219
INSERT INTO appointments (..., partnerid, ...)   -- line 440
```
**What's wrong:** Known schema defines `appointments.partner_id` (with underscore). Code uses `partnerid`.
**What it should be:** `a.partner_id`, `partner_id` in INSERT.
**Severity:** CRITICAL — Appointment listing by partner returns nothing. Creating appointments fails.

---

## ISSUE 3 — CRITICAL: appointments table uses `doctorid` but schema says `doctor_id`

**File:** api/src/routes/appointments.js (lines 140, 193, 222, 440, 553, 614)
**Code:**
```sql
a.doctorid = $${paramIdx}     -- line 140
a.doctorid                     -- line 193
LEFT JOIN employees doc ON doc.id = a.doctorid   -- line 222
INSERT INTO appointments (..., doctorid, ...)    -- line 440
```
**What's wrong:** Known schema defines `appointments.doctor_id` (with underscore).
**What it should be:** `a.doctor_id`, `doctor_id` in INSERT.
**Severity:** CRITICAL — Filtering appointments by doctor silently returns 0 results.

---

## ISSUE 4 — HIGH: appointments table uses `state` but schema says `status`

**File:** api/src/routes/appointments.js (lines 98, 122, 181, 244-252, 563-567)
**Code:**
```sql
a.state = $${paramIdx}    -- line 122
SELECT a.state, COUNT(*)  -- line 245
```
**Also in:** api/src/routes/reports.js (lines 57-58, 228, 236-237, 267-269, 295-296)
```sql
SUM(CASE WHEN state='done' THEN 1 ELSE 0 END) as done   -- line 57
```
**What's wrong:** Known schema says `appointments.status`. Code uses `state`.
**What it should be:** All `a.state` → `a.status`.
**Severity:** HIGH — All status-based filtering and aggregation returns wrong data.

---

## ISSUE 5 — HIGH: appointments table uses `date` but schema says `appointment_date`

**File:** api/src/routes/appointments.js (lines 98, 146, 149, 175, etc.), api/src/routes/reports.js (lines 54, 266, 274, 292)
**Code:**
```sql
a.date >= $${paramIdx}     -- line 146
ORDER BY a.date             -- line 98
DATE_TRUNC('week', date)    -- reports.js line 266
```
**What's wrong:** Known schema column is `appointment_date`. Code uses `date`.
**What it should be:** `a.appointment_date`.
**Severity:** HIGH — Date-based queries return wrong results or fail.

---

## ISSUE 6 — HIGH: appointments table uses `note` but schema says `notes`

**File:** api/src/routes/appointments.js (lines 162, 180, 440, 558)
**Code:**
```sql
a.note ILIKE $${paramIdx}    -- line 162
a.note                        -- line 180 (SELECT)
INSERT INTO appointments (..., note, ...)   -- line 440
```
**What's wrong:** Known schema column is `notes` (plural). Code uses `note` (singular).
**What it should be:** `a.notes`.
**Severity:** HIGH — Note search returns nothing. INSERT fails.

---

## ISSUE 7 — HIGH: appointments table uses `datecreated`/`lastupdated` but schema says `created_at`/`updated_at`

**File:** api/src/routes/appointments.js (lines 102, 215, 216, 441, 586)
**Code:**
```sql
a.datecreated   -- line 215
a.lastupdated   -- line 216
datecreated, lastupdated   -- line 441 (INSERT)
lastupdated = NOW()         -- line 586 (UPDATE)
```
**What's wrong:** Known schema uses `created_at`/`updated_at` (with underscores). Code uses `datecreated`/`lastupdated`.
**Severity:** HIGH — Timestamp data not returned. INSERT fails.

---

## ISSUE 8 — CRITICAL: saleorders table uses `partnerid`/`companyid` but schema says `partner_id`/`company_id`

**File:** api/src/routes/saleOrders.js (lines 44, 64, 71, 89-90, 259, 488-489), api/src/routes/partners.js (lines 289-290, 688), api/src/routes/reports.js (multiple), api/src/routes/payments.js (lines 47, 616), api/src/routes/customerBalance.js (line 44)
**Code:**
```sql
so.partnerid = $${paramIdx}   -- saleOrders.js line 44
so.companyid                   -- line 71
LEFT JOIN companies c ON c.id = so.companyid   -- line 90
so.partnerid=p.id             -- reports.js line 344
```
**What's wrong:** Known schema for saleorders: `partner_id`, `company_id` (with underscores). Code uses `partnerid`, `companyid` everywhere.
**What it should be:** `so.partner_id`, `so.company_id`.
**Severity:** CRITICAL — Sale order listing, filtering by partner/company, and JOINs silently fail.

---

## ISSUE 9 — HIGH: saleorders table uses `state` but schema says `status`

**File:** api/src/routes/saleOrders.js (lines 33, 371, 385), api/src/routes/reports.js (lines 51, 74, 91, 120, 189, 211, 442)
**Code:**
```sql
so.state    -- everywhere
state='sale'   -- reports.js line 51
```
**What's wrong:** Known schema column is `status`. Code uses `state`.
**Severity:** HIGH — All status filtering and reporting is wrong.

---

## ISSUE 10 — HIGH: saleorders table uses `amounttotal` but schema says `total_amount`

**File:** api/src/routes/saleOrders.js (lines 67, 108, 236, 276, 474, 495), api/src/routes/reports.js (multiple)
**Code:**
```sql
so.amounttotal   -- line 67
SUM(amounttotal) -- reports.js line 48
```
**What's wrong:** Known schema says `total_amount`. Code uses `amounttotal`.
**Severity:** HIGH — Revenue amounts are wrong or query fails.

---

## ISSUE 11 — HIGH: saleorders uses `datecreated` but schema says `created_at`

**File:** api/src/routes/saleOrders.js (lines 31, 86, 262, 335), api/src/routes/reports.js (multiple)
**Code:**
```sql
so.datecreated   -- line 86
DATE_TRUNC('month', datecreated)  -- reports.js line 88
```
**What's wrong:** Known schema uses `created_at`. Code uses `datecreated`.
**Severity:** HIGH — Date-based sorting and reporting returns wrong data.

---

## ISSUE 12 — HIGH: saleorders uses `order_date` in schema but code uses `datecreated` for ordering

**File:** api/src/routes/saleOrders.js, api/src/routes/reports.js
**What's wrong:** The known schema has `order_date` for when the order was placed. The code uses `datecreated` as a proxy. If both exist, they may differ semantically.
**Severity:** MEDIUM — May cause incorrect date-based reporting.

---

## ISSUE 13 — CRITICAL: customerreceipts table uses `partnerid`/`companyid` but schema says `partner_id`/`company_id`

**File:** api/src/routes/customerReceipts.js (lines 42, 69-73, 86-87, 158-162, 173-174), api/src/routes/receipts.js (lines 46, 93-98, 112-113)
**Code:**
```sql
cr.partnerid = $${paramIdx}   -- line 42
cr.companyid                   -- line 73
LEFT JOIN companies c ON c.id = cr.companyid   -- line 87
```
**What's wrong:** Known schema defines `partner_id`, `company_id` (with underscores). Code uses `partnerid`, `companyid`.
**Severity:** CRITICAL — All receipt filtering and joins fail silently.

---

## ISSUE 14 — HIGH: customerreceipts uses `datewaiting`/`dateexamination` but schema says `receipt_date`

**File:** api/src/routes/customerReceipts.js (lines 27-28, 60-62, 150-151, 186-187)
**Code:**
```sql
cr.datewaiting     -- line 60
cr.dateexamination  -- line 28, 62
```
**What's wrong:** Known schema has `receipt_date`. Code uses `datewaiting` and `dateexamination` which aren't in the known schema. The known `receipt_date` is never used.
**Severity:** HIGH — Date-based queries target wrong columns.

---

## ISSUE 15 — HIGH: customerreceipts uses `state` but schema says nothing equivalent; known has `amount`/`payment_method` unused

**File:** api/src/routes/customerReceipts.js (lines 29, 65, 108, 154)
**Code:**
```sql
cr.state   -- line 65
GROUP BY cr.state   -- line 111
```
**What's wrong:** Known schema has `amount` and `payment_method` but no `state` column. Code never reads `amount` or `payment_method`.
**Severity:** HIGH — State-based filtering fails. Financial amounts never displayed.

---

## ISSUE 16 — CRITICAL: services.js uses completely wrong schema

**File:** api/src/routes/services.js (lines 11-19, 89-93)
**Code (SELECT):**
```sql
SELECT s.id, s.customer_id, s.doctor_id, s.assistant_id, s.location_id,
       s.appointment_id, s.service_type, s.service_code, s.practitioner,
       s.prescription, s.notes, s.unit_price, s.quantity, s.discount,
       s.total_amount, s.status, s.sessions, s.created_at, s.updated_at
FROM public.services s
```
**Code (INSERT):**
```sql
INSERT INTO public.services (customer_id, service_type, unit_price, quantity,
  discount, doctor_id, notes, status, total_amount)
```
**Known schema:** id, name, description, price, duration, category, status, created_at, updated_at

**What's wrong:** The code assumes columns: customer_id, doctor_id, assistant_id, location_id, appointment_id, service_type, service_code, practitioner, prescription, notes, unit_price, quantity, discount, total_amount, sessions. Of the known columns, only `id`, `status`, `created_at`, `updated_at` overlap. The code does NOT use: `name`, `description`, `price` (uses `unit_price`), `duration`, `category` (uses `service_type`).
**What it should be:** The services table should either be redefined to match the code, or the code should be rewritten to use: name, description, price, duration, category.
**Severity:** CRITICAL — The entire services CRUD is broken. SELECT returns errors for non-existent columns. INSERT fails.

---

## ISSUE 17 — CRITICAL: `employees` table queried but not in known schema

**File:** api/src/routes/employees.js (lines 68-97, 145-181), api/src/routes/appointments.js (lines 222, 336, 472, 621), api/src/routes/saleOrderLines.js (lines 120-122), api/src/routes/receipts.js (lines 100, 114, 201, 215)
**Code:**
```sql
FROM employees e              -- employees.js line 90
LEFT JOIN companies c ON c.id = e.companyid   -- line 91
LEFT JOIN hrjobs j ON j.id = e.hrjobid        -- line 92
LEFT JOIN employees doc ON doc.id = a.doctorid  -- appointments.js line 222
LEFT JOIN employees e ON e.id = cr.doctorid     -- receipts.js line 114
```
**What's wrong:** The known schema has NO `employees` table. The employees.js GET routes query `FROM employees` but the POST route (line 243) inserts into `partners` table. This implies either: (a) there's a separate `employees` table not listed in known schema, or (b) employees live in `partners` table with `employee=true` flag. If (b), then ALL `FROM employees` queries are broken.
**Severity:** CRITICAL — If no `employees` table exists, employee listing, doctor dropdowns, and sale order line employee names all fail.

---

## ISSUE 18 — MEDIUM: partners `last_login` column written but not in known schema

**File:** api/src/routes/auth.js (line 101)
**Code:**
```sql
UPDATE partners SET last_login = NOW() WHERE id = $1
```
**What's wrong:** `last_login` is not listed in the known partners schema. If the column doesn't exist, this UPDATE fails silently (inside try/catch), and login tracking is lost.
**Severity:** MEDIUM — Non-critical tracking feature; silently caught by error handler.

---

## ISSUE 19 — MEDIUM: partners table — code references many columns not in known schema

**File:** api/src/routes/partners.js, api/src/routes/employees.js, various reports
**Columns used but not in known schema:**
- `displayname` (partners.js lines 57, 71)
- `ref` (partners.js lines 56, 86)
- `namenosign` (partners.js line 45)
- `cityname`, `districtname`, `wardname` (partners.js lines 62-64)
- `gender`, `birthyear`, `birthmonth`, `birthday` (partners.js lines 66-68)
- `medicalhistory` (partners.js line 69)
- `comment`, `note` (partners.js lines 70-71)
- `treatmentstatus` (partners.js lines 73, 83)
- `sourceid` (partners.js line 74)
- `isdeleted` (partners.js line 39, 298)
- `avatar` (partners.js line 85)
- `zaloid` (partners.js line 86)
- `iscompany`, `ishead` (partners.js line 265-266)
- `isbusinessinvoice` (partners.js line 267)
- And many more...

**What's wrong:** These columns are heavily used in SELECT, WHERE, and INSERT statements but aren't in the known schema. Either the actual DB has them (most likely), or massive portions of the app are broken.
**Severity:** MEDIUM — Most likely these columns exist in the actual database but aren't listed in the simplified known schema.

---

## ISSUE 20 — HIGH: `dbo.appointments` column `service_id` never used in code

**File:** api/src/routes/appointments.js
**What's wrong:** The known schema has `service_id` in appointments. The code never reads or writes this column. If the frontend expects service data from appointments, it won't get it.
**Severity:** MEDIUM — Missing data in API responses.

---

## ISSUE 21 — HIGH: reports.js queries `dbo.appointments` with wrong column names

**File:** api/src/routes/reports.js (lines 54-59, 226-243, 264-270, 292-302)
**Code:**
```sql
-- Line 54-58: Uses a.date, a.state
SELECT COUNT(*) as total,
       SUM(CASE WHEN state='done' THEN 1 ELSE 0 END) as done,
       SUM(CASE WHEN state='cancel' OR state='cancelled' THEN 1 ELSE 0 END) as cancelled
FROM dbo.appointments WHERE 1=1

-- Line 236: Uses saleorderid (not in known schema)
SUM(CASE WHEN saleorderid IS NOT NULL THEN 1 ELSE 0 END) as converted

-- Line 243: Uses partnerid
SELECT partnerid, COUNT(*) as cnt FROM dbo.appointments
```
**What's wrong:** Uses `state` (should be `status`), `date` (should be `appointment_date`), `partnerid` (should be `partner_id`), `saleorderid` (not in known schema). All date and state-based appointment reports return wrong data.
**Severity:** HIGH — All appointment-related dashboard reports are incorrect.

---

## ISSUE 22 — MEDIUM: reports.js uses `dbo.customersources` table — not in known schema

**File:** api/src/routes/reports.js (line 328)
**Code:**
```sql
SELECT cs.name, COUNT(p.id) as cnt FROM dbo.customersources cs
LEFT JOIN dbo.partners p ON p.sourceid=cs.id
```
**What's wrong:** `customersources` table is not in the known schema. If it doesn't exist, customer source reporting fails.
**Severity:** MEDIUM — Non-critical reporting feature.

---

## ISSUE 23 — HIGH: `appointments` uses `duration` in known schema but code uses `timeexpected`

**File:** api/src/routes/appointments.js (lines 101, 179, 374, 440, 569-570)
**Code:**
```sql
a.timeexpected   -- line 101, 179
INSERT INTO appointments (..., timeexpected, ...)   -- line 440
```
**What's wrong:** Known schema has `duration`. Code uses `timeexpected`. These are semantically similar but syntactically different column names.
**Severity:** HIGH — Duration data is not read/written correctly.

---

## ISSUE 24 — MEDIUM: partners hard-delete checks `payments.customer_id` (with underscore)

**File:** api/src/routes/partners.js (line 690)
**Code:**
```sql
SELECT COUNT(*) AS count FROM payments WHERE customer_id = $1
```
**What's wrong:** This uses `customer_id` with underscore, consistent with the `payments` table schema (which is a newer table likely created with underscore convention). No mismatch here, but it's inconsistent with the `partnerid` convention used elsewhere.
**Severity:** LOW — Works correctly for the payments table.

---

## ISSUE 25 — MEDIUM: reports.js uses `dbo.partners.isdeleted` but not in known schema

**File:** api/src/routes/reports.js (lines 64, 190, 301, 319, 333-334, 338, 392, 399, 407)
**Code:**
```sql
p.isdeleted=false   -- used extensively
```
**What's wrong:** `isdeleted` is not in the known partners schema. If it doesn't exist, reports include soft-deleted records, inflating counts.
**Severity:** MEDIUM — Could inflate customer/employee counts in reports.

---

## ISSUE 26 — MEDIUM: `saleorderlines` references `employees` table

**File:** api/src/routes/saleOrderLines.js (lines 120-122)
**Code:**
```sql
LEFT JOIN employees e ON e.id = sol.employeeid
LEFT JOIN employees a ON a.id = sol.assistantid
LEFT JOIN employees c ON c.id = sol.counselorid
```
**What's wrong:** Joins to `employees` table which may not exist (see Issue 17).
**Severity:** MEDIUM — Employee names in sale order lines return NULL.

---

## ISSUE 27 — HIGH: `customerreceipts` known schema columns `amount`, `payment_method` never used

**File:** api/src/routes/customerReceipts.js, api/src/routes/receipts.js
**What's wrong:** The known schema defines `amount` and `payment_method` for customerreceipts. The code never reads or writes these columns. Financial receipt data is completely missing from the API.
**Severity:** HIGH — Receipt amounts and payment methods are never surfaced.

---

## Summary by Severity

| Severity | Count | Key Issues |
|----------|-------|------------|
| CRITICAL | 6 | appointments column names (companyid/partnerid/doctorid), saleorders column names, customerreceipts column names, services.js wrong schema, employees table missing |
| HIGH | 10 | status vs state, date vs appointment_date, note vs notes, created_at vs datecreated, reports wrong columns |
| MEDIUM | 8 | Extra columns not in schema, missing tables, unused schema columns |
| LOW | 1 | Naming convention inconsistency |

## Root Cause Analysis

The primary root cause is a **naming convention mismatch** between the known database schema and the code:

1. **Underscore vs no-underscore:** The code consistently uses `partnerid`, `companyid`, `doctorid` (camelCase/no separator), while the known schema uses `partner_id`, `company_id`, `doctor_id` (snake_case with underscores) for appointments, saleorders, and customerreceipts. Only `partners.companyid` matches.

2. **status vs state:** The code uses `state` for appointment/saleorder status, while the schema uses `status`.

3. **Timestamp columns:** The code uses `datecreated`/`lastupdated`, while the schema uses `created_at`/`updated_at` for appointments, saleorders, customerreceipts, and services.

4. **services.js:** This file was written against a completely different schema definition — it treats services as per-customer treatment records rather than a service catalog.

## Recommended Fixes (Priority Order)

1. **Verify actual database schema** — Run `\d tablename` in psql for each of the 6 tables to confirm actual column names before making changes.
2. **If schema is correct:** Update all appointment/saleorder/customerreceipt queries to use underscore column names (`partner_id`, `company_id`, etc.), `status` instead of `state`, and `created_at`/`updated_at`.
3. **Rewrite services.js** to match the actual services table schema.
4. **Clarify employees table** — Either add it to the known schema or update all `FROM employees` queries to use `FROM partners WHERE employee=true`.
