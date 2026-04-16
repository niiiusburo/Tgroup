# Reports System — Comprehensive Audit Report
**Worktree:** `/Users/thuanle/Documents/TamTMV/Tgroup/.worktrees/reports`  
**Branch:** `feat/reports-redesign`  
**Date:** 2026-04-16

---

## Executive Summary

The reports feature is **functionally broken at the API layer** and has **serious UX issues** in the frontend. The backend validation logic contains critical bugs that cause SQL queries to execute with invalid parameters, and the frontend has no safeguards to prevent sending those invalid parameters. Additionally, there are significant data-model mismatches, missing caching, poor error handling, and i18n gaps.

**Verdict:** The reports system needs a **ground-up redesign**, not incremental patches.

---

## 1. Backend API — Critical Bugs (`api/src/routes/reports.js`)

### 🔴 CRITICAL-1: `validUUID('')` returns `true`
**Location:** `reports.js:23`
```js
function validUUID(s) {
  if (!s) return true;  // ← BUG: empty string passes validation
  return /^[0-9a-f]{8}-.../i.test(s);
}
```
**Impact:** Every endpoint that "requires" `companyId` will accept an empty string. That empty string then flows into `dateCompanyFilter`, which generates `AND companyid = ''` in SQL. This causes **zero rows returned** for any report that includes a company filter.

**Fix:** Change to `if (s === undefined || s === null) return true;` — do NOT allow empty string.

---

### 🔴 CRITICAL-2: `validDate('')` returns `true`
**Location:** `reports.js:16`
```js
function validDate(s) {
  if (!s) return true;  // ← same bug
  ...
}
```
**Impact:** Empty `dateFrom`/`dateTo` passes validation, but the SQL then has no date bounds, returning **unbounded historical data** or causing performance problems.

**Fix:** Same as above — reject empty string.

---

### 🔴 CRITICAL-3: `dateCompanyFilter` adds `companyid = ''` to SQL
**Location:** `reports.js:35-43`
```js
if (companyId) { conds.push(`${companyCol} = $${idx}`); params.push(companyId); idx++; }
```
This looks safe, but combined with CRITICAL-1 and CRITICAL-2, the endpoint receives `companyId: ''` from the frontend and adds `companyid = ''` to the query. Since no company has an empty-string UUID, reports return no data.

**Impact:** Users see "No data available" even when data exists.

**Fix:** Sanitize inputs at the route handler level before calling `dateCompanyFilter`.

---

### 🔴 CRITICAL-4: Wrong column name for `monthlyplans`
**Location:** `reports.js:460-470`
```js
const f = dateCompanyFilter(dateFrom, dateTo, companyId, 'mp.created_at');
`SELECT mp.status, COUNT(*) as cnt, COALESCE(SUM(mp.total_amount),0) as total,
        COALESCE(SUM(mp.down_payment),0) as down_payment
 FROM dbo.monthlyplans mp WHERE 1=1 ${f.where}`
```
`monthlyplans` uses `company_id` (confirmed in `monthlyPlans.js`), but `dateCompanyFilter` is passed `companyId` without mapping. The generated SQL becomes `AND companyid = $N` which **does not exist** on `monthlyplans`.

**Fix:** Pass `companyCol = 'mp.company_id'` explicitly.

---

### 🟠 HIGH-1: `planinstallments` query has broken parameter logic
**Location:** `reports.js:472-482`
```js
`SELECT pi.status, COUNT(*) as cnt, COALESCE(SUM(pi.amount),0) as total,
        COALESCE(SUM(pi.paid_amount),0) as paid
 FROM dbo.planinstallments pi
 JOIN dbo.monthlyplans mp ON mp.id=pi.plan_id ${companyId ? 'AND mp.company_id=$1' : ''}
 WHERE pi.due_date::date >= $${companyId ? 2 : 1} AND pi.due_date::date <= $${companyId ? 3 : 2}`
```
**Problems:**
1. If `companyId` is empty string (common), the ternary evaluates to false, but the frontend *always* sends `companyId: ''`.
2. The parameter array: `companyId ? [companyId, dateFrom, dateTo].filter(Boolean) : [dateFrom, dateTo].filter(Boolean)` — `.filter(Boolean)` will **drop empty strings AND the number 0**, which could accidentally drop valid parameters.
3. `due_date` column on `planinstallments` — unverified if this exists.

