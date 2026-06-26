-- Migration 068: Investor Portal Tables
-- Additive only — separate investor identity (DEC-20260625-IP-01)
-- Apply to BOTH tdental_demo and tcosmetic_demo
-- Date: 2026-06-26

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

CREATE TABLE IF NOT EXISTS dbo.investor_view_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('login', 'list', 'detail')),
  resource_id UUID,
  row_count INT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investor_view_audit_investor
  ON dbo.investor_view_audit(investor_id, created_at DESC);

-- @crossref:domain[investor-portal]
-- @crossref:used-in[/api/investor/* routes]
-- @crossref:uses[product-map/domains/investor-portal.yaml, docs/specs/INVESTOR_PORTAL_PRD.md]

-- DOWN (rollback):
-- DROP TABLE IF EXISTS dbo.investor_view_audit CASCADE;
-- DROP TABLE IF EXISTS dbo.investor_clients CASCADE;
-- DROP TABLE IF EXISTS dbo.investor_accounts CASCADE;