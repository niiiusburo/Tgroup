# PRD: Comprehensive Reports Dashboard

## Problem Statement

The clinic currently has a placeholder Reports page with static, hardcoded data. There is no way for clinic owners and managers to analyze business performance across their 7 branches. Critical questions remain unanswered:

- **Revenue**: How much money are we making? Where is it coming from? What's outstanding?
- **Appointments**: Are we getting busier? Which doctors are most productive? What's our no-show/cancellation rate?
- **Employees/Doctors**: Who's performing best? Who's underutilized? What's the workload distribution?
- **Customers**: Are we growing? Where do customers come from? How many return?
- **Services**: What treatments drive revenue? What's our service mix? Which categories are trending?
- **Operations**: Which locations are performing best? How do branches compare?

The current `Reports.tsx` is a UI skeleton with fake numbers. The backend `dashboardReports.js` has only one endpoint (`GetSumary`) that returns a single aggregate from `accountpayments`. None of the rich data in `appointments`, `saleorders`, `payments`, `partners`, or `products` is being reported on.

## Solution

Build a **multi-section Reports page** with a tabbed/tab-based navigation system, where each tab is a self-contained report perspective. Each report section will have:

1. **Date range picker** (global to the page, inherited by all sections)
2. **Location filter** (using the existing `FilterByLocation` component)
3. **Real-time data** fetched from dedicated API endpoints
4. **Interactive charts** using lightweight CSS-based charts (no new chart library dependency)
5. **Export capability** (CSV download for each section)

### Report Sections

| # | Section | Perspective | Primary Data Sources |
|---|---------|-------------|---------------------|
| 1 | **Dashboard** | Executive overview — KPIs at a glance | payments, saleorders, appointments, partners |
| 2 | **Revenue** | Money in, money out, outstanding | saleorders, payments, payment_allocations, monthlyplans |
| 3 | **Appointments** | Volume, status, trends, throughput | appointments |
| 4 | **Doctors** | Doctor productivity & performance | appointments, saleorders, partners (isdoctor) |
| 5 | **Employees** | Staff utilization & workload | appointments, partners (employee), employee_location_scope |
| 6 | **Customers** | Growth, retention, demographics, sources | partners (customer), customersources |
| 7 | **Services/Products** | Service mix, revenue by category | products, productcategories, saleorderlines |
| 8 | **Locations** | Branch comparison & performance | companies, appointments, saleorders, payments |

## User Stories

### Executive Dashboard
1. As a clinic owner, I want to see a dashboard with today's total revenue, total appointments, new customers, and outstanding balance, so that I have a quick pulse on business health.
2. As a clinic owner, I want to compare this month's KPIs to last month's KPIs with percentage change indicators, so that I can spot trends without manual calculation.
3. As a clinic owner, I want the dashboard to update based on my selected date range and location, so that I can drill into specific periods or branches.
4. As a clinic owner, I want to see a 12-month revenue trend bar chart, so that I can visualize seasonal patterns.

### Revenue Reports
5. As a clinic manager, I want to see total revenue broken down by payment method (cash, bank transfer, deposit), so that I understand our cash flow composition.
6. As a clinic manager, I want to see total invoiced vs. total paid vs. total outstanding, so that I know how much we're owed.
7. As a clinic manager, I want a monthly revenue trend chart for the selected date range, so that I can identify growth or decline patterns.
8. As a clinic manager, I want to see revenue by location (branch) as a comparison table, so that I know which branches are most profitable.
9. As a clinic manager, I want to see revenue by doctor (who brought in the most revenue), so that I can evaluate doctor performance financially.
10. As a clinic manager, I want to see revenue by service category, so that I know which treatments are our biggest earners.
11. As a clinic manager, I want to see the status breakdown of all sale orders (sale vs. cancel), so that I understand order health.
12. As a clinic manager, I want to see monthly payment plan installments due vs. paid, so that I can follow up on overdue payments.
13. As a clinic owner, I want to export any revenue report to CSV, so that I can share it with my accountant.

### Appointment Reports
14. As a clinic manager, I want to see total appointments by status (done, confirmed, scheduled, arrived, cancelled, etc.), so that I understand appointment flow.
15. As a clinic manager, I want to see appointment volume over time (daily/weekly/monthly trend), so that I can plan staffing.
16. As a clinic manager, I want to see the appointment completion rate (% done vs % cancelled vs % no-show), so that I can measure patient commitment.
17. As a clinic manager, I want to see average appointment duration by doctor, so that I can optimize scheduling.
18. As a clinic manager, I want to see peak hours distribution (heatmap or bar chart), so that I can staff receptionists accordingly.
19. As a clinic manager, I want to see appointment-to-treatment conversion rate (% of appointments that resulted in a sale order), so that I can measure treatment acceptance.
20. As a clinic manager, I want to see repeat vs. new patient appointments, so that I can measure retention.
21. As a receptionist, I want to see today's and this week's appointment count at the top, so that I can prepare for the day.

