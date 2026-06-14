# Bank Statement Import / Reconciliation — Reference Library

> **Domain:** Bank statement parsing (CSV, OFX, QIF, MT940, CAMT.053, Excel), transaction matching / reconciliation, import job queues, duplicate detection, rule-based categorization, and open-banking integration patterns.
>
> **Relevance to TGClinic:** TGClinic currently imports legacy TDental payment data via `api/scripts/tdental-import/` (parsing Vietnamese payment descriptions, installments, and `accountpayments`/`payments` tables). Future bank-statement import is likely. This reference library provides battle-tested patterns for parsing, deduplication, reconciliation, and categorization.

---

## Table of Contents

1. [Reference Repositories](#reference-repositories)
2. [Architecture Patterns Summary](#architecture-patterns-summary)
3. [Recommended Minimal Architecture for TGClinic](#recommended-minimal-architecture-for-tgclinic)
4. [Key Files to Study](#key-files-to-study)
5. [Cross-References](#cross-references)

---

## Reference Repositories

### 1. `bankstatementparser` (Python) — Multi-Format Parser + Deduplication
- **Repo:** `sebastienrousseau/bankstatementparser`
- **License:** Apache-2.0
- **Language:** Python 3.10–3.14
- **Relevance:** ⭐⭐⭐⭐⭐ Canonical all-in-one parser for CAMT.053, PAIN.001, CSV, OFX/QFX, MT940, and PDFs. Includes deterministic deduplication, FastAPI REST API, and rule-based categorization.
- **Why it matters for TGClinic:**
  - The `Transaction` Pydantic model normalizes all formats into a single schema (`amount`, `currency`, `booking_date`, `value_date`, `description`, `account_id`, `reference`, `transaction_hash`).
  - `transaction_deduplicator.py` implements a **three-tier deduplication strategy**:
    1. **Exact duplicates** — SHA256 primary hash on `account_id | currency | amount | booking_date`.
    2. **Probable matches** — same primary hash + description similarity ≥ 0.9 (SequenceMatcher).
    3. **Temporal matches** — same `account_id | currency | amount` within a configurable date window (default 3 days), with description similarity scoring.
  - `dedupe_by_hash()` uses **occurrence-counted keys** (`<hash>:<n>`) for idempotent re-ingestion — re-importing the same batch is safe, but genuine same-day duplicates are not silently dropped.
  - `api.py` provides a FastAPI upload endpoint with format auto-detection, file-size limits (25 MB), and allowed-suffix validation.
  - `enrichment/categorizer.py` uses LiteLLM (Ollama by default) to categorize transactions against Plaid's 13-category taxonomy.
- **Files to study:**
  - `bankstatementparser/transaction_models.py` — Unified `Transaction` model with `transaction_hash`, `source_method`, `confidence`.
  - `bankstatementparser/transaction_deduplicator.py` — Three-tier dedup with `Deduplicator.primary_hash()`, `dedupe_by_hash()`, `deduplicate()`.
  - `bankstatementparser/bank_statement_parsers.py` — `FileParser`, `Camt053Parser`, `Pain001Parser`, auto-detection via `detect_statement_format()`.
  - `bankstatementparser/api.py` — FastAPI upload endpoint, input validation, streaming chunk reads.
  - `bankstatementparser/enrichment/categorizer.py` — LLM-backed categorization with prompt templates.

---

### 2. `csv2ofx` (Python) — CSV-to-OFX/QIF Converter with Bank Mappings
- **Repo:** `reubano/csv2ofx`
- **License:** MIT
- **Language:** Python
- **Relevance:** ⭐⭐⭐⭐ Canonical CSV-to-OFX/QIF converter with 20+ bank-specific mappings.
- **Why it matters for TGClinic:**
  - Demonstrates how to map arbitrary CSV columns to a canonical transaction schema via a `mapping` dictionary of lambda functions.
  - Each bank mapping (mint, n26, stripe, xero, ubs-ch-fr, etc.) is a small Python module in `csv2ofx/mappings/`.
  - The `OFX` and `QIF` classes generate standard financial interchange formats from the mapped records.
  - Supports split transactions, custom headers, date formatting, and filtering.
- **Files to study:**
  - `csv2ofx/mappings/default.py` — Default mapping showing the `mapping` dict structure.
  - `csv2ofx/mappings/stripe.py` — Example of a real-world payment-processor mapping.
  - `csv2ofx/ofx.py` — OFX generation with `gen_groups()`, `gen_trxns()`, `clean_trxns()`.
  - `csv2ofx/main.py` — CLI argument parsing and pipeline orchestration.

---

### 3. `bank-recon` (Python) — Minimal Balance Verification
- **Repo:** `jma127/bank-recon`
- **License:** Unspecified (public domain style)
- **Language:** Python 2/3
- **Relevance:** ⭐⭐⭐ Minimal but instructive CSV reconciliation script.
- **Why it matters for TGClinic:**
  - Shows the simplest possible reconciliation flow: read CSV → parse amounts with `Decimal` precision → verify running balance against stated opening/closing balances.
  - Handles pending transactions (marked by `(Pending)` in description or empty balance).
  - Uses `Decimal` for all monetary calculations — critical for financial correctness.
  - Demonstrates how to normalize amount strings (strip `$`, `,`, parentheses for negatives).
- **Files to study:**
  - `bank-recon/main.py` — `Transaction` class, `parse_amt()`, `get_delta()`, balance verification loop.

---

### 4. `OpenRec` (Rust) — Enterprise Reconciliation Matching Engine
- **Repo:** `GrandmasterTash/OpenRec`
- **License:** MIT
- **Language:** Rust
- **Relevance:** ⭐⭐⭐⭐⭐ Best-in-class reconciliation engine architecture for enterprise use.
- **Why it matters for TGClinic:**
  - **Not a full app** — it's a matching engine that sits between your data sources and your application. This is the right mental model for TGClinic.
  - **Three-phase pipeline:** `Steward` (orchestration) → `Jetwash` (pre-processing / cleaning) → `Celerity` (matching engine).
  - **Folder-based queue:** Each "control" has `inbox/`, `waiting/`, `unmatched/`, `matched/`, `outbox/`, `archive/` folders. Files are processed atomically (`.inprogress` suffix convention).
  - **Virtual grid model:** Multiple CSV files are loaded into a single virtual grid with prefixed columns (`INV.Amount`, `PAY.Amount`).
  - **YAML charter configuration:** Rules are declarative — no code changes needed for new matching logic.
  - **Constraint types:** `nets_to_zero`, `nets_with_tolerance`, `custom` (Lua scripting), `group` by columns.
  - **External merge sort:** Handles millions of transactions with <100MB RAM using disk-based sorting.
  - **Prometheus metrics:** Built-in observability for queue depth, match rates, job duration.
- **Files to study:**
  - `openrec/docs/concepts.md` — Full architecture: folder structure, charter YAML, virtual grid, grouping, constraints.
  - `openrec/celerity/src/lib.rs` — Job phases (`init_job`, `apply_changesets`, `derive_data`, `match_and_group`, `complete_and_archive`).
  - `openrec/celerity/src/matching/constraints.rs` — `nets_to_zero`, `nets_with_tolerance`, `custom_constraint` implementations.
  - `openrec/celerity/src/matching/matched.rs` — `MatchedHandler` — appends matched groups to JSON, writes status bytes.
  - `openrec/celerity/src/matching/unmatched.rs` — `UnmatchedHandler` — writes unmatched records back to CSV.
  - `openrec/core/src/charter.rs` — `Charter`, `Matching`, `Jetwash`, `Constraint`, `ToleranceType` structs.

---

### 5. `actual-budget` (TypeScript) — TypeScript Import Pipeline + OFX/CAMT/QIF Parsers
- **Repo:** `actualbudget/actual`
- **License:** MIT (was formerly Parity-7)
- **Language:** TypeScript / Node.js
- **Relevance:** ⭐⭐⭐⭐⭐ Best TypeScript reference for bank-statement import in a modern JS/TS stack.
- **Why it matters for TGClinic:**
  - `parse-file.ts` is the single entry point for all import formats: CSV, OFX, QIF, CAMT.053 XML.
  - `parseOFX()` uses `ofx2json.ts` which handles SGML-to-XML conversion (banks often emit broken OFX), amount parsing with parentheses-for-negative, and `fitId` as `imported_id` for duplicate detection.
  - `parseCAMT()` uses `xmlcamt2json.ts` for ISO 20022 CAMT.053 XML parsing.
  - `ImportTransactionEntity` type defines the canonical import schema: `account`, `date`, `amount` (integer cents), `payee_name`, `imported_payee`, `imported_id`, `transfer_id`, `cleared`, `subtransactions`.
  - **Duplicate detection:** Actual uses `imported_id` (from OFX `fitId`) as the primary dedup key. Falls back to fuzzy matching on date + amount + payee for CSV imports.
  - `parseOfxAmount()` is a robust amount parser: handles parentheses, currency symbols, multiple decimal points, and returns `null` for invalid formats instead of `NaN`.
- **Files to study:**
  - `actual-budget/import/parse-file.ts` — `parseFile()`, `parseCSV()`, `parseOFX()`, `parseQIF()`, `parseCAMT()`, `parseOfxAmount()`.
  - `actual-budget/import/ofx2json.ts` — SGML-to-XML conversion, `mapOfxTransaction()`, `getBankStmtTrn()`.
  - `actual-budget/import/import-transaction.ts` — `ImportTransactionEntity` type definition.
  - `actual-budget/import/xmlcamt2json.ts` — CAMT.053 XML-to-JSON mapping.

---

### 6. `firefly-data-importer` (PHP/Laravel) — Import Job Queue + Duplicate Detection
- **Repo:** `firefly-iii/data-importer`
- **License:** AGPL-3.0
- **Language:** PHP (Laravel)
- **Relevance:** ⭐⭐⭐⭐ Mature import job queue with duplicate detection and multiple bank API integrations.
- **Why it matters for TGClinic:**
  - `Import.php` console command implements a full import job pipeline: read config → validate JSON → authenticate with bank API (Nordigen, GoCardless, Salt Edge, SimpleFIN, Sophtron, EnableBanking) → fetch transactions → map to Firefly schema → detect duplicates → create transactions.
  - **Two duplicate detection strategies:**
    1. **Content-based:** Build a normalized representation (date, amount, description, notes), hash it, and check against existing transactions.
    2. **Identifier-based:** Use an external identifier column (CSV) or API-provided transaction ID. If the ID exists, skip.
  - `ValidationController.php` shows how to validate authentication flows for multiple open-banking providers.
  - Demonstrates how to structure a job queue where each import is a discrete command with config file + optional data file.
- **Files to study:**
  - `firefly-data-importer/app/Console/Commands/Import.php` — Import command pipeline, `AutoImports` trait, `HaveAccess` trait.
  - `firefly-data-importer/app/Api/Controllers/ImportFlow/ValidationController.php` — Multi-provider auth validation (Nordigen, GoCardless, etc.).

---

### 7. `oca-bank-import` (Python/Odoo) — Enterprise CAMT.053 Parser + Idempotent Import
- **Repo:** `OCA/bank-statement-import`
- **License:** AGPL-3.0 / LGPL-3.0
- **Language:** Python (Odoo framework)
- **Relevance:** ⭐⭐⭐⭐ Enterprise-grade CAMT.053 parser with SQL-level idempotency.
- **Why it matters for TGClinic:**
  - `account_statement_import_camt_parser.py` is a full CAMT.053 XML parser using `lxml`. It parses `BkToCstmrStmt` → `Ntry` (entries) → `TxDtls` (transaction details), extracting amounts with `CdtDbtInd` (credit/debit indicator), dates, references, and counterparty info.
  - `account_bank_statement_line.py` adds `unique_import_id` with a **database-level unique constraint**: `UNIQUE(unique_import_id)`. This is the simplest and most robust idempotency mechanism.
  - Demonstrates how to structure a parser as an abstract model in an ORM framework, with XPath-based XML extraction.
- **Files to study:**
  - `oca-bank-import/account_statement_import_camt/models/account_statement_import_camt_parser.py` — `parse_amount()`, `parse_transaction_details()`, `parse_entry()`, `parse_statement()`, `check_version()`.
  - `oca-bank-import/account_statement_import_base/models/account_bank_statement_line.py` — `unique_import_id` field + `_sql_constraints`.

---

## Architecture Patterns Summary

### Pattern 1: Unified Transaction Model
All parsers normalize to a single canonical type:

```
Transaction {
  amount: Decimal (or integer cents)
  currency: ISO-4217 code
  booking_date: ISO-8601 date
  value_date: ISO-8601 date
  description: string (normalized for hashing)
  account_id: string
  reference: string (bank-provided ID)
  transaction_hash: SHA256(content)
  source_method: "deterministic" | "llm" | "vision"
  confidence: float (0–1, for LLM rows)
}
```

**References:** `bankstatementparser/transaction_models.py`, `actual-budget/import/import-transaction.ts`

### Pattern 2: Three-Tier Deduplication
1. **Exact hash match** — `SHA256(account_id | currency | amount | booking_date)`.
2. **Probable match** — Same hash + description similarity ≥ threshold.
3. **Temporal match** — Same `account_id | currency | amount` within N days + description similarity.

**References:** `bankstatementparser/transaction_deduplicator.py`, `actual-budget/import/parse-file.ts` (OFX `fitId` fallback)

### Pattern 3: Idempotent Re-Ingestion
Use occurrence-counted hash keys (`<hash>:0`, `<hash>:1`, ...) so that:
- Re-importing the exact same batch is a no-op.
- Genuine same-day duplicates (two identical purchases) are preserved.

**References:** `bankstatementparser/transaction_deduplicator.py:dedupe_by_hash()`, `oca-bank-import/account_bank_statement_line.py`

### Pattern 4: Folder-Based Job Queue
```
inbox/      → Place files with .inprogress suffix, rename when done
waiting/    → Pre-processed files ready for matching
unmatched/  → Cache of previously unmatched data
matched/    → Archive of match job JSON files
outbox/     → External unmatched data for manual review
archive/    → Completed files (jetwash/ + celerity/ subfolders)
```

**References:** `openrec/docs/concepts.md`

### Pattern 5: YAML-Rule Matching Engine
Declarative rules for grouping and constraint evaluation:
```yaml
matching:
  instructions:
    - merge:
        columns: ['INV.Amount', 'PAY.Amount']
        into: AMOUNT
    - group:
        by: ['REF']
        match_when:
          - nets_to_zero:
              column: AMOUNT
              lhs: record["META.prefix"] == "PAY"
              rhs: record["META.prefix"] == "INV"
```

**References:** `openrec/docs/concepts.md`, `openrec/core/src/charter.rs`

### Pattern 6: Bank-Specific CSV Mappings
Each bank/processor has a small mapping module:
```python
mapping = {
    'bank': 'Stripe',
    'account': itemgetter('Account'),
    'date': lambda r: parse_date(r['Created (UTC)']),
    'amount': lambda r: Decimal(r['Amount']),
    'desc': itemgetter('Description'),
    'id': itemgetter('Balance Transaction ID'),
}
```

**References:** `csv2ofx/mappings/stripe.py`, `csv2ofx/mappings/default.py`

---

## Recommended Minimal Architecture for TGClinic

If TGClinic adds bank-statement import, the following minimal architecture is recommended, drawing from the references above:

### Phase 1: Parser Layer (Node.js / TypeScript)
- **Format support:** CSV (primary), OFX, QIF, CAMT.053 (future), Excel via `xlsx` library.
- **Pattern:** Port `actual-budget/import/parse-file.ts` to TGClinic's Express backend.
- **Amount parsing:** Use `parseOfxAmount()` pattern — handle parentheses, currency symbols, multiple decimals, return `null` for invalid.
- **Canonical model:** Define a `BankTransaction` type matching `ImportTransactionEntity` from Actual Budget.

### Phase 2: Deduplication Layer
- **Database table:** `bank_import_hashes` with columns `hash VARCHAR(64) UNIQUE`, `occurrence_index INT`, `imported_at TIMESTAMP`.
- **Primary hash:** `SHA256(account_id | currency | amount | booking_date | reference)`.
- **Idempotent re-ingestion:** Use occurrence-counted keys (`hash:0`, `hash:1`) per `bankstatementparser` pattern.
- **SQL constraint:** `UNIQUE(hash, occurrence_index)` — prevents silent dedup of genuine duplicates.
- **Fuzzy fallback:** For CSV imports without `imported_id`, compare `date ± 1 day`, `amount ± 0.01`, `description similarity ≥ 0.85`.

### Phase 3: Reconciliation Layer
- **Pattern:** Port OpenRec's "virtual grid" concept to PostgreSQL:
  - `bank_statement_lines` (imported transactions)
  - `payments` (existing TGClinic payments)
  - Reconciliation query: LEFT JOIN on `amount`, `date ± 1 day`, `description similarity`.
- **Status field:** `reconciliation_status` enum: `unmatched`, `matched`, `suggested`, `manual_review`.
- **Rule engine:** Start with simple SQL rules, evolve to YAML/JSON config if needed.

### Phase 4: Categorization Layer
- **Rule-based first:** Map description keywords to categories (e.g., "CK" → `bank_transfer`, "chuyen" → `bank_transfer` per TGClinic's existing `methodFromCommunication()` pattern).
- **LLM fallback:** Use `bankstatementparser/enrichment/categorizer.py` pattern with LiteLLM/Ollama for uncategorized transactions.

### Phase 5: Job Queue
- **Simple approach:** PostgreSQL `pg-boss` or `bull` (Redis) queue.
- **Job payload:** `{ file_path, format, account_id, config_id }`.
- **Worker flow:**
  1. Parse file → canonical transactions.
  2. Compute hash for each transaction.
  3. Check `bank_import_hashes` for duplicates.
  4. Insert new transactions into `bank_statement_lines`.
  5. Run reconciliation matcher against `payments`.
  6. Update `reconciliation_status`.
  7. Archive file.

### Database Schema (Minimal)
```sql
CREATE TABLE bank_import_batches (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  file_name TEXT,
  file_hash VARCHAR(64),
  format VARCHAR(10),
  status VARCHAR(20), -- pending, processing, completed, failed
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bank_statement_lines (
  id UUID PRIMARY KEY,
  batch_id UUID REFERENCES bank_import_batches(id),
  imported_id VARCHAR(255), -- bank-provided ID (OFX fitId, etc.)
  transaction_hash VARCHAR(64) NOT NULL,
  occurrence_index INT DEFAULT 0,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'VND',
  booking_date DATE NOT NULL,
  description TEXT,
  payee_name TEXT,
  notes TEXT,
  category VARCHAR(50),
  reconciliation_status VARCHAR(20) DEFAULT 'unmatched',
  matched_payment_id UUID REFERENCES payments(id),
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(transaction_hash, occurrence_index)
);

CREATE TABLE bank_import_hashes (
  hash VARCHAR(64) NOT NULL,
  occurrence_index INT NOT NULL DEFAULT 0,
  line_id UUID REFERENCES bank_statement_lines(id),
  imported_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (hash, occurrence_index)
);
```

---

## Key Files to Study

| Pattern | File | Lines | What to Learn |
|---------|------|-------|---------------|
| Unified model | `bankstatementparser/transaction_models.py` | ~300 | `Transaction` Pydantic model, `normalize_description()`, `amount_key()` |
| Deduplication | `bankstatementparser/transaction_deduplicator.py` | ~438 | `Deduplicator.primary_hash()`, `dedupe_by_hash()`, three-tier matching |
| FastAPI upload | `bankstatementparser/api.py` | ~251 | File upload endpoint, size limits, format validation, streaming |
| CSV→OFX mapping | `csv2ofx/mappings/stripe.py` | ~30 | Bank-specific column mapping pattern |
| CSV→OFX engine | `csv2ofx/ofx.py` | ~200 | `gen_groups()`, `gen_trxns()`, `clean_trxns()` |
| Balance verification | `bank-recon/main.py` | ~89 | `Decimal` precision, `parse_amt()`, running balance check |
| Reconciliation engine | `openrec/docs/concepts.md` | ~492 | Folder-based queue, YAML charters, virtual grid, constraints |
| Match constraints | `openrec/celerity/src/matching/constraints.rs` | ~92 | `nets_to_zero`, `nets_with_tolerance`, Lua custom constraints |
| Job orchestration | `openrec/celerity/src/lib.rs` | ~342 | Job phases: `init_job` → `apply_changesets` → `derive_data` → `match_and_group` |
| TS import pipeline | `actual-budget/import/parse-file.ts` | ~289 | `parseFile()`, `parseCSV()`, `parseOFX()`, `parseCAMT()`, `parseOfxAmount()` |
| OFX→JSON | `actual-budget/import/ofx2json.ts` | ~150 | SGML-to-XML conversion, `mapOfxTransaction()`, `getBankStmtTrn()` |
| Import entity type | `actual-budget/import/import-transaction.ts` | ~50 | `ImportTransactionEntity` — canonical import schema |
| Import job queue | `firefly-data-importer/app/Console/Commands/Import.php` | ~76 | Laravel command pipeline, multi-provider auth |
| Multi-provider auth | `firefly-data-importer/app/Api/Controllers/ImportFlow/ValidationController.php` | ~90 | Nordigen, GoCardless, Salt Edge validation |
| CAMT.053 parser | `oca-bank-import/account_statement_import_camt/models/account_statement_import_camt_parser.py` | ~414 | `lxml` XPath parsing, `parse_amount()`, `parse_transaction_details()` |
| SQL idempotency | `oca-bank-import/account_statement_import_base/models/account_bank_statement_line.py` | ~20 | `unique_import_id` field + `UNIQUE` constraint |

---

## Cross-References

- **MoneyFlowRef (`library/money-flow/`):** Overlaps on idempotent posting, payment allocation, and double-entry ledger. The `bank_statement_lines` table above should align with MoneyFlowRef's payment allocation schema.
- **ReactRef (`library/react-patterns/`):** If TGClinic builds a bank-statement import UI, the upload component, transaction table, and reconciliation review panel should follow ReactRef's form/table patterns.
- **ExpressRef (`library/express/`):** The FastAPI patterns in `bankstatementparser/api.py` should be ported to Express middleware (multer upload, file-size limits, format validation).
- **PostgresRef (`library/postgres/`):** The `bank_statement_lines` and `bank_import_hashes` schema above should align with PostgresRef's migration and indexing patterns.
- **AuthRef (`library/auth/`):** If open-banking APIs are integrated, AuthRef's OAuth2/PKCE patterns apply to bank consent flows.

---

## License Summary

| Repository | License | Commercial Use | Notes |
|------------|---------|---------------|-------|
| `bankstatementparser` | Apache-2.0 | ✅ | Safe for commercial use |
| `csv2ofx` | MIT | ✅ | Safe for commercial use |
| `bank-recon` | Unspecified | ⚠️ | Small script, likely public domain |
| `OpenRec` | MIT | ✅ | Safe for commercial use |
| `actual-budget` | MIT | ✅ | Safe for commercial use |
| `firefly-data-importer` | AGPL-3.0 | ❌ | Copyleft — study only, do not embed |
| `oca-bank-import` | AGPL-3.0 / LGPL-3.0 | ❌ / ✅ | CAMT parser is AGPL; base model is LGPL. Study only. |

> ⚠️ **AGPL repositories (firefly-data-importer, OCA CAMT parser) are copyleft.** They are included here for architectural study only. Do not copy their code into TGClinic without relicensing TGClinic under AGPL. The patterns and concepts are safe to re-implement.

---

*Generated: 2026-06-14 by BankStatementRef (librarian agent) for TGClinic enterprise reference library.*
