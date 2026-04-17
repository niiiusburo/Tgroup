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
- **1 migration is RED** (will fail without manual deduplication).

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
| `011_fix_payment_proofs_type.sql` | schema | ❌ No IF EXISTS | ❌ **MISSING** | YELLOW |
| `012_add_cskhid_salestaffid.sql` | schema | ✅ IF NOT EXISTS | ✅ Applied | — |
| `013_add_employee_role_fields.sql` | schema | ✅ IF NOT EXISTS | ✅ Applied | — |
| `014_payment_per_record.sql` | mixed | ✅ IF NOT EXISTS | ❌ **MISSING** | YELLOW |
| `015_deposit_receipts.sql` | mixed | ✅ IF NOT EXISTS | ✅ Applied | — |
| `016_saleorder_status_audit.sql` | mixed | ✅ DO block | ❌ **MISSING** | — |
| `017_monthlyplan_constraints.sql` | schema | ✅ DO block | ❌ **MISSING** | — |
| `018_feedback_tables.sql` | schema | ✅ IF NOT EXISTS | ✅ Applied | — |
| `019_feedback_attachments.sql` | schema | ✅ IF NOT EXISTS | ✅ Applied | — |
| `020_feedback_messages_drop_content_check.sql` | schema | ✅ DROP IF EXISTS | ✅ Applied / no-op | — |
| `020_saleorder_code.sql` | mixed | ✅ DO block | ✅ Applied | — |
| `021_partner_unique_constraints.sql` | schema | ✅ DO block | ❌ **MISSING — BLOCKED** | 🔴 **RED** |
| `022_add_appointment_productid.sql` | schema | ✅ IF NOT EXISTS | ✅ Applied | — |
| `023_fix_namenosign.sql` | data | ❌ No | ❌ **MISSING / partial** | YELLOW |
| `024_add_tooth_fields.sql` | schema | ✅ IF NOT EXISTS | ❌ **MISSING** | — |
| `025_add_tier_id_to_partners.sql` | mixed | ✅ IF NOT EXISTS | ✅ Applied | — |
| `026_add_tier_id_to_employees_view.sql` | schema | ✅ DROP/CREATE | ✅ Applied | — |
| `028_lock_super_admin_permissions.sql` | data | ✅ ON CONFLICT | ✅ Applied | — |
| `030_rename_permission_groups.sql` | data | ❌ No | ✅ Applied | — |
| `031_assign_default_tiers.sql` | data | ❌ No | ❌ **MISSING** | YELLOW |
| `031_update_customer_sources.sql` | data | ❌ No | ✅ Applied | — |
| `032_add_sourceid_to_saleorders.sql` | mixed | ✅ DO block | ✅ Applied | — |
| `033_merge_customer_sources_to_sale_online.sql` | data | ❌ No | ✅ Applied | — |
| `034_merge_original_sources_to_sale_online.sql` | data | ❌ No | ✅ Applied / no-op | — |
| `035_restore_customer_sources.sql` | data | ❌ No | ✅ Applied | — |
| `036_remove_original_customer_source_duplicates.sql` | data | ❌ No | ✅ Applied / no-op | — |

---

## Phase 2 — Missing Objects Detail

### Missing Columns / Tables

| Object | Expected By | VPS State |
|--------|-------------|-----------|
| `payment_proofs.id` → uuid | `011_fix_payment_proofs_type.sql` | Currently `integer` |
| `payment_proofs.payment_id` → uuid | `011_fix_payment_proofs_type.sql` | Currently `integer` |
| `payments.record_id` | `014_payment_per_record.sql` | **Missing** |
| `payments.record_type` | `014_payment_per_record.sql` | **Missing** |
| `monthlyplans.record_id` | `014_payment_per_record.sql` | **Missing** |
| `monthlyplans.record_type` | `014_payment_per_record.sql` | **Missing** |
| `idx_payments_record` | `014_payment_per_record.sql` | **Missing** |
| `saleorder_state_logs` table | `016_saleorder_status_audit.sql` | **Missing** |
| `chk_saleorders_state` constraint | `016_saleorder_status_audit.sql` | **Missing** |
| `chk_downpayment_lt_total` | `017_monthlyplan_constraints.sql` | **Missing** |
| `partners_phone_unique` index | `021_partner_unique_constraints.sql` | **Missing** |
| `partners_email_lower_unique` index | `021_partner_unique_constraints.sql` | **Missing** |
| `saleorderlines.tooth_numbers` | `024_add_tooth_fields.sql` | **Missing** |
| `saleorderlines.tooth_comment` | `024_add_tooth_fields.sql` | **Missing** |

