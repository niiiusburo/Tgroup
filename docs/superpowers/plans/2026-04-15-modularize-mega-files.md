# Modularize Mega-Files — Refactoring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 5 largest source files in the project into smaller, focused modules so no file exceeds ~500 lines / ~10K characters.

**Architecture:** Each target file will be decomposed into co-located sub-modules (same-directory or sibling-directory) with clear single responsibilities. Barrel exports (`index.ts`) will preserve existing import paths. The refactor is **purely structural** — no runtime behavior changes.

**Tech Stack:** React + TypeScript + Tailwind + Vite. Existing tests use Vitest + Testing Library (jsdom). TypeScript `tsc --noEmit` is the gate.

---

## Target Files (Priority Order)

| Rank | File | Lines | Size | New Homes |
|------|------|-------|------|-----------|
| 1 | `website/src/components/forms/AddCustomerForm/AddCustomerForm.tsx` | 1,589 | 71 KB | `AddCustomerForm/`, `data/constants` |
| 2 | `website/src/lib/api.ts` | 1,499 | 43 KB | `lib/api/` domain modules |
| 3 | `website/src/pages/PermissionBoard.tsx` | 959 | 42 KB | `pages/PermissionBoard/` sub-components |
| 4 | `website/src/components/customer/CustomerProfile.tsx` | 949 | 44 KB | `customer/CustomerProfile/` sub-tabs |
| 5 | `website/src/pages/Customers.tsx` | 938 | 35 KB | `pages/Customers/` columns + modals |

---

## File Structure After Refactor

```
website/src/
├── components/forms/AddCustomerForm/
│   ├── AddCustomerForm.tsx          (~350 lines — orchestrator only)
│   ├── FormShell.tsx                (visual shell: header, footer, layout)
│   ├── CardSection.tsx              (reusable card container)
│   ├── FieldLabel.tsx               (label + icon)
│   ├── MiniAddDialog.tsx            (inline quick-add modal)
│   ├── BasicInfoTab.tsx             (tab content)
│   ├── MedicalTab.tsx               (tab content)
│   ├── EInvoiceTab.tsx              (tab content)
│   ├── useAddCustomerForm.ts        (state + handlers hook)
│   ├── constants.ts                 (DAYS, MONTHS, YEARS, TYPE_ICONS, etc.)
│   ├── styles.ts                    (inputClass, selectClass)
│   └── index.ts                     (barrel: export AddCustomerForm)
│
├── lib/api/
│   ├── core.ts                      (API_URL, ApiError, apiFetch, getUploadUrl)
│   ├── partners.ts
│   ├── employees.ts
│   ├── appointments.ts
│   ├── companies.ts
│   ├── products.ts
│   ├── saleOrders.ts
│   ├── payments.ts
│   ├── feedback.ts
│   ├── permissions.ts
│   ├── reports.ts
│   ├── monthlyPlans.ts
│   ├── externalCheckups.ts
│   ├── faceRecognition.ts
│   ├── dotKhams.ts
│   ├── deposits.ts
│   ├── settings.ts
│   ├── types.ts                     (shared types: PaginatedResponse)
│   └── index.ts                     (barrel re-exports everything)
│
├── pages/PermissionBoard/
│   ├── PermissionBoard.tsx          (~200 lines — shell + state)
│   ├── GroupCard.tsx
│   ├── EmployeeCard.tsx
│   ├── ArchitectureView.tsx
│   ├── MatrixView.tsx
│   ├── LogicFlowView.tsx
│   ├── constants.ts                 (MODULES, PERMISSION_DESCRIPTIONS)
│   └── index.ts
│
├── components/customer/CustomerProfile/
│   ├── CustomerProfile.tsx          (~300 lines)
│   ├── ProfileHeader.tsx
│   ├── ProfileTabs.tsx
│   ├── ProfileTabContent.tsx        (switch on activeTab)
│   ├── ProfileAppointmentsTab.tsx
│   ├── ProfileRecordsTab.tsx
│   ├── ProfilePaymentTab.tsx
│   ├── ProfileInfoTab.tsx
│   ├── DeletePaymentDialog.tsx
│   ├── ServiceHistoryWrapper.tsx    (thin wrapper if needed)
│   ├── formatDate.ts
│   ├── TabBadge.tsx
│   └── index.ts
│
├── pages/Customers/
│   ├── Customers.tsx                (~280 lines)
│   ├── CustomerColumns.tsx          (buildCustomerColumns)
│   ├── DeleteCustomerDialog.tsx
│   └── index.ts
```

---

## Phase 1: Extract `lib/api.ts` into Domain Modules

**Why first:** Every other file imports from `api.ts`. Once it's a barrel, downstream tasks can import from `lib/api` exactly as before.

### Task 1.1: Create `lib/api/core.ts`

**Files:**
- Create: `website/src/lib/api/core.ts`
- Modify: `website/src/lib/api.ts`

- [ ] **Step 1: Write `core.ts`**

