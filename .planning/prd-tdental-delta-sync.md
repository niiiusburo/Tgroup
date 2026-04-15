# PRD — TDental Delta Sync (tamdentist.tdental.vn → local `tdental_real`)

## Problem Statement

Our local Postgres `tdental_real` (5.6 GB, on Docker container `tgroup-db` port 55433) is a snapshot of the TDental clinic's production database loaded from a `.bak` dated 2026-02-23. Business tables (partners, saleorders, dotkhams, accountpayments, appointments, etc.) have no data after **2026-02-22**. The clinic has continued to operate since then, so our local DB is now ~50 days behind reality. The dashboards and exports we build on top of `tdental_real` show stale numbers and miss customers created, services rendered, and payments collected after that date.

There is no `.bak` newer than 2026-02-23 available to us, and no existing script on the VPS syncs live data into Postgres — the only pipeline that exists (`mssql-restore.sh` → `export_to_pg.py` → `pg_import.sh`) reads a static `.bak` file. Getting a newer `.bak` from production IT is slow/uncertain. The live admin UI at `https://tamdentist.tdental.vn` is accessible to us with admin credentials and is the fastest source of ground truth for the missing window.

## Solution

Build a single local command-line script that logs into the TDental admin UI once with an admin account, captures the API bearer token the SPA uses, then pulls every row changed or created after **2026-02-22** directly from the same JSON endpoints the SPA calls, and upserts them into `tdental_real`. After the script finishes, `tdental_real` contains live-equivalent business data through the current date, minus the accounting-journal tables which are not business-visible and not needed by downstream reports.

The user runs it once (`./sync-delta`), watches a progress report, and at the end sees a summary per table of inserted / updated / failed rows. No cron, no background process — a one-shot catch-up tool the user invokes when they want fresh data.

## User Stories

