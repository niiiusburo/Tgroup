# TMV Cosmetic Feedback Bugs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every currently pending Cosmetic feedback workflow on `https://tmv.2checkin.com`: appointment save, customer create, employee branch scoping, deposit/payment usage, and feedback queue hygiene.

**Architecture:** Treat the feedback page as the intake queue, but fix root causes in the shared Cosmetic LOB data path. The permanent pattern is to pass the active `currentLOB` into every customer, appointment, employee, payment, deposit, and permission API client so Cosmetic writes hit `/api/cosmetic/*` and Dental continues to use legacy top-level `/api/*`.

**Tech Stack:** React, TypeScript, Vite, Express, PostgreSQL dual pools through `getQuery(req)`, Jest, Vitest, Playwright, Semgrep, TestSprite ledger in `testbright.md`.

---

## Current Live Feedback Snapshot

Source checked: `https://tmv.2checkin.com/feedback?lob=cosmetic`

- Manual feedback: 16 total, 6 pending, 10 resolved.
- Auto-detected errors: 435 total, 435 pending.
- Live feedback page health: `GET /api/Feedback/unread-count` 200, `GET /api/Feedback/all` 200, no browser console/page errors during verification.
- Screenshot artifacts:
  - `output/playwright/tmv-feedback-check-20260524T025532Z/feedback-cosmetic-live.png`
  - `output/playwright/tmv-feedback-check-20260524T025532Z/feedback-auto-errors-live.png`

Pending manual feedback groups:

1. Appointment save fails from customer profile.
2. Appointment save fails from calendar.
3. Customer has deposit, but payment modal does not show usable deposit.
4. Deposit paid but customer deposit balance does not show it.
5. Employee add form shows Dental branches instead of Cosmetic branches.
6. New customer save fails.

Auto-error groups to triage:

1. `POST /SaleOrders failed (500)` on TMV customer profile.
2. `Partner with given partnerId does not exist` on appointment create.
3. `POST /Partners failed (500)` on customer create.
4. `POST /Employees failed (500)` on employee create.
5. Old staging/retired-host noise from `ctv.2checkin.com`, `nk2.2checkin.com`, `76-13-16-68.sslip.io`, and `76.13.16.68:5375`.

---

## Execution Model

Because this crosses multiple workflows, split execution into subagents:

- Agent A: Appointment save root cause and tests.
- Agent B: Customer create and employee branch LOB scoping.
- Agent C: Deposit/payment usage and balance root cause.
- Agent D: Feedback queue hygiene, stale-host filtering, and status update policy.
- Reviewer: independent review of all diffs, TestSprite ledger, live screenshots, Semgrep, and deploy proof.

Use a clean worktree for implementation. The current root checkout has unrelated dirty files.

```bash
cd /Users/thuanle/Documents/TamTMV/Tgrouptest
git fetch origin
git worktree add .worktrees/tmv-cosmetic-feedback-fixes -b codex/tmv-cosmetic-feedback-fixes origin/main
cd .worktrees/tmv-cosmetic-feedback-fixes
bash /Users/thuanle/Documents/TamTMV/Tgrouptest/scripts/prompt-authority-check.sh
```

Expected: authority check passes and the working tree starts clean.

---

## Files To Touch

Shared frontend API plumbing:

- Modify `website/src/lib/api/appointments.ts`
- Modify `website/src/lib/api/partners.ts`
- Modify `website/src/lib/api/payments.ts`
- Modify `website/src/lib/api/employees.ts`
- Modify `website/src/lib/api/permissions.ts`
- Add or extend `website/src/lib/api/__tests__/apiFetch.lob.test.ts`

Appointment workflow:

- Modify `website/src/components/appointments/unified/useAppointmentForm.ts`
- Modify `website/src/components/appointments/unified/__tests__/useAppointmentForm.test.ts`
- Modify `website/src/hooks/useAppointments.ts`
- Add or extend `website/src/hooks/__tests__/useAppointments.lob.test.ts`

Customer workflow:

