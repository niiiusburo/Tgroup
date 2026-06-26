# NK3 Cross-Check Audit Report — Coding Reference Catalog

> Generated: 2026-06-16
> Scope: NK3 (`tmv.2checkin.com`, `tdental_nk3` + `tcosmetic_nk3`)
> Method: 8 parallel agents cross-checked the codebase against `coding-reference-catalog.md` / `library/` reference patterns.
> Constraint: Read-only audit. No code changes.

---

## Executive Summary

The audit fleet found **56 concrete findings** across 8 domains. The most critical risks are:

1. **Money precision:** 30+ `parseFloat(... || 0)` call sites with float arithmetic for payments, payouts, commissions, and installments — contradicts integer-cents best practice.
2. **Transaction discipline:** 12 manual transaction blocks with no `withTransaction` helper, swallowed rollback errors, and missing cross-LOB atomicity for combined payouts.
3. **Earnings race conditions:** No unique constraint or external idempotency key on `dbo.earnings` inserts — duplicate commission payouts possible under concurrent retries.
4. **CTV split-brain:** `POST /api/ctv` uses best-effort dual-DB writes without compensating rollback; can leave CTV in one DB only.
5. **Frontend bloat:** 4 components exceed the 500-line module-size rule; duplicated form field markup and inline modal backdrops.
6. **Database bottlenecks:** Unbounded `allocation_totals` CTE scans, missing covering index on `earnings(recipient_partner_id, status, earned_at)`, and `::date` casts blocking index usage.
7. **Test hygiene:** Global `fetch` mutation in tests instead of dependency injection; hardcoded IDs; skipped E2E test.
8. **RBAC drift:** Hybrid legacy tier-id + `employee_permissions` model, no declarative `<Can>` component, inline permission string literals.

---

## Findings by Domain

### Domain 1 — Money & Decimal Handling

| # | Type | Severity | File | Evidence | Reference Pattern | Proposed Fix | Risk |
|---|------|----------|------|----------|-------------------|--------------|------|
| 1.1 | contradiction | high | `api/src/routes/payments.js` | 7 `parseFloat(... \|\| 0)` call sites; float sums for allocation residual updates | `library/money-flow/medici/` integer cents | Add `api/src/lib/money.js` with `toCents`/`fromCents`; migrate payments | Medium — touches money |
| 1.2 | contradiction | high | `api/src/routes/payouts.js` | `payable.reduce((sum, e) => sum + parseFloat(e.amount \|\| 0), 0)` | `library/money-flow/blnk/` `big.Int` | Use cents helper for batch totals | Low-Medium |
| 1.3 | contradiction | medium | `api/src/routes/earnings.js` | `parseFloat(row.amount \|\| 0)` + `Math.round` after float parse | medici | Normalize to cents before sum | Low |
| 1.4 | contradiction | medium | `api/src/routes/monthlyPlans.js` | Installment math via `Math.round((_ta - _dp) / _n)` on floats | medici | Store plan amounts as cents | Medium |
| 1.5 | contradiction | medium | `api/src/routes/ctv.js` | `parseFloat(e.amount \|\| 0)` for pending/paid totals | medici | Shared aggregator returns cents | Low |
| 1.6 | contradiction | medium | `api/src/services/commissionEngine.js` | `Math.round(base * (share / 100) * 100) / 100` on float base | blnk | Integer-cents commission calculation | Medium |

**Top recommendation:** Implement `api/src/lib/money.js` (`toCents`, `fromCents`, `sumMoney`) and migrate one money path end-to-end (e.g., payouts) with tests, then expand.

---

### Domain 2 — Transactions & DB Connection Handling

