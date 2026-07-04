-- Migration 049: Same-portal investor credentials
--
-- NK and NK2 share the normal portal and scoped API. This table stores optional
-- investor login hashes without creating a second identity model, token, route,
-- or app shell.
--
-- The scoped identity remains dbo.partners + permission group 'investor'; this
-- credential row only proves the password and maps to that partner_id.

CREATE TABLE IF NOT EXISTS dbo.investor_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID NOT NULL UNIQUE REFERENCES dbo.partners(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT true,
  last_login    TIMESTAMP NULL,
  datecreated   TIMESTAMP DEFAULT NOW(),
  lastupdated   TIMESTAMP DEFAULT NOW()
);

-- Compatibility with the earlier NK/NK2 same-portal investor table that was
-- deployed with is_active/created_at/updated_at and nullable partner_id.
DO $$
BEGIN
  ALTER TABLE dbo.investor_accounts
    ADD COLUMN IF NOT EXISTS partner_id UUID NULL,
    ADD COLUMN IF NOT EXISTS active BOOLEAN NULL,
    ADD COLUMN IF NOT EXISTS datecreated TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS lastupdated TIMESTAMP DEFAULT NOW();

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'dbo'
      AND table_name = 'investor_accounts'
      AND column_name = 'is_active'
  ) THEN
    UPDATE dbo.investor_accounts
    SET active = COALESCE(active, is_active, true)
    WHERE active IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'dbo'
      AND table_name = 'investor_accounts'
      AND column_name = 'created_at'
  ) THEN
    UPDATE dbo.investor_accounts
    SET datecreated = COALESCE(datecreated, created_at::timestamp)
    WHERE datecreated IS NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'dbo'
      AND table_name = 'investor_accounts'
      AND column_name = 'updated_at'
  ) THEN
    UPDATE dbo.investor_accounts
    SET lastupdated = COALESCE(lastupdated, updated_at::timestamp)
    WHERE lastupdated IS NULL;
  END IF;

  UPDATE dbo.investor_accounts SET active = true WHERE active IS NULL;
  ALTER TABLE dbo.investor_accounts ALTER COLUMN active SET DEFAULT true;
  ALTER TABLE dbo.investor_accounts ALTER COLUMN active SET NOT NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_investor_accounts_email_lower
  ON dbo.investor_accounts (lower(email));

CREATE INDEX IF NOT EXISTS idx_investor_accounts_partner_active
  ON dbo.investor_accounts (partner_id)
  WHERE active = true;
