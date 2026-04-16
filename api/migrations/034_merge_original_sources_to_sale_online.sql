-- Migration: Merge original pre-031 customer source names into Sale Online
-- For databases where 031_update_customer_sources.sql was never applied.
-- Replaces: Google, Khác, Bảo hiểm, Facebook, Giới thiệu, Đi ngang qua, Website

BEGIN;

DO $$
DECLARE
    sale_online_id uuid;
BEGIN
    -- Pick the canonical Sale Online row
    SELECT id INTO sale_online_id
    FROM dbo.customersources
    WHERE name = 'Sale Online'
    ORDER BY updated_at DESC, created_at DESC, id
    LIMIT 1;

    -- Re-point customers (partners)
    UPDATE dbo.partners
    SET sourceid = sale_online_id
    WHERE sourceid IN (
        SELECT id FROM dbo.customersources
        WHERE name IN ('Google', 'Khác', 'Bảo hiểm', 'Facebook', 'Giới thiệu', 'Đi ngang qua', 'Website')
    );

    -- Re-point sale orders
    UPDATE dbo.saleorders
    SET sourceid = sale_online_id
    WHERE sourceid IN (
        SELECT id FROM dbo.customersources
        WHERE name IN ('Google', 'Khác', 'Bảo hiểm', 'Facebook', 'Giới thiệu', 'Đi ngang qua', 'Website')
    );

    -- Remove the old source rows
    DELETE FROM dbo.customersources
    WHERE name IN ('Google', 'Khác', 'Bảo hiểm', 'Facebook', 'Giới thiệu', 'Đi ngang qua', 'Website');
END $$;

COMMIT;
