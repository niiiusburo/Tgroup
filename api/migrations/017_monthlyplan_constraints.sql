-- @crossref:domain[payments-deposits]
-- @crossref:used-in[NK3 schema migration: api/migrations/017_monthlyplan_constraints]
-- @crossref:uses[product-map/domains/payments-deposits.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- Invariant: monthlyPlan.amount.downPayment-less-than-total (CRITICAL)
-- Idempotent; 017 because 016_saleorder_status_audit.sql exists.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_downpayment_lt_total'
  ) THEN
    ALTER TABLE dbo.monthlyplans
      ADD CONSTRAINT chk_downpayment_lt_total
      CHECK (down_payment < total_amount);
  END IF;
END$$;
