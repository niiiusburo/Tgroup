-- Append-only source-change audit ledger (INV-027).
-- Records every successful partners.sourceid / saleorders.sourceid mutation.
-- Application routes must INSERT only; triggers block UPDATE/DELETE.

CREATE TABLE IF NOT EXISTS dbo.source_change_audit (
  id                      UUID PRIMARY KEY,
  entity_type             TEXT NOT NULL CHECK (entity_type IN ('partner', 'saleorder')),
  entity_id               UUID NOT NULL,
  old_sourceid            UUID NULL,
  new_sourceid            UUID NULL,
  actor_employee_id       UUID NULL,
  reason                  TEXT NOT NULL,
  request_id              VARCHAR(128) NOT NULL,
  transaction_id          UUID NOT NULL,
  correction_manifest_ref TEXT NULL,
  change_channel          TEXT NOT NULL,
  is_unexpected           BOOLEAN NOT NULL DEFAULT false,
  unexpected_reasons      TEXT[] NOT NULL DEFAULT '{}',
  alerted_at              TIMESTAMPTZ NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT source_change_audit_source_diff_chk
    CHECK (
      old_sourceid IS DISTINCT FROM new_sourceid
    )
);

CREATE INDEX IF NOT EXISTS idx_source_change_audit_entity
  ON dbo.source_change_audit(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_source_change_audit_created
  ON dbo.source_change_audit(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_source_change_audit_unexpected
  ON dbo.source_change_audit(created_at DESC)
  WHERE is_unexpected = true;

CREATE INDEX IF NOT EXISTS idx_source_change_audit_request
  ON dbo.source_change_audit(request_id);

CREATE INDEX IF NOT EXISTS idx_source_change_audit_tx
  ON dbo.source_change_audit(transaction_id);

CREATE OR REPLACE FUNCTION dbo.prevent_source_change_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'source_change_audit is append-only (no % allowed)', TG_OP
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_source_change_audit_no_update ON dbo.source_change_audit;
CREATE TRIGGER trg_source_change_audit_no_update
  BEFORE UPDATE ON dbo.source_change_audit
  FOR EACH ROW
  EXECUTE FUNCTION dbo.prevent_source_change_audit_mutation();

DROP TRIGGER IF EXISTS trg_source_change_audit_no_delete ON dbo.source_change_audit;
CREATE TRIGGER trg_source_change_audit_no_delete
  BEFORE DELETE ON dbo.source_change_audit
  FOR EACH ROW
  EXECUTE FUNCTION dbo.prevent_source_change_audit_mutation();

-- Permission seeds for authorized correction paths (Super Admin / Admin).
DO $$
BEGIN
  IF to_regclass('public.group_permissions') IS NOT NULL
     AND to_regclass('public.permission_groups') IS NOT NULL THEN
    INSERT INTO public.group_permissions (group_id, permission)
    SELECT pg.id, perm.permission
    FROM public.permission_groups pg
    CROSS JOIN (VALUES
      ('services.source_correct'),
      ('customers.source_correct')
    ) AS perm(permission)
    WHERE pg.name IN ('Super Admin', 'Admin')
    ON CONFLICT (group_id, permission) DO NOTHING;
  END IF;

  IF to_regclass('dbo.group_permissions') IS NOT NULL
     AND to_regclass('dbo.permission_groups') IS NOT NULL THEN
    INSERT INTO dbo.group_permissions (group_id, permission)
    SELECT pg.id, perm.permission
    FROM dbo.permission_groups pg
    CROSS JOIN (VALUES
      ('services.source_correct'),
      ('customers.source_correct')
    ) AS perm(permission)
    WHERE pg.name IN ('Super Admin', 'Admin')
    ON CONFLICT (group_id, permission) DO NOTHING;
  END IF;
END $$;
