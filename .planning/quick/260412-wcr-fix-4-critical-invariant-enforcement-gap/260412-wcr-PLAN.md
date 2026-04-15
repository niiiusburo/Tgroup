---
phase: 260412-wcr-fix-4-critical-invariant-enforcement-gap
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - api/src/routes/payments.js
  - api/src/routes/saleOrders.js
  - api/src/routes/services.js
  - api/src/routes/monthlyPlans.js
  - api/migrations/015_monthlyplan_constraints.sql
autonomous: true
requirements:
  - INV-payment.amount.not-exceeding-residual
  - INV-service.totalCost.non-negative
  - INV-monthlyPlan.amount.downPayment-less-than-total
  - INV-monthlyPlan.installmentSum.equals-remaining
  - INV-monthlyPlan.noDelete-if-paid-installments
must_haves:
  truths:
    - "POST/PUT /api/Payments rejects allocations whose amount exceeds the target record's residual (>0.01 tolerance) with HTTP 400"
    - "POST /api/SaleOrders rejects negative amounttotal with HTTP 400; POST /api/Services rejects negative computed total_amount / unit_price / quantity with HTTP 400"
    - "POST/PUT /api/MonthlyPlans rejects down_payment >= total_amount with HTTP 400"
    - "POST /api/MonthlyPlans rejects installment plans where |sum(installments.amount) - (total_amount - down_payment)| > 0.01 with HTTP 400"
    - "DELETE /api/MonthlyPlans/:id returns 409 Conflict when any installment has status='paid' (already implemented — verified in place)"
    - "DB CHECK chk_downpayment_lt_total enforces down_payment < total_amount at the monthlyplans table level (idempotent migration)"
    - "All three route files still parse (node -c) and the API server still boots"
  artifacts:
    - path: "api/src/routes/payments.js"
      provides: "Residual-guarded POST /Payments handler; per-allocation residual lookup before INSERT"
      contains: "exceeds outstanding balance"
    - path: "api/src/routes/saleOrders.js"
      provides: "Non-negative amounttotal / quantity guard in POST /SaleOrders"
      contains: "must be >= 0"
    - path: "api/src/routes/services.js"
      provides: "Non-negative unit_price / quantity / discount / total_amount guard in POST /Services"
      contains: "must be >= 0"
    - path: "api/src/routes/monthlyPlans.js"
      provides: "downPayment<total guard on POST+PUT, installment-sum guard on POST, confirmed DELETE 409 path"
      contains: "down_payment must be less than total_amount"
    - path: "api/migrations/015_monthlyplan_constraints.sql"
      provides: "Idempotent Postgres DO-block adding CHECK chk_downpayment_lt_total to dbo.monthlyplans"
      contains: "chk_downpayment_lt_total"
  key_links:
    - from: "api/src/routes/payments.js POST /"
      to: "saleorders.residual / dotkhams.amountresidual"
      via: "SELECT residual/amountresidual WHERE id = a.invoice_id / a.dotkham_id before INSERT"
      pattern: "residual|amountresidual"
    - from: "api/src/routes/monthlyPlans.js POST /"
      to: "req.body.installments[].amount"
      via: "|sum(installments.amount) - (total_amount - down_payment)| < 0.01"
      pattern: "installment.*sum|sum.*installment"
    - from: "api/migrations/015_monthlyplan_constraints.sql"
      to: "dbo.monthlyplans table"
      via: "ALTER TABLE ... ADD CONSTRAINT chk_downpayment_lt_total CHECK (down_payment < total_amount) inside DO block gated by pg_constraint lookup"
      pattern: "chk_downpayment_lt_total"
---

<objective>
Close 5 invariant enforcement gaps (4 critical + 1 high) with server-side guards plus
one idempotent DB CHECK constraint. Deliverables are 3 atomic commits — one per task —
following conventional commit format. UI is NOT touched; this is pure API/DB hardening.