### Doctor Reports
22. As a clinic owner, I want to see a ranked list of doctors by number of appointments completed, so that I can identify top performers.
23. As a clinic owner, I want to see a ranked list of doctors by revenue generated (from sale orders), so that I can correlate productivity with income.
24. As a clinic owner, I want to see each doctor's appointment status distribution, so that I can understand their patient outcomes.
25. As a clinic owner, I want to see each doctor's workload by location (which branches they work at), so that I can optimize scheduling.
26. As a clinic owner, I want to see doctor revenue trends over time (are they growing or declining?), so that I can have informed performance reviews.
27. As a doctor, I want to see my own patient list with treatment history, so that I can review my case load.

### Employee Reports
28. As a clinic owner, I want to see a list of all employees with their role (doctor, assistant, receptionist), branch, and start date, so that I have an HR overview.
29. As a clinic owner, I want to see employee count by role and by location, so that I can plan hiring.
30. As a clinic owner, I want to see assistant assignment frequency (which assistants support which doctors most), so that I can optimize team composition.
31. As a clinic manager, I want to see employee tenure distribution, so that I can plan for retention and succession.

### Customer Reports
32. As a clinic owner, I want to see total customer count and new customer growth rate over time, so that I can measure marketing effectiveness.
33. As a clinic owner, I want to see customer acquisition by source (Google, Facebook, referral, walk-in, etc.), so that I can allocate marketing budget.
34. As a clinic owner, I want to see customer demographics (gender, age, location), so that I can tailor services.
35. As a clinic manager, I want to see repeat customer rate (% of customers with 2+ appointments), so that I can measure satisfaction.
36. As a clinic manager, I want to see customer lifetime value distribution (total spent per customer), so that I can identify VIPs.
37. As a clinic manager, I want to see customers with outstanding balances, so that I can follow up on collections.
38. As a clinic manager, I want to see customers with no recent appointments (dormant), so that I can run re-engagement campaigns.
39. As a clinic manager, I want to see customers by treatment status, so that I can follow up on incomplete treatments.

### Service/Product Reports
40. As a clinic owner, I want to see a breakdown of revenue by product/service category (Niềng răng, Bọc sứ, Implant, etc.), so that I know our specialty mix.
41. As a clinic owner, I want to see the most popular services by appointment volume, so that I can ensure we have capacity.
42. As a clinic owner, I want to see average price per service category, so that I can benchmark against competitors.
43. As a clinic manager, I want to see service category trends over time, so that I can spot emerging demand.
44. As a clinic manager, I want to see a product catalog report with price, category, and order count, so that I can manage the catalog.

### Location/Branch Reports
45. As a clinic owner, I want to compare all branches by appointment volume, so that I can identify underperforming locations.
46. As a clinic owner, I want to compare all branches by revenue, so that I know which locations are most profitable.
47. As a clinic owner, I want to compare all branches by number of active doctors and staff, so that I can plan resource allocation.
48. As a clinic owner, I want to see each branch's growth trend over time, so that I can make expansion or consolidation decisions.
49. As a clinic manager, I want to see branch-level KPI comparison (avg revenue per appointment, avg appointment per doctor), so that I can benchmark branches against each other.

### Cross-Cutting
50. As a clinic owner, I want a global date range picker at the top of the Reports page that applies to all sections, so that I don't have to set dates repeatedly.
51. As a clinic owner, I want a global location filter that applies to all sections, so that I can quickly switch branch context.
52. As a clinic owner, I want each report section to be independently scrollable or collapsed, so that I can focus on one report at a time.
53. As a clinic owner, I want an "Export to CSV" button on every data table within reports, so that I can share data externally.
54. As a clinic owner, I want the reports page to load quickly with aggregated data from the backend, so that I'm not waiting for heavy queries.
55. As a user without the `reports.view` permission, I want to be blocked from accessing the Reports page, so that sensitive financial data is protected.

## Implementation Decisions

### Frontend: Tab-Based Navigation

The Reports page will use a horizontal tab navigation system (similar to Settings page pattern). Each tab renders a distinct report section component. The active tab state persists in URL query param (`?tab=revenue`).

