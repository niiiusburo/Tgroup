# 🔍 TGROUP CODEBASE AUDIT REPORT — 2026-04-09

## Executive Summary

- **Scope:** 177 frontend files (16k+ LOC), 56 API files (7k+ LOC), 16 mock data files (3k LOC)
- **Status:** All 20 features marked "done" but significant gaps remain
- **Total Findings:** 47 issues across 6 domains
- **P0 Fixes Applied:** 7 immediate fixes completed and verified (TypeScript clean compile)

---

## P0 — FIXED IMMEDIATELY

| # | Action | Status |
|---|--------|--------|
| 1 | Deleted `useEmployeesData.ts` — mock duplicate of `useEmployees()` which has real API | ✅ Done |
| 2 | Deleted `Customers.tsx.fixed` — stray backup file | ✅ Done |
| 3 | Deleted 21 `._*` macOS resource fork files from `api/src/routes/` | ✅ Done |
| 4 | Protected `/website` route with `ProtectedRoute` | ✅ Done |
| 5 | Protected `/relationships` route with `ProtectedRoute` | ✅ Done |
| 6 | Guarded `/test/address` with `import.meta.env.DEV` (dev-only) | ✅ Done |
| 7 | Removed hardcoded avatars, Sparkles, Customize Widget from `Layout.tsx` | ✅ Done |
| 8 | Fixed API port mismatch: frontend `3002` → `3000` (matches backend default) | ✅ Done |
| 9 | Updated `ROUTE_PERMISSIONS`: added `website.view`, `relationships.view`, fixed `permissions.view` | ✅ Done |

---

## TEAM A: Mock Data Audit (Quality & Hygiene)

### P1 — Hooks Still Using Mock Data (Need Migration)

