-- Migration: Add tooth selection fields to sale order lines
ALTER TABLE dbo.saleorderlines
ADD COLUMN IF NOT EXISTS tooth_numbers TEXT,
ADD COLUMN IF NOT EXISTS tooth_comment TEXT;
