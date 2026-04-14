# PRD: Fix Reports Page — TDD to Verify All 8 Subpages Load Correctly

## Problem Statement

The Reports page has **8 subpages** (Dashboard, Revenue, Appointments, Doctors, Customers, Locations, Services, Employees) but nothing loads reliably. When API requests fail, the UI shows an infinite "Loading…" spinner with no error feedback. Four of the twelve API endpoints crash with SQL errors due to a broken table-alias prefix substitution. The clinic manager cannot see any business analytics — monthly revenue, appointment trends, doctor performance, customer growth — making it impossible to make data-driven decisions.

### Root Causes Found

1. **SQL alias bug (4 endpoints)** — `dateCompanyFilter` produces WHERE fragments like `AND datecreated::date >= $1 AND datecreated::date <= $2`. The code then does `.replace('AND', 'AND so.')` which only replaces the **first** `AND`, producing invalid SQL: `AND so. datecreated::date >= $1 AND datecreated::date <= $2`. Affected endpoints:
   - `POST /api/Reports/revenue/by-location`
   - `POST /api/Reports/revenue/by-doctor`
   - `POST /api/Reports/doctors/performance`
   - `POST /api/Reports/locations/comparison`

2. **No error UI (all 8 subpages)** — Every subpage uses the pattern `if (loading || !data) return <Loading…/>`. When an API call fails, `loading` becomes `false` but `data` stays `null`, so the user sees "Loading…" forever with no indication something went wrong.

3. **Silent error swallowing in `useReportData`** — The hook catches errors and sets `error` state but no subpage ever reads or displays `error`.

## Solution

Fix the SQL alias bug at the source (in `dateCompanyFilter`), add error display to all 8 subpages, and write comprehensive TDD tests that verify every subpage loads correctly with mocked API data — and displays errors when the API fails.

## User Stories

1. As a clinic manager, I want to see the **Reports Dashboard** load with revenue collected, appointment counts, new customer count, and outstanding balance, so that I have a quick overview of business health.

2. As a clinic manager, I want to see **Revenue reports** broken down by payment method, doctor, location, and service category, so that I understand where money comes from and where it's outstanding.

3. As a clinic manager, I want to see **Appointment reports** showing status breakdown, completion/cancellation rates, weekly volume trends, and peak hours, so that I can optimize scheduling.

4. As a clinic manager, I want to see **Doctor performance reports** with appointment counts, completion rates, and revenue per doctor, so that I can evaluate productivity.

5. As a clinic manager, I want to see **Customer reports** showing total customers, growth rate, source breakdown, gender distribution, top spenders, and outstanding balances, so that I understand my patient base.

6. As a clinic manager, I want to see **Location comparison reports** with appointments, revenue, and staffing per branch, so that I can compare branch performance.

7. As a clinic manager, I want to see **Service reports** showing revenue by category, product catalog size, and popular products, so that I understand which services drive the business.

8. As a clinic manager, I want to see **Employee reports** with role distribution, staff by location, and a full employee directory, so that I can manage my team.

9. As a clinic manager, I want to see a clear **error message** when a report fails to load, instead of an infinite loading spinner, so that I know something is broken and can report it.

10. As a clinic manager, I want to **filter all reports** by date range and location, so that I can focus on specific time periods and branches.

11. As a clinic manager, I want to **export report data as CSV**, so that I can analyze it in Excel or share it.

12. As a clinic manager, I want to use **quick date presets** (YTD, 30d, 90d) to rapidly switch report periods, so that I don't have to manually enter dates.

13. As a developer, I want **tests that verify** each of the 8 subpages renders correctly with mocked API data, so that regressions are caught before deployment.

14. As a developer, I want **tests that verify** error states display when API calls fail, so that users never see infinite loading spinners.

15. As a developer, I want **tests for the `useReportData` hook** in isolation, so that the data-fetching layer is verified independently of UI.

## Implementation Decisions

### 1. Fix `dateCompanyFilter` to accept a table alias parameter

**Current (broken):**
```js
function dateCompanyFilter(dateFrom, dateTo, companyId, dateCol = 'datecreated') {
  // produces: AND datecreated::date >= $1 AND datecreated::date <= $2
}
// Then hacky: .replace('AND', 'AND so.')
```

**Fix:** Make `dateCompanyFilter` accept an alias parameter and prefix the column name correctly from the start, eliminating the need for any `.replace()` calls. When `dateCol` is already prefixed (like `'so.datecreated'`), it works as-is. When it's not (like `'datecreated'`), pass an alias.

**Affected file:** `api/src/routes/reports.js` — `dateCompanyFilter` helper + all 4 failing query sites.

### 2. Add error display to `useReportData` hook

**Current:** Returns `{ data, loading, error, refetch }` but no subpage uses `error`.

**Fix:** Add a shared `ReportError` component that all 8 subpages use when `error` is truthy. Show the error message and a "Retry" button that calls `refetch()`.

**Affected files:** All 8 subpage components in `website/src/pages/reports/`.

### 3. Fix the loading guard pattern in all subpages

**Current:** `if (loading || !data) return <Loading…/>`

**Fix:** `if (loading) return <Loading…/>`. Then separately check `if (error) return <ReportError error={error} onRetry={refetch} />`. Then check `if (!data) return <EmptyState />`.

**Affected files:** All 8 subpage components.

### 4. Test plan (TDD)

Tests will be written using **Vitest + React Testing Library**, matching the existing test infrastructure in the project.

#### Module 1: `useReportData` hook tests
- Test file: `website/src/hooks/__tests__/useReportData.test.ts`
- Tests:
  - Returns `loading=true` initially
  - Calls API with correct endpoint and params
  - Sets `data` on successful response (`success: true`)
  - Sets `error` on failed response (`success: false`)
  - Sets `error` on network error
  - `refetch()` triggers a new API call
  - Params changes trigger re-fetch

