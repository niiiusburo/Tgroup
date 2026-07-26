-- Two things nk has been missing.
--
-- 1. dbo.saleorder_state_logs
--    updateSaleOrderState.js writes a row here on every sale-order state change, inside a
--    try/catch. The table was never created on nk (verified absent 2026-07-26), so every
--    one of those audit writes has been silently swallowed since the feature shipped —
--    there is no history of who changed an order's state.
--
--    Migration 016_saleorder_status_audit.sql defines this table already, but it CANNOT be
--    run on nk: it also adds CHECK (state IN ('sale','done','cancel','draft')), and live
--    data holds 61,242 rows outside that set (pending 60,382 and completed 860). Applying
--    016 would abort. This migration therefore creates only the table and its indexes, and
--    deliberately omits the CHECK constraint. Do not "fix" this by re-adding it without
--    first reconciling the state vocabulary with the data.
--
-- 2. Composite index on saleorders (companyid, datecreated)
--    The revenue reports filter by branch and date together. With only the two separate
--    single-column indexes, the plan on nk bitmap-scans 24,423 rows by companyid and then
--    discards 17,997 of them by date filter, touching ~1,920 heap buffers for a result of
--    6,286 rows (24ms measured). The composite lets it read close to just the rows it
--    returns, which mostly buys back shared-buffer churn under concurrent report loads.

BEGIN;

CREATE TABLE IF NOT EXISTS dbo.saleorder_state_logs (
  id UUID PRIMARY KEY,
  saleorder_id UUID NOT NULL REFERENCES dbo.saleorders(id) ON DELETE CASCADE,
  old_state TEXT,
  new_state TEXT NOT NULL,
  changed_by TEXT,
  changed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saleorder_state_logs_saleorder_id
  ON dbo.saleorder_state_logs(saleorder_id);
CREATE INDEX IF NOT EXISTS idx_saleorder_state_logs_changed_at
  ON dbo.saleorder_state_logs(changed_at);

COMMIT;

-- Outside the transaction: CREATE INDEX CONCURRENTLY cannot run inside one. It takes no
-- write lock, so revenue reporting and order creation keep working while it builds.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_saleorders_companyid_datecreated
  ON dbo.saleorders (companyid, datecreated DESC)
  WHERE isdeleted = false;
