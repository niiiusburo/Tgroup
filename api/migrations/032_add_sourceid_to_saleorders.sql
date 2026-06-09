-- @crossref:domain[services-catalog]
-- @crossref:used-in[NK3 schema migration: api/migrations/032_add_sourceid_to_saleorders]
-- @crossref:uses[product-map/domains/services-catalog.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- Migration: Add sourceid to saleorders and stop using it on partners
BEGIN;

-- Add sourceid to saleorders if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'dbo' AND table_name = 'saleorders' AND column_name = 'sourceid'
    ) THEN
        ALTER TABLE dbo.saleorders ADD COLUMN sourceid uuid;
    END IF;
END $$;

COMMIT;
