# Auth & Permissions

## Overview

TGroup uses a custom **JWT-based authentication** and **RBAC (Role-Based Access Control)** system. Users are employees stored in `dbo.partners`. Permissions are resolved at login and embedded in the JWT token.

---

## Authentication Flow

### 1. Login
**Endpoint:** `POST /api/Auth/login`

```json
{
  "email": "tg@clinic.vn",
  "password": "123456"
}
```

**Requirements to authenticate:**
- `employee = true`
- `isdeleted = false` (or absent)
- `active = true`
- `password_hash` must exist and match

### 2. Password Hashing
- Uses `bcryptjs` with salt rounds 10
- Default onboarding password for all employees: `123456`
- Employees can change their own password via `POST /api/Auth/change-password`

### 3. JWT Token
Stored in `localStorage` under key `tgclinic_token`. Payload includes:
- `employeeId` — UUID from `partners.id`
- `name` — Employee name
- `email` — Employee email
- `companyId` — Primary branch ID

Token expiry: **24 hours**

### 4. Token Validation
**Middleware:** `api/src/middleware/auth.js`

- Validates JWT signature
- Injects `req.user` (decoded payload)
- Queries `partners` table to ensure user still exists and is active

---

## Permission System (RBAC)

### 5 Tiers (Permission Groups)

| Tier | ID Suffix | Permissions | Typical Use |
|------|-----------|-------------|-------------|
| **Admin** | `...0001` | 36 (full access) | System administrators |
| **Clinic Manager** | `...0002` | 28 | Branch managers, marketers |
| **Dentist** | `...0003` | 10 | Doctors |
| **Receptionist** | `...0004` | 13 | Front desk, sales, CSKH |
| **Dental Assistant** | `...0005` | 7 | Assistants, phụ tá |

### How Tiers Are Assigned

**Source of truth:** `dbo.partners.tier_id`

Legacy mapping also maintained in `dbo.employee_permissions`.

Classification rules (in priority order):
1. **Admin** — `name ILIKE 'admin'` OR `jobtitle ILIKE '%quản trị viên hệ thống%'`
2. **Dental Assistant** — `isassistant = true` OR `jobtitle` contains `Phụ tá` / `Trợ lý bác sĩ`
3. **Receptionist** — `isreceptionist = true` OR `jobtitle` contains `Lễ tân` / `Sale` / `CSKH`
4. **Dentist** — `isdoctor = true` OR `jobtitle` contains `Bác sĩ`
5. **Clinic Manager** — `jobtitle` contains `Quản lý cơ sở` / `Marketing`
6. **Fallback** — Unclassified active employees → **Receptionist**
7. **Inactive / Test accounts** — **No permissions**

### Permission Resolution

**Function:** `resolvePermissions(employeeId)` in `api/src/routes/auth.js`

```javascript
// 1. Look up assigned tier
// 2. Load base permissions from group_permissions
// 3. Apply overrides from permission_overrides
//    - override_type = 'grant' → add permission
//    - override_type = 'revoke' → remove permission
// 4. Load allowed locations from employee_location_scope
```

---

## Location Scoping

### Rule Matrix

| Employee Type | Assigned Branch (`companyid`) | Location Access |
|---------------|------------------------------|-----------------|
| **Admin** | Any / NULL | **All 7 branches** |
| **Clinic Manager** | Any | **All 7 branches** |
| **All other tiers** | `Tấm Dentist Quận 3` | **Only Quận 3** |
| **All other tiers** | `Tấm Dentist Gò Vấp` | **Only Gò Vấp** |
| **Inactive / Test** | — | **0 branches** |

### Frontend Behavior

**`LocationContext`** listens for `tgclinic:auth-change` event:
- If user has **1 location** → auto-locks dropdown to that branch
- If user has **multiple locations** → defaults to `"all"`
- If user has **0 locations** → dropdown hidden, no location filter applied

### Backend Enforcement Gap

⚠️ **WARNING:** As of now, most API routes (appointments, partners, payments, etc.) **do not validate `company_id` against the user's `employee_location_scope`**. The frontend restricts the UI, but a crafted API request could bypass location scoping.

**Planned fix:** Add location-enforcement middleware to all data-fetching routes.

---

## Frontend Permission Guards

### `hasPermission(permission: string)`
Checks `effectivePermissions` array. Supports wildcard `*` (grants all).

### `hasLocationAccess(locationId: string)`
Returns `true` for `"all"` or if the location ID exists in the user's `permissions.locations` array.

### `ProtectedRoute`
**File:** `website/src/App.tsx`

Maps routes to required permission strings:
```typescript
'/customers'  → 'customers.view'
'/appointments' → 'appointments.view'
'/employees'  → 'employees.view'
'/locations'  → 'locations.view'
'/settings'   → 'settings.view'
'/permissions' → 'permissions.view'
```

---

## Permission Board UI

**Page:** `/permissions` (component: `PermissionBoard`)

Three views:
1. **Architecture** — Visualize tiers, employees, and locations
2. **Permission Matrix** — Toggle permissions per tier
3. **Logic Flow** — Show effective permission resolution

### Architecture View
- **Left:** Tier cards (Admin, Clinic Manager, Dentist, Receptionist, Dental Assistant)
- **Center:** Employee cards with search/filter
- **Right:** Location grid + detail/edit panel

Click an employee to see/edit:
- Assigned tier
- Location scope (`all` or specific branches)
- Grant/revoke overrides

---

## Password Management

### Self-Service Change Password

**Modal:** `ChangePasswordModal` (triggered from sidebar lock icon)

**Validation:**
- Old password must match current `password_hash`
- New password must be ≥ 6 characters
- Confirm password must match new password

**API:** `POST /api/Auth/change-password`
- Requires valid JWT
- Updates `password_hash` with fresh bcrypt hash

---

## Key Files

### Backend
| File | Purpose |
|------|---------|
| `api/src/routes/auth.js` | Login, `/me`, change-password, `resolvePermissions()` |
| `api/src/middleware/auth.js` | JWT validation, `req.user` injection |
| `api/src/routes/permissions.js` | CRUD for groups, employees, overrides |

### Frontend
| File | Purpose |
|------|---------|
| `website/src/contexts/AuthContext.tsx` | Login state, `hasPermission()`, `hasLocationAccess()` |
| `website/src/contexts/LocationContext.tsx` | Selected location, allowed locations |
| `website/src/pages/PermissionBoard/PermissionBoard.tsx` | Admin permission UI |
| `website/src/components/shared/ChangePasswordModal.tsx` | Self-service password change |

---

## Audit Summary (2026-04-15)

| Metric | Value |
|--------|-------|
| Total employees | 319 |
| Active with permissions | 148 |
| Active without permissions (test/service) | 9 |
| Inactive (locked out) | 162 |
| Admins | 1 |
| Clinic Managers | 6 |
| Dentists | 26 |
| Receptionists | 89 |
| Dental Assistants | 26 |
