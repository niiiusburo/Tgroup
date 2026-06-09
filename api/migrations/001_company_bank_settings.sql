-- @crossref:domain[business-unit]
-- @crossref:used-in[NK3 schema migration: api/migrations/001_company_bank_settings]
-- @crossref:uses[product-map/domains/business-unit.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
CREATE TABLE IF NOT EXISTS company_bank_settings (
  id SERIAL PRIMARY KEY,
  bank_bin VARCHAR(20) NOT NULL,
  bank_number VARCHAR(50) NOT NULL,
  bank_account_name VARCHAR(200) NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
