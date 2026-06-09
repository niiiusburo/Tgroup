-- @crossref:domain[earnings-commissions]
-- @crossref:used-in[NK3 schema migration: api/migrations/056_braces_commission_config]
-- @crossref:uses[product-map/domains/earnings-commissions.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- 056_braces_commission_config.sql
-- Wave 5 of docs/business-logic/ctv-referral-commission.md (§5 Braces Override, Dental-only).
--
-- A separate Braces/Orthodontics CTV tier config. When BRACES_OVERRIDE_ENABLED is on and a
-- DENTAL service card is a braces service (category 'Braces'/'Orthodontics' or name contains
-- brace/braces/niềng răng), the commission engine uses THESE level rates instead of the normal
-- dbo.commission_level_config, on the same full-service-price basis.
--
-- SAFETY: additive (new table only). Dental-only — apply to tdental_nk3. (Cosmetic uses the
-- normal tier config per §5.) Idempotent. Gated behind BRACES_OVERRIDE_ENABLED in code.

BEGIN;

CREATE TABLE IF NOT EXISTS dbo.braces_commission_level_config (
  level         INTEGER PRIMARY KEY,
  share_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  label         TEXT
);

-- Seed: braces typically pay a higher level-0 rate than standard. Levels 0-2 enabled, 3-4 off
-- (mirrors the standard default; rates are placeholders the clinic tunes in the CTV admin portal).
INSERT INTO dbo.braces_commission_level_config (level, share_percent, enabled, label) VALUES
  (0, 30.00, true,  'Braces L0 (direct CTV)'),
  (1, 5.00,  true,  'Braces L1 (upline)'),
  (2, 2.50,  true,  'Braces L2'),
  (3, 0.00,  false, 'Braces L3 (disabled)'),
  (4, 0.00,  false, 'Braces L4 (disabled)')
ON CONFLICT (level) DO NOTHING;

COMMIT;

-- Rollback: DROP TABLE IF EXISTS dbo.braces_commission_level_config;
