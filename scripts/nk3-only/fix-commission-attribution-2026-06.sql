-- NK3-ONLY commission / CTV / earnings cleanup & integrity repair script
-- Run ONLY against the local 5433 tdental_demo + tcosmetic_demo (the NK3 demo DBs on this machine).
-- NEVER run on real NK (76.13.16.68 nk.2checkin.com) or NK2 (nk2.2checkin.com) production/staging.
-- Purpose: repair cases where non-CTV salestaff earnings polluted CTV downline MLM views (e.g. "Trung kien" 39k symptom),
-- and ensure no phantom earnings remain after payment deletes/voids.
-- Idempotent where possible.

\echo '=== NK3-ONLY script. Confirm you are on local 5433 and nk3-deploy branch. Ctrl-C now if not. ==='
\prompt 'Type NK3 to continue: ' confirm
\if :confirm <> 'NK3'
  \echo 'Aborted. Only run on NK3 local demo data.'
  \quit
\endif

BEGIN;

-- 1. For the specific reported partner(s) with phone 0972020908 ("Trung kien" and "LƯU Ý"):
--    - If they have earnings rows that should not be there for CTV downline rollups, mark or note them.
--    - Current forensics (2026-06-01) showed 0 earnings directly to the 0972020908 recipient in dental.
--    - If you have a specific earnings id or payment causing the 39k in the admin panel, add manual DELETE/UPDATE here.
-- Example (commented — fill with real ids from your NK3 panel screenshot):
-- DELETE FROM dbo.earnings WHERE id IN ('...bad-earning-ids...') AND payout_id IS NULL;  -- only pending

-- 2. General hygiene: remove any pending earnings for payments that no longer exist (orphans from the old delete-without-reversal bug).
--    This is safe only on the local NK3 demo DB.
DELETE FROM dbo.earnings e
WHERE e.status = 'pending'
  AND e.payout_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.payments p WHERE p.id = e.payment_id);

-- 3. (Optional) If you want to force all salestaff-sourced earnings out of any CTV downline views on this DB,
--    you can zero the amount on source='salestaff' rows that are polluting a specific CTV's hierarchy.
--    Again — only on local NK3 demo. Example commented:
-- UPDATE dbo.earnings SET amount = 0, status = 'reversed_by_nk3_cleanup'
-- WHERE source = 'salestaff' AND recipient_partner_id IN (SELECT id FROM dbo.partners WHERE phone = '0972020908');

-- 4. After the payments.js fix (delete/void now reverse), re-run any backfill or manual triggers if needed for NK3 data.

COMMIT;

\echo '=== NK3-only cleanup complete on local 5433. Verify in admin panel on http://127.0.0.1:5175 (t@clinic.vn / 123123). ==='
\echo 'Do NOT apply this script or the schema changes to any other environment.'