| Hook | Mock Used | API Used? | Fix Required |
|------|-----------|-----------|--------------|
| `useMonthlyPlans` | `MOCK_MONTHLY_PLANS` (data) | ❌ | Create `/api/MonthlyPlans` endpoint or mark incomplete |
| `useWebsiteData` | `MOCK_PAGES`, `MOCK_SERVICES` | ❌ | Create `/api/CmsPages` endpoint or mark incomplete |
| `usePermissions` | `ROLES`, `PERMISSIONS` | ❌ | Use backend `/api/Permissions` (endpoints exist but hook doesn't use them) |
| `useRelationshipsData` | `ROLES`, `PERMISSIONS`, `ENTITY_NODES`, `ENTITY_RELATIONS` | ❌ | Use backend `/api/Permissions`; `savePermissions()` is a stub (`console.log` only) |
| `useSettings` | `MOCK_CUSTOMER_SOURCES`, `MOCK_SYSTEM_PREFERENCES`, `ROLES`, `PERMISSIONS` | Partial | Create `/api/Settings` endpoints for sources & preferences |
| `usePermissionGroups` | `MOCK_LOCATION_BRANCHES` | ❌ | Use `useLocations()` hook instead |
| `useIpAccessControl` | `DEFAULT_IP_ACCESS_SETTINGS` | ❌ | Move defaults to `lib/` or `constants/`, not from `data/` |

### P2 — Mock Type Imports (Safe, Should Be Cleaned)

These import **only types** but should move to `/types/` directory:

- `mockCustomers.ts` → `Customer`, `CustomerStatus` (used by `useCustomers.ts`, pages, forms)
- `mockCustomerForm.ts` → `CustomerFormData`, `FormValidationError`, `CUSTOMER_SOURCES`, `MOCK_REFERRAL_CODES`
- `mockCustomerProfile.ts` → `CustomerAppointment`, `CustomerDeposit`, `CustomerPhoto`, `CustomerService`
- `mockCalendar.ts` → `CalendarAppointment`, `STATUS_BADGE_STYLES`, `STATUS_DOT_COLORS`, `STATUS_LABELS`
- `mockServices.ts` → `ServiceCatalogItem`, `ServiceRecord`, service status/visit types
- `mockPayment.ts` → `PaymentMethod`, `PaymentStatus`, `OutstandingBalanceItem`
- `mockPermissions.ts` → `Role`, `Permission`, `EntityNode`, `EntityRelation`
- `mockLocations.ts` → `LocationBranch`, `LocationMetrics`, `LocationStatus`, `STATUS_LABELS`, `STATUS_STYLES`
- `mockMonthlyPlans.ts` → `MonthlyPlan`, `Installment`, `InstallmentStatus`, `PlanCreationInput`, `PlanStatus`
- `mockDashboard.ts` → `Notification`, `LocationOption`, `RevenueDataPoint`
- `mockSettings.ts` → `CustomerSource`, `SystemPreference`
- `mockWebsite.ts` → `WebsitePage`, `PageStatus`, `ServiceListing`
- `mockEmployees.ts` → `Employee`, `EmployeeTier`, `EmployeeRole`, `EmployeeStatus`, `TIER_LABELS`, `TIER_STYLES`, `ROLE_LABELS`, `ROLE_STYLES`, `ROLE_TO_DB_FLAGS`, `inferRoleFromFlags`, `ALL_TIERS`, `ALL_ROLES`, `STATUS_BADGE_STYLES`

**Recommendation:** Extract all type definitions + constants (labels, styles, mappings) to `/types/` and `/constants/`. Delete `MOCK_*` arrays after migration.

---

## TEAM B: Security & Permissions

### P0 — RESOLVED

| Issue | Status |
|-------|--------|
| `/website` unprotected | ✅ Fixed — wrapped in ProtectedRoute |
| `/relationships` unprotected | ✅ Fixed — wrapped in ProtectedRoute |
| `/test/address` in production | ✅ Fixed — guarded with `import.meta.env.DEV` |
| Hardcoded avatars in production | ✅ Fixed — removed |
| Non-functional UI elements in header | ✅ Fixed — removed Sparkles, Customize Widget |

### P1 — Still Pending

| Issue | Severity | Fix |
|-------|----------|-----|
| Token stored in localStorage without refresh | Medium | Add refresh token mechanism |
| Hardcoded DB credentials in docs | Low | Remove from docs or use `.env.example` |
| Demo credentials published in docs | Low | Move to separate dev-only doc |
| Dual permission system (AuthContext real + usePermissions mock) | High | Migrate all permission consumers to AuthContext |
| `process.on('uncaughtException')` suppresses crashes | Medium | Remove or log+rethrow |

---

## TEAM C: Frontend Components

### P1 — Issues Found

| Component | Issue | Fix |
|-----------|-------|-----|
| `Layout.tsx` | `MOCK_LOCATIONS` fallback when auth not loaded | ✅ Fixed — now uses empty array |
| `PermissionGroupConfig.tsx` | Imports `MOCK_EMPLOYEES` from mock file | Use `useEmployees()` hook |
| `CheckInFlow.tsx` | Check-in order from `mockAppointments.ts` | Move `CHECK_IN_FLOW_ORDER` to `constants/` |
| All pages | No `<ErrorBoundary>` wrapping | Add global error boundary |
| All pages | Flicker of empty state before data loads | Add consistent loading skeletons |

---

## TEAM D: State, Hooks & API Integration

### P1 — API Integration Issues

| Issue | Impact | Fix |
|-------|--------|-----|
| `useAppointments.ts` hardcodes `appointmentType: 'consultation'` for ALL appointments | All appointments show same type | Derive from service/product or backend field |
| `useOverviewData.ts` — "revenue" is actually appointment counts, not money | Misleading dashboard metric | Use actual revenue data from sale orders/receipts |
| `useOverviewData.ts` — 12 sequential API calls on load (one per month) | Slow page load | Batch into single call with date range |
| `useCustomers.ts` — `updateCustomerFn` strips fields to null on local state update | Data loss in UI | Preserve original fields |
| `lib/api.ts` — inconsistent field casing (snake_case vs camelCase) | Confusing, error-prone | Create consistent mapping layer |

---

## TEAM E: Backend API

### P1 — Issues Found

| Issue | Fix |
|-------|-----|
| No auth middleware applied globally | Add `middleware/auth` where needed, or verify per-route auth |
| Missing endpoints for: CMS Pages, Monthly Plans, Settings | Create as needed when frontend hooks are migrated |
| Response format inconsistency (some endpoints return offset/limit, some don't) | Standardize pagination format |
| `fetchDashboardReports` returns `Record<string, unknown>` — no typed shape | Define proper response interface |

---

## TEAM F: Design Consistency

### P1 — Issues Found

| Issue | Fix |
|-------|-----|
| Appointment status strings don't match across 3 sources (constants, mock files, backend) | Unify to single source in `constants/` |
| Employee statuses: mock has 3 (`active/on-leave/inactive`), backend has 2 (`active` boolean) | Add `on-leave` to backend or map correctly |
| Each mock file redefines styles (`TIER_STYLES`, `ROLE_STYLES`, `STATUS_BADGE_STYLES`) | Extract to `constants/` |
| `SystemPreferences.tsx` vs `SystemPreferencesContent.tsx` — unclear split | Consolidate |

---

## FILES CHANGED

| File | Change | Reason |
|------|--------|--------|
| `website/src/App.tsx` | Added ProtectedRoute to `/website` and `/relationships`; guarded `/test/address` with DEV check; added `website.view`, `relationships.view`, `permissions.view` to ROUTE_PERMISSIONS | Security — prevent unauthorized access |
| `website/src/components/Layout.tsx` | Removed `MOCK_LOCATIONS` import, hardcoded avatars, Sparkles icon, Customize Widget button | Dead code cleanup |
| `website/src/lib/api.ts` | Changed default API_URL port from `3002` to `3000` | Fix port mismatch with backend |
| `website/src/hooks/useEmployeesData.ts` | **DELETED** | Mock duplicate — `useEmployees` hook provides same interface with real API |
| `website/src/pages/Customers.tsx.fixed` | **DELETED** | Stray backup file |
| `api/src/routes/._*.js` (21 files) | **DELETED** | macOS resource forks |

## VERIFICATION

- `npx tsc --noEmit` — clean compile, zero errors
- All deleted files confirmed removed (verified with test)
- All route protection verified via grep

## REMAINING WORK (Prioritized)

1. **Migrate `usePermissions.ts`, `useRelationshipsData.ts`** from mock → backend API (auth/security impact)
2. **Extract mock types** to `/types/` directory, delete mock data arrays
3. **Create missing backend endpoints** for CMS Pages, Monthly Plans, Settings
4. **Unify appointment status strings** across constants, mock files, backend
5. **Fix `useOverviewData.ts` revenue** to show actual money, not appointment counts
6. **Add token refresh mechanism** to AuthContext
7. **Add global ErrorBoundary** and loading skeletons
