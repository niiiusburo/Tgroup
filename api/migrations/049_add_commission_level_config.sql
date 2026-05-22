-- 049_add_commission_level_config.sql
-- MLM Commission Level Configuration
-- Date: 2026-05-22
-- Applies to: BOTH tdental_demo and tcosmetic_demo (run manually on each)
--
-- DESIGN NOTES:
-- * Strictly ADDITIVE + reversible. New tables only, no NOT NULL without defaults.
-- * commission_level_config defines the MLM level structure (L0-L4) with commission share % and enabled flag.
-- * commission_settings stores singleton settings (default_referral_percent).
-- * earnings table receives new `level INT NULL` column to track which commission level a row belongs to.
-- * All seeds use ON CONFLICT DO NOTHING for idempotence.
--
-- ROLLBACK (down) — run in reverse order, then DELETE FROM schema_migrations WHERE filename=...
--   See comments below each section.
--
-- Verification after apply (on dental):
--   SELECT * FROM dbo.commission_level_config ORDER BY level;
--   SELECT * FROM dbo.commission_settings;
--   \d earnings | grep level

-- 1. Add level column to earnings table (tracks MLM level distribution)
ALTER TABLE dbo.earnings
  ADD COLUMN IF NOT EXISTS level INT NULL;

-- ROLLBACK:
--   ALTER TABLE dbo.earnings DROP COLUMN IF EXISTS level;

-- 2. Commission level configuration table (MLM level setup)
CREATE TABLE IF NOT EXISTS dbo.commission_level_config (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level                   INT NOT NULL UNIQUE,                            -- 0=direct referrer, 1-4=upline
  label                   TEXT NOT NULL,                                  -- e.g. "Direct (L0)", "Upline 1 (L1)"
  enabled                 BOOLEAN NOT NULL DEFAULT TRUE,                  -- if false, skip this level in split
  share_percent           NUMERIC(5,2) NOT NULL,                          -- % of commission pool for this level
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default commission levels (standard MLM split: 72.7% + 14.5% + 7.3% + 3.6% + 1.8% = 99.9% ≈ 100)
INSERT INTO dbo.commission_level_config (level, label, enabled, share_percent)
VALUES
  (0, 'Direct (L0)', TRUE, 72.7),
  (1, 'Upline 1 (L1)', TRUE, 14.5),
  (2, 'Upline 2 (L2)', TRUE, 7.3),
  (3, 'Upline 3 (L3)', TRUE, 3.6),
  (4, 'Upline 4 (L4)', TRUE, 1.8)
ON CONFLICT (level) DO NOTHING;

-- ROLLBACK:
--   DELETE FROM dbo.commission_level_config WHERE level IN (0,1,2,3,4);
--   DROP TABLE IF EXISTS dbo.commission_level_config;

-- 3. Commission settings table (singleton configuration)
CREATE TABLE IF NOT EXISTS dbo.commission_settings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  default_referral_percent    NUMERIC(5,2) NOT NULL DEFAULT 20.0,         -- fallback % when product commission_rate_percent is 0/null
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default settings (idempotent: singleton — only insert if table is empty;
-- a plain ON CONFLICT DO NOTHING would not dedupe because id is a random uuid).
INSERT INTO dbo.commission_settings (default_referral_percent)
SELECT 20.0
WHERE NOT EXISTS (SELECT 1 FROM dbo.commission_settings);

-- ROLLBACK:
--   DELETE FROM dbo.commission_settings;
--   DROP TABLE IF EXISTS dbo.commission_settings;

-- Record in tracking table (idempotent; guarded so demo DBs without the
-- tracking table do not error out mid-migration).
DO $$ BEGIN
  IF to_regclass('dbo.schema_migrations') IS NOT NULL THEN
    INSERT INTO dbo.schema_migrations (filename, applied_at)
    VALUES ('049_add_commission_level_config.sql', now())
    ON CONFLICT (filename) DO NOTHING;
  END IF;
END $$;

-- End of migration 049
-- After apply on both DBs, commissionEngine.js will use these tables to split earnings across MLM levels.
