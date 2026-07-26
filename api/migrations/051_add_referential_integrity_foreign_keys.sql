-- Add the foreign keys that staff/product/branch references have been missing.
-- Shape follows migrations/050_add_customer_source_foreign_keys.sql: idempotent guard,
-- ADD ... NOT VALID first (so the ACCESS EXCLUSIVE lock is brief), then VALIDATE separately.
--
-- Live read-only preflight against nk (tdental_demo, shared by nk and nk2) on 2026-07-26
-- found ZERO orphan rows for every constraint added here:
--
--   appointments.doctorid      -> partners     0 orphans
--   appointments.assistantid   -> partners     0 orphans
--   appointments.dentalaideid  -> partners     0 orphans
--   appointments.productid     -> products     0 orphans
--   partners.cskhid            -> partners     0 orphans   (customer-care staff assignment)
--   saleorders.companyid       -> companies    0 orphans
--   saleorders.doctorid        -> partners     0 orphans
--
-- DELIBERATELY NOT INCLUDED — these two have real orphans and must be reconciled by hand
-- before any constraint is attempted, otherwise VALIDATE fails and this migration aborts:
--
--   partners.salestaffid       -> partners    22 orphans
--   saleorders.partnerid       -> partners    22 orphans
--
-- Already constrained before this migration, so not repeated here: appointments.partnerid,
-- appointments.companyid, partners.companyid, payments.customer_id.
--
-- ON DELETE choices:
--   * staff and product references use SET NULL. All seven columns are nullable, and the
--     app already renders these as optional ("no doctor assigned"), so detaching is the
--     behaviour the UI expects. CASCADE would delete appointment history when an employee
--     record is removed.
--   * saleorders.companyid uses RESTRICT. Nulling the branch on a sale order would silently
--     corrupt revenue-by-location reporting, and cascading would delete money rows, so
--     deleting a company that still has orders should simply be refused.

BEGIN;

DO $$
BEGIN
  -- appointments.doctorid -> partners
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dbo.appointments'::regclass
      AND conname = 'appointments_doctorid_partners_fk'
  ) THEN
    ALTER TABLE dbo.appointments
      ADD CONSTRAINT appointments_doctorid_partners_fk
      FOREIGN KEY (doctorid) REFERENCES dbo.partners(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;

  -- appointments.assistantid -> partners
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dbo.appointments'::regclass
      AND conname = 'appointments_assistantid_partners_fk'
  ) THEN
    ALTER TABLE dbo.appointments
      ADD CONSTRAINT appointments_assistantid_partners_fk
      FOREIGN KEY (assistantid) REFERENCES dbo.partners(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;

  -- appointments.dentalaideid -> partners
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dbo.appointments'::regclass
      AND conname = 'appointments_dentalaideid_partners_fk'
  ) THEN
    ALTER TABLE dbo.appointments
      ADD CONSTRAINT appointments_dentalaideid_partners_fk
      FOREIGN KEY (dentalaideid) REFERENCES dbo.partners(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;

  -- appointments.productid -> products
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dbo.appointments'::regclass
      AND conname = 'appointments_productid_products_fk'
  ) THEN
    ALTER TABLE dbo.appointments
      ADD CONSTRAINT appointments_productid_products_fk
      FOREIGN KEY (productid) REFERENCES dbo.products(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;

  -- partners.cskhid -> partners (customer-care staff assigned to a customer)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dbo.partners'::regclass
      AND conname = 'partners_cskhid_partners_fk'
  ) THEN
    ALTER TABLE dbo.partners
      ADD CONSTRAINT partners_cskhid_partners_fk
      FOREIGN KEY (cskhid) REFERENCES dbo.partners(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;

  -- saleorders.companyid -> companies
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dbo.saleorders'::regclass
      AND conname = 'saleorders_companyid_companies_fk'
  ) THEN
    ALTER TABLE dbo.saleorders
      ADD CONSTRAINT saleorders_companyid_companies_fk
      FOREIGN KEY (companyid) REFERENCES dbo.companies(id)
      ON DELETE RESTRICT
      NOT VALID;
  END IF;

  -- saleorders.doctorid -> partners
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dbo.saleorders'::regclass
      AND conname = 'saleorders_doctorid_partners_fk'
  ) THEN
    ALTER TABLE dbo.saleorders
      ADD CONSTRAINT saleorders_doctorid_partners_fk
      FOREIGN KEY (doctorid) REFERENCES dbo.partners(id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

-- Validate outside the DO block. Each of these takes only a SHARE UPDATE EXCLUSIVE lock,
-- so reads and writes continue while the existing rows are checked.
ALTER TABLE dbo.appointments VALIDATE CONSTRAINT appointments_doctorid_partners_fk;
ALTER TABLE dbo.appointments VALIDATE CONSTRAINT appointments_assistantid_partners_fk;
ALTER TABLE dbo.appointments VALIDATE CONSTRAINT appointments_dentalaideid_partners_fk;
ALTER TABLE dbo.appointments VALIDATE CONSTRAINT appointments_productid_products_fk;
ALTER TABLE dbo.partners     VALIDATE CONSTRAINT partners_cskhid_partners_fk;
ALTER TABLE dbo.saleorders   VALIDATE CONSTRAINT saleorders_companyid_companies_fk;
ALTER TABLE dbo.saleorders   VALIDATE CONSTRAINT saleorders_doctorid_partners_fk;

COMMIT;
