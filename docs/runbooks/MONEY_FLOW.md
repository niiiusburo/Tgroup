# MONEY_FLOW.md

> Payment, deposit, residual, and allocation runbook for TGClinic.

## Source Of Truth

- Domain map: `product-map/domains/payments-deposits.yaml`.
- Business rules: `product-map/business-logic/payment-allocation.md`.
- Schema blast radius: `product-map/schema-map.md`.
- Unknowns: `product-map/unknowns.md`.

## Core Rule

Money behavior must be reconstructed from canonical local database truth, not from UI display text or legacy export assumptions.

## Main Surfaces

- Customer profile payment tab.
- Payment page.
- Service/treatment records.
- Deposits/refunds/usage.
- Customer receipts.
- Excel payment/service exports.

## Implementation Rules

- Payment success must refresh the visible customer service/payment surface immediately.
- Allocation changes must be idempotent and auditable.
- Residual display must come from current sale-order/payment allocation data.
- Do not flatten TDental source rows in a way that loses treatment/payment relationships.
- Treat one-day date shifts as timezone/import/display-boundary issues until proven otherwise.

## Verification

For money-affecting changes:

1. Read the payment domain map and payment-allocation business logic.
2. Test at least one named customer with known service/payment history.
3. Verify API payload and browser-visible display.
4. Check exports if the changed field appears in operational Excel output.
5. Record any reconciliation gap instead of silently dropping unsupported rows.
