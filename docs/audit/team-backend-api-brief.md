# AUDIT TEAM: Backend API (Team E)

## CONTEXT
Tgroup dental clinic dashboard. Backend in api/src/ with Express + PostgreSQL.
Audit all API routes for: correctness, security, consistency with frontend API client.

## FILES TO AUDIT
**API entry:**
api/src/server.js
api/src/session-defaults.js

**Auth:**
api/src/middleware/auth.js

**Routes (all in api/src/routes/):**
account.js, accountPayments.js, appointments.js, auth.js, cashbooks.js, commissions.js, companies.js, config.js, crmTasks.js, customerBalance.js, customerReceipts.js, customers-calendar.js, dashboardReports.js, dotKhams.js, employees.js, hrPayslips.js, journals.js, partners.js, payments.js, permissions.js, productCategories.js, products.js, receipts.js, saleOrderLines.js, saleOrders.js, services.js, session.js, stockPickings.js

**Known oddities:**
- Many routes have ._ prefixed files (macOS resource forks? Should be cleaned)
- Frontend uses /api/Partners but route file is partners.js (case sensitivity)
- Frontend lib/api.ts at port 3002, but docs say 3001

## WHAT TO CHECK
1. **Port mismatch**: Frontend connects to port 3002 (or env var). Does backend listen on 3002?

2. **Route naming**: Frontend calls /Partners, /Employees, /Companies etc. with PascalCase.
   Backend routes — are they case-sensitive? Do they match?

3. **Auth middleware**: Is it applied to all routes that need it? Any unauthenticated endpoints that should be protected?

4. **SQL injection**: Any raw SQL queries without parameterization?

5. **Error handling**: Consistent error responses? 500 vs 400 vs 404 mapping correct?

6. **Missing routes**: Any endpoint frontend calls that backend doesn't implement?
   - Check lib/api.ts endpoints against each route file

7. **CORS**: Any CORS configuration?

8. **_. files**: Why ._. files exist? Are they macOS artifacts or actual route files?

9. **Database connection**: db.js — connection pooling, error handling, query helpers?

10. **Session management**: session.js, session-defaults.js, truth-session.json — what's the session strategy?

11. **Response format consistency**: All endpoints return same shape? (pagination format)

12. **Delete endpoints**: Are DELETE methods properly implemented and secure?

## OUTPUT FORMAT
Per-team report. Security issues are P0. Missing endpoints P1. Style/inconsistency P2.