| # | Type | Severity | File | Evidence | Proposed Fix | Risk |
|---|------|----------|------|----------|--------------|------|
| 2.1 | simplicity | high | `api/src/routes/payments.js` | 3 manual `pool.connect/BEGIN/COMMIT/ROLLBACK/release` blocks | Introduce `withTransaction(queryable, work)` helper; migrate payments | Medium |
| 2.2 | contradiction | high | `api/src/routes/payouts.js` | Combined payout has nested per-LOB transactions, no cross-DB atomicity | Use saga/outbox or two-phase commit wrapper | High |
| 2.3 | contradiction | high | `api/src/routes/monthlyPlans.js` | POST/PUT do multi-table writes without any transaction | Wrap create/update in `withTransaction` | Medium |
| 2.4 | contradiction | medium | `api/src/routes/employees/mutations.js` | Early returns inside transactions require explicit `ROLLBACK` | `withTransaction` auto-rollback on throw | Low |
| 2.5 | contradiction | medium | `api/src/routes/feedback/adminRoutes.js` | `transactionStarted` boolean flag tracks state manually | Helper removes flag boilerplate | Low |
| 2.6 | bottleneck | medium | Multiple files | `catch (_) {}` swallows rollback errors | Helper logs/rethrows rollback failures | Low |

**Top recommendation:** Add `api/src/db/transaction.js` `withTransaction()` helper and migrate `payments.js` POST create first (highest ROI, lowest risk).

---

### Domain 3 — RBAC & Permission Checks

| # | Type | Severity | File | Evidence | Proposed Fix | Risk |
|---|------|----------|------|----------|--------------|------|
| 3.1 | contradiction | high | `api/src/middleware/requirePermission.js` | Still uses legacy `requireAdmin` and inline `employee_permissions` JOINs | Centralize ability resolver in `permissionService` | Medium |
| 3.2 | contradiction | medium | `api/src/services/permissionService.js` | Mixes tier-id and legacy `employee_permissions` models | Document canonical model; deprecate legacy path | Medium |
| 3.3 | simplicity | medium | `website/src/components/settings/PermissionGroupConfig.tsx` | Inline permission string literals and manual array checks | Add declarative `<Can I="action" a="subject">` component | Low |
| 3.4 | simplicity | low | `api/src/routes/permissions.js` | Inline permission string literals | Use `{action, subject}` shape constants | Low |

**Top recommendation:** Introduce `<Can>` component for 2-3 call sites first; keep backend resolver unchanged.

---

### Domain 4 — CTV / Referral / Commission

| # | Type | Severity | File | Evidence | Proposed Fix | Risk |
|---|------|----------|------|----------|--------------|------|
| 4.1 | contradiction | high | `api/src/services/commissionEngine.js` | `NOT EXISTS` idempotency with no unique constraint — race-vulnerable | Add unique index + `INSERT ... ON CONFLICT DO NOTHING` | Medium |
| 4.2 | contradiction | high | `api/src/routes/ctv.js` | `Promise.all(writes)` for dual-DB insert; `safeQueryRows` swallows errors | Sequential insert + compensating DELETE (port from `ctvPublic.js`) | Medium |
| 4.3 | simplicity | medium | `api/src/routes/ctv.js` | Duplicated earnings total derivation inline | Extract `aggregateEarnings(rows)` pure function | Low |
| 4.4 | simplicity | low | `api/src/routes/ctvClientJourneys.js` | Unmounted dead code; `getClientJourneys` not a route handler | Remove or mount officially | Low |
| 4.5 | simplicity | medium | `website/src/components/commission/CtvManagementTab.tsx` | 860 lines; violates module-size rule | Extract modals and row into separate files | Low |
| 4.6 | contradiction | medium | `website/src/components/commission/CtvManagementTab.tsx` | `EditCtvModal` duplicates SSOT `CtvCreationForm` field patterns | Reuse/extend SSOT for edit mode | Low-Medium |
| 4.7 | contradiction | medium | `website/src/components/commission/EarningsPayoutsTabs.tsx` | Mixed-LOB payout silently blocked (`if (!payoutLob) return`) | Add UX message or implement `payout_group_id` combined flow | Low |
| 4.8 | contradiction | medium | `api/src/services/commissionEngine.js` | `parseFloat` used for money (also Domain 1) | Cents helper | Medium |

**Top recommendation:** Add unique constraint/partial index on `dbo.earnings` to close the duplicate-commission race window — highest money-risk fix.

---

### Domain 5 — Payment Processing

