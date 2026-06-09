-- @crossref:domain[settings-system]
-- @crossref:used-in[NK3 schema migration: api/migrations/038_add_accountinvoices_table]
-- @crossref:uses[product-map/domains/settings-system.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- Migration 038: Create accountinvoices table
-- Fixes 500 error on /api/DotKhams when LEFT JOINing accountinvoices
-- This table is populated by the TDental delta sync; we create the minimal
-- schema here so the API query doesn't fail.

CREATE TABLE IF NOT EXISTS dbo.accountinvoices (
    id          UUID PRIMARY KEY,
    name        VARCHAR(255),
    datecreated TIMESTAMP WITH TIME ZONE,
    lastupdated TIMESTAMP WITH TIME ZONE
);

-- Grant permissions
GRANT ALL ON TABLE dbo.accountinvoices TO tgroupuser;
