# Fix Payment/Deposit Integrity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix payment/deposit classification so that invoice payments and deposit top-ups are properly separated in both backend logic and frontend display.

**Architecture:** Backend fixes in 2 API route files (payments.js, customerBalance.js). Frontend fixes in API layer (api.ts), hooks (useCustomerPayments.ts), and the CustomerProfile payment tab. All changes are backward-compatible.

**Tech Stack:** Express.js (backend), React + TypeScript (frontend), PostgreSQL

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `api/src/routes/payments.js` | Modify | Fix `looksLikeDeposit` classification + add `type` filter to GET `/` |
| `api/src/routes/customerBalance.js` | Verify | Already correct on disk; add schema-qualified table names |
| `website/src/lib/api.ts` | Modify | Add `type` param to `fetchPayments`, pass through to API |
| `website/src/hooks/useCustomerPayments.ts` | Modify | Pass `type=payments` to filter out deposits |
| `website/package.json` | Modify | Bump patch version |

---

### Task 1: Fix Payment Classification in POST /api/Payments

**Files:**
- Modify: `api/src/routes/payments.js` (POST `/` handler, ~lines 211-225)

**Context:** The `looksLikeDeposit` auto-detection currently triggers when `allocations` are provided but `service_id` is null and `deposit_used` is 0. Since PaymentForm uses allocations (not service_id) to link payments to invoices, all invoice payments get misclassified as deposits.

- [ ] **Step 1: Locate the looksLikeDeposit logic**

In `api/src/routes/payments.js`, find the POST handler's `looksLikeDeposit` block (currently around lines 218-225):

```js
// Auto-detect deposit top-up if not explicitly typed
const looksLikeDeposit =
  !deposit_type &&
  method !== "deposit" &&
  method !== "mixed" &&
  !service_id &&
  !(deposit_used > 0) &&
  parseFloat(amount) > 0;

if (looksLikeDeposit) {
  deposit_type = "deposit";
}
```

- [ ] **Step 2: Replace with improved classification logic**

Replace the above block with:

```js
// Classify payment type:
// - If allocations are provided → invoice payment (not a deposit)
// - If method is 'deposit' or 'mixed' → invoice payment using wallet
// - If deposit_type already set → respect explicit type
// - Otherwise, if no service_id, no deposit_used, simple cash/bank → deposit top-up
const hasAllocations = Array.isArray(allocations) && allocations.some(
  a => (a.invoice_id || a.dotkham_id) && parseFloat(a.allocated_amount) > 0
);
const isInvoicePayment = hasAllocations || method === "deposit" || method === "mixed" || service_id || parseFloat(deposit_used || 0) > 0;

if (!deposit_type) {
  if (isInvoicePayment) {
    deposit_type = null; // Explicitly NOT a deposit
  } else if (parseFloat(amount) > 0) {
    deposit_type = "deposit";
  }
}
```

- [ ] **Step 3: Verify change is correct**

Run: `grep -A 15 "Classify payment type" api/src/routes/payments.js`
Expected: Shows the new classification logic.

- [ ] **Step 4: Commit**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup
git add api/src/routes/payments.js
git commit -m "fix(api): correct payment classification — don't misclassify invoice payments as deposits"
```

---

### Task 2: Add `type` Filter to GET /api/Payments

**Files:**
- Modify: `api/src/routes/payments.js` (GET `/` handler, ~lines 33-100)

**Context:** Currently GET `/api/Payments?customerId=X` returns ALL payment rows including deposit top-ups. The frontend Payment History tab needs only invoice payments. We add a `type` query param to filter.

- [ ] **Step 1: Add type query param extraction**

In the GET `/` handler, after the existing `const { customerId, limit, offset } = req.query;` line (~line 35), add `type` to the destructuring:

```js
const { customerId, limit = 100, offset = 0, type } = req.query;
```

- [ ] **Step 2: Add SQL filter for type**

After the existing `if (customerId)` block that adds `AND p.customer_id = $N`, add:

```js
if (type === 'payments') {
  // Only invoice payments: has allocations, uses deposit, or mixed method
  // Exclude pure deposit top-ups and refunds
  sql += ` AND (
    p.deposit_type IS NULL
    OR p.deposit_type = 'usage'
    OR p.method = 'deposit'
    OR p.method = 'mixed'
    OR p.deposit_used > 0
    OR p.service_id IS NOT NULL
  )`;
  sql += ` AND p.deposit_type NOT IN ('deposit', 'refund')`;
} else if (type === 'deposits') {
  sql += ` AND (p.deposit_type IN ('deposit', 'refund') OR (
    p.deposit_type IS NULL AND p.method IN ('cash', 'bank_transfer')
    AND p.service_id IS NULL AND (p.deposit_used IS NULL OR p.deposit_used = 0)
  ))`;
}
```

- [ ] **Step 3: Verify the full GET handler reads correctly**

Run: `grep -n "type" api/src/routes/payments.js | head -20`
Expected: Shows `type` in the destructuring and the filter logic.

- [ ] **Step 4: Commit**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup
git add api/src/routes/payments.js
git commit -m "feat(api): add type filter to GET /Payments — separate payments from deposits"
```