- Modify `website/src/components/forms/AddCustomerForm/useAddCustomerForm.ts`
- Modify `website/src/components/forms/AddCustomerForm/AddCustomerForm.test.tsx`
- Modify `website/src/hooks/useCustomers.ts`
- Add or extend `website/src/hooks/__tests__/useCustomers.lob.test.ts`

Employee workflow:

- Modify `website/src/components/employees/EmployeeForm.tsx`
- Add or extend `website/src/components/employees/EmployeeForm.lob.test.tsx`
- Modify `website/src/hooks/useEmployees.ts`
- Add or extend `website/src/hooks/__tests__/useEmployees.lob.test.ts`

Deposit/payment workflow:

- Modify `website/src/hooks/useDeposits.ts`
- Modify `website/src/hooks/useCustomerPayments.ts`
- Modify `website/src/hooks/usePayment.ts`
- Modify `website/src/components/payment/PaymentForm.tsx` only if the data flow still passes stale or missing `depositBalance`.
- Add or extend `website/src/hooks/__tests__/useCustomerPayments.lob.test.ts`
- Add or extend `website/src/hooks/useDeposits.test.tsx`
- Add or extend `website/src/components/payment/__tests__/PaymentForm.submit.test.tsx`

Backend confirmation or fixes:

- Inspect `api/src/server.js` for Cosmetic route mirrors.
- Inspect `api/src/routes/appointments/mutationHandlers.js`
- Inspect `api/src/routes/partners/mutationHandlers.js`
- Inspect `api/src/routes/employees.js`
- Inspect `api/src/routes/payments.js`
- Inspect `api/src/routes/customerBalance.js`
- Add route mirror tests under `api/src/__tests__/cosmeticAdminMirrors.test.js` if any missing mirrors are found.

Feedback hygiene:

- Modify `website/src/components/settings/FeedbackAdminContent.tsx` if the UI needs current-host/source filtering.
- Modify `website/src/lib/api/feedback.ts` if backend query params are added.
- Modify `api/src/routes/feedback.js` if filtering or status update policy needs backend support.

Governance and verification:

- Modify `testbright.md`
- Modify `docs/CHANGELOG.md`
- Modify `docs/TEST-MATRIX.md`
- Modify `product-map/contracts/api-index.md` if API contracts change.
- Bump `website/package.json` and `website/package-lock.json` for runtime website changes.

---

## Task 1: Freeze Live Reproduction And Feedback IDs

- [ ] Pull exact pending manual feedback and top auto-error IDs.

Run:

```bash
node - <<'NODE'
const { request } = require('playwright');
(async () => {
  const base = 'https://tmv.2checkin.com';
  const api = await request.newContext({ baseURL: base, ignoreHTTPSErrors: true });
  const login = await api.post('/api/Auth/login', { data: { email: 't@clinic.vn', password: '123123' } });
  if (!login.ok()) throw new Error(`login failed ${login.status()}`);
  const { token } = await login.json();
  const authed = await request.newContext({ baseURL: base, extraHTTPHeaders: { Authorization: `Bearer ${token}` }, ignoreHTTPSErrors: true });
  for (const source of ['manual', 'auto']) {
    const res = await authed.get(`/api/Feedback/all?source=${source}`);
    const body = await res.json();
    console.log(source, body.items.length);
    console.log(JSON.stringify(body.items.slice(0, 20).map((x) => ({
      id: x.id,
      pagePath: x.pagePath,
      status: x.status,
      updatedAt: x.updatedAt,
      message: x.firstMessage,
      api: x.errorApiEndpoint,
      host: x.pageUrl,
    })), null, 2));
  }
})();
NODE
```

Expected: manual count is `16`, pending manual count is `6`, auto count is around `435`.

- [ ] Add the current feedback queue to `testbright.md`.

Required TestSprite section:

