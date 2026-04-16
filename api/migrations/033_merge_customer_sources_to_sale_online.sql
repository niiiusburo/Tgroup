-- Migration: Merge all listed customer sources into "Sale Online"
-- Replaces: Khách vãng lai, Hotline, Khách cũ, Khách hàng giới thiệu,
--           Nội bộ giới thiệu, MKT1, ĐNCB

BEGIN;

-- 1. Ensure a canonical "Sale Online" source exists
INSERT INTO dbo.customersources (name, type, description, is_active)
SELECT 'Sale Online', 'online', 'Kênh bán hàng trực tuyến', true
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.customersources WHERE name = 'Sale Online'
);

-- 2. Merge references and remove old sources
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
        WHERE name IN (
            'Khách vãng lai',
            'Hotline',
            'Khách cũ',
            'Khách hàng giới thiệu',
            'Nội bộ giới thiệu',
            'MKT1',
            'ĐNCB'
        )
    );

    -- Re-point sale orders
    UPDATE dbo.saleorders
    SET sourceid = sale_online_id
    WHERE sourceid IN (
        SELECT id FROM dbo.customersources
        WHERE name IN (
            'Khách vãng lai',
            'Hotline',
            'Khách cũ',
            'Khách hàng giới thiệu',
            'Nội bộ giới thiệu',
            'MKT1',
            'ĐNCB'
        )
    );

    -- Remove the old source rows
    DELETE FROM dbo.customersources
    WHERE name IN (
        'Khách vãng lai',
        'Hotline',
        'Khách cũ',
        'Khách hàng giới thiệu',
        'Nội bộ giới thiệu',
        'MKT1',
        'ĐNCB'
    );
END $$;

COMMIT;
