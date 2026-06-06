-- @crossref:domain[ctv]
-- @crossref:used-in[NK3 schema migration: api/migrations/059_ctv_never_staff_tier]
-- @crossref:uses[product-map/domains/ctv.yaml, docs/MIGRATIONS.md, docs/INVARIANTS.md, testbright.md]
-- 059_ctv_never_staff_tier.sql
--
-- A CTV (is_ctv = true) is an external referral vendor, NOT a staff member, and must
-- never carry a staff permission tier. Migration 031_assign_default_tiers and the
-- merge_employee_permissions script bulk-assigned tier_id to every `employee = true`
-- row — and CTVs are `employee = true` (so they can authenticate), so they were swept
-- into staff groups (observed: tier_id = "Editor"). That both (a) denied the CTV the
-- ctv.* self-permissions (the auto-grant only fired when tier_id was NULL) → 403 on the
-- whole /ctv portal, and (b) leaked staff permissions (payment.edit, appointments.add)
-- to external vendors.
--
-- The permanent fix lives in permissionService.resolveEffectivePermissions (is_ctv users
-- get the ctv.* self-perms regardless of tier_id and never inherit a group). This migration
-- corrects the underlying DATA so the rows reflect reality and the latent over-grant is gone.
--
-- Idempotent: safe to re-run; only touches CTV rows that still carry a tier.

UPDATE dbo.partners
SET tier_id = NULL, lastupdated = now()
WHERE is_ctv = true
  AND tier_id IS NOT NULL;
