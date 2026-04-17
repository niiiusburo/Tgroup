CREATE TABLE IF NOT EXISTS version_events (
  id SERIAL PRIMARY KEY,
  event VARCHAR(64) NOT NULL,
  from_version VARCHAR(32) NOT NULL,
  to_version VARCHAR(32) NOT NULL,
  trigger VARCHAR(32) NOT NULL,
  timestamp BIGINT NOT NULL,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_version_events_event ON version_events(event);
CREATE INDEX idx_version_events_timestamp ON version_events(timestamp);
CREATE INDEX idx_version_events_from_version ON version_events(from_version);
