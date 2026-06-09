-- @crossref:domain[appointments-calendar]
-- @crossref:used-in[NK3 schema migration: api/migrations/040_add_appointment_staff_columns]
-- @crossref:uses[product-map/domains/appointments-calendar.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- Migration: Add assistantid and dentalaideid columns to appointments
-- These were referenced in the API route but never added to the schema.

ALTER TABLE dbo.appointments
ADD COLUMN IF NOT EXISTS assistantid uuid,
ADD COLUMN IF NOT EXISTS dentalaideid uuid;

COMMENT ON COLUMN dbo.appointments.assistantid IS 'FK to employees(id) — phụ tá';
COMMENT ON COLUMN dbo.appointments.dentalaideid IS 'FK to employees(id) — trợ lý nha khoa';
