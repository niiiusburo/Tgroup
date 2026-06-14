# TGClinic Enterprise Refactor Roadmap

> Derived from `library/CODEBASE_ANALYSIS.md` + reference-library research. This is a living plan; each item should become a coordinated task with tests and docs.

## Phase 1 — Foundation Helpers (Low Risk, High Payoff)

### 1.1 Transaction Helper
**Problem:** Manual BEGIN/COMMIT/ROLLBACK boilerplate duplicated in 10+ route files.  
**Reference:** See `library/express-patterns/` and `library/postgresql-patterns/`.  
**Action:** Add `withTransaction(queryable, async (client) => { ... })` in `api/src/db/transactions.js`.  
**Files to update:** `payments.js`, `payouts.js`, `monthlyPlans.js`, `saleOrderLines.js`, `employees/mutations.js`, `feedback/*.js`.  
**Verification:** Existing tests still pass; no behavior change.

### 1.2 Money / Decimal Parsing Utility
**Problem:** `parseFloat(amount || 0)` repeated 100+ times, risking floating-point drift.  
**Reference:** See `library/money-flow/`.  
**Action:** Add `toMoney(value)` and `sumMoney(rows, key)` utilities.  
**Files to update:** All `api/src/routes/**/*.js` that sum money.  
**Verification:** Unit tests for rounding and null handling.

### 1.3 API Error Standardization
**Problem:** Error response shapes vary (`{ error: string }`, `{ error: { code, message } }`, raw Error message).  
**Reference:** See `library/express-patterns/`.  
**Action:** Introduce `AppError` class with `code`, `status`, `message`, `invariant`.  
**Files to update:** New routes first; migrate legacy routes incrementally.

## Phase 2 — Service-Layer Extraction

### 2.1 Payment Domain Service
**Problem:** `api/src/routes/payments.js` (536 lines) owns create/refund/void/delete/allocation/residual logic.  
**Reference:** See `library/money-flow/` and `library/express-patterns/`.  
**Action:** Extract `PaymentService` with methods `createPayment`, `refundPayment`, `voidPayment`, `deletePayment`.  
**Files:** New `api/src/services/payments/`.  
**Verification:** Existing `payments.test.js`, Playwright payment flows.

### 2.2 Commission / Earnings Service
**Problem:** Commission calculation and CTV summary mapping duplicated between `ctv.js` and `ctvClientJourneys.js`.  
**Reference:** See `library/commissions-mlm/` and `library/ctv-referral/`.  
**Action:** Extract `EarningsAggregator` and `CommissionEngine` services.  
**Files:** New `api/src/services/commission/`.  
**Verification:** Earnings/payout tests, CTV dashboard tests.

### 2.3 Monthly Plan Service
**Problem:** `monthlyPlans.js` mixes installment math, invariants, plan CRUD, and transaction logic.  
**Reference:** See `library/money-flow/`.  
**Action:** Extract `MonthlyPlanService` for plan lifecycle.  
**Verification:** Monthly plan tests.

## Phase 3 — Query & Data-Access Improvements

### 3.1 Composed Payment List Query
**Problem:** Same SELECT/JOIN repeated in `payments/readHandlers.js`.  
**Reference:** See `library/postgresql-patterns/`.  
**Action:** Build a query composer or Knex/query builder fragment for payment list.  
**Verification:** Payment list/export/search parity.

### 3.2 Repository Layer for High-Blast Tables
**Problem:** Inline SQL for `payments`, `saleorders`, `partners`, `earnings` scattered across routes.  
**Reference:** See `library/postgresql-patterns/` and `library/express-patterns/`.  
**Action:** Introduce repository modules: `PaymentRepository`, `PartnerRepository`, `EarningsRepository`.  
**Verification:** All routes still pass tests; DB introspection remains consistent.

## Phase 4 — Frontend Architecture

### 4.1 Table Abstraction
**Problem:** `DataTable.tsx` is 10,421 characters; tables are rebuilt differently per page.  
**Reference:** See `library/react-patterns/`.  
**Action:** Standardize on `DataTable` + column helpers + pagination hook.  
**Verification:** No visual regressions on payment/customer/CTV tables.

### 4.2 Container / Presentational Split
**Problem:** `CtvManagementTab.tsx` (859 lines) fetches, renders, and manages modals.  
**Reference:** See `library/react-patterns/`.  
**Action:** Extract `useCtvManagement` hook; keep component as pure UI composition.  
**Verification:** Existing tests pass.

### 4.3 Form Abstraction
**Problem:** Many forms duplicate label/input/error patterns.  
**Reference:** See `library/react-patterns/` and existing `CtvCreationForm` SSOT.  
**Action:** Extend the `FormShell`/`FormField` pattern already started in `components/modules/FormShell/`.  
**Verification:** No behavioral change in AddCustomerForm, PaymentForm, ServiceForm.

## Phase 5 — Harder Architectural Moves

### 5.1 Dual-DB Write Safety
**Problem:** `ctvs.js` best-effort mirrors writes to cosmetic DB, swallowing errors.  
**Reference:** See `library/postgresql-patterns/` (outbox/saga).  
**Action:** Design transactional outbox or async sync job for cross-DB identity writes.  
**Coordination required:** `product-map/domains/business-unit.yaml`, `docs/INVARIANTS.md`.

### 5.2 Bank Statement Import
**Problem:** No current bank-statement import; legacy TDental migration scripts parse descriptions heuristically.  
**Reference:** See `library/bank-statements/`.  
**Action:** Design import pipeline: parser → normalizer → matcher → preview → commit.  
**Coordination required:** `product-map/domains/payments-deposits.yaml`, `docs/CONTRACTS.md`.

### 5.3 Materialized Reporting
**Problem:** Report routes aggregate over large tables on every request.  
**Reference:** See `library/postgresql-patterns/`.  
**Action:** Add materialized views or rollup tables for daily/weekly revenue.  
**Coordination required:** `product-map/domains/reports-analytics.yaml`.

## Rollout Rules

- Every extracted service must have unit tests before replacing inline code.
- Every refactor must update `docs/CHANGELOG.md` and bump `website/package.json` per `AGENTS.md` §8.
- CTV/LOB/commission changes must co-update SSOT + backend + product-map + tests per `AGENTS.md` §5.1.
- Run `npm run verify:governance` after each phase.

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-06-14 | Created reference library | Reduce duplicated research; provide battle-tested exemplars |
| 2026-06-14 | Phases ordered low-risk → high-risk | Build helper foundation before moving business policy |
