-- @crossref:domain[earnings-commissions]
-- @crossref:used-in[NK3 schema migration: api/migrations/055_earnings_service_card_created]
-- @crossref:uses[product-map/domains/earnings-commissions.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- 055_earnings_service_card_created.sql
-- Wave 2 of docs/business-logic/ctv-referral-commission.md (INV-003C).
--
-- Enables SERVICE-CARD-CREATED CTV earnings (born at full service price when a
-- service card with an attached CTV is created), in addition to the legacy
-- payment-time model. Service-card earnings have NO payment_id yet, so:
--   1) earnings.payment_id must become NULLABLE.
--   2) idempotency for service-card earnings is keyed on (service_line_id,
--      recipient_partner_id, level) WHERE payment_id IS NULL.
--
-- SAFETY: additive + nullable-relax only. No data is rewritten. Apply to BOTH
-- tdental_nk3 AND tcosmetic_nk3. Do NOT apply to *_demo (NK/NK2) — the new model
-- is gated behind CTV_SERVICE_CARD_COMMISSION and migrates to NK/NK2 later.
--
-- Idempotent: safe to re-run.

BEGIN;

-- 1) Relax the NOT NULL so service-card earnings (pre-payment) can be inserted.
ALTER TABLE dbo.earnings ALTER COLUMN payment_id DROP NOT NULL;

-- 2) Partial unique index = idempotency guard for service-card earnings.
--    (One pending earning per service line / recipient / level before any payment.)
CREATE UNIQUE INDEX IF NOT EXISTS uq_earnings_service_card
  ON dbo.earnings (service_line_id, recipient_partner_id, level)
  WHERE payment_id IS NULL;

COMMIT;

-- Rollback (manual):
--   DROP INDEX IF EXISTS dbo.uq_earnings_service_card;
--   -- Re-adding NOT NULL requires backfilling/removing any payment_id IS NULL rows first.
