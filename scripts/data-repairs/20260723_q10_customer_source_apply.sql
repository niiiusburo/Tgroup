\set ON_ERROR_STOP on

\if :{?Q10_SOURCE_REPAIR_CONFIRM}
  SELECT :'Q10_SOURCE_REPAIR_CONFIRM' = 'APPLY-Q10-43-ORDERS' AS q10_source_repair_confirmed \gset
  \if :q10_source_repair_confirmed
  \else
    DO $$ BEGIN RAISE EXCEPTION 'REFUSED: Q10_SOURCE_REPAIR_CONFIRM must equal APPLY-Q10-43-ORDERS'; END $$;
  \endif
\else
  DO $$ BEGIN RAISE EXCEPTION 'REFUSED: pass Q10_SOURCE_REPAIR_CONFIRM only after final approval'; END $$;
\endif

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SELECT pg_advisory_xact_lock(20260723, 43);

\ir 20260723_q10_customer_source_targets.inc.sql

DO $$
DECLARE
  target_count integer;
  resolved_count integer;
  mismatch_count integer;
  bad_lookup_count integer;
BEGIN
  SELECT count(*) INTO target_count FROM q10_source_targets;
  IF target_count <> 43 THEN
    RAISE EXCEPTION 'preflight: expected 43 manifest rows, got %', target_count;
  END IF;

  IF to_regclass('repair_20260723_q10_source.saleorder_source_audit') IS NOT NULL
     OR to_regclass('repair_20260723_q10_source.batch_metadata') IS NOT NULL THEN
    RAISE EXCEPTION 'preflight: repair audit tables already exist; refuse a second apply';
  END IF;

  SELECT count(*), count(DISTINCT so.id)
  INTO resolved_count, target_count
  FROM q10_source_targets t
  JOIN dbo.saleorders so ON so.code = t.code;
  IF resolved_count <> 43 OR target_count <> 43 THEN
    RAISE EXCEPTION 'preflight: expected 43 unique live orders, got rows=% unique=%', resolved_count, target_count;
  END IF;

  SELECT count(*) INTO mismatch_count
  FROM q10_source_targets t
  JOIN dbo.saleorders so ON so.code = t.code
  LEFT JOIN dbo.partners p ON p.id = so.partnerid
  LEFT JOIN dbo.customersources current_source ON current_source.id = so.sourceid
  LEFT JOIN repair_20260707.merge_so_audit july7_audit ON july7_audit.id = so.id
  LEFT JOIN repair_20260707.so_plan july7_plan ON july7_plan.id = so.id
  WHERE p.ref IS DISTINCT FROM t.customer_ref
     OR so.companyid IS DISTINCT FROM 'f0f6361e-b99d-4ac7-4108-08dd8159c64a'::uuid
     OR COALESCE(so.isdeleted, false)
     OR current_source.name IS DISTINCT FROM t.reviewed_current_source
     OR july7_audit.id IS NULL
     OR july7_plan.id IS NOT NULL;
  IF mismatch_count <> 0 THEN
    RAISE EXCEPTION 'preflight: % target orders no longer match the reviewed live state', mismatch_count;
  END IF;

  SELECT count(*) INTO bad_lookup_count
  FROM (VALUES ('Khách cũ'), ('Khách hàng giới thiệu'), ('Hotline')) AS wanted(name)
  WHERE (SELECT count(*) FROM dbo.customersources cs
         WHERE lower(trim(cs.name)) = lower(trim(wanted.name))) <> 1;
  IF bad_lookup_count <> 0 THEN
    RAISE EXCEPTION 'preflight: one or more existing target source lookups are missing or duplicated';
  END IF;

  IF (SELECT count(*) FROM dbo.customersources cs
      WHERE lower(trim(cs.name)) = lower(trim('Giới thiệu'))) <> 0 THEN
    RAISE EXCEPTION 'preflight: Giới thiệu lookup state changed after review';
  END IF;
END $$;

CREATE SCHEMA repair_20260723_q10_source;

CREATE TABLE repair_20260723_q10_source.batch_metadata (
  batch_id text PRIMARY KEY,
  target_count integer NOT NULL,
  created_legacy_sourceid uuid NOT NULL,
  production_backup_sha256 text NOT NULL,
  earlier_workbook_sha256 text NOT NULL,
  current_workbook_sha256 text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by text NOT NULL DEFAULT current_user,
  rolled_back_at timestamptz,
  rolled_back_by text
);

