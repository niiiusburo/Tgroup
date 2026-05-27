-- Migration 049: Versioned CTV signup terms (vi/en)
-- Applied to BOTH tdental_demo AND tcosmetic_demo

BEGIN;

CREATE TABLE IF NOT EXISTS dbo.signup_terms (
  id SERIAL PRIMARY KEY,
  language VARCHAR(2) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  title VARCHAR(200) NOT NULL DEFAULT '',
  content_html TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT signup_terms_language_check CHECK (language IN ('vi', 'en'))
);

-- Partial unique index: exactly one active row per language
CREATE UNIQUE INDEX IF NOT EXISTS idx_signup_terms_active_language
  ON dbo.signup_terms(language)
  WHERE is_active = true;

-- Seed initial v1 terms for vi and en
INSERT INTO dbo.signup_terms (language, version, title, content_html, is_active, updated_at)
VALUES
  ('vi', 1, 'Điều khoản đăng ký CTV', '<p>Bạn đồng ý với các điều khoản và điều kiện của chương trình Cộng tác viên TG Clinic.</p>', true, now()),
  ('en', 1, 'CTV Signup Terms', '<p>You agree to the terms and conditions of the TG Clinic Collaborator program.</p>', true, now())
ON CONFLICT DO NOTHING;

COMMIT;
