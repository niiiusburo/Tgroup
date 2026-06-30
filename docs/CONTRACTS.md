# TGroup Clinic — Contracts

> Every interface boundary frozen: API request/response schemas, event payloads, cross-module function signatures, third-party integration contracts. Versioned. Append-only.
> 
> **Rule:** If you change any contract in this file, you MUST update the version, the consumer code, the tests, and append a CHANGELOG entry in the same commit.

**Cosmetic LOB v2 Sync (2026-05-19):** Added/aligned: `Lob` ('dental'|'cosmetic'), `BusinessUnitScope`, `EarningsRow` (append-only with recipient_partner_id on partners, source enum, negative reversals), `Payout`, `CtvCommissionSummary` (cross-DB aggregate), `ConsultationCard`, `getDb(lob)` / `getQuery(req)` factory contracts, `LobScope` middleware types. partners (both DBs) is identity for all LOB/CTV/earnings. See product-map/earnings-commissions.yaml + db/index.js + commissionEngine. Per v2 §269 + migration 047 reality.



## Contract Versioning

| Version | Date | Scope |
|---|---|---|
| v1.0.9 | 2026-06-29 | Investor customer allowlist scope explicitly covers payment legacy fallback reads and report branch/date filters; branch filters compose with `dbo.investor_clients` instead of replacing it. |
| v1.0.8 | 2026-06-27 | Investor group now resolves to explicit staff-shell permissions while customer-linked data remains scoped by `dbo.investor_clients`; investor role/employee self-escalation and allowlist curation stay server-blocked. |
| v1.0.7 | 2026-06-27 | Admin-only investor allowlist curation added: `GET /api/Partners/investor-visibility` and `PATCH /api/Partners/:id/investor-visibility` read/write `dbo.investor_clients` only after `permissions.edit` and Admin-class handler validation. |
| v1.0.6 | 2026-06-27 | Backend investor scope helper added: `resolveInvestorScope()` returns a fail-closed customer allowlist for employees in the `investor` permission group. |
| v1.0.0 | 2026-05-13 | Initial contract freeze covering all active API routes, shared types, and integration boundaries. |
| v1.0.1 | 2026-05-17 | Contract documentation aligned to live payment method enum, report API, and operational export registry. |
| v1.0.2 | 2026-05-18 | Reconfirmed `@tgroup/contracts` payment method enum and generated contract artifacts are limited to live methods only. |
| v1.0.5 | 2026-06-01 | Partner DOB date parts normalize migrated blank/zero values to `null`; revenue by source report endpoint added. |
| v1.0.4 | 2026-05-21 | Feedback creation now queues optional Lark custom bot alerts after manual or auto-detected feedback threads commit. |
| v1.0.3 | 2026-05-19 | Feedback attachment persistence contract clarified: file-only messages are valid, DB/file writes are transactional, and destructive file cleanup happens only after DB commit. |

---

## 1. API Contracts

### 1.1 Auth

#### POST /api/Auth/login
**Request:**
```ts
{
  email: string;           // employee email
  password: string;        // plaintext, bcrypt compared server-side
  rememberMe?: boolean;    // default false → token expires 24h; true → 60d
}
```
**Response 200:**
```ts
{
  token: string;           // JWT signed with JWT_SECRET
  user: {
    id: string;            // partners.id (UUID)
    name: string;
    email: string;
    companyId: string;     // primary branch
    companyName: string;
    is_ctv?: boolean;      // optional, true if user is a CTV (cosmetic TV) member
    lob_scope?: string[];  // optional, array of permitted lines of business (e.g., ["dental", "cosmetic"])
  };
  permissions: {
    effectivePermissions: string[];  // e.g., ["customers.view", "appointments.add"]
    locations: { id: string; name: string }[];
  };
}
```
Investor users (`permission_groups.name = "investor"`) intentionally return
`permissions.locations = []` even when their mapped employee has a primary
branch. Investor scope is customer-based through `dbo.investor_clients`; the
frontend must remain on all locations unless a user explicitly filters further.

**Errors:** 400 (missing fields), 401 (invalid credentials), 429 (rate limited).

#### GET /api/Auth/me
**Headers:** `Authorization: Bearer <token>`
**Response 200:** Same shape as login response — `user` (with optional `is_ctv` and `lob_scope` fields) + `permissions`.

---

### 1.2 Appointments