**Tabs:** Overview | Revenue | Appointments | Doctors | Employees | Customers | Services | Locations

**Shared context:** A `ReportsProvider` context wraps all report tabs and holds:
- `dateFrom` / `dateTo` — global date range
- `companyId` — global location filter
- `refreshKey` — trigger refetch across all tabs

### Frontend: Chart Strategy

No new charting library will be added. The existing project uses only `lucide-react` icons and Tailwind CSS. Charts will be built with:
- **Bar charts** → CSS flex divs with dynamic height/width percentages
- **Progress bars** → Tailwind `w-[x%]` with colored backgrounds
- **Trend indicators** → Arrow icons with green/red coloring
- **Heatmaps** → CSS grid with background color opacity

This matches the existing `RevenueChartModule.tsx` pattern used in the Overview page.

### Frontend: Component Structure

```
website/src/
├── pages/
│   └── Reports.tsx              → Tab shell + shared filters
├── components/reports/
│   ├── ReportsContext.tsx        → Shared date/location/refresh state
│   ├── ReportsFilters.tsx        → Global date range + location filter bar
│   ├── ReportExportButton.tsx    → Reusable CSV export button
│   ├── sections/
│   │   ├── DashboardSection.tsx  → Executive KPI overview
│   │   ├── RevenueSection.tsx    → Revenue breakdown & trends
│   │   ├── AppointmentsSection.tsx → Appointment analytics
│   │   ├── DoctorsSection.tsx    → Doctor performance
│   │   ├── EmployeesSection.tsx  → Staff utilization
│   │   ├── CustomersSection.tsx  → Customer growth & demographics
│   │   ├── ServicesSection.tsx   → Service/product mix
│   │   └── LocationsSection.tsx  → Branch comparison
│   └── widgets/
│       ├── KPICard.tsx           → Stat card with trend indicator
│       ├── BarChart.tsx          → Simple bar chart component
│       ├── ProgressBar.tsx       → Horizontal progress bar
│       ├── DonutChart.tsx        → CSS-based donut/ring chart
│       └── TrendChart.tsx        → Multi-period trend line (CSS)
```

### Backend: API Endpoints

A new route file `api/src/routes/reports.js` will be created with the following endpoints. All endpoints require `reports.view` permission and accept `{ dateFrom, dateTo, companyId }` in the request body.

| Endpoint | Method | Returns |
|----------|--------|---------|
| `/api/Reports/dashboard` | POST | KPI summary: totalRevenue, totalAppointments, newCustomers, outstandingBalance, previous period comparison |
| `/api/Reports/revenue/summary` | POST | Revenue by method, invoiced vs paid vs outstanding |
| `/api/Reports/revenue/trend` | POST | Monthly revenue time series |
| `/api/Reports/revenue/by-location` | POST | Revenue grouped by company |
| `/api/Reports/revenue/by-doctor` | POST | Revenue grouped by doctor |
| `/api/Reports/revenue/by-category` | POST | Revenue grouped by product category |
| `/api/Reports/revenue/payment-plans` | POST | Monthly plan installment status |
| `/api/Reports/appointments/summary` | POST | Count by status, completion rate |
| `/api/Reports/appointments/trend` | POST | Daily/weekly/monthly appointment volume |
| `/api/Reports/appointments/peak-hours` | POST | Distribution by hour of day |
| `/api/Reports/appointments/conversion` | POST | Appointment-to-sale-order conversion rate |
| `/api/Reports/doctors/performance` | POST | Per-doctor: appointments, revenue, completion rate |
| `/api/Reports/doctors/workload` | POST | Per-doctor: distribution by location |
| `/api/Reports/employees/overview` | POST | Employee list with roles, branches, tenure |
| `/api/Reports/customers/summary` | POST | Total count, new growth, repeat rate |
| `/api/Reports/customers/by-source` | POST | Acquisition by customersource |
| `/api/Reports/customers/demographics` | POST | Gender, age, city distribution |
| `/api/Reports/customers/lifetime-value` | POST | Revenue per customer, top spenders |
| `/api/Reports/customers/outstanding` | POST | Customers with unpaid balances |
| `/api/Reports/customers/dormant` | POST | Customers with no recent appointments |
| `/api/Reports/services/breakdown` | POST | Revenue/volume by product category |
| `/api/Reports/services/popular` | POST | Most ordered services |
| `/api/Reports/locations/comparison` | POST | Per-location: appointments, revenue, staff count |
| `/api/Reports/locations/trends` | POST | Per-location growth over time |

