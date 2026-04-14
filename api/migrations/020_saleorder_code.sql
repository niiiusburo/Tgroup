-- Migration: Add code column to saleorders for sale-order reference display
-- ============================================================================

-- 1. Add a dedicated code column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saleorders' AND column_name = 'code'
  ) THEN
    ALTER TABLE saleorders ADD COLUMN code TEXT;
  END IF;
END
$$;

-- 2. Create a DB sequence for auto-generating new SO codes
-- Start high enough to avoid collisions with any backfilled numeric sequences.
-- We inspect the max numeric suffix currently present and start 1 above it.
DO $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT MAX(sequencenumber) INTO max_num FROM saleorders WHERE sequencenumber IS NOT NULL;
  IF max_num IS NULL THEN
    max_num := 0;
  END IF;

  -- Ensure the sequence exists and starts above the legacy max
  IF NOT EXISTS (
    SELECT 1 FROM pg_sequences WHERE schemaname = 'dbo' AND sequencename = 'saleorder_code_seq'
  ) THEN
    EXECUTE format('CREATE SEQUENCE dbo.saleorder_code_seq START %s', max_num + 1);
  ELSE
    -- If it exists but is lower, bump it
    EXECUTE format('SELECT setval(''dbo.saleorder_code_seq'', GREATEST(currval(''dbo.saleorder_code_seq''), %s))', max_num + 1);
  END IF;
END
$$;

-- 3. Backfill code for existing records that have sequence data
UPDATE saleorders
SET code = sequenceprefix || '-' || LPAD(sequencenumber::text, 5, '0')
WHERE code IS NULL
  AND sequenceprefix IS NOT NULL
  AND sequencenumber IS NOT NULL;

-- 4. Backfill any remaining records without a code using the sequence
DO $$
DECLARE
  rec RECORD;
  year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  seq_num INTEGER;
BEGIN
  FOR rec IN
    SELECT id FROM saleorders
    WHERE code IS NULL AND isdeleted = false
    ORDER BY datecreated ASC NULLS FIRST, id ASC
  LOOP
    SELECT nextval('dbo.saleorder_code_seq') INTO seq_num;
    UPDATE saleorders SET code = 'SO-' || year || '-' || LPAD(seq_num::text, 4, '0') WHERE id = rec.id;
  END LOOP;
END
$$;

-- 5. Ensure uniqueness on code where it is set
-- (soft-deleted records may share old codes, so we only enforce for non-deleted or ignore duplicates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'saleorders' AND constraint_name = 'uniq_saleorders_code'
  ) THEN
    -- Use a partial unique index to avoid conflicts with NULLs or soft-deleted rows
    CREATE UNIQUE INDEX uniq_saleorders_code ON saleorders(code) WHERE code IS NOT NULL AND isdeleted = false;
  END IF;
END
$$;