#### GET /api/Appointments
**Query Params (snake_case on wire, camelCase accepted from frontend):**
```ts
{
  startDate?: string;      // ISO 8601 date
  endDate?: string;
  companyId?: string;      // location filter (frontend-side only; backend returns all)
  doctorId?: string;
  status?: string;         // comma-separated statuses
  offset?: number;         // pagination
  limit?: number;          // max 500 for normal lists; calendar-mode uses optimized path
  mode?: 'calendar';       // optional; skips count/aggregate for large ranges
}
```
**Response 200:**
```ts
PaginatedResponse<{
  id: string;
  name: string;            // AP000001
  date: string;            // YYYY-MM-DD
  time: string | null;
  partnerId: string;       // customer
  doctorId: string | null;
  companyId: string;
  state: AppointmentStatus;
  color: string | null;    // '0'..'7'
  timeExpected: number | null;
  productId: string | null;
  assistantId: string | null;
  dentalAideId: string | null;
  note: string | null;
}>
```

#### POST /api/Appointments
**Body:** `AppointmentCreateSchema` (from `@tgroup/contracts`)
```ts
{
  date: string;            // required, ISO 8601
  time?: string | null;
  partnerId?: string;      // customer UUID
  doctorId?: string | null;
  companyId?: string;
  note?: string | null;
  timeExpected?: number | null;  // 1..480
  color?: string | null;
  state?: AppointmentStatus | null;  // defaults 'confirmed'
  productId?: string | null;
  assistantId?: string | null;
  dentalAideId?: string | null;
}
```
**Response 201:** Created appointment row (same shape as GET item + `id`).

#### PUT /api/Appointments/:id
**Body:** `AppointmentUpdateSchema` (partial omit `id`)
```ts
{
  date?: string;
  time?: string | null;
  doctorId?: string | null;
  companyId?: string;
  note?: string | null;
  state?: AppointmentStatus | null;
  timeExpected?: number | null;
  color?: string | null;
  productId?: string | null;
  assistantId?: string | null;
  dentalAideId?: string | null;
}
```
**Response 200:** Updated row, including refreshed `companyid/companyname` when location changes.

**Validation (handler-level, in addition to Zod):**
- `companyId` (when present) must be a UUID; otherwise `400 INVALID_COMPANY_ID`.
- `companyId` (when present) must reference an existing `companies` row; otherwise `404 COMPANY_NOT_FOUND`.
- Persisted column: `appointments.companyid`. Test coverage: `api/src/routes/appointments/__tests__/mutationHandlers.test.js`.

---

### 1.3 Partners (Customers + Employees)

#### GET /api/Partners
**Query Params:**
```ts
{
  search?: string;         // accent-insensitive across name, phone, ref, appointment name
  companyId?: string;
  isCustomer?: boolean;
  isEmployee?: boolean;
  offset?: number;
  limit?: number;
}
```

#### POST /api/Partners
**Body (customer create):**
```ts
{
  name: string;
  phone?: string | null;
  email?: string | null;
  companyId?: string | null;
  ref?: string | null;           // customer code
  saleStaffId?: string | null;   // assigned sales employee
  sourceId?: string | null;      // hidden in UI but stored
  faceSubjectId?: string | null;
  // ... plus Odoo legacy fields
}
```

#### PUT /api/Partners/:id
**Body:** Partial partner fields. `ref` cannot be changed after creation (enforced by backend).
Optional DOB date parts (`birthday`, `birthmonth`, `birthyear`) normalize `""`, `0`, and `"0"` to `null` before validation so migrated records can be saved without inventing a date. Real invalid values still fail range validation.

#### PATCH /api/Partners/:id/soft-delete
**Effect:** Sets `isdeleted = true`. Requires `customers.delete`.

#### DELETE /api/Partners/:id/hard-delete
**Effect:** Physical row removal. Requires `customers.hard_delete`.

---

### 1.4 Payments

#### GET /api/Payments
**Query:** `customerId?`, `serviceId?`, `limit?`, `offset?`, `type? = payments|deposits|all`
**Auth:** Requires `payment.view`.
**Response:** `{ items: Payment[], totalItems: number }` with allocation metadata where available.
**Investor scope:** For `investor` callers, modern payment rows must be filtered by `dbo.investor_clients`. The legacy `accountpayments` fallback may run only when `customerId` is present and that customer is in the investor allowlist; non-allowlisted customer filters return an empty payment result instead of querying fallback rows.

#### GET /api/Payments/deposits
**Query:** `customerId?`, `dateFrom?`, `dateTo?`, `receiptNumber?`, `type?`, `limit?`, `offset?`
**Auth:** Requires `payment.view`.
**Response:** `{ items: Payment[], totalItems: number }` scoped to deposit/refund rows.

