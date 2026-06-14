# PostgreSQL Patterns Reference Library

> Battle-tested open-source repositories for PostgreSQL migration frameworks, multi-tenant topology, repository patterns, indexing strategies, and audit/ledger patterns.
> Curated for TGClinic (React + Express + PostgreSQL clinic operations platform).

---

## Table of Contents

1. [Migration Frameworks](#1-migration-frameworks)
2. [Multi-Tenant / Multi-Database Topology](#2-multi-tenant--multi-database-topology)
3. [Repository Pattern & Service Layer](#3-repository-pattern--service-layer)
4. [Indexing & Query Optimization](#4-indexing--query-optimization)
5. [Audit Tables & Append-Only Ledger](#5-audit-tables--append-only-ledger)
6. [TGClinic Context & Recommendations](#6-tgclinic-context--recommendations)

---

## 1. Migration Frameworks

### 1a. dbmate — `dbmate/`
- **Repo:** https://github.com/amacneil/dbmate
- **License:** MIT
- **Language:** Go (standalone binary), usable from any language
- **Relevance:** Framework-agnostic, SQL-only migrations, timestamp-versioned filenames, atomic transactions, schema dump (`dbmate dump` → `schema.sql`).
- **Key Files:**
  - `dbmate/README.md` — Full docs, PostgreSQL connection string formats, `search_path` support
  - `dbmate/migration.go` — Core migration execution logic (transaction wrapping, up/down file parsing)
  - `dbmate/db.go` — Database connection and schema dump logic
  - `dbmate/20151129054053_test_migration.sql` — Example SQL migration (`-- migrate:up` / `-- migrate:down`)
- **Why it matters for TGClinic:**
  - TGClinic currently uses hand-rolled numbered SQL files (`api/migrations/000_install_schema_migrations_table.sql`) with a custom `schema_migrations` table.
  - dbmate provides **timestamp-versioned filenames** (avoids merge conflicts), **automatic transaction wrapping**, and **schema.sql dump** for code-review diffs.
  - Supports `search_path` parameter in connection URL — directly relevant to dual-DB (`tdental_demo` / `tcosmetic_demo`) and schema-per-tenant patterns.
- **Idempotent Patterns:**
  - `CREATE TABLE IF NOT EXISTS ...`
  - `CREATE INDEX IF NOT EXISTS ...`
  - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`
  - Guarded `UPDATE ... WHERE status != 'active'` for data migrations

### 1b. node-pg-migrate — `node-pg-migrate/`
- **Repo:** https://github.com/salsita/node-pg-migrate
- **License:** MIT
- **Language:** TypeScript / Node.js
- **Relevance:** PostgreSQL-specific migration tool with JS/TS API and raw SQL fallback. First-class support for PostgreSQL features (indexes, constraints, triggers, RLS policies).
- **Key Files:**
  - `node-pg-migrate/README.md` — Quick start, `pgm.createTable`, `pgm.createIndex`, `pgm.addColumns`
  - `node-pg-migrate/package.json` — Version 9.0.0-alpha.11, Node ≥20.11, PostgreSQL ≥13
  - `node-pg-migrate/createTable.ts` — `CREATE TABLE` with `ifNotExists`, `temporary`, `unlogged`, `partition`, `comment` options
  - `node-pg-migrate/createIndex.ts` — `CREATE INDEX` with `concurrently`, `ifNotExists`, `method` (btree/hash/gist/gin), `where`, `include`, `nulls`
  - `node-pg-migrate/078_add_column_if_not_exists.js` — Idempotent `addColumns` with `{ ifNotExists: true }`
  - `node-pg-migrate/095_index_nulls.js` — Index with `NULLS DISTINCT` / `NULLS NOT DISTINCT` (PostgreSQL 15+)
- **Why it matters for TGClinic:**
  - Native Node.js integration — fits TGClinic's Express stack without external binaries.
  - `pgm.createIndex('posts', 'userId')` generates `CREATE INDEX` with automatic naming.
  - Supports `concurrently: true` for zero-downtime index creation on large tables (critical for 222K appointments, 62K payments).
  - Can execute raw `.sql` files with timestamp prefix for hybrid SQL+JS migration workflows.

---

## 2. Multi-Tenant / Multi-Database Topology

### 2a. django-tenants — `django-tenants/`
- **Repo:** https://github.com/django-tenants/django-tenants
- **License:** MIT
- **Language:** Python / Django
- **Relevance:** The canonical reference for **schema-per-tenant** PostgreSQL multi-tenancy. One database, multiple schemas, middleware-based routing, per-schema migrations.
- **Key Files:**
  - `django-tenants/README.rst` — Architecture overview, shared vs tenant apps, migration commands
  - `django-tenants/middleware/main.py` — `TenantMainMiddleware`: hostname → tenant lookup → `connection.set_tenant(request.tenant)`
  - `django-tenants/routers.py` — `TenantSyncRouter`: routes migrations to shared or tenant schemas based on `settings.SHARED_APPS` / `settings.TENANT_APPS`
  - `django-tenants/postgresql_backend/base.py` — Custom `DatabaseWrapper` that overrides `set_schema()`, `set_schema_to_public()`, `search_path` manipulation
  - `django-tenants/migration_executors/base.py` — `run_migrations()` per schema with `connection.set_schema(schema_name)`, transaction commit/close, progress signals
- **Why it matters for TGClinic:**
  - TGClinic has **two physical databases** (`tdental_demo` and `tcosmetic_demo`) with a dual-pool factory (`api/src/db/index.js`).
  - django-tenants shows how to **route requests to the correct schema/DB** via middleware and **run migrations per tenant**.
  - The `search_path` manipulation and `set_schema()` patterns in `base.py` are directly applicable to TGClinic's `AsyncLocalStorage` LOB context switching.
  - The migration executor pattern (`run_migrations` per schema) shows how to apply the same migration script to multiple schemas/DBs in sequence.

### 2b. drizzle-multitenant — `drizzle-multitenant/`
- **Repo:** https://github.com/mateusflorez/drizzle-multitenant
- **License:** MIT
- **Language:** TypeScript / Node.js / Drizzle ORM
- **Relevance:** Modern **schema-per-tenant** toolkit with LRU connection pool management, parallel migration engine, and drift detection.
- **Key Files:**
  - `drizzle-multitenant/README.md` — Getting started, configuration, CLI commands
  - `drizzle-multitenant/pool.ts` — `PoolManager` class with LRU eviction, health checks, retry logic, metrics. Manages `Pool` instances per tenant schema.
  - `drizzle-multitenant/migrator.ts` — `Migrator` class: parallel migration engine for multi-tenant apps, shared vs tenant schema migration, batch execution, drift detection, seeding
  - `drizzle-multitenant/types.ts` — Config types for `TenantDb`, `SharedDb`, `WarmupOptions`, `RetryConfig`
- **Why it matters for TGClinic:**
  - `PoolManager` with LRU eviction is a **Node.js-native pattern** for managing many tenant connection pools — directly applicable if TGClinic ever moves to schema-per-tenant or adds more LOBs.
  - `Migrator` shows how to run **parallel migrations across multiple tenant schemas** with drift detection — useful for keeping `tdental_demo` and `tcosmetic_demo` schema in sync.
  - The `warmup` and `health-check` patterns are production-grade for high-traffic clinic operations.

---

## 3. Repository Pattern & Service Layer

### express-crud-layered-architecture — `express-crud-layered-architecture/`
- **Repo:** https://github.com/theodevoid/express-crud-layered-architecture
- **License:** Unknown (reference only)
- **Language:** JavaScript / Express / Prisma
- **Relevance:** Minimal but clear example of **Controller → Service → Repository** layering in Express.
- **Key Files:**
  - `express-crud-layered-architecture/src/product/product.repository.js` — Prisma-based repository: `findProducts`, `findProductById`, `insertProduct`, `deleteProduct`, `editProduct`
  - `express-crud-layered-architecture/src/product/product.service.js` — Business logic layer: `getAllProducts`, `getProductById`, `createProduct`, `deleteProductById`, `editProductById`
  - `express-crud-layered-architecture/src/db/index.js` — PrismaClient singleton export
- **Why it matters for TGClinic:**
  - TGClinic currently uses raw `query(text, params)` throughout handlers. This repo shows the **minimal viable repository pattern**:
    - Repository encapsulates all SQL/ORM calls (swappable if DB changes)
    - Service layer handles business logic (validation, error handling, cross-entity coordination)
    - Controller only parses HTTP requests and calls services
  - Adapting this pattern would make TGClinic's dual-DB setup cleaner: each repository could accept a `query` function from `getDb(lob)` instead of importing a global `query`.
  - The Prisma example is easily ported to raw `pg` pools by replacing `prisma.product.findMany()` with `pool.query('SELECT * FROM products')`.

---

## 4. Indexing & Query Optimization

### Sources:
- **node-pg-migrate `createIndex.ts`** — Shows all PostgreSQL index options: `btree`, `hash`, `gist`, `gin`, `concurrently`, `ifNotExists`, `where`, `include`, `nulls`.
- **TGClinic's own `041_add_performance_indexes.sql`** — Already a strong reference in `api/migrations/`. Key patterns:
  - `CREATE INDEX IF NOT EXISTS` (idempotent)
  - `USING gin (name gin_trgm_ops)` for ILIKE text search (pg_trgm extension)
  - Partial indexes: `WHERE customer = true AND isdeleted = false`
  - Composite indexes: `(date, state)` for calendar queries
  - `ANALYZE` after index creation to update planner statistics
- **postgresql-event-sourcing `structure.sql`** — Index patterns for append-only tables:
  - `CREATE INDEX "idx_events_type" ON "events" (type ASC);`
  - `CREATE INDEX "idx_events_uuid" ON "events" (uuid);`
  - `CREATE INDEX "idx_events_inserted_at" ON "events" (inserted_at DESC);`

### Recommendations for TGClinic Large Tables:
| Table | Rows | Current Indexes | Gap Analysis |
|-------|------|-----------------|--------------|
| partners | 35K | trigram (name, phone, namenosign, ref), partial (customer+not deleted) | Consider BRIN on datecreated for time-range reports |
| appointments | 222K | doctorid, state, productid, assistantid, (date, state) | Add covering index for calendar: `(date, state, doctorid, assistantid)` |
| payments | 62K | customer_id, payment_date DESC, service_id, (category, date) | Add partial index for uncategorized payments: `WHERE payment_category IS NULL` |
| saleorders | 61K | partnerid+isdeleted (partial), companyid, doctorid, state, datecreated DESC | Add composite for customer history: `(partnerid, datecreated DESC)` |
| saleorderlines | 63K | orderid, productid, employeeid, datecreated DESC | Add covering index: `(orderid, productid, employeeid, datecreated)` |
| earnings | append-only | — | See §5 Audit/Ledger patterns below |

---

## 5. Audit Tables & Append-Only Ledger

### 5a. postgresql-audit-log — `postgresql-audit-log/`
- **Repo:** https://github.com/asolovey/postgresql-audit-log
- **License:** MIT
- **Language:** PostgreSQL SQL/PLpgSQL
- **Relevance:** Simple, trigger-based audit log for any table. Stores `old_values` and `new_values` as JSONB.
- **Key Files:**
  - `postgresql-audit-log/audit.sql` — Complete audit system:
    - `t_audit_log` table: `date_time`, `transaction_id`, `client_ip`, `identity_id`, `operation`, `table_schema`, `table_name`, `record_id`, `old_values`, `new_values`
    - `f_audit()` trigger function: auto-detects primary key columns, skips specified columns, captures INSERT/UPDATE/DELETE as JSONB
    - `f_revision()` trigger function: auto-increments `revision` column on updates, prevents rollback
    - `__audited` template table: `revision`, `created_on`, `created_by`, `updated_on`, `updated_by`
  - `postgresql-audit-log/README.md` — Usage examples: `CREATE TRIGGER zz_audit AFTER INSERT OR UPDATE OR DELETE ON t_user FOR EACH ROW EXECUTE PROCEDURE f_audit();`
- **Why it matters for TGClinic:**
  - TGClinic has `audit_logs` table (`058_audit_logs.sql`) but no automatic trigger-based capture.
  - This pattern can be applied to **partners**, **appointments**, **payments**, **saleorders** to track who changed what and when.
  - The `transaction_id` column allows grouping all changes in a single transaction — critical for financial consistency.
  - The `f_revision()` pattern prevents concurrent-update overwrites (optimistic locking).

### 5b. postgresql-event-sourcing — `postgresql-event-sourcing/`
- **Repo:** https://github.com/tobyhede/postgresql-event-sourcing
- **License:** Unknown (reference only)
- **Language:** PostgreSQL SQL/PLpgSQL
- **Relevance:** Uses PostgreSQL triggers and functions to implement **event sourcing** natively. Events are append-only; projections are updated transactionally via `AFTER INSERT` triggers.
- **Key Files:**
  - `postgresql-event-sourcing/structure.sql` — `events` table: `id SERIAL PK`, `uuid`, `type`, `body JSONB`, `inserted_at`
  - `postgresql-event-sourcing/trigger.sql` — `AFTER INSERT` triggers on `events` that call projection functions based on `new.type`
  - `postgresql-event-sourcing/functions.sql` — Projection functions: `fn_project_user_create()`, `fn_project_user_update()` — insert/update derived tables from JSONB event body
  - `postgresql-event-sourcing/data.sql` — Sample event inserts and replay loops
  - `postgresql-event-sourcing/README.md` — Full explanation of event → trigger → projection → replay flow
- **Why it matters for TGClinic:**
  - TGClinic's `earnings` table is **append-only** (per domain context). This repo shows how to build a **ledger-style system** where the event log is the source of truth.
  - The `events` table pattern can be adapted for `earnings` (or a separate `earnings_events` table) to track every commission calculation, payout, and adjustment as immutable events.
  - Projection functions can rebuild `earnings` summaries, commission reports, and CTV tier calculations by replaying events.
  - The `inserted_at` + `type` indexing pattern (`idx_events_type`, `idx_events_inserted_at DESC`) is directly applicable to `earnings`.

---

## 6. TGClinic Context & Recommendations

### Current State (from `api/src/db/index.js` and `api/migrations/`)
- **Dual-DB Factory:** Two separate `pg.Pool` instances (dental/cosmetic), routed via `AsyncLocalStorage` (`lobStorage`). `getQuery(reqOrLob)` resolves the correct pool at call-time.
- **Migration Style:** Hand-rolled numbered SQL files (`000_` to `065_`), applied via a custom `schema_migrations` tracking table (`filename TEXT PRIMARY KEY`, `applied_at`, `hash`).
- **Large Tables:** `partners` (35K), `appointments` (222K), `payments` (62K), `saleorders` (61K), `saleorderlines` (63K).
- **Audit:** `audit_logs` table exists (`058_audit_logs.sql`) but is manually populated, not trigger-based.
- **Append-Only:** `earnings` table is append-only but lacks formal event-sourcing structure.

### Recommendations

#### A. Migration Hygiene (Short-Term)
1. **Adopt `CREATE ... IF NOT EXISTS` in every migration.** TGClinic already does this well (`041_add_performance_indexes.sql`). Continue and enforce.
2. **Add `BEGIN; ... COMMIT;` wrappers** around multi-statement migrations (e.g., `058_audit_logs.sql` already does this).
3. **Consider timestamp-versioned filenames** instead of sequential numbers (`065_` → `20240614_120000_`). Prevents merge conflicts when multiple developers add migrations.
4. **Keep a `schema.sql` dump** in version control (like dbmate's `dbmate dump`). Enables diff-based code review of schema changes.
5. **Add migration hash verification** — TGClinic already has a `hash` column in `schema_migrations`. Verify on deploy to detect tampering.

#### B. Dual-DB Safety (Medium-Term)
1. **No Cross-DB SQL.** TGClinic already enforces this (two separate pools, no JOINs across `tdental_demo`/`tcosmetic_demo`). Document this as an invariant.
2. **Schema Sync Check.** Add a CI step that compares `pg_dump --schema-only` output of both DBs after migration runs. Flag drift immediately.
3. **Transaction Boundaries.** When an operation touches both DBs (e.g., copying a partner record), wrap each side in a transaction but implement **compensating actions** (Saga pattern) if the second DB fails. Do not attempt true 2PC without XA support.
4. **Connection Pool Limits.** Set `max` pool size per DB based on traffic. With 222K appointments, calendar queries can spike concurrent connections.

#### C. Repository Pattern (Medium-Term)
1. **Extract repositories from handlers.** Instead of `const { query } = require('../db')` in every route, create `src/repositories/partner.repository.js` that accepts a `query` function.
2. **Service layer for business logic.** Move validation, permission checks, and cross-entity coordination out of route handlers into `src/services/`.
3. **Testability.** With repository interfaces, tests can inject an in-memory fake instead of hitting PostgreSQL.

#### D. Audit & Ledger (Long-Term)
1. **Trigger-based audit for critical tables.** Apply `asolovey/postgresql-audit-log` pattern to `payments`, `saleorders`, `partners` (especially CTV hierarchy changes).
2. **Event-sourced earnings.** Consider migrating `earnings` to an `earnings_events` table (append-only) with projection functions. This enables:
   - Replay for bug fixes (recalculate commissions after rule change)
   - Immutable audit trail for financial compliance
   - Parallel projection for different reporting views
3. **Materialized views for projections.** Use PostgreSQL materialized views (refreshed on schedule) for commission summaries, CTV tier reports, and earnings dashboards.

#### E. Indexing Strategy (Ongoing)
1. **Monitor slow queries** with `pg_stat_statements` and `EXPLAIN ANALYZE`.
2. **Add `CONCURRENTLY` for new indexes on large tables** to avoid table locks during peak hours.
3. **Consider partial indexes** for common filtered queries (e.g., `WHERE isdeleted = false`).
4. **BRIN indexes** for append-only time-series data (e.g., `earnings.created_at`).

---

## License Summary

| Repository | License | Commercial Use |
|------------|---------|----------------|
| dbmate | MIT | ✅ |
| node-pg-migrate | MIT | ✅ |
| django-tenants | MIT | ✅ |
| drizzle-multitenant | MIT | ✅ |
| postgresql-audit-log | MIT | ✅ |
| postgresql-event-sourcing | Unknown | ⚠️ Review before use |
| express-crud-layered-architecture | Unknown | ⚠️ Review before use |

---

*Last updated: 2026-06-14 by PostgresRef (TGClinic research swarm)*
