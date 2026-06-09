-- @crossref:domain[settings-system]
-- @crossref:used-in[NK3 schema migration: api/migrations/012_add_cskhid_salestaffid]
-- @crossref:uses[product-map/domains/settings-system.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- Add cskhid (Customer Service staff) and salestaffid (Sales Staff) columns to partners
-- These reference partners.id where employee=true (same as marketingstaffid)
ALTER TABLE dbo.partners ADD COLUMN IF NOT EXISTS cskhid uuid;
ALTER TABLE dbo.partners ADD COLUMN IF NOT EXISTS salestaffid uuid;
CREATE INDEX IF NOT EXISTS idx_partners_cskhid ON dbo.partners(cskhid) WHERE cskhid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partners_salestaffid ON dbo.partners(salestaffid) WHERE salestaffid IS NOT NULL;