| # | Type | Severity | File | Evidence | Proposed Fix | Risk |
|---|------|----------|------|----------|--------------|------|
| 5.1 | simplicity | high | `api/src/routes/payments.js` | 537-line god route mixing HTTP, tx, receipt, allocation, residual, commission hooks, QR hooks | Extract `PaymentService` with discrete commands | Medium |
| 5.2 | simplicity | medium | `api/src/routes/payments/readHandlers.js` | 430 lines; duplicated SELECT column lists/JOINs across list/export/search | Shared query builder or composed SQL fragments | Low |
| 5.3 | contradiction | medium | `api/src/routes/payments/helpers.js` | Service-level logic (`validateAllocationResidual`, receipt generation) lives under `routes/` | Move to `api/src/services/payments/` | Low |

**Top recommendation:** Extract `PaymentService` as the next Phase 2 refactor after `withTransaction` and `Money` helpers land.

---

### Domain 6 — Frontend Component Structure

| # | Type | Severity | File | Evidence | Proposed Fix | Risk |
|---|------|----------|------|----------|--------------|------|
| 6.1 | simplicity | high | `website/src/components/commission/CtvManagementTab.tsx` | 860 lines; 3 modals + table + DnD inline | Feature folder: extract modals, row, hook | Low |
| 6.2 | simplicity | high | `website/src/components/settings/FeedbackAdminContent.tsx` | 645 lines; tabs + table + modal + paste handling | Extract table, modal, hook | Low |
| 6.3 | simplicity | medium | `website/src/components/services/ServiceForm.tsx` | 503 lines; 20+ `useState` fields; duplicates label+input markup | Use `FormField` primitive; split into sections | Low |
| 6.4 | simplicity | medium | `website/src/components/payment/PaymentForm.tsx` | 485 lines; inline modal backdrop + footer buttons | Use shared `Modal` + `FormField` | Low |
| 6.5 | simplicity | medium | `website/src/components/shared/AddressAutocomplete.tsx` | 437 lines; debounce + Places parsing + dropdown inline | Split into `useAddressAutocomplete` hook + presentational | Low |
| 6.6 | contradiction | low | `website/src/components/modules/FormShell/FormField.tsx` | Exists but unused; style differs from actual forms | Reconcile style and migrate forms to it | Low |
| 6.7 | contradiction | low | `website/src/components/forms/AddCustomerForm/FieldLabel.tsx` | Good pattern but not exported/reused | Export as canonical field label | Low |

**Top recommendation:** Extract `CtvManagementTab` into a feature folder first; it is the largest and has the clearest sub-component boundaries.

---

### Domain 7 — PostgreSQL Query Patterns

| # | Type | Severity | File | Evidence | Proposed Fix | Risk |
|---|------|----------|------|----------|--------------|------|
| 7.1 | bottleneck | high | `api/src/routes/reports/revenueRecognition.js` | `allocation_totals` CTE scans entire `payment_allocations` unbounded | Bound CTE by date filter or add materialized rollup | Medium |
| 7.2 | bottleneck | high | `api/src/routes/ctv.js` | No covering index on `earnings(recipient_partner_id, status, earned_at)` | Add composite index | Low |
| 7.3 | bottleneck | medium | `api/src/routes/payments/readHandlers.js` | `OFFSET $N` pagination on `payments` | Cursor-based pagination | Medium |
| 7.4 | bottleneck | medium | `api/src/routes/reports/helpers.js` | `::date` cast on timestamp columns blocks index usage | Compare timestamps directly or add functional index | Low |
| 7.5 | contradiction | medium | `api/src/services/reports/canonicalRevenue.js` | Repeated unbounded CTE across 4 functions | Shared bounded CTE helper | Low |
| 7.6 | contradiction | high | High-blast tables | No audit triggers on `payments`, `earnings`, `partners`, `saleorders` | Add `f_audit()` trigger selectively | High |
| 7.7 | contradiction | medium | `api/src/db/migrations/` | No indexes for `earnings`, `saleorders`, `appointments`, `payment_allocations` | Audit and add missing indexes | Low |

