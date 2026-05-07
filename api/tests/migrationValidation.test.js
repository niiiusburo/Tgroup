const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const migrationPath = path.join(repoRoot, 'api/src/db/migrations/046_customer_face_embeddings.sql');

describe('Migration 046: customer_face_embeddings', () => {
  let content;

  beforeAll(() => {
    content = fs.readFileSync(migrationPath, 'utf8');
  });

  it('creates customer_face_embeddings table', () => {
    expect(content).toMatch(/CREATE TABLE IF NOT EXISTS\s+dbo\.customer_face_embeddings/i);
  });

  it('has required columns', () => {
    const requiredColumns = [
      'id', 'partner_id', 'embedding', 'detection_score',
      'face_box', 'image_sha256', 'source', 'model_name',
      'model_version', 'is_active', 'created_by', 'created_at', 'deleted_at',
    ];
    for (const col of requiredColumns) {
      expect(content).toContain(col);
    }
  });

  it('partner_id references partners.id', () => {
    expect(content).toMatch(/partner_id.*REFERENCES.*partners\s*\(\s*id\s*\)/i);
  });

  it('creates an index on partner_id for active embeddings', () => {
    expect(content).toMatch(/CREATE INDEX.*idx_customer_face_embeddings_partner/i);
  });

  it('has is_active default true', () => {
    expect(content).toMatch(/is_active.*boolean.*DEFAULT\s+true/i);
  });

  it('adds face_subject_id to partners if missing', () => {
    expect(content).toMatch(/face_subject_id/i);
  });

  it('adds face_registered_at to partners if missing', () => {
    expect(content).toMatch(/face_registered_at/i);
  });

  it('uses safe conditional column addition (DO block)', () => {
    expect(content).toMatch(/DO\s*\$\$/i);
  });
});
