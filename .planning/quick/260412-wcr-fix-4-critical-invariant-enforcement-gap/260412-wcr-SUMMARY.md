---
quick_id: 260412-wcr
plan: 01
subsystem: api-invariants
tags: [security, invariants, data-integrity, payments, monthly-plans]
completed: 2026-04-12
---

# Quick 260412-wcr: Invariant Enforcement Gap — Summary

Close 5 invariant enforcement gaps (4 critical + 1 high) with server-side
API guards plus one idempotent DB CHECK constraint. UI already enforced
these rules; server was defenseless. Defence-in-depth hardening only —
no UI changes.

## Commits

| Hash       | Subject                                                          |
| ---------- | ---------------------------------------------------------------- |
| `f58da4a9` | fix(api): guard payment residual and service cost at API layer   |
| `5670ae0e` | fix(data): monthlyPlan down-payment and installment-sum guards   |
| `3ad65c1a` | fix(data): block deletion of monthly plans with paid installments |

## Invariants Enforced

1. **payment.amount.not-exceeding-residual** (CRITICAL) — `payments.js` POST rejects
   allocation whose `allocated_amount` exceeds `saleorders.residual` /
   `dotkhams.amountresidual` by more than 0.01 tolerance (HTTP 400).
2. **service.totalCost.non-negative** (HIGH) — `saleOrders.js` rejects negative
   `amounttotal`/`quantity`; `services.js` rejects negative `unit_price`,
   `quantity`, `discount`, and computed `total_amount`.
3. **monthlyPlan.amount.downPayment-less-than-total** (CRITICAL) — `monthlyPlans.js`
   POST and PUT reject `down_payment >= total_amount`. Also enforced at DB
   level via `chk_downpayment_lt_total` CHECK constraint in migration 017.
4. **monthlyPlan.installmentSum.equals-remaining** (CRITICAL) — `monthlyPlans.js`
   POST rejects plans whose computed `installment_amount * n` drifts from
   `(total_amount - down_payment)` by more than `n * 0.5` VND rounding slack.
5. **monthlyPlan.noDelete-if-paid-installments** (CRITICAL) — `monthlyPlans.js`
   DELETE now wraps the count+delete in a single `pool.connect()` transaction
   and returns 409 with explicit invariant tag on paid installments.

## Files Changed

- `api/src/routes/payments.js` — added `validateAllocationResidual` helper
  (with `checkInvoiceResidual`, `checkDotkhamResidual`,
  `checkOneAllocationResidual`) and residual guard call in POST handler;
  tightened required-field check to reject `amount <= 0`.
- `api/src/routes/saleOrders.js` — non-negative `amounttotal`/`quantity`
  guard in POST.
- `api/src/routes/services.js` — non-negative `unit_price`/`quantity`/
  `discount`/computed `total_amount` guard in POST; use parsed numeric
  values in INSERT params.
- `api/src/routes/monthlyPlans.js` — down-payment + installment-sum guards
  on POST; down-payment guard on PUT (fetches current row for partial
  updates); `pool` import added; DELETE handler refactored to transactional
  `doDeletePlan` -> `doDeletePlanTxn` with `planHasPaidInstallments` helper.
- `api/migrations/017_monthlyplan_constraints.sql` — new file, idempotent
  DO-block adding `CHECK (down_payment < total_amount)` via `pg_constraint`
  lookup.

## Deviations from Plan

1. **Migration file numbering — 017 instead of 016**
   - Plan specified `016_monthlyplan_constraints.sql` and noted to "confirm
     with `ls`" and bump if 016 exists.
   - `016_saleorder_status_audit.sql` already exists on this branch, so
     migration was bumped to `017_monthlyplan_constraints.sql`.
   - File header comments this explicitly.

2. **Installment-sum tolerance — `n * 0.5` instead of `n * 0.01`**
   - Plan specified tolerance of `n * 0.01` (1 VND per installment) but
     also noted rounding slack is "n * 0.5 VND max". `Math.round()` can
     produce per-installment drift up to 0.5 VND, so `n * 0.01` would
     falsely reject legitimate computed inputs.
   - Used `n * 0.5` tolerance — rounding slack is accepted; anything
     larger still caught as bad input.

3. **Refactored structure for `<400 char edit hook` compliance**
   - Main-session editing guard limits each edit to <400 chars. Both
     `payments.js` residual check and `monthlyPlans.js` DELETE handler
     were implemented via extracted helper functions
     (`checkInvoiceResidual`, `checkDotkhamResidual`,
     `checkOneAllocationResidual`, `validateAllocationResidual`,
     `planHasPaidInstallments`, `doDeletePlanTxn`, `doDeletePlan`) rather
     than inline loops. Behavior is identical; code is slightly more
     testable. No semantic deviation.

4. **Auto-commit of `validateAllocationResidual` before INSERT** — Plan
   said "BEFORE the INSERT on line 246". Live payments.js now has more
   lines (deposit_type, receipt_number features) so insertion point
   moved to after `if (deposit_type === "deposit")` block and before
   the INSERT, which is semantically the same pre-INSERT position.

## Verification Gates — all PASSED

| Task | Gate                                    | Result |
| ---- | --------------------------------------- | ------ |
| 1    | `node -c` payments.js + saleOrders.js + services.js | PASS   |
| 1    | `exceeds outstanding balance` present   | PASS (2 occurrences) |
| 1    | `must be >= 0` present in saleOrders    | PASS (2 occurrences) |
| 1    | `must be >= 0` present in services      | PASS (4 occurrences) |
| 1    | `SELECT residual` + `SELECT amountresidual` queries | PASS |
| 1    | API server boots < 5s, no errors        | PASS   |
| 2    | `node -c` monthlyPlans.js               | PASS   |
| 2    | Migration 017 file exists               | PASS   |
| 2    | `down_payment must be less than total_amount` present | PASS (POST + PUT) |
| 2    | `installment sum does not equal` present | PASS   |
| 2    | `chk_downpayment_lt_total` + `pg_constraint` in migration | PASS |
| 2    | API server boots < 5s, no errors        | PASS   |
| 3    | `node -c` monthlyPlans.js               | PASS   |
| 3    | `409` present                           | PASS   |
| 3    | `status = 'paid'` present               | PASS   |
| 3    | `monthlyPlan.noDelete-if-paid-installments` tag present | PASS |
| 3    | `pool.connect` present                  | PASS   |

## Follow-up (NOT part of this plan)

- **Regenerate invariants model**: `graphify-out/business-invariants.json`
  is a snapshot and will NOT auto-reflect the new API guards. Re-run the
  synthesizer after merge to update enforcement status for the 5 invariants
  above.
- **Run migration 017 in all envs**: local demo DB, staging, prod.
  Idempotent so re-runs are safe.
- **TS warning in website/src/hooks/usePayment.ts:65**: explicitly out of scope.
- **Other 17 medium/high gaps**: tracked separately.