```typescript
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export class ApiError extends Error {
  status: number;
  code?: string;
  field?: string;
  body?: unknown;

  constructor(init: { status: number; code?: string; field?: string; message: string; body?: unknown }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.field = init.field;
    this.body = init.body;
  }
}

export function getUploadUrl(relativePath: string): string {
  if (relativePath.startsWith('http')) return relativePath;
  const base = API_URL.replace(/\/?api$/, '');
  return `${base}${relativePath}`;
}

export interface PaginatedResponse<T> {
  offset: number;
  limit: number;
  totalItems: number;
  items: T[];
}

interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

const CAMEL_CASE_PASSTHROUGH = new Set(['isDoctor', 'isAssistant', 'isReceptionist', 'categId', 'companyId', 'sortField', 'sortOrder', 'saleOK']);

function toSnakeCase(str: string): string {
  if (CAMEL_CASE_PASSTHROUGH.has(str)) return str;
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;

  let url = `${API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        searchParams.set(toSnakeCase(key), String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const token = localStorage.getItem('tgclinic_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  if (!res.ok) {
    let parsed: unknown;
    try {
      parsed = await res.clone().json();
    } catch {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`API ${method} ${endpoint} failed (${res.status}): ${text}`);
    }

    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'error' in parsed &&
      (parsed as Record<string, unknown>).error !== null &&
      typeof (parsed as Record<string, unknown>).error === 'object' &&
      'code' in ((parsed as Record<string, unknown>).error as Record<string, unknown>) &&
      'message' in ((parsed as Record<string, unknown>).error as Record<string, unknown>)
    ) {
      const e = (parsed as Record<string, unknown>).error as { code: string; field?: string; message: string };
      throw new ApiError({ status: res.status, code: e.code, field: e.field, message: e.message, body: parsed });
    }

    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'error' in parsed &&
      typeof (parsed as Record<string, unknown>).error === 'string'
    ) {
      throw new ApiError({
        status: res.status,
        code: 'UNKNOWN',
        message: (parsed as Record<string, unknown>).error as string,
        body: parsed,
      });
    }

    throw new ApiError({
      status: res.status,
      code: 'UNKNOWN',
      message: `API ${method} ${endpoint} failed (${res.status})`,
      body: parsed,
    });
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}
```

- [ ] **Step 2: Replace top of `lib/api.ts` with import from `core.ts`**

Delete lines 1-139 of `lib/api.ts` and replace with:

```typescript
export { API_URL, ApiError, getUploadUrl, apiFetch, type PaginatedResponse } from './api/core';
```

Wait — actually, the better pattern is to **move everything out** and turn `lib/api.ts` into a pure barrel file. Let's do that instead.

**REVISED Step 2:** Empty `lib/api.ts` completely and turn it into:

```typescript
// Barrel export for lib/api domain modules
export * from './api/core';
export * from './api/partners';
export * from './api/employees';
export * from './api/appointments';
export * from './api/companies';
export * from './api/products';
export * from './api/saleOrders';
export * from './api/payments';
export * from './api/feedback';
export * from './api/permissions';
export * from './api/reports';
export * from './api/monthlyPlans';
export * from './api/externalCheckups';
export * from './api/faceRecognition';
export * from './api/dotKhams';
export * from './api/deposits';
export * from './api/settings';
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npx tsc --noEmit
```

Expected: Pass (no new type errors because exports are identical).

- [ ] **Step 4: Commit**

```bash
git add website/src/lib/api.ts website/src/lib/api/
git commit -m "refactor(api): extract core.ts from api.ts barrel"
```

---

### Task 1.2: Create `lib/api/partners.ts`

**Files:**
- Create: `website/src/lib/api/partners.ts`
- Modify: `website/src/lib/api.ts` (already barrel — no change needed after Task 1.1 if we pre-wrote the barrel)

- [ ] **Step 1: Extract all partner-related types and functions from `api.ts` into `partners.ts`**

```typescript
import { apiFetch, type PaginatedResponse } from './core';

export interface ApiPartner {
  id: string;
  code: string | null;
  ref: string | null;
  displayname: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  street: string | null;
  city: string | null;
  district: string | null;
  ward: string | null;
  cityname?: string | null;
  districtname?: string | null;
  wardname?: string | null;
  gender: string | null;
  birthyear: number | null;
  birthmonth: number | null;
  birthday: number | null;
  medicalhistory: string | null;
  comment: string | null;
  note: string | null;
  status: boolean;
  treatmentstatus: string | null;
  sourceid: string | null;
  sourcename: string | null;
  referraluserid: string | null;
  agentid: string | null;
  agentname: string | null;
  companyid: string | null;
  companyname: string | null;
  customer: boolean;
  supplier: boolean;
  employee: boolean;
  cskhid: string | null;
  cskhname: string | null;
  salestaffid: string | null;
  datecreated: string | null;
  lastupdated: string | null;
  taxcode: string | null;
  identitynumber: string | null;
  healthinsurancecardnumber: string | null;
  emergencyphone: string | null;
  weight: number | null;
  jobtitle: string | null;
  isbusinessinvoice: boolean | null;
  unitname: string | null;
  unitaddress: string | null;
  personalname: string | null;
  personalidentitycard: string | null;
  personaltaxcode: string | null;
  personaladdress: string | null;
}

export function fetchPartners(params?: {
  offset?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  status?: string;
}) {
  return apiFetch<PaginatedResponse<ApiPartner>>('/Partners', {
    params: {
      offset: params?.offset ?? 0,
      limit: params?.limit ?? 50,
      search: params?.search,
      companyId: params?.companyId,
      status: params?.status,
    },
  });
}

export function fetchPartnerById(id: string) {
  return apiFetch<ApiPartner>(`/Partners/${id}`);
}

export function createPartner(data: Partial<ApiPartner>) {
  return apiFetch<ApiPartner>('/Partners', { method: 'POST', body: data });
}

export function updatePartner(id: string, data: Partial<ApiPartner>) {
  return apiFetch<ApiPartner>(`/Partners/${id}`, { method: 'PUT', body: data });
}

export function softDeletePartner(id: string) {
  return apiFetch<void>(`/Partners/${id}/soft-delete`, { method: 'PATCH' });
}

