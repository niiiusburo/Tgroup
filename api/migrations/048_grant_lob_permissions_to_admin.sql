-- 048_grant_lob_permissions_to_admin.sql
-- Cosmetic LOB v2 Phase 2 — Auto-grant LOB access permissions to Admin group
-- Date: 2026-05-21
-- Applies to: BOTH tdental_demo and tcosmetic_demo (run on each)
--
-- Per v2 spec D5 + Permissions Model (§200-214):
-- - Admin group must have cosmetic.access, dental.access, and lob.crossview
-- - This allows multi-scope admins (with lob_scope=['dental','cosmetic']) to access
--   both /api/dental/* and /api/cosmetic/* routes without manual PermissionBoard steps.
-- - CTV permissions (ctv.*) are NOT granted here (CTV is a separate role, not admin).
--
-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING, safe to re-run.
-- ROLLBACK: DELETE FROM group_permissions WHERE permission IN (
--   'cosmetic.access', 'dental.access', 'lob.crossview') AND group_id = '11111111-0000-0000-0000-000000000001'

INSERT INTO dbo.group_permissions (group_id, permission)
SELECT '11111111-0000-0000-0000-000000000001' AS group_id, perm
FROM (
  VALUES
    ('cosmetic.access'),
    ('dental.access'),
    ('lob.crossview')
) AS perms(perm)
ON CONFLICT (group_id, permission) DO NOTHING;
