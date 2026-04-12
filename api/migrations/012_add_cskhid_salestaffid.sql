-- Add cskhid (Customer Service staff) and salestaffid (Sales Staff) columns to partners
-- These reference partners.id where employee=true (same as marketingstaffid)
ALTER TABLE dbo.partners ADD COLUMN IF NOT EXISTS cskhid uuid;
ALTER TABLE dbo.partners ADD COLUMN IF NOT EXISTS salestaffid uuid;
CREATE INDEX IF NOT EXISTS idx_partners_cskhid ON dbo.partners(cskhid) WHERE cskhid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_partners_salestaffid ON dbo.partners(salestaffid) WHERE salestaffid IS NOT NULL;
