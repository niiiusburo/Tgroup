-- @crossref:domain[investor-portal]
-- @crossref:used-in[NK2 schema promotion: api/migrations/072_replace_legacy_investor_tables]
-- @crossref:uses[api/migrations/068_investor_portal.sql, api/migrations/069_investor_phase2.sql]
--
-- Migration 072: Replace legacy prototype investor tables with the canonical
-- 068/069 shape.
--
-- Context (2026-07-03, NK2 promotion of nk2-deploy v0.40.0): tdental_demo
-- carried an older ad-hoc investor prototype (columns partner_id/active/
-- datecreated/lastupdated, no investor_name/lob). 068's CREATE TABLE IF NOT
-- EXISTS skipped it, so /api/investor/auth/login 500'd with
-- `column "investor_name" does not exist`.
--
-- Strategy: NON-DESTRUCTIVE. If the legacy shape is detected, rename the old
-- tables (and their indexes, to free canonical index names) to
-- *_legacy_20260703, then recreate the canonical shape. Legacy data
-- (1 account + ~3.5k client rows from the abandoned nk2-investor-scope
-- experiment) is preserved for inspection/backfill.
--
-- Idempotent: re-running is a no-op once the canonical shape exists.

DO $$
BEGIN
  -- Legacy investor_accounts: has partner_id, lacks investor_name.
  IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'dbo' AND table_name = 'investor_accounts'
         AND column_name = 'partner_id')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'dbo' AND table_name = 'investor_accounts'
         AND column_name = 'investor_name')
  THEN
    -- 069's reset-tokens table FKs the legacy accounts table; it is brand new.
    -- Drop it only if empty (it is recreated canonically below).
    IF NOT EXISTS (SELECT 1 FROM dbo.investor_password_reset_tokens LIMIT 1) THEN
      DROP TABLE IF EXISTS dbo.investor_password_reset_tokens;
    END IF;

    ALTER TABLE dbo.investor_accounts RENAME TO investor_accounts_legacy_20260703;
    ALTER INDEX IF EXISTS dbo.investor_accounts_pkey
      RENAME TO investor_accounts_legacy_20260703_pkey;
    ALTER INDEX IF EXISTS dbo.investor_accounts_email_key
      RENAME TO investor_accounts_legacy_20260703_email_key;
  END IF;

  -- Legacy investor_clients: lacks the lob column.
  IF EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'dbo' AND table_name = 'investor_clients')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'dbo' AND table_name = 'investor_clients'
         AND column_name = 'lob')
  THEN
    ALTER TABLE dbo.investor_clients RENAME TO investor_clients_legacy_20260703;
    ALTER INDEX IF EXISTS dbo.investor_clients_pkey
      RENAME TO investor_clients_legacy_20260703_pkey;
    ALTER INDEX IF EXISTS dbo.investor_clients_investor_id_partner_id_key
      RENAME TO investor_clients_legacy_20260703_investor_partner_key;
    ALTER INDEX IF EXISTS dbo.investor_clients_investor_id_partner_id_lob_key
      RENAME TO investor_clients_legacy_20260703_investor_partner_lob_key;
    ALTER INDEX IF EXISTS dbo.idx_investor_clients_visible
      RENAME TO idx_investor_clients_visible_legacy_20260703;
  END IF;
END $$;

-- Canonical shape (identical to 068/069; no-ops where already canonical).

CREATE TABLE IF NOT EXISTS dbo.investor_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  investor_name TEXT,
  lob TEXT NOT NULL CHECK (lob IN ('dental', 'cosmetic')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_partner_id UUID,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS dbo.investor_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES dbo.investor_accounts(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL,
  lob TEXT NOT NULL CHECK (lob IN ('dental', 'cosmetic')),
  is_visible BOOLEAN NOT NULL DEFAULT true,
  marked_by_partner_id UUID NOT NULL,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investor_id, partner_id, lob)
);

CREATE INDEX IF NOT EXISTS idx_investor_clients_visible
  ON dbo.investor_clients(investor_id)
  WHERE is_visible = true;

CREATE TABLE IF NOT EXISTS dbo.investor_password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES dbo.investor_accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investor_reset_investor
  ON dbo.investor_password_reset_tokens(investor_id);
