-- @crossref:domain[ctv]
-- @crossref:used-in[NK3 schema migration: api/migrations/047_add_lob_scope_is_ctv_to_partners]
-- @crossref:uses[product-map/domains/ctv.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- 047_add_lob_scope_is_ctv_to_partners.sql
-- Cosmetic LOB v2 (D5, D14) — per decision to use partners (not users) as auth source
-- Additive only: extend partners table with LOB scoping and CTV flag.
-- Existing employee rows backfilled to dental scope.
-- CTV users (is_ctv=true) will have empty/null lob_scope and never see admin LOB UI.

BEGIN;

ALTER TABLE dbo.partners
  ADD COLUMN IF NOT EXISTS lob_scope TEXT[] NULL,
  ADD COLUMN IF NOT EXISTS is_ctv BOOLEAN NULL DEFAULT FALSE;

-- Backfill legacy employees to dental-only scope (CTV remains null/empty)
UPDATE dbo.partners
SET lob_scope = ARRAY['dental']
WHERE employee = true
  AND isdeleted = false
  AND (lob_scope IS NULL OR lob_scope = '{}')
  AND (is_ctv IS NOT TRUE);

-- Ensure index for common filter (optional but recommended for future queries)
CREATE INDEX IF NOT EXISTS idx_partners_lob_scope ON dbo.partners USING GIN (lob_scope) WHERE employee = true;

COMMIT;

-- Verification (run manually):
-- SELECT id, name, email, lob_scope, is_ctv FROM dbo.partners WHERE employee = true LIMIT 5;
-- SELECT COUNT(*) FROM dbo.partners WHERE employee = true AND lob_scope IS NULL; -- should be 0 after backfill
