# TGClinic Codebase Analysis — Duplication & Bottlenecks

> Snapshot: 2026-06-14. Generated to guide the enterprise reference-library research swarm. Use this as a starting point when selecting patterns to adopt from `library/`.

## 1. File-Size Hotspots (Module-Size Rule Violations)

The project rule says no source file should exceed ~500 lines or ~10,000 characters. Many files exceed both thresholds.

### Backend (api/src/routes/)

| File | Lines | Risk |
|---|---|---|
| `api/src/routes/ctv.js` | 1,095 | Massive; cross-DB commission aggregation + CTV admin mutation + reporting in one file |
| `api/src/routes/payments.js` | 536 | Payment create/delete/void/refund/receipt + residual logic inline |
| `api/src/routes/ctvPublic.js` | 526 | Public CTV signup, QR, discount, referral resolution |
| `api/src/routes/discountCodes.js` | 500 | Discount code CRUD + validation + usage tracking |
| `api/src/routes/permissions.js` | 484 | Permission/group/RBAC UI config |
| `api/src/routes/monthlyPlans.js` | 474 | Installment plan create/update/delete + invariants |
| `api/src/routes/ctvs.js` | 435 | CTV list + activation + hierarchy |
| `api/src/routes/payments/readHandlers.js` | 429 | Payment list/export SQL duplicated across 3+ list queries |
| `api/src/routes/appointments/mutationHandlers.js` | 429 | Appointment mutation logic |
| `api/src/routes/partners/mutationHandlers.js` | 417 | Partner/customer mutation logic |

### Frontend (website/src/)

| File | Lines | Risk |
|---|---|---|
| `website/src/components/commission/CtvManagementTab.tsx` | 859 | Admin CTV list + modals + edit + hierarchy in one component |
| `website/src/components/commission/EarningsPayoutsTabs.tsx` | 485 | Earnings/payout tabs + tables + filters |
| `website/src/components/services/ServiceForm.tsx` | 504 | Service create/edit form at size limit |
| `website/src/components/settings/FeedbackAdminContent.tsx` | 644 | Feedback admin + threading |
| `website/src/components/payment/PaymentForm.tsx` | 484 | Payment form at size limit |
| `website/src/pages/Payment.tsx` | 471 | Payment page composition |
| `website/src/components/payment/CustomerDepositSections.tsx` | 468 | Deposit sections |
| `website/src/components/settings/PermissionGroupConfig.tsx` | 451 | RBAC config UI |
| `website/src/components/shared/AddressAutocomplete.tsx` | 436 | Large shared component |
| `website/src/lib/api/ctv.ts` | 402 | API client approaching limit |

**Implication:** These files are hard to test, review, and reason about. Any enterprise refactor should target service-layer extraction and component decomposition.

## 2. Duplication Patterns

### 2.1 Amount Parsing (`parseFloat(... || 0)`)

Repeated 100+ times across backend route files. Examples:
- `payments.js`, `earnings.js`, `payouts.js`, `ctv.js`, `ctvClientJourneys.js`, `customerBalance.js`, `cashbooks.js`, `journals.js`, `monthlyPlans.js`, `dotKhams.js`, `reports/**/*.js`

**Reference fix:** A small `Money` value object or `toCents()` / `fromCents()` utility + consistent decimal serialization. Adopt from money-flow references in `library/money-flow/`.

### 2.2 Manual Transaction Boilerplate

Every route that writes money repeats:

```js
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ... business logic with early returns, each needing ROLLBACK ...
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  ...
} finally {
  client.release();
}
```

Seen in: `payments.js`, `payouts.js`, `monthlyPlans.js`, `saleOrderLines.js`, `employees/mutations.js`, `feedback/adminRoutes.js`, `feedback/userRoutes.js`.

**Reference fix:** A `withTransaction(queryable, async (client) => { ... })` helper that automatically rolls back on thrown errors and commits on success. Adopt from `library/express-patterns/` and `library/postgresql-patterns/`.

