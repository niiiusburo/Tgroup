# PRD: Fix Payment/Deposit Logic Integrity

## Problem Statement

When managing a customer's payment history (e.g., Phạm Ngọc Huy), multiple data integrity issues cause incorrect financial displays:

1. **Orange "Pay" button shows correct outstanding amount** ($3M owed for Abutment service), but the **Payment History tab shows those amounts as already paid** — even though no payment was ever made against the invoice.
2. **The "Records" tab shows $2.7M deposit** in the summary, but the **Deposit tab doesn't show any deposits** matching that amount.
3. **Outstanding balance always reads $0** in the customer profile header, regardless of actual debt.
4. **Payment allocations don't reduce invoice residual** because payments get misclassified as deposits.

### Root Causes Identified

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| 1 | `partner_id` vs `partnerid` column name mismatch in outstanding balance query | `api/src/routes/customerBalance.js:44` | Outstanding balance always $0 |
| 2 | `looksLikeDeposit` auto-detection misclassifies invoice payments as deposits | `api/src/routes/payments.js` POST handler | All payments become deposits |
| 3 | `GET /api/Payments` returns ALL payments (deposits + invoice payments) without filtering by type | `api/src/routes/payments.js` GET handler | Payment history shows deposits as "paid" |
| 4 | Payment tab in CustomerProfile doesn't distinguish deposit top-ups from invoice payments | `CustomerProfile.tsx` payment tab | User confusion between deposits and payments |
| 5 | `handleMakePayment` in Customers page doesn't pass `deposit_type` hint | `Customers.tsx` `handleMakePayment` | Backend can't distinguish intent |

## Solution

Fix the payment classification pipeline so that:
- **Invoice payments** (payments with allocations to saleorders/dotkhams) are correctly typed as `deposit_type = NULL` (general payment), NOT as deposits.
- **Deposit top-ups** (payments from the Deposit tab with no invoice allocations) remain typed as `deposit_type = 'deposit'`.
- **Payment History** in the customer profile only shows actual invoice payments, not deposit top-ups.
- **Deposit tab** correctly shows all deposit transactions.
- **Outstanding balance** calculates correctly from saleorders + dotkhams.

## User Stories

1. As a clinic staff, I want to see the correct outstanding balance for a customer, so that I know how much they owe.
2. As a clinic staff, when I click "Pay" on a treatment record, I want to see the correct amount owed on that specific record, so that I can collect the right payment.
3. As a clinic staff, when I record a payment against an invoice, I want it to reduce the invoice's outstanding balance, so that the financial records stay accurate.
4. As a clinic staff, I want the Payment History tab to show only actual invoice payments (not deposit top-ups), so that I can see what was paid for what service.
5. As a clinic staff, I want the Deposit tab to show all deposit transactions separately, so that I can track the customer's wallet balance independently.
6. As a clinic staff, when a payment uses both deposit wallet and cash, I want both amounts tracked correctly and the invoice residual reduced by the total, so that mixed payments work properly.
7. As a clinic staff, I want the "total cost / paid / owed" summary cards to show accurate numbers, so that I can quickly understand the customer's financial status.
8. As a clinic staff, when I void a payment, I want the invoice residual to be restored, so that the financial records stay consistent.
9. As a clinic staff, I want existing historical data (payments already in the DB with wrong deposit_type) to display correctly, so that past records aren't broken.

## Implementation Decisions

### Module 1: Fix Outstanding Balance Query (Critical)
**File:** `api/src/routes/customerBalance.js`
- Fix `partner_id` → `partnerid` on line 44 for the saleorders query
- Fix `partnerid` column name for dotkhams query (already correct)
- Both queries should use the actual column names from the `dbo` schema