1. As the TGroup dashboard developer, I want a one-shot CLI command that brings `tdental_real` fully up to date, so that the dashboards I build show current clinic numbers instead of stale Feb data.
2. As the TGroup dashboard developer, I want the script to preserve any row that already exists in my local DB that is not present in the source (i.e. delete-safe), so that local edits or reference rows are not lost.
3. As the TGroup dashboard developer, I want rows that exist in both to be overwritten with the source version, so that status transitions (e.g. a saleorder going from draft → sale, payment residual changing) are reflected locally.
4. As the TGroup dashboard developer, I want to re-run the sync script safely at any time, so that I can re-catch-up whenever I want without worrying about corrupting my DB.
5. As the TGroup dashboard developer, I want the script to stop on the first unrecoverable error and print a clear message, so that I can debug rather than silently getting partial data.
6. As the TGroup dashboard developer, I want the script to checkpoint per table, so that if the laptop sleeps or the VPN drops, resuming starts from the next unfinished table rather than the beginning.
7. As the TGroup dashboard developer, I want a `--dry-run` mode that fetches from the source but does not write to Postgres, so that I can verify the row counts and table coverage before committing.
8. As the TGroup dashboard developer, I want a `--only=tableA,tableB` flag, so that I can sync a single table for debugging or narrow re-runs.
9. As the TGroup dashboard developer, I want a `--since=YYYY-MM-DD` flag that overrides the default 2026-02-22 cutoff, so that I can do narrow incremental syncs in future runs.
10. As the TGroup dashboard developer, I want the script to log every HTTP request and Postgres statement at debug level on demand, so that I can reproduce issues without re-running the scraper.
11. As the TGroup dashboard developer, I want the script's login step to use the known admin credentials stored in a local `.env` file, so that credentials are not committed to git.
12. As the TGroup dashboard developer, I want the script to refuse to run if the admin credentials are missing or the SPA login flow returns anything other than a valid bearer token, so that I am never left thinking a sync "worked" when it silently degraded to unauthenticated requests.
13. As the TGroup dashboard developer, I want a tabular summary at the end (table name, fetched, inserted, updated, skipped, errored, elapsed), so that I can at-a-glance validate the sync.
14. As the TGroup dashboard developer, I want the script to write its summary to a timestamped markdown file on disk, so that I have a record of each sync run.
15. As the TGroup dashboard developer, I want the script to skip accounting-journal tables explicitly (`accountmoves`, `accountmovelines`, `accountjournals`, `accountfullreconciles`, `accountpartialreconciles`, `accountregisterpayments`, `accountregisterpaymentinvoicerel`), so that the database doesn't bloat with audit rows I don't display.
16. As the TGroup dashboard developer, I want `accountpayments` and `accountinvoices` included (they are business-facing money records), so that payment and billing screens show complete data.
17. As the TGroup dashboard developer, I want pagination to be automatic and invisible, so that I don't have to reason about page size when calling the tool.
18. As the TGroup dashboard developer, I want the script to throttle itself politely (sub-2 requests/second default, configurable), so that I don't risk my admin account being rate-limited or locked.
19. As the TGroup dashboard developer, I want each table's upsert to run inside its own Postgres transaction, so that a mid-table failure never leaves a half-written table behind.
20. As the TGroup dashboard developer, I want row counts per table before and after the sync printed side-by-side, so that I can see at a glance how much delta came in.
21. As the TGroup dashboard developer, I want the endpoint map (table → API URL → delta filter) to live in a human-readable JSON file, so that I can edit it when the source adds new endpoints without touching code.
22. As the TGroup dashboard developer, I want a reconnaissance mode (`--recon`) that uses Playwright to navigate the admin UI, capture every XHR, and write new endpoint entries to the endpoint map, so that first-time mapping is not manual drudgery.
23. As the TGroup dashboard developer, I want the hybrid architecture (Playwright only for login + optional recon, pure HTTP for every bulk pull), so that a 30,000-row customer sync takes seconds, not hours.
24. As the TGroup dashboard developer, I want the JSON→SQL field mapper to be table-specific and unit-testable, so that schema quirks (camelCase JSON vs lowercase SQL, nested objects, date string formats) are caught by tests and not at 2 AM.
25. As the TGroup dashboard developer, I want invalid or unmappable rows to be written to a `sync-errors-<timestamp>.jsonl` file rather than crash the run, so that partial sync succeeds and I can inspect failures offline.
26. As the TGroup dashboard developer, I want the script to run on macOS against the existing Docker Postgres at `127.0.0.1:55433` without additional infrastructure, so that I don't need to stand up anything new to use it.
27. As the TGroup dashboard developer, I want the script's dependencies minimal and vendored into this project's repo (or a subdirectory thereof), so that the tool is self-contained.
28. As the TGroup dashboard developer, I want the script to detect foreign-key ordering and sync parents before children (e.g. `partners` before `saleorders` before `saleorderlines`), so that upserts don't fail on missing referenced rows.
29. As the TGroup dashboard developer, I want the script to verify a successful end state with a final sanity SELECT per table (row count + max date), so that I can see the gap is actually closed before I trust dashboards.
30. As the TGroup dashboard developer, I want the script's sync boundary (Feb 22 2026) visibly stored in a small state file, so that subsequent runs can default to "since the last run" rather than re-pulling 50 days every time.

## Implementation Decisions

- **Hybrid architecture.** Login and token capture happen in a headless Chromium via Playwright. Every bulk data fetch uses pure HTTP(S) with the captured bearer token. Playwright is never used for data scraping beyond the initial login-and-capture step.
- **Six deep modules**, each independently testable and replaceable:
  - **AuthCapture** — given admin username/password, returns `{ bearerToken, baseUrl, cookies, tokenExpiry }`. Encapsulates Angular SPA login flow.
  - **EndpointMap** — a JSON data file mapping each table to `{ url, delta_filter_param, id_field, required_params }`. Human-editable. No runtime logic.
  - **ApiClient** — given auth + endpoint + `since` date, yields pages of rows as an async iterator. Owns retry (exponential backoff on 429/5xx), throttling, and pagination. Backend-agnostic.
  - **FieldMapper** — pure function: `(tableName, apiRows) → pgRows`. Per-table coercion rules (JSON camelCase → SQL lowercase, nested object flattening to FK ids, ISO 8601 → PG timestamp, nullable handling).
  - **PgUpserter** — given `(tableName, pgRows)`, executes a batched `INSERT ... ON CONFLICT (id) DO UPDATE SET ... = EXCLUDED.*` inside a single transaction per table. Returns counts.
  - **SyncOrchestrator** — reads config, iterates tables in topological (FK) order, drives ApiClient → FieldMapper → PgUpserter per table, maintains a checkpoint file so reruns resume.
