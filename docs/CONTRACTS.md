# TGroup Clinic — Contracts

> Every interface boundary frozen: API request/response schemas, event payloads, cross-module function signatures, third-party integration contracts. Versioned. Append-only.
> 
> **Rule:** If you change any contract in this file, you MUST update the version, the consumer code, the tests, and append a CHANGELOG entry in the same commit.

## Contract Versioning

| Version | Date | Scope |
|---|---|---|
| v1.0.0 | 2026-05-13 | Initial contract freeze covering all active API routes, shared types, and integration boundaries. |

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
  };
  permissions: {
    effectivePermissions: string[];  // e.g., ["customers.view", "appointments.add"]
    locations: { id: string; name: string }[];
  };
}
```
**Errors:** 400 (missing fields), 401 (invalid credentials), 429 (rate limited).

#### GET /api/Auth/me
**Headers:** `Authorization: Bearer <token>`
**Response 200:** Same shape as login `user` + `permissions`.

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
**Response 200:** Updated row.

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

#### PATCH /api/Partners/:id/soft-delete
**Effect:** Sets `isdeleted = true`. Requires `customers.delete`.

#### DELETE /api/Partners/:id/hard-delete
**Effect:** Physical row removal. Requires `customers.hard_delete`.

---

### 1.4 Payments

#### POST /api/Payments
**Body:** `PaymentCreateSchema` (from `@tgroup/contracts`)
```ts
{
  customerId: string;           // UUID
  serviceId?: string | null;    // saleorder or dotkham id
  amount: number;               // positive
  method: 'cash' | 'bank_transfer' | 'card' | 'momo' | 'vnpay' | 'zalopay' | 'deposit' | 'mixed';
  notes?: string | null;
  paymentDate?: string | null;
  referenceCode?: string | null;
  status?: 'posted' | 'voided' | null;
  depositUsed?: number | null;
  cashAmount?: number | null;
  bankAmount?: number | null;
  depositType?: 'deposit' | 'refund' | 'usage' | null;
  receiptNumber?: string | null;
  allocations?: Array<{
    invoiceId?: string | null;
    dotkhamId?: string | null;
    allocatedAmount?: number;
  }> | null;
}
```
**Behavior:** If no allocations and no serviceId, backend classifies as `deposit` (see INV-004).

#### POST /api/Payments/:id/void
**Effect:** Marks payment `status = 'voided'`. Requires `payment.void`.

#### POST /api/Payments/refund
**Body:** `{ paymentId: string; amount: number; reason?: string }`
**Effect:** Creates a negative payment row. Requires `payment.refund`.

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
}
```
**Response 200:** `{ success: true; faceSubjectId: string }`

#### POST /api/face/recognize
**Body:** `multipart/form-data` with `image: File`
**Response 200:**
```ts
{
  matched: boolean;
  partnerId?: string;    // null if no match
  confidence?: number;   // distance score
}
```

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

### 1.8 Exports

#### GET /api/Exports/:type/download
**Query Params:** Filter object specific to export type (date range, location, etc.)
**Response:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (Excel)
**Timeout Requirement:** Nginx proxy read timeout ≥300s (INV-019).

---

### 1.9 Telemetry (Public)

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

### 2.2 resolveEffectivePermissions (Backend Auth)

**File:** `api/src/services/permissionService.js`

```ts
async function resolveEffectivePermissions(employeeId: string): Promise<{
  effectivePermissions: string[];
  tierId: string | null;
  groupName: string | null;
}>
```
**Algorithm:**
1. Read `partners.tier_id`.
2. Read `group_permissions.permission_string` WHERE `group_id = tier_id`.
3. Read `permission_overrides` for employee; apply grants/revokes.
4. Return deduplicated array.

### 2.3 query (Database Access)

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

### 4.1 Compreface (Legacy Fallback)

**Base URL:** `COMPREFACE_URL` env (default `http://compreface-api`)
**Endpoints:**
- `POST /api/v1/recognition/faces` — register face
- `POST /api/v1/recognition/recognize` — recognize face
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
```ts
// contracts/payment.ts
export const PaymentBaseSchema = z.object({
  id: z.string().uuid().optional(),
  customer_id: z.string().uuid(),
  service_id: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().positive(),
  method: z.enum(["cash","bank_transfer","card","momo","vnpay","zalopay","deposit","mixed"]),
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
| 2026-05-13 | v1.0.0 | Initial contract freeze | feat/complete-documentation-stack |
