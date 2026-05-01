-- Audit log for export operations (PRD Section 11)
CREATE TABLE IF NOT EXISTS dbo.exports_audit (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL,
  export_type   VARCHAR(50) NOT NULL,
  action        VARCHAR(20) NOT NULL CHECK (action IN ('preview', 'download')),
  filters       JSONB,
  row_count     INTEGER,
  filename      VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exports_audit_employee ON dbo.exports_audit(employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exports_audit_type ON dbo.exports_audit(export_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exports_audit_created ON dbo.exports_audit(created_at DESC);
