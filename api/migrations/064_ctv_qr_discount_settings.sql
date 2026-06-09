-- @crossref:domain[ctv]
-- @crossref:used-in[NK3 CTV QR discount Phase 2 — admin settings + CTV LIVE toggle]
-- @crossref:uses[product-map/domains/ctv.yaml, docs/MIGRATIONS.md]
-- 064_ctv_qr_discount_settings.sql — partners.is_live + global QR discount settings.
-- Idempotent. Apply to both tdental_demo and tcosmetic_demo.

BEGIN;

-- 1. Add is_live to partners (both DBs) — admin-toggleable LIVE/OFF per CTV, default OFF.
ALTER TABLE dbo.partners
  ADD COLUMN IF NOT EXISTS is_live BOOLEAN NULL DEFAULT FALSE;

COMMENT ON COLUMN dbo.partners.is_live IS
  'CTV LIVE toggle: when TRUE, this CTVs codes snapshot the live discount tier (%/slogan/expiry). Default FALSE (OFF tier). Admin-controlled.';

-- 2. Seed global QR discount settings into systempreferences (dental DB, single source of truth).
-- These are read at code-generation time and snapshotted onto each ctv_discount_codes row.
INSERT INTO dbo.systempreferences (key, value, type, category, description, is_public)
VALUES
  ('discount.live_percent',          '20',   'number',  'discount', 'CTV LIVE tier default discount %',              false),
  ('discount.nonlive_percent',       '10',   'number',  'discount', 'CTV OFF tier default discount %',               false),
  ('discount.live_expiry_days',      '30',   'number',  'discount', 'CTV LIVE tier default expiry in days',          false),
  ('discount.nonlive_expiry_days',   '30',   'number',  'discount', 'CTV OFF tier default expiry in days',           false),
  ('discount.live_slogan',           'Cho tất cả dịch vụ làm đẹp ✨', 'text', 'discount', 'CTV LIVE tier default slogan', false),
  ('discount.nonlive_slogan',        'Cho tất cả dịch vụ làm đẹp ✨', 'text', 'discount', 'CTV OFF tier default slogan',  false),
  ('discount.live_enabled_default',  'false','boolean', 'discount', 'Default is_live for new CTVs',                  false)
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- Rollback:
-- ALTER TABLE dbo.partners DROP COLUMN IF EXISTS is_live;
-- DELETE FROM dbo.systempreferences WHERE key LIKE 'discount.%';
