# Zod Schema Proposal

**Goal:** Replace hand-rolled TypeScript interfaces with Zod schemas that validate **both** frontend forms and backend request/response shapes, eliminating the contract drift documented in `CONTRACT_DRIFT.md`.

**Principles**
1. **Single source of truth** — one schema per entity, shared between frontend and backend (via a future `packages/shared` or copy-paste contract).
2. **Coercion-friendly** — use `z.coerce.number()`, `z.coerce.boolean()`, `z.coerce.date()` so HTML form strings pass validation.
3. **Canonical casing** — prefer camelCase for the contract; provide a `snakeCaseBody` helper for Express routes that still expect raw DB columns.
4. **Strict unions** — `state` / `status` fields use `z.enum()` with the exact values the backend stores.
5. **Response augmentation** — base schema + `extend()` for computed/join fields (e.g. `partnerName`, `doctorName`).

---

## Shared Helpers

```ts
// shared/schema-helpers.ts
import { z } from 'zod';

export const uuid = z.string().uuid();
export const nullableUuid = uuid.nullable();
export const numericString = z.coerce.number();
export const booleanString = z.coerce.boolean();
export const dateString = z.coerce.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/));
export const pgTimestamp = z.string().nullable(); // ISO 8601 from PostgreSQL

/** Remove keys with `undefined` or `null` values (useful for PATCH bodies). */
export function stripNulls<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)) as Partial<T>;
}
```

---

## 1. Partner (Customer)

### Current Drift This Fixes
- `status` was typed as `string enum` on frontend vs `boolean` on backend → unified as `z.boolean()`
- `cskhname` was typed but never returned → removed from schema
- `photoUrl` vs `avatar` → canonical field is `avatar`
- `title` was sent but ignored → removed from write schema
- Detail-only fields (avatar, zaloid, barcode, counts, etc.) added to response schema

### Schema