Purpose: UI already enforces these rules but server is defenseless. Add defence-in-depth.
Output: 3 atomic commits on `ai-develop`, no push.
</objective>

<execution_context>
- Repo root: `/Users/thuanle/Documents/TamTMV/Tgroup`
- API source: `api/src/routes/*.js` (CommonJS, `pg` via `../db` with `query` + `pool`)
- DB: Postgres 16, `search_path=dbo`; see CLAUDE.md "Database" for connection URL
- Admin login for manual smoke test (do not use for automated verify): `tg@clinic.vn / 123456`
- DO NOT modify UI, DO NOT touch `website/src/hooks/usePayment.ts`, DO NOT push
- Each task ends with one atomic git commit with conventional message

Pre-flight (one-time, before Task 1):
- Capture baseline grep counts so "increases by at least 1" verify steps are unambiguous:
  `grep -c "residual\|outstanding\|balance" api/src/routes/payments.js` → record as BASELINE_PAY
  `grep -c "must be >= 0" api/src/routes/saleOrders.js` → record (should be 0)
  `grep -c "must be >= 0" api/src/routes/services.js` → record (should be 0)

Conventional commit template (use HEREDOC to preserve formatting):
  git commit -m "$(cat <<'EOF'
  <type>(<scope>): <subject>

  <body bullet list>

  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
  EOF
  )"
</execution_context>

<context>
Key facts discovered during planning (use these directly — no re-exploration needed):

1. payments.js:
   - POST /Payments is at line 232; allocations loop is lines 263-301.
   - Each allocation writes to `payment_allocations(payment_id, invoice_id, dotkham_id, allocated_amount)`.
   - Residual is stored on `saleorders.residual` (invoices) and `dotkhams.amountresidual` (dotkhams).
   - After insert, residuals are decremented with `GREATEST(0, residual - $1)` — meaning
     current code silently clamps rather than rejects. We must reject BEFORE insert.
   - There is no PUT /Payments handler, only POST and POST /:id/void. Guard only POST.

2. saleOrders.js:
   - POST at line 210 receives `amounttotal`, `quantity`. The row stores `amounttotal`,
     `residual = amounttotal`, `totalpaid = 0`. Add non-negative guard here.
   - `total_cost` on the invariant maps to `amounttotal` in this schema.
   - There is no PUT /SaleOrders handler; only PATCH /:id/state (no cost change). Guard only POST.

3. services.js:
   - POST at line 71 computes `total = (unit_price||0) * (quantity||1) - (discount||0)`.
   - `total_amount` is the invariant's `totalCost`. Validate `unit_price >= 0`, `quantity >= 0`,
     `discount >= 0`, and computed `total >= 0` (discount could exceed price → negative total).

4. monthlyPlans.js:
   - POST at line 172. Body has `total_amount`, `down_payment`, `number_of_installments`,
     and may also receive `installments` (planner: the current POST does NOT accept a body
     `installments` array — it computes them server-side from installment_amount). For the
     installment-sum invariant, either:
       (a) If client sends `installments` array, validate the sum.
       (b) Otherwise, validate the server-computed path: `installment_amount * number_of_installments`
           must equal `total_amount - down_payment` within 0.01 tolerance.
     Use option (b) since no client array is consumed today; this is the actual runtime check.
   - PUT at line 257 accepts `total_amount`, `down_payment` — guard both here too.
   - DELETE at line 345 **already** returns 409 on paid installments (status='paid'). Task 3
     only needs to verify it still works and strengthen the error message for consistency.

