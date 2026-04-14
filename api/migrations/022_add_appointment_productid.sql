-- Migration: Add productid column to appointments table
-- This column links appointments to the products (services) catalog.
-- References: dbo.products(id) — the service/product that was booked.
ALTER TABLE dbo.appointments ADD COLUMN IF NOT EXISTS productid uuid;

COMMENT ON COLUMN dbo.appointments.productid IS 'FK to dbo.products(id) — the service/product booked for this appointment';
