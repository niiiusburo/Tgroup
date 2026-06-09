-- @crossref:domain[appointments-calendar]
-- @crossref:used-in[NK3 schema migration: api/migrations/022_add_appointment_productid]
-- @crossref:uses[product-map/domains/appointments-calendar.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- Migration: Add productid column to appointments table
-- This column links appointments to the products (services) catalog.
-- References: dbo.products(id) — the service/product that was booked.
ALTER TABLE dbo.appointments ADD COLUMN IF NOT EXISTS productid uuid;

COMMENT ON COLUMN dbo.appointments.productid IS 'FK to dbo.products(id) — the service/product booked for this appointment';
