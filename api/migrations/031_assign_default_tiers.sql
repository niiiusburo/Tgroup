-- Migration 031: Assign default tiers to employees with NULL tier_id
-- Based on jobtitle and isdoctor flag from dbo.partners
--
-- Distribution (299 employees):
--   Doctors (isdoctor=true)        → Editor       (36)
--   Quản lý cơ sở (managers)       → Admin        (8)
--   Lễ tân (receptionists)         → Receptionist (16)
--   Phụ tá / Trợ lý (assistants)   → Assistant    (74)
--   All remaining (no specific role)→ Assistant    (165)

BEGIN;

-- Doctors → Editor
UPDATE dbo.partners SET tier_id = '11111111-0000-0000-0000-000000000003'
WHERE employee = true AND tier_id IS NULL AND isdoctor = true;

-- Managers → Admin
UPDATE dbo.partners SET tier_id = '11111111-0000-0000-0000-000000000002'
WHERE employee = true AND tier_id IS NULL
AND (LOWER(jobtitle) LIKE '%quản lý%' OR LOWER(jobtitle) LIKE '%manager%' OR LOWER(jobtitle) LIKE '%giám đốc%');

-- Receptionists → Receptionist
UPDATE dbo.partners SET tier_id = '11111111-0000-0000-0000-000000000004'
WHERE employee = true AND tier_id IS NULL
AND (LOWER(jobtitle) LIKE '%lễ tân%' OR LOWER(jobtitle) LIKE '%receptionist%');

-- Assistants (explicit job titles) → Assistant
UPDATE dbo.partners SET tier_id = '11111111-0000-0000-0000-000000000005'
WHERE employee = true AND tier_id IS NULL
AND (LOWER(jobtitle) LIKE '%phụ tá%' OR LOWER(jobtitle) LIKE '%trợ lý%' OR LOWER(jobtitle) LIKE '%assistant%');

-- All remaining unassigned → Assistant (default lowest tier)
UPDATE dbo.partners SET tier_id = '11111111-0000-0000-0000-000000000005'
WHERE employee = true AND tier_id IS NULL;

-- Insert employee_permissions for all employees that don't have one yet
INSERT INTO dbo.employee_permissions (employee_id, group_id)
SELECT p.id, p.tier_id
FROM dbo.partners p
LEFT JOIN dbo.employee_permissions ep ON ep.employee_id = p.id
WHERE p.employee = true AND p.tier_id IS NOT NULL AND ep.id IS NULL;

COMMIT;
