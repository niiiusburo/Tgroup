-- INV-027 one-time repair: make saleorders.totalpaid agree with residual
-- (totalpaid = amounttotal - residual, never below 0), then copy order paid/owed onto the
-- line of single-line orders. residual and all payment rows are NOT changed.
-- residual is the trusted value: payments have always kept it in step, while totalpaid was
-- never moved by payment create/void/delete before 0.32.61.
-- Run order: 1) backup (pg_dump -t dbo.saleorders -t dbo.saleorderlines), 2) this file as-is
-- (dry run, rolls back), 3) again with `-v apply=1`. Everything runs in one transaction.
\if :{?apply}
\else
  \set apply 0
\endif
SET search_path = dbo;
BEGIN;

CREATE TEMP TABLE totalpaid_fix ON COMMIT DROP AS
SELECT so.id, so.totalpaid AS old_totalpaid,
       GREATEST(0, COALESCE(so.amounttotal, 0) - COALESCE(so.residual, 0)) AS new_totalpaid
FROM saleorders so
WHERE so.isdeleted = false
  AND so.totalpaid IS DISTINCT FROM GREATEST(0, COALESCE(so.amounttotal, 0) - COALESCE(so.residual, 0));

CREATE TEMP TABLE line_fix ON COMMIT DROP AS
SELECT sol.id AS line_id, so.id AS order_id
FROM saleorderlines sol
JOIN saleorders so ON so.id = sol.orderid
WHERE so.isdeleted = false
  AND sol.isdeleted = false
  AND (SELECT COUNT(*) FROM saleorderlines x WHERE x.orderid = so.id AND x.isdeleted = false) = 1
  AND (sol.amountpaid IS DISTINCT FROM GREATEST(0, COALESCE(so.amounttotal, 0) - COALESCE(so.residual, 0))
       OR sol.amountresidual IS DISTINCT FROM so.residual);

SELECT (SELECT COUNT(*) FROM totalpaid_fix) AS orders_to_fix,
       (SELECT COALESCE(SUM(new_totalpaid - COALESCE(old_totalpaid, 0)), 0) FROM totalpaid_fix) AS order_paid_net_change,
       (SELECT COUNT(*) FROM line_fix) AS single_lines_to_fix;

\if :apply
  UPDATE saleorders so SET totalpaid = f.new_totalpaid
  FROM totalpaid_fix f WHERE f.id = so.id;

  UPDATE saleorderlines sol SET amountpaid = so.totalpaid, amountresidual = so.residual
  FROM line_fix f JOIN saleorders so ON so.id = f.order_id
  WHERE sol.id = f.line_id;

  SELECT COUNT(*) AS orders_still_off
  FROM saleorders so
  WHERE so.isdeleted = false
    AND so.totalpaid IS DISTINCT FROM GREATEST(0, COALESCE(so.amounttotal, 0) - COALESCE(so.residual, 0));
  COMMIT;
\else
  ROLLBACK;
\endif
