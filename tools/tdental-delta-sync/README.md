# tdental-delta-sync

One-shot CLI that tops up the local `tdental_real` Postgres snapshot
(`tgroup-db:55433`) from the TDental admin UI at
`https://tamdentist.tdental.vn`.

Built for TGroup dashboard dev. Source of truth for scope/decisions is
[`../../.planning/prd-tdental-delta-sync.md`](../../.planning/prd-tdental-delta-sync.md)
and GitHub issue #27.

## Install

```bash
cd tools/tdental-delta-sync
cp .env.example .env         # fill in TDENTAL_USER / TDENTAL_PASS
npm install                  # installs playwright, pg, undici, vitest
npx playwright install chromium
```

## Use

```bash
# Dry run (fetch + map only, no DB writes) — single small table
npx tsx src/cli.ts --dry-run --only=companies --debug

# Full dry run for all configured tables
npx tsx src/cli.ts --dry-run

# Real sync from PRD cutoff (2026-02-22) forward
npx tsx src/cli.ts

# Narrow window + resume from checkpoint
npx tsx src/cli.ts --since=2026-04-01 --resume
```

## What it does

1. **AuthCapture** launches headless Chromium, logs into the SPA with
   admin creds, harvests the JWT bearer from the login XHR, closes the
   browser.
2. For each table in FK-safe topological order:
   - **ApiClient** does offset pagination against the SPA's JSON
     endpoint, throttles at ~2.5 req/s (configurable), retries 5x with
     expo backoff on 5xx/429.
   - **FieldMapper** (pure) turns API JSON rows into Postgres rows —
     camelCase→lowercase, nested objects to FK ids, ISO→timestamps.
     Unmappable rows land in `sync-errors-<runId>.jsonl`.
   - **PgUpserter** runs `INSERT ... ON CONFLICT (id) DO UPDATE SET
     ... = EXCLUDED.*` in batches of 500, one transaction per table.
3. After each table, writes a checkpoint to `state.json`. Interrupt
   the run, `--resume` picks up at the next table.
4. Writes a markdown summary to `sync-report-<timestamp>.md`.

## Tables in scope

FK order: `companies → aspnetusers → employees → productcategories →
products → partners → appointments → customerreceipts → saleorders →
saleorderlines → dotkhams → accountpayments → partneradvances`.

- **Derived**: `dotkhamsteps` is emitted from `saleorderlines.steps[]`
  (the raw `/api/DotKhamSteps` endpoint is broken — see
  `recon/RECON_REPORT.md`).
- **Skipped** (empty in source tenant): `accountinvoices`,
  `accountinvoicelines`, `dotkhamstepv2s`.
- **Skipped** (accounting-journal, out of PRD scope): `accountmoves`,
  `accountmovelines`, `accountjournals`, `accountfullreconciles`,
  `accountpartialreconciles`, `accountregisterpayments`,
  `accountregisterpaymentinvoicerel`.

## Per-table quirks

| Table | Strategy | Notes |
|---|---|---|
| partners | `detail-follow` | Skinny list + `/api/Partners/{id}` per row for the 96-field fat profile. |
| appointments | `two-pass` | Past `[since..today]` + future `[today..today+APPOINTMENTS_FUTURE_DAYS]`. Dedupe by id. |
| customerreceipts | `paired` | `dateFrom` alone returns HTTP 500 — always sends `dateTo=today`. |
| companies, products, productcategories, employees, aspnetusers | `all` | < 500 rows each, no server-side delta filter. Full pull every run. |
| everything else | `single` | One pass with `<table's>From=<since>`. |

## Tests

```bash
npm run test          # all tests
npm run test:unit     # fieldMapper against recon/samples/* fixtures
npm run test:int      # pgUpserter against throwaway schema sync_test in tgroup-db
```

The integration test creates and drops schema `sync_test` in the
`tgroup-db` container — it does NOT touch `dbo`. DB credentials read
from the same `.env`.

## Safety & non-negotiables

- **Read-only** on `tamdentist.tdental.vn` — GET requests only.
- No secrets in code / JSON; `.env` is gitignored.
- Target is `tdental_real` on `tgroup-db:55433` only. If `PG_DATABASE`
  differs, a warning is logged but the run continues.
- On fatal error (auth 401/403 after token capture, unrecoverable
  5xx), the run aborts with non-zero exit — `state.json` holds
  everything that committed up to that point.

## Files

```
tools/tdental-delta-sync/
├── src/             orchestrator + modules (TS, ESM)
├── tests/           vitest unit + integration
├── recon/           Phase-1 artifacts (endpoint map, samples, report)
├── endpoint-map.json  copied from recon, mutable going forward
├── .env.example       template — copy to .env
├── package.json
├── tsconfig.json
└── README.md
```
