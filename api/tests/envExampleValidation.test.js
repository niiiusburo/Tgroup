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
      'FACE_DETECTION_THRESHOLD',
    ];
    for (const key of required) {
      expect(content).toContain(key);
    }
  });

  it('marks Compreface as legacy/fallback', () => {
    expect(content).toMatch(/Compreface.*legacy|legacy.*Compreface/i);
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
});
