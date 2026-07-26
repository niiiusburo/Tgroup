-- Audited sale-order source corrections (INV-026).
-- Normal PATCH cannot change source after payment or closed-period lock;
-- only POST /api/SaleOrders/:id/source-correction with services.source_correct.

CREATE TABLE IF NOT EXISTS dbo.saleorder_source_corrections (
  id                 UUID PRIMARY KEY,
  saleorder_id       UUID NOT NULL,
  old_sourceid       UUID NULL,
  new_sourceid       UUID NULL,
  reason             TEXT NOT NULL,
  evidence           TEXT NOT NULL,
  rollback_reference TEXT NOT NULL,
  actor_employee_id  UUID NOT NULL,
  request_id         VARCHAR(128) NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saleorder_source_corrections_order
  ON dbo.saleorder_source_corrections(saleorder_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saleorder_source_corrections_actor
  ON dbo.saleorder_source_corrections(actor_employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saleorder_source_corrections_request
  ON dbo.saleorder_source_corrections(request_id);

-- Grant correction permission to Super Admin and Admin only.
DO $$
BEGIN
  IF to_regclass('public.group_permissions') IS NOT NULL
     AND to_regclass('public.permission_groups') IS NOT NULL THEN
    INSERT INTO public.group_permissions (group_id, permission)
    SELECT pg.id, 'services.source_correct'
    FROM public.permission_groups pg
    WHERE pg.name IN ('Super Admin', 'Admin')
    ON CONFLICT (group_id, permission) DO NOTHING;
  END IF;

  IF to_regclass('dbo.group_permissions') IS NOT NULL
     AND to_regclass('dbo.permission_groups') IS NOT NULL THEN
    INSERT INTO dbo.group_permissions (group_id, permission)
    SELECT pg.id, 'services.source_correct'
    FROM dbo.permission_groups pg
    WHERE pg.name IN ('Super Admin', 'Admin')
    ON CONFLICT (group_id, permission) DO NOTHING;
  END IF;
END $$;