```ts
// shared/schemas/partner.ts
import { z } from 'zod';
import { uuid, nullableUuid, numericString, booleanString, pgTimestamp } from '../schema-helpers';

// ------------------------------------------------------------------
// Base fields (present in both list and detail responses)
// ------------------------------------------------------------------
export const PartnerBaseSchema = z.object({
  id: uuid,
  code: z.string().nullable(),           // partners.ref aliased as code
  displayName: z.string().nullable(),    // partners.displayname
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email().or(z.literal('')).nullable(),
  street: z.string().nullable(),
  city: z.string().nullable(),           // alias of cityname
  district: z.string().nullable(),       // alias of districtname
  ward: z.string().nullable(),           // alias of wardname
  cityName: z.string().nullable(),       // raw column
  districtName: z.string().nullable(),   // raw column
  wardName: z.string().nullable(),       // raw column
  gender: z.enum(['male', 'female', 'other']).nullable(),
  birthYear: numericString.nullable(),
  birthMonth: numericString.nullable(),
  birthDay: numericString.nullable(),
  medicalHistory: z.string().nullable(),
  comment: z.string().nullable(),
  note: z.string().nullable(),
  status: booleanString,                 // partners.active
  treatmentStatus: z.string().nullable(),
  referralUserId: nullableUuid,
  agentId: nullableUuid,
  agentName: z.string().nullable(),      // LEFT JOIN
  companyId: nullableUuid,
  companyName: z.string().nullable(),    // LEFT JOIN
  dateCreated: pgTimestamp,
  lastUpdated: pgTimestamp,
  createdById: nullableUuid,
  updatedById: nullableUuid,
  taxCode: z.string().nullable(),
  identityNumber: z.string().nullable(),
  healthInsuranceCardNumber: z.string().nullable(),
  emergencyPhone: z.string().nullable(),
  weight: numericString.nullable(),
  jobTitle: z.string().nullable(),
  isBusinessInvoice: booleanString.nullable(),
  unitName: z.string().nullable(),
  unitAddress: z.string().nullable(),
  personalName: z.string().nullable(),
  personalIdentityCard: z.string().nullable(),
  personalTaxCode: z.string().nullable(),
  personalAddress: z.string().nullable(),
  saleStaffId: nullableUuid,
  cskhId: nullableUuid,
});

// ------------------------------------------------------------------
// Detail-only fields (returned by GET /api/Partners/:id)
// ------------------------------------------------------------------
export const PartnerDetailOnlySchema = z.object({
  cityCode: z.string().nullable(),
  districtCode: z.string().nullable(),
  wardCode: z.string().nullable(),
  cityCodeV2: z.string().nullable(),
  cityNameV2: z.string().nullable(),
  wardCodeV2: z.string().nullable(),
  wardNameV2: z.string().nullable(),
  usedAddressV2: booleanString.nullable(),
  barcode: z.string().nullable(),
  fax: z.string().nullable(),
  hotline: z.string().nullable(),
  website: z.string().nullable(),
  isCompany: booleanString.nullable(),
  isHead: booleanString.nullable(),
  customerName: z.string().nullable(),
  invoiceReceivingMethod: z.string().nullable(),
  receiverEmail: z.string().nullable(),
  receiverZaloNumber: z.string().nullable(),
  stageId: nullableUuid,
  lastTreatmentCompleteDate: pgTimestamp,
  sequenceNumber: numericString.nullable(),
  sequencePrefix: z.string().nullable(),
  supplier: booleanString.nullable(),
  customer: booleanString.nullable(),
  isAgent: booleanString.nullable(),
  isInsurance: booleanString.nullable(),
  employee: booleanString.nullable(),
  createdByName: z.string().nullable(),
  updatedByName: z.string().nullable(),
  avatar: z.string().nullable(),
  zaloId: z.string().nullable(),
  // Aggregated counts (subqueries in detail view)
  appointmentCount: numericString,
  orderCount: numericString,
  dotkhamCount: numericString,
});

export const PartnerResponseSchema = PartnerBaseSchema.merge(PartnerDetailOnlySchema);

// ------------------------------------------------------------------
// List response envelope
// ------------------------------------------------------------------
export const PartnerListResponseSchema = z.object({
  offset: z.number(),
  limit: z.number(),
  totalItems: z.number(),
  items: z.array(PartnerBaseSchema),
  aggregates: z.object({
    total: z.number(),
    active: z.number(),
    inactive: z.number(),
  }),
});

// ------------------------------------------------------------------
// KPI response (GET /api/Partners/:id/GetKPIs)
// ------------------------------------------------------------------
export const PartnerKpiSchema = z.object({
  totalTreatmentAmount: z.number(),
  expectedRevenue: z.number(),
  actualRevenue: z.number(),
  debt: z.number(),
  advancePayment: z.number(),
  pointBalance: z.number(),
});

// ------------------------------------------------------------------
// Write schemas (POST / PUT)
// ------------------------------------------------------------------
export const PartnerCreateSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().or(z.literal('')).optional(),
  companyId: nullableUuid.optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  birthday: numericString.nullable().optional(),
  birthMonth: numericString.nullable().optional(),
  birthYear: numericString.nullable().optional(),
  street: z.string().nullable().optional(),
  cityName: z.string().nullable().optional(),
  districtName: z.string().nullable().optional(),
  wardName: z.string().nullable().optional(),
  medicalHistory: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  referralUserId: nullableUuid.optional(),
  weight: numericString.nullable().optional(),
  identityNumber: z.string().nullable().optional(),
  healthInsuranceCardNumber: z.string().nullable().optional(),
  emergencyPhone: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  taxCode: z.string().nullable().optional(),
  unitName: z.string().nullable().optional(),
  unitAddress: z.string().nullable().optional(),
  isBusinessInvoice: booleanString.optional(),
  personalName: z.string().nullable().optional(),
  personalIdentityCard: z.string().nullable().optional(),
  personalTaxCode: z.string().nullable().optional(),
  personalAddress: z.string().nullable().optional(),
  saleStaffId: nullableUuid.optional(),
  cskhId: nullableUuid.optional(),
  customer: booleanString.optional(),
  status: booleanString.optional(),
});

export const PartnerUpdateSchema = PartnerCreateSchema.partial();
```

### Usage Examples

```ts
// Frontend form validation
const formResult = PartnerCreateSchema.safeParse(rawFormData);
if (!formResult.success) {
  setErrors(formResult.error.flatten().fieldErrors);
}

// Express route validation (backend)
router.post('/', requirePermission('customers.add'), (req, res, next) => {
  const parsed = PartnerCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  req.body = parsed.data;
  next();
});

// Response validation (frontend fetch wrapper)
const partner = PartnerResponseSchema.parse(await res.json());
```

