-- 057_payout_group_id.sql
-- Wave 4 of docs/business-logic/ctv-referral-commission.md (§10 Combined Payouts).
--
-- A combined payout creates one LOB-local payout row in Dental AND one in Cosmetic, linked by
-- the SAME payout_group_id (the two physical DBs can't share a row). The CTV portal shows one
-- combined row (expandable per-LOB); admin "All" groups by payout_group_id.
--
-- SAFETY: additive (nullable column + index). Apply to BOTH tdental_nk3 and tcosmetic_nk3.
-- Existing single-LOB payouts keep payout_group_id = NULL. Idempotent.

BEGIN;

ALTER TABLE dbo.payouts ADD COLUMN IF NOT EXISTS payout_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_payouts_group_id
  ON dbo.payouts (payout_group_id)
  WHERE payout_group_id IS NOT NULL;

COMMIT;

-- Rollback: DROP INDEX IF EXISTS dbo.idx_payouts_group_id; ALTER TABLE dbo.payouts DROP COLUMN IF EXISTS payout_group_id;
