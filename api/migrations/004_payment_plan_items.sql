-- Link monthly plans to specific invoices (scope)
CREATE TABLE IF NOT EXISTS monthlyplan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES monthlyplans(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES saleorders(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(plan_id, invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_monthlyplan_items_plan_id ON monthlyplan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_monthlyplan_items_invoice_id ON monthlyplan_items(invoice_id);