**Fix:** Use explicit parameter building, not ternary indexing.

---

### 🟠 HIGH-2: `/revenue/by-location` rejects `companyId` but frontend sends it
**Location:** `reports.js:173`
```js
const { dateFrom, dateTo } = req.body || {};  // companyId intentionally omitted
```
But the frontend's `useReportData` always POSTs `{ dateFrom, dateTo, companyId }`. If `companyId` is present (even as `''`), the endpoint doesn't destructure it, but it also doesn't validate it. This is inconsistent with every other endpoint.

**Impact:** Inconsistent API contract. If a user selects a location, this report ignores it without telling the user.

**Fix:** Either accept and apply `companyId`, or document why it's excluded.

---

### 🟠 HIGH-3: No pagination / unbounded result sets
Every endpoint can return unlimited rows. The `customers/summary` endpoint returns:
- Top 20 spenders
- Top 20 outstanding balances
- All gender breakdowns
- All cities
- Growth trend

Some have `LIMIT 20`, but many (revenue by doctor, by category, locations comparison) have **no limit**. For a multi-year query, this could return thousands of rows and crash the browser.

**Fix:** Add `LIMIT` clauses and pagination parameters to all endpoints.

---

### 🟠 HIGH-4: `customers/summary` has dead `sources` code
**Location:** `reports.js:363`
```js
// By source (moved to services breakdown — placeholder kept for compatibility)
const sources = [];
```
The frontend `ReportsCustomers.tsx` doesn't render `sources`, but the endpoint still returns it in the JSON. This is dead weight.

**Fix:** Remove `sources` from API response or implement it properly.

---

### 🟡 MEDIUM-1: Appointment state inconsistencies
The codebase has **three** different spellings for canceled appointments:
- `cancel` (used in `reports.js`)
- `cancelled` (used in `appointments.js` `VALID_STATES`)
- `canceled` (American spelling, not used)

In `reports.js`:
```js
SUM(CASE WHEN state='cancel' OR state='cancelled' THEN 1 ELSE 0 END) as cancelled
```
This defensive coding suggests the data is messy. But the `appointments.js` route only accepts `'cancelled'` as a valid state. If the DB actually contains `'cancel'`, the appointments API can't handle it.

**Fix:** Normalize appointment states in the DB with a migration, then use a single canonical value.

---

### 🟡 MEDIUM-2: Previous-period comparison math is naive
**Location:** `reports.js:80-86`
```js
const days = dateFrom && dateTo ? Math.ceil((new Date(dateTo) - new Date(dateFrom)) / 86400000) : 30;
const prevTo = dateFrom || dateTo || new Date().toISOString().split('T')[0];
const prevFromDate = new Date(new Date(prevTo) - days * 86400000);
```
This manual date math ignores:
- Daylight Saving Time shifts
- Month boundaries (comparing Feb → Jan with 30 days is wrong)
- Timezone issues

**Fix:** Use a date library (date-fns) or PostgreSQL interval math.

---

### 🟡 MEDIUM-3: `dashboardReports.js` uses a completely different table
The dashboard widget (`DashboardReports/GetSumary`) queries `accountpayments`, while the Reports dashboard queries `saleorders`. These two tables may not agree on revenue numbers, causing **conflicting KPIs** between the Overview page and the Reports page.

**Fix:** Align both dashboards to use the same data source and calculation logic.

---

## 2. Frontend Report Pages — UX & Data Bugs

### 🔴 CRITICAL-1: `ReportsRevenue.tsx` loses all data if one of 5 requests fails
**Location:** `ReportsRevenue.tsx:17-23`
```js
const { data: summary, loading: l1, error: e1, ... } = useReportData<RevSummary>('/Reports/revenue/summary', filters);
const { data: trend, loading: l2, error: e2, ... } = useReportData<RevTrend>('/Reports/revenue/trend', filters);
// ... 3 more hooks

if (l1 || l2 || l3 || l4 || l5) return <div>...</div>;
const firstError = e1 || e2 || e3 || e4 || e5;
if (firstError) return <ReportError error={firstError} onRetry={() => { r1(); r2(); r3(); r4(); r5(); }} />;
```
**Impact:** If the "by-category" endpoint 500s, the user can't see *any* revenue data, including the summary. This is terrible UX.