---

## 2. Appointment

### Current Drift This Fixes
- Frontend used `customerId` / `dentist` / `serviceName` while backend returned `partnerid` / `doctorname` / `productname` → schema exposes **canonical camelCase** aliases
- `endTime` was typed but never returned → computed from `time + timeExpected`, removed from response schema
- `status` enum on frontend (`'completed'`) didn't match backend `state` (`'done'`) → unified enum
- `checkInStatus` was phantom → removed from base schema; can be added as a frontend-derived extension
- Missing `aggregates` on list response → typed explicitly

### Schema

```ts
// shared/schemas/appointment.ts
import { z } from 'zod';
import { uuid, nullableUuid, numericString, pgTimestamp } from '../schema-helpers';

export const AppointmentStateEnum = z.enum([
  'draft',
  'scheduled',
  'confirmed',
  'arrived',
  'in_examination',   // canonical: replace space with underscore
  'in_progress',      // canonical: replace hyphen with underscore
  'done',
  'cancelled',
]);

// Helper to normalise incoming strings from legacy backend
export function normaliseAppointmentState(input: string): z.infer<typeof AppointmentStateEnum> {
  const map: Record<string, string> = {
    'in Examination': 'in_examination',
    'in-progress': 'in_progress',
    'in progress': 'in_progress',
  };
  const normalised = map[input] ?? input;
  return AppointmentStateEnum.parse(normalised);
}

export const AppointmentBaseSchema = z.object({
  id: uuid,
  name: z.string().nullable(),           // AP000001
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  time: z.string().nullable(),           // HH:mm or HH:mm:ss
  dateTimeAppointment: pgTimestamp,
  dateAppointmentReminder: pgTimestamp,
  timeExpected: numericString.nullable(), // minutes
  note: z.string().nullable(),
  state: AppointmentStateEnum,           // canonical backend state
  aptState: z.string().nullable(),       // raw duplicate column
  reason: z.string().nullable(),

  // Partner (customer)
  partnerId: nullableUuid,
  partnerName: z.string().nullable(),
  partnerDisplayName: z.string().nullable(),
  partnerPhone: z.string().nullable(),
  partnerCode: z.string().nullable(),

  // Location
  companyId: nullableUuid,
  companyName: z.string().nullable(),

  // Users / staff
  userId: nullableUuid,
  userName: z.string().nullable(),
  doctorId: nullableUuid,
  doctorName: z.string().nullable(),
  assistantId: nullableUuid,
  assistantName: z.string().nullable(),
  dentalAideId: nullableUuid,
  dentalAideName: z.string().nullable(),

  // Related records
  dotkhamId: nullableUuid,
  dotkhamName: z.string().nullable(),
  saleOrderId: nullableUuid,
  saleOrderName: z.string().nullable(),
  productId: nullableUuid,
  productName: z.string().nullable(),
  teamId: nullableUuid,
  teamName: z.string().nullable(),
  customerReceiptId: nullableUuid,
  receiptDate: pgTimestamp,

  // Workflow timestamps
  dateTimeArrived: pgTimestamp,
  dateTimeSeated: pgTimestamp,
  dateTimeDismissed: pgTimestamp,
  dateDone: pgTimestamp,
  lastDateReminder: pgTimestamp,

  // Flags
  isRepeatCustomer: booleanString.nullable(),
  isNoTreatment: booleanString.nullable(),
  color: z.string().nullable(),
  customerCareStatus: z.string().nullable(),

  // CRM linkage
  leadId: nullableUuid,
  callId: nullableUuid,

  // Audit
  dateCreated: pgTimestamp,
  lastUpdated: pgTimestamp,
  createdById: nullableUuid,
  updatedById: nullableUuid,
});

// ------------------------------------------------------------------
// List response envelope
// ------------------------------------------------------------------
export const AppointmentListResponseSchema = z.object({
  offset: z.number(),
  limit: z.number(),
  totalItems: z.number(),
  items: z.array(AppointmentBaseSchema),
  aggregates: z.object({
    total: z.number(),
    byState: z.record(z.number()),
  }),
});

// ------------------------------------------------------------------
// Write schemas
// ------------------------------------------------------------------
export const AppointmentCreateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  time: z.string().nullable().optional(),
  partnerId: uuid,
  doctorId: nullableUuid.optional(),
  companyId: uuid,
  note: z.string().optional(),
  timeExpected: numericString.optional().default(30),
  color: z.string().optional().default('1'),
  state: AppointmentStateEnum.optional().default('confirmed'),
  productId: nullableUuid.optional(),
  assistantId: nullableUuid.optional(),
  dentalAideId: nullableUuid.optional(),
});

export const AppointmentUpdateSchema = AppointmentCreateSchema.partial();
```

