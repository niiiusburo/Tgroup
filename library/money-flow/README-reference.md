# Money Flow Reference Library

> Domain: payments, allocations, deposits, receipts, refunds, double-entry ledger
> Target: TGClinic `api/src/routes/payments.js`, `api/migrations/003_payment_allocations.sql`, `015_deposit_receipts.sql`, `014_payment_per_record.sql`

---

## Downloaded Repositories

### 1. `rafi-payment-processing` — Payment Processing System Backend (Python/FastAPI)
- **URL:** https://github.com/Ir-Rafi/Payment-Processing-System-Backend
- **License:** MIT
- **Why chosen:** Demonstrates idempotent payment posting with `idempotency_key`, double-entry ledger via `ledger_entries` table, money holds (escrow), refund processing via PostgreSQL stored procedures (`process_payment`, `process_refund`, `capture_money_hold`), and JWT-protected endpoints. The `/api/v1/transfer` endpoint shows raw SQL double-entry within a transaction block.
- **Key files to study:**
  - `main.py` — FastAPI routes, idempotency key handling, transfer double-entry logic
  - `README.md` — Architecture diagram, API overview, idempotency explanation

### 2. `medici` — Double-Entry Accounting for Node.js + Mongoose
- **URL:** https://github.com/flash-oss/medici
- **License:** MIT  
- **Version:** 7.3.0
- **Why chosen:** The canonical Node.js double-entry ledger library. Uses `Book` → `Entry` → `Journal` → `Transaction` hierarchy. Enforces debit=credit per journal. Supports voiding (reversal entries), balance caching, MongoDB ACID transactions with writelock. Clean API: `book.entry("memo").debit("Assets:Cash", 100).credit("Income", 100).commit()`.
- **Key files to study:**
  - `src/Book.ts` — `balance()`, `ledger()`, `void()`, `writelockAccounts()`
  - `src/Entry.ts` — `debit()`, `credit()`, `commit()` with transaction validation
  - `src/models/transaction.ts` — Schema: `credit`, `debit`, `account_path`, `book`, `memo`, `_journal`
  - `src/models/journal.ts` — Schema: `datetime`, `memo`, `_transactions`, `voided`, `void_reason`
  - `README.md` — Usage patterns, ACID writelock example, fast balance caching

### 3. `blnk` — Open-Source Financial Ledger (Go)
- **URL:** https://github.com/blnkfinance/blnk
- **License:** Apache 2.0
- **Why chosen:** Production-grade double-entry ledger with balance monitoring, snapshots, inflight transactions, scheduling, overdrafts, bulk transactions, reconciliation engine, and refund support. Uses `big.Int` for precision. The `Distribution` model supports percentage/fixed/"left" splits — directly relevant to payment allocation.
- **Key files to study:**
  - `model/transaction.go` — `Distribution`, `CalculateDistributionsPrecise()`, `SplitTransactionPrecise()`
  - `model/balance.go` — `Balance` struct with `Balance`, `CreditBalance`, `DebitBalance`, `InflightBalance`, `Version`
  - `transaction_execution.go` — `RecordTransaction()`, `executeWithLock()`, `validateTxn()`
  - `transaction_refunds.go` — `RefundTransaction()`, `RefundWorker()`, `validateTransactionForRefund()`
  - `README.md` — Core capabilities, wallet/deposit/escrow tutorials

### 4. `formance-ledger` — Programmable Open Source Ledger (Go)
- **URL:** https://github.com/formancehq/ledger
- **License:** MIT
- **Why chosen:** Formance is the reference implementation for idempotent ledger posting. Uses `Idempotency-Key` header + `IdempotencyHash` to detect duplicate requests with different payloads. Append-only logs, `Volumes` (input/output tracking), `PostCommitVolumes`, transaction reversal. The database schema shows `logs.idempotency_key` (varchar unique) and `logs.idempotency_hash` (bytea unique).
- **Key files to study:**
  - `internal/README.md` — `Log` struct with `IdempotencyKey`, `IdempotencyHash`, `Hash` fields
  - `internal/transaction.go` — `Transaction` struct, `Reverse()`, `WithPostCommitVolumes()`
  - `internal/volumes.go` — `Volumes` (input/output), `Balance()`, `PostCommitVolumes`
  - `internal/storage/ledger/transactions.go` — `CommitTransaction()`, `InsertTransaction()`
  - `docs/api/README.md` — Idempotency-Key header usage, 204 Idempotency-Hit response

