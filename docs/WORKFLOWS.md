# TGroup Clinic — Workflows

> End-to-end business workflows as mermaid sequence diagrams. Actor, system, external services, and data state transitions shown.

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
- `localStorage.tgclinic_token` → new JWT string.
- `AuthContext` → populated with user, permissions, locations.

**Invariants:** INV-007, INV-008.
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

**Trigger:** Reports page → Revenue → Export.

```mermaid
sequenceDiagram
    actor M as Manager
    participant FE as React (Reports)
    participant API as Express API
    participant DB as Postgres (dbo)
    participant Nginx as Nginx
    
    M->>FE: Select date range, location, doctor filters
    M->>FE: Click Export
    FE->>API: GET /api/Exports/revenue/download?from=...&to=...&companyId=...
    API->>DB: Complex aggregation SQL (appointments, payments, saleorders, partners)
    DB-->>API: Result rows
    API->>API: Build Excel workbook (sheets, headers, numeric formatting)
    API-->>Nginx: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
    Nginx-->>FE: Stream response (timeout ≥300s)
    FE->>FE: Trigger browser download
    API->>DB: INSERT INTO exports_audit { user_id, export_type='revenue', file_name }
    FE-->>M: ✓ Download complete
```

**Data state transitions:**
- New `exports_audit` row.

**Invariants:** INV-019 (nginx timeout), INV-020 (version bump).
**Failure modes:**
- Dataset too large → nginx 504 if timeout <300s.
- Memory exhaustion → API crash on extremely large date ranges.

---

## WF-006 — IP Access Gate

**Trigger:** Every non-public API request when IP access control is enabled for the company.

```mermaid
sequenceDiagram
    actor U as Staff
    participant FE as React
    participant Nginx as Nginx
    participant API as Express API
    participant DB as Postgres (dbo)
    
    U->>FE: Any authenticated action
    FE->>Nginx: Request with Authorization header
    Nginx->>API: Proxy to /api/...
    API->>API: requireAuth → decode JWT
    API->>API: enforceIpAccess middleware
    API->>DB: SELECT enabled FROM ip_access_settings WHERE company_id=$companyId
    DB-->>API: enabled=true
    API->>DB: SELECT ip_address FROM ip_access_entries WHERE setting_id=$settingId
    DB-->>API: Whitelist[]
    alt Client IP in whitelist
        API-->>FE: 200 / normal response
    else Client IP not in whitelist
        API-->>FE: 403 { error: 'IP access denied' }
        FE-->>U: Permission-specific denial
    end
```

**Data state transitions:** None (read-only enforcement).
**Failure modes:**
- Admin locks themselves out → must connect from whitelisted IP or disable via DB directly.
- Proxy/load balancer changes client IP → whitelist mismatch.

---

## WF-007 — Face Recognition Check-In

**Trigger:** Patient stands in front of check-in camera.

```mermaid
sequenceDiagram
    actor P as Patient
    participant Cam as Browser Camera
    participant FE as React (PatientCheckIn)
    participant API as Express API
    participant FS as Face Service (Python/OpenCV)
    participant DB as Postgres (dbo)
    
    P->>Cam: Face visible
    Cam->>FE: Video stream
    FE->>FE: Capture frame
    FE->>API: POST /api/face/recognize { image }
    API->>FS: Forward image buffer
    FS->>FS: YuNet detect + SFace embed (128-dim)
    FS->>DB: SELECT partner_id, embedding FROM customer_face_embeddings
    DB-->>FS: Candidates
    FS->>FS: Nearest neighbor search (distance < threshold)
    alt Match found
        FS-->>API: { matched: true, partnerId, confidence }
        API-->>FE: 200 { matched: true, partnerId }
        FE->>API: GET /api/Appointments?partnerId=...&date=today
        API-->>FE: Today's appointments[]
        FE-->>P: Display name + appointments
    else No match
        FS-->>API: { matched: false }
        API-->>FE: 200 { matched: false }
        FE-->>P: "Không nhận diện được" + manual search
    end
```

**Data state transitions:** None (read-only recognition).
**Invariants:** INV-005 (128-dim embedding), INV-014 (Compreface optional).
**Failure modes:**
- Face service down → fallback to manual check-in (UC-008).
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
