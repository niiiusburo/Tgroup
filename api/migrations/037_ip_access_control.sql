-- IP Access Control tables for whitelist/blacklist management

-- Settings table: stores the current access mode (single-row config)
CREATE TABLE IF NOT EXISTS dbo.ip_access_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mode VARCHAR(50) NOT NULL DEFAULT 'allow_all' CHECK (mode IN ('allow_all', 'block_all', 'whitelist_only', 'blacklist_block')),
    last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed default settings row (only one row expected)
INSERT INTO dbo.ip_access_settings (mode, last_updated)
VALUES ('allow_all', NOW())
ON CONFLICT DO NOTHING;

-- Entries table: individual whitelist/blacklist IP addresses
CREATE TABLE IF NOT EXISTS dbo.ip_access_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('whitelist', 'blacklist')),
    description TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES dbo.partners(id) ON DELETE SET NULL
);

-- Indexes for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_access_entries_address_type
    ON dbo.ip_access_entries(ip_address, type);

CREATE INDEX IF NOT EXISTS idx_ip_access_entries_type_active
    ON dbo.ip_access_entries(type, is_active);
