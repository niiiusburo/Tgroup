-- NK3-ONLY integrity repair & diagnostics — 2026-06-04
-- Scope: LOCAL 5433 demo DBs ONLY (tdental_demo + tcosmetic_demo). The "NK3" demo data on this machine.
-- NEVER run against real NK (76.13.16.68 / nk.2checkin.com) or NK2 (nk2.2checkin.com).
-- Companion to: scripts/nk3-only/fix-commission-attribution-2026-06.sql
-- Author: audit session 2026-06-04 (CTV portal + DB corruption pass)
--
-- WHAT THIS COVERS (see findings in the session recap / docs):
--   [A] DONE (idempotent): dental earning d29697a9 was status='paid' with payout_id NULL in a DB
--       with ZERO payouts -> reverted to 'pending'. Re-running is a no-op.
--   [B] OPT-IN: CTV cross-DB identity mirror reconciliation (dental = source of truth).
--       Commented out — uncomment ONLY after confirming dental holds the canonical CTV identities.
--   [C] REPORT-ONLY: dental duplicate-phone + sentinel-phone diagnostics (migrated legacy data;
--       do NOT mass-delete — needs a product decision).
--
-- Run per DB, e.g.:
--   PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tdental_demo  -f scripts/nk3-only/nk3-integrity-repair-2026-06-04.sql
--   PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d tcosmetic_demo -f scripts/nk3-only/nk3-integrity-repair-2026-06-04.sql

\echo '=== NK3-ONLY integrity repair. Confirm local 5433 demo DBs. Ctrl-C now if not. ==='

-- =====================================================================================
-- [A] Orphaned paid status (dental only). Idempotent. ALREADY APPLIED in the audit session.
--     Safe because: dbo.payouts is empty in dental, so a 'paid' earning is provably not paid out.
-- =====================================================================================
BEGIN;
DO $$
DECLARE n int;
BEGIN
  IF current_database() = 'tdental_demo' AND (SELECT count(*) FROM dbo.payouts) = 0 THEN
    UPDATE dbo.earnings
       SET status = 'pending'
     WHERE status = 'paid' AND payout_id IS NULL;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE '[A] dental paid-without-payout reverted to pending: % row(s)', n;
  ELSE
    RAISE NOTICE '[A] skipped (not dental, or dental has payouts — review manually)';
  END IF;
END $$;
COMMIT;

-- =====================================================================================
-- [B] CTV cross-DB identity mirror reconciliation  (run on tcosmetic_demo ONLY)
--     ROOT CAUSE: ctvSelfProfile.js mirrors name only, gated on employee=true, and NEVER mirrors
--     phone; admin edits / manual test edits drifted the cosmetic mirror ("...EDITED",
--     "...UIVERIFIED", phone 0909123463 -> 0909123999, employee=false on cosmetic Admin row).
--     Dental is treated as the canonical source of truth for the 6 mirrored CTV identities.
--     NOTE: password_hash is intentionally NOT copied here (auth data) — re-set via the CTV
--     self-service password flow, or copy hashes deliberately as a separate reviewed step.
--     UNCOMMENT to apply after confirming "dental is canonical".
-- =====================================================================================
-- BEGIN;
-- DO $$
-- BEGIN
--   IF current_database() <> 'tcosmetic_demo' THEN
--     RAISE NOTICE '[B] skipped (run on tcosmetic_demo only)'; RETURN;
--   END IF;
--   -- canonical (dental) values, applied to the cosmetic mirror rows by UUID:
--   UPDATE dbo.partners SET name='CTV Test Top (L2)',  phone='0900002001', employee=false WHERE id='11111111-1111-4111-8111-111111111111' AND is_ctv=true;
--   UPDATE dbo.partners SET name='CTV Test Mid (L1)',  phone='0900002002', employee=false WHERE id='22222222-2222-4222-8222-222222222222' AND is_ctv=true;
--   UPDATE dbo.partners SET name='Admin',              phone='0900000000', employee=true  WHERE id='28e2c9eb-d410-4881-9cf2-efb2494baad7' AND is_ctv=true;
--   UPDATE dbo.partners SET name='CTV Test Leaf (L0)', phone='0900002003', employee=false WHERE id='33333333-3333-4333-8333-333333333333' AND is_ctv=true;
--   UPDATE dbo.partners SET name='Test CTV 8',         phone='0909123463', employee=true  WHERE id='ba6d583f-dc57-43cc-a813-e86691a5c9c7' AND is_ctv=true;  -- restores ctv-lookup phone
--   UPDATE dbo.partners SET name='CTV Demo Referrer',  phone=NULL,         employee=true  WHERE id='f4ed3813-a023-4888-987a-21992e71abd3' AND is_ctv=true;
--   RAISE NOTICE '[B] cosmetic CTV identities reconciled to dental canonical';
-- END $$;
-- COMMIT;

