const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '../..');
const composePath = path.join(repoRoot, 'docker-compose.yml');

describe('docker-compose.yml', () => {
  let doc;

  beforeAll(() => {
    const content = fs.readFileSync(composePath, 'utf8');
    doc = yaml.load(content);
  });

  it('is valid YAML and has a services object', () => {
    expect(doc).toBeDefined();
    expect(doc.services).toBeDefined();
    expect(typeof doc.services).toBe('object');
  });

  it('includes the face-service', () => {
    expect(doc.services['face-service']).toBeDefined();
  });

  it('face-service has build context pointing to face-service directory', () => {
    const faceService = doc.services['face-service'];
    expect(faceService.build).toBeDefined();
    expect(faceService.build.context).toBe('./face-service');
    expect(faceService.build.dockerfile).toBe('Dockerfile');
  });

  it('face-service exposes port 8000', () => {
    const faceService = doc.services['face-service'];
    expect(faceService.ports).toBeDefined();
    const portMapping = faceService.ports.find((p) => p.includes('8000'));
    expect(portMapping).toBeDefined();
  });

  it('face-service has a healthcheck', () => {
    const faceService = doc.services['face-service'];
    expect(faceService.healthcheck).toBeDefined();
    expect(faceService.healthcheck.test).toBeDefined();
  });

  it('api service has FACE_SERVICE_URL environment variable', () => {
    const api = doc.services.api;
    expect(api.environment).toBeDefined();
    const envVars = Array.isArray(api.environment)
      ? api.environment
      : Object.entries(api.environment).map(([k, v]) => `${k}=${v}`);
    const faceUrlVar = envVars.find((e) =>
      typeof e === 'string' ? e.includes('FACE_SERVICE_URL') : e
    );
    expect(faceUrlVar).toBeDefined();
  });

  it('api service has face recognition threshold env vars', () => {
    const api = doc.services.api;
    const envVars = Array.isArray(api.environment)
      ? api.environment
      : Object.entries(api.environment).map(([k, v]) => `${k}=${v}`);
    const thresholds = ['FACE_AUTO_MATCH_THRESHOLD', 'FACE_CANDIDATE_THRESHOLD', 'FACE_AUTO_MATCH_MARGIN', 'FACE_MAX_CANDIDATES', 'FACE_DETECTION_THRESHOLD'];
    for (const key of thresholds) {
      const found = envVars.find((e) =>
        typeof e === 'string' ? e.includes(key) : false
      );
      expect(found).toBeDefined();
    }
  });
});