**Fix:** Show errors **per section**, not page-wide. Let successful sections render while failed sections show retry buttons.

---

### 🔴 CRITICAL-2: `ReportsCustomers.tsx` shows wrong KPI label
**Location:** `ReportsCustomers.tsx:48`
```js
<KPICard label={t('metrics.totalAppointments')} value={data.total} ... />
```
This is the **Customers** report, but the label says "Total Appointments". It should be `metrics.totalCustomers` or similar.

**Fix:** Change to a customer-specific translation key and add it to `reports.json`.

---

### 🟠 HIGH-1: Hardcoded Vietnamese string in `ReportsServices.tsx`
**Location:** `ReportsServices.tsx:52`
```js
<SectionCard title="Doanh thu theo nguồn" ...>
```
This bypasses i18n entirely. English-speaking users see Vietnamese.

**Fix:** Use `t('charts.revenueBySource')` and add the key to both locale files.

---

### 🟠 HIGH-2: `ReportsDashboard.tsx` uses hardcoded English date format
**Location:** `ReportsDashboard.tsx:35`, `ReportsRevenue.tsx:62`, etc.
```js
const d = new Date(t.month);
return { label: d.toLocaleDateString('en', { month: 'short' }), value: t.revenue };
```
The app supports Vietnamese (`vi`) and English (`en`), but charts always use English month names.

**Fix:** Use the current i18n locale: `d.toLocaleDateString(i18n.language, ...)`.

---

### 🟠 HIGH-3: Tab switching causes full remount and complete refetch
**Location:** `Reports.tsx:97-103`
```jsx
<motion.div key={location.pathname} initial={{ opacity: 0, y: 6 }} ...>
  <Outlet context={filters} />
</motion.div>
```
Because `key={location.pathname}` changes on every tab switch, React **unmounts and remounts** the entire report page. All hooks re-run, all API calls fire again. This is slow and wasteful.

**Fix:** Remove `key={location.pathname}`. Use `useTransition` or CSS-based tab visibility instead.

---

### 🟡 MEDIUM-1: "No data" check is misleading
**Location:** All report pages
```js
if (!data) return <div className="text-center py-12 text-gray-400">{t('noData')}</div>;
```
`data` is an object or array. An empty array `[]` is truthy, so it shows an empty chart. An empty object `{}` is also truthy. But `null` shows "No data". The user can't tell the difference between "still loading" and "genuinely empty".

**Fix:** Distinguish between `loading`, `empty`, and `error` states explicitly.

---

### 🟡 MEDIUM-2: `ReportsLocations.tsx` doesn't use `companyId` filter
The location filter in the shell is passed to `ReportsLocations`, but the endpoint `/locations/comparison` ignores `companyId`. The user selects "Location A" in the filter, but the table still shows **all** locations. This is confusing.

**Fix:** Either remove the location filter when on the Locations tab, or make the endpoint respect it.

---

## 3. Data Flow & Hooks — Architecture Problems

### 🔴 CRITICAL-1: `useReportData` sends empty strings to the backend
**Location:** `useReportData.ts:18-22`
```js
const result = await apiFetch<{ success: boolean; data: T }>(endpoint, {
  method: 'POST',
  body: params,  // params contains companyId: ''
});
```
This is the root cause of many backend bugs. The hook blindly sends whatever the parent gives it, including empty strings.

**Fix:** Clean params before sending:
```js
const cleanParams = Object.fromEntries(
  Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)
);
```

---

### 🔴 CRITICAL-2: No request cancellation on unmount or param change
**Location:** `useReportData.ts`
If the user switches tabs quickly, the old request continues in the background. If it completes after the component unmounts, React warns about state updates on unmounted components.

**Fix:** Use `AbortController` and cancel the fetch on cleanup.

---

