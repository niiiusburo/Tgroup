-- @crossref:domain[payments-deposits]
-- @crossref:used-in[NK3 schema migration: api/migrations/002_payment_proofs]
-- @crossref:uses[product-map/domains/payments-deposits.yaml, docs/MIGRATIONS.md, docs/TEST-MATRIX.md, testbright.md]
CREATE TABLE IF NOT EXISTS payment_proofs (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER,
  proof_image TEXT NOT NULL,
  qr_description TEXT,
  qr_generated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
