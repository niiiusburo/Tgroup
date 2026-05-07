-- Migration: Add payment confirmation tracking
-- Adds confirmed_at, confirmed_by, confirmation_notes, and created_by to payments

-- 1. Add confirmation and creator tracking columns
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITHOUT TIME ZONE,
  ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmation_notes TEXT;

-- Same for dbo schema (VPS compatibility)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'dbo' AND table_name = 'payments') THEN
    ALTER TABLE dbo.payments
      ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES dbo.partners(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITHOUT TIME ZONE,
      ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES dbo.partners(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS confirmation_notes TEXT;
  END IF;
END $$;

-- 2. Indexes for fast confirmation lookups
CREATE INDEX IF NOT EXISTS idx_payments_confirmed_by ON payments(confirmed_by);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_confirmed_at ON payments(confirmed_at);

-- Same for dbo schema
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'dbo' AND table_name = 'payments') THEN
    CREATE INDEX IF NOT EXISTS idx_dbo_payments_confirmed_by ON dbo.payments(confirmed_by);
    CREATE INDEX IF NOT EXISTS idx_dbo_payments_created_by ON dbo.payments(created_by);
    CREATE INDEX IF NOT EXISTS idx_dbo_payments_confirmed_at ON dbo.payments(confirmed_at);
  END IF;
END $$;