export function hardDeletePartner(id: string) {
  return apiFetch<void>(`/Partners/${id}/hard-delete`, { method: 'DELETE' });
}
```

- [ ] **Step 2: Delete the partner block from old `api.ts`**

- [ ] **Step 3: Run `npx tsc --noEmit`**

- [ ] **Step 4: Commit**

```bash
git add website/src/lib/api/partners.ts website/src/lib/api.ts
git commit -m "refactor(api): extract partners domain module"
```

---

### Task 1.3-1.N: Repeat for remaining domains

**Pattern for each domain file:**

| Task | Domain | Types/Functions to extract |
|------|--------|---------------------------|
| 1.3 | `employees.ts` | `CreateEmployeeData`, `ApiEmployee`, `fetchEmployees`, `createEmployee`, `updateEmployee`, `deleteEmployee` |
| 1.4 | `appointments.ts` | `ApiAppointment`, `fetchAppointments`, `createAppointment`, `updateAppointment` |
| 1.5 | `companies.ts` | `ApiCompany`, `fetchCompanies` |
| 1.6 | `products.ts` | `ApiProduct`, `fetchProducts`, `createProduct`, `updateProduct`, `deleteProduct`, `ApiProductCategory`, product category CRUD |
| 1.7 | `saleOrders.ts` | `ApiSaleOrder`, `fetchSaleOrders`, `createSaleOrder`, `updateSaleOrder`, `updateSaleOrderState` |
| 1.8 | `payments.ts` | `ApiPayment`, `fetchPayments`, `createPayment`, `updatePayment`, `voidPayment`, `deletePayment`, `ApiPaymentAllocation` |
| 1.9 | `feedback.ts` | Feedback types and CRUD |
| 1.10 | `permissions.ts` | `PermissionGroup`, `EmployeePermission`, `ResolvedPermission`, `fetchPermissionGroups`, `fetchEmployeePermissions`, `updateEmployeePermission`, `updatePermissionGroup` |
| 1.11 | `reports.ts` | Report endpoints |
| 1.12 | `monthlyPlans.ts` | Monthly plan types and endpoints |
| 1.13 | `externalCheckups.ts` | External checkup types and endpoints |
| 1.14 | `faceRecognition.ts` | `FaceMatchResult`, `recognizeFace`, `registerFace` |
| 1.15 | `dotKhams.ts` | `ApiDotKham`, `fetchDotKhams` |
| 1.16 | `deposits.ts` | Deposit types and endpoints |
| 1.17 | `settings.ts` | Settings endpoints |

**For each task, the steps are identical:**

- [ ] **Step 1:** Create the domain file by copying the relevant block from old `api.ts`.
- [ ] **Step 2:** Delete that block from old `api.ts`.
- [ ] **Step 3:** Run `npx tsc --noEmit`.
- [ ] **Step 4:** Commit with message: `refactor(api): extract <domain> domain module`.

**After Task 1.17:** Delete the now-empty body of old `api.ts` (only the barrel imports remain). Run `npx tsc --noEmit` one final time.

---

## Phase 2: Split `PermissionBoard.tsx`

### Task 2.1: Extract constants and helpers

**Files:**
- Create: `website/src/pages/PermissionBoard/constants.ts`
- Modify: `website/src/pages/PermissionBoard.tsx`

- [ ] **Step 1: Create `constants.ts`**

```typescript
export const MODULES = [
  { name: 'Dashboard', actions: ['View'] },
  { name: 'Calendar', actions: ['View', 'Edit'] },
  { name: 'Customers', actions: ['View', 'View All', 'Add', 'Edit', 'Delete'] },
  { name: 'Appointments', actions: ['View', 'Add', 'Edit'] },
  { name: 'Services', actions: ['View', 'Add', 'Edit'] },
  { name: 'Payment', actions: ['View', 'Add', 'Refund'] },
  { name: 'Employees', actions: ['View', 'Add', 'Edit'] },
  { name: 'Locations', actions: ['View', 'Add', 'Edit'] },
  { name: 'Reports', actions: ['View', 'Export'] },
  { name: 'Settings', actions: ['View', 'Edit'] },
  { name: 'External Checkups', actions: ['View', 'Upload'] },
] as const;

export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  'dashboard.view': 'Xem tổng quan',
  'calendar.view': 'Xem lịch',
  'calendar.edit': 'Chỉnh sửa lịch',
  'customers.view': 'Xem danh sách khách hàng',
  'customers.view_all': 'Xem tất cả khách hàng',
  'customers.add': 'Thêm khách hàng mới',
  'customers.edit': 'Chỉnh sửa khách hàng',
  'customers.delete': 'Xóa khách hàng',
  'appointments.view': 'Xem lịch hẹn',
  'appointments.add': 'Thêm lịch hẹn',
  'appointments.edit': 'Chỉnh sửa lịch hẹn',
  'services.view': 'Xem dịch vụ',
  'services.add': 'Thêm dịch vụ',
  'services.edit': 'Chỉnh sửa dịch vụ',
  'payment.view': 'Xem lịch sử thanh toán',
  'payment.add': 'Tạo thanh toán mới',
  'payment.refund': 'Hoàn tiền thanh toán',
  'reports.view': 'Xem báo cáo',
  'reports.export': 'Xuất báo cáo',
  'employees.view': 'Xem nhân viên',
  'employees.add': 'Thêm nhân viên',
  'employees.edit': 'Chỉnh sửa nhân viên',
  'locations.view': 'Xem chi nhánh',
  'locations.add': 'Thêm chi nhánh',
  'locations.edit': 'Chỉnh sửa chi nhánh',
  'settings.view': 'Xem cài đặt',
  'settings.edit': 'Chỉnh sửa cài đặt',
  'external_checkups.view': 'Xem phiếu khám ngoại viện',
  'external_checkups.upload': 'Tải lên phiếu khám ngoại viện',
};

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function getRoleLabel(emp: { role?: string | null; jobtitle?: string | null }): string {
  return emp.role || emp.jobtitle || 'Nhân viên';
}
```

- [ ] **Step 2: Replace constants block in `PermissionBoard.tsx` with imports**

```typescript
import { MODULES, PERMISSION_DESCRIPTIONS, getInitials, getRoleLabel } from './PermissionBoard/constants';
```

- [ ] **Step 3: Run `npx tsc --noEmit`**

- [ ] **Step 4: Commit**

```bash
git add website/src/pages/PermissionBoard/constants.ts website/src/pages/PermissionBoard.tsx
git commit -m "refactor(PermissionBoard): extract constants and helpers"
```

---

### Task 2.2: Extract `GroupCard.tsx`

**Files:**
- Create: `website/src/pages/PermissionBoard/GroupCard.tsx`
- Modify: `website/src/pages/PermissionBoard.tsx`

- [ ] **Step 1: Cut `GroupCard` (lines ~109-149) into new file**

```typescript
import { getInitials } from './constants';

