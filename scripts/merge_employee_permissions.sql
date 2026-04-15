-- ============================================================================
-- Employee Permission Merge Script
-- Generated: 2026-04-15
-- Purpose: Map 319 employees to 5 permission tiers
-- ============================================================================

-- Tier IDs (must match existing permission_groups)
DO $$
DECLARE
    v_admin_id          UUID := '11111111-0000-0000-0000-000000000001';
    v_clinic_mgr_id     UUID := '11111111-0000-0000-0000-000000000002';
    v_dentist_id        UUID := '11111111-0000-0000-0000-000000000003';
    v_receptionist_id   UUID := '11111111-0000-0000-0000-000000000004';
    v_assistant_id      UUID := '11111111-0000-0000-0000-000000000005';
BEGIN

    -- ============================================================================
    -- 1. Clear existing employee permission assignments
    -- ============================================================================
    DELETE FROM dbo.employee_permissions;

    -- ============================================================================
    -- 2. Clear existing tier_id references on partners
    -- ============================================================================
    UPDATE dbo.partners SET tier_id = NULL WHERE employee = true;

    -- ============================================================================
    -- 3. Insert Admin tier (ACTIVE only)
    -- ============================================================================
    INSERT INTO dbo.employee_permissions (employee_id, group_id)
    SELECT p.id, v_admin_id
    FROM dbo.partners p
    WHERE p.employee = true
      AND p.active = true
      AND (p.name ILIKE 'admin' OR p.jobtitle ILIKE '%quản trị viên hệ thống%');

    UPDATE dbo.partners SET tier_id = v_admin_id WHERE employee = true
      AND active = true
      AND (name ILIKE 'admin' OR jobtitle ILIKE '%quản trị viên hệ thống%');

    -- ============================================================================
    -- 4. Insert Dental Assistant tier (ACTIVE only)
    -- ============================================================================
    INSERT INTO dbo.employee_permissions (employee_id, group_id)
    SELECT p.id, v_assistant_id
    FROM dbo.partners p
    WHERE p.employee = true
      AND p.active = true
      AND (
        p.isassistant = true
        OR p.jobtitle ILIKE '%phụ tá%'
        OR p.jobtitle ILIKE '%trợ lý bác sĩ%'
        OR p.name ILIKE '%pt'
        OR p.name ILIKE '%- pt%'
        OR p.name ILIKE 'pt1 %'
        OR p.name ILIKE 'pt3 %'
        OR p.name ILIKE '%phụ tá%'
      )
      AND NOT (
        -- Exclude actual dentists that might match name patterns
        p.isdoctor = true AND (p.jobtitle ILIKE '%bác sĩ%' OR p.name ~* '^bác sĩ\\s' OR p.name ~* '^bs\\.?\\s')
      )
    ON CONFLICT ON CONSTRAINT employee_permissions_pkey DO NOTHING;

    UPDATE dbo.partners SET tier_id = v_assistant_id WHERE employee = true
      AND active = true
      AND (
        isassistant = true
        OR jobtitle ILIKE '%phụ tá%'
        OR jobtitle ILIKE '%trợ lý bác sĩ%'
        OR name ILIKE '%pt'
        OR name ILIKE '%- pt%'
        OR name ILIKE 'pt1 %'
        OR name ILIKE 'pt3 %'
        OR name ILIKE '%phụ tá%'
      )
      AND NOT (
        isdoctor = true AND (jobtitle ILIKE '%bác sĩ%' OR name ~* '^bác sĩ\\s' OR name ~* '^bs\\.?\\s')
      );

    -- ============================================================================
    -- 5. Insert Receptionist tier (ACTIVE only)
    -- ============================================================================
    INSERT INTO dbo.employee_permissions (employee_id, group_id)
    SELECT p.id, v_receptionist_id
    FROM dbo.partners p
    WHERE p.employee = true
      AND p.active = true
      AND (
        p.isreceptionist = true
        OR p.jobtitle ILIKE '%lễ tân%'
        OR p.jobtitle ILIKE '%nhân viên sale%'
        OR p.jobtitle ILIKE '%cskh%'
        OR p.name ILIKE '%sale%'
        OR p.name ILIKE 'lễ tân%'
        OR p.name ILIKE 'lt %'
        OR p.name ILIKE '%lt th%'
        OR p.name ILIKE 'thyletan%'
      )
      AND NOT (
        -- Exclude assistants and doctors
        p.isassistant = true OR p.isdoctor = true
        OR p.jobtitle ILIKE '%phụ tá%' OR p.jobtitle ILIKE '%trợ lý bác sĩ%'
        OR p.jobtitle ILIKE '%bác sĩ%' OR p.name ~* '^bác sĩ\\s' OR p.name ~* '^bs\\.?\\s'
      )
    ON CONFLICT ON CONSTRAINT employee_permissions_pkey DO NOTHING;

    UPDATE dbo.partners SET tier_id = v_receptionist_id WHERE employee = true
      AND active = true
      AND (
        isreceptionist = true
        OR jobtitle ILIKE '%lễ tân%'
        OR jobtitle ILIKE '%nhân viên sale%'
        OR jobtitle ILIKE '%cskh%'
        OR name ILIKE '%sale%'
        OR name ILIKE 'lễ tân%'
        OR name ILIKE 'lt %'
        OR name ILIKE '%lt th%'
        OR name ILIKE 'thyletan%'
      )
      AND NOT (
        isassistant = true OR isdoctor = true
        OR jobtitle ILIKE '%phụ tá%' OR jobtitle ILIKE '%trợ lý bác sĩ%'
        OR jobtitle ILIKE '%bác sĩ%' OR name ~* '^bác sĩ\\s' OR name ~* '^bs\\.?\\s'
      );

    -- ============================================================================
    -- 6. Insert Dentist tier (ACTIVE only)
    -- ============================================================================
    INSERT INTO dbo.employee_permissions (employee_id, group_id)
    SELECT p.id, v_dentist_id
    FROM dbo.partners p
    WHERE p.employee = true
      AND p.active = true
      AND (
        p.isdoctor = true
        OR p.jobtitle ILIKE '%bác sĩ%'
        OR p.name ~* '^bác sĩ\\s'
        OR p.name ~* '^bs\\.?\\s'
      )
      AND NOT (
        -- Exclude assistants
        p.isassistant = true OR p.jobtitle ILIKE '%phụ tá%' OR p.jobtitle ILIKE '%trợ lý bác sĩ%'
      )
    ON CONFLICT ON CONSTRAINT employee_permissions_pkey DO NOTHING;

    UPDATE dbo.partners SET tier_id = v_dentist_id WHERE employee = true
      AND active = true
      AND (
        isdoctor = true
        OR jobtitle ILIKE '%bác sĩ%'
        OR name ~* '^bác sĩ\\s'
        OR name ~* '^bs\\.?\\s'
      )
      AND NOT (
        isassistant = true OR jobtitle ILIKE '%phụ tá%' OR jobtitle ILIKE '%trợ lý bác sĩ%'
      );

    -- ============================================================================
    -- 7. Insert Clinic Manager tier (ACTIVE only)
    -- ============================================================================
    INSERT INTO dbo.employee_permissions (employee_id, group_id)
    SELECT p.id, v_clinic_mgr_id
    FROM dbo.partners p
    WHERE p.employee = true
      AND p.active = true
      AND (
        p.jobtitle ILIKE '%quản lý cơ sở%'
        OR p.name ILIKE '%qlcs%'
        OR p.jobtitle ILIKE '%marketing%'
        OR p.name ILIKE '%kho%'
        OR p.name ILIKE 'kt kho%'
      )
      AND NOT (
        -- Exclude admins
        p.name ILIKE 'admin' OR p.jobtitle ILIKE '%quản trị viên hệ thống%'
      )
      AND p.isdoctor = false
      AND p.isassistant = false
      AND p.isreceptionist = false
    ON CONFLICT ON CONSTRAINT employee_permissions_pkey DO NOTHING;

    UPDATE dbo.partners SET tier_id = v_clinic_mgr_id WHERE employee = true
      AND active = true
      AND (
        jobtitle ILIKE '%quản lý cơ sở%'
        OR name ILIKE '%qlcs%'
        OR jobtitle ILIKE '%marketing%'
        OR name ILIKE '%kho%'
        OR name ILIKE 'kt kho%'
      )
      AND NOT (
        name ILIKE 'admin' OR jobtitle ILIKE '%quản trị viên hệ thống%'
      )
      AND isdoctor = false
      AND isassistant = false
      AND isreceptionist = false;

    -- ============================================================================
    -- 8. Handle unclassified employees
    --    Strategy: infer from duplicate names, then default active unclassified
    --    to Receptionist. Inactive employees and Service/Test accounts get NO
    --    permissions.
    -- ============================================================================

    -- 8a. Infer from duplicate names for ACTIVE employees only
    INSERT INTO dbo.employee_permissions (employee_id, group_id)
    SELECT p.id, inferred.group_id
    FROM dbo.partners p
    JOIN LATERAL (
      SELECT DISTINCT ON (LOWER(TRIM(p2.name)))
        LOWER(TRIM(p2.name)) as normalized_name,
        ep.group_id
      FROM dbo.partners p2
      JOIN dbo.employee_permissions ep ON ep.employee_id = p2.id
      WHERE p2.employee = true
        AND LOWER(TRIM(p2.name)) = LOWER(TRIM(p.name))
        AND p2.id != p.id
      LIMIT 1
    ) inferred ON true
    WHERE p.employee = true
      AND p.active = true
      AND p.tier_id IS NULL
      AND NOT (
        p.name ILIKE 'test%'
        OR p.name ILIKE 'tdental sever%'
        OR p.name ILIKE 'dataconnect%'
        OR p.name ILIKE 'vãng lai'
      )
    ON CONFLICT ON CONSTRAINT employee_permissions_pkey DO NOTHING;

    -- Update tier_id for inferred (active only)
    UPDATE dbo.partners p
    SET tier_id = (
      SELECT ep.group_id
      FROM dbo.partners p2
      JOIN dbo.employee_permissions ep ON ep.employee_id = p2.id
      WHERE p2.employee = true
        AND LOWER(TRIM(p2.name)) = LOWER(TRIM(p.name))
        AND p2.id != p.id
      LIMIT 1
    )
    WHERE p.employee = true
      AND p.active = true
      AND p.tier_id IS NULL
      AND NOT (
        p.name ILIKE 'test%'
        OR p.name ILIKE 'tdental sever%'
        OR p.name ILIKE 'dataconnect%'
        OR p.name ILIKE 'vãng lai'
      );

    -- 8b. Default remaining ACTIVE unclassified to Receptionist
    INSERT INTO dbo.employee_permissions (employee_id, group_id)
    SELECT p.id, v_receptionist_id
    FROM dbo.partners p
    WHERE p.employee = true
      AND p.active = true
      AND p.tier_id IS NULL
      AND NOT (
        p.name ILIKE 'test%'
        OR p.name ILIKE 'tdental sever%'
        OR p.name ILIKE 'dataconnect%'
        OR p.name ILIKE 'vãng lai'
      )
    ON CONFLICT ON CONSTRAINT employee_permissions_pkey DO NOTHING;

    UPDATE dbo.partners
    SET tier_id = v_receptionist_id
    WHERE employee = true
      AND active = true
      AND tier_id IS NULL
      AND NOT (
        name ILIKE 'test%'
        OR name ILIKE 'tdental sever%'
        OR name ILIKE 'dataconnect%'
        OR name ILIKE 'vãng lai'
      );

    -- ============================================================================
    -- 9. Set location scope
    --    Rule:
    --    - Admin and Clinic Managers get access to ALL locations.
    --    - Everyone else gets access to ONLY their assigned branch (partners.companyid).
    -- ============================================================================
    DELETE FROM dbo.employee_location_scope;

    -- Non-manager employees get their primary location only
    INSERT INTO dbo.employee_location_scope (employee_id, company_id)
    SELECT p.id, p.companyid
    FROM dbo.partners p
    WHERE p.employee = true
      AND p.companyid IS NOT NULL
      AND p.tier_id IS NOT NULL
      AND p.tier_id NOT IN (v_admin_id, v_clinic_mgr_id)
      AND NOT (
        p.name ILIKE 'test%'
        OR p.name ILIKE 'tdental sever%'
        OR p.name ILIKE 'dataconnect%'
        OR p.name ILIKE 'vãng lai'
      )
    ON CONFLICT DO NOTHING;

    -- Admin and Clinic Managers get ALL locations
    INSERT INTO dbo.employee_location_scope (employee_id, company_id)
    SELECT p.id, c.id
    FROM dbo.partners p
    CROSS JOIN dbo.companies c
    WHERE p.employee = true
      AND p.tier_id IS NOT NULL
      AND p.tier_id IN (v_admin_id, v_clinic_mgr_id)
    ON CONFLICT DO NOTHING;

END $$;

-- ============================================================================
-- Verification queries
-- ============================================================================
SELECT pg.name as tier, p.active, COUNT(*) as count
FROM dbo.partners p
LEFT JOIN dbo.permission_groups pg ON p.tier_id = pg.id
WHERE p.employee = true
  AND NOT (
    p.name ILIKE 'test%'
    OR p.name ILIKE 'tdental sever%'
    OR p.name ILIKE 'dataconnect%'
    OR p.name ILIKE 'vãng lai'
  )
GROUP BY pg.name, p.active
ORDER BY pg.name, p.active DESC;