#### GET /api/Payments/deposit-usage
**Query:** `customerId?`, `dateFrom?`, `dateTo?`, `limit?`, `offset?`
**Auth:** Requires `payment.view`.
**Response:** `{ items: Payment[], totalItems: number }` for internal deposit usage rows.

#### GET /api/Payments/:id
**Auth:** Requires `payment.view`.
**Response:** Payment detail with allocations.

#### POST /api/Payments
**Auth:** Requires `payment.add`.
**Body:** `PaymentCreateSchema` (from `@tgroup/contracts`)
```ts
{
  customer_id: string;          // UUID
  service_id?: string | null;   // saleorder or dotkham id
  amount: number;               // positive
  method: 'cash' | 'bank_transfer' | 'deposit' | 'mixed';
  notes?: string | null;
  payment_date?: string | null;
  reference_code?: string | null;
  status?: 'posted' | 'voided' | null;
  deposit_used?: number | null;
  cash_amount?: number | null;
  bank_amount?: number | null;
  deposit_type?: 'deposit' | 'refund' | 'usage' | null;
  receipt_number?: string | null;
  allocations?: Array<{
    invoice_id?: string | null;
    dotkham_id?: string | null;
    allocated_amount?: number;
  }> | null;
}
```
**Behavior:** If no allocations and no serviceId, backend classifies as `deposit` (see INV-004).

#### PATCH /api/Payments/:id
**Auth:** Requires `payment.add`.
**Body:** Partial `PaymentUpdateSchema` fields:
```ts
{
  amount?: number;
  method?: 'cash' | 'bank_transfer' | 'deposit' | 'mixed';
  notes?: string | null;
  payment_date?: string | null;
  reference_code?: string | null;
  status?: 'posted' | 'voided' | null;
  deposit_type?: 'deposit' | 'refund' | 'usage' | null;
  receipt_number?: string | null;
}
```
**Response:** Updated payment row. Backend rejects an empty update body.

#### DELETE /api/Payments/:id
**Auth:** Requires `payment.void`.
**Effect:** Deletes the payment row and reverses linked payment allocations against `saleorders.residual` or `dotkhams.amountresidual`.
**Response:** `{ success: true, id: string }`

#### POST /api/Payments/:id/void
**Auth:** Requires `payment.void`.
**Body:** `{ reason?: string }`
**Effect:** Marks payment `status = 'voided'` and reverses linked allocations.

#### POST /api/Payments/refund
**Auth:** Requires `payment.refund`.
**Body:** `{ customer_id: string; amount: number; method: 'cash' | 'bank_transfer' | 'deposit' | 'mixed'; notes?: string | null; payment_date?: string | null }`
**Effect:** Creates a negative deposit-category payment row with `deposit_type = 'refund'`.

#### POST /api/Payments/:id/proof
**Auth:** Requires `payment.add`.
**Body:** `{ proofImageBase64: string; qrDescription?: string | null }`
**Behavior:** `proofImageBase64` must be a `data:image/*` URI.
**Response:** `{ success: true, proofId: string }`

---

### 1.5 External Checkups (Hosoonline)

#### GET /api/ExternalCheckups/:customerCode/health-checkups
**Headers:** `Authorization: Bearer <token>`
**Response 200:**
```ts
{
  patientExists: boolean;
  checkups: Array<{
    id: string;
    date: string;
    images: Array<{
      name: string;
      url: string;       // proxied through TGClinic; NOT direct hosoonline.com URL
    }>;
  }>;
}
```
**Behavior:** If `HOSOONLINE_USERNAME`/`PASSWORD` are configured, backend logs in to Hosoonline, searches by `customerCode`, and proxies image metadata. If credentials absent, falls back to `HOSOONLINE_API_KEY` contract.

---

### 1.6 Face Recognition

#### POST /api/face/register
**Body:** `multipart/form-data`
```ts
{
  partnerId: string;     // customer UUID
  image: File;           // JPEG/PNG, captured from camera
  source?: string;       // profile_register | no_match_rescue | candidate_confirmation
}
```
**Response 201:** `{ success: true; partnerId: string; sampleId: string; sampleCount: number; faceRegisteredAt: string }`

#### POST /api/face/re-register
**Body:** `multipart/form-data`
```ts
{
  partnerId: string;     // customer UUID
  images: File[];        // repeated field, 1-7 JPEG/PNG captures
  source?: string;       // defaults to profile_reregister
}
```
**Response 201:** `{ success: true; partnerId: string; sampleIds: string[]; sampleCount: number; faceRegisteredAt: string }`

