-- Migration 049: NK2-only investor credentials
--
-- NK and NK2 currently share tdental_demo. A normal active partners.password_hash
-- investor account would also authenticate on NK production, whose older API does
-- not yet apply resolveInvestorScope() filters. This table stores investor login
-- hashes for the NK2 API path only while the scoped API code is deployed on NK2.
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_investor_accounts_email_lower
  ON dbo.investor_accounts (lower(email));

CREATE INDEX IF NOT EXISTS idx_investor_accounts_partner_active
  ON dbo.investor_accounts (partner_id)
  WHERE active = true;
