-- Keep customer-source lookup rows referenced by customer and order history.
-- Live read-only preflight on 2026-07-23 found zero orphan source IDs in both tables.
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'dbo.partners'::regclass
      AND conname = 'partners_sourceid_customersources_fk'
  ) THEN
    ALTER TABLE dbo.partners
      ADD CONSTRAINT partners_sourceid_customersources_fk
      FOREIGN KEY (sourceid)
      REFERENCES dbo.customersources(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'dbo.saleorders'::regclass
      AND conname = 'saleorders_sourceid_customersources_fk'
  ) THEN
    ALTER TABLE dbo.saleorders
      ADD CONSTRAINT saleorders_sourceid_customersources_fk
      FOREIGN KEY (sourceid)
      REFERENCES dbo.customersources(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;
END $$;

ALTER TABLE dbo.partners
  VALIDATE CONSTRAINT partners_sourceid_customersources_fk;

ALTER TABLE dbo.saleorders
  VALIDATE CONSTRAINT saleorders_sourceid_customersources_fk;

COMMIT;
