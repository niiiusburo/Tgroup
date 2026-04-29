-- Migration 018: Error Events table for AutoDebugger
-- Stores production errors for automated analysis and auto-fixing

CREATE TABLE IF NOT EXISTS dbo.error_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint     VARCHAR(64) NOT NULL,      -- SHA-256 hash of (error_type + normalized_message + top_stack_frame)
  error_type      VARCHAR(100) NOT NULL,      -- 'React', 'API', 'Network', 'Global', 'UnhandledRejection'
  message         TEXT NOT NULL,
  stack           TEXT,                       -- Full stack trace
  component_stack TEXT,                       -- React component stack (if applicable)
  route           VARCHAR(500),               -- Frontend route where error occurred
  source_file     VARCHAR(500),              -- Top file from stack trace (for auto-fixer)
  source_line     INTEGER,                   -- Line number from stack trace
  api_endpoint    VARCHAR(500),              -- API endpoint if API error
  api_method      VARCHAR(10),               -- HTTP method if API error
  api_status      INTEGER,                   -- HTTP status code if API error
  api_body        JSONB,                     -- API response body if available
  user_agent      TEXT,
  ip_address      VARCHAR(45),
  user_id         UUID,                      -- Partner ID if authenticated
  location_id     UUID,                      -- Company ID if known
  metadata        JSONB DEFAULT '{}'::jsonb, -- Extra context (browser, viewport, etc.)
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  status          VARCHAR(20) NOT NULL DEFAULT 'new', -- new, investigating, fix_in_progress, fix_verified, deployed, duplicate, won't_fix, manual_review
  fix_summary     TEXT,                       -- What the auto-fixer did
  fix_commit      VARCHAR(40),               -- Git commit hash of the fix
  fixed_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for deduplication (upsert by fingerprint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_error_events_fingerprint ON dbo.error_events(fingerprint);

-- Index for auto-fixer query (unresolved errors, newest first)
CREATE INDEX IF NOT EXISTS idx_error_events_status_last_seen ON dbo.error_events(status, last_seen_at DESC);

-- Index for dashboard/reporting
CREATE INDEX IF NOT EXISTS idx_error_events_type_first_seen ON dbo.error_events(error_type, first_seen_at DESC);

-- Auto-fix attempt log (separate table to track each repair attempt)
CREATE TABLE IF NOT EXISTS dbo.error_fix_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id        UUID NOT NULL REFERENCES dbo.error_events(id) ON DELETE CASCADE,
  attempt_number  INTEGER NOT NULL DEFAULT 1,
  action          VARCHAR(50) NOT NULL,       -- 'analyze', 'generate_fix', 'run_tests', 'build', 'deploy', 'verify'
  status          VARCHAR(20) NOT NULL,       -- 'started', 'success', 'failed', 'skipped'
  details         TEXT,                       -- What happened
  files_changed   TEXT[],                     -- Array of file paths modified
  test_output     TEXT,                       -- Test run output
  agent_session   VARCHAR(100),              -- Ralph/agent session ID
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_error_fix_attempts_error ON dbo.error_fix_attempts(error_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_error_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_error_events_updated_at ON dbo.error_events;
CREATE TRIGGER trg_error_events_updated_at
  BEFORE UPDATE ON dbo.error_events
  FOR EACH ROW EXECUTE FUNCTION update_error_events_updated_at();