### Module 2: Fix Payment Classification in POST /api/Payments
**File:** `api/src/routes/payments.js`
- Change the `looksLikeDeposit` detection logic:
  - If `allocations` array is provided and has entries → this is an invoice payment, NOT a deposit. Set `deposit_type = NULL` (or don't set it).
  - If `method === 'deposit'` or `method === 'mixed'` → this is an invoice payment using deposit funds, NOT a deposit top-up.
  - Only classify as `deposit_type = 'deposit'` when: no allocations, no service_id, method is cash/bank_transfer, and no deposit_used.
- New logic:
  ```
  isInvoicePayment = allocations exist with allocated_amount > 0
  isDepositTopUp = !isInvoicePayment && !service_id && method in ('cash', 'bank_transfer') && deposit_used == 0
  deposit_type = isDepositTopUp ? 'deposit' : (isRefund ? 'refund' : null)
  ```

### Module 3: Separate Payment History from Deposit History in GET /api/Payments
**File:** `api/src/routes/payments.js`
- Add a query parameter `type` to `GET /api/Payments`:
  - `type=payments` (default for payment history): Only returns payments that have allocations OR are NOT deposit top-ups (i.e., exclude `deposit_type IN ('deposit', 'refund')`)
  - `type=deposits`: Only returns deposit/refund transactions (current `/deposits` endpoint)
  - No type filter: Returns all (current behavior, for backward compat)
- Frontend `useCustomerPayments` hook should pass `type=payments` to only fetch actual invoice payments.

### Module 4: Frontend - useCustomerPayments Should Fetch Only Invoice Payments
**File:** `website/src/hooks/useCustomerPayments.ts`
- Update `fetchPayments(customerId)` to `fetchPayments(customerId, 'payments')` to exclude deposit top-ups from payment history.

### Module 5: Frontend - Ensure handleMakePayment Passes Correct Context
**File:** `website/src/pages/Customers.tsx`
- In `handleMakePayment`, ensure the payment data being sent to the API includes the `allocations` array properly, so the backend can correctly classify it as an invoice payment (not a deposit).

### Module 6: Frontend - Payment History Display Fix
**File:** `website/src/components/customer/CustomerProfile.tsx`
- In the payment tab, ensure Payment History shows each payment with its allocations clearly linked to invoices
- The "Đã thanh toán" (Paid) summary card should be calculated from: `totalServiceCost - outstandingBalance` (from the balance API, which will now be correct after Module 1 fix)

### Module 7: Frontend - usePayment Hook Payment Status
**File:** `website/src/hooks/usePayment.ts`
- The `mapSaleOrderToPayment` function currently sets payment status based on `residual === 0`. This maps sale orders to payment records, but it's mixing concerns. The Payment page uses this to show "completed" vs "pending" statuses. This should remain as-is since it's a separate concern from the customer profile payment history.

## Testing Decisions

### What makes a good test
- Tests should verify external behavior: correct API responses for given inputs
- Tests should NOT verify implementation details like which SQL query is used

### Modules to test

1. **Backend: customerBalance API** — Given a customer with unpaid saleorders, the balance endpoint should return the correct outstanding amount.
2. **Backend: POST /payments classification** — Given a payment with allocations, it should NOT be classified as deposit_type='deposit'. Given a payment without allocations and no service_id, it should be classified as deposit_type='deposit'.
3. **Backend: GET /payments filtering** — Given a customer with both deposit and invoice payment records, `type=payments` should only return invoice payments.
4. **Frontend: CustomerProfile payment display** — The payment tab should show correct paid/owed amounts.

### Prior art
- `website/e2e/team-charlie-payments.spec.ts` — existing payment E2E tests
- `website/e2e/vps-payment-history.spec.ts` — payment history tests
- `website/src/components/payment/__tests__/PaymentForm.submit.test.tsx` — payment form unit tests

## Out of Scope

- Refactoring the entire payment data model
- Migrating historical payment records with incorrect `deposit_type` (we'll handle display logic to work with existing data)
- Adding new UI features (this is purely a bug fix)
- Changing the deposit wallet calculation logic (it's correct; the issue is input data)
- Monthly payment plans (separate feature)

## Further Notes

### Data Migration Consideration
Existing payments in the database for Phạm Ngọc Huy have `deposit_type = NULL` for all 21 rows. These are all deposit top-ups (created via the Deposit tab). The frontend should handle this correctly since:
- `deposit_type IS NULL` with no allocations → they show in the deposit list (via the fallback logic in the deposits endpoint)
- They should NOT show in payment history (which will now filter by type)

No data migration is needed — the fix is in classification logic going forward and proper filtering on read.

### The `amountPaid` calculation in CustomerProfile
Currently calculated as `totalServiceCost - profile.outstandingBalance`. Once the outstanding balance query is fixed, this will show the correct amount paid. No change needed to this calculation.
