# VPS Schema Sync — Gap Analysis & Apply Plan
**Date:** 2026-04-17  
**VPS:** dokploy (76.13.16.68)  
**DB:** tdental_demo inside tgroup-db container  
**Branch:** v2-schema-sync (worktree: `.worktrees/V2`)

---

## Executive Summary

- **28 tables** exist on VPS.
- **No `schema_migrations` tracking table** exists.
- **36 migration files** in `api/migrations/`.
- **~22 migrations appear already applied** (schema objects present).
- **~9 migrations need application** (missing schema objects or data gaps detected).
- **1 migration was RED** (blocked by duplicate phone/email), **now resolved**.

---

## Phase 1 — Migration Inventory

| File | Category | Idempotent | Status on VPS | Risk |
|------|----------|------------|---------------|------|
| `001_add_face_columns.sql` | schema | ✅ IF NOT EXISTS | ✅ Applied | — |
| `001_company_bank_settings.sql` | schema | ✅ IF NOT EXISTS | ✅ Applied | — |
| `002_payment_proofs.sql` | schema | ✅ IF NOT EXISTS | ✅ Applied | — |
| `003_payment_allocations.sql` | mixed | ✅ IF NOT EXISTS | ✅ Applied | — |
| `004_payment_plan_items.sql` | schema | ✅ IF NOT EXISTS | ✅ Applied | — |
| `005_employee_location_scope.sql` | schema | ✅ IF NOT EXISTS | ✅ Applied | — |
| `006_dotkham_payment_allocations.sql` | schema | ✅ DROP/ADD IF | ✅ Applied | — |
| `006_fix_location_scope_column.sql` | schema | ✅ DO block | ✅ Applied / no-op | — |
| `007_add_external_checkups_permission.sql` | data | ✅ ON CONFLICT | ✅ Applied | — |
| `008_data_migration_from_tdental.sql` | data | ❌ No | ⏭️ SKIP — VPS already seeded | YELLOW |
| `008_data_migration_from_tdental_v2.sql` | data | ❌ No | ⏭️ SKIP — VPS already seeded | YELLOW |
| `008_data_migration_from_tdental_v3.sql` | data | ❌ No | ⏭️ SKIP — VPS already seeded | YELLOW |
| `011_fix_payment_proofs_type.sql` | schema | ❌ No IF EXISTS | ✅ Applied | YELLOW |
| `012_add_cskhid_salestaffid.sql` | schema | ✅ IF NOT EXISTS | ✅ Applied | — |
| `013_add_employee_role_fields.sql` | schema | ✅ IF NOT EXISTS | ✅ Applied | — |
| `014_payment_per_record.sql` | mixed | ✅ IF NOT EXISTS | ✅ Applied | YELLOW |
| `015_deposit_receipts.sql` | mixed | ✅ IF NOT EXISTS | ✅ Applied | — |
| `016_saleorder_status_audit.sql` | mixed | ✅ DO block | ✅ Applied | — |
| `017_monthlyplan_constraints.sql` | schema | ✅ DO block | ✅ Applied | — |
| `018_feedback_tables.sql` | schema | ✅ IF NOT EXISTS | ✅ Applied | — |
| `019_feedback_attachments.sql` | schema | ✅ IF NOT EXISTS | ✅ Applied | — |
| `020_feedback_messages_drop_content_check.sql` | schema | ✅ DROP IF EXISTS | ✅ Applied / no-op | — |
| `020_saleorder_code.sql` | mixed | ✅ DO block | ✅ Applied | — |
| `021_partner_unique_constraints.sql` | schema | ✅ DO block | ✅ **APPLIED** | 🔴 **RED → RESOLVED** |
| `022_add_appointment_productid.sql` | schema | ✅ IF NOT EXISTS | ✅ Applied | — |
| `023_fix_namenosign.sql` | data | ❌ No | ✅ Applied | YELLOW |
| `024_add_tooth_fields.sql` | schema | ✅ IF NOT EXISTS | ✅ Applied | — |
| `025_add_tier_id_to_partners.sql` | mixed | ✅ IF NOT EXISTS | ✅ Applied | — |
| `026_add_tier_id_to_employees_view.sql` | schema | ✅ DROP/CREATE | ✅ Applied | — |
| `028_lock_super_admin_permissions.sql` | data | ✅ ON CONFLICT | ✅ Applied | — |
| `030_rename_permission_groups.sql` | data | ❌ No | ✅ Applied | — |
| `031_assign_default_tiers.sql` | data | ❌ No | ✅ Applied | YELLOW |
| `031_update_customer_sources.sql` | data | ❌ No | ✅ Applied | — |
| `032_add_sourceid_to_saleorders.sql` | mixed | ✅ DO block | ✅ Applied | — |
| `033_merge_customer_sources_to_sale_online.sql` | data | ❌ No | ✅ Applied | — |
| `034_merge_original_sources_to_sale_online.sql` | data | ❌ No | ✅ Applied / no-op | — |
| `035_restore_customer_sources.sql` | data | ❌ No | ✅ Applied | — |
| `036_remove_original_customer_source_duplicates.sql` | data | ❌ No | ✅ Applied / no-op | — |

