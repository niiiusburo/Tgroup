const fs = require('fs');
const path = require('path');

describe('NK3 web Docker build args', () => {
  it('forwards the cosmetic LOB flag into the Vite build', () => {
    const dockerfile = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'Dockerfile.web'), 'utf8');

    expect(dockerfile).toContain('ARG VITE_COSMETIC_LOB_ENABLED');
    expect(dockerfile).toContain('ENV VITE_COSMETIC_LOB_ENABLED=${VITE_COSMETIC_LOB_ENABLED}');
    expect(dockerfile).toContain('ARG GIT_SHA=unknown');
    expect(dockerfile).toContain('ENV GIT_SHA=${GIT_SHA}');
  });
});
