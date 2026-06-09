-- @crossref:domain[employees-hr]
-- @crossref:used-in[NK3 schema migration: api/migrations/005_employee_location_scope]
-- @crossref:uses[product-map/domains/employees-hr.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
-- Employee location scope junction table: multi-branch assignment
CREATE TABLE IF NOT EXISTS dbo.employee_location_scope (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES dbo.partners(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES dbo.companies(id) ON DELETE CASCADE,
  datecreated TIMESTAMP DEFAULT NOW(),
  lastupdated TIMESTAMP DEFAULT NOW(),
  UNIQUE (employee_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_location_scope_employee_id ON dbo.employee_location_scope(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_location_scope_company_id ON dbo.employee_location_scope(company_id);