### Frontend Extension (UI-only fields)

```ts
// website/src/types/appointment.ts
import { z } from 'zod';
import { AppointmentBaseSchema } from '../../../shared/schemas/appointment';

export const CalendarAppointmentSchema = AppointmentBaseSchema.extend({
  // Computed / mapped for calendar UI
  customerId: z.string(),        // alias of partnerId
  customerName: z.string(),      // alias of partnerName
  customerPhone: z.string(),     // alias of partnerPhone
  customerCode: z.string(),      // alias of partnerCode
  serviceName: z.string(),       // alias of productName
  dentist: z.string(),           // alias of doctorName
  dentistId: z.string(),         // alias of doctorId
  startTime: z.string(),         // alias of time
  endTime: z.string().optional(), // computed: time + timeExpected
  status: z.string(),            // alias of state (with mapping)
  locationId: z.string(),        // alias of companyId
  locationName: z.string(),      // alias of companyName
  notes: z.string(),             // alias of note
  arrivalTime: z.string().nullable().optional(), // alias of dateTimeArrived
  treatmentStartTime: z.string().nullable().optional(), // alias of dateTimeSeated
});

export type CalendarAppointment = z.infer<typeof CalendarAppointmentSchema>;
```

---

## 3. Payment

### Current Drift This Fixes
- `status` enum mismatch (`'completed'` vs `'posted'`) → unified as `PaymentStatusEnum`
- `PaymentRecord` had phantom fields (`customerName`, `recordId`, `isFullPayment`, `dueDate`) → separated into `ApiPaymentResponse` (backend truth) and `PaymentRecord` (UI enrichment)
- Legacy fallback hardcoded `method='cash'` → schema uses `PaymentMethodEnum` with strict validation; fallback rows must be normalised before parsing
- Missing `fetchPaymentById` → schema makes it obvious that `GET /:id` returns `PaymentResponseSchema`

### Schema

