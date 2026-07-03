-- Migration 069: Investor Portal Phase 2 — password reset tokens + permissions
-- Apply to BOTH tdental_demo and tcosmetic_demo
-- Date: 2026-06-26

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

-- Grant Phase 2 permissions to Admin group (idempotent)
INSERT INTO dbo.group_permissions (group_id, permission)
SELECT '11111111-0000-0000-0000-000000000001' AS group_id, perm
FROM (
  VALUES
    ('customers.set_investor_visibility'),
    ('investors.manage')
) AS perms(perm)
ON CONFLICT (group_id, permission) DO NOTHING;

-- @crossref:domain[investor-portal]
-- @crossref:used-in[/api/admin/investors, /api/investor-visibility, password reset]
-- @crossref:uses[product-map/domains/investor-portal.yaml, docs/specs/INVESTOR_PORTAL_PHASE2_PRD.md]

-- DOWN (rollback):
-- DELETE FROM dbo.group_permissions WHERE permission IN ('customers.set_investor_visibility', 'investors.manage');
-- DROP TABLE IF EXISTS dbo.investor_password_reset_tokens CASCADE;