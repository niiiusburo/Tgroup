-- @crossref:domain[settings-system]
-- @crossref:used-in[NK3 schema migration: api/migrations/024_add_tooth_fields]
-- @crossref:uses[product-map/domains/settings-system.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- Migration: Add tooth selection fields to sale order lines
ALTER TABLE dbo.saleorderlines
ADD COLUMN IF NOT EXISTS tooth_numbers TEXT,
ADD COLUMN IF NOT EXISTS tooth_comment TEXT;