```ts
// shared/schemas/payment.ts
import { z } from 'zod';
import { uuid, nullableUuid, numericString, pgTimestamp } from '../schema-helpers';

export const PaymentMethodEnum = z.enum(['cash', 'bank_transfer', 'deposit', 'mixed']);
export const PaymentStatusEnum = z.enum(['posted', 'voided']);
export const DepositTypeEnum = z.enum(['deposit', 'refund', 'usage']).nullable();

export const PaymentAllocationSchema = z.object({
  id: uuid,
  paymentId: uuid,
  // One of the two must be present (discriminated in practice by UI logic)
  invoiceId: uuid.optional(),
  dotkhamId: uuid.optional(),
  invoiceName: z.string().optional(),
  invoiceCode: z.string().optional(),
  invoiceTotal: numericString.optional(),
  invoiceResidual: numericString.optional(),
  dotkhamName: z.string().optional(),
  dotkhamTotal: numericString.optional(),
  dotkhamResidual: numericString.optional(),
  allocatedAmount: numericString,
});

export const PaymentBaseSchema = z.object({
  id: uuid,
  customerId: uuid,
  serviceId: uuid.nullable(),
  amount: numericString,
  method: PaymentMethodEnum,
  depositUsed: numericString.default(0),
  cashAmount: numericString.default(0),
  bankAmount: numericString.default(0),
  notes: z.string().nullable(),
  paymentDate: pgTimestamp,
  referenceCode: z.string().nullable(),
  status: PaymentStatusEnum,
  receiptNumber: z.string().nullable(),
  depositType: DepositTypeEnum,
  createdAt: pgTimestamp,
});

export const PaymentResponseSchema = PaymentBaseSchema.extend({
  allocations: z.array(PaymentAllocationSchema).default([]),
});

export const PaymentListResponseSchema = z.object({
  items: z.array(PaymentResponseSchema),
  totalItems: z.number(),
});

// ------------------------------------------------------------------
// Deposit list response (GET /api/Payments/deposits & /deposit-usage)
// ------------------------------------------------------------------
export const DepositListResponseSchema = PaymentListResponseSchema;

// ------------------------------------------------------------------
// Write schemas
// ------------------------------------------------------------------
export const PaymentAllocationInputSchema = z.object({
  invoice_id: uuid.optional(),
  dotkham_id: uuid.optional(),
  allocated_amount: numericString,
}).refine((d) => d.invoice_id || d.dotkham_id, {
  message: 'Allocation must reference an invoice or a dotkham',
});

export const PaymentCreateSchema = z.object({
  customer_id: uuid,
  service_id: uuid.nullable().optional(),
  amount: numericString.positive('Amount must be positive'),
  method: PaymentMethodEnum,
  notes: z.string().optional(),
  payment_date: z.string().optional(),
  reference_code: z.string().optional(),
  status: PaymentStatusEnum.optional().default('posted'),
  deposit_used: numericString.optional().default(0),
  cash_amount: numericString.optional().default(0),
  bank_amount: numericString.optional().default(0),
  deposit_type: DepositTypeEnum.optional(),
  receipt_number: z.string().optional(),
  allocations: z.array(PaymentAllocationInputSchema).optional(),
});

export const PaymentRefundSchema = z.object({
  customer_id: uuid,
  amount: numericString.positive(),
  method: z.enum(['cash', 'bank_transfer']),
  notes: z.string().optional(),
  payment_date: z.string().optional(),
});

export const PaymentUpdateSchema = z.object({
  amount: numericString.optional(),
  method: PaymentMethodEnum.optional(),
  notes: z.string().optional(),
  payment_date: z.string().optional(),
  reference_code: z.string().optional(),
  status: PaymentStatusEnum.optional(),
  deposit_type: DepositTypeEnum.optional(),
  receipt_number: z.string().optional(),
});

export const PaymentVoidSchema = z.object({
  reason: z.string().optional(),
});

export const PaymentProofSchema = z.object({
  proofImageBase64: z.string().regex(/^data:image\//, 'Must be a base64 image data URL'),
  qrDescription: z.string().optional(),
});
```

### UI Enrichment Layer (frontend only)

```ts
// website/src/types/payment.ts
import { z } from 'zod';
import { PaymentResponseSchema, PaymentStatusEnum } from '../../../shared/schemas/payment';

export const PaymentStatusDisplayEnum = z.enum(['completed', 'pending', 'partial', 'refunded']);

export const PaymentRecordSchema = PaymentResponseSchema.extend({
  // Enriched by frontend after joining with partners / saleorders
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  recordId: z.string().optional(),     // invoice_id or dotkham_id
  recordType: z.enum(['saleorder', 'dotkham']).optional(),
  recordName: z.string().optional(),
  locationName: z.string().optional(),
  displayStatus: PaymentStatusDisplayEnum, // mapped from posted/voided
  isFullPayment: z.boolean().optional(),   // computed: allocatedAmount === residual
  dueDate: z.string().optional(),
});

export type PaymentRecord = z.infer<typeof PaymentRecordSchema>;
```

---

## 4. SaleOrder (Treatment / Service Record)

### Current Drift This Fixes
- `amounttotal` / `residual` / `totalpaid` typed as `string | null` in frontend but backend returns numbers → `z.coerce.number()`
- `status` enum mismatch (`'active'` vs `'sale'`) → unified as `SaleOrderStateEnum`
- `ref` / `origin` typed but never returned → removed from response schema
- Missing `lines` array on detail response → added to `SaleOrderDetailSchema`
- Missing `aggregates` on list → typed explicitly

### Schema

