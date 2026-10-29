-- INV-027 one-time repair: recompute stale saleorders.totalpaid from non-voided allocations.
-- Only slips that have at least one non-voided allocation are touched; legacy slips with
-- no allocations keep their imported value. residual is NOT changed.
-- Run order: 1) backup (pg_dump -t dbo.saleorders), 2) this file as-is (dry run, rolls back),
-- 3) again with `-v apply=1`. The whole repair runs in one transaction.
\if :{?apply}
\else
  \set apply 0
\endif
SET search_path = dbo;
BEGIN;

CREATE TEMP TABLE totalpaid_fix ON COMMIT DROP AS
SELECT so.id, so.name, so.totalpaid AS old_totalpaid, a.paid AS new_totalpaid
FROM saleorders so
JOIN (
  SELECT pa.invoice_id, SUM(pa.allocated_amount) AS paid
  FROM payment_allocations pa
  JOIN payments p ON p.id = pa.payment_id
  WHERE pa.invoice_id IS NOT NULL
    AND COALESCE(p.status, 'posted') <> 'voided'
  GROUP BY pa.invoice_id
) a ON a.invoice_id = so.id
WHERE so.totalpaid IS DISTINCT FROM a.paid;

SELECT COUNT(*) AS slips_to_fix,
       COALESCE(SUM(new_totalpaid - COALESCE(old_totalpaid, 0)), 0) AS net_change
FROM totalpaid_fix;

\if :apply
  UPDATE saleorders so SET totalpaid = f.new_totalpaid
  FROM totalpaid_fix f WHERE f.id = so.id;
  COMMIT;
\else
  ROLLBACK;
\endif