---

## Phase 2 — Missing Objects Detail (Resolved)

All previously missing objects are now present on the VPS.

| Object | Expected By | VPS State |
|--------|-------------|-----------|
| `payment_proofs.id` → uuid | `011_fix_payment_proofs_type.sql` | ✅ `uuid` |
| `payment_proofs.payment_id` → uuid | `011_fix_payment_proofs_type.sql` | ✅ `uuid` |
| `payments.record_id` | `014_payment_per_record.sql` | ✅ Present |
| `payments.record_type` | `014_payment_per_record.sql` | ✅ Present |
| `monthlyplans.record_id` | `014_payment_per_record.sql` | ✅ Present |
| `monthlyplans.record_type` | `014_payment_per_record.sql` | ✅ Present |
| `idx_payments_record` | `014_payment_per_record.sql` | ✅ Present |
| `saleorder_state_logs` table | `016_saleorder_status_audit.sql` | ✅ Present |
| `chk_saleorders_state` constraint | `016_saleorder_status_audit.sql` | ✅ Present |
| `chk_downpayment_lt_total` | `017_monthlyplan_constraints.sql` | ✅ Present |
| `partners_phone_unique` index | `021_partner_unique_constraints.sql` | ✅ Present |
| `partners_email_lower_unique` index | `021_partner_unique_constraints.sql` | ✅ Present |
| `saleorderlines.tooth_numbers` | `024_add_tooth_fields.sql` | ✅ Present |
| `saleorderlines.tooth_comment` | `024_add_tooth_fields.sql` | ✅ Present |

---

## RED Flag — Migration 021 (RESOLVED)

**File:** `021_partner_unique_constraints.sql`

**Original problem:** Duplicate phone/email values existed on the VPS, which would cause the unique-index DDL to fail.

**Deduplication performed:**
- **Phone duplicates:** 10 groups (21 rows total) → nullified phone on 11 newer/extra rows, keeping the oldest record per group.
- **Email duplicates:** 7 groups (17 rows total) → nullified email on 10 extra rows, keeping the oldest record per group (with special handling to preserve `tg@clinic.vn` on the Admin account).

**Post-dedupe verification:**
- `SELECT COUNT(*) FROM (SELECT phone ... HAVING COUNT(*) > 1)` → **0**
- `SELECT COUNT(*) FROM (SELECT LOWER(email) ... HAVING COUNT(*) > 1)` → **0**

**Result:** `021_partner_unique_constraints.sql` applied successfully. Indexes `partners_phone_unique` and `partners_email_lower_unique` now exist.

---

## Ordered Apply Plan (Completed)

### Pre-apply (new)
`000_install_schema_migrations_table.sql`
```sql
CREATE TABLE IF NOT EXISTS dbo.schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hash TEXT
);
```

### Applied Migrations (all tracked in `schema_migrations`)
1. `011_fix_payment_proofs_type.sql` — `payment_proofs` id/payment_id → `uuid`
2. `014_payment_per_record.sql` — added `record_id`/`record_type` to `payments`/`monthlyplans`, backfilled 50 payment rows
3. `016_saleorder_status_audit.sql` — created `saleorder_state_logs` + state CHECK
4. `017_monthlyplan_constraints.sql` — added `chk_downpayment_lt_total` CHECK
5. `023_fix_namenosign.sql` — fixed broken migration, rewrote with `TRANSLATE`, updated 7 products
6. `024_add_tooth_fields.sql` — added `tooth_numbers`/`tooth_comment` to `saleorderlines`
7. `031_assign_default_tiers.sql` — backfilled `tier_id` for 172 employees
8. `021_partner_unique_constraints.sql` — deduplicated then applied phone/email unique indexes

### Skipped (intentionally)
- `008_data_migration_from_tdental*.sql` — VPS already has data; these are old-db imports.

---

## Rollback Contract

**Backup command:**
```bash
ssh root@dokploy "docker exec tgroup-db pg_dump -U postgres -d tdental_demo -Fc" \
  > /tmp/tgroup-db-backup-$(date +%s).dump
```

**Actual backup taken:**
- `/tmp/tgroup-db-backup-1776394238.dump` — 191 KB

**Restore command:**
```bash
docker exec -i tgroup-db pg_restore -U postgres -d tdental_demo \
  --clean --if-exists < /tmp/tgroup-db-backup-<ts>.dump
```

**Blast radius:** `tgroup-db` only.

---

## Verification

- ✅ `schema_migrations` populated with **9 entries**
- ✅ VPS `\d` for each modified table matches expected schema
- ✅ All endpoints return HTTP 200
- ✅ `tgroup-api` logs clean since restart
- ✅ Unique indexes `partners_phone_unique` and `partners_email_lower_unique` active

---

## Final Status

**ALL MIGRATIONS APPLIED. VPS SCHEMA IS IN PARITY WITH LOCAL.**