```markdown
# TestSprite Plan: TMV Cosmetic Feedback Queue Fixes

Feature/edit name: TMV Cosmetic Feedback Queue Fixes

Changed URLs and API routes:
- `https://tmv.2checkin.com/feedback?lob=cosmetic`
- `https://tmv.2checkin.com/calendar?lob=cosmetic`
- `https://tmv.2checkin.com/customers?lob=cosmetic`
- `https://tmv.2checkin.com/customers/:id?lob=cosmetic`
- `https://tmv.2checkin.com/employees?lob=cosmetic`
- `POST/PUT /api/cosmetic/Appointments`
- `POST/PUT /api/cosmetic/Partners`
- `POST/PUT /api/cosmetic/Employees`
- `GET/POST /api/cosmetic/Payments`
- `GET /api/cosmetic/Payments/deposits`
- `GET /api/cosmetic/Payments/deposit-usage`
- `GET /api/cosmetic/CustomerBalance/:id`

Affected data flows:
- Cosmetic appointment creation from calendar and customer profile.
- Cosmetic customer create/edit and assignment selectors.
- Cosmetic employee create/edit and branch/permission selectors.
- Cosmetic deposit balance and service payment using deposit wallet.
- Feedback page current-host/current-LOB triage.

User roles:
- Admin with both Dental and Cosmetic LOB access.
- Cosmetic staff with customer, appointment, employee, and payment permissions.

Happy paths:
- Appointment create succeeds from Cosmetic calendar.
- Appointment create succeeds from Cosmetic customer profile.
- Customer create succeeds under Cosmetic and writes to `/api/cosmetic/Partners`.
- Employee create shows only Cosmetic branches and writes to `/api/cosmetic/Employees`.
- Payment modal shows the Cosmetic customer's active deposit balance and can use deposit funds.

Edge cases:
- Dental mode remains top-level `/api/*`.
- Cosmetic mode never writes Dental customers, appointments, employees, or payments.
- Stale feedback from retired hosts is not mixed into current TMV Cosmetic triage by default.
```

Expected: `testbright.md` contains a root-level TestSprite plan before code is changed.

---

## Task 2: Add LOB-Aware API Client Signatures

- [ ] Update appointment API client signatures.

Change `website/src/lib/api/appointments.ts` so every function accepts `lob?: 'dental' | 'cosmetic'`:

```ts
type Lob = 'dental' | 'cosmetic';

export function fetchAppointments(params?: {
  offset?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  dateFrom?: string;
  dateTo?: string;
  state?: string;
  doctorId?: string;
  partnerId?: string;
  calendarMode?: boolean;
  includeCounts?: boolean;
  lob?: Lob;
}) {
  return apiFetch<PaginatedResponse<ApiAppointment>>('/Appointments', {
    lob: params?.lob,
    params: { /* existing params unchanged */ },
  });
}

export function createAppointment(data: Partial<ApiAppointment>, lob?: Lob) {
  return apiFetch<ApiAppointment>('/Appointments', { method: 'POST', body: data, lob });
}

export function updateAppointment(id: string, data: Partial<ApiAppointment>, lob?: Lob) {
  return apiFetch<ApiAppointment>(`/Appointments/${id}`, { method: 'PUT', body: data, lob });
}
```

- [ ] Update partner/customer API client signatures.

Change `website/src/lib/api/partners.ts`:

```ts
type Lob = 'dental' | 'cosmetic';

export function fetchPartners(params?: {
  offset?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  status?: 'active' | 'inactive' | 'pending';
  lob?: Lob;
}) {
  return apiFetch<PartnersResponse>('/Partners', {
    lob: params?.lob,
    params: { /* existing params unchanged */ },
  });
}

export function fetchPartnerById(id: string, lob?: Lob) {
  return apiFetch<ApiPartner>(`/Partners/${id}`, { lob });
}

export function createPartner(data: Partial<ApiPartner>, lob?: Lob) {
  return apiFetch<ApiPartner>('/Partners', { method: 'POST', body: data, lob });
}

export function updatePartner(id: string, data: Partial<ApiPartner>, lob?: Lob) {
  return apiFetch<ApiPartner>(`/Partners/${id}`, { method: 'PUT', body: data, lob });
}
```

- [ ] Update employees API client signatures.

Change `website/src/lib/api/employees.ts`:

```ts
type Lob = 'dental' | 'cosmetic';

export function createEmployee(data: CreateEmployeeData, lob?: Lob) {
  return apiFetch<ApiEmployee>('/Employees', { method: 'POST', body: data, lob });
}