### 🟠 HIGH-1: No caching or request deduplication
Switching from Dashboard → Revenue → Dashboard causes the Dashboard data to be fetched **twice**. There's no TanStack Query (React Query), no SWR, no custom cache.

**Fix:** Migrate to `@tanstack/react-query` or implement a lightweight SWR cache.

---

### 🟠 HIGH-2: `useReportData` dependency array causes unnecessary refetches
**Location:** `useReportData.ts:26`
```js
}, [endpoint, params.dateFrom, params.dateTo, params.companyId]);
```
If `params` is reconstructed as a new object with the same values, `useCallback` doesn't refetch. But if any parent reconstructs the object on every render (e.g., `useMemo` missing dependencies), this causes infinite refetch loops.

**Fix:** The dependency array is actually okay, but the hook should use a stable request key instead.

---

### 🟡 MEDIUM-1: `ReportsFilters.tsx` hardcodes preset labels
**Location:** `ReportsFilters.tsx:35-41`
```js
{ label: 'YTD', from: ytd, to: today },
{ label: '30d', from: last30, to: today },
{ label: '90d', from: last90, to: today },
```
These labels are not translated.

**Fix:** Wrap in `t('filters.ytd')`, etc.

---

### 🟡 MEDIUM-2: `useLocations` may include inactive locations
The filter dropdown shows all locations from `useLocations`, but inactive locations should probably be hidden or marked.

---

## 4. Components & Tests — Quality Gaps

### 🔴 CRITICAL-1: Tests mock `framer-motion` globally but don't test real rendering
**Location:** `ReportsDashboard.test.tsx`, `ReportsSubpages.test.tsx`
The tests mock `framer-motion` to return plain divs, which is necessary. But they only test:
- Loading state exists
- Labels appear after data loads
- Error state appears

They do **NOT** test:
- Currency formatting
- Chart data rendering
- CSV export output
- Division-by-zero edge cases
- Empty data handling

**Fix:** Add integration tests that verify actual computed values (e.g., "collection rate shows 76.1%").

---

### 🟠 HIGH-1: `DonutChart` has visual bugs with small segments
**Location:** `DonutChart.tsx`
`strokeLinecap="round"` on every segment causes gaps between segments when values are small. The rounding overextends past the actual percentage boundary.

**Fix:** Remove `strokeLinecap="round"` or only apply it to the largest segment.

---

### 🟠 HIGH-2: `ProgressRing` can display `NaN%`
**Location:** `DonutChart.tsx:89`
```jsx
<text ...>{value.toFixed(0)}%</text>
```
If `value` is `NaN` or `Infinity` (from division by zero in a parent), the UI shows `NaN%`.

**Fix:** Add sanitization: `{isFinite(value) ? Math.round(value) : 0}%`.

---

### 🟠 HIGH-3: `ExportCSVButton` CSV escaping is incomplete
**Location:** `ReportsFilters.tsx:108-115`
```js
const str = String(val).replace(/"/g, '""');
return `"${str}"`;
```
This doesn't handle newlines or values that start with `=` (CSV injection). A malicious doctor name like `=CMD|' /C calc'!A0` could execute when opened in Excel.

**Fix:** Prefix formulas with a single quote: `if (/^[=+\-@]/.test(str)) str = "'" + str;`

---

### 🟡 MEDIUM-1: `KPICard` animations are untestable without mocks
The `CountUp` component uses `useSpring` from `framer-motion`, which makes unit testing difficult. The current mock in tests returns `fn(0)`, so the displayed value is always the formatted `0`, not the actual target value. This means tests can never verify that `25770000` is actually displayed.

**Fix:** Extract a presentational `KPICardValue` component that accepts the formatted string directly, and test that.

---

### 🟡 MEDIUM-2: `BarChart` has no tooltips
Users can't hover to see exact values on small bars.

**Fix:** Add a native HTML `title` attribute or a tooltip component.

---

### 🟡 MEDIUM-3: `ReportError.tsx` is too minimal
**Location:** `ReportError.tsx`
```jsx
export function ReportError({ error, onRetry }) {
  return (
    <div className="text-center py-12">
      <h3 className="text-red-600 font-semibold">{error}</h3>
      <button onClick={onRetry}>Retry</button>
    </div>
  );
}
```
No error code, no logging, no user-friendly message, no styling.