### 5. `odoo-payment-allocation` — Odoo Account Payment Register (Python)
- **URL:** https://github.com/odoo/odoo (addons/account/wizard/account_payment_register.py)
- **License:** LGPL v3 + proprietary for enterprise addons
- **Why chosen:** The canonical ERP payment allocation engine. `AccountPaymentRegister` wizard handles one payment across multiple invoices, batch grouping, early payment discounts, write-offs, currency conversion, and reconciliation. `_create_payments()` → `_init_payments()` → `_post_payments()` → `_reconcile_payments()` pipeline.
- **Key files to study:**
  - `addons/account/wizard/account_payment_register.py` — `_create_payments()`, `_create_payment_vals_from_batch()`, `_reconcile_payments()`
  - `addons/account_payment/models/account_payment.py` — `amount_available_for_refund`, `_compute_refunds_count`, `action_refund_wizard`

### 6. `invoice-ninja` — Invoice Ninja Payment Model (PHP/Laravel)
- **URL:** https://github.com/invoiceninja/invoiceninja
- **License:** Elastic License
- **Why chosen:** Demonstrates receipt/payment numbering with pattern + counter (`payment_number_pattern`, `payment_number_counter`), payment status lifecycle (`STATUS_PENDING` through `STATUS_REFUNDED`), `idempotency_key` field, and `Refundable` trait. The `ApplyNumber` service shows retry-with-increment pattern for collision avoidance.
- **Key files to study:**
  - `app/Models/Payment.php` — Payment statuses, `idempotency_key`, `Refundable` trait, `paymentables` relation
  - `app/Services/Payment/ApplyNumber.php` — `trySaving()` with retry loop for number collision
  - `app/Services/Payment/RefundPayment.php` — Refund logic
  - `app/DataMapper/CompanySettings.php` — `payment_number_pattern`, `payment_number_counter`

---

## Key Patterns to Adopt for TGClinic

### 1. Payment Allocation Engine (one payment → multiple invoices)
**Current TGClinic:** `payment_allocations` table links `payment_id` → `invoice_id`/`dotkham_id` with `allocated_amount`. The `payments` table also has `record_id`/`record_type` for single-record payments (migration 014).

**Reference pattern (Odoo):**
- Use a **batch grouping** step: group invoices by partner, currency, and payment type before creating allocations.
- Compute `amount_residual` per line, apply early-payment discounts, handle currency conversion.
- Reconcile in a separate step after posting: `(payment_lines + invoice_lines).reconcile()`.
- **Adopt:** Consider a `payment_allocation_batches` concept when TGClinic needs to handle one deposit covering multiple invoices for the same customer.

**Reference pattern (Blnk Distribution):**
- Blnk's `Distribution` supports `fixed`, `percentage`, and `left` (remainder) allocation types.
- `CalculateDistributionsPrecise()` uses `big.Int` to avoid floating-point errors.
- **Adopt:** If TGClinic ever needs percentage-based allocations (e.g., split payment 50/50 across two invoices), port the `Distribution` model.

### 2. Deposit / Credit / Wallet with Refund Support
**Current TGClinic:** `deposit_type` column (`deposit`, `refund`, `usage`) on `payments`. Refunds create negative-amount payments. `reverseOnRefund()` reverses commission earnings.

**Reference pattern (Rafi):**
- Stored procedures (`process_refund`) encapsulate refund logic atomically.
- `money_holds` table for pre-authorization with `status` and `expires_at`.
- **Adopt:** Consider a `payment_holds` table for pre-authorization of deposits before service confirmation.

**Reference pattern (Invoice Ninja):**
- `amount_available_for_refund` computed field tracks refundable balance.
- `refunds_count` tracks refund history.
- `refund_meta` stores refund metadata.
- **Adopt:** Add `amount_refunded` and `amount_available_for_refund` computed columns to TGClinic `payments` for clearer refund tracking.

**Reference pattern (Blnk):**
- `RefundTransaction()` creates a new transaction reversing the original, with `skipQueue` support for synchronous refunds.
- `validateTransactionForRefund()` checks eligibility before processing.
- **Adopt:** Add refund eligibility validation before creating negative payments.

### 3. Receipt Numbering / Sequence Generation
**Current TGClinic:** `generateReceiptNumber()` uses `receipt_sequences` table with `ON CONFLICT (prefix, year) DO UPDATE SET last_number = last_number + 1`. Format: `TUKH/YYYY/NNNNN`.

**Reference pattern (Invoice Ninja):**
- Pattern + counter: `payment_number_pattern = "{$year}-{$counter}"`, `payment_number_counter = 1`.
- Retry loop on collision: `trySaving()` attempts up to 50 times with incremented counter.
- **Adopt:** The current TGClinic `ON CONFLICT` approach is actually **superior** to Invoice Ninja's retry loop because it uses PostgreSQL atomic increment. Keep it. However, consider adding `pattern` support for different receipt types (e.g., `TUKH` for dental, `TUNA` for cosmetic).