**All endpoints will:**
- Accept optional `{ dateFrom, dateTo, companyId }` filters
- Validate date format (YYYY-MM-DD) and UUID format
- Use parameterized queries (no SQL injection)
- Return `{ success: true, data: {...} }` envelope
- Handle empty data gracefully (return zeros/empty arrays, not errors)
- Be performant with proper indexes (rely on existing indexes; add new ones if needed)

### Backend: SQL Query Patterns

Queries will join across the real data tables:

**Revenue queries** — Primary: `saleorders` + `saleorderlines` + `payments`
```sql
-- Revenue by month
SELECT DATE_TRUNC('month', so.datecreated) as month,
       SUM(so.amounttotal) as invoiced,
       SUM(so.totalpaid) as paid,
       SUM(so.residual) as outstanding
FROM dbo.saleorders so
WHERE so.isdeleted = false AND so.state = 'sale'
  AND ($1::date IS NULL OR so.datecreated::date >= $1)
  AND ($2::date IS NULL OR so.datecreated::date <= $2)
  AND ($3::uuid IS NULL OR so.companyid = $3)
GROUP BY month ORDER BY month;
```

**Appointment queries** — Primary: `appointments` + `partners` + `companies`
```sql
-- Status breakdown
SELECT a.state, COUNT(*) as count
FROM dbo.appointments a
WHERE ($1::date IS NULL OR a.date::date >= $1)
  AND ($2::date IS NULL OR a.date::date <= $2)
  AND ($3::uuid IS NULL OR a.companyid = $3)
GROUP BY a.state;
```

**Doctor performance** — Join `appointments` with `saleorders` via `appointments.saleorderid`
```sql
SELECT p.name as doctor, 
  COUNT(a.id) as appointments,
  SUM(CASE WHEN a.state = 'done' THEN 1 ELSE 0 END) as completed,
  COALESCE(SUM(so.amounttotal), 0) as revenue
FROM dbo.partners p
LEFT JOIN dbo.appointments a ON a.doctorid = p.id
LEFT JOIN dbo.saleorders so ON a.saleorderid = so.id AND so.isdeleted = false
WHERE p.isdoctor = true AND p.isdeleted = false
  AND ($1::date IS NULL OR a.date::date >= $1)
  AND ($2::date IS NULL OR a.date::date <= $2)
GROUP BY p.name ORDER BY revenue DESC;
```

### Frontend: CSV Export

A lightweight `downloadCSV(headers, rows, filename)` utility function:
- Converts array of objects to CSV string
- Handles Vietnamese characters (UTF-8 BOM prefix)
- Triggers download via Blob URL
- No external library needed

### Frontend: Data Fetching

Each report section will use a custom `useReportData(endpoint, params)` hook that:
- Takes the API endpoint and filter params
- Fetches on mount and when params change
- Returns `{ data, loading, error }`
- Caches results for 30 seconds to avoid redundant queries

### Database: Performance Considerations

The following indexes may be needed for report query performance:

```sql
-- Sale orders
CREATE INDEX IF NOT EXISTS idx_saleorders_date ON dbo.saleorders(datecreated) WHERE isdeleted = false;
CREATE INDEX IF NOT EXISTS idx_saleorders_company ON dbo.saleorders(companyid) WHERE isdeleted = false;

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_date ON dbo.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON dbo.payments(customer_id);

-- Appointments (existing indexes should suffice, add if missing)
CREATE INDEX IF NOT EXISTS idx_appointments_date_trunc ON dbo.appointments((date::date));

-- Sale order lines
CREATE INDEX IF NOT EXISTS idx_saleorderlines_order ON dbo.saleorderlines(orderid);
```

## Testing Decisions

### What makes a good test for this feature
- Test that API endpoints return correct data shapes for valid inputs
- Test that API endpoints handle missing/empty data gracefully (return zeros, not 500 errors)
- Test that date validation rejects invalid formats
- Test that CSV export correctly formats Vietnamese text

### Modules to test

1. **API endpoint tests** (Vitest/Jest):
   - `reports.test.js` — test each endpoint with known data fixtures
   - Verify response shapes match frontend expectations
   - Verify filtering by date and location works
   - Verify empty data returns graceful zeros

2. **Frontend component tests** (Vitest + React Testing Library):
   - `ReportsFilters.test.tsx` — date range and location filter interaction
   - `KPICard.test.tsx` — renders value and trend correctly
   - `BarChart.test.tsx` — renders bars with correct proportions
   - `ReportExportButton.test.tsx` — triggers download