#### POST /api/face/recognize
**Body:** `multipart/form-data` with `image: File`
**Response 200:**
```ts
{
  match: null | {
    partnerId: string;
    name: string;
    code: string;
    phone: string | null;
    confidence: number;
  };
  candidates: Array<{
    partnerId: string;
    name: string;
    code: string;
    phone: string | null;
    confidence: number;
  }>;
  recognitionVersion: string; // e.g. "face-recognition-0.32.54"
}
```

Provider behavior:
- `FACE_RECOGNITION_PROVIDER=local` sends captures to `FACE_SERVICE_URL` for SFace embeddings and stores vectors in `dbo.customer_face_embeddings`.
- `FACE_RECOGNITION_PROVIDER=compreface` sends captures to CompreFace, uses `partners.id` as the CompreFace subject, and keeps `partners.face_subject_id` / `face_registered_at` as TGClinic status.
- Staff recognition responses include `recognitionVersion` so NK2 operators can confirm the active Face ID recognizer from the header UI and camera banner without changing samples.
- Default strict matching policy is `FACE_AUTO_MATCH_THRESHOLD=0.92`, `FACE_CANDIDATE_THRESHOLD=0.84`, and `FACE_AUTO_MATCH_MARGIN=0.05`; candidate-only staff header results are rescan-only and do not expose candidate identity buttons.
- Staff/public camera privacy blur is a visual overlay only; detection and capture must analyze/draw from the unblurred `video` element.

Face error responses:
```ts
{
  error: 'NO_FACE' | 'MULTIPLE_FACES' | 'LOW_QUALITY' | 'MODEL_NOT_READY' | 'ENGINE_ERROR' | string;
  message: string;
}
```
- `NO_FACE` is HTTP 422 when the local provider or CompreFace cannot detect a face in the submitted image.
- Frontend capture callers must keep the camera modal open on `NO_FACE`, show "Không phát hiện khuôn mặt" / "Face not detected", and dismiss capture only through an explicit close/cancel action.

#### POST /api/public/face/checkin
**Audience:** public `/checkin` kiosk or phone/tablet check-in page. No JWT required.
**Body:** `multipart/form-data` with `image: File`
**Response 200:**
```ts
{ ok: true; result: 'match'; greeting: string | null }
| { ok: true; result: 'multiple'; candidates: number }
| { ok: true; result: 'no_match' }
```
**Error response:** `{ ok: false; reason: string; message: string }`
- Public scanner callers must keep scanning on transient provider errors (`NO_FACE`, `MULTIPLE_FACES`, `LOW_QUALITY`) instead of ending the kiosk flow on the first bad frame.

Privacy/security contract:
- Recognize-only; never registers or re-registers faces.
- Returns only a minimal greeting on match and never returns `partnerId`, phone, customer code, confidence score, or candidate identities.
- The public preview may be lightly privacy-blurred, but the uploaded image must come from the unblurred camera frame.
- The server may write hidden diagnostic records for tuning/debugging, but those records are not part of the API response and must not include raw images, raw embeddings, names, phone numbers, customer codes, or raw partner IDs.
- Rate-limited per source IP.
- Reuses the configured Face ID provider. In CompreFace mode, subjects still map to `partners.id`.

#### GET /api/face/status/:partnerId
**Response 200:** `{ partnerId: string; registered: boolean; sampleCount: number; lastRegisteredAt: string | null; provider?: 'local' | 'compreface' }`

CompreFace mode status is provider-backed: `registered` is true only when `partners.face_subject_id` exists and CompreFace currently returns at least one face example for that subject. A stale DB subject with zero CompreFace examples must report `registered: false`.

---

### 1.7 Permissions

#### GET /api/Permissions/resolve/:employeeId
**Response 200:**
```ts
{
  employeeId: string;
  effectivePermissions: string[];
  tierId: string | null;
  groupName: string | null;
}
```

---

### 1.8 Reports

All current `/api/Reports` endpoints use `POST`, require `reports.view`, and return:
```ts
{
  success: boolean;
  data?: unknown;
  error?: string;
}
```
Date-scoped endpoints accept `{ dateFrom?: 'YYYY-MM-DD'; dateTo?: 'YYYY-MM-DD'; companyId?: string }` unless noted.
For `investor` callers, report date and `companyId` filters compose with the `dbo.investor_clients` customer allowlist. Branch filters may narrow checked-customer data, but must not replace or bypass the customer allowlist.

