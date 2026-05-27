# Agent 2 Finish Check: Cosmetic LOB v2 DB / Bootstrap / Seed

Date: 2026-05-19
Worktree: `/Users/thuanle/Documents/TamTMV/Tgrouptest/.worktrees/feat-cosmetic-line-of-business`
Role: DB/bootstrap verification only
Write scope honored: only this file was written.

## Executive Result

FAIL for final readiness because the authority gate script is missing in this worktree and the local databases do not expose `dbo.schema_migrations`, so migration tracking cannot be proven even though the v2 schema objects/columns are present.

PASS for local DB shape and script static runnability: `tdental_demo` and `tcosmetic_demo` are reachable on `127.0.0.1:5433`, both contain the expected LOB columns plus `earnings`, `payouts`, `referral_locks`, and `consultations`, and both bootstrap/seed scripts pass syntax checks.

## Commands Run

```bash
bash scripts/prompt-authority-check.sh
```

Result: FAIL. `bash: scripts/prompt-authority-check.sh: No such file or directory`

```bash
git status --short
git branch --show-current
git rev-parse --show-toplevel
```

Result: PASS. Confirmed branch `feat/cosmetic-line-of-business` and top-level worktree `/Users/thuanle/Documents/TamTMV/Tgrouptest/.worktrees/feat-cosmetic-line-of-business`. Worktree is heavily dirty from other agents; no production code was changed by this check.

```bash
sed -n '1,260p' AGENTS.md
sed -n '1,260p' product-map/domains/business-unit.yaml
sed -n '1,260p' product-map/domains/cosmetic.yaml
sed -n '1,260p' product-map/domains/cosmetic-clients.yaml
sed -n '1,260p' product-map/domains/ctv.yaml
sed -n '1,280p' product-map/domains/earnings-commissions.yaml
rg -n "047|cosmetic|LOB|lob_scope|is_ctv|earnings|partners|tcosmetic|tdental|bootstrap|seed" product-map/schema-map.md docs/MIGRATIONS.md docs/DATA-MODEL.md
```

Result: PASS. Authority docs confirm the intended v2 model: two physical DBs, `partners` as canonical identity/auth, `lob_scope`/`is_ctv` on `partners`, transactional `earnings` in both DBs, and `getDb(lob)` as the access boundary.

```bash
sed -n '1,260p' api/scripts/bootstrap-cosmetic-db.sh
sed -n '1,760p' api/scripts/seed-cosmetic-lob.js
sed -n '1,320p' api/migrations/047_add_cosmetic_lob_v2_dental_additive.sql
sed -n '1,260p' api/migrations/047_add_lob_scope_is_ctv_to_partners.sql
bash -n api/scripts/bootstrap-cosmetic-db.sh
node --check api/scripts/seed-cosmetic-lob.js
test -d api/node_modules/pg && echo pg-present || echo pg-missing
test -d api/node_modules/bcryptjs && echo bcryptjs-present || echo bcryptjs-missing
```

Result: PASS for static runnability. `bash -n` and `node --check` returned 0; `pg` and `bcryptjs` are installed under `api/node_modules`.

```bash
PGPASSWORD=postgres pg_isready -h 127.0.0.1 -p 5433 -U postgres
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -tAc "SELECT datname FROM pg_database WHERE datname IN ('tdental_demo','tcosmetic_demo') ORDER BY datname;"
```

Result: PASS. Local Postgres is accepting connections; both `tdental_demo` and `tcosmetic_demo` exist.

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -tAc "SELECT table_name FROM information_schema.tables WHERE table_schema='dbo' AND table_name IN ('partners','products','earnings','payouts','referral_locks','consultations','schema_migrations') ORDER BY table_name;"
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tcosmetic_demo -tAc "SELECT table_name FROM information_schema.tables WHERE table_schema='dbo' AND table_name IN ('partners','products','earnings','payouts','referral_locks','consultations','schema_migrations') ORDER BY table_name;"
```

Result: PARTIAL PASS. Both DBs returned `consultations`, `earnings`, `partners`, `payouts`, `products`, and `referral_locks`. Neither DB returned `schema_migrations`.

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -tAc "SELECT column_name||':'||data_type FROM information_schema.columns WHERE table_schema='dbo' AND table_name='partners' AND column_name IN ('lob_scope','is_ctv','referred_by_ctv_id') ORDER BY column_name; SELECT column_name||':'||data_type FROM information_schema.columns WHERE table_schema='dbo' AND table_name='products' AND column_name='commission_rate_percent';"
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tcosmetic_demo -tAc "SELECT column_name||':'||data_type FROM information_schema.columns WHERE table_schema='dbo' AND table_name='partners' AND column_name IN ('lob_scope','is_ctv','referred_by_ctv_id') ORDER BY column_name; SELECT column_name||':'||data_type FROM information_schema.columns WHERE table_schema='dbo' AND table_name='products' AND column_name='commission_rate_percent';"
```

