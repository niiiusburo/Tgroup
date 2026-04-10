CREATE TABLE IF NOT EXISTS payment_proofs (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER,
  proof_image TEXT NOT NULL,
  qr_description TEXT,
  qr_generated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
