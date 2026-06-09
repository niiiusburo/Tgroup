-- @crossref:domain[settings-system]
-- @crossref:used-in[NK3 schema migration: api/migrations/058_audit_logs]
-- @crossref:uses[product-map/domains/settings-system.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- 058_audit_logs.sql
-- Wave 6 of docs/business-logic/ctv-referral-commission.md (§12 hierarchy management).
--
-- Generic audit trail. Used by the admin CTV hierarchy MOVE action to record upline changes
-- automatically (no free-text reason). Canonical store is the dental/auth DB.
--
-- SAFETY: additive (new table). Apply to tdental_nk3 (canonical). Idempotent.

BEGIN;

CREATE TABLE IF NOT EXISTS dbo.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  action      TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON dbo.audit_logs (entity_type, entity_id);

COMMIT;

-- Rollback: DROP TABLE IF EXISTS dbo.audit_logs;
