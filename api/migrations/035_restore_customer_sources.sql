-- Migration: Restore full list of customer sources
-- Ensures all 8 business-defined sources exist

BEGIN;

INSERT INTO dbo.customersources (name, type, description, is_active)
SELECT * FROM (VALUES
  ('Sale Online', 'online', 'Kênh bán hàng trực tuyến', true),
  ('Khách vãng lai', 'offline', 'Khách vãng lai', true),
  ('Hotline', 'online', 'Khách từ hotline', true),
  ('Khách cũ', 'referral', 'Khách cũ quay lại', true),
  ('Khách hàng giới thiệu', 'referral', 'Khách do khách hàng giới thiệu', true),
  ('Nội bộ giới thiệu', 'referral', 'Khách do nội bộ giới thiệu', true),
  ('MKT1', 'online', 'Kênh marketing 1', true),
  ('ĐNCB', 'offline', 'Đối tượng ngoài cơ sở bệnh', true)
) AS v(name, type, description, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.customersources cs WHERE cs.name = v.name
);

COMMIT;
