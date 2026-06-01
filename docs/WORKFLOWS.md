# TGroup Clinic — Workflows

> End-to-end business workflows as mermaid sequence diagrams. Actor, system, external services, and data state transitions shown.

## Traceability Convention

Every new or materially edited workflow should include one compact traceability line after the diagram or state-transition block: related UC IDs, current contracts/routes, data/tables, invariants, tests, and product-map domains. Prefer the current route method from `product-map/contracts/api-index.md`; use `unknown` instead of guessing.

---

## WF-001 — Login with Remember Me

**Trigger:** User submits `/login` form.
**Why it matters:** Authentication is the root of access control. Remember Me extends JWT lifetime from 24h to 60d.

```mermaid
sequenceDiagram
    actor U as Staff
    participant FE as React (website/)
    participant API as Express API
    participant DB as Postgres (dbo)

    U->>FE: Enter email, password, check "Remember Me"
    FE->>API: POST /api/Auth/login { email, password, rememberMe }
    API->>DB: SELECT FROM partners WHERE email=$1 AND employee=true AND isdeleted=false AND active=true
    DB-->>API: Employee row (id, password_hash, companyId, ...)
    API->>API: bcrypt.compare(password, password_hash)
    alt Password matches
        API->>DB: UPDATE partners SET last_login=NOW()
        DB-->>API: ✓
        API->>DB: Query tier_id + permission_overrides
        DB-->>API: groupId, groupName, effectivePermissions[]
        API->>DB: Query employee_location_scope
        DB-->>API: locations[] (id, name)
        API->>API: Cap visible lob_scope to one LOB unless group is Admin
        API->>API: JWT.sign(payload, JWT_SECRET, expiresIn: rememberMe ? '60d' : '24h')
        API-->>FE: { token, user, permissions, locations }
        FE->>FE: localStorage.setItem('tgclinic_token', token)
        FE->>FE: AuthContext.dispatch('set-auth')
        FE-->>U: ✓ Redirect to /overview
    else Password mismatch
        API-->>FE: 401 { error: 'Invalid email or password' }
        FE-->>U: ✗ Error toast
    end
```

**Data state transitions:**
- `partners.last_login` → current timestamp.
- `user.lob_scope` / JWT `lob_scope` → multiple LOBs only for Admin; non-admin staff get one visible scoped LOB.
- `localStorage.tgclinic_token` → new JWT string.
- `AuthContext` → populated with user, permissions, locations.

**Invariants:** INV-007, INV-008, INV-008A.
**Failure modes:**
- `tier_id` NULL → empty permissions (INC-20260506-01).
- `JWT_SECRET` missing → API exits FATAL before listening.
- Token expiry after 60d → 401 on next request; user re-logins.

---

## WF-002 — Create Appointment

**Trigger:** Reception staff clicks "Hẹn mới" on Overview or Calendar.

```mermaid
sequenceDiagram
    actor R as Reception
    participant FE as React (Calendar/Overview)
    participant API as Express API
    participant DB as Postgres (dbo)

    R->>FE: Click "Hẹn mới"
    FE->>FE: Open modal, defaults from LocationContext
    R->>FE: Select customer, doctor, date, time, optional service
    FE->>FE: Validate required fields (date, partnerId, companyId)
    FE->>API: POST /api/Appointments { date, partnerId, companyId, doctorId, ... }
    API->>API: Validate date ISO 8601, UUIDs, state in VALID_STATES, timeExpected in [1..480]
    API->>DB: SELECT id FROM partners WHERE id=$1
    DB-->>API: Row or NULL
    API->>DB: SELECT id FROM companies WHERE id=$1
    DB-->>API: Row or NULL
    alt Any FK missing
        API-->>FE: 400 { error: 'Foreign key not found' }
        FE-->>R: ✗ Error toast
    else All FKs valid
        API->>DB: SELECT COALESCE(MAX(CAST(SUBSTRING(name FROM 3) AS INTEGER)), 0) + 1 FROM appointments WHERE name LIKE 'AP%'
        DB-->>API: Next sequence number
        API->>DB: INSERT INTO appointments { name='AP000002', date, partnerId, companyId, doctorId, state='confirmed', ... }
        DB-->>API: Inserted row
        API-->>FE: 201 { id, name, date, ... }
        FE->>FE: Add to calendar/list, close modal
        FE-->>R: ✓ Appointment created
    end
```

