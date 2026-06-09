-- @crossref:domain[feedback-cms]
-- @crossref:used-in[NK3 schema migration: api/migrations/019_feedback_auto_errors]
-- @crossref:uses[product-map/domains/feedback-cms.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- Migration 019: Link AutoDebugger errors to Feedback system
-- Add source column + error_event_id FK to feedback_threads

ALTER TABLE dbo.feedback_threads
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS error_event_id UUID REFERENCES dbo.error_events(id) ON DELETE SET NULL;

-- Index for filtering by source
CREATE INDEX IF NOT EXISTS idx_feedback_threads_source ON dbo.feedback_threads(source);
CREATE INDEX IF NOT EXISTS idx_feedback_threads_error_event ON dbo.feedback_threads(error_event_id);

-- Make employee_id nullable (auto-detected errors have no employee)
ALTER TABLE dbo.feedback_threads
  ALTER COLUMN employee_id DROP NOT NULL;