---

### Task 3: Add `type` Parameter to Frontend API Layer

**Files:**
- Modify: `website/src/lib/api.ts` (~line 676)

**Context:** The `fetchPayments` function currently takes only `customerId`. We need to pass an optional `type` parameter.

- [ ] **Step 1: Update fetchPayments signature and URL**

Find the `fetchPayments` function (~line 676):

```typescript
export async function fetchPayments(customerId?: string): Promise<{ items: ApiPayment[]; totalItems: number }> {
  const url = customerId ? `/Payments?customerId=${customerId}` : '/Payments';
  return apiFetch<{ items: ApiPayment[]; totalItems: number }>(url);
}
```

Replace with:

```typescript
export async function fetchPayments(customerId?: string, type?: 'payments' | 'deposits'): Promise<{ items: ApiPayment[]; totalItems: number }> {
  const params = new URLSearchParams();
  if (customerId) params.set('customerId', customerId);
  if (type) params.set('type', type);
  const url = params.toString() ? `/Payments?${params.toString()}` : '/Payments';
  return apiFetch<{ items: ApiPayment[]; totalItems: number }>(url);
}
```

- [ ] **Step 2: Verify no compilation errors**

Run: `cd website && npx tsc --noEmit --pretty 2>&1 | grep -i "fetchPayments" | head -5`
Expected: No errors related to fetchPayments (there may be other unrelated errors).

