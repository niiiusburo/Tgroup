-- @crossref:domain[earnings-commissions]
-- @crossref:used-in[schema migration: api/migrations/061_backfill_null_level_earnings]
-- @crossref:uses[product-map/domains/earnings-commissions.yaml, docs/business-logic/ctv-referral-commission.md, docs/runbooks/MONEY_FLOW.md]
-- 061_backfill_null_level_earnings.sql
--
-- Legacy CTV earnings created by the pre-v3 PAYMENT-TIME path predate the `level`
-- column being populated. The multi-level upline walk + per-row `level` stamping only
-- exist in the current service-card engine (commissionEngine.js). Those legacy rows are
-- SINGLE-LEVEL: exactly one earning per payment, attributed directly to the attached
-- CTV — i.e. level 0. (A multi-level set would have produced sibling rows at levels 0/1/2
-- on the same payment.)
--
-- Backfill level = 0 ONLY for null-level rows that are the SOLE earning on their payment,
-- so a genuine multi-level set (where one row happened to be null) can never be misleveled.
-- Restricted to source='ctv' and non-null payment_id for safety.
--
-- Idempotent (re-running matches nothing once levels are set). As of 2026-06-07, NK3
-- tcosmetic had 3 such rows (2× +170,000 and 1× −145,400 reversal, all pending);
-- tdental had 0. Reversal rows correctly inherit level 0 from their single-level origin.
--
-- NOTE: This migration was authored against NK3 evidence but is environment-agnostic and
-- safe for NK2/NK as well. It only affects already-orphaned legacy rows.

UPDATE dbo.earnings e
SET level = 0
WHERE e.level IS NULL
  AND e.payment_id IS NOT NULL
  AND e.source = 'ctv'
  AND NOT EXISTS (
    SELECT 1 FROM dbo.earnings e2
    WHERE e2.payment_id = e.payment_id
      AND e2.id <> e.id
  );