**Fix:** Match the design system with a proper error card, icon, and i18n.

---

## 5. Architecture / Maintainability Issues

### 🔴 CRITICAL: `Reports.tsx` violates the Single Responsibility Principle
**Location:** `website/src/pages/Reports.tsx`
This 160-line file is simultaneously:
1. A React Router shell component
2. A filter state manager
3. A barrel file re-exporting 8 sub-pages for `App.tsx`

Because it's a barrel file, any change to any sub-page requires re-bundling the entire `Reports.tsx` chunk. Lazy loading in `App.tsx` is defeated because all 8 pages are imported through one module.

**Fix:** Split into:
- `ReportsShell.tsx` — layout and tabs only
- `pages/reports/index.ts` — clean barrel exports
- Move each sub-page to its own lazy-loaded chunk in `App.tsx`

---

### 🟠 HIGH: `reports.js` is 500+ lines with no separation of concerns
**Location:** `api/src/routes/reports.js` (30KB, ~600 lines)
All 15 endpoints live in one giant file. There's no shared query builder, no service layer, no repository pattern.

**Fix:** Split into:
- `services/reports/revenueQueries.js`
- `services/reports/appointmentQueries.js`
- `controllers/reports/*.js`
- Or at minimum, one route file per domain

---

### 🟡 MEDIUM: Translation files have drift
The `en/reports.json` and `vi/reports.json` look complete, but `charts.revenueBySource` is missing from both, and `metrics.totalCustomers` doesn't exist at all.

---

## Recommended Redesign Approach

### Phase 1: Fix the Foundation (Backend)
1. Rewrite input validation in `reports.js` — reject empty strings, validate UUIDs strictly.
2. Fix `monthlyplans` column name (`company_id`).
3. Add `LIMIT` and pagination params to all endpoints.
4. Split `reports.js` into smaller route files.
5. Add integration tests for the API (using the test DB).

### Phase 2: Fix Data Flow (Frontend)
1. Replace `useReportData` with `@tanstack/react-query` for caching, deduplication, and request cancellation.
2. Clean params before sending (strip empty strings).
3. Use `AbortController` for all fetches.

### Phase 3: Fix UX (Frontend Pages)
1. Make `ReportsRevenue` show per-section errors instead of page-wide failure.
2. Remove `key={location.pathname}` to prevent remounting on tab switch.
3. Fix hardcoded strings (`'en'`, `'Doanh thu theo nguồn'`, KPI label bugs).
4. Add loading skeletons instead of plain text.

### Phase 4: Fix Components & Tests
1. Fix `DonutChart` gap bug and `ProgressRing` NaN bug.
2. Harden `ExportCSVButton` against injection.
3. Add proper error state design.
4. Write integration tests that verify computed values, not just label presence.

### Phase 5: Architecture
1. Split `Reports.tsx` into shell + barrel file.
2. Lazy-load each report page independently in `App.tsx`.
3. Extract shared report types into `website/src/types/reports.ts`.

---

## Files to Modify

| File | Priority | Action |
|------|----------|--------|
| `api/src/routes/reports.js` | P0 | Rewrite validation, fix SQL bugs, split endpoints |
| `website/src/hooks/useReportData.ts` | P0 | Add param cleaning, AbortController |
| `website/src/pages/reports/ReportsRevenue.tsx` | P0 | Per-section error handling |
| `website/src/pages/Reports.tsx` | P1 | Split shell from barrel exports |
| `website/src/pages/reports/ReportsCustomers.tsx` | P1 | Fix wrong KPI label |
| `website/src/pages/reports/ReportsServices.tsx` | P1 | Fix hardcoded Vietnamese |
| `website/src/components/reports/DonutChart.tsx` | P1 | Fix NaN and gap bugs |
| `website/src/components/reports/ReportsFilters.tsx` | P1 | Harden CSV export, translate presets |
| `website/src/i18n/locales/*/reports.json` | P2 | Add missing keys |
| All `__tests__/*.tsx` | P2 | Add value-verification tests |

---

*End of Audit*
