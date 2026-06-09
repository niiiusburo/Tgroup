-- @crossref:domain[settings-system]
-- @crossref:used-in[NK3 schema migration: api/migrations/000_install_schema_migrations_table]
-- @crossref:uses[product-map/domains/settings-system.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- Migration tracking table for idempotent schema management
CREATE TABLE IF NOT EXISTS dbo.schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hash TEXT
);