-- =====================================================================================
-- [C] REPORT-ONLY diagnostics — dental duplicate / sentinel phones (migrated legacy data).
--     Do NOT auto-delete: customers, not CTVs; 0 of these are CTV-referred clients.
-- =====================================================================================
\echo '--- [C] duplicate-phone groups (dental), excluding empty/sentinel ---'
SELECT count(*) AS dup_phone_groups,
       COALESCE(SUM(c - 1), 0) AS excess_rows
FROM (SELECT count(*) c FROM dbo.partners
      WHERE phone IS NOT NULL AND phone NOT IN ('', '0')
      GROUP BY phone HAVING count(*) > 1) x;
\echo '--- [C] sentinel phone=0 row count (dental) ---'
SELECT count(*) AS phone_zero_rows FROM dbo.partners WHERE phone = '0';
\echo '--- [C] any duplicate-phone row that is CTV-referred (should be 0 = dedup is attribution-safe) ---'
SELECT count(*) AS referred_dups
FROM dbo.partners
WHERE referred_by_ctv_id IS NOT NULL
  AND phone IN (SELECT phone FROM dbo.partners WHERE phone IS NOT NULL AND phone NOT IN ('','0') GROUP BY phone HAVING count(*) > 1);

-- =====================================================================================
-- [D] CTV lob_scope backfill — fixes "no dental line" / CTV invisible in a LOB admin list.
--     SYMPTOM: a CTV mirrored into a DB with empty lob_scope is filtered OUT of that LOB's
--       admin roster (GET /api/[cosmetic/]Ctvs filters `lob_scope @> ARRAY[lob]`), so it looks
--       like the save "only went to one LOB". The row exists; its scope is just empty.
--     RULE (matches POST /api/ctv handler, api/src/routes/ctv.js): a CTV that has an auth row in
--       a DB must list that DB's LOB in lob_scope. Dental is ALWAYS included (CTV logs in against
--       the dental/default partners table). A CTV mirrored into cosmetic must include 'cosmetic'.
--     IDEMPOTENT: re-running is a no-op once scopes are correct.
--     OPT-IN: uncomment to apply. Run on BOTH demo DBs (dental adds 'dental'; cosmetic adds
--       'dental','cosmetic' because a cosmetic mirror row implies both).
-- =====================================================================================
-- BEGIN;
-- DO $$
-- DECLARE n int;
-- BEGIN
--   IF current_database() = 'tdental_demo' THEN
--     -- Every CTV auth row in dental must at least be dental-scoped.
--     UPDATE dbo.partners
--        SET lob_scope = ARRAY['dental']::text[]
--      WHERE is_ctv = true
--        AND COALESCE(array_length(lob_scope, 1), 0) = 0;
--     GET DIAGNOSTICS n = ROW_COUNT;
--     RAISE NOTICE '[D] dental: backfilled lob_scope={dental} on % empty-scope CTV row(s)', n;
--   ELSIF current_database() = 'tcosmetic_demo' THEN
--     -- A CTV mirrored into cosmetic is, by construction, scoped to BOTH LOBs.
--     UPDATE dbo.partners
--        SET lob_scope = ARRAY['dental','cosmetic']::text[]
--      WHERE is_ctv = true
--        AND COALESCE(array_length(lob_scope, 1), 0) = 0;
--     GET DIAGNOSTICS n = ROW_COUNT;
--     RAISE NOTICE '[D] cosmetic: backfilled lob_scope={dental,cosmetic} on % empty-scope CTV row(s)', n;
--   ELSE
--     RAISE NOTICE '[D] skipped (unknown DB %)', current_database();
--   END IF;
-- END $$;
-- COMMIT;

\echo '--- [D] REPORT-ONLY: CTVs with empty lob_scope in this DB (these are invisible in the LOB roster) ---'
SELECT id, name, phone, lob_scope
FROM dbo.partners
WHERE is_ctv = true AND COALESCE(array_length(lob_scope, 1), 0) = 0
ORDER BY name;

-- =====================================================================================
-- Re-verification (run anytime)
-- =====================================================================================
\echo '--- VERIFY: paid earnings with NULL payout (expect 0) ---'
SELECT count(*) AS paid_without_payout FROM dbo.earnings WHERE status = 'paid' AND payout_id IS NULL;
\echo '--- VERIFY: pending earnings orphaned from deleted payments (expect 0) ---'
SELECT count(*) AS orphan_pending FROM dbo.earnings e
WHERE e.status='pending' AND e.payout_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM dbo.payments p WHERE p.id = e.payment_id);
\echo '=== NK3 integrity repair script complete. ==='