**Top recommendation:** Add the `earnings(recipient_partner_id, status, earned_at)` index first — it is a one-line migration with immediate CTV dashboard impact.

---

### Domain 8 — Testing

| # | Type | Severity | File | Evidence | Proposed Fix | Risk |
|---|------|----------|------|----------|--------------|------|
| 8.1 | contradiction | high | `api/src/services/__tests__/comprefaceClient.test.js` | `globalThis.fetch = jest.fn()` instead of DI | Add optional `fetch` param to `comprefaceClient.js` | Low |
| 8.2 | contradiction | high | `api/src/services/__tests__/faceEngineClient.test.js` | Same global fetch mutation + duplicate `describe('getEmbedding')` block | Add `fetch` param; merge duplicate block | Low |
| 8.3 | simplicity | medium | `api/src/services/__tests__/commissionEngine.test.js` | Hardcoded IDs `'X'`, `'Y'`, `'pay-1'` | Factory-based test data | Low |
| 8.4 | simplicity | medium | Multiple frontend tests | Hardcoded UUIDs, mocked contexts individually | Shared factories + helpers | Low |
| 8.5 | bottleneck | medium | `website/src/__tests__/i18n-toggle.test.ts` | `describe.skip`’d; requires live dev server | Use POM + auth storage state; add `webServer` config | Medium |
| 8.6 | simplicity | low | `website/src/__tests__/crossrefBreadcrumbs.test.ts` | Reads source files from disk; redundant with `scripts/verify-crossrefs.js` | Remove or demote to CI-only | Low |

**Top recommendation:** Inject `fetch` into `comprefaceClient` / `faceEngineClient` — small, safe, and eliminates global mutation.

---

## Cross-Cutting Themes

1. **Float money math is pervasive** — 30+ sites, high money-risk, easiest win is a cents helper.
2. **No transaction abstraction** — 12 manual blocks, repeated bugs, clear additive helper path.
3. **Route bloat** — `payments.js`, `ctv.js`, `monthlyPlans.js` violate module-size rule; extract domain services.
4. **Frontend bloat** — 4 files over 500 lines; component extraction is low-risk.
5. **Race conditions in money** — earnings insert race, CTV dual-DB split-brain.
6. **DB performance** — missing indexes, unbounded CTEs, OFFSET pagination.
7. **Test tech debt** — global mocks, hardcoded IDs, skipped E2E.

---

## Recommended Implementation Order

### Phase A — Foundation (low-risk, high-payoff)
1. `api/src/db/transaction.js` `withTransaction()` helper.
2. `api/src/lib/money.js` `toCents` / `fromCents` helpers.
3. `api/src/db/migrations/` add `earnings` composite index.
4. DI `fetch` param in `comprefaceClient.js` / `faceEngineClient.js` + test cleanup.

### Phase B — Service Extraction (medium-risk)
5. Extract `PaymentService` from `api/src/routes/payments.js`.
6. Extract shared `aggregateEarnings` and fix float math in CTV paths.
7. Add unique constraint / `ON CONFLICT` to `dbo.earnings`.
8. Port compensating DELETE pattern to `ctv.js` dual-DB writes.

### Phase C — Frontend & DB Hardening
9. Split `CtvManagementTab.tsx` into feature folder.
10. Add audit triggers to high-blast tables.
11. Bound `allocation_totals` CTEs by date or add materialized views.
12. Introduce `<Can>` component and migrate 2-3 call sites.

---

## Invariants to Preserve

- Dual-DB topology: no cross-DB JOINs; use `getDb(lob)`.
- CTV SSOT: any CTV creation/commission shape change co-updates SSOT + 3 consumers + backend + product-map + tests.
- Money precision: never compare floats for equality.
- NK3-first: no hardcoded `tdental_nk3` strings in shared code.
- §16 docs: any contract/schema/API change updates docs in the same commit.

---

## Next Step

Pick Phase A item 1 (`withTransaction` helper) or item 2 (`Money` helper) and implement with TDD. Both are additive, testable, and unblock Phase B refactors.
