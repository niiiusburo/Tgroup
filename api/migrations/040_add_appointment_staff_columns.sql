-- Migration: Add assistantid and dentalaideid columns to appointments
-- These were referenced in the API route but never added to the schema.

ALTER TABLE dbo.appointments
ADD COLUMN IF NOT EXISTS assistantid uuid,
ADD COLUMN IF NOT EXISTS dentalaideid uuid;

COMMENT ON COLUMN dbo.appointments.assistantid IS 'FK to employees(id) — phụ tá';
COMMENT ON COLUMN dbo.appointments.dentalaideid IS 'FK to employees(id) — trợ lý nha khoa';
