# Commission / MLM / Earnings / Payouts — Reference Library

> For TGClinic's commission engine, MLM upline/downline distribution, earnings ledger, and payout batching.

## 1. Repositories Downloaded

| # | Folder | Repository | License | Why It Matters |
|---|---|---|---|---|
| 1 | `voidnerd-mlm-solution` | [voidnerd/MLM-Solution](https://github.com/voidnerd/MLM-Solution) | Unknown | Laravel MLM with 6-level payouts, closure-table genealogy, wallet/transaction model. |
| 2 | `prathammahajan-affiliate` | [prathammahajan13/affiliate-management-system](https://github.com/prathammahajan13/affiliate-management-system) | MIT | Configurable `CommissionEngine` with tier structure, volume bonuses, payment scheduler. |
| 3 | `tangaiyun-brokerage` | [tangaiyun/multilevel-marketing-brokerage-algorithm](https://github.com/tangaiyun/multilevel-marketing-brokerage-algorithm) | Unknown | Java progressive ladder/bracket commission calculation. |
| 4 | `lerian-midaz` | [lerianstudio/midaz](https://github.com/lerianstudio/midaz) | Elastic-2.0 | Cloud-native ledger with double-entry, n:n transactions, sync/async routing. |
| 5 | `blnkfinance-blnk` | [blnkfinance/blnk](https://github.com/blnkfinance/blnk) | Apache-2.0 | Open-source financial ledger with batch transactions, inflight/refund/lineage. |
| 6 | `pgr0ss-pgledger` | [pgr0ss/pgledger](https://github.com/pgr0ss/pgledger) | MIT | Pure PostgreSQL ledger: append-only transfers, double-entry entries, balance constraints. |
| 7 | `adilk-binary-mlm` | [adilk121/binary-tree-mlm](https://github.com/adilk121/binary-tree-mlm) | Unknown | Binary MLM tree, downline traversal, commission calculation. |
| 8 | `wooga-locker` | [wooga/locker](https://github.com/wooga/locker) | Unknown | Distributed atomic lock pattern (Erlang). |

## 2. Specific Patterns to Adopt

### 2.1 Configurable Commission Rule Engine
**From:** `prathammahajan-affiliate/CommissionEngine.js`

```js
class CommissionEngine extends EventEmitter {
  async calculateCommission(affiliateId, amount, options = {}) {
    const affiliate = await this._getAffiliateData(affiliateId);
    const rate = this._getCommissionRate(affiliate, amount);
    const baseCommission = this._calculateBaseCommission(amount, rate);
    const volumeBonus = this._calculateVolumeBonus(affiliate, amount);
    const tierBonus = this._calculateTierBonus(affiliate);
    const totalCommission = baseCommission + volumeBonus + tierBonus;
    this.emit('commission:calculated', commission);
    return commission;
  }
}
```

**TGClinic adaptation:**
- Replace the hardcoded braces override in `commissionEngine.js` with a rule config.
- `commission_level_config` already defines L0-L4 shares.
- Add product/category matchers to the rule engine so braces tier logic becomes a config, not a code branch.

### 2.2 Upline Chain Walking
**From:** `voidnerd-mlm-solution/app/Http/Controllers/AdminController.php`

```php
public function getWhoToPay($userId, $level) {
  // Walk up the closure table / parent chain to find the upline at the given level
  $current = User::find($userId);
  for ($i = 1; $i <= $level; $i++) {
    if (!$current || !$current->parent_id) return null;
    $current = User::find($current->parent_id);
  }
  return $current;
}
```

**TGClinic adaptation:**
- `commissionEngine.js` has `_walkCtvChain` (legacy, txClient-based) and `_walkChainRun` (runner-based).
- Unify on `_walkChainRun` and make `createEarningsForPayment` use `_runnerFor` to build a runner from its txClient.
- This removes the duplicated chain-walk logic.

### 2.3 Progressive Bracket / Ladder Commission
**From:** `tangaiyun-brokerage/Ladder.java`

```java
public double calculateBrokerage(double commissionChargeBase) {
  List<LadderEntry> leList = getLadderEntryList(commissionChargeBase);
  double brokerage = 0;
  double commissionCharge = commissionChargeBase;
  for (int i = leList.size() - 1; i >= 0; i--) {
    LadderEntry le = leList.get(i);
    brokerage = brokerage + (commissionCharge - le.leftValue) * le.rate;
    commissionCharge = le.leftValue;
  }
  return brokerage;
}
```

**TGClinic adaptation:**
- If TGClinic adds volume-based or tiered commission bonuses, use a ladder instead of flat percentages.
- Store ladder brackets in `commission_level_config` or a new `commission_ladders` table.

### 2.4 Pure SQL Ledger
**From:** `pgr0ss-pgledger/pgledger.sql`

```sql
CREATE OR REPLACE FUNCTION pgledger_create_transfers(
  transfer_requests TRANSFER_REQUEST[],
  event_at TIMESTAMPTZ DEFAULT NULL,
  metadata JSONB DEFAULT NULL
)
RETURNS SETOF PGLEDGER_TRANSFERS_VIEW
AS $$
DECLARE
  transfer_request transfer_request;
  all_account_ids TEXT[] := '{}';
BEGIN
  -- Collect all unique account IDs and sort them to prevent deadlocks
  FOREACH transfer_request IN ARRAY transfer_requests LOOP
    all_account_ids := array_append(all_account_ids, transfer_request.from_account_id);
    all_account_ids := array_append(all_account_ids, transfer_request.to_account_id);
  END LOOP;
  SELECT ARRAY(SELECT DISTINCT unnest FROM unnest(all_account_ids) ORDER BY unnest) INTO all_account_ids;
  -- Lock all accounts in order
  FOREACH from_account_id IN ARRAY all_account_ids LOOP
    PERFORM pgledger_accounts.id FROM pgledger_accounts WHERE pgledger_accounts.id = from_account_id FOR UPDATE;
  END LOOP;
  -- Process each transfer ...
END;
$$ LANGUAGE plpgsql;
```

**TGClinic adaptation:**
- `earnings` table is already append-only.
- Apply the ordered-lock pattern when batch-updating earnings during payout creation to avoid deadlocks.
- Use `FOR UPDATE` ordered by `earnings.id` before updating status.

### 2.5 Financial Ledger with Batch + Inflight + Refund
**From:** `blnkfinance-blnk/transaction.go`

```go
func (d Datasource) RecordTransactionWithBalancesAndOutbox(
  ctx context.Context,
  txn *model.Transaction,
  sourceBalance, destinationBalance *model.Balance,
  outbox *model.LineageOutbox,
) (*model.Transaction, error) {
  tx, err := d.Conn.BeginTx(ctx, nil)
  if err != nil { return nil, err }
  defer tx.Rollback()
  recordedTxn, err := d.recordTransactionInTx(ctx, tx, txn)
  if err != nil { return nil, err }
  err = d.updateBalanceInTx(ctx, tx, sourceBalance)
  if err != nil { return nil, err }
  err = d.updateBalanceInTx(ctx, tx, destinationBalance)
  if err != nil { return nil, err }
  if outbox != nil {
    err = d.insertLineageOutboxInTx(ctx, tx, outbox)
    if err != nil { return nil, err }
  }
  if err = tx.Commit(); err != nil { return nil, err }
  return recordedTxn, nil
}
```

**TGClinic adaptation:**
- Apply the same atomic pattern for payout creation:
  1. Lock candidate earnings.
  2. Validate payability.
  3. Insert payout row.
  4. Update earnings status.
  5. Commit or rollback.
- Add an `outbox` or `payout_events` table for downstream integrations.

### 2.6 Distributed Atomic Lock
**From:** `wooga-locker/locker.erl`

```erlang
locker:acquire(Key, Value, TTL) -> {ok, Token} | {error, Reason}.
locker:wait_for_release(Key, Timeout) -> ok | {error, Reason}.
```

**TGClinic adaptation:**
- Use PostgreSQL advisory locks (`pg_advisory_lock`) or `SELECT ... FOR UPDATE` on `referral_locks(partner_id)` before walking the chain for a given `ctvId`.
- Prevents duplicate earnings during concurrent service-card creation.

## 3. Recommendations for Refactoring `commissionEngine.js`

After analyzing `api/src/services/commissionEngine.js` (~450 lines) against reference patterns:

### 3.1 Extract `CommissionRuleEngine`
- Port from `prathammahajan-affiliate/CommissionEngine.js`.
- Accept rule set (tier config, product filters, category matchers).
- Return `shareByLevel`.
- Make the braces override a rule configuration, not a code branch.

### 3.2 Unify Upline-Walk Implementations
- Keep only runner-based `_walkChainRun`.
- Make `createEarningsForPayment` use `_runnerFor` to build a runner from its txClient.
- Delete legacy `_walkCtvChain`.

### 3.3 Extract `LedgerWriter` Abstraction
- Port from `pgledger`.
- Single helper that accepts `(table, columns, values, conflictKeys)` and handles idempotent insert.
- Remove `FORWARD_INSERT_SQL`, `REVERSAL_INSERT_SQL`, `SERVICE_CARD_INSERT_SQL` duplication.

### 3.4 Extract `PayoutBatchProcessor`
- Port from `blnkfinance` batch pattern.
- Handles lock → validate → insert payout → update earnings → partial failure.
- Move logic out of `api/src/routes/payouts.js`.

### 3.5 Add Idempotency Keys
- Port from `midaz`.
- Add `idempotency_key` column to `earnings` (or `commission_runs` log table).
- Short-circuit: "this payment was already processed" without querying every earnings row.

### 3.6 Add Referral Locks
- Port from `wooga-locker`.
- Acquire advisory lock on `referral_locks(partner_id)` before chain walk.
- Prevents race conditions during concurrent service-card creation.

### 3.7 Split Pay-As-Paid vs Service-Card-Created Engines
- Create `commissionEngine/payAsPaid.js` and `commissionEngine/serviceCardCreated.js`.
- Both import shared utilities (`walkChain`, `shareMap`, `LedgerWriter`).
- Makes `CTV_SERVICE_CARD_COMMISSION` flag a file-level toggle.

### 3.8 Add Unit Tests with Fake Runner
- Port from `midaz` test pattern.
- Create `FakeRunner` that returns canned rows.
- Test walk, share, rounding, idempotency without a database.

## 4. Key Files to Study

- `prathammahajan-affiliate/CommissionEngine.js`
- `prathammahajan-affiliate/ReferralTracker.js`
- `prathammahajan-affiliate/PaymentProcessor.js`
- `voidnerd-mlm-solution/app/Http/Controllers/AdminController.php`
- `tangaiyun-brokerage/Ladder.java`
- `pgr0ss-pgledger/pgledger.sql`
- `pgr0ss-pgledger/basic-example.sql`
- `blnkfinance-blnk/transaction.go`
- `blnkfinance-blnk/transaction_grouping.go`
- `blnkfinance-blnk/transaction_inflight.go`
- `blnkfinance-blnk/transaction_refunds.go`
- `lerian-midaz/services/command/write_transaction.go`
- `lerian-midaz/adapters/postgres/transaction/transaction.go`
- `wooga-locker/locker.erl`

## 5. License & Caveats

- **MIT:** `prathammahajan-affiliate`, `pgr0ss-pgledger` — safe for study and reuse.
- **Apache-2.0:** `blnkfinance-blnk` — safe for study and reuse.
- **Elastic-2.0:** `lerianstudio/midaz` — source-available, not OSI-open-source; use as architectural reference only.
- **Unknown/Other:** `voidnerd-mlm-solution`, `tangaiyun-brokerage`, `adilk-binary-mlm`, `wooga-locker` — study patterns only; verify license before reuse.

### Caveats

- `prathammahajan-affiliate` has placeholder implementations in some files; focus on `CommissionEngine.js`.
- `voidnerd-mlm-solution` is Laravel 5.x and controller-heavy; study the genealogy/level payout model, not the architecture.
- `tangaiyun-brokerage` is a minimal Java demo with no persistence; the ladder algorithm is the key takeaway.
- `wooga-locker` is Erlang; port the pattern to Node.js using `pg_advisory_lock` or `SELECT ... FOR UPDATE`.