- **Delta filter.** Default `since = 2026-02-22`. For each table, the orchestrator prefers a server-side filter on `lastupdated` / `datecreated` / `writedate` when the endpoint supports it; falls back to client-side filter on the same fields when it does not. The endpoint map records which strategy each table uses.
- **Conflict strategy.** Always `UPSERT BY id`. If a row exists locally, overwrite every column from the source. Rows that exist locally but not remotely are left alone (no deletes).
- **Table scope.** All tables the admin UI exposes *except* the accounting-journal family: `accountmoves`, `accountmovelines`, `accountjournals`, `accountfullreconciles`, `accountpartialreconciles`, `accountregisterpayments`, `accountregisterpaymentinvoicerel`. `accountpayments` and `accountinvoices` are *included* — they are business-facing, not journal bookkeeping.
- **FK-aware ordering.** The orchestrator sorts tables by a dependency graph derived from the existing Postgres FKs (introspected at startup) so parents sync before children.
- **Idempotent.** Re-running the script produces the same end state. No "last-run" side effect is required for correctness; a state file is an optimization to skip already-caught-up tables on the next run.
- **Reconnaissance mode.** `--recon` invokes Playwright to walk the admin UI's main screens (customer list, appointment list, saleorder list, payment list, etc.), records every XHR URL + query schema, and appends unknown tables to the endpoint map as draft entries for human review.
- **Configuration surface.** Admin credentials, Postgres connection, throttle rate, and `since` date all via environment variables in a local `.env` file. No secrets in code or in the endpoint map.
- **Checkpointing.** After each table completes successfully, the orchestrator writes the table name + row count + timestamp to a state file. On interrupted re-run the orchestrator skips any table whose state entry is newer than the run's `since` date.
- **Error handling.** Unmappable rows (field mapper returns a validation error) are written to `sync-errors-<timestamp>.jsonl` and counted as "errored" in the summary; the table still commits the mappable rows. HTTP 5xx / 429 responses are retried with exponential backoff up to 5 attempts. Any unrecoverable auth error (401/403 after token refresh) aborts the entire run with a clear message.
- **Output.** A markdown summary file `sync-report-<timestamp>.md` is written to the tool's working directory listing, per table: rows fetched, inserted, updated, errored, elapsed seconds, before/after row count in Postgres, and max-date-observed before/after.
- **No live connection to VPS.** Nothing in this script talks to `72.62.148.50` — the VPS is ignored. Source is `https://tamdentist.tdental.vn` only. Target is local Docker Postgres `tgroup-db:55433` only.

## Testing Decisions

