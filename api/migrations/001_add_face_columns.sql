ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS face_subject_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS face_registered_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_partners_face_subject_id ON partners(face_subject_id);
