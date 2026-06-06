-- @crossref:domain[earnings-commissions]
-- @crossref:used-in[NK3 schema migration: api/migrations/060_earnings_payout_id_fk]
-- @crossref:uses[product-map/domains/earnings-commissions.yaml, docs/MIGRATIONS.md, docs/runbooks/MONEY_FLOW.md]
-- 060_earnings_payout_id_fk.sql
--
-- earnings.payout_id had NO foreign key to payouts(id). Hard-deleting a payout therefore
-- left earnings rows pointing at a non-existent payout (observed on NK3: an orphaned
-- payout_id after the payouts table was emptied). Add the FK with ON DELETE SET NULL so a
-- payout delete cleanly detaches its earnings (they revert to un-paid-out) instead of
-- orphaning them. ON UPDATE CASCADE keeps them aligned if a payout id is ever rekeyed.
--
-- Idempotent: only adds the constraint if it does not already exist. Both NK3 DBs were
-- verified to have 0 orphaned rows before this migration, so the ADD cannot fail validation.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dbo.earnings'::regclass
      AND contype = 'f'
      AND conname = 'earnings_payout_id_fkey'
  ) THEN
    ALTER TABLE dbo.earnings
      ADD CONSTRAINT earnings_payout_id_fkey
      FOREIGN KEY (payout_id) REFERENCES dbo.payouts(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