| Endpoint | Body | `data` shape |
|---|---|---|
| `/api/Reports/revenue/summary` | Date scope | `{ orders: { state, cnt, total, paid, outstanding }[]; payments: { method, status, cnt, total }[] }` |
| `/api/Reports/revenue/trend` | Date scope | `{ month, orderCount, invoiced, paid, outstanding }[]` |
| `/api/Reports/revenue/by-location` | Date scope | `{ id, name, orderCount, invoiced, paid, outstanding }[]` |
| `/api/Reports/revenue/by-doctor` | Date scope | `{ id, name, orderCount, invoiced, paid }[]` |
| `/api/Reports/revenue/by-category` | Date scope | `{ id, category, lineCount, revenue }[]` |
| `/api/Reports/revenue/by-source` | Date scope | `{ id, name, orderCount, paid }[]`, using sale-order source first and customer source fallback |
| `/api/Reports/revenue/payment-plans` | Date scope | `{ plans: { status, count, total, downPayment }[]; installments: { status, count, total, paid }[] }` |
| `/api/Reports/cash-flow/summary` | Date scope | `{ moneyIn, moneyOut, netCashFlow, internalDepositUsed, adjustments, categories[], trend[] }` |
| `/api/Reports/appointments/summary` | Date scope | `{ total, done, cancelled, completionRate, cancellationRate, conversionRate, states[], repeatCustomers, newCustomers }` |
| `/api/Reports/services/breakdown` | Date scope | `{ categories[], revenueByCategory[], revenueBySource[], popularProducts[] }` |
| `/api/Reports/employees/overview` | `{ companyId?: string }` | `{ roles, byLocation[], employees[] }` |
| `/api/Reports/customers/summary` | Date scope | `{ total, newInPeriod, gender[], cities[], topSpenders[], outstanding[], growth[] }` |
| `/api/Reports/locations/comparison` | `{ dateFrom?: string; dateTo?: string }` | `{ locations[], trend[] }` |
| `/api/Reports/doctors/performance` | Date scope | `{ id, name, totalAppointments, done, cancelled, revenue, unassigned? }[]` |

### 1.9 Exports

Operational exports are registry-driven (`api/src/services/exports/exportRegistry.js`), require a valid JWT, and filter visible/exportable types by the current employee's effective permissions.

#### GET /api/Exports/types
**Response 200:**
```ts
Array<{
  key: 'service-catalog' | 'customers' | 'appointments' | 'services' | 'payments' | 'report-sales-employees' | 'revenue-flat' | 'deposit-flat';
  label: string;
  permission: 'products.export' | 'customers.export' | 'appointments.export' | 'services.export' | 'payments.export' | 'reports.export';
}>
```

#### POST /api/Exports/:type/preview
**Body:**
```ts
{
  filters?: Record<string, string | number | boolean | null | undefined>;
}
```
**Response 200:**
```ts
{
  type: string;
  label: string;
  rowCount: number;
  filename: string;
  filters: Record<string, unknown>;  // original request filters
  summary: Array<{ label: string; value: string | number }>;
  exceedsMax: boolean;
}
```