#### Module 2: Individual subpage component tests (8 files)
- Test files: `website/src/pages/reports/__tests__/*.test.tsx`
- For each of the 8 subpages:
  - Renders loading state while fetching
  - Renders data correctly when API succeeds (verify KPI values, chart data presence)
  - Renders error state with retry button when API fails
  - Passes filter context through correctly

#### Module 3: Reports shell integration tests
- Test file: `website/src/pages/reports/__tests__/ReportsShell.test.tsx`
- Tests:
  - Renders all 8 tab buttons
  - Navigates between tabs
  - Date filter changes propagate to subpage context
  - Location filter changes propagate to subpage context
  - Default route redirects to Dashboard

#### Module 4: API endpoint tests
- Test file: `api/src/routes/__tests__/reports.test.js`
- Tests:
  - All 12 endpoints return `{ success: true, data: ... }` with valid data
  - `dateCompanyFilter` with alias produces correct SQL
  - Endpoints handle missing/empty params gracefully
  - Auth middleware rejects unauthenticated requests

### 5. Modules to build/modify

| Module | Change | Type |
|--------|--------|------|
| `api/src/routes/reports.js` | Fix `dateCompanyFilter` alias, fix 4 broken queries | Bug fix |
| `website/src/hooks/useReportData.ts` | No change needed (already returns error) | — |
| `website/src/components/reports/ReportError.tsx` | New shared error/retry component | New |
| `website/src/pages/reports/ReportsDashboard.tsx` | Fix loading guard, add error state | Bug fix |
| `website/src/pages/reports/ReportsRevenue.tsx` | Fix loading guard, add error state | Bug fix |
| `website/src/pages/reports/ReportsAppointments.tsx` | Fix loading guard, add error state | Bug fix |
| `website/src/pages/reports/ReportsDoctors.tsx` | Fix loading guard, add error state | Bug fix |
| `website/src/pages/reports/ReportsCustomers.tsx` | Fix loading guard, add error state | Bug fix |
| `website/src/pages/reports/ReportsLocations.tsx` | Fix loading guard, add error state | Bug fix |
| `website/src/pages/reports/ReportsServices.tsx` | Fix loading guard, add error state | Bug fix |
| `website/src/pages/reports/ReportsEmployees.tsx` | Fix loading guard, add error state | Bug fix |

## Testing Decisions

### What makes a good test here
- **Test external behavior, not implementation.** A subpage test should verify that KPI cards show the right values given a mock API response, not that `useState` was called.
- **Mock at the API boundary.** Use `vi.mock` on `@/lib/api` to return controlled responses. This tests the full component tree without network dependency.
- **Test both happy and sad paths.** Every subpage must have at least: (1) a success rendering test, (2) an error display test.

### Modules tested
| Module | Test type | Priority |
|--------|-----------|----------|
| `useReportData` hook | Unit test (hook render) | P0 |
| ReportsDashboard | Component test (RTL) | P0 |
| ReportsRevenue | Component test (RTL) | P0 |
| ReportsAppointments | Component test (RTL) | P0 |
| ReportsDoctors | Component test (RTL) | P1 |
| ReportsCustomers | Component test (RTL) | P1 |
| ReportsLocations | Component test (RTL) | P1 |
| ReportsServices | Component test (RTL) | P1 |
| ReportsEmployees | Component test (RTL) | P1 |
| Reports shell (routing) | Component test (RTL) | P1 |
| API endpoints | Integration test (supertest or direct psql) | P0 |

### Prior art in the codebase
- `website/src/components/customer/CustomerProfile.test.tsx` — component test with mocked API
- `website/src/hooks/useBankSettings.test.ts` — hook test
- `website/src/components/payment/__tests__/PaymentForm.submit.test.tsx` — form test with API mocking

## Out of Scope

- New report types or subpages (keeping existing 8)
- Chart rendering pixel-perfect testing
- API performance optimization or caching
- Real-time report updates (WebSocket)
- PDF export (only CSV export exists)
- Role-based data filtering (permissions already enforced at API level)
- Offline report viewing
- Custom report builder

## Further Notes

### Data available in production DB (as of 2026-04-13)
- 245 appointments (197 done, 19 confirmed, 15 scheduled, etc.)
- 32 sale orders (29 sale, 3 cancel) — ₫126M invoiced, ₫68M paid, ₫49M outstanding
- 84 payments (71 cash, 6 bank, 4 deposit, 3 voided)
- 40 active customers, 33 employees (19 doctors)
- 7 locations (2 active with data)
- 11 product categories

### Implementation order
1. Fix `dateCompanyFilter` SQL alias bug → verify all 4 failing endpoints return 200
2. Create `ReportError` component
3. Update all 8 subpages with proper loading/error/empty guards
4. Write hook tests (`useReportData`)
5. Write subpage tests (all 8)
6. Write shell/routing tests
7. Run full test suite, verify all pass
8. Bump version

### The `dateCompanyFilter` fix approach
The simplest fix: pass the fully-qualified column name (with alias) into `dateCompanyFilter` in all callers. For example:
- `revenue/by-location`: change `dateCompanyFilter(dateFrom, dateTo, null, 'datecreated')` to `dateCompanyFilter(dateFrom, dateTo, null, 'so.datecreated')` and remove the `.replace('AND', 'AND so.')`.
- Same pattern for `revenue/by-doctor`, `doctors/performance`, `locations/comparison`.
- The `dateCompanyFilter` function itself needs no changes — it already handles prefixed column names correctly (as proven by `revenue/by-category` which uses `'so.datecreated'`).