CREATE TABLE repair_20260723_q10_source.saleorder_source_audit (
  saleorder_id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  customer_ref text NOT NULL,
  prior_sourceid uuid,
  prior_source_name text,
  target_sourceid uuid NOT NULL,
  target_source_name text NOT NULL,
  july7_audit_sourceid uuid,
  captured_at timestamptz NOT NULL DEFAULT now(),
  captured_by text NOT NULL DEFAULT current_user
);

CREATE TEMP TABLE q10_created_legacy_source (id uuid PRIMARY KEY) ON COMMIT DROP;

WITH created AS (
  INSERT INTO dbo.customersources (name, type, description, is_active)
  VALUES (
    'Giới thiệu',
    'referral',
    'Nguồn lịch sử chỉ dùng khôi phục báo cáo Q10 tháng 6/2026; không dùng nhập liệu mới',
    false
  )
  RETURNING id
)
INSERT INTO q10_created_legacy_source (id)
SELECT id FROM created;

DO $$
DECLARE
  created_count integer;
  bad_lookup_count integer;
BEGIN
  SELECT count(*) INTO created_count FROM q10_created_legacy_source;
  IF created_count <> 1 THEN
    RAISE EXCEPTION 'apply: expected one inactive Giới thiệu lookup, got %', created_count;
  END IF;

  SELECT count(*) INTO bad_lookup_count
  FROM (SELECT DISTINCT expected_source FROM q10_source_targets) wanted
  WHERE (SELECT count(*) FROM dbo.customersources cs
         WHERE lower(trim(cs.name)) = lower(trim(wanted.expected_source))) <> 1;
  IF bad_lookup_count <> 0 THEN
    RAISE EXCEPTION 'apply: one or more target source lookups do not resolve uniquely';
  END IF;
END $$;

INSERT INTO repair_20260723_q10_source.batch_metadata (
  batch_id,
  target_count,
  created_legacy_sourceid,
  production_backup_sha256,
  earlier_workbook_sha256,
  current_workbook_sha256
)
SELECT
  'q10-customer-source-20260723',
  43,
  id,
  'f6f41c10f7c033c07e4c70331a158b7844d80258ac58c8639039fbf0258e8dcb',
  'c83674e027d54de4d5854ff7b47b35060551ee689c5a9a7f9c39b4ba292c1e1f',
  '373e591754621a204c242fe9eb6d9602fdfe0c57bbd8c1c72dd9352afb2844a0'
FROM q10_created_legacy_source;

INSERT INTO repair_20260723_q10_source.saleorder_source_audit (
  saleorder_id,
  code,
  customer_ref,
  prior_sourceid,
  prior_source_name,
  target_sourceid,
  target_source_name,
  july7_audit_sourceid
)
SELECT
  so.id,
  so.code,
  t.customer_ref,
  so.sourceid,
  current_source.name,
  target_source.id,
  target_source.name,
  july7_audit.old_sourceid
FROM q10_source_targets t
JOIN dbo.saleorders so ON so.code = t.code
LEFT JOIN dbo.customersources current_source ON current_source.id = so.sourceid
JOIN dbo.customersources target_source
  ON lower(trim(target_source.name)) = lower(trim(t.expected_source))
JOIN repair_20260707.merge_so_audit july7_audit ON july7_audit.id = so.id;

DO $$
DECLARE
  audit_count integer;
  changed_count integer;
BEGIN
  SELECT count(*) INTO audit_count
  FROM repair_20260723_q10_source.saleorder_source_audit;
  IF audit_count <> 43 THEN
    RAISE EXCEPTION 'apply: expected 43 audit rows, got %', audit_count;
  END IF;

  UPDATE dbo.saleorders so
  SET sourceid = audit.target_sourceid
  FROM repair_20260723_q10_source.saleorder_source_audit audit
  WHERE so.id = audit.saleorder_id
    AND so.sourceid IS NOT DISTINCT FROM audit.prior_sourceid;
  GET DIAGNOSTICS changed_count = ROW_COUNT;
  IF changed_count <> 43 THEN
    RAISE EXCEPTION 'apply: expected exactly 43 updates, got %', changed_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM repair_20260723_q10_source.saleorder_source_audit audit
    JOIN dbo.saleorders so ON so.id = audit.saleorder_id
    WHERE so.sourceid IS DISTINCT FROM audit.target_sourceid
  ) THEN
    RAISE EXCEPTION 'apply: post-check found a target order with the wrong sourceid';
  END IF;
END $$;

COMMIT;

SELECT target_source_name, count(*) AS repaired_orders
FROM repair_20260723_q10_source.saleorder_source_audit
GROUP BY target_source_name
ORDER BY target_source_name;
