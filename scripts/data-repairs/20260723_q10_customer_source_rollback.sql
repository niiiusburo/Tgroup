\set ON_ERROR_STOP on

\if :{?Q10_SOURCE_REPAIR_ROLLBACK_CONFIRM}
  SELECT :'Q10_SOURCE_REPAIR_ROLLBACK_CONFIRM' = 'ROLLBACK-Q10-43-ORDERS' AS q10_source_rollback_confirmed \gset
  \if :q10_source_rollback_confirmed
  \else
    DO $$ BEGIN RAISE EXCEPTION 'REFUSED: Q10_SOURCE_REPAIR_ROLLBACK_CONFIRM must equal ROLLBACK-Q10-43-ORDERS'; END $$;
  \endif
\else
  DO $$ BEGIN RAISE EXCEPTION 'REFUSED: pass Q10_SOURCE_REPAIR_ROLLBACK_CONFIRM only after rollback approval'; END $$;
\endif

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SELECT pg_advisory_xact_lock(20260723, 43);

DO $$
DECLARE
  audit_count integer;
  drift_count integer;
  external_reference_count integer;
BEGIN
  IF to_regclass('repair_20260723_q10_source.saleorder_source_audit') IS NULL
     OR to_regclass('repair_20260723_q10_source.batch_metadata') IS NULL THEN
    RAISE EXCEPTION 'rollback: required repair audit tables do not exist';
  END IF;

  SELECT count(*) INTO audit_count
  FROM repair_20260723_q10_source.saleorder_source_audit;
  IF audit_count <> 43 THEN
    RAISE EXCEPTION 'rollback: expected 43 audit rows, got %', audit_count;
  END IF;

  SELECT count(*) INTO drift_count
  FROM repair_20260723_q10_source.saleorder_source_audit audit
  JOIN dbo.saleorders so ON so.id = audit.saleorder_id
  WHERE so.sourceid IS DISTINCT FROM audit.target_sourceid;
  IF drift_count <> 0 THEN
    RAISE EXCEPTION 'rollback: % repaired orders changed after apply; manual review required', drift_count;
  END IF;

  SELECT
    (SELECT count(*) FROM dbo.partners p
     JOIN repair_20260723_q10_source.batch_metadata metadata
       ON p.sourceid = metadata.created_legacy_sourceid)
    +
    (SELECT count(*) FROM dbo.saleorders so
     JOIN repair_20260723_q10_source.batch_metadata metadata
       ON so.sourceid = metadata.created_legacy_sourceid
     LEFT JOIN repair_20260723_q10_source.saleorder_source_audit audit
       ON audit.saleorder_id = so.id
     WHERE audit.saleorder_id IS NULL)
  INTO external_reference_count;
  IF external_reference_count <> 0 THEN
    RAISE EXCEPTION 'rollback: inactive Giới thiệu source has % external references', external_reference_count;
  END IF;
END $$;

DO $$
DECLARE
  changed_count integer;
  deleted_count integer;
BEGIN
  UPDATE dbo.saleorders so
  SET sourceid = audit.prior_sourceid
  FROM repair_20260723_q10_source.saleorder_source_audit audit
  WHERE so.id = audit.saleorder_id
    AND so.sourceid IS NOT DISTINCT FROM audit.target_sourceid;
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> 43 THEN
    RAISE EXCEPTION 'rollback: expected exactly 43 restores, got %', changed_count;
  END IF;

  DELETE FROM dbo.customersources cs
  USING repair_20260723_q10_source.batch_metadata metadata
  WHERE cs.id = metadata.created_legacy_sourceid
    AND NOT EXISTS (SELECT 1 FROM dbo.partners p WHERE p.sourceid = cs.id)
    AND NOT EXISTS (SELECT 1 FROM dbo.saleorders so WHERE so.sourceid = cs.id);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count <> 1 THEN
    RAISE EXCEPTION 'rollback: expected to delete one inactive Giới thiệu lookup, got %', deleted_count;
  END IF;

  UPDATE repair_20260723_q10_source.batch_metadata
  SET rolled_back_at = now(), rolled_back_by = current_user
  WHERE batch_id = 'q10-customer-source-20260723'
    AND rolled_back_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'rollback: metadata row missing or already rolled back';
  END IF;
END $$;

COMMIT;

SELECT prior_source_name, count(*) AS restored_orders
FROM repair_20260723_q10_source.saleorder_source_audit
GROUP BY prior_source_name
ORDER BY prior_source_name;
