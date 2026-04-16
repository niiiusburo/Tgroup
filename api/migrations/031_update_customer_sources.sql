-- Migration: Update customer sources to new business-defined list
-- Replaces old source names with the new dropdown options

BEGIN;

-- 1. Keep Sale Online as-is

-- 2. Facebook -> Khách vãng lai
UPDATE dbo.customersources
SET name = 'Khách vãng lai',
    type = 'offline',
    description = 'Khách vãng lai',
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Facebook';

-- 3. Google -> Hotline
UPDATE dbo.customersources
SET name = 'Hotline',
    type = 'online',
    description = 'Khách từ hotline',
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Google';

-- 4. Website -> Khách cũ
UPDATE dbo.customersources
SET name = 'Khách cũ',
    type = 'referral',
    description = 'Khách cũ quay lại',
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Website';

-- 5. Giới thiệu -> Khách hàng giới thiệu
UPDATE dbo.customersources
SET name = 'Khách hàng giới thiệu',
    type = 'referral',
    description = 'Khách do khách hàng giới thiệu',
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Giới thiệu';

-- 6. Đi ngang qua -> Nội bộ giới thiệu
UPDATE dbo.customersources
SET name = 'Nội bộ giới thiệu',
    type = 'referral',
    description = 'Khách do nội bộ giới thiệu',
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Đi ngang qua';

-- 7. Bảo hiểm -> MKT1
UPDATE dbo.customersources
SET name = 'MKT1',
    type = 'online',
    description = 'Kênh marketing 1',
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Bảo hiểm';

-- 8. Khác -> ĐNCB
UPDATE dbo.customersources
SET name = 'ĐNCB',
    type = 'offline',
    description = 'Đối tượng ngoài cơ sở bệnh',
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Khác';

COMMIT;
