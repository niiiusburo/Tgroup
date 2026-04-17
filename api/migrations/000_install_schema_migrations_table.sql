-- Migration tracking table for idempotent schema management
CREATE TABLE IF NOT EXISTS dbo.schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hash TEXT
);