**Reference pattern (Formance):**
- `reference` field on transactions is unique per ledger: `bun:"reference,type:varchar,unique,nullzero"`.
- **Adopt:** Add a `UNIQUE` constraint on `receipt_number` in TGClinic to prevent duplicates at the database level.

### 4. Idempotent Payment Posting
**Current TGClinic:** No explicit idempotency key handling in payment routes.

**Reference pattern (Rafi):**
- `idempotency_key` in `PaymentRequest` schema. Stored procedure checks `transactions.idempotency_key` before processing.
- **Adopt:** Add `idempotency_key` column to `payments` table with `UNIQUE` constraint. Accept it in the create payment API and return existing payment if key already exists.

**Reference pattern (Formance):**
- Two-layer idempotency: `IdempotencyKey` (varchar 256, unique) + `IdempotencyHash` (bytea, unique).
- Hash ensures the same key with different inputs is rejected.
- Returns `204 Idempotency-Hit` if duplicate.
- **Adopt:** For TGClinic, start with single-layer (`idempotency_key` unique). Add hash layer if API consumers might accidentally reuse keys with different payloads.

### 5. Double-Entry Ledger Patterns
**Current TGClinic:** No formal double-entry ledger. Payments update `saleorders.residual` and `dotkhams.amountresidual` directly.

**Reference pattern (Medici):**
- `Book` → `Entry` → `Journal` → `Transaction`.
- Every journal has balanced debits and credits.
- Voiding creates offsetting entries rather than deleting.
- **Adopt:** If TGClinic needs audit-grade financial tracking, add a `ledger_entries` table (debit/credit per account) alongside the existing payment tables. Start with a simple chart: `Assets:Cash`, `Assets:Bank`, `Revenue`, `AccountsReceivable`.

**Reference pattern (Blnk):**
- `Balance` model tracks `balance`, `credit_balance`, `debit_balance`, `inflight_balance`, `version`.
- `RecordTransaction()` applies to balances under distributed lock with deterministic ordering to prevent deadlocks.
- **Adopt:** If TGClinic adds customer wallet balances, use the Blnk `Balance` model pattern with `big.Int` (or `NUMERIC` in PostgreSQL) and version for optimistic locking.

**Reference pattern (Formance):**
- `Volumes` tracks `input` and `output` per account per asset. Balance = input - output.
- Append-only: never update entries; reversals are new postings.
- **Adopt:** For TGClinic's commission/earnings tables (which PostgresRef is studying), consider append-only earnings rows rather than updating balances in place.

---

## Specific Files/Functions to Study

| Repo | File | Function/Class | What to Learn |
|------|------|------------------|---------------|
| Rafi | `main.py` | `transfer_funds()` | Raw SQL double-entry within `async with conn.transaction()` |
| Rafi | `main.py` | `create_payment()` | `idempotency_key` passed to `process_payment()` stored procedure |
| Medici | `src/Book.ts` | `balance()` | Cached balance with snapshot invalidation |
| Medici | `src/Entry.ts` | `commit()` | Debit/credit validation before journal creation |
| Medici | `src/Book.ts` | `void()` | Creates offsetting entries instead of deleting |
| Blnk | `model/transaction.go` | `CalculateDistributionsPrecise()` | `big.Int` percentage/fixed/left splits |
| Blnk | `transaction_execution.go` | `RecordTransaction()` | Lock-acquire → validate → apply → persist pipeline |
| Blnk | `transaction_refunds.go` | `RefundTransaction()` | Refund eligibility + reversal transaction creation |
| Formance | `internal/README.md` | `Log` struct | `IdempotencyKey` + `IdempotencyHash` fields |
| Formance | `internal/volumes.go` | `Volumes.Balance()` | `input - output` balance calculation |
| Odoo | `account_payment_register.py` | `_create_payments()` | Batch → init → post → reconcile pipeline |
| Odoo | `account_payment_register.py` | `_reconcile_payments()` | Cross-account reconciliation logic |
| Invoice Ninja | `ApplyNumber.php` | `trySaving()` | Retry loop with collision detection |
| Invoice Ninja | `Payment.php` | `amount_available_for_refund` | Computed refundable balance |

---

## Notes on Duplication / Bottleneck Fixes TGClinic Should Consider

### 1. Receipt Number Race Condition
**Current:** `generateReceiptNumber()` uses `ON CONFLICT DO UPDATE` which is atomic, but there is no `UNIQUE` constraint on `payments.receipt_number`. Two payments created in the same millisecond could theoretically get the same number if the insert happens after the sequence read.
**Fix:** Add `UNIQUE` constraint on `payments.receipt_number` and handle `UniqueViolationError` in the route.

