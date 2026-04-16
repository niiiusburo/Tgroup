# Business Logic: Payment Allocation

> How payments, deposits, refunds, and allocations interact in `api/src/routes/payments.js`.

## 1. Core Entities

- **`payments`** — The canonical payment record.
- **`payment_allocations`** — Links a payment to `saleorders` (invoice) or `dotkhams` (medical record).
- **`saleorders`** / **`dotkhams`** — Receivables with a `residual` / `amountresidual` balance.
- **`receipt_sequences`** — Generates receipt numbers (e.g., `TUKH/2025/00001`).
- **`accountpayments`** — Legacy historical table; used as a fallback when `payments` is empty for a customer.

## 2. Payment Classification Algorithm

When `GET /api/Payments` is called with `type=payments` or `type=deposits`, the backend applies heuristics because the schema is not fully normalized.

### Deposit criteria (`type=deposits`)
A row is a deposit if:
1. `deposit_type IN ('deposit', 'refund')` — explicitly typed, OR
2. `deposit_type IS NULL` AND `method IN ('cash', 'bank_transfer')` AND `service_id IS NULL` AND (`deposit_used IS NULL OR deposit_used = 0`) AND the payment has **no** allocations.

### Payment criteria (`type=payments`)
A row is a regular payment if:
1. It has allocations (`EXISTS payment_allocations`), OR
2. It does **not** look like a deposit (see above).

> **Risk:** Adding a new `deposit_type` value without updating these SQL heuristics will silently misclassify payments in list queries.

## 3. Creating a Payment (`POST /api/Payments`)

### Step A: Auto-detect deposit top-up
If the request lacks `deposit_type` and `allocations`, and `method` is not `deposit`/`mixed`, and there is no `service_id` and no `deposit_used > 0`, the backend forces `deposit_type = 'deposit'`.

### Step B: Receipt number generation
If `deposit_type = 'deposit'` and no `receipt_number` is provided, `generateReceiptNumber('TUKH')` is called. It upserts into `receipt_sequences (prefix, year)` and returns a zero-padded sequential number.

### Step C: Residual validation (`validateAllocationResidual`)
For every allocation object:
- If `invoice_id` is set, the allocated amount must not exceed `saleorders.residual + 0.01`.
- If `dotkham_id` is set, the allocated amount must not exceed `dotkhams.amountresidual + 0.01`.
- If validation fails, the entire request returns `400` with the specific error message.

> **Critical invariant:** A payment cannot over-allocate to a receivable.

### Step D: Insert payment row
Standard `INSERT INTO payments` with all fields.

### Step E: Insert allocations and decrement residuals
If allocations are provided and valid:
1. `INSERT INTO payment_allocations (payment_id, invoice_id, dotkham_id, allocated_amount)`
2. For each allocation, update the linked receivable:
   - `UPDATE saleorders SET residual = GREATEST(0, residual - allocated_amount)`
   - `UPDATE dotkhams SET amountresidual = GREATEST(0, amountresidual - allocated_amount)`

> **Note:** `GREATEST(0, ...)` prevents negative residuals at the DB level, but the pre-validation in Step C is supposed to stop this from happening.

## 4. Refund Logic (`POST /api/Payments/refund`)

- Amount is stored as **negative**: `-Math.abs(amount)`.
- `deposit_type = 'refund'`.
- A receipt number is auto-generated.
- No allocation logic is applied.

## 5. Void Logic (`POST /api/Payments/:id/void`)

Wrapped in a transaction:
1. Read all allocations for the payment.
2. Delete allocations.
3. **Reverse** receivable residuals (`+ allocated_amount`).
4. Update the payment: `status = 'voided'`, append `" | VOIDED: <reason>"` to notes.

> **Risk:** If the payment was partially paid down a receivable that has since been further paid, reversing the full allocation could make the residual exceed the original total. The system allows this (no cap on the `+` side).

## 6. Delete Logic (`DELETE /api/Payments/:id`)

Same reversal as void, but physically deletes the payment row instead of marking it voided.

## 7. Update Logic (`PATCH /api/Payments/:id`)

Allowed fields:
- `amount`, `method`, `notes`, `payment_date`, `reference_code`, `status`, `deposit_type`, `receipt_number`

> **Important:** `PATCH` does **not** modify allocations. If an admin changes the `amount` of an allocated payment, the allocations remain unchanged and the receivable residuals are **not** recalculated. This is a known partial-update edge case.

## 8. Deposit Usage (`GET /api/Payments/deposit-usage`)

Returns payments that represent withdrawals from the deposit wallet:
- `deposit_type = 'usage'`
- `method = 'deposit'`
- `deposit_used > 0`

## 9. Legacy Fallback

If `GET /api/Payments?customerId=...` returns zero rows and no `type` filter is applied, the backend queries `accountpayments` (legacy table) and returns transformed rows with `method = 'cash'` and empty allocations.

> **Impact:** Any new client code that assumes `allocations` always exist will break when legacy rows are returned.

## 10. Mixed Payment Breakdown

The backend stores mixed payments as a single `payments` row with:
- `method = 'mixed'`
- `cash_amount`, `bank_amount`, `deposit_used` columns
- Total `amount` must equal `cash_amount + bank_amount + deposit_used` (enforced loosely by frontend, not strictly by DB).

## 11. Known Edge Cases / Risks

| Scenario | Behavior |
|----------|----------|
| Over-allocation | Blocked at Step C (validation) |
| Allocation to non-existent invoice/dotkham | Returns 400 with "not found" or "exceeds balance" |
| Void then re-pay same invoice | Allowed; residual can exceed original invoice total |
| Patch amount on allocated payment | Allocations and residuals stay stale |
| Refund amount > deposit balance | Not checked against customer balance; just creates negative payment |
| Legacy fallback active | `allocations` array is empty; `id` comes from `accountpayments` |
