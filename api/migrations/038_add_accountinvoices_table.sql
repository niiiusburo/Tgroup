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