export function updateEmployee(id: string, data: Partial<CreateEmployeeData>, lob?: Lob) {
  return apiFetch<ApiEmployee>(`/Employees/${id}`, { method: 'PUT', body: data, lob });
}

export function fetchEmployees(params?: {
  offset?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  isDoctor?: boolean;
  isAssistant?: boolean;
  active?: 'true' | 'false' | 'all';
  lob?: Lob;
}) {
  return apiFetch<PaginatedResponse<ApiEmployee>>('/Employees', {
    lob: params?.lob,
    params: { /* existing params unchanged */ },
  });
}
```

- [ ] Update payments API client signatures.

Change `website/src/lib/api/payments.ts` so `fetchPayments`, `createPayment`, `fetchDeposits`, `fetchDepositUsage`, `createRefund`, `updatePayment`, `voidPayment`, and `deletePayment` all accept `lob?: Lob` and pass it to `apiFetch`.

Example:

```ts
export async function createPayment(data: CreatePaymentInput, lob?: Lob): Promise<ApiPayment> {
  return apiFetch<ApiPayment>('/Payments', {
    method: 'POST',
    lob,
    body: { /* existing body unchanged */ },
  });
}
```

- [ ] Run focused API-client tests.

Run:

```bash
npm --prefix website run test -- src/lib/api/__tests__/apiFetch.lob.test.ts
```

Expected: tests prove `lob: 'cosmetic'` produces `/api/cosmetic/*` and auth routes/feedback routes stay global.

---

## Task 3: Fix Appointment Save In Cosmetic

Root cause to prove or disprove: appointment create/update calls are still writing through top-level `/api/Appointments` from at least one form path, causing Cosmetic customer IDs to be looked up in Dental.

- [ ] Add failing test for `useAppointmentForm`.

Modify `website/src/components/appointments/unified/__tests__/useAppointmentForm.test.ts`:

```ts
vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnit: () => ({ currentLOB: 'cosmetic' }),
}));

it('creates cosmetic appointments through the active LOB', async () => {
  const { result } = renderHook(() => useAppointmentForm({ mode: 'create' }));
  await act(async () => {
    await result.current.submit(validAppointmentFormData);
  });
  expect(createAppointment).toHaveBeenCalledWith(expect.any(Object), 'cosmetic');
});

it('updates cosmetic appointments through the active LOB', async () => {
  const { result } = renderHook(() => useAppointmentForm({ mode: 'edit', initialData: validExistingAppointment }));
  await act(async () => {
    await result.current.submit(validExistingAppointment);
  });
  expect(updateAppointment).toHaveBeenCalledWith(validExistingAppointment.id, expect.any(Object), 'cosmetic');
});
```

Run:

```bash
npm --prefix website run test -- src/components/appointments/unified/__tests__/useAppointmentForm.test.ts
```

Expected before fix: fails because `createAppointment` and `updateAppointment` receive no LOB argument.

- [ ] Implement the minimal LOB pass-through.

Modify `website/src/components/appointments/unified/useAppointmentForm.ts`:

```ts
import { useBusinessUnit } from '@/contexts/BusinessUnitContext';

export function useAppointmentForm(...) {
  const { currentLOB } = useBusinessUnit();

  // ...
  if (mode === 'edit' && data.id) {
    await updateAppointment(data.id, payload, currentLOB);
  } else {
    await createAppointment(payload, currentLOB);
  }
}
```

- [ ] Fix `useAppointments` create/update path.

Modify `website/src/hooks/useAppointments.ts`:

```ts
const { currentLOB } = useBusinessUnit();

const created = await apiCreateAppointment(apiPayload, currentLOB);
await apiUpdateAppointment(appointmentId, apiPayload, currentLOB);
```

- [ ] Verify backend mirror exists.

Check:

```bash
rg -n "cosmeticRouter.use\\('/Appointments'" api/src/server.js
rg -n "getQuery\\(req\\)|req.db" api/src/routes/appointments api/src/routes/appointments.js
```

Expected: `/api/cosmetic/Appointments` is mounted and mutation handlers use request-scoped DB access.

- [ ] Live/browser proof.

Use Playwright to create one Cosmetic appointment from:

- `https://tmv.2checkin.com/calendar?lob=cosmetic`
- `https://tmv.2checkin.com/customers/3da41004-c1ee-4117-a2ed-56a07b95909a?lob=cosmetic`

Expected network calls:

- `POST https://tmv.2checkin.com/api/cosmetic/Appointments` 200 or 201.
- No `POST https://tmv.2checkin.com/api/Appointments` while Cosmetic is selected.

---

## Task 4: Fix Customer Create In Cosmetic

Root cause to prove or disprove: customer form helper calls companies, employees, partner searches, uniqueness, create, or update without `currentLOB`, so Cosmetic customer data either loads Dental choices or writes to Dental/global endpoint.

- [ ] Add failing tests for customer create.

Create or extend `website/src/hooks/__tests__/useCustomers.lob.test.ts`:

```ts
vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnit: () => ({ currentLOB: 'cosmetic' }),
}));

it('creates customers through the active cosmetic LOB', async () => {
  const { result } = renderHook(() => useCustomers());
  await act(async () => {
    await result.current.createCustomer(validCustomerFormData);
  });
  expect(createPartner).toHaveBeenCalledWith(expect.objectContaining({
    name: validCustomerFormData.name,
  }), 'cosmetic');
});
```

Run:

```bash
npm --prefix website run test -- src/hooks/__tests__/useCustomers.lob.test.ts
```

Expected before fix: fails because `createPartner` receives no LOB argument.

- [ ] Implement `useCustomers` LOB pass-through.

Modify `website/src/hooks/useCustomers.ts`:

```ts
const { currentLOB } = useBusinessUnit();

const created = await createPartner(payload, currentLOB);
const updated = await updatePartner(id, payload, currentLOB);
```

Also ensure `fetchPartners` calls inside `loadCustomers` pass `lob: currentLOB`.

- [ ] Fix AddCustomerForm selectors and duplicate checks.

Modify `website/src/components/forms/AddCustomerForm/useAddCustomerForm.ts`:

```ts
const { currentLOB } = useBusinessUnit();

useEffect(() => {
  fetchCompanies({ limit: 50, lob: currentLOB }).then(...);
  fetchEmployees({ limit: 500, active: 'all', lob: currentLOB }).then(...);
}, [currentLOB]);

fetchPartners({ search: trimmed, limit: 20, lob: currentLOB });
fetchPartnerById(formData.referraluserid, currentLOB);
```

- [ ] Live/browser proof.

Create a throwaway Cosmetic customer named with a timestamp:

```text
TESTSPRITE TMV QA Cosmetic YYYYMMDDHHMMSS
```

Expected network calls:

- `POST https://tmv.2checkin.com/api/cosmetic/Partners` 200 or 201.
- New customer appears only in Cosmetic customer list.
- Dental top-level `/api/Partners/:id` returns 404 for the Cosmetic-created UUID.

---

## Task 5: Fix Employee Branch Scoping And Employee Create In Cosmetic

Root cause to prove or disprove: `EmployeeForm` currently calls `fetchCompanies()` and permission group APIs without the active LOB, so Cosmetic staff creation can show Dental locations and save through the wrong pool.

- [ ] Add failing employee form test.

Create or extend `website/src/components/employees/EmployeeForm.lob.test.tsx`:

```ts
vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnit: () => ({ currentLOB: 'cosmetic' }),
}));

it('loads cosmetic locations and saves employee through cosmetic LOB', async () => {
  render(<EmployeeForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

  await waitFor(() => {
    expect(fetchCompanies).toHaveBeenCalledWith({ lob: 'cosmetic' });
  });

  await userEvent.type(screen.getByLabelText(/name/i), 'Cosmetic Staff QA');
  await userEvent.type(screen.getByLabelText(/password/i), '123123');
  await userEvent.click(screen.getByRole('button', { name: /save|luu/i }));

  expect(createEmployee).toHaveBeenCalledWith(expect.objectContaining({
    name: 'Cosmetic Staff QA',
  }), 'cosmetic');
});
```

Run:

```bash
npm --prefix website run test -- src/components/employees/EmployeeForm.lob.test.tsx
```

Expected before fix: fails because `fetchCompanies` and `createEmployee` receive no LOB.

- [ ] Implement EmployeeForm LOB pass-through.

Modify `website/src/components/employees/EmployeeForm.tsx`:

```ts
const { currentLOB } = useBusinessUnit();

useEffect(() => {
  fetchCompanies({ lob: currentLOB }).then(...);
  fetchPermissionGroups(currentLOB).then(...);
}, [currentLOB]);

if (employee?.id) {
  await updateEmployee(employee.id, payload, currentLOB);
} else {
  await createEmployee(payload, currentLOB);
}
```

- [ ] Update permission groups API if needed.

Modify `website/src/lib/api/permissions.ts`:

```ts
export function fetchPermissionGroups(lob?: Lob) {
  return apiFetch<PermissionGroup[]>('/Permissions/groups', { lob });
}
```

- [ ] Live/browser proof.

Open `https://tmv.2checkin.com/employees?lob=cosmetic`, open add employee, and inspect branch dropdown.

Expected:

- Branch choices are Cosmetic branches only.
- `POST https://tmv.2checkin.com/api/cosmetic/Employees` succeeds.
- Permission groups load from `GET https://tmv.2checkin.com/api/cosmetic/Permissions/groups`.

---

## Task 6: Fix Cosmetic Deposit Balance And Payment Deposit Usage

Root cause to prove or disprove: payment/deposit hooks are still reading top-level Dental payment endpoints or customer balance, so the payment modal cannot see the Cosmetic customer's deposit wallet.

- [ ] Add failing deposit hook test.

Extend `website/src/hooks/useDeposits.test.tsx`:

```ts
vi.mock('@/contexts/BusinessUnitContext', () => ({
  useBusinessUnit: () => ({ currentLOB: 'cosmetic' }),
}));

it('loads cosmetic deposits, usage, and balance through cosmetic LOB', async () => {
  const { result } = renderHook(() => useDeposits());
  await act(async () => {
    await result.current.loadDeposits('cosmetic-customer-id');
  });
  expect(fetchDeposits).toHaveBeenCalledWith(expect.objectContaining({
    customerId: 'cosmetic-customer-id',
    lob: 'cosmetic',
  }));
  expect(fetchDepositUsage).toHaveBeenCalledWith(expect.objectContaining({
    customerId: 'cosmetic-customer-id',
    lob: 'cosmetic',
  }));
  expect(fetchCustomerBalance).toHaveBeenCalledWith('cosmetic-customer-id', 'cosmetic');
});
```

Run:

```bash
npm --prefix website run test -- src/hooks/useDeposits.test.tsx
```

Expected before fix: fails because deposit API calls receive no LOB.

- [ ] Implement payment/deposit hook LOB pass-through.

Modify `website/src/hooks/useDeposits.ts`:

```ts
const { currentLOB } = useBusinessUnit();

fetchDeposits({ customerId, ..., lob: currentLOB });
fetchDepositUsage({ customerId, ..., lob: currentLOB });
fetchCustomerBalance(customerId, currentLOB);
createPayment(payload, currentLOB);
createRefund(payload, currentLOB);
voidPayment(id, reason, currentLOB);
deletePayment(id, currentLOB);
updatePayment(id, payload, currentLOB);
```

Modify `website/src/hooks/useCustomerPayments.ts`:

```ts
const { currentLOB } = useBusinessUnit();

fetchPayments(customerId, 'payments', undefined, currentLOB);
createPayment(payload, currentLOB);
voidPayment(id, reason, currentLOB);
deletePayment(id, currentLOB);
```

- [ ] Verify or fix data-level deposit anomaly.

Before any data mutation, take a live DB backup of the relevant customer rows and payments:

```bash
ssh root@76.13.16.68 'mkdir -p /var/backups/tgroup-nk3/tmv-feedback-deposit-$(date -u +%Y%m%dT%H%M%SZ)'
```

Then inspect the Cosmetic customer from feedback:

```sql
SELECT id, name, phone, ref FROM dbo.partners WHERE id = 'e2b94b84-0f7f-42de-bc92-c69d1cafe1aa';
SELECT id, customer_id, amount, method, deposit_type, payment_category, status, deposit_used, cash_amount, bank_amount
FROM dbo.payments
WHERE customer_id = 'e2b94b84-0f7f-42de-bc92-c69d1cafe1aa'
ORDER BY payment_date DESC, created_at DESC;
```

Expected:

- If active Cosmetic deposit rows exist, UI balance and payment modal must show them.
- If no active deposit row exists, the feedback item is a data expectation issue; do not invent a payment. Report the DB proof and ask before adding or correcting money rows.

- [ ] Live/browser proof.

Open:

```text
https://tmv.2checkin.com/customers/e2b94b84-0f7f-42de-bc92-c69d1cafe1aa?lob=cosmetic
```

Expected:

- Customer header deposit balance matches `/api/cosmetic/CustomerBalance/:id`.
- Payment modal available deposit matches the same balance.
- Payment using deposit posts to `/api/cosmetic/Payments`.

---

## Task 7: Feedback Queue Hygiene And Status Policy

Root cause to prove or disprove: the auto-error tab is global across old hosts and current TMV. It is useful for history, but it makes the Cosmetic bug queue look worse because stale `ctv.2checkin.com`, `nk2.2checkin.com`, `sslip.io`, and raw IP errors are mixed with current TMV.

- [ ] Add backend filtering only if existing route cannot filter by current host/source.

Inspect:

```bash
sed -n '1,260p' api/src/routes/feedback.js
```

If missing, add query params:

```text
GET /api/Feedback/all?source=auto&host=tmv.2checkin.com
GET /api/Feedback/all?source=auto&host=all
```

Expected behavior:

- Default `/feedback` on TMV shows current host `tmv.2checkin.com`.
- Admin can switch to "All hosts" for historical triage.
- Manual feedback remains visible unless explicitly filtered.

- [ ] Add UI host filter.

Modify `website/src/components/settings/FeedbackAdminContent.tsx`:

```ts
type FeedbackHostFilter = 'current' | 'all';
const [hostFilter, setHostFilter] = useState<FeedbackHostFilter>('current');

const host = hostFilter === 'current' ? window.location.host : undefined;
const res = await fetchAllFeedback(source, host);
```

Expected:

- Auto tab default count drops to current TMV-host errors.
- Stale host entries are still accessible through "All hosts".

- [ ] Mark fixed manual items resolved only after live proof.

After Tasks 3-6 are verified, update statuses through the UI or API:

```text
86c1ce96-04dc-4ef0-b39c-5e25d3ce0fe3 -> resolved after customer-profile appointment save proof
d5a65a64-b10b-4aef-83a8-b846b8bc3f25 -> resolved after calendar appointment save proof
41028b7a-d842-4049-b5de-5b9b30f01983 -> resolved after Cosmetic employee branch/create proof
97aca05b-d881-4f5b-a029-502583aae916 -> resolved after Cosmetic customer create proof
3b6c4342-7056-4019-9f61-e2b0211a1dd0 -> resolved after deposit usable-payment proof or documented as data issue
be9ed1b8-0d5e-4ac6-bf4a-329713c9f921 -> resolved after deposit balance proof or documented as data issue
```

Expected: feedback status changes are evidence-driven; no bulk close without screenshots/API proof.

---

## Task 8: Verification Matrix

- [ ] Run frontend focused tests.

```bash
npm --prefix website run test -- \
  src/components/appointments/unified/__tests__/useAppointmentForm.test.ts \
  src/hooks/__tests__/useAppointments.lob.test.ts \
  src/hooks/__tests__/useCustomers.lob.test.ts \
  src/components/employees/EmployeeForm.lob.test.tsx \
  src/hooks/useDeposits.test.tsx \
  src/hooks/__tests__/useCustomerPayments.lob.test.ts
```

Expected: all focused tests pass.

- [ ] Run API focused tests.

```bash
npm --prefix api exec -- jest \
  src/__tests__/cosmeticAdminMirrors.test.js \
  tests/readRoutePermissions.test.js \
  tests/paymentsTransaction.test.js \
  --runInBand
```

Expected: all focused tests pass.

- [ ] Run build and static checks.

```bash
npm --prefix website run build
node --check api/src/server.js
git diff --check
bash scripts/verify-docs.sh
```

Expected: all commands exit 0.

- [ ] Run Semgrep because this touches auth/permission/backend data/payment flows.

```bash
/opt/homebrew/bin/semgrep scan --config p/default --metrics=off \
  api/src/server.js \
  api/src/routes/appointments \
  api/src/routes/partners \
  api/src/routes/employees.js \
  api/src/routes/payments.js \
  api/src/routes/customerBalance.js \
  website/src/lib/api \
  website/src/hooks \
  website/src/components/forms/AddCustomerForm \
  website/src/components/employees \
  website/src/components/payment \
  website/src/components/appointments
```

Expected: report findings count and explicitly call out any unresolved HIGH/ERROR/security-blocking findings.

- [ ] Run live browser verification after deploy.

Capture screenshots under:

```text
output/playwright/tmv-cosmetic-feedback-fixes-YYYYMMDDTHHMMSSZ/
```

Required screenshots:

- `01-feedback-manual-after.png`
- `02-feedback-auto-current-host-after.png`
- `03-calendar-appointment-created.png`
- `04-customer-profile-appointment-created.png`
- `05-customer-created-cosmetic.png`
- `06-employee-branches-cosmetic.png`
- `07-payment-deposit-usable.png`

Required network assertions:

- Cosmetic calendar/customer appointment create uses `/api/cosmetic/Appointments`.
- Cosmetic customer create uses `/api/cosmetic/Partners`.
- Cosmetic employee create uses `/api/cosmetic/Employees`.
- Cosmetic payment/deposit usage uses `/api/cosmetic/Payments`, `/api/cosmetic/Payments/deposits`, `/api/cosmetic/Payments/deposit-usage`, and `/api/cosmetic/CustomerBalance/:id`.
- No Cosmetic workflow writes to top-level `/api/Appointments`, `/api/Partners`, `/api/Employees`, or `/api/Payments`.

---

## Task 9: Deploy And Close Feedback

- [ ] Bump website version.

Patch version in:

- `website/package.json`
- `website/package-lock.json`

Use next patch version after the currently deployed `0.32.45`, for example `0.32.46`.

- [ ] Update changelog.

Add:

```markdown
## [0.32.46] - 2026-05-24
### Fixed
- TMV Cosmetic feedback queue fixes: appointment create, customer create, employee branch scoping, and deposit/payment usage now stay on `/api/cosmetic/*`; feedback auto-error triage defaults to current TMV host. - @agent - Staff feedback from live TMV Cosmetic `/feedback`; preserves Cosmetic LOB v2 two-DB isolation.
```

- [ ] Deploy only after local verification passes.

Follow `docs/runbooks/DEPLOYMENT.md`.

Expected live proof:

```bash
curl -fsS https://tmv.2checkin.com/version.json
curl -fsS https://tmv.2checkin.com/api/health
```

- [ ] Mark feedback items resolved only after screenshots and API proof are saved.

Expected:

- Manual pending count drops from `6` to `0`, unless deposit feedback is proven to require user-approved money-row correction.
- Auto current-host count drops or is separated from stale-host history.

---

## Self-Review

Spec coverage:

- Appointment save feedback is covered by Tasks 3 and 8.
- Customer create feedback is covered by Tasks 4 and 8.
- Employee Dental-branch feedback is covered by Task 5.
- Deposit balance/payment usage feedback is covered by Task 6.
- Auto-error queue noise is covered by Task 7.
- Deployment, screenshots, TestSprite, changelog, version bump, and Semgrep are covered by Tasks 1, 8, and 9.

No-placeholder scan:

- There are no `TBD`, `TODO`, or "implement later" placeholders.
- Every task names concrete files, commands, and expected proof.

Type consistency:

- All LOB pass-through examples use `'dental' | 'cosmetic'`.
- All Cosmetic proof requires `/api/cosmetic/*` and Dental regression keeps top-level `/api/*`.