5. Migration format (see `013_add_employee_role_fields.sql`):
   - Plain SQL file, no transaction wrapper, idempotent via `IF NOT EXISTS`.
   - New file name: `015_monthlyplan_constraints.sql`. (014 and 015 already exist in repo:
     `014_payment_per_record.sql`, `015_deposit_receipts.sql`.)
     Planner: rename to `016_monthlyplan_constraints.sql` to avoid collision. Confirm with `ls`.
   - Postgres does NOT support `ADD CONSTRAINT IF NOT EXISTS`. Use a DO block that queries
     pg_constraint:

     ```sql
     DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_constraint WHERE conname = 'chk_downpayment_lt_total'
       ) THEN
         ALTER TABLE dbo.monthlyplans
           ADD CONSTRAINT chk_downpayment_lt_total
           CHECK (down_payment < total_amount);
       END IF;
     END$$;
     ```

6. Business invariants references (for commit body citations):
   - `payment.amount.not-exceeding-residual` (CRITICAL)
   - `service.totalCost.non-negative` (HIGH)
   - `monthlyPlan.amount.downPayment-less-than-total` (CRITICAL)
   - `monthlyPlan.installmentSum.equals-remaining` (CRITICAL)
   - `monthlyPlan.noDelete-if-paid-installments` (CRITICAL — already enforced; confirm)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Guard payment residual and service/saleorder cost at API layer</name>
  <files>
    - api/src/routes/payments.js
    - api/src/routes/saleOrders.js
    - api/src/routes/services.js
  </files>
  <action>
    Implement two server-side guards in a single atomic commit.

    (A) payments.js POST /Payments (line 232 handler), BEFORE the INSERT on line 246:
        - If `Array.isArray(allocations)` and `allocations.length > 0`, loop through each
          allocation BEFORE any INSERT and fetch its residual:
            if (a.invoice_id) {
              const r = await query(
                "SELECT residual FROM saleorders WHERE id = $1",
                [a.invoice_id]
              );
              if (r.length === 0) return res.status(400).json({ error: `Invoice ${a.invoice_id} not found` });
              const residual = parseFloat(r[0].residual || 0);
              if (parseFloat(a.allocated_amount) > residual + 0.01) {
                return res.status(400).json({ error: 'Payment amount exceeds outstanding balance' });
              }
            } else if (a.dotkham_id) {
              const r = await query(
                "SELECT amountresidual FROM dotkhams WHERE id = $1",
                [a.dotkham_id]
              );
              if (r.length === 0) return res.status(400).json({ error: `Dotkham ${a.dotkham_id} not found` });
              const residual = parseFloat(r[0].amountresidual || 0);
              if (parseFloat(a.allocated_amount) > residual + 0.01) {
                return res.status(400).json({ error: 'Payment amount exceeds outstanding balance' });
              }
            }
        - Also validate top-level `amount > 0` while we're here (cheap, prevents zero/negative payments).
          Adjust existing required-field check: `if (!customer_id || amount === undefined || amount === null || !method || parseFloat(amount) <= 0)`.
          Error message: "customer_id, positive amount, and method are required".
        - Do NOT modify the `GREATEST(0, residual - $1)` UPDATE; it's defensive and harmless
          now that we pre-validate.

    (B) saleOrders.js POST / (line 210 handler), BEFORE the INSERT on line 241:
        - Validate numeric fields:
            const amt = parseFloat(amounttotal || 0);
            const qty = parseFloat(quantity || 0);
            if (amt < 0) return res.status(400).json({ error: 'amounttotal must be >= 0' });
            if (quantity !== undefined && quantity !== null && qty < 0) {
              return res.status(400).json({ error: 'quantity must be >= 0' });
            }
        - Place the check directly after the existing `if (!partnerid)` check.

    (C) services.js POST / (line 71 handler), BEFORE the computed `total` on line 79:
        - Validate:
            const up = parseFloat(unit_price || 0);
            const qty = parseFloat(quantity || 1);
            const disc = parseFloat(discount || 0);
            if (up < 0) return res.status(400).json({ error: 'unit_price must be >= 0' });
            if (qty < 0) return res.status(400).json({ error: 'quantity must be >= 0' });
            if (disc < 0) return res.status(400).json({ error: 'discount must be >= 0' });
            const total = up * qty - disc;
            if (total < 0) return res.status(400).json({ error: 'total_amount must be >= 0 (discount exceeds unit_price * quantity)' });
        - Use `up`, `qty`, `disc`, `total` in the INSERT params (replaces the existing
          inline expression on line 79).

    Do NOT reformat or refactor unrelated code. Keep diffs minimal.

    Commit atomically:
      git add api/src/routes/payments.js api/src/routes/saleOrders.js api/src/routes/services.js
      git commit -m "$(cat <<'EOF'
      fix(api): guard payment residual and service cost at API layer

      - payments.js POST /Payments: reject allocation whose allocated_amount
        exceeds saleorders.residual / dotkhams.amountresidual by more than 0.01
        (invariant: payment.amount.not-exceeding-residual — CRITICAL).
        Also reject amount <= 0 at the required-field check.
      - saleOrders.js POST /SaleOrders: reject negative amounttotal and quantity
        (invariant: service.totalCost.non-negative — HIGH).
      - services.js POST /Services: reject negative unit_price, quantity, discount,
        and computed total_amount where discount exceeds unit_price * quantity
        (invariant: service.totalCost.non-negative — HIGH).

      UI-only enforcement previously; server was defenseless. No schema changes.

      Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
      EOF
      )"
  </action>
  <verify>
    <automated>node -c api/src/routes/payments.js</automated>
    <automated>node -c api/src/routes/saleOrders.js</automated>
    <automated>node -c api/src/routes/services.js</automated>
    <automated>grep -c "exceeds outstanding balance" api/src/routes/payments.js  # expect >= 1</automated>
    <automated>grep -c "must be >= 0" api/src/routes/saleOrders.js  # expect >= 1</automated>
    <automated>grep -c "must be >= 0" api/src/routes/services.js  # expect >= 3 (unit_price, quantity, discount)</automated>
    <automated>grep -cE "SELECT residual FROM saleorders|SELECT amountresidual FROM dotkhams" api/src/routes/payments.js  # expect >= 2</automated>
    <automated>JWT_SECRET=test DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo" timeout 5 node api/src/server.js 2>&1 | head -20  # expect "API listening" or similar, no parse/require errors</automated>
    <automated>git log -1 --pretty=%s  # expect starts with "fix(api): guard payment residual"</automated>
  </verify>
  <done>
    - payments.js POST rejects over-residual allocations with 400 before INSERT
    - saleOrders.js POST rejects negative amounttotal/quantity with 400
    - services.js POST rejects negative unit_price/quantity/discount/total with 400
    - All three files parse with `node -c`
    - API server boots within 5s without new errors
    - One atomic commit with message `fix(api): guard payment residual and service cost at API layer`
  </done>
