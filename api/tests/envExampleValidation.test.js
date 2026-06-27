const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const envExamplePath = path.join(repoRoot, '.env.example');

describe('.env.example', () => {
  let content;

  beforeAll(() => {
    content = fs.readFileSync(envExamplePath, 'utf8');
  });

  it('contains FACE_SERVICE_URL', () => {
    expect(content).toContain('FACE_SERVICE_URL');
  });

  it('contains face recognition threshold variables', () => {
    const required = [
      'FACE_AUTO_MATCH_THRESHOLD',
      'FACE_CANDIDATE_THRESHOLD',
      'FACE_AUTO_MATCH_MARGIN',
      'FACE_MAX_CANDIDATES',
      'FACE_MIN_QUALITY',
      'FACE_DETECTION_THRESHOLD',
    ];
    for (const key of required) {
      expect(content).toContain(key);
    }
  });

  it('contains hidden Face ID diagnostics variables', () => {
    const required = [
      'FACE_DIAGNOSTICS_ENABLED',
      'FACE_DIAGNOSTICS_DIR',
      'FACE_DIAGNOSTICS_HASH_SALT',
    ];
    for (const key of required) {
      expect(content).toContain(key);
    }
  });

  it('contains the Face ID provider switch', () => {
    expect(content).toContain('FACE_RECOGNITION_PROVIDER');
  });

  it('contains Hosoonline variables', () => {
    expect(content).toContain('HOSOONLINE_BASE_URL');
    expect(content).toContain('HOSOONLINE_API_KEY');
  });

  it('contains JWT_SECRET', () => {
    expect(content).toContain('JWT_SECRET');
  });

  it('contains DATABASE_URL components', () => {
    expect(content).toContain('POSTGRES_USER');
    expect(content).toContain('POSTGRES_PASSWORD');
  });

  it('contains COMPREFACE_URL for CompreFace integration', () => {
    expect(content).toContain('COMPREFACE_URL');
  });

  it('contains COMPREFACE_API_KEY for CompreFace integration', () => {
    expect(content).toContain('COMPREFACE_API_KEY');
  });

  it('contains COMPREFACE_HOST_PORT for local port routing', () => {
    expect(content).toContain('COMPREFACE_HOST_PORT');
  });

  it('contains HOSOONLINE_USERNAME for authentication', () => {
    expect(content).toContain('HOSOONLINE_USERNAME');
  });

  it('contains HOSOONLINE_PASSWORD for authentication', () => {
    expect(content).toContain('HOSOONLINE_PASSWORD');
  });

  it('contains Lark feedback alert variables', () => {
    expect(content).toContain('LARK_FEEDBACK_WEBHOOK_URL');
    expect(content).toContain('LARK_FEEDBACK_WEBHOOK_SECRET');
    expect(content).toContain('TGROUP_PUBLIC_URL');
  });
});