- **A good test here asserts external behavior only** — given a JSON fixture, what rows land in the DB; given a row already present in the DB, what the UPSERT does. Tests do not peek at private method names, do not assert on log strings, do not mock Postgres with a fake. They use real Postgres (a throwaway Docker container) for integration tests and pure Python/TS for unit tests of the mapper.
- **FieldMapper** (unit tests). Load a set of representative JSON responses from the admin UI (saved as fixture files for `partners`, `saleorders`, `saleorderlines`, `dotkhams`, `appointments`, `accountpayments`, `accountinvoices`, `customerreceipts`). For each, assert that `mapRows(tableName, fixture)` produces rows matching a hand-verified expected output. Covers: camelCase→lowercase keys, nested `{partner: {id: "..."}}` → `partnerid`, ISO timestamps, nulls, numeric precision, Vietnamese strings round-tripping without mojibake.
- **PgUpserter** (integration tests). Spin up a disposable Postgres container (reuse existing project pattern if one exists; otherwise `testcontainers` or a pre-seeded Docker compose). For each of the same tables: seed N existing rows, call `upsert` with a mix of (a) new ids, (b) existing ids with changed columns, (c) existing ids with identical columns, and assert the returned `{inserted, updated, skipped}` counts and the resulting DB state. Covers: FK violations handled, transaction rollback on error, batch sizing, correct `ON CONFLICT` key selection when a table has a composite primary key.
- **Prior art in the codebase.** The TGroup project already has Playwright E2E tests under `website/e2e/` with an auth fixture using `tg@clinic.vn / 123456` — the AuthCapture module can use the same Playwright setup pattern. The backend `tdental-api` already uses `pg` directly against port 55433 — the PgUpserter module should use the same connection config convention. Fixture files for JSON bodies can follow the same shape as test fixtures used in `website/e2e`.
- **No tests** for AuthCapture, ApiClient, SyncOrchestrator, EndpointMap. AuthCapture is end-to-end only, exercised every real run. ApiClient's retry and pagination are covered by running the sync against the live site. SyncOrchestrator is covered by running the script in `--dry-run` mode. EndpointMap is a JSON file, not code.

## Out of Scope

- Writing data *to* the source. This tool never POST/PUT/PATCH/DELETEs on `tamdentist.tdental.vn`. Read-only.
- Syncing any accounting-journal table (see exclusion list above).
- Live/continuous sync (CDC, streaming, websocket listener). One-shot CLI only.
- Running on a schedule via cron, systemd, or GitHub Actions. The script is cron-safe (idempotent) but wiring a scheduler is a separate task.
- Replacing the existing `mssql-restore.sh` / `export_to_pg.py` / `pg_import.sh` `.bak`-based pipeline. That pipeline remains the canonical bootstrapping path for a fresh Postgres from a new `.bak`. This tool is strictly for topping up from the admin UI.
- Syncing into `tdental_demo` or any VPS-hosted Postgres. Target is local `tdental_real` only.
- Migrating schema. If the source has added new columns or tables since our `.bak`, we log them and skip — schema migration is a human task handled separately.
- Cleaning up or reconciling the gutted VPS `tdental` DB (empty `accountpayments`, empty `saleorderpaymenthistorylines`, partial `saleorderlines`). That VPS DB is irrelevant to this work.
- Browser scraping beyond the initial token capture. No page-clicking-driven data extraction.

## Further Notes

- Admin credentials (`admin / 123123@`) are known to work against the source. They are stored in a local `.env` file, never committed.
- The source is an **Angular 4.4.6 SPA** (`gc-statics.tdental.vn/resources/4.4.6.prod-2/...`). All data flows via JSON XHR to the same backend — which we infer from the schema is an ASP.NET / EF Core service on top of Postgres / MSSQL. We do not need to know the backend specifics; we call whatever URLs the SPA calls, with whatever auth header it sends.
- The local target `tdental_real` in container `tgroup-db` is already populated with the 2026-02-23 snapshot (5.6 GB). Doing a delta sync changes a small fraction of rows; disk growth should be well under 1 GB.
- Reconnaissance (first `--recon` pass) is expected to take a human ~30 minutes of review to confirm the draft endpoint entries before the first real sync run. After that, sync runs are unattended.
- The existing `tdental_demo` DB (used by the TGroup dashboard today) is not touched. A separate follow-up task will switch the dashboard's backing DB from `tdental_demo` to `tdental_real` once this sync brings `tdental_real` current.
- The tool should live in a self-contained subdirectory (e.g. `tools/tdental-delta-sync/`) inside the TGroup repo so it shares versioning with the rest of the project but is easy to extract later if needed.