Result: PASS. Both DBs contain `is_ctv:boolean`, `lob_scope:ARRAY`, `referred_by_ctv_id:uuid`, and `commission_rate_percent:numeric`.

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='dbo' AND table_type='BASE TABLE'; SELECT 'partners='||COUNT(*) FROM dbo.partners; SELECT 'earnings='||COUNT(*) FROM dbo.earnings;"
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tcosmetic_demo -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='dbo' AND table_type='BASE TABLE'; SELECT 'partners='||COUNT(*) FROM dbo.partners; SELECT 'earnings='||COUNT(*) FROM dbo.earnings;"
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo -tAc "SELECT 't_admin_scope='||COUNT(*) FROM dbo.partners WHERE email='t@clinic.vn' AND lob_scope @> ARRAY['cosmetic']; SELECT 'ctv_demo='||COUNT(*) FROM dbo.partners WHERE email='ctv-demo@clinic.vn' AND is_ctv IS TRUE;"
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tcosmetic_demo -tAc "SELECT 'employees='||COUNT(*) FROM dbo.partners WHERE employee=true; SELECT 'customers='||COUNT(*) FROM dbo.partners WHERE customer=true; SELECT 'products='||COUNT(*) FROM dbo.products; SELECT 'payments='||COUNT(*) FROM dbo.payments; SELECT 'earnings='||COUNT(*) FROM dbo.earnings;"
```

Result: PASS for current local seed state. Dental has 42 dbo base tables, 36,103 partners, and 6 earnings. Cosmetic has 42 dbo base tables, 14 partners, and 3 earnings. `t@clinic.vn` has cosmetic scope and `ctv-demo@clinic.vn` exists with `is_ctv=true`. Cosmetic has 6 employees, 8 customers, 10 products, 6 payments, and 3 earnings.

## Migration 047 Coverage

PASS:
- `047_add_cosmetic_lob_v2_dental_additive.sql` covers the required additive partner columns: `lob_scope`, `is_ctv`, `referred_by_ctv_id`.
- It covers `products.commission_rate_percent`.
- It creates transactional `earnings` and `payouts`.
- It creates `referral_locks` and `consultations`.
- It records rollback comments for the new columns/tables.
- Local read-only probes confirm the key columns and tables already exist in both local DBs.

FAIL / Needs cleanup before final readiness:
- There are two migration files using number `047`: `047_add_cosmetic_lob_v2_dental_additive.sql` and `047_add_lob_scope_is_ctv_to_partners.sql`. The second appears redundant/legacy and is not listed in `docs/MIGRATIONS.md`.
- `047_add_cosmetic_lob_v2_dental_additive.sql` inserts into `dbo.schema_migrations`, but the probed local DBs do not currently show a `schema_migrations` table in `dbo`; if this table is absent at apply time, the final tracking insert fails even though earlier DDL may already have run.
- The file comments say `referral_locks` is dental-only and `consultations` is cosmetic-only, but the migration is documented/applied to both DBs and creates both tables on both DBs. This is probably harmless for local route reuse, but it should be consciously accepted or split.
- `product-map/schema-map.md` still has one stale line saying `recipient_user_id -> users`; the actual migration and DATA-MODEL use `recipient_partner_id` and `partners`.

## Bootstrap Script Check

PASS:
- `api/scripts/bootstrap-cosmetic-db.sh` is executable and passes `bash -n`.
- It targets only local Postgres defaults: `127.0.0.1:5433`, `tdental_demo`, `tcosmetic_demo`.
- It creates `tcosmetic_demo` from a schema-only dump of `tdental_demo.dbo`.
- It performs table-count verification and sets `search_path = dbo, public`.

WARN:
- The script drops and recreates `tcosmetic_demo`, so I did not run it during this finishing check.
- The script intentionally swallows many `psql` load errors and only warns if the cosmetic table count is low; a stricter verification query for required core tables should be added before calling bootstrap fully PASS.
- `pg_dump` redirects stderr into the SQL dump file with `> "$DUMP_FILE" 2>&1`; any warning text from `pg_dump` could be written into the SQL input.

## Seed Script Check

PASS:
- `api/scripts/seed-cosmetic-lob.js` passes `node --check`.
- Required packages `pg` and `bcryptjs` are installed.
- It represents the two-DB discipline with separate `DENTAL_URL` and `COSMETIC_URL` pools.
- It seeds/ensures dental-side auth truth: `t@clinic.vn` gets `lob_scope = ARRAY['dental','cosmetic']`; `ctv-demo@clinic.vn` gets `is_ctv=true` and no LOB scope.
- It grants the nine v2 permission keys to the Admin group and CTV self permissions to the demo CTV via overrides.
- It seeds cosmetic data into `tcosmetic_demo` only, using `partners` for cosmetic clients/staff to match current mirror route reuse.
- It attempts real CTV transaction demo data in both DBs without cross-DB SQL.
- Current local read-only probes show the seed story has already produced usable local data: cosmetic employees/customers/products/payments/earnings are present, and the dental auth users/scopes are present.

WARN:
- The top script comment says it seeds companies, appointments, sale orders, and payments; the body explicitly skips companies and appointments/payment seed in `seedCosmeticData()`. Later `ensureCtvDemoTransactionData()` inserts payments/earnings, so the comment is partly stale and should be tightened.
- The fallback direct earnings insert uses a sentinel zero UUID when no `saleorderlines` row exists; because `earnings.service_line_id` has an FK to `saleorderlines`, that fallback can still fail on a newly bootstrapped empty DB unless at least one sale order line exists.
- The direct fallback creates real earnings even if the engine path fails, which is useful for demo data but weaker as proof that payment collection triggered the engine.
- The script is not fully idempotent for transaction demo data because each run can create additional payments/earnings after selecting random customers.

## Two-DB Discipline / Canonical Tables

PASS:
- Authority docs and code agree that `partners` is canonical identity/auth; no `users` table is required for LOB scoping or CTV flags.
- `api/src/db/index.js` exposes `getDb('dental'|'cosmetic')`, separate pools, and an AsyncLocalStorage LOB context for mirror-route reuse.
- `commissionEngine.js` writes to `getDb(lob)` and uses `recipient_partner_id`, not a `users` table.
- `ctv`/earnings model is API-composition oriented; no cross-DB SQL was found in the checked bootstrap/seed/migration flow.

WARN:
- Some domain docs still use business words like `clients` and `staff`, while the local implementation and migration use mirrored `partners` in cosmetic. That can be acceptable for route reuse, but the docs should consistently call out business terminology vs physical table names.

## Local Verification Still Missing

Required before final readiness:
1. Restore or add the prompt authority script in this worktree, or document why this branch intentionally lacks `scripts/prompt-authority-check.sh`.
2. Run `000_install_schema_migrations_table.sql` or otherwise restore `dbo.schema_migrations` in both local DBs, then prove migration 047 is tracked.
3. Decide whether to keep both `047_*` files; if yes, list both in `docs/MIGRATIONS.md`; if no, remove/retire the redundant one in a coordinated code-owner pass.
4. Run a destructive bootstrap test only against a disposable local clone, because `bootstrap-cosmetic-db.sh` drops `tcosmetic_demo`.
5. After bootstrap, run migration 047 on both DBs from a clean state and capture:
   - required table list,
   - required column list,
   - `schema_migrations` row,
   - table count parity,
   - rollback dry-run on a clone.
6. Run the seed script from a clean post-bootstrap/post-migration state and verify that CTV earnings are created by the engine path, not only by fallback direct insert.
7. Add/verify a check that no cosmetic seed rows land in dental except the intended dental auth/CTV/scope data.

## Final PASS/FAIL

Final status: FAIL for release readiness, PASS for current local DB presence and static script runnability.

Main blockers: missing prompt gate script, missing visible `dbo.schema_migrations`, duplicate migration number 047, and unproven clean bootstrap-to-seed flow from an empty `tcosmetic_demo`.
