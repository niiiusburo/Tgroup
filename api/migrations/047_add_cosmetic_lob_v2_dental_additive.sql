-- @crossref:domain[business-unit]
-- @crossref:used-in[NK3 schema migration: api/migrations/047_add_cosmetic_lob_v2_dental_additive]
-- @crossref:uses[product-map/domains/business-unit.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- 047_add_cosmetic_lob_v2_dental_additive.sql
-- Cosmetic Line of Business v2 — Phase 0/2 initial additive migration
-- Date: 2026-05-19
-- Applies to: BOTH tdental_demo and tcosmetic_demo (run manually on each)
--
-- DESIGN NOTES (per PLAN.md + specialist audit + v2 spec D1/D5/D11/D13):
-- * Strictly ADDITIVE + reversible. No NOT NULL on new cols without default.
-- * NO `users` table exists in this system (auth/attribution live entirely in `partners` via single-table inheritance + password_hash/email).
--   Therefore lob_scope + is_ctv live on `partners` (deviation from early v2 spec text; documented in DECISIONS.md).
-- * Earnings table (not "commissions") chosen to avoid name collision with legacy commission *rules* tables (see DB specialist report in PLAN).
-- * recipient_partner_id is FK in dental (same-DB partners); SOFT ref (validated in API) in cosmetic context.
-- * All new tables use gen_random_uuid() (pgcrypto assumed available or use uuid_generate_v4 if extension present).
-- * Backfill only touches legacy rows safely.
--
-- ROLLBACK (down) — run in reverse order, then DELETE FROM schema_migrations WHERE filename=... (if tracking present)
--   See comments below each section.
--
-- Verification after apply (on dental):
--   SELECT COUNT(*) FROM partners WHERE lob_scope IS NULL;  -- must be 0 after backfill
--   \d partners | grep -E 'lob_scope|is_ctv|referred_by_ctv_id'
--   \d products | grep commission_rate_percent
--   \dt | grep -E 'earnings|payouts|referral_locks'

-- 1. Additive columns on partners (LOB scope + CTV flag + CTV referral attribution)
ALTER TABLE dbo.partners
  ADD COLUMN IF NOT EXISTS lob_scope TEXT[] NULL,
  ADD COLUMN IF NOT EXISTS is_ctv BOOLEAN NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS referred_by_ctv_id UUID NULL;

-- Backfill legacy dental users/staff/customers (idempotent)
UPDATE dbo.partners
SET lob_scope = ARRAY['dental']
WHERE lob_scope IS NULL
  AND (is_ctv IS NOT TRUE OR is_ctv IS NULL);

-- (Optional but recommended for CTV): ensure is_ctv defaults false for non-CTV
-- No further data change here.

-- ROLLBACK for section 1:
--   ALTER TABLE dbo.partners DROP COLUMN IF EXISTS lob_scope;
--   ALTER TABLE dbo.partners DROP COLUMN IF EXISTS is_ctv;
--   ALTER TABLE dbo.partners DROP COLUMN IF EXISTS referred_by_ctv_id;
--   (Backfill cannot be perfectly undone; re-seed from backup if needed)

-- 2. Additive column on products for per-product commission rate (D11)
-- Defaults to 0 so existing dental products have zero commission impact (backward compat)
ALTER TABLE dbo.products
  ADD COLUMN IF NOT EXISTS commission_rate_percent NUMERIC(5,2) NULL DEFAULT 0;

-- ROLLBACK:
--   ALTER TABLE dbo.products DROP COLUMN IF EXISTS commission_rate_percent;

-- 3. New earnings table (append-only transactional earnings, both DBs)
-- Adapted from v2 spec "commissions" shape but renamed + recipient_partner_id to match real partners-as-auth model.
CREATE TABLE IF NOT EXISTS dbo.earnings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               UUID NOT NULL REFERENCES dbo.partners(id),   -- in cosmetic DB this will be the local partners row
  recipient_partner_id    UUID NOT NULL REFERENCES dbo.partners(id),   -- dental: real FK; cosmetic: same-DB staff or soft-validated
  payment_id              UUID NOT NULL REFERENCES dbo.payments(id),
  service_line_id         UUID NOT NULL REFERENCES dbo.saleorderlines(id),
  source                  TEXT NOT NULL CHECK (source IN ('ctv','consultation','salestaff')),
  amount                  NUMERIC(14,2) NOT NULL,                       -- negative for refund reversals
  status                  TEXT NOT NULL CHECK (status IN ('pending','paid','reversed')) DEFAULT 'pending',
  payout_id               UUID NULL,                                    -- FK added after payouts table or soft
  earned_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful indexes for common queries (CTV self, status, payout)
CREATE INDEX IF NOT EXISTS idx_earnings_recipient_status ON dbo.earnings(recipient_partner_id, status);
CREATE INDEX IF NOT EXISTS idx_earnings_client ON dbo.earnings(client_id);
CREATE INDEX IF NOT EXISTS idx_earnings_payout ON dbo.earnings(payout_id) WHERE payout_id IS NOT NULL;

-- ROLLBACK:
--   DROP INDEX IF EXISTS dbo.idx_earnings_payout;
--   DROP INDEX IF EXISTS dbo.idx_earnings_client;
--   DROP INDEX IF EXISTS dbo.idx_earnings_recipient_status;
--   DROP TABLE IF EXISTS dbo.earnings;

-- 4. New payouts table (batch payout records, both DBs)
CREATE TABLE IF NOT EXISTS dbo.payouts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_label           TEXT NOT NULL,                    -- e.g. "2026-05-CTV"
  paid_at               TIMESTAMPTZ NOT NULL,
  total_amount          NUMERIC(14,2) NOT NULL,
  notes                 TEXT NULL,
  created_by_partner_id UUID NOT NULL,                    -- soft or FK to partners (admin)
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payouts_cycle ON dbo.payouts(cycle_label);

-- ROLLBACK:
--   DROP INDEX IF EXISTS dbo.idx_payouts_cycle;
--   DROP TABLE IF EXISTS dbo.payouts;

-- 5. Dental-only: referral_locks (existing design from v1, now in migration for completeness)
CREATE TABLE IF NOT EXISTS dbo.referral_locks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID NOT NULL REFERENCES dbo.partners(id),  -- the locked customer
  locked_by_staff_id UUID NOT NULL REFERENCES dbo.partners(id),
  reason            TEXT NULL,
  locked_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NULL,
  unlocked_at       TIMESTAMPTZ NULL,
  unlocked_by       UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_referral_locks_partner ON dbo.referral_locks(partner_id);

-- ROLLBACK:
--   DROP INDEX IF EXISTS dbo.idx_referral_locks_partner;
--   DROP TABLE IF EXISTS dbo.referral_locks;

-- 6. Cosmetic-only (harmless on dental): consultations (invisible attribution cards)
-- Can be created on both; only cosmetic routes will populate.
CREATE TABLE IF NOT EXISTS dbo.consultations (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                       UUID NOT NULL REFERENCES dbo.partners(id),
  consulting_staff_id             UUID NOT NULL REFERENCES dbo.partners(id),  -- cosmetic staff (or dental in mixed)
  opened_at                       TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at                      TIMESTAMPTZ NOT NULL,
  status                          TEXT NOT NULL CHECK (status IN ('open','attached','converted','superseded','expired')) DEFAULT 'open',
  superseded_by_consultation_id   UUID NULL REFERENCES dbo.consultations(id),
  notes                           TEXT NULL,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultations_client_status ON dbo.consultations(client_id, status);
CREATE INDEX IF NOT EXISTS idx_consultations_staff ON dbo.consultations(consulting_staff_id);

-- ROLLBACK:
--   DROP INDEX IF EXISTS dbo.idx_consultations_staff;
--   DROP INDEX IF EXISTS dbo.idx_consultations_client_status;
--   DROP TABLE IF EXISTS dbo.consultations;

-- Record in tracking table (idempotent; harmless if table absent in demo)
INSERT INTO dbo.schema_migrations (filename, applied_at)
VALUES ('047_add_cosmetic_lob_v2_dental_additive.sql', now())
ON CONFLICT (filename) DO NOTHING;

-- End of migration 047
-- After apply on both DBs, proceed to Phase 1 (mirrors + toggle).
-- Full pre-deploy gates include migration rollback dry-run (DROP COLUMN / DROP TABLE variants above must succeed).
