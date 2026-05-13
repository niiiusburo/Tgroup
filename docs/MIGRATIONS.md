# TGroup Clinic — Migration Log

> Schema migration log with up/down/rollback notes. Manual SQL migration system (no ORM runner).

## Migration System Rules

1. Every migration file is idempotent: use `IF NOT EXISTS` for CREATE, `IF EXISTS` for DROP/ALTER.
2. Migrations are applied manually via `psql` (Docker or direct).
3. There is no auto-down migration. Rollback requires writing and running a reverse script.
4. Track applied migrations in `dbo.schema_migrations` (installed by `000_install_schema_migrations_table.sql`).

## Migration Index

| # | File | Description | Up | Down / Rollback | Applied On |
|---|---|---|---|---|---|
| 000 | `000_install_schema_migrations_table.sql` | Creates `schema_migrations` tracking table | `CREATE TABLE schema_migrations (...)` | `DROP TABLE schema_migrations` | Baseline |
| 001 | `001_add_face_columns.sql` | Adds `face_subject_id`, `face_registered_at` to `partners` | `ALTER TABLE partners ADD COLUMN ...` | `ALTER TABLE partners DROP COLUMN face_subject_id, face_registered_at` | 2025-12 |
| 001 | `001_company_bank_settings.sql` | Creates `company_bank_settings` | `CREATE TABLE company_bank_settings (...)` | `DROP TABLE company_bank_settings` | 2025-12 |
| 002 | `002_payment_proofs.sql` | Creates `payment_proofs` | `CREATE TABLE payment_proofs (...)` | `DROP TABLE payment_proofs` | 2025-12 |
| 003 | `003_payment_allocations.sql` | Creates `payment_allocations` | `CREATE TABLE payment_allocations (...)` | `DROP TABLE payment_allocations` | 2025-12 |
| 004 | `004_payment_plan_items.sql` | Creates `monthlyplan_items` | `CREATE TABLE monthlyplan_items (...)` | `DROP TABLE monthlyplan_items` | 2026-01 |
| 005 | `005_employee_location_scope.sql` | Creates `employee_location_scope` | `CREATE TABLE employee_location_scope (...)` | `DROP TABLE employee_location_scope` | 2026-01 |
| 006 | `006_dotkham_payment_allocations.sql` | Adds `dotkham_id` to `payment_allocations` | `ALTER TABLE payment_allocations ADD COLUMN dotkham_id ...` | `ALTER TABLE payment_allocations DROP COLUMN dotkham_id` | 2026-01 |
| 006 | `006_fix_location_scope_column.sql` | Column rename/fix | `ALTER TABLE ... RENAME COLUMN ...` | Reverse rename | 2026-01 |
| 007 | `007_add_external_checkups_permission.sql` | Adds permission strings for external checkups | `INSERT INTO group_permissions ...` | `DELETE FROM group_permissions WHERE permission_string IN (...)` | 2026-02 |
| 008 | `008_data_migration_from_tdental.sql` | TDental import schema adjustments (v1) | Multiple ALTER TABLE | Reverse per column | 2026-02 |
| 008 | `008_data_migration_from_tdental_v2.sql` | TDental import schema adjustments (v2) | Multiple ALTER TABLE | Reverse per column | 2026-02 |
| 008 | `008_data_migration_from_tdental_v3.sql` | TDental import schema adjustments (v3) | Multiple ALTER TABLE | Reverse per column | 2026-02 |
| 011 | `011_fix_payment_proofs_type.sql` | Type correction on `payment_proofs` | `ALTER TABLE payment_proofs ALTER COLUMN ...` | Reverse type | 2026-02 |
| 012 | `012_add_cskhid_salestaffid.sql` | Adds `cskhid` and `salestaffid` to `partners` | `ALTER TABLE partners ADD COLUMN ...` | `ALTER TABLE partners DROP COLUMN cskhid, salestaffid` | 2026-02 |
| 013 | `013_add_employee_role_fields.sql` | Adds `isdoctor`, `isassistant`, `isreceptionist` | `ALTER TABLE partners ADD COLUMN ...` | `ALTER TABLE partners DROP COLUMN ...` | 2026-03 |
| 014 | `014_payment_per_record.sql` | Per-record payment tracking columns | `ALTER TABLE payments ADD COLUMN ...` | `ALTER TABLE payments DROP COLUMN ...` | 2026-03 |
| 015 | `015_deposit_receipts.sql` | Receipt number generation support | `CREATE SEQUENCE receipt_sequences_YYYY ...` | `DROP SEQUENCE ...` | 2026-03 |
| 016 | `016_saleorder_status_audit.sql` | Creates `saleorder_state_logs` | `CREATE TABLE saleorder_state_logs (...)` | `DROP TABLE saleorder_state_logs` | 2026-03 |
| 017 | `017_monthlyplan_constraints.sql` | Plan/installment constraints | `ALTER TABLE monthlyplans ADD CONSTRAINT ...` | `ALTER TABLE monthlyplans DROP CONSTRAINT ...` | 2026-04 |

**Total migrations:** 54 files in `api/migrations/`.

## Rollback Procedures

### Generic Rollback Steps

1. Identify the migration to roll back.
2. Write a reverse SQL script (or use the "Down" column above).
3. Run the reverse script against the target database.
4. Remove the migration entry from `schema_migrations` if tracking is used.
5. Verify no application code depends on the rolled-back schema.

### Example: Rollback `001_add_face_columns.sql`

```sql
-- rollback-001.sql
ALTER TABLE partners DROP COLUMN IF EXISTS face_subject_id;
ALTER TABLE partners DROP COLUMN IF EXISTS face_registered_at;
```

```bash
docker exec -i tgroup-db psql -U postgres -d tdental_demo < rollback-001.sql
```

## Pre-Deploy Migration Checklist

- [ ] Migration is idempotent (`IF NOT EXISTS` / `IF EXISTS`).
- [ ] Migration tested locally against current Docker DB.
- [ ] Reverse script written and saved in `notes/` (not tracked in `api/migrations/` to avoid accidental execution).
- [ ] Application code that depends on new schema is merged BEFORE or WITH the migration.
- [ ] Migration applied on VPS AFTER code deploy.
- [ ] `schema_migrations` table updated (if using tracking).

## Migration Drift Detection

```bash
# Compare local schema to VPS schema
pg_dump -s -n dbo postgresql://user:pass@localhost:55433/tdental_demo > local_schema.sql
pg_dump -s -n dbo postgresql://user:pass@vps:5432/tdental_demo > vps_schema.sql
diff local_schema.sql vps_schema.sql
```

## Known Migration Gaps

- **No down migrations in repo:** Every rollback is ad-hoc. Long-term: consider adding `down/` directory with reverse scripts.
- **No migration runner:** Human must remember to run files. Risk of missing migrations on deploy.
- **Sequence collisions:** `appointments.name` sequence is not transactional; concurrent inserts may rarely collide.