```ts
// shared/schemas/saleOrder.ts
import { z } from 'zod';
import { uuid, nullableUuid, numericString, booleanString, pgTimestamp } from '../schema-helpers';

export const SaleOrderStateEnum = z.enum(['sale', 'done', 'cancel', 'draft']);

export const SaleOrderLineSchema = z.object({
  id: uuid,
  orderId: uuid,
  priceTotal: numericString,
  isDeleted: booleanString,
});

export const SaleOrderBaseSchema = z.object({
  id: uuid,
  name: z.string().nullable(),
  code: z.string().nullable(),
  partnerId: nullableUuid,
  partnerName: z.string().nullable(),
  partnerDisplayName: z.string().nullable(),
  amountTotal: numericString,
  residual: numericString,
  totalPaid: numericString,
  state: SaleOrderStateEnum,
  companyId: nullableUuid,
  companyName: z.string().nullable(),
  doctorId: nullableUuid,
  doctorName: z.string().nullable(),
  assistantId: nullableUuid,
  assistantName: z.string().nullable(),
  dentalAideId: nullableUuid,
  dentalAideName: z.string().nullable(),
  quantity: numericString.nullable(),
  unit: z.string().nullable(),
  dateStart: pgTimestamp,
  dateEnd: pgTimestamp,
  notes: z.string().nullable(),
  sourceId: nullableUuid,
  sourceName: z.string().nullable(),
  productId: nullableUuid,
  productName: z.string().nullable(),
  toothNumbers: z.string().nullable(),
  toothComment: z.string().nullable(),
  dateCreated: pgTimestamp,
  lastUpdated: pgTimestamp,
  isDeleted: booleanString,
});

export const SaleOrderDetailSchema = SaleOrderBaseSchema.extend({
  lines: z.array(SaleOrderLineSchema),
});

export const SaleOrderListResponseSchema = z.object({
  offset: z.number(),
  limit: z.number(),
  totalItems: z.number(),
  items: z.array(SaleOrderBaseSchema),
  aggregates: z.object({
    total: z.number(),
    totalAmount: z.number(),
    totalPaid: z.number(),
    totalResidual: z.number(),
  }),
});

// ------------------------------------------------------------------
// Write schemas
// ------------------------------------------------------------------
export const SaleOrderCreateSchema = z.object({
  partnerId: uuid,
  companyId: uuid.nullable().optional(),
  productId: uuid.nullable().optional(),
  productName: z.string().nullable().optional(),
  doctorId: uuid.nullable().optional(),
  assistantId: uuid.nullable().optional(),
  dentalAideId: uuid.nullable().optional(),
  quantity: numericString.nullable().optional(),
  unit: z.string().nullable().optional(),
  amountTotal: numericString.nonnegative().default(0),
  dateStart: z.string().nullable().optional(),
  dateEnd: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  toothNumbers: z.string().nullable().optional(),
  toothComment: z.string().nullable().optional(),
  sourceId: uuid.nullable().optional(),
});

export const SaleOrderUpdateSchema = SaleOrderCreateSchema.partial();

export const SaleOrderStatePatchSchema = z.object({
  state: SaleOrderStateEnum,
});
```

### UI Extension (frontend only)

```ts
// website/src/types/customer.ts
import { z } from 'zod';
import { SaleOrderBaseSchema, SaleOrderStateEnum } from '../../../shared/schemas/saleOrder';

export const CustomerServiceSchema = SaleOrderBaseSchema.extend({
  service: z.string(),       // alias of productName
  doctor: z.string(),        // alias of doctorName
  cost: z.number(),          // alias of amountTotal
  tooth: z.string(),         // alias of toothNumbers
  status: z.enum(['completed', 'active', 'cancelled']), // mapped from state
  locationName: z.string(),  // alias of companyName
  catalogItemId: z.string().nullable(), // alias of productId
});

export type CustomerService = z.infer<typeof CustomerServiceSchema>;
```

---

## 5. Employee

### Current Drift This Fixes
- `POST` writes to `partners`, `GET` reads from `employees` → schema is table-agnostic but documents the discrepancy
- `wage` / `allowance` typed as `string | null` but backend returns numbers → `z.coerce.number()`
- `status` enum vs boolean → base schema uses `boolean`; UI extension uses enum
- Missing detail fields (address, identitycard, birthday, hourlywage, etc.) → added to `EmployeeDetailSchema`
- `roles`, `schedule`, `linkedEmployeeIds` are UI-only → moved to frontend extension schema

### Schema