</task>

<task type="auto">
  <name>Task 2: Add monthlyPlan down-payment + installment-sum guards (API + DB CHECK)</name>
  <files>
    - api/src/routes/monthlyPlans.js
    - api/migrations/016_monthlyplan_constraints.sql
  </files>
  <action>
    Two deliverables, one atomic commit.

    (A) monthlyPlans.js POST / (line 172 handler) — insert validation BEFORE the first
        INSERT on line 186:

        const ta = parseFloat(total_amount || 0);
        const dp = parseFloat(down_payment || 0);
        const n  = parseInt(number_of_installments || 0, 10);

        if (dp < 0) {
          return res.status(400).json({ error: 'down_payment must be >= 0' });
        }
        if (dp >= ta) {
          return res.status(400).json({ error: 'down_payment must be less than total_amount' });
        }
        if (n < 1) {
          return res.status(400).json({ error: 'number_of_installments must be >= 1' });
        }

        // Installment-sum guard: installment_amount is computed server-side, so the guard
        // checks that Math.round((ta - dp) / n) * n reproduces (ta - dp) within tolerance.
        const installment_amount_guard = Math.round((ta - dp) / n);
        const installment_sum = installment_amount_guard * n;
        if (Math.abs(installment_sum - (ta - dp)) > 0.01 * n) {
          // Rounding slack is n * 0.5 VND max; anything above n * 0.01 means bad input,
          // not rounding. Reject.
          return res.status(400).json({
            error: 'installment sum does not equal total_amount - down_payment (check rounding or bad inputs)'
          });
        }

        Note: Reuse `installment_amount_guard` — replace line 184's
        `const installment_amount = Math.round(...)` by reusing `installment_amount_guard`
        (rename to `installment_amount` OR declare `const installment_amount = installment_amount_guard;`).

    (B) monthlyPlans.js PUT /:id (line 257 handler) — when caller updates total_amount
        and/or down_payment, re-validate the invariant. Since the handler accepts partial
        updates, fetch the current row first if only one of the two is supplied:

        Insert BEFORE the `updates.length === 0` block (around line 277):

        if (total_amount !== undefined || down_payment !== undefined) {
          const current = await query(
            'SELECT total_amount, down_payment FROM dbo.monthlyplans WHERE id = $1',
            [req.params.id]
          );
          if (current.length === 0) {
            return res.status(404).json({ error: 'Plan not found' });
          }
          const newTotal = parseFloat(total_amount !== undefined ? total_amount : current[0].total_amount);
          const newDown  = parseFloat(down_payment !== undefined ? down_payment : current[0].down_payment);
          if (newDown < 0) {
            return res.status(400).json({ error: 'down_payment must be >= 0' });
          }
          if (newDown >= newTotal) {
            return res.status(400).json({ error: 'down_payment must be less than total_amount' });
          }
        }

    (C) New migration file `api/migrations/016_monthlyplan_constraints.sql`:

        -- Migration: Add idempotent CHECK constraint enforcing
        -- down_payment < total_amount on dbo.monthlyplans.
        -- Invariant: monthlyPlan.amount.downPayment-less-than-total (CRITICAL)
        -- Postgres does not support ADD CONSTRAINT IF NOT EXISTS, so we gate on
        -- pg_constraint lookup inside a DO block.

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'chk_downpayment_lt_total'
          ) THEN
            ALTER TABLE dbo.monthlyplans
              ADD CONSTRAINT chk_downpayment_lt_total
              CHECK (down_payment < total_amount);
          END IF;
        END$$;

        Planner note: File number is 016, not 015 — 014_payment_per_record.sql and
        015_deposit_receipts.sql already exist. Confirm with `ls api/migrations/` before
        writing and bump if 016 also exists.

    Commit atomically:
      git add api/src/routes/monthlyPlans.js api/migrations/016_monthlyplan_constraints.sql
      git commit -m "$(cat <<'EOF'
      fix(data): monthlyPlan down-payment and installment-sum guards

      - API POST/PUT /MonthlyPlans: reject down_payment >= total_amount (400)
        (invariant: monthlyPlan.amount.downPayment-less-than-total — CRITICAL).
      - API POST /MonthlyPlans: reject installment plans where the computed
        installment_amount * number_of_installments drifts from
        (total_amount - down_payment) by more than n * 0.01 VND (400)
        (invariant: monthlyPlan.installmentSum.equals-remaining — CRITICAL).
      - New migration 016_monthlyplan_constraints.sql: idempotent DO-block adding
        CHECK (down_payment < total_amount) on dbo.monthlyplans.

      Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
      EOF
      )"
  </action>
  <verify>
    <automated>node -c api/src/routes/monthlyPlans.js</automated>
    <automated>ls api/migrations/016_monthlyplan_constraints.sql  # file exists</automated>
    <automated>grep -c "down_payment must be less than total_amount" api/src/routes/monthlyPlans.js  # expect >= 2 (POST + PUT)</automated>
    <automated>grep -cE "installment.*sum|sum.*installment" api/src/routes/monthlyPlans.js  # expect >= 1</automated>
    <automated>grep -c "chk_downpayment_lt_total" api/migrations/016_monthlyplan_constraints.sql  # expect >= 2 (pg_constraint check + ADD CONSTRAINT)</automated>
    <automated>grep -c "pg_constraint" api/migrations/016_monthlyplan_constraints.sql  # expect >= 1</automated>
    <automated>JWT_SECRET=test DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo" timeout 5 node api/src/server.js 2>&1 | head -20  # no parse/require errors</automated>
    <automated>git log -1 --pretty=%s  # expect starts with "fix(data): monthlyPlan down-payment"</automated>
  </verify>
  <done>
    - POST /MonthlyPlans rejects down_payment >= total_amount and bad installment sums with 400
    - PUT /MonthlyPlans/:id re-validates the invariant when total_amount or down_payment is updated
    - Migration 016_monthlyplan_constraints.sql is idempotent and runnable
    - monthlyPlans.js parses with `node -c`
    - API server boots within 5s
    - One atomic commit with message `fix(data): monthlyPlan down-payment and installment-sum guards`
  </done>