**Data state transitions:**
- New row in `dbo.appointments` with `state='confirmed'`.
- Calendar cache invalidated; next poll fetches new row.

**Invariants:** INV-002, INV-006.
**Failure modes:**
- Doctor UUID stale → 400 "Foreign key not found".
- Location filter bypassed → backend accepts any `companyId` (INV-009).

---

## WF-003 — Take Deposit and Allocate

**Trigger:** Customer profile → "Đặt cọc" button.

```mermaid
sequenceDiagram
    actor S as Cashier
    participant FE as React (CustomerProfile)
    participant API as Express API
    participant DB as Postgres (dbo)

    S->>FE: Click "Đặt cọc"
    FE->>FE: Open modal, show open sale orders (residual > 0)
    S->>FE: Enter amount, select allocation method
    FE->>API: POST /api/Payments { amount, method, deposit_type='deposit', customerId, allocations: [...] }
    API->>API: Classify deposit; validate allocation residual
    API->>DB: SELECT residual FROM saleorders WHERE id=$1 AND isdeleted=false
    DB-->>API: residual per invoice
    alt Allocated amount > residual + 0.01
        API-->>FE: 400 { error: 'Over-allocation to invoice X' }
        FE-->>S: ✗ Show error
    else Allocation valid
        API->>DB: BEGIN
        API->>DB: INSERT INTO payments { ...deposit_type='deposit', status='posted' }
        DB-->>API: payment row
        API->>DB: INSERT INTO payment_allocations { payment_id, invoice_id, allocated_amount }
        DB-->>API: allocation row
        API->>DB: UPDATE saleorders SET residual = GREATEST(0, residual - $amount)
        DB-->>API: ✓
        API->>DB: COMMIT
        API-->>FE: 201 { id, amount, allocations }
        FE->>FE: Refresh profile, close modal
        FE-->>S: ✓ Deposit allocated
    end
```

**Data state transitions:**
- New `payments` row with `payment_category='deposit'`.
- New `payment_allocations` rows.
- `saleorders.residual` reduced (never below 0).

**Invariants:** INV-003, INV-004, INV-010, INV-011, INV-012.
**Failure modes:**
- Stale residual (paid via other channel) → over-charge risk.
- Concurrent deposits → race condition on residual (no row lock currently).

---

## WF-004 — Complete Appointment + Commission

**Trigger:** Doctor marks appointment as "Hoàn thành" (Done).

```mermaid
sequenceDiagram
    actor D as Doctor
    participant FE as React (PatientCheckIn/Calendar)
    participant API as Express API
    participant DB as Postgres (dbo)

    D->>FE: Mark appointment "Done"
    FE->>API: PUT /api/Appointments/:id { state='done' }
    API->>DB: UPDATE appointments SET state='done', lastupdated=NOW()
    DB-->>API: ✓
    API->>DB: SELECT * FROM commissionproductrules WHERE productid IN (...)
    DB-->>API: Commission rules[]
    alt Commission rules exist
        API->>DB: INSERT INTO saleorderlinepartnercommissions { ... }
        DB-->>API: ✓
    else No commission rules
        API-->>API: Skip commission
    end
    API-->>FE: 200 { appointment, commissions }
    FE->>FE: Move card to "Done" column
    FE-->>D: ✓ Appointment completed
```

**Data state transitions:**
- `appointments.state` → `done`.
- `saleorderlinepartnercommissions` rows inserted (if rules match).

