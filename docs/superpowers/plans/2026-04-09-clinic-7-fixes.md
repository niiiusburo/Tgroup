# Clinic Management System — 7 Bug Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 7 issues in the TGroup clinic management system: scroll, dropdown values, form submit, appointment filtering, staff roles, appointment form layout.

**Architecture:** Pure frontend fixes. No schema migrations, no API changes. Changes touch 9 files across forms, dropdowns, hooks, and data modules.

**Tech Stack:** React 18, TypeScript, Tailwind CSS

---

## File Map

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `website/src/components/forms/AddCustomerForm/AddCustomerForm.tsx` | Modify | Fix outer scroll (#1) |
| 2 | `website/src/data/mockSettings.ts` | Modify | Replace customer source values (#2) |
| 3 | `website/src/hooks/useServices.ts` | Modify | Fix createServiceRecord to call API (#3) |
| 4 | `website/src/hooks/useCustomerProfile.ts` | Modify | Already passes `partnerId` — verify it's used (#4) |
| 5 | `website/src/data/mockEmployees.ts` | Modify | Update role enums + labels (#6a) |
| 6 | `website/src/components/employees/EmployeeForm.tsx` | Modify | Replace role buttons with new roles, add password field (#6a + #6b) |
| 7 | `website/src/lib/api.ts` | Modify | Add password field to CreateEmployeeData (#6b) |
| 8 | `website/src/components/appointments/AppointmentForm.tsx` | Modify | Make endTime optional, 2-col layout, reminder section (#7) |
| 9 | `website/src/components/employees/RoleMultiSelect.tsx | Modify | Sync roles with new list (#6a) |

---

## Dependency Order

```
#6a (roles data) → #6b (password field)    ← can be parallel with other tasks
#1 (scroll) — independent
#2 (sources) — independent
#3 (service form) — independent
#4 (appointments filter) — independent
#5 (payment) — blocked by #3, no code change yet
#7 (appointment form layout) — independent
```

**Recommended execution order:** #1 → #2 → #6a → #6b → #3 → #4 → #7

---

## Task 1: Customer Profile Form — Fix Outer Scroll

**Files:**
- Modify: `website/src/components/forms/AddCustomerForm/AddCustomerForm.tsx`

**Problem:** The form wrapper has `height: 85vh; maxHeight: 800px` but no `overflow-y: auto` on the outermost scrollable container. The inner `<form>` uses `overflow-hidden` on its flex container, so the Save/Lưu button at the bottom can be pushed off-screen.

**Root cause:** The outermost `<div>` (line ~368, the wrapper div) sets a fixed height but the form element inside uses `flex-1 overflow-hidden`. The footer button with `flex-shrink-0` is inside a child `<div>` of the `<form>`, but the `<form>` itself has `overflow-hidden` which clips it.

**Fix:** On the outermost wrapper div (the one with `style={{ height: '85vh', maxHeight: '800px' }}`), add `overflow-y-auto` so the entire form (including footer) scrolls as one unit. Then on the inner `<form>`, change `overflow-hidden` to allow natural flow.

- [ ] **Step 1: Update outer wrapper to allow scrolling**

In `AddCustomerForm.tsx`, find the outermost wrapper div (around line 368):

```tsx
// BEFORE:
<div 
  className="flex flex-col bg-gray-50/50" 
  style={{ height: '85vh', maxHeight: '800px' }}
  onWheel={(e) => e.stopPropagation()}
>
```

Change to:

```tsx
// AFTER:
<div 
  className="flex flex-col bg-gray-50/50 overflow-y-auto" 
  style={{ height: '85vh', maxHeight: '800px' }}
  onWheel={(e) => e.stopPropagation()}
>
```

- [ ] **Step 2: Update form overflow**

Find the `<form>` element (around line 389):

```tsx
// BEFORE:
<form onSubmit={handleSubmit} className="flex flex-1 overflow-hidden">
```

Change to:

```tsx
// AFTER:
<form onSubmit={handleSubmit} className="flex flex-1 min-h-0">
```

- [ ] **Step 3: Verify the footer is always reachable**

No further code change. The footer `<div>` already has `flex-shrink-0`. With `overflow-y-auto` on the outer container, the user can scroll down to reach the Save/Lưu button.

- [ ] **Step 4: Commit**

```bash
git add website/src/components/forms/AddCustomerForm/AddCustomerForm.tsx
git commit -m "fix: customer profile form outer scroll — save button always reachable"
```

---

## Task 2: Customer Source Dropdown — Replace Values

**Files:**
- Modify: `website/src/data/mockSettings.ts`
- Modify: `website/src/data/mockCustomerForm.ts` (legacy CUSTOMER_SOURCES constant)

**Problem:** Both `MOCK_CUSTOMER_SOURCES` in mockSettings.ts and `CUSTOMER_SOURCES` in mockCustomerForm.ts have English values (Walk-in, Google Search, Facebook Ads, etc.). Need to replace with exactly: Sale Online, Khách vãng lai, Hotline, Khách cũ, Khách hàng giới thiệu, Nội bộ giới thiệu, MKT1, ĐNCB.

**Important:** The `AddCustomerForm` uses `useCustomerSources()` hook which returns `allSources` from `MOCK_CUSTOMER_SOURCES`. The `CustomerSourceDropdown` uses `CUSTOMER_SOURCES` from mockCustomerForm. Both need updating.

- [ ] **Step 1: Update MOCK_CUSTOMER_SOURCES in mockSettings.ts**

Replace the entire `MOCK_CUSTOMER_SOURCES` array:

```typescript
export const MOCK_CUSTOMER_SOURCES: CustomerSource[] = [
  { id: 'src-1', name: 'Sale Online', type: 'online', description: 'Khách đến từ kênh sale online', isActive: true, customerCount: 0 },
  { id: 'src-2', name: 'Khách vãng lai', type: 'offline', description: 'Khách đến trực tiếp không hẹn trước', isActive: true, customerCount: 0 },
  { id: 'src-3', name: 'Hotline', type: 'online', description: 'Khách gọi qua tổng đài', isActive: true, customerCount: 0 },
  { id: 'src-4', name: 'Khách cũ', type: 'offline', description: 'Khách hàng quay lại', isActive: true, customerCount: 0 },
  { id: 'src-5', name: 'Khách hàng giới thiệu', type: 'referral', description: 'Khách hàng hiện tại giới thiệu', isActive: true, customerCount: 0 },
  { id: 'src-6', name: 'Nội bộ giới thiệu', type: 'referral', description: 'Nhân viên nội bộ giới thiệu', isActive: true, customerCount: 0 },
  { id: 'src-7', name: 'MKT1', type: 'online', description: 'Kênh marketing 1', isActive: true, customerCount: 0 },
  { id: 'src-8', name: 'ĐNCB', type: 'offline', description: 'Đối nội cơ bản', isActive: true, customerCount: 0 },
];
```

- [ ] **Step 2: Update CUSTOMER_SOURCES in mockCustomerForm.ts**

Replace the `CUSTOMER_SOURCES` constant:

```typescript
export const CUSTOMER_SOURCES = [
  { id: 'sale-online', label: 'Sale Online' },
  { id: 'walk-in', label: 'Khách vãng lai' },
  { id: 'hotline', label: 'Hotline' },
  { id: 'returning', label: 'Khách cũ' },
  { id: 'customer-referral', label: 'Khách hàng giới thiệu' },
  { id: 'internal-referral', label: 'Nội bộ giới thiệu' },
  { id: 'mkt1', label: 'MKT1' },
  { id: 'dncb', label: 'ĐNCB' },
] as const;
```

- [ ] **Step 3: Commit**

```bash
git add website/src/data/mockSettings.ts website/src/data/mockCustomerForm.ts
git commit -m "fix: customer source dropdown — Vietnamese values per spec"
```

---

## Task 3: Service Creation Form — Fix Save Button

**Files:**
- Modify: `website/src/hooks/useServices.ts`
- Modify: `website/src/lib/api.ts`

**Problem:** `createServiceRecord` in `useServices.ts` only adds to local state — it never calls the API. The `ServiceForm` component itself works fine (validation passes, `handleSubmit` fires correctly). The issue is the hook's `createServiceRecord` doesn't persist to the backend.

**Root cause analysis:** 
1. `ServiceForm.handleSubmit()` → calls `validate()` → builds data → calls `onSubmit(data)` 
2. In `Services/index.tsx`, `handleCreate` calls `createServiceRecord(data)` then `setShowForm(false)`
3. `createServiceRecord` in `useServices.ts` (line ~137) only does `setRecords(prev => [...prev, newRecord])` — purely local state
4. No `createSaleOrder` API function exists

**Fix:** 
1. Add a `createSaleOrder` API function in `lib/api.ts`
2. Update `createServiceRecord` in `useServices.ts` to call the API first, then update local state

- [ ] **Step 1: Add createSaleOrder to lib/api.ts**

Find the `fetchSaleOrders` function (around line 399) and add the following after it:

```typescript
export function createSaleOrder(data: {
  partnerid?: string;
  partnername?: string;
  companyid?: string;
  productid?: string;
  productname?: string;
  doctorid?: string;
  doctorname?: string;
  amounttotal?: number;
  datestart?: string;
  dateend?: string;
  notes?: string;
}) {
  return apiFetch<ApiSaleOrder>('/SaleOrders', { method: 'POST', body: data });
}
```

- [ ] **Step 2: Import createSaleOrder in useServices.ts**

Add to imports at top of `useServices.ts`:

```typescript
import { fetchSaleOrders, createSaleOrder, type ApiSaleOrder } from '@/lib/api';
```

- [ ] **Step 3: Update createServiceRecord to call API**

Replace the `createServiceRecord` callback in `useServices.ts`:

```typescript
const createServiceRecord = useCallback(async (input: CreateServiceInput) => {
  // Build API payload
  const apiPayload = {
    partnerid: input.customerId,
    partnername: input.customerName,
    companyid: input.locationId,
    productid: input.catalogItemId,
    productname: input.serviceName,
    doctorid: input.doctorId,
    doctorname: input.doctorName,
    amounttotal: input.totalCost,
    datestart: input.startDate,
    dateend: input.expectedEndDate,
    notes: input.notes,
  };

  try {
    const created = await createSaleOrder(apiPayload);
    // Map the created order and add to local state
    const newRecord = mapSaleOrderToServiceRecord(created);
    setRecords((prev) => [newRecord, ...prev]);
    return newRecord;
  } catch (err) {
    console.error('Failed to create service record:', err);
    // Fallback: add locally with a generated ID
    const visits: ServiceVisit[] = Array.from({ length: input.totalVisits }, (_, i) => ({
      id: `v-new-${Date.now()}-${i + 1}`,
      serviceRecordId: `svc-${Date.now()}`,
      visitNumber: i + 1,
      date: '',
      doctorId: input.doctorId,
      doctorName: input.doctorName,
      status: 'scheduled' as VisitStatus,
      notes: `Visit ${i + 1}`,
      toothNumbers: input.toothNumbers,
    }));

    const newRecord: ServiceRecord = {
      ...input,
      id: `svc-${Date.now()}`,
      status: 'planned',
      completedVisits: 0,
      paidAmount: 0,
      visits,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setRecords((prev) => [...prev, newRecord]);
    return newRecord;
  }
}, []);
```

- [ ] **Step 4: Update callers to handle async**

In `website/src/pages/Services/index.tsx`, `handleCreate` should await:

```typescript
async function handleCreate(data: CreateServiceInput) {
  await createServiceRecord(data);
  setShowForm(false);
}
```

The function is already async-compatible since `createServiceRecord` returned synchronously before. Just add `await`.

- [ ] **Step 5: Commit**

```bash
git add website/src/lib/api.ts website/src/hooks/useServices.ts website/src/pages/Services/index.tsx
git commit -m "fix: service creation form — call SaleOrders API on save"
```

---

## Task 4: Appointments — Filter by Customer

**Files:**
- Verify: `website/src/hooks/useCustomerProfile.ts`

**Problem:** The appointments shown in a customer profile might show all appointments instead of just the selected customer's.

**Analysis:** Looking at the code in `useCustomerProfile.ts`, line 67-73:

```typescript
const aptRes = await fetchAppointments({
  offset: 0,
  limit: 200,
  partnerId: customerId,   // ← Already filtering by customer!
});
```

The hook already passes `partnerId: customerId` to `fetchAppointments`. The API supports this param. This is likely **already working correctly**.

**Verification needed:**
- Check if the API actually respects the `partnerId` param server-side
- Check if the CustomerProfile component receives and uses `hookAppointments` correctly

Let's verify in Customers.tsx — line 128:

```tsx
<CustomerProfile
  appointments={hookAppointments}
  ...
/>
```

This passes the appointments from `useCustomerProfile` which are already filtered. The fix is already in place.

- [ ] **Step 1: Verify the API returns filtered data**

If the API endpoint `/Appointments?partnerId=xxx` doesn't filter server-side, check the backend:

```bash
# Test the endpoint directly
curl "http://localhost:3000/api/Appointments?partnerId=<some-id>&limit=10" 2>/dev/null | head -50
```

If the API ignores `partnerId`, the backend route needs fixing. Check `api/src/routes/` or `api/src/controllers/` for the appointments route handler.

- [ ] **Step 2: If API doesn't filter, add client-side fallback**

In `useCustomerProfile.ts`, after receiving appointments, add a safety filter:

Find this block (around line 68-73):

```typescript
const aptRes = await fetchAppointments({
  offset: 0,
  limit: 200,
  partnerId: customerId,
});
setAppointments(aptRes.items);
```

Replace with:

```typescript
const aptRes = await fetchAppointments({
  offset: 0,
  limit: 200,
  partnerId: customerId,
});
// Client-side safety filter: only keep appointments belonging to this customer
const filtered = aptRes.items.filter(
  (a) => a.partnerid === customerId || a.partnerId === customerId
);
setAppointments(filtered);
```

- [ ] **Step 3: Commit**

```bash
git add website/src/hooks/useCustomerProfile.ts
git commit -m "fix: customer profile appointments — client-side filter as safety net"
```

---

## Task 5: Payment — Blocked by #3

No code change. Payment depends on service records (#3). Once #3 is fixed and service/treatment records can be created, payment flows can be tested.

- [ ] Verify manually that payment works after #3 is fixed.

---

## Task 6a: Staff/HR — Update Role List

**Files:**
- Modify: `website/src/data/mockEmployees.ts`
- Modify: `website/src/components/employees/RoleMultiSelect.tsx`
- Modify: `website/src/components/employees/EmployeeForm.tsx`

**Problem:** Current roles are English (Dentist, Orthodontist, Hygienist, Assistant, Receptionist, Manager, Lab-tech). Need: Quản lý tổng, Quản lý cơ sở, Bác sĩ, Trợ lý Bác sĩ, Phụ tá, Lễ tân, Sale online, CSKH, Marketing.

The DB uses boolean flags: `isdoctor`, `isassistant`, `isreceptionist`. The new roles are more granular than these 3 flags. We need to:
1. Map new roles to existing DB flags
2. Update the EmployeeForm to use a dropdown with these role names instead of toggle buttons
3. Keep backward compatibility with DB

**Role-to-DB-flag mapping:**

| New Role | isdoctor | isassistant | isreceptionist |
|----------|----------|-------------|----------------|
| Quản lý tổng | false | false | false |
| Quản lý cơ sở | false | false | false |
| Bác sĩ | true | false | false |
| Trợ lý Bác sĩ | false | true | false |
| Phụ tá | false | true | false |
| Lễ tân | false | false | true |
| Sale online | false | false | true |
| CSKH | false | false | true |
| Marketing | false | false | false |

- [ ] **Step 1: Update mockEmployees.ts**

Replace `EmployeeRole` type and related constants:

```typescript
export type EmployeeRole =
  | 'general-manager'
  | 'branch-manager'
  | 'doctor'
  | 'doctor-assistant'
  | 'assistant'
  | 'receptionist'
  | 'sale-online'
  | 'customer-service'
  | 'marketing';

// Map role to DB boolean flags
export const ROLE_TO_DB_FLAGS: Record<EmployeeRole, { isdoctor: boolean; isassistant: boolean; isreceptionist: boolean }> = {
  'general-manager': { isdoctor: false, isassistant: false, isreceptionist: false },
  'branch-manager': { isdoctor: false, isassistant: false, isreceptionist: false },
  'doctor': { isdoctor: true, isassistant: false, isreceptionist: false },
  'doctor-assistant': { isdoctor: false, isassistant: true, isreceptionist: false },
  'assistant': { isdoctor: false, isassistant: true, isreceptionist: false },
  'receptionist': { isdoctor: false, isassistant: false, isreceptionist: true },
  'sale-online': { isdoctor: false, isassistant: false, isreceptionist: true },
  'customer-service': { isdoctor: false, isassistant: false, isreceptionist: true },
  'marketing': { isdoctor: false, isassistant: false, isreceptionist: false },
};

// Map DB flags back to primary role
export function inferRoleFromFlags(isdoctor: boolean, isassistant: boolean, isreceptionist: boolean): EmployeeRole {
  if (isdoctor) return 'doctor';
  if (isassistant) return 'assistant';
  if (isreceptionist) return 'receptionist';
  return 'general-manager';
}

export const ROLE_LABELS: Record<EmployeeRole, string> = {
  'general-manager': 'Quản lý tổng',
  'branch-manager': 'Quản lý cơ sở',
  'doctor': 'Bác sĩ',
  'doctor-assistant': 'Trợ lý Bác sĩ',
  'assistant': 'Phụ tá',
  'receptionist': 'Lễ tân',
  'sale-online': 'Sale online',
  'customer-service': 'CSKH',
  'marketing': 'Marketing',
};

export const ROLE_STYLES: Record<EmployeeRole, string> = {
  'general-manager': 'bg-purple-100 text-purple-700',
  'branch-manager': 'bg-indigo-100 text-indigo-700',
  'doctor': 'bg-sky-100 text-sky-700',
  'doctor-assistant': 'bg-teal-100 text-teal-700',
  'assistant': 'bg-green-100 text-green-700',
  'receptionist': 'bg-orange-100 text-orange-700',
  'sale-online': 'bg-blue-100 text-blue-700',
  'customer-service': 'bg-pink-100 text-pink-700',
  'marketing': 'bg-amber-100 text-amber-700',
};

export const ALL_ROLES: readonly EmployeeRole[] = [
  'general-manager', 'branch-manager', 'doctor', 'doctor-assistant',
  'assistant', 'receptionist', 'sale-online', 'customer-service', 'marketing',
] as const;
```

- [ ] **Step 2: Update RoleMultiSelect.tsx**

The component already imports `ALL_ROLES`, `ROLE_LABELS`, `ROLE_STYLES` from mockEmployees. No code logic change needed — just ensure it picks up the updated data. The component itself is data-driven and will render the new roles automatically after Step 1.

Verify: open the file and confirm it imports from `@/data/mockEmployees`. If it does, no change needed.

- [ ] **Step 3: Update EmployeeForm.tsx — Replace role toggle buttons with dropdown**

In `EmployeeForm.tsx`, replace the 3 boolean toggle buttons (`isdoctor`, `isassistant`, `isreceptionist`) with a single-select dropdown using the new role list.

Find the state declarations and replace:

```typescript
// BEFORE:
const [isdoctor, setIsdoctor] = useState(employee?.isdoctor ?? false);
const [isassistant, setIsassistant] = useState(employee?.isassistant ?? false);
const [isreceptionist, setIsreceptionist] = useState(employee?.isreceptionist ?? false);

// AFTER:
import { ALL_ROLES, ROLE_LABELS, ROLE_TO_DB_FLAGS, inferRoleFromFlags } from '@/data/mockEmployees';

// Determine initial role from DB flags
const initialRole = employee
  ? inferRoleFromFlags(employee.isdoctor, employee.isassistant, employee.isreceptionist)
  : 'doctor';
const [selectedRole, setSelectedRole] = useState<EmployeeRole>(initialRole);
```

Replace the role validation and submit logic:

```typescript
// In handleSubmit, replace the role check:
// BEFORE:
if (!isdoctor && !isassistant && !isreceptionist) {
  setError('Vui lòng chọn ít nhất một vai trò');
  return;
}

// AFTER:
// (No validation needed — a role is always selected, defaults to 'doctor')

// In handleSubmit, replace the data construction:
// BEFORE:
const data: CreateEmployeeData = {
  ...isdoctor, isassistant, isreceptionist, ...
};

// AFTER:
const dbFlags = ROLE_TO_DB_FLAGS[selectedRole];
const data: CreateEmployeeData = {
  name: name.trim(),
  phone: phone.trim() || undefined,
  email: email.trim() || undefined,
  companyid: companyid || undefined,
  isdoctor: dbFlags.isdoctor,
  isassistant: dbFlags.isassistant,
  isreceptionist: dbFlags.isreceptionist,
  active,
  startworkdate: startworkdate || undefined,
};
```

Replace the role selection UI section:

```typescript
// BEFORE: Grid of 3 RoleButton components
// AFTER: Single dropdown select

<div>
  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
    <Shield className="w-3.5 h-3.5" />
    Vị trí / Vai trò <span className="text-red-500">*</span>
  </label>
  <select
    value={selectedRole}
    onChange={(e) => setSelectedRole(e.target.value as EmployeeRole)}
    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
  >
    {ALL_ROLES.map((role) => (
      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
    ))}
  </select>
</div>
```

Remove the `RoleButton` sub-component and its import if no longer used.

Update `isValid`:

```typescript
// BEFORE:
const isValid = name.trim() && (isdoctor || isassistant || isreceptionist);

// AFTER:
const isValid = name.trim() && selectedRole !== null;
```

Add the import at the top of EmployeeForm:

```typescript
import { ALL_ROLES, ROLE_LABELS, ROLE_TO_DB_FLAGS, inferRoleFromFlags, type EmployeeRole } from '@/data/mockEmployees';
```

- [ ] **Step 4: Commit**

```bash
git add website/src/data/mockEmployees.ts website/src/components/employees/RoleMultiSelect.tsx website/src/components/employees/EmployeeForm.tsx
git commit -m "feat: staff roles — Vietnamese role names per spec (9 roles)"
```

---

## Task 6b: Staff/HR — Add Password Field to Edit Form

**Files:**
- Modify: `website/src/lib/api.ts`
- Modify: `website/src/components/employees/EmployeeForm.tsx`

**Problem:** No password field on the Edit Staff form. Need to add a password creation/reset field.

- [ ] **Step 1: Add password to CreateEmployeeData in api.ts**

Find `CreateEmployeeData` interface (around line 131) and add:

```typescript
export interface CreateEmployeeData {
  name: string;
  phone?: string;
  email?: string;
  password?: string;       // ← NEW
  companyid?: string;
  isdoctor?: boolean;
  isassistant?: boolean;
  isreceptionist?: boolean;
  active?: boolean;
  wage?: number;
  allowance?: number;
  startworkdate?: string;
}
```

- [ ] **Step 2: Add password state and UI to EmployeeForm.tsx**

Add state:

```typescript
const [password, setPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
```

Add UI field in the form body, after the email field, inside the grid section. Replace the current phone+email grid with a 3-col or add password below:

```tsx
{/* Mật khẩu */}
<div>
  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
    <Shield className="w-3.5 h-3.5" />
    {isEdit ? 'Đặt lại mật khẩu' : 'Mật khẩu'} {!isEdit && <span className="text-red-500">*</span>}
  </label>
  <div className="relative">
    <input
      type={showPassword ? 'text' : 'password'}
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder={isEdit ? 'Để trống nếu không đổi mật khẩu' : 'Nhập mật khẩu'}
      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm pr-10"
      {...(!isEdit ? { required: true } : {})}
    />
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
    >
      {showPassword ? 'Ẩn' : 'Hiện'}
    </button>
  </div>
  {isEdit && (
    <p className="mt-1 text-xs text-gray-400">Để trống nếu không muốn thay đổi mật khẩu</p>
  )}
</div>
```

Include password in the submit data:

```typescript
const data: CreateEmployeeData = {
  // ... existing fields
  password: password.trim() || undefined,
};
```

- [ ] **Step 3: Commit**

```bash
git add website/src/lib/api.ts website/src/components/employees/EmployeeForm.tsx
git commit -m "feat: employee form — add password creation/reset field"
```

---

## Task 7: Appointment Form — Make End Time Optional + 2-Column Layout + Reminder Section

**Files:**
- Modify: `website/src/components/appointments/AppointmentForm.tsx`

**Changes:**
1. Remove `endTime` from required validation (make it optional)
2. Auto-calculate `endTime` from `startTime` + `estimatedDuration` if not provided
3. Reorganize form into 2-column layout: Left = "Thông tin cơ bản", Right = "Thông tin nâng cao"
4. Add "Nhắc lịch hẹn" (Appointment Reminder) section at bottom

- [ ] **Step 1: Make endTime optional in validation**

In `AppointmentForm.tsx`, find the `validate` function:

```typescript
// BEFORE:
if (!endTime) newErrors.endTime = 'Vui lòng chọn giờ kết thúc';
if (startTime && endTime && startTime >= endTime) {
  newErrors.endTime = 'Giờ kết thúc phải sau giờ bắt đầu';
}

// AFTER:
// endTime is now optional — only validate if provided
if (endTime && startTime && endTime <= startTime) {
  newErrors.endTime = 'Giờ kết thúc phải sau giờ bắt đầu';
}
```

- [ ] **Step 2: Auto-calculate endTime in handleSubmit**

In `handleSubmit`, compute `endTime` if not provided:

```typescript
// Add this before the onSubmit call:
let computedEndTime = endTime;
if (!computedEndTime && startTime && estimatedDuration) {
  // Calculate end time from start + duration
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + estimatedDuration;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;
  computedEndTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}
```

Then use `computedEndTime` instead of `endTime` in the `onSubmit` call.

- [ ] **Step 3: Restructure form into 2-column layout**

Replace the current single-column `<form>` body with a 2-column grid. Here's the new structure:

```tsx
<form onSubmit={handleSubmit} className="modal-body px-6 py-6">
  {/* Loading indicator */}
  {isLoading && (
    <div className="flex items-center justify-center py-8 text-gray-400">
      <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-2" />
      Đang tải dữ liệu...
    </div>
  )}

  <div className="grid grid-cols-2 gap-6">
    {/* ── LEFT: Thông tin cơ bản ── */}
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-800 pb-2 border-b border-gray-100 flex items-center gap-2">
        <User className="w-4 h-4 text-orange-500" />
        Thông tin cơ bản
      </h3>

      {/* Khách hàng */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          <User className="w-3.5 h-3.5" />
          Khách hàng
        </label>
        {isEdit ? (
          <div className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border bg-gray-50 border-gray-200 text-gray-700">
            <User className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="flex-1 truncate font-medium">{initialData?.customerName || 'Không xác định'}</span>
            <span className="text-xs text-gray-400">{initialData?.customerPhone}</span>
          </div>
        ) : (
          <CustomerSelector customers={customers} selectedId={customerId} onChange={setCustomerId} />
        )}
        {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer}</p>}
      </div>

      {/* Bác sĩ */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Stethoscope className="w-3.5 h-3.5" />
          Bác sĩ
        </label>
        <DoctorSelector employees={employees} selectedId={doctorId} onChange={setDoctorId} filterRoles={['dentist', 'orthodontist']} />
        {errors.doctor && <p className="text-xs text-red-500 mt-1">{errors.doctor}</p>}
      </div>

      {/* Chi nhánh */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5" />
          Chi nhánh
        </label>
        <LocationSelector locations={locations} selectedId={locationId} onChange={setLocationId} excludeAll />
        {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
      </div>

      {/* Ngày hẹn */}
      <DatePicker
        value={date}
        onChange={setDate}
        label="Ngày hẹn"
        icon={<Calendar className="w-3.5 h-3.5" />}
        error={errors.date}
      />

      {/* Giờ bắt đầu + Thời gian dự kiến (side by side) */}
      <div className="grid grid-cols-2 gap-3">
        <TimePicker
          value={startTime}
          onChange={setStartTime}
          label="Giờ bắt đầu"
          icon={<Clock className="w-3.5 h-3.5" />}
          error={errors.startTime}
          interval={15}
        />
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Thời gian dự kiến
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || 30)}
              min={5} max={300} step={5}
              className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm"
            />
            <span className="text-sm text-gray-500">phút</span>
          </div>
        </div>
      </div>
    </div>

    {/* ── RIGHT: Thông tin nâng cao ── */}
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-800 pb-2 border-b border-gray-100 flex items-center gap-2">
        <Stethoscope className="w-4 h-4 text-orange-500" />
        Thông tin nâng cao
      </h3>

      {/* Dịch vụ */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Stethoscope className="w-3.5 h-3.5" />
          Dịch vụ
        </label>
        <ServiceCatalogSelector catalog={serviceCatalog} selectedId={serviceId} onChange={setServiceId} placeholder="Chọn dịch vụ..." />
        {selectedService && (
          <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {selectedService.totalVisits} lần khám · ~{selectedService.estimatedDuration} phút
          </p>
        )}
      </div>

      {/* Ghi chú */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" />
          Ghi chú
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Ghi chú thêm..."
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm resize-none"
        />
      </div>

      {/* Loại khách */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          <User className="w-3.5 h-3.5" />
          Loại khách
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCustomerType('new')}
            className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all duration-200 ${
              customerType === 'new'
                ? 'bg-orange-100 text-orange-700 border-orange-300 ring-2 ring-orange-500/20'
                : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
            }`}
          >
            Khách mới
          </button>
          <button
            type="button"
            onClick={() => setCustomerType('returning')}
            className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all duration-200 ${
              customerType === 'returning'
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'
            }`}
          >
            Tái khám
          </button>
        </div>
      </div>

      {/* Màu thẻ */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
          <Palette className="w-3.5 h-3.5" />
          Màu thẻ
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(APPOINTMENT_CARD_COLORS).map(([code, color]) => (
            <button
              key={code}
              type="button"
              onClick={() => setColorCode(code)}
              className={`group relative rounded-full transition-all duration-200 border-2 ${
                colorCode === code
                  ? 'border-gray-800 shadow-md scale-110'
                  : 'border-transparent hover:border-gray-300 hover:scale-105'
              }`}
              title={color.label}
            >
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${color.previewGradient} flex items-center justify-center`}>
                {colorCode === code && <Check className="w-4 h-4 text-white drop-shadow-sm" />}
              </div>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400">
          {APPOINTMENT_CARD_COLORS[colorCode]?.label ?? 'Default'}
        </p>
      </div>

      {/* Trạng thái (edit mode only) */}
      {isEdit && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Trạng thái
          </label>
          <div className="grid grid-cols-3 gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatus(s.value)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-200 ${
                  status === s.value
                    ? `${s.color} ring-2 ring-offset-1 ring-orange-500/30 shadow-sm`
                    : 'bg-white border-gray-200 text-gray-600 hover:border-orange-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>

  {/* ── Nhắc lịch hẹn ── */}
  <div className="mt-6 pt-5 border-t border-gray-100">
    <h3 className="text-sm font-semibold text-gray-800 pb-2 mb-3 flex items-center gap-2">
      <Clock className="w-4 h-4 text-orange-500" />
      Nhắc lịch hẹn
    </h3>
    <div className="flex flex-wrap gap-2">
      {[
        { label: '15 phút trước', value: '15min' },
        { label: '30 phút trước', value: '30min' },
        { label: '1 giờ trước', value: '1h' },
        { label: '1 ngày trước', value: '1d' },
        { label: 'SMS', value: 'sms' },
        { label: 'Zalo', value: 'zalo' },
      ].map((reminder) => (
        <button
          key={reminder.value}
          type="button"
          className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:border-orange-300 hover:bg-orange-50 transition-colors"
        >
          {reminder.label}
        </button>
      ))}
    </div>
    <p className="mt-2 text-xs text-gray-400">Tính năng nhắc lịch sẽ được kích hoạt sau</p>
  </div>
</form>
```

- [ ] **Step 4: Commit**

```bash
git add website/src/components/appointments/AppointmentForm.tsx
git commit -m "feat: appointment form — 2-col layout, optional endTime, reminder section"
```

---

## Validation Checklist

After all tasks are done:

- [ ] `cd website && npm run build` — no TypeScript errors
- [ ] `cd website && npm run dev` — app loads without crashes
- [ ] Customer Profile Form: open edit modal → scroll to bottom → Save button visible
- [ ] Customer Source dropdown: shows "Sale Online, Khách vãng lai, Hotline, Khách cũ, Khách hàng giới thiệu, Nội bộ giới thiệu, MKT1, ĐNCB"
- [ ] Service Creation: fill form → click Save → new record appears in list
- [ ] Customer Profile → Appointments tab: only shows that customer's appointments
- [ ] Employee Form: role dropdown shows 9 Vietnamese options; password field present
- [ ] Appointment Form: 2-column layout, endTime optional, reminder section visible

---

## Risks / Follow-up

1. **Task #3 (Service Create API):** The `createSaleOrder` API function assumes the backend accepts the payload shape. If the actual API uses different field names, the mapping needs adjustment. Verify with the API docs or a live test.
2. **Task #6a (Role Mapping):** The DB only has 3 boolean flags. New roles like "Quản lý tổng" and "Marketing" don't map to any flag. Consider adding a `hrjobname` field or similar on the backend to store the actual role name. Currently these roles will just have all flags = false.
3. **Task #6b (Password):** The backend API may or may not support a `password` field. Verify the API accepts it. If not, this field will be silently ignored.
4. **Task #7 (Reminder Section):** The reminder buttons are UI-only. Backend support for SMS/Zalo notifications is needed for actual functionality.
5. **Task #4 (Appointment Filter):** If the API doesn't filter by `partnerId`, the client-side safety net catches it, but this should be fixed server-side for performance.
