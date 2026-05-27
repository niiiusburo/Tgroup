-- Migration 048: Per-LOB commission tiers (L0–L4)
-- Applied to BOTH tdental_demo AND tcosmetic_demo

BEGIN;

CREATE TABLE IF NOT EXISTS dbo.commission_tiers (
  lob VARCHAR(16) NOT NULL,
  level INT NOT NULL,
  rate NUMERIC(6,4) NOT NULL,
  label VARCHAR(80) NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (lob, level),
  CONSTRAINT commission_tiers_lob_check CHECK (lob IN ('dental', 'cosmetic')),
  CONSTRAINT commission_tiers_level_check CHECK (level BETWEEN 0 AND 4),
  CONSTRAINT commission_tiers_rate_check CHECK (rate >= 0 AND rate <= 1)
);

CREATE INDEX IF NOT EXISTS idx_commission_tiers_active
  ON dbo.commission_tiers(lob, level)
  WHERE is_active = true;

-- Seed L0–L4 with CTVlegacy defaults: 25%, 5%, 2.5%, 1.25%, 0.625%
INSERT INTO dbo.commission_tiers (lob, level, rate, label, is_active, updated_at)
VALUES
  ('dental', 0, 0.2500, 'Level 0', true, now()),
  ('dental', 1, 0.0500, 'Level 1', true, now()),
  ('dental', 2, 0.0250, 'Level 2', true, now()),
  ('dental', 3, 0.0125, 'Level 3', true, now()),
  ('dental', 4, 0.00625, 'Level 4', true, now()),
  ('cosmetic', 0, 0.2500, 'Level 0', true, now()),
  ('cosmetic', 1, 0.0500, 'Level 1', true, now()),
  ('cosmetic', 2, 0.0250, 'Level 2', true, now()),
  ('cosmetic', 3, 0.0125, 'Level 3', true, now()),
  ('cosmetic', 4, 0.00625, 'Level 4', true, now())
ON CONFLICT (lob, level) DO UPDATE SET
  rate = EXCLUDED.rate,
  label = EXCLUDED.label,
  is_active = EXCLUDED.is_active,
  updated_at = now();

COMMIT;
