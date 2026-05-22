-- 050_add_referral_start_product.sql
-- Additive + reversible. Both tdental + tcosmetic, schema dbo.
-- Adds a pointer to the admin-created "Referral Start" product used as the
-- referral-claim anchor card. NULL until the admin configures it.

ALTER TABLE dbo.commission_settings
  ADD COLUMN IF NOT EXISTS referral_start_product_id UUID NULL;

-- ROLLBACK:
--   ALTER TABLE dbo.commission_settings DROP COLUMN IF EXISTS referral_start_product_id;

DO $$ BEGIN
  IF to_regclass('dbo.schema_migrations') IS NOT NULL THEN
    INSERT INTO dbo.schema_migrations (filename, applied_at)
    VALUES ('050_add_referral_start_product.sql', now())
    ON CONFLICT (filename) DO NOTHING;
  END IF;
END $$;