### 2.3 Payment List Query Duplication

`api/src/routes/payments/readHandlers.js` repeats the same base SELECT + JOIN + column list at least 3 times (list, export, search). The only differences are `WHERE` clauses and pagination.

**Reference fix:** Query builder or composed SQL fragments. Adopt from `library/postgresql-patterns/`.

### 2.4 CTV Summary / Client-Journey Mapping

`ctv.js` and `ctvClientJourneys.js` contain nearly identical aggregation logic for earnings totals, paid earnings, and stage derivation. Lines 440–485 of `ctv.js` mirror lines 43–84 of `ctvClientJourneys.js`.

**Reference fix:** Shared mapper/aggregator function. See `library/ctv-referral/` and `library/commissions-mlm/`.

### 2.5 Dual-DB Mirror Pattern

`ctvs.js` manually mirrors writes to both `tdental_demo` and `tcosmetic_demo`:

```js
await getDb('dental').queryRows(updateSql, [active, id]);
try { await getDb('cosmetic').queryRows(updateSql, [active, id]); } catch (e) { /* ... */ }
```

This pattern is high-risk (best-effort swallow) and should be centralized.

**Reference fix:** Transactional outbox or saga pattern for cross-DB writes. Adopt from `library/postgresql-patterns/`.

## 3. Bottlenecks

### 3.1 Large Table Full Scans

Migration 041 added indexes because tables grew 10–100× after import:
- `partners`: 35K
- `appointments`: 222K
- `payments`: 62K
- `saleorders`: 61K
- `saleorderlines`: 63K

But many report and aggregation routes still use unbounded date ranges and `String_AGG` / `ARRAY_AGG` over large datasets.

**Reference fix:** Cursor-based pagination, materialized views, time-bucketed rollups. See `library/postgresql-patterns/`.

### 3.2 Route Files Own Business Policy

Examples:
- `payments.js` owns residual validation, receipt generation, allocation creation, deposit/refund logic, void/delete guards.
- `commissionEngine.js` (only 42 lines) delegates to an engine but the real complexity lives in `ctv.js`.
- `monthlyPlans.js` owns installment invariants and plan deletion rules.

**Reference fix:** Domain services / use cases / command handlers. Adopt from `library/express-patterns/`.

### 3.3 Frontend Components Mix Data + UI

`CtvManagementTab.tsx` (859 lines) does: data fetching, table rendering, modals, editing, hierarchy tree, activation toggles, search/filter.

**Reference fix:** Container/presentational split, custom hooks for data, compound table components. Adopt from `library/react-patterns/`.

## 4. Safe Improvement Targets

| Priority | Target | Why Safe |
|---|---|---|
| High | `withTransaction()` helper | Additive, reduces boilerplate, no behavior change |
| High | `Money` parsing utility | Additive, replaces `parseFloat` with one helper |
| Medium | Payment list query builder | Internal refactor, same response shape |
| Medium | CTV earnings mapper shared | Removes duplication between `ctv.js` and `ctvClientJourneys.js` |
| Medium | Route file decomposition | Extract services for `payments.js`, `ctv.js`, `monthlyPlans.js` |
| Low | Component decomposition | Split `CtvManagementTab`, `FeedbackAdminContent` |

## 5. Non-Goals

- Do **not** change CTV creation domain shape without co-updating SSOT + backend + product-map + tests per `AGENTS.md` §5.1.
- Do **not** alter payment table schema without updating `docs/DATA-MODEL.md`, `docs/MIGRATIONS.md`, `docs/CHANGELOG.md`.
- Do **not** introduce cross-DB JOINs; preserve two-DB topology.

## 6. How to Use This With the Reference Library

When a reference repo demonstrates a cleaner pattern for one of the duplication/bottleneck items above, open a coordination request or plan before refactoring. Use the reference as the exemplar, not a wholesale replacement.
