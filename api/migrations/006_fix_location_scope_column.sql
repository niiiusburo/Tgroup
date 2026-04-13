-- Fix employee_location_scope column name for environments created with the old schema
DO $$
BEGIN
  -- If the old column exists, rename it to company_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dbo'
      AND table_name = 'employee_location_scope'
      AND column_name = 'location_id'
  ) THEN
    ALTER TABLE dbo.employee_location_scope RENAME COLUMN location_id TO company_id;
  END IF;
END $$;