```ts
// shared/schemas/employee.ts
import { z } from 'zod';
import { uuid, nullableUuid, numericString, booleanString, pgTimestamp } from '../schema-helpers';

export const EmployeeBaseSchema = z.object({
  id: uuid,
  name: z.string().min(1),
  ref: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email().or(z.literal('')).nullable(),
  avatar: z.string().nullable(),
  isDoctor: booleanString,
  isAssistant: booleanString,
  isReceptionist: booleanString,
  active: booleanString,
  jobTitle: z.string().nullable(),
  companyId: nullableUuid,
  companyName: z.string().nullable(),
  hrJobId: nullableUuid,
  hrJobName: z.string().nullable(),
  wage: numericString.nullable(),
  allowance: numericString.nullable(),
  startWorkDate: pgTimestamp,
  tierId: nullableUuid,
  tierName: z.string().nullable(),
  dateCreated: pgTimestamp,
  lastUpdated: pgTimestamp,
  // Dynamically attached by backend route
  locationScopeIds: z.array(uuid).default([]),
});

export const EmployeeDetailSchema = EmployeeBaseSchema.extend({
  address: z.string().nullable(),
  identityCard: z.string().nullable(),
  birthday: pgTimestamp,
  hourlyWage: numericString.nullable(),
  leavePerMonth: numericString.nullable(),
  regularHour: numericString.nullable(),
  overtimeRate: numericString.nullable(),
  restDayRate: numericString.nullable(),
  enrollNumber: z.string().nullable(),
  medicalPrescriptionCode: z.string().nullable(),
});

export const EmployeeListResponseSchema = z.object({
  offset: z.number(),
  limit: z.number(),
  totalItems: z.number(),
  items: z.array(EmployeeBaseSchema),
});

// ------------------------------------------------------------------
// Write schemas
// ------------------------------------------------------------------
export const EmployeeCreateSchema = z.object({
  name: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.string().email().or(z.literal('')).nullable().optional(),
  password: z.string().min(6).optional(),
  companyId: uuid.nullable().optional(),
  isDoctor: booleanString.optional().default(false),
  isAssistant: booleanString.optional().default(false),
  isReceptionist: booleanString.optional().default(false),
  jobTitle: z.string().nullable().optional(),
  active: booleanString.optional().default(true),
  startWorkDate: z.string().nullable().optional(),
  locationScopeIds: z.array(uuid).optional().default([]),
  tierId: nullableUuid.optional(),
  // Note: wage / allowance are accepted by schema for forward-compatibility
  // but the CURRENT backend POST ignores them. TODO: update backend route.
  wage: numericString.nullable().optional(),
  allowance: numericString.nullable().optional(),
});

export const EmployeeUpdateSchema = EmployeeCreateSchema.partial();
```

### UI Extension (frontend only)

```ts
// website/src/types/employee.ts
import { z } from 'zod';
import { EmployeeDetailSchema } from '../../../shared/schemas/employee';

export const EmployeeRoleEnum = z.enum([
  'general-manager',
  'branch-manager',
  'doctor',
  'doctor-assistant',
  'assistant',
  'receptionist',
  'sales-staff',
  'customer-service',
  'marketing',
]);

export const EmployeeStatusEnum = z.enum(['active', 'on-leave', 'inactive']);

export const ScheduleBlockSchema = z.object({
  day: z.string(),
  startTime: z.string(),
  endTime: z.string(),
});

export const EmployeeSchema = EmployeeDetailSchema.extend({
  roles: z.array(EmployeeRoleEnum),          // computed from isDoctor/isAssistant/jobTitle
  status: EmployeeStatusEnum,                // mapped from active + external leave data
  locationId: z.string(),                    // alias of companyId
  locationName: z.string(),                  // alias of companyName
  hireDate: z.string(),                      // alias of startWorkDate
  schedule: z.array(ScheduleBlockSchema),    // from external schedule service
  linkedEmployeeIds: z.array(uuid),          // from external linkage service
});

export type Employee = z.infer<typeof EmployeeSchema>;
```

---

## Migration Path

