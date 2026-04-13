-- Migration 021: Unique constraints on partners.phone and partners.email
-- ============================================================================
-- Purpose  : Enforce data integrity by preventing duplicate phone numbers and
--            email addresses on the dbo.partners table.
-- PR/Issue : https://github.com/niiiusburo/Tgroup/issues/19  (Task #3)
-- Author   : ai-develop
--
-- Pre-check findings (run against demo DB tdental_demo on 2026-04-13):
--
--   PHONE duplicates — 2 duplicate groups found:
--     phone='0349762840'   → 4 rows (IDs below)
--     phone='0966 080 638' → 2 rows (IDs below)
--
--   EMAIL duplicates — 1 duplicate group found:
--     email='dup@example.com' → 3 rows (IDs below)
--
-- ⚠ BLOCKER: Duplicates exist in the demo DB. The DDL at the bottom of this
--   file will FAIL until all duplicates are resolved. Review the remediation
--   block, decide which rows to keep / merge / delete, then re-run this file.
-- ============================================================================


-- ============================================================================
-- PRE-CHECK — Uncomment and run to inspect duplicates before applying DDL
-- ============================================================================
-- SELECT phone, COUNT(*) AS dup_count
-- FROM dbo.partners
-- WHERE phone IS NOT NULL AND phone <> ''
-- GROUP BY phone
-- HAVING COUNT(*) > 1
-- ORDER BY dup_count DESC;
--
-- SELECT LOWER(email) AS email_lower, COUNT(*) AS dup_count
-- FROM dbo.partners
-- WHERE email IS NOT NULL AND email <> ''
-- GROUP BY LOWER(email)
-- HAVING COUNT(*) > 1
-- ORDER BY dup_count DESC;
-- ============================================================================


-- ============================================================================
-- REMEDIATION — Manual action required before this migration can be applied
-- ============================================================================
-- The following rows contain duplicate phone or email values.
-- Do NOT auto-delete — review each group and decide which record to keep.
--
-- GROUP 1: phone='0349762840' (4 rows)
--   17b3cc4d-2f3c-42e9-999c-456e1a1113d9  | Dup               | phone: 0349762840   | email: dup@example.com
--   d4696609-47a5-491b-8bbf-6882b70b95af  | Duplicate Test    | phone: 0349762840   | email: dup@example.com
--   f5e83cd9-aaf5-4726-b641-e062b2205632  | Duplicate Test    | phone: 0349762840   | email: dup@example.com
--   b2262736-c7f4-4072-a67f-b3d00095dcf1  | Phạm Ngọc Huy     | phone: 0349762840   | email: (none)
--
-- GROUP 2: phone='0966 080 638' (2 rows)
--   86d44007-e3a8-4f4d-a51d-b13f003eb759  | Tấm Dentist Gò Vấp  | phone: 0966 080 638 | email: (none)
--   d73c7cd6-7be4-4356-b2b6-b13f003ed8a4  | Tấm Dentist Đống Đa | phone: 0966 080 638 | email: (none)
--
-- GROUP 3: email='dup@example.com' (3 rows — overlaps with GROUP 1)
--   17b3cc4d-2f3c-42e9-999c-456e1a1113d9  | Dup            | phone: 0349762840   | email: dup@example.com
--   d4696609-47a5-491b-8bbf-6882b70b95af  | Duplicate Test | phone: 0349762840   | email: dup@example.com
--   f5e83cd9-aaf5-4726-b641-e062b2205632  | Duplicate Test | phone: 0349762840   | email: dup@example.com
--
-- Example remediation queries (edit IDs to match your decision):
--
--   -- Nullify phone on rows you want to de-duplicate (keeps record, clears phone):
--   UPDATE dbo.partners SET phone = NULL WHERE id IN (
--     'd4696609-47a5-491b-8bbf-6882b70b95af',
--     'f5e83cd9-aaf5-4726-b641-e062b2205632'
--   );
--
--   -- Or delete test/dummy rows outright (only if safe):
--   DELETE FROM dbo.partners WHERE id IN (
--     'd4696609-47a5-491b-8bbf-6882b70b95af',
--     'f5e83cd9-aaf5-4726-b641-e062b2205632'
--   );
--
-- After resolving duplicates, verify with the pre-check queries above, then
-- uncomment and run the DDL block below.
-- ============================================================================


-- ============================================================================
-- DDL — Wrapped in a transaction so a failure rolls back cleanly
-- ============================================================================
BEGIN;

-- 1. Unique constraint on phone
--    Postgres natively allows multiple NULLs in a UNIQUE column, so NULL phones
--    are fine. Blank strings ('') are excluded via a partial index instead of
--    a table constraint so we do not have to back-fill NULLs for blank values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'dbo'
      AND tablename  = 'partners'
      AND indexname  = 'partners_phone_unique'
  ) THEN
    CREATE UNIQUE INDEX partners_phone_unique
      ON dbo.partners (phone)
      WHERE phone IS NOT NULL AND phone <> '';
  END IF;
END$$;

-- 2. Case-insensitive unique index on email
--    Partial index so NULL and blank emails do not conflict with each other.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'dbo'
      AND tablename  = 'partners'
      AND indexname  = 'partners_email_lower_unique'
  ) THEN
    CREATE UNIQUE INDEX partners_email_lower_unique
      ON dbo.partners (LOWER(email))
      WHERE email IS NOT NULL AND email <> '';
  END IF;
END$$;

COMMIT;


-- ============================================================================
-- DOWN (rollback) — Uncomment to revert this migration
-- ============================================================================
-- DROP INDEX IF EXISTS dbo.partners_phone_unique;
-- DROP INDEX IF EXISTS dbo.partners_email_lower_unique;
-- ============================================================================