- [ ] **Step 3: Commit**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup
git add website/src/lib/api.ts
git commit -m "feat(frontend): add type param to fetchPayments API"
```

---

### Task 4: Update useCustomerPayments to Filter Out Deposits

**Files:**
- Modify: `website/src/hooks/useCustomerPayments.ts` (~line 28)

**Context:** This hook fetches payments for the customer profile Payment tab. It should only fetch invoice payments, not deposit top-ups.

- [ ] **Step 1: Update the load callback**

Find the `load` callback in `useCustomerPayments.ts` (~line 28):

```typescript
const load = useCallback(async () => {
    if (!customerId) {
      setPayments([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchPayments(customerId);
      setPayments(res.items as PaymentWithAllocations[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);
```

Replace with:

```typescript
const load = useCallback(async () => {
    if (!customerId) {
      setPayments([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchPayments(customerId, 'payments');
      setPayments(res.items as PaymentWithAllocations[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);
```

The only change: `fetchPayments(customerId)` → `fetchPayments(customerId, 'payments')`.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd website && npx tsc --noEmit --pretty 2>&1 | grep "useCustomerPayments" | head -5`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup
git add website/src/hooks/useCustomerPayments.ts
git commit -m "fix(frontend): filter deposit top-ups out of customer payment history"
```

---

### Task 5: Verify customerBalance Query Is Correct

**Files:**
- Verify: `api/src/routes/customerBalance.js`

**Context:** The outstanding balance query was suspected to have `partner_id` vs `partnerid` bug, but the file on disk already uses `partnerid` correctly. We verify and add schema qualification.

- [ ] **Step 1: Verify the current query is correct**

Run: `grep -n "partnerid\|partner_id" api/src/routes/customerBalance.js`
Expected: Only `partnerid` appears (no `partner_id`).

- [ ] **Step 2: Add dbo schema qualification to saleorders and dotkhams queries**

Find the outstanding balance query (~lines 42-47):

```js
const residualResult = await query(`
  SELECT COALESCE(SUM(residual), 0) AS total FROM saleorders WHERE partnerid = $1 AND state != 'cancelled'
  UNION ALL
  SELECT COALESCE(SUM(amountresidual), 0) FROM dotkhams WHERE partnerid = $1 AND state != 'cancelled'
`, [id]);
```

Replace with:

```js
const residualResult = await query(`
  SELECT COALESCE(SUM(residual), 0) AS total FROM dbo.saleorders WHERE partnerid = $1 AND state != 'cancelled'
  UNION ALL
  SELECT COALESCE(SUM(amountresidual), 0) FROM dbo.dotkhams WHERE partnerid = $1 AND state != 'cancelled'
`, [id]);
```

Also qualify the payments table in the deposit query (~line 20):

Find: `FROM payments`
Replace with: `FROM dbo.payments`

(There's only one occurrence in that file.)

- [ ] **Step 3: Commit**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup
git add api/src/routes/customerBalance.js
git commit -m "fix(api): add schema qualification to customerBalance queries for reliability"
```

---

### Task 6: Schema-Qualify Tables in payments.js

**Files:**
- Modify: `api/src/routes/payments.js`

**Context:** All SQL queries in payments.js reference tables without schema prefix. Some tables exist in both `dbo` and `public` schemas. Qualify all references.

- [ ] **Step 1: Replace unqualified table names**

Run the following replacements in `api/src/routes/payments.js`:

| Find | Replace |
|------|---------|
| `FROM payments p` | `FROM dbo.payments p` |
| `FROM payments WHERE` | `FROM dbo.payments WHERE` |
| `INTO payments (` | `INTO dbo.payments (` |
| `UPDATE payments SET` | `UPDATE dbo.payments SET` |
| `DELETE FROM payments WHERE` | `DELETE FROM dbo.payments WHERE` |
| `FROM payment_allocations pa` | `FROM dbo.payment_allocations pa` |
| `INTO payment_allocations` | `INTO dbo.payment_allocations` |
| `DELETE FROM payment_allocations` | `DELETE FROM dbo.payment_allocations` |
| `UPDATE saleorders SET` | `UPDATE dbo.saleorders SET` |
| `FROM saleorders WHERE` | `FROM dbo.saleorders WHERE` |
| `FROM saleorders so` | `FROM dbo.saleorders so` |
| `UPDATE dotkhams SET` | `UPDATE dbo.dotkhams SET` |
| `FROM dotkhams dk` | `FROM dbo.dotkhams dk` |
| `FROM receipt_sequences` | `FROM dbo.receipt_sequences` |
| `INTO receipt_sequences` | `INTO dbo.receipt_sequences` |
| `FROM payment_proofs` | `FROM dbo.payment_proofs` |
| `INTO payment_proofs` | `INTO dbo.payment_proofs` |

Use sed or manual edits. For safety, do NOT change strings in comments.

- [ ] **Step 2: Verify no unqualified table references remain**

Run: `grep -n "FROM payments\|INTO payments\|UPDATE payments\|DELETE FROM payments\|FROM payment_allocations\|INTO payment_allocations\|DELETE FROM payment_allocations\|FROM saleorders\|UPDATE saleorders\|FROM dotkhams\|UPDATE dotkhams\|FROM receipt_sequences\|INTO receipt_sequences\|FROM payment_proofs\|INTO payment_proofs" api/src/routes/payments.js | grep -v "dbo\." | grep -v "//" | head -20`
Expected: Empty output (all qualified).

- [ ] **Step 3: Commit**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup
git add api/src/routes/payments.js
git commit -m "fix(api): schema-qualify all table references in payments.js"
```

---

### Task 7: Restart API and Verify End-to-End

**Files:**
- None (verification only)

**Context:** Restart the local API server and verify the fixes work for Phạm Ngọc Huy.

- [ ] **Step 1: Restart the API server**

```bash
# Find and kill the running API process
kill $(lsof -ti:3002) 2>/dev/null
# Start it again
cd /Users/thuanle/Documents/TamTMV/Tgroup/api && node src/server.js &
```

- [ ] **Step 2: Get auth token and test customer balance**

```bash
# Login
TOKEN=$(curl -s http://localhost:3002/api/Auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tg@clinic.vn","password":"123456"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")
echo "Token: ${TOKEN:0:20}..."

# Test balance for Phạm Ngọc Huy
curl -s "http://localhost:3002/api/CustomerBalance/b2262736-c7f4-4072-a67f-b3d00095dcf1" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected: `outstanding_balance` should be `7000000` (or `3500000` depending on which orders exist), NOT `0`.

- [ ] **Step 3: Test payment type filtering**

```bash
# Get all payments for the customer
curl -s "http://localhost:3002/api/Payments?customerId=b2262736-c7f4-4072-a67f-b3d00095dcf1" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'All: {d[\"totalItems\"]} items')"

# Get only invoice payments (type=payments)
curl -s "http://localhost:3002/api/Payments?customerId=b2262736-c7f4-4072-a67f-b3d00095dcf1&type=payments" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Payments only: {d[\"totalItems\"]} items')"
```

Expected: "All" returns ~21 items. "Payments only" returns 0 (since all 21 are deposit top-ups).

- [ ] **Step 4: Test creating an invoice payment and verify classification**

```bash
# Create a test payment WITH allocations (should be classified as payment, NOT deposit)
curl -s "http://localhost:3002/api/Payments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "b2262736-c7f4-4072-a67f-b3d00095dcf1",
    "amount": 500000,
    "method": "cash",
    "allocations": [{"invoice_id": "80e8de88-12d6-440c-a965-47cfcb4d1633", "allocated_amount": 500000}]
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'deposit_type: {d.get(\"depositType\")}, amount: {d.get(\"amount\")}')"
```

Expected: `deposit_type: null` (NOT "deposit"), meaning it's classified as a regular payment.

- [ ] **Step 5: Verify the payment now appears in type=payments**

```bash
curl -s "http://localhost:3002/api/Payments?customerId=b2262736-c7f4-4072-a67f-b3d00095dcf1&type=payments" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Payments: {d[\"totalItems\"]} items'); [print(f'  {p[\"id\"][:8]} amt={p[\"amount\"]} type={p.get(\"depositType\")}') for p in d['items'][:3]]"
```

Expected: 1 item, the payment just created.

- [ ] **Step 6: Verify saleorder residual was reduced**

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 55433 -U postgres -d tdental_demo -c \
  "SELECT id, name, residual FROM dbo.saleorders WHERE id = '80e8de88-12d6-440c-a965-47cfcb4d1633';"
```

Expected: `residual = 3000000` (was 3500000, reduced by 500000).

- [ ] **Step 7: Clean up test data**

```bash
# Delete the test payment
TEST_PAYMENT_ID=$(curl -s "http://localhost:3002/api/Payments?customerId=b2262736-c7f4-4072-a67f-b3d00095dcf1&type=payments" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['items'][0]['id'] if d['items'] else '')")
if [ -n "$TEST_PAYMENT_ID" ]; then
  curl -s "http://localhost:3002/api/Payments/$TEST_PAYMENT_ID" \
    -H "Authorization: Bearer $TOKEN" -X DELETE | python3 -m json.tool
fi
```

Expected: `{"success": true}` and the saleorder residual should be back to 3500000.

---

### Task 8: Bump Version

**Files:**
- Modify: `website/package.json`

- [ ] **Step 1: Bump patch version**

Read current version from `website/package.json`, increment patch by 1.

- [ ] **Step 2: Commit**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup
git add website/package.json
git commit -m "chore: bump version for payment/deposit integrity fix"
```

---

### Task 9: Final Integration Test

**Files:**
- None (manual verification)

- [ ] **Step 1: Start the frontend dev server**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup/website && npm run dev
```

- [ ] **Step 2: Manual verification checklist for Phạm Ngọc Huy**

1. Navigate to Customers → search "Huy" → click "Phạm Ngọc Huy"
2. **Profile header**: Verify "Outstanding" shows a non-zero amount (should be ~$7M for 2 Abutment orders)
3. **Click "Records" tab**: Each Abutment should show orange "Pay" button with correct owed amount
4. **Click "Payment" tab**: 
   - "Còn nợ" (Owed) card should show ~$7M
   - "Đã thanh toán" (Paid) card should show ~$0 (no invoice payments made yet)
   - Payment History list should be EMPTY (no deposit top-ups showing here)
   - CustomerDeposits section below should show the 21 deposit rows
5. **Click orange "Pay" on a record**: Payment form opens with correct residual amount
6. **Make a test payment**: Create a small cash payment allocated to one invoice
7. **Verify**: Payment appears in Payment History with allocation info
8. **Verify**: Invoice residual decreased
9. **Void the test payment**: Residual should restore

- [ ] **Step 3: Commit final state if any adjustments were needed**

```bash
cd /Users/thuanle/Documents/TamTMV/Tgroup
git add -A
git commit -m "fix: payment/deposit integrity — final adjustments"
```
