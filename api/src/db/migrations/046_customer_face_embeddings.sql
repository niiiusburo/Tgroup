-- Migration 046: Face ID customer face embeddings
-- Adds table for storing face embeddings and updates partner face status fields.

CREATE TABLE IF NOT EXISTS dbo.customer_face_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES dbo.partners(id),
  embedding double precision[] NOT NULL,
  detection_score double precision,
  face_box jsonb,
  image_sha256 text,
  source text NOT NULL DEFAULT 'manual_capture',
  model_name text NOT NULL,
  model_version text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NULL,
  created_at timestamp without time zone NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'),
  deleted_at timestamp without time zone NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_face_embeddings_partner
  ON dbo.customer_face_embeddings(partner_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_customer_face_embeddings_active
  ON dbo.customer_face_embeddings(partner_id, is_active);

-- Ensure partners face columns exist (they may already from earlier work)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dbo' AND table_name = 'partners' AND column_name = 'face_subject_id'
  ) THEN
    ALTER TABLE dbo.partners ADD COLUMN face_subject_id uuid NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dbo' AND table_name = 'partners' AND column_name = 'face_registered_at'
  ) THEN
    ALTER TABLE dbo.partners ADD COLUMN face_registered_at timestamp without time zone NULL;
  END IF;
END $$;