### Missing Data Migrations

| Migration | Issue | VPS Count |
|-----------|-------|-----------|
| `023_fix_namenosign.sql` | 155 products have `namenosign IS NULL` | 155 rows |
| `031_assign_default_tiers.sql` | 172 employees have `tier_id IS NULL` | 172 rows |

---

## RED Flag — Migration 021

**File:** `021_partner_unique_constraints.sql`

**Why RED:** The DDL will fail because duplicate phone/email values exist on the VPS.

**Duplicates detected:**
- `phone='0349762840'` → 4 rows
- `phone='0966 080 638'` → 2 rows
- `email='dup@example.com'` → 3 rows (overlaps with phone dup)

**Resolution options:**
1. **Skip 021** for now (safe — no schema breakage).
2. **Apply manual deduplication first**, then run 021.
3. I can generate a dedupe script if you want to resolve this.

**Recommendation:** Skip 021 in the initial apply. We can address deduplication separately.

---

## Ordered Apply Plan

### Pre-apply (new)
`000_install_schema_migrations_table.sql`
```sql
CREATE TABLE IF NOT EXISTS dbo.schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hash TEXT
);
```

### Apply Order

1. **`011_fix_payment_proofs_type.sql`**
   - Converts `payment_proofs.id` and `payment_id` from `integer` → `uuid`.
   - ⚠️ **YELLOW:** `payment_proofs` table is empty on VPS (0 rows), so data mutation is zero-risk.

2. **`014_payment_per_record.sql`**
   - Adds `record_id` / `record_type` to `payments` and `monthlyplans`.
   - Backfills from `payment_allocations` and `monthlyplan_items`.
   - ⚠️ **YELLOW:** Mutates 110 payment rows and 1 monthlyplan row.

3. **`016_saleorder_status_audit.sql`**
   - Creates `saleorder_state_logs` table + indexes.
   - Adds `chk_saleorders_state` CHECK constraint.
   - No data mutation.

4. **`017_monthlyplan_constraints.sql`**
   - Adds `chk_downpayment_lt_total` CHECK constraint.
   - No data mutation.

5. **`023_fix_namenosign.sql`**
   - Updates `namenosign` on products where not NULL.
   - ⚠️ **YELLOW:** 155 products have NULL `namenosign`; this migration only touches non-NULL rows.

6. **`024_add_tooth_fields.sql`**
   - Adds `tooth_numbers` and `tooth_comment` to `saleorderlines`.
   - No data mutation.

7. **`031_assign_default_tiers.sql`**
   - Backfills `tier_id` for 172 employees with NULL values.
   - ⚠️ **YELLOW:** Mutates employee role assignments.

### Skipped (intentionally)
- `008_data_migration_from_tdental*.sql` — VPS already has data; these are old-db imports.
- `021_partner_unique_constraints.sql` — 🔴 RED, blocked by duplicates.

---

## Rollback Contract

**Backup command (to run BEFORE apply):**
```bash
ssh root@dokploy "docker exec tgroup-db pg_dump -U postgres -d tdental_demo -Fc" \
  > /tmp/tgroup-db-backup-$(date +%s).dump
```

**Restore command:**
```bash
docker exec -i tgroup-db pg_restore -U postgres -d tdental_demo \
  --clean --if-exists < /tmp/tgroup-db-backup-<ts>.dump
```

**Blast radius:** `tgroup-db` only.

---

## Go / No-Go Recommendation

**Status:** ✅ **Ready to proceed to Phase 3 (Backup) and Phase 4 (Apply)** with one condition:

1. **Approve skipping 021** (partner unique constraints) due to duplicate data.
2. **Confirm** you're okay with the 3 YELLOW data migrations (`014`, `023`, `031`) being applied.

If you give the go-ahead, I will:
1. Take the backup.
2. Create `000_install_schema_migrations_table.sql` locally.
3. Apply the 7 migrations in order, tracking each in `schema_migrations`.
4. Restart `tgroup-api`.
5. Run the endpoint smoke tests.

**Do you approve this plan?**