#### POST /api/Exports/:type/download
**Body:** Same `{ filters }` wrapper as preview.
**Response 200:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` stream with `Content-Disposition` filename.
**Errors:** 400 unknown type or row-limit exceeded, 403 missing registry permission, 500 internal error.
**Timeout Requirement:** Nginx proxy read timeout >=300s (INV-019).

Supported registry types:

| Type | Permission | Filters |
|---|---|---|
| `service-catalog` | `products.export` | `search`, `companyId`, `categId`, `active` |
| `customers` | `customers.export` | `search`, `companyId`, `status` |
| `appointments` | `appointments.export` | `search` (appointment/customer fields including phone), `companyId`, `dateFrom`, `dateTo`, `state`, `doctorId`; workbook date prefers `appointments.date` + `time` before legacy `datetimeappointment` |
| `services` | `services.export` | `search`, `companyId`, `dateFrom`, `dateTo`, `state` |
| `payments` | `payments.export` | `search`, `companyId`, `dateFrom`, `dateTo`, `status` |
| `report-sales-employees` | `reports.export` | `companyId`, `employeeType`, `employeeId`, `dateFrom`, `dateTo` |
| `revenue-flat` | `payments.export` | `search`, `companyId`, `dateFrom`, `dateTo` |
| `deposit-flat` | `payments.export` | `search`, `companyId`, `dateFrom`, `dateTo` |

---

### 1.10 Feedback

#### POST /api/Feedback
**Auth:** Any authenticated employee.
**Body:** `multipart/form-data` with `content?: string`, `pagePath?: string`, `screenSize?: string`, and repeated `files` image fields.
**Response 201:** Created feedback thread row.

**Side effect:** If `LARK_FEEDBACK_WEBHOOK_URL` is configured, the API queues a non-blocking Lark custom bot text alert after the transaction commits. The alert contains thread id, reporter id/name when available, page context, screen size, attachment count, a bounded content preview, and a `/feedback` inbox link. A Lark delivery failure is logged and must not fail the request or roll back the committed feedback thread.

#### POST /api/Feedback/my/:threadId/reply
**Auth:** Thread owner.
**Body:** `multipart/form-data` with `content?: string` and repeated `files` image fields.
**Response 201:** Created message with `attachments[]`.

#### POST /api/Feedback/all/:threadId/reply
**Auth:** Admin.
**Body:** `multipart/form-data` with `content?: string` and repeated `files` image fields.
**Response 201:** Created message with `attachments[]`.

Feedback attachment behavior:
- A request is valid when it has either non-empty `content` or at least one image file. File-only messages store `content = ''`.
- Message rows and `feedback_attachments` rows are committed in the same explicit database transaction.
- If the target thread is missing or a DB/attachment insert fails after upload, uploaded physical files are removed and no attachment row should remain committed.
- `DELETE /api/Feedback/all/:threadId` deletes DB rows inside one transaction, then removes physical files only after the DB commit succeeds.
- Stored attachment filenames must match the generated UUID image filename allowlist before any physical file deletion.

---

### 1.11 Telemetry (Public)

#### POST /api/telemetry/errors
**Auth:** None (public ingestion)
**Body:**
```ts
{
  errorMessage: string;
  stackTrace?: string;
  browserInfo?: string;
  url?: string;
  version?: string;
}
```
**Response 201:** `{ id: string }` (error_event row id)

**Side effect:** The public telemetry ingestion route creates a `source='auto'` feedback thread for first-seen errors. If `LARK_FEEDBACK_WEBHOOK_URL` is configured, that new auto-feedback thread queues the same non-blocking Lark alert with error type, route, API context, and bounded error-message preview.

---

## 2. Cross-Module Function Signatures

### 2.1 apiFetch (Frontend → Backend Bridge)

**File:** `website/src/lib/api/core.ts`

```ts
async function apiFetch<T>(
  endpoint: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: unknown;
    params?: Record<string, string | number | boolean | undefined>;
    signal?: AbortSignal;
  }
): Promise<T>
```
**Invariants:**
- CamelCase keys in `params` are converted to snake_case on the wire (except `CAMEL_CASE_PASSTHROUGH` set).
- 401 responses clear `localStorage` token and dispatch `AUTH_UNAUTHORIZED_EVENT`.
- Structured errors are thrown as `ApiError` with `status`, `code`, `field`, `message`.
- **LOB-Aware Routing (v2.0):** If `VITE_COSMETIC_LOB_ENABLED=true` and `localStorage.getItem('tgclinic_lob')='cosmetic'`, endpoint paths are rewritten from `/api/X` to `/api/cosmetic/X`. Whitelisted routes (`/Auth/*`, `/me/*`, `/version/*`, `/ctv/*`) bypass rewriting regardless of LOB. Default behavior (flag false or missing) performs no rewriting; dental LOB is unaffected.

### 2.2 resolveEffectivePermissions (Backend Auth)

**File:** `api/src/services/permissionService.js`

```ts
async function resolveEffectivePermissions(employeeId: string): Promise<{
  effectivePermissions: string[];
  tierId: string | null;
  groupName: string | null;
  locations: { id: string; name: string }[];
}>
```
**Algorithm:**
1. Read `partners.tier_id`.
2. Read `group_permissions.permission_string` WHERE `group_id = tier_id`.
3. Read `permission_overrides` for employee; apply grants/revokes.
4. Read the employee's primary branch plus `employee_location_scope` rows.
5. If the permission group is `investor`, expand the explicit staff-shell
   permission list, remove wildcard `*`, and return `locations: []` so customer
   allowlist scope remains the only automatic investor data boundary.
6. Return deduplicated permissions and location access for non-investor staff.

### 2.2A POST /api/Auth/login Investor Credential Fallback

**File:** `api/src/routes/auth.js`

```ts
POST /api/Auth/login
body: { email: string; password: string }
```

**Algorithm:**
1. Normalize email by trimming and lowercasing.
2. Try the normal active employee login path against `dbo.partners.password_hash`.
3. If no active staff credential matches, try `dbo.investor_accounts` where `active = true`, mapped partner is `employee=true`, not deleted, and assigned to permission group `investor`.
4. Sign the existing staff JWT shape with `employeeId` set to the mapped partner id; do not expose a new token type.

**Invariants:** `dbo.investor_accounts` is an NK2 credential boundary for shared NK/NK2 databases. It must not grant permissions by itself; all authorization still comes from `partners.tier_id`, `group_permissions`, and `resolveInvestorScope()`. A partner can remain inactive and have no `partners.password_hash`, so the same username/password fails against older NK production code that only supports active partner credentials.

### 2.2B Admin Investor Customer Visibility

**Files:** `api/src/routes/partners.js`, `api/src/routes/partners/investorVisibility.js`, `website/src/pages/Customers/*`

```ts
GET /api/Partners/investor-visibility
PATCH /api/Partners/:id/investor-visibility
body: { visible: boolean }
```

**Auth:** Both routes require `permissions.edit` from route middleware and then re-resolve the caller. The handler allows only Admin-class users: canonical Admin group id, `Admin`, `Super Admin`, `System Administrator`, or wildcard `*`. Non-admin callers receive `403 ADMIN_REQUIRED` and no `dbo.investor_clients` query/write runs.

**Behavior:**
1. `GET /api/Partners/investor-visibility` resolves the one active mapped `dbo.investor_accounts` row whose partner is assigned to group `investor`, then returns `{ investorId, customerIds }` for visible allowlist rows.
2. `PATCH /api/Partners/:id/investor-visibility` validates the customer UUID and boolean `visible`, verifies the target is an active customer, resolves the active investor, then upserts `dbo.investor_clients` when visible or sets `is_visible=false` when hidden.
3. The `/customers` Investor checkbox is rendered only for Admin-class users. Investor employee users do not see this curation control even though their staff-shell permission set includes `permissions.edit`.

**Invariants:** This is an admin curation surface over INV-021, not an investor self-service feature. Investor users may see a staff-like shell, but the curation API excludes the `investor` group and customer-linked data remains scoped by `resolveInvestorScope()`.

### 2.3 resolveInvestorScope (Backend Auth)

**File:** `api/src/services/permissionService.js`

```ts
async function resolveInvestorScope(employeeId: string | undefined): Promise<{
  isInvestor: boolean;
  allowedCustomerIds: string[];
}>
```

**Algorithm:**
1. Return `{ isInvestor: false, allowedCustomerIds: [] }` when `employeeId` is missing or not a UUID.
2. Read the employee's `partners.tier_id` joined to `permission_groups.name`.
3. If the group name is not exactly `investor`, return non-investor scope and do not query `dbo.investor_clients`.
4. If the group name is `investor`, read visible `partner_id` rows from `dbo.investor_clients` and return them as the customer allowlist.

**Invariants:** Investors use normal employee identity and permission resolution, even when NK2 credentials are stored in `dbo.investor_accounts`. Empty allowlists fail closed. The `investor` group resolves to explicit staff-shell permissions without wildcard `*`; `permissions.locations` stays empty for investors so the frontend does not auto-apply a home-branch filter; customer-linked reads/writes, legacy fallbacks, branch/date report filters, and aggregates must still apply the allowlist; and permission/employee mutation endpoints block investor self-escalation.

### 2.4 query (Database Access)

**File:** `api/src/db.js`

```ts
async function query(text: string, params?: any[]): Promise<any[]>
```
**Invariants:**
- Uses shared `pg.Pool`.
- `search_path=dbo` is set at connection level.
- DATE columns (OID 1082) return plain `YYYY-MM-DD` strings (no TZ shift).
- API process must run with `TZ=Asia/Ho_Chi_Minh` for consistent timestamp parsing.

---

## 3. Event Payloads

### 3.1 AUTH_UNAUTHORIZED_EVENT
**Type:** `CustomEvent` dispatched on `window`
**Payload:** None (event name is the signal)
**Consumers:** `AuthContext.tsx` (triggers logout redirect), `apiFetch` (dispatches on 401).

### 3.2 tgclinic:version-update
**Type:** `CustomEvent`
**Payload:** `{ current: string; latest: string }`
**Source:** `useVersionCheck.ts` polling `/version.json`.
**Consumer:** In-app update prompt banner.

---

## 4. Third-Party Integration Contracts

### 4.1 Compreface Face ID Provider

**Base URL:** `COMPREFACE_URL` env (default `http://compreface-api`)
**Provider switch:** `FACE_RECOGNITION_PROVIDER=compreface`
**Endpoints:**
- `GET /api/v1/recognition/subjects` — service health/key check
- `POST /api/v1/recognition/subjects` — create subject using `partners.id`
- `POST /api/v1/recognition/faces` — register face
- `GET /api/v1/recognition/faces?subject=:subjectId` — verify subject examples for registration/status
- `POST /api/v1/recognition/recognize` — recognize face
- `DELETE /api/v1/recognition/subjects/:subjectId` — reset subject during re-registration
**Headers:** `x-api-key: COMPREFACE_API_KEY`
**Version:** 1.2.0 (Docker image `exadel/compreface:1.2.0`)

### 4.2 Hosoonline

**Base URL:** `HOSOONLINE_BASE_URL` (default `https://hosoonline.com`)
**Auth Methods:**
1. Session-based: `POST /api/auth/login` → cookie jar → `GET /api/appointments/search` → `GET /api/appointments/image/:imageName`
2. API-key fallback: `X-API-Key: HOSOONLINE_API_KEY`
**Version:** v2 patient management uses underscore-prefixed paths (`/_create`, `/_search`) to avoid Caddy routing collision with staff UI `/patients`.

### 4.3 Google Places

**API Key:** `GOOGLE_PLACES_API_KEY` (server-side only; never exposed to browser)
**Usage:** `api/src/routes/places.js` proxies autocomplete requests to `https://maps.googleapis.com/maps/api/place/autocomplete/json`.

---

## 5. Shared TypeScript Contracts (`@tgroup/contracts`)

### 5.1 Appointments
```ts
// contracts/appointment.ts
export const AppointmentBaseSchema = z.object({
  id: z.string().uuid().optional(),
  date: z.string().min(1),
  time: z.string().optional().nullable(),
  partnerid: z.string().uuid().optional(),
  doctorid: z.string().uuid().optional().nullable(),
  companyid: z.string().uuid().optional(),
  note: z.string().optional().nullable(),
  timeexpected: z.coerce.number().int().min(1).max(480).optional().nullable(),
  color: z.string().optional().nullable(),
  state: z.enum(["draft","scheduled","confirmed","arrived","in Examination","in-progress","done","cancelled"]).optional().nullable(),
  productid: z.string().uuid().optional().nullable(),
  assistantid: z.string().uuid().optional().nullable(),
  dentalaideid: z.string().uuid().optional().nullable(),
});
export const AppointmentCreateSchema = AppointmentBaseSchema.omit({ id: true });
export const AppointmentUpdateSchema = AppointmentBaseSchema.partial().omit({ id: true });
```

### 5.2 Payments
Live payment methods are `cash`, `bank_transfer`, `deposit`, and `mixed`. Do not add `card`, `momo`, `vnpay`, `zalopay`, or wallet aliases to the shared contract until backend storage, frontend forms, reports, exports, allocation math, and TestSprite coverage are promoted together.

```ts
// contracts/payment.ts
export const PaymentBaseSchema = z.object({
  id: z.string().uuid().optional(),
  customer_id: z.string().uuid(),
  service_id: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().positive(),
  method: z.enum(["cash","bank_transfer","deposit","mixed"]),
  notes: z.string().optional().nullable(),
  payment_date: z.string().optional().nullable(),
  reference_code: z.string().optional().nullable(),
  status: z.enum(["posted","voided"]).optional().nullable(),
  deposit_used: z.coerce.number().optional().nullable(),
  cash_amount: z.coerce.number().optional().nullable(),
  bank_amount: z.coerce.number().optional().nullable(),
  deposit_type: z.enum(["deposit","refund","usage"]).optional().nullable(),
  receipt_number: z.string().optional().nullable(),
  allocations: z.array(z.object({
    invoice_id: z.string().uuid().optional(),
    dotkham_id: z.string().uuid().optional(),
    allocated_amount: z.coerce.number().optional(),
  })).optional().nullable(),
});
```

---

## 6. Deprecated / Frozen Contracts

| Contract | Status | Replacement | Removal Blocker |
|---|---|---|---|
| `/api/Account/Login` (`account.js`) | Frozen | `/api/Auth/login` | Unknown external clients (see `product-map/unknowns.md` #4) |
| `/api/Web/Session` (`session.js`) | Frozen | JWT auth | Unknown external clients |
| `/api/Services` (`services.js`) | Frozen / Dead | `/api/Products` | Queries non-existent table; do not mount on new servers |
| `APPOINTMENT_STATUS_LABELS_VI` | Deprecated | `APPOINTMENT_STATUS_I18N_KEYS` | Verify no active imports before removal |

---

## Contract Change Log

| Date | Version | Change | Commit |
|---|---|---|---|
| 2026-05-17 | v1.0.1 | Aligned API contracts with live payment enum, reports endpoints, and export registry routes. | pending |
| 2026-05-13 | v1.0.0 | Initial contract freeze | feat/complete-documentation-stack |
