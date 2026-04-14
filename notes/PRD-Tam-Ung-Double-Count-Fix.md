# PRD — Fix "Tạm ứng" Double-Count on Payment Invoice Creation

**Date:** 2026-04-14
**Severity:** HIGH (financial display incorrect on every customer)
**Status:** Root-caused → Fix applied to `api/src/routes/customerBalance.js`

## 1. Problem

When a user creates a regular payment invoice for a service, the system correctly deducts the paid amount from the outstanding balance, **but also incorrectly increases "Tạm ứng" (advance/deposit) by the same amount**.

### Repro
1. Customer has 0 Tạm ứng.
2. Create 3,000,000đ invoice payment → outstanding drops by 3M (correct), Tạm ứng jumps to 3M (wrong).
3. Create another 10M payment → Tạm ứng jumps to 13M (wrong).

Expected: Tạm ứng changes **only** for explicit deposit top-ups, usages, or refunds.

## 2. Root Cause

The write path in `api/src/routes/payments.js:546-559` is correct — when `allocations[]` are sent, `deposit_type` stays NULL and `saleorders.residual` is reduced.

The read path in `api/src/routes/customerBalance.js:21-33` is buggy. The `total_deposited` SUM uses this fallback:

```sql
deposit_type IS NULL AND method IN ('cash', 'bank_transfer')
AND service_id IS NULL AND (deposit_used IS NULL OR deposit_used = 0) AND amount > 0
```

Every regular invoice payment matches this (frontend never sets `deposit_type`; the service link lives in `payment_allocations`, not on `payments.service_id`). So every payment is double-counted: once to reduce residual, once as a deposit.

The `/Payments/deposits` listing (`payments.js:316-325`) uses the same fallback but adds `AND NOT EXISTS (SELECT 1 FROM payment_allocations pa WHERE pa.payment_id = p.id)`. The balance endpoint was missing that guard.

## 3. Fix

One-line SQL change in `customerBalance.js`: add `AND NOT EXISTS (SELECT 1 FROM payment_allocations pa WHERE pa.payment_id = payments.id)` to the `total_deposited` fallback clause.

## 4. Scope

| File | Change |
|---|---|
| `api/src/routes/customerBalance.js` | Add `NOT EXISTS` allocation guard |
| `website/public/CHANGELOG.json` | Bug Fix entry (on release) |
| `website/package.json` | Version bump (on release) |

No frontend changes. No schema migration. No backfill — the fix retroactively reclassifies existing rows at read time.

## 5. Verification

1. Pick a customer with existing allocations and non-zero `deposit_balance`.
2. Before fix: `curl /api/CustomerBalance/{id}` shows inflated `deposit_balance`.
3. After fix + API restart: `deposit_balance` drops to real top-ups minus usage/refunds.
4. Create a new invoice payment → Tạm ứng unchanged.
5. Create a real deposit top-up (no allocations) → Tạm ứng increases by top-up amount.
6. Use the deposit on an invoice → Tạm ứng decreases.

## 6. Rollback

Revert the single SQL clause. Zero data risk (read-only query change).

## 7. Non-Goals

- Does not restructure the payment type taxonomy.
- Does not backfill `deposit_type='payment'` on historical NULL rows — future improvement.