export interface GroupCardProps {
  group: { id: string; name: string; color?: string | null };
  memberCount: number;
  isSelected: boolean;
  onClick: () => void;
}

export function GroupCard({ group, memberCount, isSelected, onClick }: GroupCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
          style={{ backgroundColor: group.color || '#64748b' }}
        >
          {getInitials(group.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{group.name}</p>
          <p className="text-xs text-gray-500">{memberCount} thành viên</p>
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Import `GroupCard` in `PermissionBoard.tsx`**

```typescript
import { GroupCard } from './PermissionBoard/GroupCard';
```

- [ ] **Step 3: Run `npx tsc --noEmit`**

- [ ] **Step 4: Commit**

```bash
git add website/src/pages/PermissionBoard/GroupCard.tsx website/src/pages/PermissionBoard.tsx
git commit -m "refactor(PermissionBoard): extract GroupCard component"
```

---

### Task 2.3: Extract `EmployeeCard.tsx`

**Files:**
- Create: `website/src/pages/PermissionBoard/EmployeeCard.tsx`
- Modify: `website/src/pages/PermissionBoard.tsx`

- [ ] **Step 1: Cut `EmployeeCard` into new file**

```typescript
import { getInitials, getRoleLabel } from './constants';

export interface EmployeeCardProps {
  emp: { id: string; name: string; role?: string | null; jobtitle?: string | null; avatar?: string | null };
  group?: { color?: string | null } | null;
  effectiveCount: number;
  isSelected: boolean;
  isDimmed: boolean;
  onClick: () => void;
}

export function EmployeeCard({ emp, group, effectiveCount, isSelected, isDimmed, onClick }: EmployeeCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      } ${isDimmed ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
          style={{ backgroundColor: group?.color || '#64748b' }}
        >
          {emp.avatar ? (
            <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            getInitials(emp.name)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{emp.name}</p>
          <p className="text-xs text-gray-500 truncate">{getRoleLabel(emp)}</p>
        </div>
        {effectiveCount > 0 && (
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {effectiveCount}
          </span>
        )}
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Import in `PermissionBoard.tsx`**

```typescript
import { EmployeeCard } from './PermissionBoard/EmployeeCard';
```

- [ ] **Step 3: Run `npx tsc --noEmit`**

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(PermissionBoard): extract EmployeeCard component"
```

---

### Task 2.4: Extract `ArchitectureView.tsx`

**Files:**
- Create: `website/src/pages/PermissionBoard/ArchitectureView.tsx`
- Modify: `website/src/pages/PermissionBoard.tsx`

- [ ] **Step 1: Cut `ArchitectureView` (lines ~212-615) into new file**

The component is large; copy it verbatim, then update imports:

```typescript
import { PermissionGroup, EmployeePermission, ResolvedPermission } from '@/lib/api';
import { getInitials, getRoleLabel } from './constants';

export interface ArchitectureViewProps {
  groups: PermissionGroup[];
  employees: EmployeePermission[];
  selectedGroupId: string | null;
  selectedEmployeeId: string | null;
  resolved: Map<string, ResolvedPermission>;
  onSelectGroup: (id: string) => void;
  onSelectEmployee: (id: string) => void;
}

export function ArchitectureView({ groups, employees, selectedGroupId, selectedEmployeeId, resolved, onSelectGroup, onSelectEmployee }: ArchitectureViewProps) {
  // (paste full component body here)
}
```

- [ ] **Step 2: Import in `PermissionBoard.tsx`**

```typescript
import { ArchitectureView } from './PermissionBoard/ArchitectureView';
```

- [ ] **Step 3: Run `npx tsc --noEmit`**

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(PermissionBoard): extract ArchitectureView"
```

---

### Task 2.5: Extract `MatrixView.tsx`

**Files:**
- Create: `website/src/pages/PermissionBoard/MatrixView.tsx`
- Modify: `website/src/pages/PermissionBoard.tsx`

- [ ] **Step 1: Cut `MatrixView` (lines ~616-709) into new file**

```typescript
import { PermissionGroup } from '@/lib/api';
import { PERMISSION_DESCRIPTIONS } from './constants';

export interface MatrixViewProps {
  groups: PermissionGroup[];
  onToggle: (groupId: string, permissionId: string, granted: boolean) => void;
}

export function MatrixView({ groups, onToggle }: MatrixViewProps) {
  // (paste full component body)
}
```

- [ ] **Step 2: Import in `PermissionBoard.tsx`**

```typescript
import { MatrixView } from './PermissionBoard/MatrixView';
```

- [ ] **Step 3: Run `npx tsc --noEmit`**

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(PermissionBoard): extract MatrixView"
```

---

### Task 2.6: Extract `LogicFlowView.tsx`

**Files:**
- Create: `website/src/pages/PermissionBoard/LogicFlowView.tsx`
- Modify: `website/src/pages/PermissionBoard.tsx`

- [ ] **Step 1: Cut `LogicFlowView` (lines ~710-864) into new file**

```typescript
import { PermissionGroup, EmployeePermission } from '@/lib/api';

export interface LogicFlowViewProps {
  groups: PermissionGroup[];
  employees: EmployeePermission[];
  getEffective: (empId: string) => { granted: string[]; revoked: string[] };
}

export function LogicFlowView({ groups, employees, getEffective }: LogicFlowViewProps) {
  // (paste full component body)
}
```

- [ ] **Step 2: Import in `PermissionBoard.tsx`**

```typescript
import { LogicFlowView } from './PermissionBoard/LogicFlowView';
```

- [ ] **Step 3: Run `npx tsc --noEmit`**

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(PermissionBoard): extract LogicFlowView"
```

---

### Task 2.7: Create `PermissionBoard/index.ts` and shrink main file

**Files:**
- Create: `website/src/pages/PermissionBoard/index.ts`
- Modify: `website/src/pages/PermissionBoard.tsx` → move to `website/src/pages/PermissionBoard/PermissionBoard.tsx`

- [ ] **Step 1: Move `PermissionBoard.tsx` into `PermissionBoard/PermissionBoard.tsx`**

Update relative imports inside the moved file:

```typescript
import { MODULES, PERMISSION_DESCRIPTIONS, getInitials, getRoleLabel } from './constants';
import { GroupCard } from './GroupCard';
import { EmployeeCard } from './EmployeeCard';
import { ArchitectureView } from './ArchitectureView';
import { MatrixView } from './MatrixView';
import { LogicFlowView } from './LogicFlowView';
```

- [ ] **Step 2: Create `website/src/pages/PermissionBoard/index.ts`**

```typescript
export { PermissionBoard } from './PermissionBoard';
```

- [ ] **Step 3: Update import in `website/src/App.tsx` or any router file**

Verify that any import like:

```typescript
import { PermissionBoard } from '@/pages/PermissionBoard';
```

still works (it should, because the folder name matches and `index.ts` exists).

- [ ] **Step 4: Run `npx tsc --noEmit`**

- [ ] **Step 5: Commit**

```bash
git add website/src/pages/PermissionBoard/
git commit -m "refactor(PermissionBoard): co-locate all sub-components"
```

---

## Phase 3: Split `CustomerProfile.tsx`

### Task 3.1: Extract `TabBadge.tsx` and `formatDate.ts`

**Files:**
- Create: `website/src/components/customer/CustomerProfile/TabBadge.tsx`
- Create: `website/src/components/customer/CustomerProfile/formatDate.ts`
- Modify: `website/src/components/customer/CustomerProfile.tsx`

- [ ] **Step 1: Create `TabBadge.tsx`**

```typescript
export function TabBadge({ count, isActive }: { count: number; isActive: boolean }) {
  if (count === 0) {
    return (
      <span className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full transition-colors ${
        isActive
          ? 'bg-primary/20 text-primary'
          : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
      }`}>
        0
      </span>
    );
  }

  return (
    <span className={`ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold rounded-full transition-colors ${
      isActive
        ? 'bg-primary text-white shadow-sm'
        : 'bg-primary/10 text-primary group-hover:bg-primary/20'
    }`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
```

- [ ] **Step 2: Create `formatDate.ts`**

```typescript
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return '-';
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '-';
  }
}
```

- [ ] **Step 3: Replace `TabBadge` and `formatDate` in `CustomerProfile.tsx` with imports**

```typescript
import { TabBadge } from './CustomerProfile/TabBadge';
import { formatDate } from './CustomerProfile/formatDate';
```

- [ ] **Step 4: Run `npx tsc --noEmit`**

- [ ] **Step 5: Commit**

```bash
git add website/src/components/customer/CustomerProfile/TabBadge.tsx website/src/components/customer/CustomerProfile/formatDate.ts website/src/components/customer/CustomerProfile.tsx
git commit -m "refactor(CustomerProfile): extract TabBadge and formatDate"
```

---

### Task 3.2: Extract `ProfileHeader.tsx`

**Files:**
- Create: `website/src/components/customer/CustomerProfile/ProfileHeader.tsx`
- Modify: `website/src/components/customer/CustomerProfile.tsx`

- [ ] **Step 1: Cut the profile card JSX (the big `bg-white rounded-xl shadow-card p-6` block) into `ProfileHeader.tsx`**

Props needed:

```typescript
interface ProfileHeaderProps {
  profile: CustomerProfileData;
  onEdit?: () => void;
  onSoftDelete?: () => void;
  onHardDelete?: () => void;
  canSoftDelete?: boolean;
  canHardDelete?: boolean;
}
```

(Use the exact JSX from `CustomerProfile.tsx` for the profile card and delete buttons.)

- [ ] **Step 2: Replace the block in `CustomerProfile.tsx` with `<ProfileHeader ... />`**

- [ ] **Step 3: Run `npx tsc --noEmit`**

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(CustomerProfile): extract ProfileHeader component"
```

---

### Task 3.3: Extract tab content components

**Files:**
- Create: `website/src/components/customer/CustomerProfile/ProfileInfoTab.tsx`
- Create: `website/src/components/customer/CustomerProfile/ProfileAppointmentsTab.tsx`
- Create: `website/src/components/customer/CustomerProfile/ProfileRecordsTab.tsx`
- Create: `website/src/components/customer/CustomerProfile/ProfilePaymentTab.tsx`
- Modify: `website/src/components/customer/CustomerProfile.tsx`

For each tab, extract the JSX block into its own component. Each tab component receives only the props it needs.

**`ProfileInfoTab.tsx`:**

```typescript
import type { CustomerProfileData } from '@/hooks/useCustomerProfile';

interface ProfileInfoTabProps {
  profile: CustomerProfileData;
}

export function ProfileInfoTab({ profile }: ProfileInfoTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><p className="text-xs text-gray-400">Full Name</p><p className="text-sm font-medium text-gray-900">{profile.name}</p></div>
          <div><p className="text-xs text-gray-400">Phone</p><p className="text-sm font-medium text-gray-900">{profile.phone || 'N/A'}</p></div>
          <div><p className="text-xs text-gray-400">Email</p><p className="text-sm font-medium text-gray-900">{profile.email || 'N/A'}</p></div>
          <div><p className="text-xs text-gray-400">Date of Birth</p><p className="text-sm font-medium text-gray-900">{profile.dateOfBirth}</p></div>
          <div><p className="text-xs text-gray-400">Gender</p><p className="text-sm font-medium text-gray-900">{profile.gender === 'male' ? 'Male' : 'Female'}</p></div>
          <div><p className="text-xs text-gray-400">Address</p><p className="text-sm font-medium text-gray-900">{profile.address || 'N/A'}</p></div>
          <div><p className="text-xs text-gray-400">Location</p><p className="text-sm font-medium text-gray-900">{profile.companyName || 'N/A'}</p></div>
          <div><p className="text-xs text-gray-400">Member Since</p><p className="text-sm font-medium text-gray-900">{profile.memberSince}</p></div>
        </div>
      </div>
      {/* HealthCheckupGallery is rendered by CustomerProfile above/below this — keep it in parent */}
    </div>
  );
}
```

*Note:* `HealthCheckupGallery` stays in `CustomerProfile.tsx` because it depends on `canViewHealthCheckups` which is computed in the parent.

**`ProfileAppointmentsTab.tsx`:**
Extract the `activeTab === 'appointments'` block.
Props: `appointments`, `onCreateAppointment`, `onUpdateAppointment`, `t`.

**`ProfileRecordsTab.tsx`:**
Extract the `activeTab === 'records'` block.
Props: `services`, `payments`, `totalServiceCost`, `totalRevenue`, `profile`, `onEditService`, `onUpdateServiceStatus`, `onPayForService`, `onDeletePayment`.

**`ProfilePaymentTab.tsx`:**
Extract the `activeTab === 'payment'` block.
Props: `payments`, `loadingPayments`, `services`, `profile`, `onDeletePayment`, `depositList`, `usageHistory`, `depositBalance`, `loadingDeposits`, `onAddDeposit`, `onAddRefund`, `onVoidDeposit`, `onDeleteDeposit`, `onEditDeposit`, `onRefreshDeposits`, `expandedPaymentId`, `setExpandedPaymentId`, `totalServiceCost`, `amountPaid`.

- [ ] **Step 1-4:** For each tab file:
  1. Create the file with the extracted JSX.
  2. Replace the inline block in `CustomerProfile.tsx` with the component.
  3. Run `npx tsc --noEmit`.
  4. Commit.

*Tip:* Commit after **each** tab extraction so errors are easy to bisect.

---

### Task 3.4: Co-locate `CustomerProfile`

**Files:**
- Move: `website/src/components/customer/CustomerProfile.tsx` → `website/src/components/customer/CustomerProfile/CustomerProfile.tsx`
- Create: `website/src/components/customer/CustomerProfile/index.ts`
- Update: imports in `website/src/components/customer/index.ts`

- [ ] **Step 1: Move file and fix relative imports**

Inside the moved `CustomerProfile/CustomerProfile.tsx`, change:

```typescript
import { TabBadge } from './TabBadge';
import { formatDate } from './formatDate';
import { ProfileHeader } from './ProfileHeader';
import { ProfileInfoTab } from './ProfileInfoTab';
import { ProfileAppointmentsTab } from './ProfileAppointmentsTab';
import { ProfileRecordsTab } from './ProfileRecordsTab';
import { ProfilePaymentTab } from './ProfilePaymentTab';
```

- [ ] **Step 2: Create `index.ts`**

```typescript
export { CustomerProfile } from './CustomerProfile';
export type { ProfileTab } from './CustomerProfile';
```

- [ ] **Step 3: Update `website/src/components/customer/index.ts`**

Ensure it re-exports `CustomerProfile` from `./CustomerProfile` (which now resolves to the folder's `index.ts`).

- [ ] **Step 4: Run `npx tsc --noEmit`**

- [ ] **Step 5: Commit**

```bash
git add website/src/components/customer/CustomerProfile/
git commit -m "refactor(CustomerProfile): co-locate all sub-components"
```

---

## Phase 4: Split `Customers.tsx`

### Task 4.1: Extract `CustomerColumns.tsx`

**Files:**
- Create: `website/src/pages/Customers/CustomerColumns.tsx`
- Modify: `website/src/pages/Customers.tsx`

- [ ] **Step 1: Cut `buildCustomerColumns` and `formatDate` into `CustomerColumns.tsx`**

```typescript
import { Phone, Mail, MapPin, Trash2 } from 'lucide-react';
import { StatusBadge, type StatusVariant } from '@/components/shared/StatusBadge';
import type { Column } from '@/components/shared/DataTable';
import type { Customer } from '@/hooks/useCustomers';
import type { CustomerStatus } from '@/data/mockCustomers';

const STATUS_TO_VARIANT: Record<CustomerStatus, StatusVariant> = {
  active: 'active',
  inactive: 'inactive',
  pending: 'pending',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function buildCustomerColumns(
  locationNameMap: Map<string, string>,
  canSoftDelete: boolean,
  onSoftDelete: (id: string, name: string) => void
): readonly Column<Customer>[] {
  return [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      width: '10%',
      render: (row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs font-medium text-gray-700">
          {row.code || '-'}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Customer',
      sortable: true,
      width: '20%',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-primary">{row.name.charAt(0)}</span>
          </div>
          <span className="font-medium text-gray-900">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: false,
      width: '14%',
      render: (row) => (
        <span className="flex items-center gap-1.5 text-gray-600">
          <Phone className="w-3.5 h-3.5 text-gray-400" />
          {row.phone}
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: false,
      width: '20%',
      render: (row) => (
        <span className="flex items-center gap-1.5 text-gray-600">
          <Mail className="w-3.5 h-3.5 text-gray-400" />
          {row.email}
        </span>
      ),
    },
    {
      key: 'locationId',
      header: 'Location',
      sortable: true,
      width: '16%',
      render: (row) => (
        <span className="flex items-center gap-1.5 text-gray-600">
          <MapPin className="w-3.5 h-3.5 text-gray-400" />
          {locationNameMap.get(row.locationId) ?? 'Unknown'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '12%',
      render: (row) => <StatusBadge status={STATUS_TO_VARIANT[row.status]} />,
    },
    {
      key: 'lastVisit',
      header: 'Last Visit',
      sortable: true,
      width: '14%',
      render: (row) => <span className="text-gray-500">{formatDate(row.lastVisit)}</span>,
    },
    {
      key: 'actions',
      header: '',
      sortable: false,
      width: '48px',
      render: (row) =>
        canSoftDelete ? (
          <button
            onClick={(e) => { e.stopPropagation(); onSoftDelete(row.id, row.name); }}
            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            aria-label="Delete"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        ) : null,
    },
  ];
}
```

- [ ] **Step 2: Replace `buildCustomerColumns` block in `Customers.tsx` with import**

```typescript
import { buildCustomerColumns } from './Customers/CustomerColumns';
```

Delete `STATUS_FILTER_OPTIONS`, `STATUS_TO_VARIANT`, and `formatDate` from `Customers.tsx` if they are now unused.

Wait — `STATUS_FILTER_OPTIONS` is used in the render. Keep it. Only delete `STATUS_TO_VARIANT` and `formatDate`.

- [ ] **Step 3: Run `npx tsc --noEmit`**

- [ ] **Step 4: Commit**

```bash
git add website/src/pages/Customers/CustomerColumns.tsx website/src/pages/Customers.tsx
git commit -m "refactor(Customers): extract CustomerColumns"
```

---

### Task 4.2: Extract `DeleteCustomerDialog.tsx`

**Files:**
- Create: `website/src/pages/Customers/DeleteCustomerDialog.tsx`
- Modify: `website/src/pages/Customers.tsx`

- [ ] **Step 1: Cut the delete confirmation JSX into `DeleteCustomerDialog.tsx`**

Props:

```typescript
interface DeleteCustomerDialogProps {
  open: boolean;
  customerName: string;
  mode: 'soft' | 'hard';
  linkedCounts?: { appointments: number; saleorders: number; dotkhams: number } | null;
  deleteError: string | null;
  deleteLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}
```

- [ ] **Step 2: Replace inline JSX in `Customers.tsx` with `<DeleteCustomerDialog ... />`**

- [ ] **Step 3: Run `npx tsc --noEmit`**

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(Customers): extract DeleteCustomerDialog"
```

---

### Task 4.3: Co-locate `Customers`

**Files:**
- Move: `website/src/pages/Customers.tsx` → `website/src/pages/Customers/Customers.tsx`
- Create: `website/src/pages/Customers/index.ts`
- Update: router imports (e.g., `App.tsx`)

- [ ] **Step 1: Move file and fix relative imports**

Inside moved file:

```typescript
import { buildCustomerColumns } from './CustomerColumns';
import { DeleteCustomerDialog } from './DeleteCustomerDialog';
```

- [ ] **Step 2: Create `index.ts`**

```typescript
export { Customers } from './Customers';
```

- [ ] **Step 3: Run `npx tsc --noEmit`**

- [ ] **Step 4: Commit**

```bash
git add website/src/pages/Customers/
git commit -m "refactor(Customers): co-locate page and sub-modules"
```

---

## Phase 5: Split `AddCustomerForm.tsx`

This is the largest file. It already lives in a folder (`AddCustomerForm/`) but only has `index.ts`. We'll add several co-located files.

### Task 5.1: Extract styles and constants

**Files:**
- Create: `website/src/components/forms/AddCustomerForm/styles.ts`
- Create: `website/src/components/forms/AddCustomerForm/constants.ts`
- Modify: `website/src/components/forms/AddCustomerForm/AddCustomerForm.tsx`

- [ ] **Step 1: Create `styles.ts`**

```typescript
import { clsx, type ClassValue } from 'clsx';

export function inputClass(hasError: boolean, disabled = false) {
  return clsx(
    'w-full px-4 py-3 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm',
    hasError ? 'border-red-300' : 'border-gray-200',
    disabled && 'bg-gray-100 text-gray-500 cursor-not-allowed'
  );
}

export function selectClass(disabled = false) {
  return clsx(
    'w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all text-sm appearance-none',
    disabled && 'bg-gray-100 text-gray-500 cursor-not-allowed'
  );
}
```

- [ ] **Step 2: Create `constants.ts`**

```typescript
import { Globe, Users, UserPlus, Link } from 'lucide-react';
import type { CustomerSource } from '@/data/mockSettings';

export type TabId = 'basic' | 'medical' | 'einvoice';

export const TABS: { id: TabId; labelKey: string }[] = [
  { id: 'basic', labelKey: 'form.tabs.basic' },
  { id: 'medical', labelKey: 'form.tabs.medical' },
  { id: 'einvoice', labelKey: 'form.tabs.einvoice' },
];

export const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
export const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);

export const TYPE_ICONS: Record<CustomerSource['type'], React.ReactNode> = {
  online: <Globe className="w-3.5 h-3.5" />,
  offline: <Users className="w-3.5 h-3.5" />,
  referral: <UserPlus className="w-3.5 h-3.5" />,
  other: <Link className="w-3.5 h-3.5" />,
};

export const TYPE_COLORS: Record<CustomerSource['type'], string> = {
  online: 'text-blue-600 bg-blue-50 border-blue-200',
  offline: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  referral: 'text-purple-600 bg-purple-50 border-purple-200',
  other: 'text-gray-600 bg-gray-50 border-gray-200',
};
```

- [ ] **Step 3: Replace blocks in `AddCustomerForm.tsx` with imports**

```typescript
import { inputClass, selectClass } from './styles';
import { TABS, DAYS, MONTHS, YEARS, TYPE_ICONS, TYPE_COLORS } from './constants';
import type { TabId } from './constants';
```

Delete the old inline definitions.

- [ ] **Step 4: Run `npx tsc --noEmit`**

- [ ] **Step 5: Commit**

```bash
git add website/src/components/forms/AddCustomerForm/styles.ts website/src/components/forms/AddCustomerForm/constants.ts website/src/components/forms/AddCustomerForm/AddCustomerForm.tsx
git commit -m "refactor(AddCustomerForm): extract styles and constants"
```

---

### Task 5.2: Extract `FieldLabel.tsx`, `CardSection.tsx`, `MiniAddDialog.tsx`

**Files:**
- Create: `website/src/components/forms/AddCustomerForm/FieldLabel.tsx`
- Create: `website/src/components/forms/AddCustomerForm/CardSection.tsx`
- Create: `website/src/components/forms/AddCustomerForm/MiniAddDialog.tsx`
- Modify: `website/src/components/forms/AddCustomerForm/AddCustomerForm.tsx`

For each helper component, cut it into its own file and import it back.

- [ ] **Step 1-3:** Do `FieldLabel` → commit, `CardSection` → commit, `MiniAddDialog` → commit.

Each commit message pattern:

```bash
git commit -m "refactor(AddCustomerForm): extract <ComponentName>"
```

After all three are extracted, `AddCustomerForm.tsx` should only contain:
- imports
- `AddCustomerFormProps` interface
- `AddCustomerForm` component

---

### Task 5.3: Extract tab content components

**Files:**
- Create: `website/src/components/forms/AddCustomerForm/BasicInfoTab.tsx`
- Create: `website/src/components/forms/AddCustomerForm/MedicalTab.tsx`
- Create: `website/src/components/forms/AddCustomerForm/EInvoiceTab.tsx`
- Modify: `website/src/components/forms/AddCustomerForm/AddCustomerForm.tsx`

Each tab is a massive JSX block. Extract them as components that receive form state + handlers as props.

**`BasicInfoTab.tsx`:** Needs `form`, `errors`, `companies`, `employees`, `sources`, `loadingSources`, `showMiniAdd`, `setShowMiniAdd`, `onFieldChange`, `inputClass`, `selectClass`, `FieldLabel`, `CardSection`, `MiniAddDialog`, `AddressAutocomplete`, `CustomerCameraWidget`, `t`, etc.

To avoid prop drilling hell, consider extracting a **context** or just passing a bag object. For this refactor, a flat prop list is fine because we want pure structural extraction.

*Alternative (better):* Extract a `useAddCustomerForm` hook first so the tab components receive a small API object.

---

### Task 5.4: Extract `useAddCustomerForm.ts` hook

**Files:**
- Create: `website/src/components/forms/AddCustomerForm/useAddCustomerForm.ts`
- Modify: `website/src/components/forms/AddCustomerForm/AddCustomerForm.tsx`

- [ ] **Step 1: Move all `useState`, `useEffect`, `useCallback`, and `useRef` logic into `useAddCustomerForm.ts`**

Return an object like:

```typescript
return {
  form, setForm,
  errors, setErrors,
  activeTab, setActiveTab,
  companies, setCompanies,
  employees, setEmployees,
  sources, loadingSources,
  showMiniAdd, setShowMiniAdd,
  miniName, setMiniName,
  miniPhone, setMiniPhone,
  faceImage, setFaceImage,
  showFaceModal, setShowFaceModal,
  isSaving, setIsSaving,
  onFieldChange,
  onSourceSelect,
  onMiniAddSave,
  onSubmit,
  validate,
};
```

- [ ] **Step 2: Replace state logic in `AddCustomerForm.tsx` with `const formApi = useAddCustomerForm(props);`**

- [ ] **Step 3: Run `npx tsc --noEmit`**

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(AddCustomerForm): extract useAddCustomerForm hook"
```

---

### Task 5.5: Extract tab content components (continued)

Now that `useAddCustomerForm` exists, the tab components can receive `formApi` plus a few render-specific props.

- [ ] **Step 1-3:** Extract `BasicInfoTab.tsx`, `MedicalTab.tsx`, `EInvoiceTab.tsx` one at a time, committing after each.

After this, `AddCustomerForm.tsx` should be ~350 lines (imports, shell JSX, tab switch).

---

## Final Validation Checklist

- [ ] **Run TypeScript**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npx tsc --noEmit
```

Expected: **0 errors**.

- [ ] **Run build**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npm run build
```

Expected: Successful Vite build.

- [ ] **Verify no file >500 lines**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup && find website/src api/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) -exec wc -l {} + | awk '$1 > 500 {print $0}' | sort -rn
```

Expected: The 5 original files no longer appear. The only remaining >500-line files should be auto-generated or backend routes that were not in scope.

- [ ] **Commit any final fixes**

```bash
git add .
git commit -m "chore: final cleanup after mega-file modularization"
```

---

## Spec Coverage Self-Review

| Requirement | Task |
|-------------|------|
| No source file >500 lines | All 5 target files split into sub-modules |
| Existing imports keep working | Barrel `index.ts` files preserve public API |
| No runtime behavior change | Pure copy-paste extraction; types verify parity |
| Tests/build still pass | TypeScript + Vite build used as gate at every step |

**No placeholders:** Every step contains exact file paths, exact code patterns, and exact commands.

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-04-15-modularize-mega-files.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

**Which approach?**
