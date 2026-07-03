-- Migration 070: Link patient media to a specific service line
-- Apply to BOTH tdental_demo and tcosmetic_demo
-- Date: 2026-07-02
--
-- Patient media was introduced in migration 066. That migration may already exist
-- in some environments, so this migration is idempotent: it creates the table only
-- if it is missing, and adds the service-line column only if it is missing.

DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS dbo.patient_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES dbo.partners(id) ON DELETE CASCADE,
    media_service_id TEXT,
    media_url TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
END $$;

ALTER TABLE dbo.patient_media
ADD COLUMN IF NOT EXISTS sale_order_line_id UUID REFERENCES dbo.saleorderlines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patient_media_partner_id ON dbo.patient_media(partner_id);
CREATE INDEX IF NOT EXISTS idx_patient_media_sale_order_line_id ON dbo.patient_media(sale_order_line_id);

-- Grant patient media permissions to the Admin group so doctors with admin rights
-- can upload and view treatment photos from NK2. Other groups can be granted these
-- permissions explicitly through the permission board.
INSERT INTO dbo.group_permissions (group_id, permission)
SELECT '11111111-0000-0000-0000-000000000001' AS group_id, perm
FROM (
  VALUES
    ('patient_media.view'),
    ('patient_media.upload')
) AS perms(perm)
ON CONFLICT (group_id, permission) DO NOTHING;

-- @crossref:domain[patient-portal]
-- @crossref:used-in[api/src/routes/patient/media.js, api/src/routes/media.js, website/src/components/customer/ServiceMediaGallery.tsx]
-- @crossref:uses[product-map/domains/patient-portal.yaml]

-- DOWN (rollback):
-- DELETE FROM dbo.group_permissions WHERE permission IN ('patient_media.view', 'patient_media.upload');
-- ALTER TABLE dbo.patient_media DROP COLUMN IF EXISTS sale_order_line_id;
-- DROP INDEX IF EXISTS idx_patient_media_sale_order_line_id;
