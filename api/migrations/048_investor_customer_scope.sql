-- Migration 047: Investor customer scope (investor = restricted employee)
--
-- Investors are normal employee/partner accounts placed in the 'investor'
-- permission group. Their visibility is limited to an explicit per-customer
-- allowlist in dbo.investor_clients, enforced at the QUERY level by
-- resolveInvestorScope() in api/src/services/permissionService.js.
--
-- Dental only. Models the employee_location_scope pattern (migration 005),
-- but keyed by customer (partner_id) instead of location (company_id).
--
-- The investor group is granted view+edit on customers/appointments/payments
-- plus view on reports/services/calendar/locations. It is deliberately NOT
-- granted customers.add / customers.delete / customers.hard_delete, so the
-- existing requirePermission gate auto-403s those endpoints for investors.

-- 1) Allowlist: which customers an investor may see/act on.
CREATE TABLE IF NOT EXISTS dbo.investor_clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES dbo.partners(id) ON DELETE CASCADE,  -- the investor's employee/partner id
  partner_id  UUID NOT NULL REFERENCES dbo.partners(id) ON DELETE CASCADE,  -- the customer made visible
  is_visible  BOOLEAN NOT NULL DEFAULT true,
  datecreated TIMESTAMP DEFAULT NOW(),
  lastupdated TIMESTAMP DEFAULT NOW(),
  UNIQUE (investor_id, partner_id)
);
CREATE INDEX IF NOT EXISTS idx_investor_clients_investor ON dbo.investor_clients(investor_id) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_investor_clients_partner  ON dbo.investor_clients(partner_id);

-- 2) Seed the 'investor' permission group + minimal permission set per schema.
DO $$
DECLARE
  inv_perms TEXT[] := ARRAY[
    'customers.view','customers.edit',
    'appointments.view','appointments.add','appointments.edit',
    'payment.view','payment.add','payment.edit','payment.refund','payment.void',
    'services.view','reports.view','calendar.view','locations.view'
  ];
  perm TEXT;
  gid UUID;
BEGIN
  -- dbo schema (primary; API search_path=dbo)
  IF to_regclass('dbo.permission_groups') IS NOT NULL AND to_regclass('dbo.group_permissions') IS NOT NULL THEN
    SELECT id INTO gid FROM dbo.permission_groups WHERE name = 'investor';
    IF gid IS NULL THEN
      INSERT INTO dbo.permission_groups (id, name) VALUES (gen_random_uuid(), 'investor') RETURNING id INTO gid;
    END IF;
    FOREACH perm IN ARRAY inv_perms LOOP
      INSERT INTO dbo.group_permissions (group_id, permission) VALUES (gid, perm)
      ON CONFLICT (group_id, permission) DO NOTHING;
    END LOOP;
  END IF;

  -- public schema (mirror, if present — matches migration 046 dual-schema pattern)
  IF to_regclass('public.permission_groups') IS NOT NULL AND to_regclass('public.group_permissions') IS NOT NULL THEN
    SELECT id INTO gid FROM public.permission_groups WHERE name = 'investor';
    IF gid IS NULL THEN
      INSERT INTO public.permission_groups (id, name) VALUES (gen_random_uuid(), 'investor') RETURNING id INTO gid;
    END IF;
    FOREACH perm IN ARRAY inv_perms LOOP
      INSERT INTO public.group_permissions (group_id, permission) VALUES (gid, perm)
      ON CONFLICT (group_id, permission) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- To make a person an investor (per-deployment, not seeded here):
--   1) create/ensure a dbo.partners row with employee = true and login credentials
--   2) SET that partner's tier_id = (SELECT id FROM dbo.permission_groups WHERE name='investor')
--   3) owner/admin ticks customers visible via dbo.investor_clients (investor_id, partner_id)
