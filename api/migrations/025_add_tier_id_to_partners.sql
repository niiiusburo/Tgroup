-- Migration: Add tier_id to partners and seed from existing employee_permissions
-- This replaces the separate employee_permissions mapping with a direct tier reference.

BEGIN;

-- 1. Add tier_id column
ALTER TABLE dbo.partners
ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES dbo.permission_groups(id);

-- 2. Migrate existing employee permission assignments into tier_id
UPDATE dbo.partners p
SET tier_id = (
  SELECT group_id FROM dbo.employee_permissions ep WHERE ep.employee_id = p.id
)
WHERE EXISTS (
  SELECT 1 FROM dbo.employee_permissions ep2 WHERE ep2.employee_id = p.id
);

COMMIT;