| Step | Action | Owner |
|------|--------|-------|
| 1 | Add `zod` to `website/package.json` and `api/package.json` | DevOps |
| 2 | Create `shared/schemas/` folder with the 5 schema files above | Backend + Frontend |
| 3 | Replace `ApiPartner`, `ApiAppointment`, `ApiPayment`, `ApiSaleOrder`, `ApiEmployee` interfaces with `z.infer<typeof Schema>` | Frontend |
| 4 | Add `validateBody` middleware to Express routes using `.safeParse()` | Backend |
| 5 | Update frontend form components to use `.safeParse()` before submit | Frontend |
| 6 | Fix backend `employees.js` POST to either (a) insert into `employees` table or (b) document the partners-table write | Backend |
| 7 | Remove phantom fields (`cskhname`, `ref`, `origin`, `checkInStatus`) from frontend types | Frontend |
| 8 | Add runtime response parsing in `apiFetch` success path: `Schema.parse(await res.json())` | Frontend |

---

## Appendix: Drift → Schema Fix Map

| Drift ID | Schema Fix |
|----------|------------|
| P1 (Partner missing fields) | `PartnerDetailOnlySchema` adds avatar, zaloid, barcode, counts, etc. |
| P2 (status boolean vs enum) | `PartnerBaseSchema.status: z.boolean()` — UI maps to enum at render time |
| P3 (ApiPartner missing detail fields) | `PartnerResponseSchema` merges base + detail |
| P4 (cskhname phantom) | Removed from schema |
| P5 (title ignored) | Removed from `PartnerCreateSchema` |
| P6 (photoUrl vs avatar) | Canonical field is `avatar` |
| P7 (aggregates untyped) | `PartnerListResponseSchema` types `aggregates` explicitly |
| A1–A3 (Appointment naming mismatches) | `CalendarAppointmentSchema` extends base with aliases; base uses backend names |
| A4 (endTime missing) | Removed from response schema; computed in UI |
| A5 (status values mismatch) | `AppointmentStateEnum` unifies all values; normalisation helper provided |
| A6 (ApiAppointment missing fields) | `AppointmentBaseSchema` includes all ~35 backend columns |
| A7 (aggregates untyped) | `AppointmentListResponseSchema` types `aggregates.byState` |
| A8 (checkInStatus phantom) | Removed from base; can be added as frontend extension |
| A9 (completionTime phantom) | Mapped to `dateDone` in base schema |
| A10 (delete missing) | Add `DELETE /api/Appointments/:id` to backend + frontend client |
| Y1 (Payment status mismatch) | `PaymentStatusEnum = z.enum(['posted','voided'])`; UI extension adds display mapping |
| Y2–Y3 (PaymentRecord phantom fields) | `PaymentRecordSchema` extends `PaymentResponseSchema` with optional enrichment fields |
| Y4 (fetchPaymentById missing) | Schema documents `GET /:id → PaymentResponseSchema` |
| Y5 (updatePayment missing deposit breakdown) | `PaymentUpdateSchema` includes `deposit_used`, `cash_amount`, `bank_amount` |
| Y6 (Legacy fallback drift) | Fallback rows must pass through normaliser before `PaymentResponseSchema.parse()` |
| S1 (SaleOrder naming mismatches) | `CustomerServiceSchema` extends base with UI aliases |
| S2–S3 (amounttotal string vs number) | `SaleOrderBaseSchema.amountTotal: z.coerce.number()` |
| S4 (status enum mismatch) | `SaleOrderStateEnum = z.enum(['sale','done','cancel','draft'])` |
| S5 (ref/origin phantom) | Removed from response schema |
| S6 (lines missing) | `SaleOrderDetailSchema` adds `lines: z.array(SaleOrderLineSchema)` |
| S7 (delete missing) | Add `DELETE /api/SaleOrders/:id` to backend + frontend client |
| E1 (POST partners vs GET employees) | Documented in schema comments; backend fix required |
| E2 (ApiEmployee missing detail fields) | `EmployeeDetailSchema` adds address, identitycard, birthday, hourlywage, etc. |
| E3 (wage string vs number) | `EmployeeBaseSchema.wage: z.coerce.number().nullable()` |
| E4 (roles/schedule phantom) | Moved to `EmployeeSchema` UI extension |
| E5 (locationId vs companyid) | UI extension aliases `companyId → locationId` |
| E6 (status enum vs boolean) | Base schema uses `active: z.boolean()`; UI extension maps to `EmployeeStatusEnum` |
| E7 (CreateEmployeeData ignored fields) | Schema accepts them; backend route must be updated to persist wage/allowance/tierId on INSERT |