### 2. Allocation Residual Update Race Condition
**Current:** `UPDATE saleorders SET residual = GREATEST(0, residual - $1)` runs after allocation insert. If two payments allocate to the same invoice concurrently, both read the same `residual` before either updates it.
**Fix:** Use `SELECT ... FOR UPDATE` on the invoice row before calculating allocation, or move residual calculation to a trigger/function that runs atomically.

### 3. No Idempotency on Payment Creation
**Current:** No `idempotency_key` on `payments`. A network retry could create duplicate payments.
**Fix:** Add `idempotency_key VARCHAR(255) UNIQUE` to `payments`. Accept it in `PaymentCreateSchema`. Check existence before insert.

### 4. Refund Tracking is Implicit
**Current:** Refunds are negative-amount payments with `deposit_type = 'refund'`. No link to the original payment, no tracking of how much has been refunded.
**Fix:** Add `original_payment_id` UUID reference and `amount_refunded` computed column. Consider a `refund_allocations` table if partial refunds against specific allocations are needed.

### 5. Deposit vs Payment Ambiguity
**Current:** `payment_category` is computed at creation time based on heuristics (`looksLikeDeposit`). This is fragile.
**Fix:** Make `payment_category` explicitly required in the API, or derive it from the presence of allocations rather than guessing.

### 6. No Ledger for Financial Audit
**Current:** Payments directly update invoice residuals. There is no immutable record of every debit/credit movement.
**Fix:** If audit requirements grow, add a `ledger_entries` table (pattern: Rafi/Medici) with `account`, `entry_type` (debit/credit), `amount`, `balance_after`, `transaction_id`.

---

## Code Snippet Comparison

### Current TGClinic Pattern: Receipt Number Generation
```javascript
// api/src/routes/payments/helpers.js
async function generateReceiptNumber(prefix = "TUKH", queryable = legacyQuery) {
  const year = getVietnamYear();
  const result = await rowsFrom(
    queryable,
    `INSERT INTO receipt_sequences (prefix, year, last_number)
     VALUES ($1, $2, 1)
     ON CONFLICT (prefix, year)
     DO UPDATE SET last_number = receipt_sequences.last_number + 1
     RETURNING last_number`,
    [prefix, year]
  );
  const num = result[0].last_number;
  return `${prefix}/${year}/${String(num).padStart(5, "0")}`;
}
```
**Strengths:** PostgreSQL atomic increment via `ON CONFLICT`. Clean, no retry loop needed.
**Weaknesses:** No `UNIQUE` constraint on `payments.receipt_number` to catch edge cases.

### Reference Pattern: Invoice Ninja (PHP)
```php
// App/Services/Payment/ApplyNumber.php
private function trySaving() {
    $x = 1;
    do {
        try {
            $this->payment->number = $this->getNextPaymentNumber($this->payment->client, $this->payment);
            $this->payment->saveQuietly();
            $this->completed = false;
        } catch (QueryException $e) {
            $x++;
            if ($x > 50) { $this->completed = false; }
        }
    } while ($this->completed);
}
```
**Strengths:** Retry loop handles collisions gracefully.
**Weaknesses:** Retry loop is wasteful; PostgreSQL `ON CONFLICT` is superior for single-row increments.

### Reference Pattern: Formance (Go)
```go
// internal/README.md
IdempotencyKey string `json:"idempotencyKey" bun:"idempotency_key,type:varchar(256),unique,nullzero"`
IdempotencyHash string `json:"idempotencyHash" bun:"idempotency_hash,unique,nullzero"`
```
**Adopt for TGClinic:** Add `UNIQUE` constraint on `payments.receipt_number` and consider `idempotency_key` with `UNIQUE` for payment creation.

---

## Summary

| Concern | Best Reference | Action for TGClinic |
|---------|---------------|---------------------|
| Payment allocation | Odoo `account_payment_register.py` | Study batch grouping + reconciliation pipeline |
| Deposit/credit/wallet | Blnk `model/balance.go` | Study `Balance` struct for future wallet feature |
| Refund support | Blnk `transaction_refunds.go` + Invoice Ninja `Payment.php` | Add `amount_refunded`, `original_payment_id` |
| Receipt numbering | TGClinic current (already good) | Add `UNIQUE` constraint on `receipt_number` |
| Idempotent posting | Formance `internal/README.md` | Add `idempotency_key` to `payments` |
| Double-entry ledger | Medici `src/Book.ts` + Rafi `main.py` | Add `ledger_entries` table if audit needs grow |
| Precision | Blnk `CalculateDistributionsPrecise()` | Use `NUMERIC`/`big.Int`, never float for money |
