-- @crossref:domain[ctv]
-- @crossref:used-in[NK3 schema migration: api/migrations/049_widen_partners_created_via_for_legacy_ctv]
-- @crossref:uses[product-map/domains/ctv.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- Cosmetic LOB v2 / legacy CTV import
-- Widen partners.created_via so import markers such as
-- legacy_ctv_import_20260528 can be stored without truncation.
-- Apply to both tdental_* and tcosmetic_* databases before the legacy CTV import.

ALTER TABLE dbo.partners
  ALTER COLUMN created_via TYPE VARCHAR(64);

ALTER TABLE dbo.partners
  DROP CONSTRAINT IF EXISTS partners_created_via_check;

ALTER TABLE dbo.partners
  ADD CONSTRAINT partners_created_via_check
  CHECK (
    created_via IS NULL
    OR created_via IN ('self_signup', 'admin_create', 'migrated')
    OR created_via LIKE 'legacy_ctv_import%'
  );

-- ROLLBACK:
--   Only safe after confirming no values exceed 16 chars:
--   ALTER TABLE dbo.partners DROP CONSTRAINT IF EXISTS partners_created_via_check;
--   ALTER TABLE dbo.partners ADD CONSTRAINT partners_created_via_check
--     CHECK (created_via IS NULL OR created_via IN ('self_signup', 'admin_create', 'migrated'));
--   ALTER TABLE dbo.partners ALTER COLUMN created_via TYPE VARCHAR(16);