</task>

<task type="auto">
  <name>Task 3: Confirm/strengthen DELETE guard for paid-installment plans</name>
  <files>
    - api/src/routes/monthlyPlans.js
  </files>
  <action>
    The existing DELETE handler (lines 345-361) already returns 409 when a plan has paid
    installments. Verify and tighten:

    (A) Confirm the current behavior matches the invariant by reading lines 345-361.
        Expected: the handler runs `SELECT COUNT(*) FROM dbo.planinstallments WHERE plan_id = $1 AND status = 'paid'`
        and returns 409 with `{ error: 'Cannot delete plan with paid installments' }`.

    (B) Harden the handler:
        - Wrap the count + delete in a single DB transaction using `pool.connect()` so we
          cannot race between count check and DELETE. Import `pool` from `../db`:

          const express = require('express');
          const { query, pool } = require('../db');  // add pool

        - Replace the DELETE handler body with:

          router.delete('/:id', requirePermission('payment.edit'), async (req, res) => {
            const client = await pool.connect();
            try {
              await client.query('BEGIN');
              const paidResult = await client.query(
                `SELECT COUNT(*)::int AS count FROM dbo.planinstallments
                 WHERE plan_id = $1 AND status = 'paid'`,
                [req.params.id]
              );
              if ((paidResult.rows[0]?.count || 0) > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({
                  error: 'Cannot delete plan with paid installments',
                  invariant: 'monthlyPlan.noDelete-if-paid-installments'
                });
              }
              const del = await client.query(
                'DELETE FROM dbo.monthlyplans WHERE id = $1 RETURNING id',
                [req.params.id]
              );
              if (del.rowCount === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Plan not found' });
              }
              await client.query('COMMIT');
              res.json({ success: true });
            } catch (err) {
              await client.query('ROLLBACK');
              console.error('MonthlyPlans DELETE error:', err);
              res.status(500).json({ error: 'Internal server error' });
            } finally {
              client.release();
            }
          });

    (C) Check if `pool` is already imported at the top of the file; if not, add it to the
        `require('../db')` destructure. Do NOT re-import elsewhere.

    Commit atomically:
      git add api/src/routes/monthlyPlans.js
      git commit -m "$(cat <<'EOF'
      fix(data): block deletion of monthly plans with paid installments

      - DELETE /MonthlyPlans/:id: wrap count+delete in a single transaction to
        eliminate the check-then-delete race. Return 409 with explicit invariant
        tag when any installment has status='paid', 404 when the plan does not
        exist, 200 on success.
      - Invariant: monthlyPlan.noDelete-if-paid-installments — CRITICAL.

      Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
      EOF
      )"
  </action>
  <verify>
    <automated>node -c api/src/routes/monthlyPlans.js</automated>
    <automated>grep -c "409" api/src/routes/monthlyPlans.js  # expect >= 1</automated>
    <automated>grep -ci "status = 'paid'" api/src/routes/monthlyPlans.js  # expect >= 1</automated>
    <automated>grep -c "monthlyPlan.noDelete-if-paid-installments" api/src/routes/monthlyPlans.js  # expect >= 1</automated>
    <automated>grep -c "pool.connect" api/src/routes/monthlyPlans.js  # expect >= 1</automated>
    <automated>JWT_SECRET=test DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo" timeout 5 node api/src/server.js 2>&1 | head -20  # no errors</automated>
    <automated>git log -1 --pretty=%s  # expect starts with "fix(data): block deletion of monthly plans"</automated>
    <automated>git log --oneline -3  # expect 3 new commits with conventional fix() prefix</automated>
  </verify>
  <done>
    - DELETE handler now uses an explicit transaction and returns 409 + invariant tag on paid installments
    - monthlyPlans.js parses with `node -c`
    - API server boots within 5s
    - Three atomic commits exist on current branch with conventional fix() prefixes
    - No `git push` performed
  </done>