**Invariants:** None specific (commission auto-calculation trigger is unknown per `product-map/unknowns.md` #12).

---

## WF-005 — Generate Revenue Report Excel Export

**Trigger:** `/reports/revenue` → operational export menu.

```mermaid
sequenceDiagram
    actor M as Manager
    participant FE as React (/reports/revenue)
    participant API as Express API
    participant Builder as Export Builder
    participant DB as Postgres (dbo)
    participant Nginx as Nginx

    M->>FE: Select date range, location, doctor/employee filters
    M->>FE: Preview or download export
    alt Preview
        FE->>API: POST /api/Exports/revenue-flat/preview { filters }
        API->>Builder: legacyFlatReportsExport.revenue.preview(filters, user)
        Builder->>DB: Count + total using posted payment allocations
        DB-->>Builder: rowCount, totalAmount
        Builder-->>API: { rowCount, summary, exceedsMax }
        API->>DB: INSERT exports_audit action='preview' (best effort)
        API-->>FE: Preview summary
    else Download
        FE->>API: POST /api/Exports/revenue-flat/download { filters }
        API->>Builder: legacyFlatReportsExport.revenue.build(filters, user)
        Builder->>DB: Revenue-flat rows from payments/payment_allocations/saleorders
        DB-->>Builder: Result rows
        Builder->>Builder: Build TDental-style flat workbook
        Builder-->>API: workbook, filename, rowCount
        API-->>Nginx: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
        Nginx-->>FE: Stream response (timeout >=300s)
        FE->>FE: Trigger browser download
        API->>DB: INSERT exports_audit action='download' (best effort)
    end
    FE-->>M: Preview shown or download complete
```

**Data state transitions:**
- Optional `exports_audit` row with `export_type='revenue-flat'` and `action='preview'` or `action='download'`.
- Report data is read-only; revenue is recognized from posted payment allocations, not raw order totals.

**Traceability:** Related UCs: UC-013, UC-019. Contracts/routes: `POST /api/Reports/revenue/*`, `POST /api/Reports/cash-flow/summary`, `POST /api/Exports/:type/preview`, `POST /api/Exports/:type/download` with `revenue-flat` or `report-sales-employees`. Data/tables: `dbo.payment_allocations`, `dbo.payments`, `dbo.saleorders`, `dbo.saleorderlines`, `dbo.partners`, `dbo.companies`, `dbo.exports_audit`. Invariants: INV-019, INV-020. Tests: `api/src/routes/reports/__tests__/revenueRecognition.test.js`, `api/src/routes/reports/__tests__/cashFlow.test.js`, `api/src/routes/reports/__tests__/servicesBreakdown.test.js`, `api/src/services/reports/__tests__/canonicalRevenue.test.js`, `api/src/services/exports/__tests__/legacyFlatReportsExport.test.js`, `api/src/services/exports/__tests__/reportSalesEmployeesExport.test.js`, `website/src/hooks/__tests__/useReportData.test.ts`, `website/src/pages/reports/__tests__/ReportsSubpages.test.tsx`. Product-map domains: `reports-analytics`, `payments-deposits`, `employees-hr`.

**Failure modes:**
- Dataset too large → nginx 504 if timeout <300s.
- `EXPORT_ROW_LIMIT_EXCEEDED` → preview/download must surface row-limit guidance.
- Export audit insert failure is best effort and must not corrupt the workbook response.

---

## WF-006 — IP Access Gate

**Trigger:** Every non-`/api/IpAccess/*` API request after IP access middleware is mounted.

```mermaid
sequenceDiagram
    actor U as Staff
    participant FE as React
    participant Nginx as Nginx
    participant API as Express API
    participant DB as Postgres (dbo)

    U->>FE: Any API-backed action
    FE->>Nginx: Request to /api/... with Authorization when protected
    Nginx->>API: Proxy to /api/...
    API->>API: enforceIpAccess middleware
    alt Request path starts /IpAccess/
        API->>API: Skip IP gate to preserve admin recovery
    else Cache empty or stale
        API->>DB: SELECT mode FROM dbo.ip_access_settings LIMIT 1
        API->>DB: SELECT active rows FROM dbo.ip_access_entries
        DB-->>API: mode + active entries
    end
    API->>API: getClientIp from X-Forwarded-For, X-Real-IP, or socket
    alt mode allows client IP
        API->>API: Continue to auth/route permission checks
        API-->>FE: Normal route response
    else mode blocks client IP
        API-->>FE: 403 { error: reason }
        FE-->>U: Access-denied state
    end
```

**Data state transitions:** None during enforcement; settings changes through `/api/IpAccess/settings` and `/api/IpAccess/entries` invalidate the in-memory IP access cache.

**Traceability:** Related UC: UC-017. Contracts/routes: `GET /api/IpAccess/settings`, `PUT /api/IpAccess/settings`, `GET /api/IpAccess/entries`, `POST /api/IpAccess/entries`, `PUT /api/IpAccess/entries/:id`, `DELETE /api/IpAccess/entries/:id`, `GET /api/IpAccess/check`. Data/tables: `dbo.ip_access_settings`, `dbo.ip_access_entries`. Invariants: INV-008, INV-018. Tests: `website/src/__tests__/IpAccessControl.component.test.tsx`, `website/src/__tests__/ipAccessControl.types.test.ts`, `website/src/__tests__/ipValidation.edgecases.test.ts`, `website/e2e/login-and-settings.spec.ts`; backend middleware/route coverage is still a gap. Product-map domains: `settings-system`, `auth`.

**Failure modes:**
- DB read failure in the middleware fails open and logs the problem.
- Proxy/load balancer changes client IP → whitelist/blacklist may not match the intended address.
- `block_all` can lock staff out of non-management API routes; `/api/IpAccess/*` is intentionally skipped by the IP gate but still requires normal settings permissions.

## WF-007 — Face Recognition Check-In

**Trigger:** Patient stands in front of check-in camera.

```mermaid
sequenceDiagram
    actor P as Patient
    participant Cam as Browser Camera
    participant FE as React (PatientCheckIn)
    participant API as Express API
    participant FP as Face Provider (local or CompreFace)
    participant DB as Postgres (dbo)

    P->>Cam: Face visible
    Cam->>FE: Video stream
    FE->>FE: Capture frame
    FE->>API: POST /api/face/recognize { image }
    API->>FP: Forward image buffer
    alt local provider
        FP->>FP: YuNet detect + SFace embed (128-dim)
        API->>DB: SELECT partner_id, embedding FROM customer_face_embeddings
        DB-->>API: Candidates
        API->>API: cosine threshold + margin
    else CompreFace provider
        FP->>FP: Recognize against CompreFace subjects
        FP-->>API: subjects + similarity
        API->>DB: Map subject to partners.id / face_subject_id
        DB-->>API: Customer candidates
    end
    alt No face detected
        API-->>FE: 422 { error: "NO_FACE", message: "No face detected" }
        FE-->>P: Keep camera open + show "Không phát hiện khuôn mặt"
    else Match found
        API-->>FE: 200 { match: { partnerId, confidence }, candidates: [] }
        FE->>API: GET /api/Appointments?partnerId=...&date=today
        API-->>FE: Today's appointments[]
        FE-->>P: Display name + appointments
    else No match
        API-->>FE: 200 { match: null, candidates: [] }
        FE-->>P: "Không nhận diện được" + manual search
    end
```

**Data state transitions:** None (read-only recognition).
**Invariants:** INV-005 (local 128-dim embedding), INV-014 (optional Face ID provider).
**Failure modes:**
- Provider cannot detect a face → API returns `NO_FACE`; frontend keeps camera open until manual close.
- Configured Face ID provider down → fallback to manual check-in (UC-008).
- Embedding dimension mismatch → recognition accuracy degrades or crashes.

---

## WF-008 — TDental CSV Import (One-Time / Sync)

**Trigger:** Admin runs import script for legacy TDental data.

```mermaid
sequenceDiagram
    actor A as Admin
    participant Script as Node Script (api/scripts/)
    participant CSV as TDental Export CSV
    participant DB as Postgres (dbo)

    A->>Script: Run tdental-import script
    Script->>CSV: Read CSV rows
    Script->>Script: Map columns to TGClinic schema
    loop Each row
        Script->>DB: INSERT INTO partners { ...mapped fields... } ON CONFLICT DO NOTHING
        Script->>DB: INSERT INTO saleorders { ... }
        Script->>DB: INSERT INTO payments { ... }
        Script->>DB: INSERT INTO payment_allocations { ... } (relation-driven where possible)
    end
    Script->>Script: Validate totals (source vs imported)
    Script-->>A: Audit report (anomalies preserved)
```

**Data state transitions:**
- New rows in `partners`, `saleorders`, `saleorderlines`, `payments`, `payment_allocations`.
- Source anomalies preserved in audit output, not silently dropped.

**Invariants:** INV-003 (residual non-negative), INV-001 (UUID identity, not phone/ref).
**Failure modes:**
- Greedy remaining-balance allocation → incorrect residuals (must use relation-driven allocations).
- Duplicate refs/phones → UUID separates identities; do not merge blindly.

---

## WF-009 — Permission System Update (Admin)

**Trigger:** Admin edits permission group or employee assignment.

```mermaid
sequenceDiagram
    actor A as Admin
    participant FE as React (PermissionBoard)
    participant API as Express API
    participant DB as Postgres (dbo)

    A->>FE: Open /permissions
    FE->>API: GET /api/Permissions/groups
    API-->>FE: Groups + permissions[]
    FE->>API: GET /api/Permissions/employees
    API-->>FE: Employees + tier assignments
    A->>FE: Edit group permissions (add/remove strings)
    FE->>API: PUT /api/Permissions/groups/:groupId { permissions: [...] }
    API->>DB: DELETE FROM group_permissions WHERE group_id=$id
    API->>DB: INSERT INTO group_permissions (group_id, permission_string) VALUES ...
    DB-->>API: ✓
    API-->>FE: 200 { updated group }
    A->>FE: Assign employee to group (tier_id)
    FE->>API: PUT /api/Permissions/employees/:employeeId { groupId: ... }
    API->>DB: UPDATE partners SET tier_id=$groupId WHERE id=$employeeId
    DB-->>API: ✓
    API-->>FE: 200 { employee, effectivePermissions }
    FE-->>A: ✓ Changes saved
```

**Data state transitions:**
- `group_permissions` rows replaced for the group.
- `partners.tier_id` updated for the employee.

**Invariants:** INV-008 (shared resolution), INC-20260506-01 (tier_id NULL lock).
**Failure modes:**
- Typo in permission string → silent 403 for users in that group.
- `is_system=true` group deleted → seed data lost; admin UI should block this.

---

## WF-010 — VietQR Payment Generation

**Trigger:** Cashier clicks "Tạo VietQR" in payment flow.

```mermaid
sequenceDiagram
    actor C as Cashier
    participant FE as React (PaymentForm)
    participant API as Express API
    participant DB as Postgres (dbo)

    C->>FE: Click VietQR button
    FE->>API: GET /api/settings/bank?companyId=...
    API->>DB: SELECT * FROM company_bank_settings WHERE company_id=$id
    DB-->>API: Bank settings row
    API-->>FE: { bankName, accountNumber, vietqrPayload }
    FE->>FE: Generate QR code image from payload
    FE-->>C: Display QR + copy payload button
    C->>FE: Copy payload
    FE->>FE: Clipboard.writeText(vietqrPayload)
    FE-->>C: ✓ Copied
```

**Data state transitions:** None (read-only settings consumption).
**Invariants:** None additional.
**Failure modes:**
- No bank settings for location → empty QR; cashier must configure in Settings first.
- Invalid VietQR payload format → bank app rejects scan.

---

## WF-011 — Feedback Thread Moderation

**Trigger:** Admin opens `/feedback` to triage staff/user feedback.

```mermaid
sequenceDiagram
    actor A as Admin
    participant FE as React (/feedback)
    participant API as Express API
    participant FS as Upload Storage
    participant DB as Postgres (dbo)

    A->>FE: Open feedback inbox
    FE->>API: GET /api/Feedback/all?source=...
    API->>DB: SELECT feedback_threads with latest message metadata
    DB-->>API: Thread list
    API-->>FE: Threads
    A->>FE: Open thread
    FE->>API: GET /api/Feedback/all/:threadId
    API->>DB: SELECT messages + attachments
    API-->>FE: Conversation
    alt Admin reply
        A->>FE: Write reply and attach file(s)
        FE->>API: POST /api/Feedback/all/:threadId/reply FormData
        API->>FS: Store uploaded attachment(s)
        API->>DB: INSERT feedback_messages / feedback_attachments
    else Status change
        A->>FE: Mark in_progress/resolved/ignored
        FE->>API: PATCH /api/Feedback/all/:threadId/status { status }
        API->>DB: UPDATE feedback_threads.status
    end
    API-->>FE: Updated thread state
    FE-->>A: Inbox refreshes
```

**Data state transitions:**
- `feedback_threads.status` changes for moderation.
- `feedback_messages` and `feedback_attachments` rows are inserted for admin replies; files are stored under `api/uploads/feedback/`.

**Traceability:** Related UC: UC-020. Contracts/routes: `GET /api/Feedback/all`, `GET /api/Feedback/all/:threadId`, `POST /api/Feedback/all/:threadId/reply`, `PATCH /api/Feedback/all/:threadId/status`, `DELETE /api/Feedback/all/:threadId`. Data/tables: `dbo.feedback_threads`, `dbo.feedback_messages`, `dbo.feedback_attachments`, `api/uploads/feedback/`. Invariants: INV-015, INV-016, INV-017. Tests: `api/tests/readRoutePermissions.test.js`, `website/e2e/phase2-quick-features.spec.ts` indirect; file storage/deletion E2E remains a gap. Product-map domains: `feedback-cms`, `auth`.

**Failure modes:**
- Missing scoped feedback permission causes 403 on the specific action.
- Attachment upload succeeds but DB insert fails → orphan-file cleanup must be checked when changing upload handling.

---

## WF-012 — Monthly Plan Installment Payment

**Trigger:** Cashier pays an installment from a monthly plan.

```mermaid
sequenceDiagram
    actor C as Cashier
    participant FE as React (MonthlyPlan/Payment)
    participant API as Express API
    participant DB as Postgres (dbo)

    C->>FE: Select unpaid installment
    C->>FE: Enter paid amount and paid date
    FE->>API: PUT /api/MonthlyPlans/:id/installments/:installmentId/pay
    API->>DB: UPDATE planinstallments SET status='paid', paid_date, paid_amount
    DB-->>API: Updated installment
    API->>DB: SELECT COUNT(*) remaining unpaid installments
    alt No unpaid installments remain
        API->>DB: UPDATE monthlyplans SET status='completed'
    else Unpaid installments remain
        API->>DB: UPDATE next pending installment SET status='upcoming'
    end
    API-->>FE: Updated installment row
    FE-->>C: Plan schedule refreshes
```

**Data state transitions:**
- `planinstallments.status` becomes `paid`.
- `monthlyplans.status` becomes `completed` only when all installments are paid.
- Current route does not create a `payments` ledger row.

**Traceability:** Related UC: UC-018. Contracts/routes: `GET /api/MonthlyPlans`, `GET /api/MonthlyPlans/:id`, `PUT /api/MonthlyPlans/:id/installments/:installmentId/pay`. Data/tables: `dbo.monthlyplans`, `dbo.monthlyplan_items`, `dbo.planinstallments`. Invariants: INV-020 for runtime changes; payment invariants apply if ledger creation is later added. Tests: no dedicated monthly-plan installment tests yet. Product-map domains: `payments-deposits`, `customers-partners`.

**Failure modes:**
- Route currently requires `payment.edit`, not `payment.add`; permission wording must stay explicit until product decides otherwise.
- Plan can show paid without a matching `dbo.payments` row, so finance reconciliation must not assume installment-pay equals cash receipt.

---

## WF-013 — Reports Revenue Screen Uses Canonical Revenue and Operational Exports

**Trigger:** Manager opens `/reports/revenue`.

```mermaid
sequenceDiagram
    actor M as Manager
    participant FE as React (/reports/revenue)
    participant Hook as useReportData
    participant API as Express API
    participant DB as Postgres (dbo)

    M->>FE: Open revenue report and set filters
    FE->>Hook: useReportData('/Reports/revenue/summary', filters)
    Hook->>API: POST /api/Reports/revenue/summary { dateFrom, dateTo, companyId? }
    API->>DB: Canonical revenue from payment_allocations/payments/saleorders
    DB-->>API: Result rows
    API-->>Hook: Revenue summary response
    Hook-->>FE: KPI data
    FE->>API: POST /api/Reports/cash-flow/summary { filters }
    API->>DB: Cash-flow classification rows
    API-->>FE: Cash movement cards
    FE-->>M: Revenue KPIs + cash-flow context + export controls
```

**Data state transitions:**
- None. This screen reads canonical paid revenue and cash-flow context.

**Traceability:** Related UCs: UC-013, UC-019. Contracts/routes: `POST /api/Reports/revenue/summary`, `POST /api/Reports/revenue/trend`, `POST /api/Reports/revenue/by-location`, `POST /api/Reports/revenue/by-doctor`, `POST /api/Reports/revenue/by-category`, `POST /api/Reports/revenue/rules`, `POST /api/Reports/cash-flow/summary`, `POST /api/Exports/report-sales-employees/preview`. Data/tables: `dbo.payment_allocations`, `dbo.payments`, `dbo.saleorders`, `dbo.saleorderlines`, `dbo.partners`, `dbo.companies`. Invariants: INV-003, INV-012, INV-019. Tests: `api/src/routes/reports/__tests__/revenueRecognition.test.js`, `api/src/routes/reports/__tests__/cashFlow.test.js`, `api/src/services/reports/__tests__/canonicalRevenue.test.js`, `website/src/hooks/__tests__/useReportData.test.ts`, `website/src/pages/reports/__tests__/ReportsSubpages.test.tsx`. Product-map domains: `reports-analytics`, `payments-deposits`.

**Failure modes:**
- Cash-flow cards are cash movement context and must not be treated as the paid-revenue source of truth.
- Location scope mismatches can make report totals differ by user role.

---

## WF-014 — DotKham / Medical-History Long-Text Inspection

**Trigger:** Staff opens a customer profile containing long migrated medical-history or DotKham-related text.

```mermaid
sequenceDiagram
    actor S as Staff
    participant FE as React (CustomerProfile)
    participant API as Express API
    participant DB as Postgres (dbo)

    S->>FE: Open /customers/:id
    FE->>API: GET /api/Partners/:id
    API->>DB: SELECT partner profile including medicalhistory
    DB-->>API: Partner row
    FE->>API: GET /api/DotKhams?partnerId=...
    API->>DB: SELECT read-only DotKham rows
    DB-->>API: Medical records
    API-->>FE: Profile + DotKham context
    FE->>FE: Render bounded text with overflow measurement
    alt Text overflows
        S->>FE: Hover or expand
        FE-->>S: Full medical text visible inline
    else Text fits
        FE-->>S: Normal profile view
    end
```

**Data state transitions:** None; DotKham records are read-only in the current UI.

**Traceability:** Related UC: UC-021. Contracts/routes: `GET /api/Partners/:id`, `GET /api/DotKhams`. Data/tables: `dbo.partners.medicalhistory`, `dbo.dotkhams`, `dbo.dotkhamsteps`. Invariants: INV-015, INV-016, INV-017. Tests: `website/src/components/customer/CustomerProfile.test.tsx`, `website/src/hooks/__tests__/useCustomerProfile.date-normalization.test.tsx`; no dedicated DotKham tooltip regression yet. Product-map domains: `customers-partners`, `services-catalog`, `payments-deposits` when payment allocation context is shown.

**Failure modes:**
- Long Vietnamese text clips or overlaps if `ExpandableText`/runtime overflow detection is bypassed.
- DotKham rows may be read-only or sync-owned; avoid implying unsupported edits.

---

## WF-015 — CTV Referral Booking Makes Client Searchable

**Trigger:** A CTV submits the `/ctv` refer-client booking sheet for a Dental or Cosmetic client.

```mermaid
sequenceDiagram
    actor C as CTV
    participant FE as CTV Portal
    participant API as Express API
    participant DB as Selected LOB DB
    participant Admin as Admin Customers

    C->>FE: Enter phone, LOB, optional service/note; date defaults to today's Vietnam date
    FE->>API: GET /api/ctv/client-lookup?phone=&lob=
    API->>DB: SELECT partner by phone
    API-->>FE: exists / claim status
    opt exists and not claimed
        FE->>FE: Prefill name from lookup result
    end
    C->>FE: Submit booking
    FE->>API: POST /api/ctv/bookings
    API->>DB: Resolve existing partner by clientId or phone
    alt active claim owned by another CTV
        API-->>FE: 400 B_CLIENT_CLAIMED
    else new client
        API->>DB: INSERT partners { customer=true, referred_by_ctv_id=CTV }
    else existing accepted partner
        API->>DB: UPDATE partners SET customer=true, referred_by_ctv_id=CTV
    end
    API->>DB: Create appointment only
    API-->>FE: 201 { clientId, appointmentId }
    Admin->>API: GET /api/cosmetic/Partners?search=<name or phone>
    API-->>Admin: Client row appears because customer=true
```

**Data state transitions:**
- Existing accepted partner row keeps the same UUID and gets `customer=true`.
- `partners.referred_by_ctv_id` points to the submitting CTV.
- New appointment row is created in the selected LOB database.
- No `saleorders` or `saleorderlines` service card is created by this booking flow.
- The CTV sheet initializes `date` to `Asia/Ho_Chi_Minh` today so mobile users do not submit an empty required appointment date.

**Invariants:** INV-001, INV-002, INV-006, INV-021.
**Traceability:** Related UC: UC-022. Contracts/routes: `GET /api/ctv/client-lookup`, `POST /api/ctv/bookings`, `GET /api/Partners`, `GET /api/cosmetic/Partners`. Data/tables: `dbo.partners`, `dbo.appointments`. Tests: `api/src/routes/__tests__/ctvBookings.test.js`, `website/src/components/ctv/CtvReferModal.test.tsx`. Product-map domains: `ctv`, `cosmetic`, `cosmetic-clients`, `customers-partners`, `appointments-calendar`.