3. **Integration tests** (Playwright):
   - Navigate to Reports page, verify tab switching works
   - Verify each section loads and displays data
   - Verify date range filter updates all visible sections

### Prior art in codebase
- `Overview.test.tsx` — existing page test pattern
- `api/tests/faceRecognition.test.js` — existing API test pattern
- `AppointmentForm.test.tsx` — component test pattern

## Out of Scope

1. **Real-time updates** — Reports will not auto-refresh; user must reload or click refresh
2. **PDF export** — Only CSV export is supported in v1; PDF can be added later
3. **Custom report builder** — No drag-and-drop report creation in v1
4. **Scheduled email reports** — No automated report delivery in v1
5. **Commission calculations in reports** — Commission is a separate page; reports show raw revenue
6. **Patient medical record analytics** — `dotkhams` table is currently empty; add when data exists
7. **Inventory/supply chain reports** — Not applicable to current dental clinic workflow
8. **Multi-currency** — All values in VND; no currency conversion
9. **Data warehouse / OLAP** — Direct PostgreSQL queries; no separate analytics DB
10. **Chart library integration** (Recharts, Chart.js, etc.) — v1 uses CSS-only charts to avoid new dependencies; can upgrade to a chart library in v2 if needed

## Further Notes

### Data Landscape (as of 2026-04-13)
| Entity | Count | Date Range |
|--------|-------|------------|
| Appointments | 224 | Jun 2023 – Apr 2026 |
| Sale Orders | 29 (26 active) | Jul 2024 – Apr 2026 |
| Payments | 70 | Jul 2024 – Apr 2026 |
| Partners (Customers) | 39 | — |
| Partners (Doctors) | 22 | — |
| Partners (Assistants) | 9 | — |
| Companies (Branches) | 7 | — |
| Products | 161 in 11 categories | — |
| Monthly Plans | 2 (₫40.6M total) | — |
| Payment Allocations | 13 | — |

### Key Schema Relationships for Reports
- `appointments.doctorid` → `partners.id` (doctor who treated)
- `appointments.saleorderid` → `saleorders.id` (linked treatment plan)
- `appointments.companyid` → `companies.id` (branch)
- `saleorders.partnerid` → `partners.id` (customer)
- `saleorders.doctorid` → `partners.id` (doctor who created)
- `saleorders.assistantid` → `partners.id` (assistant)
- `saleorderlines.orderid` → `saleorders.id`
- `saleorderlines.productid` → `products.id`
- `products.categid` → `productcategories.id`
- `payments.customer_id` → `partners.id`
- `payment_allocations.payment_id` → `payments.id`
- `payment_allocations.dotkham_id` → `dotkhams.id`
- `partners.sourceid` → `customersources.id`
- `partners.companyid` → `companies.id`
- `monthlyplans.customer_id` → `partners.id`

### Revenue Realities
- Total invoiced (active sale orders): ₫97,635,000
- Total paid: ₫42,535,000
- Total outstanding: ₫47,190,000 (48% unpaid!)
- Payments: ₫92,366,000 collected (₫78.7M cash, ₫7M bank, ₫6.6M deposit)
- 3 voided payments totaling ₫1.6M
- Only 2 branches have sale order data (Quận 3: 18 orders, Thủ Đức: 8 orders)
- This means location comparison reports will be sparse initially

### Appointment State Machine
States: `scheduled → confirmed → arrived → in Examination → in-progress → done`
Also: `cancel`, `cancelled`
This affects completion rate calculations — "done" is the success state, "cancel"/"cancelled" are failures, and intermediate states are in-progress.

### Vietnamese Context
- All currency values in Vietnamese Đồng (VND), formatted with ₫ symbol
- Customer names, service names, and categories are in Vietnamese
- CSV exports must support UTF-8 for Vietnamese characters
- Date format: YYYY-MM-DD (ISO standard, consistent with existing codebase)

### Implementation Order (Recommended)
1. Backend: `reports.js` route with all endpoints (can be done in one pass)
2. Frontend: `ReportsContext` + `ReportsFilters` (shared infrastructure)
3. Frontend: Chart widgets (`BarChart`, `ProgressBar`, `DonutChart`, `KPICard`)
4. Frontend: `DashboardSection` (executive overview — validates end-to-end)
5. Frontend: `RevenueSection` (most important business report)
6. Frontend: `AppointmentsSection` → `DoctorsSection` → `LocationsSection`
7. Frontend: `CustomersSection` → `EmployeesSection` → `ServicesSection`
8. Polish: CSV export, loading states, error handling, responsive layout
9. Tests: API tests, then component tests, then E2E