</task>

</tasks>

<verification>
## Overall post-all-commits checks

Run AFTER all three tasks commit:

```bash
# 1. Three new commits on top of starting HEAD, all with fix() prefix
git log --oneline $(git merge-base ai-develop HEAD)..HEAD

# 2. Gap query (may or may not reflect — invariants JSON won't auto-update)
node graphify-out/overlay/query.js gaps 2>/dev/null | head -40 || \
  echo "query.js gaps not runnable; flag: post-fix: regenerate invariants model"

# 3. Invariant-by-invariant spot check
for inv in payment.amount.not-exceeding-residual \
           service.totalCost.non-negative \
           monthlyPlan.amount.downPayment-less-than-total \
           monthlyPlan.installmentSum.equals-remaining \
           monthlyPlan.noDelete-if-paid-installments; do
  echo "=== $inv ==="
  node graphify-out/overlay/query.js invariant "$inv" 2>/dev/null | head -20 || echo "  (query.js not runnable; see flag below)"
done

# 4. Final sanity: server still boots
JWT_SECRET=test DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55433/tdental_demo" \
  timeout 5 node api/src/server.js 2>&1 | head -10
```

## Follow-up (NOT part of this plan)

- **Regenerate invariants model**: `graphify-out/business-invariants.json` is a snapshot;
  it will NOT auto-reflect the new API guards. Re-run the synthesizer after merge.
