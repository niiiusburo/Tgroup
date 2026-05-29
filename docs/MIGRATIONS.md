# TGroup Clinic — Migration Log

> Schema migration log with up/down/rollback notes. Manual SQL migration system (no ORM runner).

**Cosmetic LOB v2 (docs sync 2026-05-21):** Phase-1 complete (047 base schema, partners/earnings/products). Phase-2 Task-1 (migration 048: admin permissions + test). Phase-2 Task-2 (seed-cosmetic-lob-transactional.js + test). Full details in api/migrations/04[78]_*.sql, api/scripts/seed-cosmetic-lob-transactional.js, and product-map/governance-delta. CTV attribution (D13), append-only earnings, refund reversals verified by Jest (24 tests, 100% pass).



## Migration System Rules

1. Every migration file is idempotent: use `IF NOT EXISTS` for CREATE, `IF EXISTS` for DROP/ALTER.
2. Migrations are applied manually via `psql` (Docker or direct).
3. There is no auto-down migration. Rollback requires writing and running a reverse script.
4. Track applied migrations in `dbo.schema_migrations` (installed by `000_install_schema_migrations_table.sql`).

## Migration Index

Current inventory from disk:

- **Canonical directory:** `api/migrations/` — 53 SQL files. This directory contains the `schema_migrations` installer and the full numbered application history used by the root runbook loop.
- **Supplemental directory:** `api/src/db/migrations/` — 2 SQL files. These are straggler migrations (`payment_category`, customer face embeddings) that should be consolidated into the canonical migration path or explicitly promoted by a future runbook decision.
- **Runbook status:** `docs/RUNBOOK.md` and `docs/runbooks/DEPLOYMENT.md` both use `api/migrations/*.sql` as the canonical deploy loop. Supplemental files under `api/src/db/migrations/` are not covered by that loop unless explicitly run or consolidated.

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
| 018 | `018_error_events.sql` | Creates AutoDebugger `error_events` and `error_fix_attempts` telemetry tables | `CREATE TABLE ...` + indexes + update trigger | Drop trigger/function, `error_fix_attempts`, then `error_events` | 2026-04 |
| 018 | `018_feedback_tables.sql` | Creates feedback thread/message tables | `CREATE TABLE feedback_threads`, `feedback_messages` | Drop feedback tables after dependent attachments | 2026-04 |
| 019 | `019_feedback_attachments.sql` | Creates feedback attachment metadata table | `CREATE TABLE feedback_attachments` | Drop `feedback_attachments` | 2026-04 |
| 019 | `019_feedback_auto_errors.sql` | Links feedback threads to auto-created error events | `ALTER TABLE feedback_threads ADD ...` | Drop added columns/indexes | 2026-04 |
| 020 | `020_feedback_messages_drop_content_check.sql` | Allows feedback messages without content when attachments exist | `DROP CONSTRAINT feedback_messages_content_check` | Recreate content check if required | 2026-04 |
| 020 | `020_saleorder_code.sql` | Adds generated sale order `code` sequence and partial unique index | `ALTER TABLE saleorders ADD code`; create sequence/index | Drop index, sequence, and column | 2026-04 |
| 021 | `021_partner_unique_constraints.sql` | Adds partial uniqueness for partner phone/email identity | Create partial unique indexes | Drop partner unique indexes | 2026-04 |
| 022 | `022_add_appointment_productid.sql` | Adds service link to appointments | `ALTER TABLE appointments ADD productid` | Drop `appointments.productid` | 2026-04 |
| 023 | `023_fix_namenosign.sql` | Backfills/fixes accent-insensitive partner names | Data cleanup/update | Restore from backup if needed | 2026-04 |
| 024 | `024_add_tooth_fields.sql` | Adds tooth fields to sale order lines | `ALTER TABLE saleorderlines ADD ...` | Drop added tooth columns | 2026-04 |
| 025 | `025_add_tier_id_to_partners.sql` | Adds role tier assignment to partners | `ALTER TABLE partners ADD tier_id` | Drop `partners.tier_id` | 2026-04 |
| 026 | `026_add_tier_id_to_employees_view.sql` | Refreshes employee view to expose tier assignment | `CREATE OR REPLACE VIEW employees` | Restore previous view definition | 2026-04 |
| 028 | `028_lock_super_admin_permissions.sql` | Ensures super admin wildcard/system permissions | Permission seed updates | Delete seeded rows only after replacement role exists | 2026-04 |
| 030 | `030_rename_permission_groups.sql` | Renames built-in permission groups | Data update | Rename groups back from backup/list | 2026-04 |
| 031 | `031_assign_default_tiers.sql` | Assigns default permission tiers to employees | Permission assignment insert/update | Remove inserted assignments if needed | 2026-04 |
| 031 | `031_update_customer_sources.sql` | Updates customer source values | Source data update | Restore source rows from backup | 2026-04 |
| 032 | `032_add_sourceid_to_saleorders.sql` | Adds source tracking to sale orders | `ALTER TABLE saleorders ADD sourceid` | Drop `saleorders.sourceid` | 2026-04 |
| 033 | `033_merge_customer_sources_to_sale_online.sql` | Merges customer sources into Sale Online source | Source seed/update | Restore sources from backup | 2026-04 |
| 034 | `034_merge_original_sources_to_sale_online.sql` | Consolidates original source values into Sale Online | Source data update | Restore original source mapping from backup | 2026-04 |
| 035 | `035_restore_customer_sources.sql` | Restores customer source rows | Source seed insert | Delete restored rows if duplicate/bad | 2026-04 |
| 036 | `036_remove_original_customer_source_duplicates.sql` | Removes duplicate original source rows | Source data cleanup | Restore deleted rows from backup | 2026-04 |
| 037 | `037_ip_access_control.sql` | Creates global IP access mode and allow/block entries | `CREATE TABLE ip_access_settings`, `ip_access_entries` | Drop entries then settings | 2026-04 |
| 037 | `037_version_events.sql` | Creates frontend version telemetry table | `CREATE TABLE version_events` + indexes | Drop `version_events` | 2026-04 |
| 038 | `038_add_accountinvoices_table.sql` | Creates account invoice table for DotKham joins | `CREATE TABLE accountinvoices` | Drop `accountinvoices` | 2026-04 |
| 039 | `039_seed_sample_doctors.sql` | Seeds sample doctor partner rows | `INSERT INTO partners` | Delete seeded rows by known identifiers | 2026-04 |
| 040 | `040_add_appointment_staff_columns.sql` | Adds assistant/dental aide staff links to appointments | `ALTER TABLE appointments ADD ...` | Drop added appointment staff columns | 2026-04 |
| 041 | `041_add_performance_indexes.sql` | Adds high-use search/reporting indexes | `CREATE INDEX IF NOT EXISTS ...` | Drop added indexes | 2026-04 |
| 042 | `042_add_export_permissions.sql` | Seeds operational export permissions | Permission seed inserts | Delete seeded export permissions | 2026-04 |
| 043 | `043_add_exports_audit.sql` | Creates export preview/download audit table | `CREATE TABLE exports_audit` + indexes | Drop `exports_audit` | 2026-04 |
| 044 | `044_allow_duplicate_partner_phones.sql` | Removes strict phone uniqueness to support migrated customer records | Drop phone unique constraint/index | Recreate partial phone uniqueness only after dedupe | 2026-04 |
| 045 | `045_add_feedback_permissions.sql` | Seeds feedback permissions | Permission seed inserts | Delete seeded feedback permissions | 2026-04 |
| 045 | `045_grant_external_checkups_create_to_clinic_roles.sql` | Grants external checkup create permission to clinic roles | Permission seed insert | Delete granted permission rows | 2026-04 |
| 046 | `046_split_payment_and_hoso_permissions.sql` | Splits payment and treatment-record permission strings | Permission seed inserts | Delete seeded split permissions after replacement mapping | 2026-05 |
| 047 | `047_cosmetic_lob_v2_base.sql` | Cosmetic LOB v2 base schema + partner fields + earnings table (D13 CTV support) | Creates `earnings` table; adds columns to `partners`, `products` | Drop `earnings` table, restore partner/product schema | 2026-05 |
| 048 | `048_grant_lob_permissions_to_admin.sql` | Grant cosmetic.access, dental.access, lob.crossview to Admin group (Phase-2) | Permission seed insert | Delete granted permission rows | 2026-05 |
| 049 | `049_widen_partners_created_via_for_legacy_ctv.sql` | Widen `partners.created_via` and allow full legacy CTV import markers | `ALTER COLUMN created_via TYPE VARCHAR(64)` + refresh `partners_created_via_check` | Narrow only after confirming no value exceeds 16 chars and no legacy marker remains | 2026-05 |

**Total canonical migrations:** 55 files in `api/migrations/`.

## Supplemental Migration Files

These files are visible under `api/src/db/migrations/` but are not part of the canonical root migration index yet.

| # | File | Description | Consolidation Note |
|---|---|---|---|
| 003 | `003_add_payment_category.sql` | Adds/backfills `payments.payment_category`, check constraint, `idx_payments_category` | Already reflected in the data model; should be copied or renumbered into `api/migrations/` before relying on root runbook execution. |
| 046 | `046_customer_face_embeddings.sql` | Creates `customer_face_embeddings` and ensures partner face status columns exist | Already reflected in the data model; overlaps earlier face-column history and needs one canonical execution path. |

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
