-- Migration 052: Order source backfill MANIFEST (reviewed only — do not auto-apply)
-- INV-023 / Task 11
--
-- Purpose:
--   Historical saleorders may have sourceid NULL while partners.sourceid is set.
--   Default runtime behavior leaves those nulls as null for closed-period honesty.
--   Filling them is a deliberate data decision and must use a reviewed row list.
--
-- DO NOT run the UPDATE block blindly in production.
-- Steps:
--   1. Export candidates (dry-run SELECT below) and review with product/ops.
--   2. Store the approved id list as a reviewed manifest (CSV or temp table).
--   3. Run UPDATE only for approved ids inside a transaction with rowcount checks.
--   4. Record the manifest path + approver + date in the deploy notes.
--
-- Legacy COALESCE version label (code only, not a SQL default path):
--   legacy_coalesce_v1 = COALESCE(so.sourceid, p.sourceid)
--   Closed-period reports/exports must NOT use that expression.

BEGIN;

-- Dry-run candidates: orders with null order source but non-null customer source
-- SELECT so.id, so.code, so.partnerid, p.sourceid AS customer_sourceid, cs.name AS customer_source_name, so.datecreated
-- FROM dbo.saleorders so
-- JOIN dbo.partners p ON p.id = so.partnerid
-- LEFT JOIN dbo.customersources cs ON cs.id = p.sourceid
-- WHERE COALESCE(so.isdeleted, false) = false
--   AND so.sourceid IS NULL
--   AND p.sourceid IS NOT NULL
-- ORDER BY so.datecreated NULLS LAST;

-- Reviewed backfill template (replace the temp table load with the approved manifest):
-- CREATE TEMP TABLE order_source_backfill_manifest (
--   saleorder_id uuid PRIMARY KEY,
--   sourceid uuid NOT NULL,
--   reviewed_by text NOT NULL,
--   reviewed_at timestamptz NOT NULL DEFAULT now()
-- );
-- -- COPY / INSERT approved rows into order_source_backfill_manifest here.
--
-- UPDATE dbo.saleorders so
-- SET sourceid = m.sourceid
-- FROM order_source_backfill_manifest m
-- WHERE so.id = m.saleorder_id
--   AND so.sourceid IS NULL
--   AND COALESCE(so.isdeleted, false) = false;
--
-- -- Expect: UPDATE rowcount == manifest rowcount; abort if not.

-- This file intentionally commits no data changes.
COMMIT;