- **TS warning in website/src/hooks/usePayment.ts:65**: explicitly out of scope.
- **Other 17 medium/high gaps**: tracked separately.
- **Run migration 016 in all envs**: local demo DB, staging, prod. Idempotent so re-runs are safe.
</verification>

<success_criteria>
- 3 atomic commits on current branch, each with conventional `fix(api|data): ...` subject
  and Co-Authored-By trailer
- 5 invariants now enforced server-side:
  1. payment.amount.not-exceeding-residual → payments.js POST residual check
  2. service.totalCost.non-negative → saleOrders.js + services.js POST non-negative checks
  3. monthlyPlan.amount.downPayment-less-than-total → monthlyPlans.js POST/PUT + DB CHECK
  4. monthlyPlan.installmentSum.equals-remaining → monthlyPlans.js POST sum guard
  5. monthlyPlan.noDelete-if-paid-installments → monthlyPlans.js DELETE transactional 409
- All 4 route files parse (`node -c` clean)
- API server boots in <5s with no new errors
- New migration file `016_monthlyplan_constraints.sql` is idempotent
- No UI files changed
- No `git push` executed
</success_criteria>

<output>
After completion, this plan's outcome is the three commits themselves.
No SUMMARY.md required for a quick-mode plan; the commit messages ARE the summary.
</output>
