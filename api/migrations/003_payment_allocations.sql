-- Payment allocation ledger: one payment can be split across multiple invoices
CREATE TABLE IF NOT EXISTS payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES saleorders(id) ON DELETE RESTRICT,
  allocated_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (allocated_amount >= 0),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);

-- Enhance payments table for multi-source and tracking
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_date DATE,
  ADD COLUMN IF NOT EXISTS reference_code TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'posted',
  ADD COLUMN IF NOT EXISTS deposit_used NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bank_amount NUMERIC(15,2) DEFAULT 0;

UPDATE payments SET payment_date = created_at::date WHERE payment_date IS NULL;
UPDATE payments SET status = 'posted' WHERE status IS NULL;
