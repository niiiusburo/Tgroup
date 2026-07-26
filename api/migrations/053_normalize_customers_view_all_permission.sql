-- Collapse the two spellings of "view every customer without searching" into one.
--
-- Live state on nk (2026-07-26), dbo.group_permissions:
--   customers.view_all   3 groups   <- canonical: the string the permission board renders
--   customers.view.all   1 group    <- drift: grantable only by direct DB edit
--
-- Both are honoured at runtime because useCustomers.ts checks BOTH:
--     hasPermission('customers.view.all') || hasPermission('customers.view_all')
-- so the group holding the dotted spelling does work today. That compatibility check must
-- stay in place until this migration has run everywhere, otherwise that group silently
-- loses access to the full customer list.
--
-- Only the dotted rows are rewritten, and only where the canonical row does not already
-- exist for that group, so re-running is safe and no group ends up with duplicates.
--
-- ORDER OF OPERATIONS (do not skip):
--   1. deploy the code that accepts both spellings (already live)
--   2. run this migration
--   3. only in a LATER release, drop the `|| hasPermission('customers.view_all')` fallback
--
-- The permission board only offers customers.view_all, so after this runs every grant is
-- visible and manageable in the UI instead of being invisible drift.

BEGIN;

-- Drop the dotted grant where the group already holds the canonical one (would collide).
DELETE FROM dbo.group_permissions gp
WHERE gp.permission = 'customers.view.all'
  AND EXISTS (
    SELECT 1 FROM dbo.group_permissions canonical
    WHERE canonical.group_id = gp.group_id
      AND canonical.permission = 'customers.view_all'
  );

-- Rename the remaining dotted grants to the canonical spelling.
UPDATE dbo.group_permissions
SET permission = 'customers.view_all'
WHERE permission = 'customers.view.all';

-- Same normalisation for per-employee overrides, if any ever get created.
DELETE FROM dbo.permission_overrides po
WHERE po.permission = 'customers.view.all'
  AND EXISTS (
    SELECT 1 FROM dbo.permission_overrides canonical
    WHERE canonical.employee_id = po.employee_id
      AND canonical.permission = 'customers.view_all'
      AND canonical.override_type = po.override_type
  );

UPDATE dbo.permission_overrides
SET permission = 'customers.view_all'
WHERE permission = 'customers.view.all';

COMMIT;
